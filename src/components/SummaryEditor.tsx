"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownDisplay } from "@/components/ui/markdown-display";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Edit3, Save, X, Loader2 } from "lucide-react";

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

interface SummaryEditorProps {
  summary: string;
  isEditing: boolean;
  isSaving: boolean;
  isCompleted: boolean;
  onEdit: () => void;
  onSave: (newSummary: string) => Promise<void>;
  onCancel: () => void;
  parseSummaryIntoFields: (summary: string) => SummaryFields;
  reconstructSummaryFromFields: (fields: SummaryFields) => string;
}

// Animation variants
const buttonHoverVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

export function SummaryEditor({
  summary,
  isEditing,
  isSaving,
  isCompleted,
  onEdit,
  onSave,
  onCancel,
  parseSummaryIntoFields,
  reconstructSummaryFromFields,
}: SummaryEditorProps) {
  const [summaryFields, setSummaryFields] = useState<SummaryFields>(() =>
    parseSummaryIntoFields(summary)
  );

  const handleSave = async () => {
    const newSummary = reconstructSummaryFromFields(summaryFields);
    await onSave(newSummary);
  };

  const handleCancel = () => {
    // Reset fields to original parsed state
    const originalFields = parseSummaryIntoFields(summary);
    setSummaryFields(originalFields);
    onCancel();
  };

  // Update fields when summary changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setSummaryFields(parseSummaryIntoFields(summary));
    }
  }, [summary, isEditing, parseSummaryIntoFields]);

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-slate-50/80 to-blue-50/60 rounded-2xl p-4 sm:p-6 border border-slate-200/50 shadow-sm">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm flex-shrink-0">
              <span className="text-white text-lg">📋</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-800 tracking-tight">
                Medical Summary
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {isEditing ? "Editing mode - Make your changes below" : "Clinical documentation and assessment"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Status and Actions Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!isCompleted && !isEditing && (
              <Badge variant="secondary" className="text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                Ready to Edit
              </Badge>
            )}
            {isEditing && (
              <Badge variant="secondary" className="text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                Editing Mode
              </Badge>
            )}
          </div>
          
          {!isCompleted && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <motion.div
                  variants={buttonHoverVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    onClick={onEdit}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 sm:px-4 text-xs font-medium bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
                  >
                    <Edit3 className="h-3.5 w-3.5 sm:mr-2" />
                    <span className="hidden sm:inline">Edit Summary</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          variants={buttonHoverVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            variant="default"
                            size="sm"
                            className="h-9 w-9 p-0 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-sm border-0 flex items-center justify-center"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                        <p className="text-xs">{isSaving ? "Saving changes..." : "Save changes"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          variants={buttonHoverVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={handleCancel}
                            disabled={isSaving}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 bg-white/80 backdrop-blur-sm border-slate-300 hover:bg-slate-50 hover:border-slate-400 shadow-sm flex items-center justify-center"
                          >
                            <X className="h-4 w-4 text-slate-600" />
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-slate-800 text-white border-slate-700">
                        <p className="text-xs">Cancel editing</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Content */}
      {isEditing ? (
        <SummaryEditForm
          summaryFields={summaryFields}
          setSummaryFields={setSummaryFields}
        />
      ) : (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-sm">
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed">
            <MarkdownDisplay content={summary} />
          </div>
        </div>
      )}
    </div>
  );
}

// Auto-expanding textarea component with proper UX
function AutoExpandingTextarea({
  value,
  onChange,
  placeholder,
  minRows = 3,
  maxRows = 12,
  className = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the number of rows based on content
      const lineHeight = 24; // Better line height for readability
      const paddingVertical = 24; // Top and bottom padding
      const minHeight = minRows * lineHeight + paddingVertical;
      const maxHeight = maxRows * lineHeight + paddingVertical;
      const scrollHeight = textarea.scrollHeight;
      
      // Set height between min and max, but allow scrolling when content exceeds max
      if (scrollHeight <= maxHeight) {
        const newHeight = Math.max(scrollHeight, minHeight);
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [value, minRows, maxRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${className} resize-none scrollbar-thin scrollbar-thumb-slate-300/60 scrollbar-track-transparent hover:scrollbar-thumb-slate-400/80 scrollbar-thumb-rounded-full scrollbar-track-rounded-full`}
      style={{ 
        minHeight: `${minRows * 24 + 24}px`,
        lineHeight: '1.6'
      }}
    />
  );
}

// Field component for consistent styling
function FormField({
  label,
  required = false,
  children,
  description,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-slate-800 tracking-tight">
          {label}
          {required && (
            <span className="text-rose-500 ml-1.5 font-medium">*</span>
          )}
        </label>
        {description && (
          <span className="text-xs text-slate-500 italic">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// Separate component for the edit form
function SummaryEditForm({
  summaryFields,
  setSummaryFields,
}: {
  summaryFields: SummaryFields;
  setSummaryFields: React.Dispatch<React.SetStateAction<SummaryFields>>;
}) {
  const baseTextareaClassName = "w-full text-sm leading-relaxed bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md";

  return (
    <div className="space-y-8">
      {/* Primary Information Section */}
      <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border border-blue-100/50 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-xl shadow-sm mr-3">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">
            Primary Assessment
          </h3>
          <div className="ml-auto">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
              Required Fields
            </span>
          </div>
        </div>
        
        <div className="space-y-6">
          <FormField label="Chief Complaint" required>
            <AutoExpandingTextarea
              value={summaryFields.chiefComplaint}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                chiefComplaint: e.target.value
              }))}
              placeholder="What brought the patient in today? (e.g., chest pain, headache, routine follow-up)"
              minRows={3}
              maxRows={6}
              className={baseTextareaClassName}
            />
          </FormField>

          <FormField label="Present Illness" required>
            <AutoExpandingTextarea
              value={summaryFields.presentIllness}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                presentIllness: e.target.value
              }))}
              placeholder="Detailed timeline and characteristics of the current condition, including onset, duration, severity, quality, associated symptoms, and modifying factors"
              minRows={4}
              maxRows={10}
              className={baseTextareaClassName}
            />
          </FormField>

          <FormField label="Assessment & Diagnosis" required>
            <AutoExpandingTextarea
              value={summaryFields.assessment}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                assessment: e.target.value
              }))}
              placeholder="Clinical impression, differential diagnosis, working diagnosis with ICD codes if applicable"
              minRows={4}
              maxRows={8}
              className={baseTextareaClassName}
            />
          </FormField>

          <FormField label="Plan/Recommendations" required>
            <AutoExpandingTextarea
              value={summaryFields.planRecommendations}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                planRecommendations: e.target.value
              }))}
              placeholder="Medications, procedures, lifestyle modifications, referrals, and monitoring plan"
              minRows={4}
              maxRows={8}
              className={baseTextareaClassName}
            />
          </FormField>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="bg-gradient-to-br from-slate-50/50 to-gray-50/30 rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-white/80 to-slate-50/60 backdrop-blur-sm border-b border-slate-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl shadow-sm">
                <span className="text-white text-sm">📝</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                  Additional Medical Information
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Comprehensive patient history and examination details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Optional
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          <FormField label="Symptoms Reported">
            <AutoExpandingTextarea
              value={summaryFields.symptomsReported}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                symptomsReported: e.target.value
              }))}
              placeholder="List all symptoms mentioned by the patient, including severity, location, and characteristics"
              minRows={3}
              maxRows={6}
              className={baseTextareaClassName}
            />
          </FormField>

          <FormField label="Medical History Discussion">
            <AutoExpandingTextarea
              value={summaryFields.medicalHistoryDiscussion}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                medicalHistoryDiscussion: e.target.value
              }))}
              placeholder="Any previous medical history discussed, current medications mentioned, allergies or contraindications"
              minRows={4}
              maxRows={8}
              className={baseTextareaClassName}
            />
          </FormField>

          <FormField label="Additional Notes">
            <AutoExpandingTextarea
              value={summaryFields.additionalNotes}
              onChange={(e) => setSummaryFields(prev => ({
                ...prev,
                additionalNotes: e.target.value
              }))}
              placeholder="Any other relevant clinical information not covered in the above sections"
              minRows={3}
              maxRows={6}
              className={baseTextareaClassName}
            />
          </FormField>

        </div>
      </div>
      
      {/* Pro Tips Section */}
      <div className="bg-gradient-to-r from-amber-50/80 to-orange-50/60 rounded-2xl p-5 border border-amber-200/50 shadow-sm">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-sm flex items-center justify-center">
              <span className="text-white text-sm font-bold">✨</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 mb-2 tracking-tight">Professional Documentation Tips</h4>
            <div className="grid sm:grid-cols-2 gap-3 text-xs text-amber-800">
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                  <span>Use <strong>SOAP format</strong> for structured notes</span>
                </div>
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                  <span>Include <strong>specific measurements</strong> and timelines</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                  <span>Document <strong>patient's own words</strong> in quotes</span>
                </div>
                <div className="flex items-center">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 flex-shrink-0"></div>
                  <span>Use <strong>standard medical terminology</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { SummaryFields, SummaryEditorProps };
