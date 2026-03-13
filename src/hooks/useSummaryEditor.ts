import { useState, useCallback } from "react";
import { callAnalyticsService } from "@/lib/config/analytics-service";

// Types
interface SummaryFields {
  chiefComplaint: string;
  presentIllness: string;
  assessment: string;
  symptomsReported: string;
  medicalHistoryDiscussion: string;
  planRecommendations: string;
  additionalNotes: string;
}

interface UseSummaryEditorProps {
  appointmentId?: string;
  onSaveSuccess?: (summary: string) => void;
  onSaveError?: (error: string) => void;
}

export function useSummaryEditor({ 
  appointmentId, 
  onSaveSuccess, 
  onSaveError 
}: UseSummaryEditorProps = {}) {
  const [isSaving, setIsSaving] = useState(false);

  // Parse summary text into structured fields
  const parseSummaryIntoFields = useCallback((summaryText: string): SummaryFields => {
    const fields: SummaryFields = {
      chiefComplaint: "",
      presentIllness: "",
      assessment: "",
      symptomsReported: "",
      medicalHistoryDiscussion: "",
      planRecommendations: "",
      additionalNotes: ""
    };

    // Helper function to clean content by removing headers
    const cleanContent = (content: string, headerPattern: RegExp) => {
      return content
        .replace(headerPattern, '') // Remove the header line
        .replace(/^##\s*.*$/gm, '') // Remove any other markdown headers
        .replace(/^\*\*.*\*\*$/gm, '') // Remove bold headers
        .replace(/^\s*[-•]\s*/gm, '') // Clean up bullet points
        .replace(/^\n+|\n+$/g, '') // Remove leading/trailing newlines
        .trim();
    };

    // Split by headers and process each section
    const sections = summaryText.split(/(?=##\s*[A-Z]|^\*\*[A-Z])/gm);
    
    sections.forEach(section => {
      const lowerSection = section.toLowerCase();
      
      if (lowerSection.includes('chief complaint')) {
        fields.chiefComplaint = cleanContent(section, /^##\s*chief complaint.*$/gmi);
      } else if (lowerSection.includes('present illness')) {
        fields.presentIllness = cleanContent(section, /^##\s*present illness.*$/gmi);
      } else if (lowerSection.includes('assessment') && !lowerSection.includes('plan')) {
        fields.assessment = cleanContent(section, /^##\s*assessment.*$/gmi);
      } else if (lowerSection.includes('symptoms reported')) {
        fields.symptomsReported = cleanContent(section, /^##\s*symptoms reported.*$/gmi);
      } else if (lowerSection.includes('medical history discussion')) {
        fields.medicalHistoryDiscussion = cleanContent(section, /^##\s*medical history discussion.*$/gmi);
      } else if (lowerSection.includes('plan') || lowerSection.includes('recommendations')) {
        fields.planRecommendations = cleanContent(section, /^##\s*(?:plan\/recommendations|plan|recommendations).*$/gmi);
      } else if (lowerSection.includes('additional notes')) {
        fields.additionalNotes = cleanContent(section, /^##\s*additional notes.*$/gmi);
      }
    });

    // If parsing didn't work well, put everything in assessment (but clean it)
    if (Object.values(fields).every(field => !field.trim())) {
      fields.assessment = summaryText.replace(/^##\s*.*$/gm, '').trim();
    }

    return fields;
  }, []);

  // Reconstruct summary from structured fields
  const reconstructSummaryFromFields = useCallback((fields: SummaryFields): string => {
    let reconstructed = "";
    
    if (fields.chiefComplaint.trim()) {
      reconstructed += `## Chief Complaint\n${fields.chiefComplaint.trim()}\n\n`;
    }
    if (fields.presentIllness.trim()) {
      reconstructed += `## Present Illness\n${fields.presentIllness.trim()}\n\n`;
    }
    if (fields.assessment.trim()) {
      reconstructed += `## Assessment\n${fields.assessment.trim()}\n\n`;
    }
    if (fields.symptomsReported.trim()) {
      reconstructed += `## Symptoms Reported\n${fields.symptomsReported.trim()}\n\n`;
    }
    if (fields.medicalHistoryDiscussion.trim()) {
      reconstructed += `## Medical History Discussion\n${fields.medicalHistoryDiscussion.trim()}\n\n`;
    }
    if (fields.planRecommendations.trim()) {
      reconstructed += `## Plan/Recommendations\n${fields.planRecommendations.trim()}\n\n`;
    }
    if (fields.additionalNotes.trim()) {
      reconstructed += `## Additional Notes\n${fields.additionalNotes.trim()}\n\n`;
    }
    
    return reconstructed.trim();
  }, []);

  const processSummary = useCallback(async (summaryText: string): Promise<boolean> => {
    if (!appointmentId) {
      console.error("❌ No appointment ID available for processing summary");
      return false;
    }
    
    try {
      console.log("🌐 Processing summary for appointment:", appointmentId);
      console.log("📄 Summary length:", summaryText.length);
      
      const response = await fetch("/api/appointments/summary", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appointmentId: appointmentId,
          summary: summaryText,
        }),
      });

      console.log("🌐 API Response status:", response.status);
      
      if (!response.ok) {
        console.error("❌ API response not OK:", response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      console.log("📊 API Response data:", data);
      
      return data.success === true;
    } catch (error) {
      console.error("❌ Error processing summary:", error);
      return false;
    }
  }, [appointmentId]);

  // Handle save operation
  const handleSave = useCallback(async (newSummary: string): Promise<void> => {
    try {
      setIsSaving(true);
      console.log("🔄 Starting summary save process...");
      
      if (!newSummary.trim()) {
        const errorMessage = "Please fill in at least one field before saving.";
        onSaveError?.(errorMessage);
        return;
      }
      
      const processed = await processSummary(newSummary);
      console.log("💾 Process result:", processed);
      
      if (processed) {
        // Track PDF edit analytics - non-blocking
        if (appointmentId) {
          callAnalyticsService('/api/analytics/track-pdf', {
            method: 'POST',
            body: JSON.stringify({
              appointmentId,
              action: 'edited'
            })
          }).catch(error => {
            console.error('Failed to track PDF edit analytics:', error);
          });
        }
        
        onSaveSuccess?.(newSummary);
      } else {
        onSaveError?.("Error processing summary. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error in handleSave:", error);
      onSaveError?.("Unexpected error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [processSummary, onSaveSuccess, onSaveError, appointmentId]);

  return {
    isSaving,
    parseSummaryIntoFields,
    reconstructSummaryFromFields,
    handleSave,
  };
}

export type { SummaryFields };
