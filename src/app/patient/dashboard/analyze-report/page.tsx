"use client";

import { useState, useRef } from "react";
import axios from "axios";
import Tesseract from "tesseract.js";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileImage, X } from "lucide-react";
import { toast } from "sonner";

export default function AnalyzeReportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const [summary, setSummary] = useState({
    patient: "",
    doctor: [] as { title: string; content: string }[],
  });

  const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  const handleFileSelect = (f: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    const ext = f.name.split(".").pop()?.toLowerCase();
    const isPdf = f.type === "application/pdf" || ext === "pdf";

    if (!allowed.includes(f.type) && !isPdf) {
      toast.error("File type not supported. Upload JPG/PNG/WEBP or PDF.");
      return;
    }

    const maxSize = 25 * 1024 * 1024;

    if (f.size > maxSize) {
      toast.error("File too large. Maximum 25MB allowed.");
      return;
    }

    setFile(f);
  };

  const formatSummary = (rawText: string) => {
    try {
      const patientSection = rawText
        .split("**Patient Summary**")[1]
        ?.split("**Doctor's Analysis**")[0]
        ?.trim();

      const doctorContent = rawText
        .split("**Doctor's Analysis**")[1]
        ?.trim();

      const doctorSections = doctorContent?.split(/\d+\.\s+/).slice(1) || [];

      const formattedDoctor = doctorSections.map((section) => {
        const [titlePart, ...contentParts] = section.split(":");

        return {
          title: titlePart?.trim()?.replace(":", "") || "Section",
          content: contentParts.join(":").trim(),
        };
      });

      setSummary({
        patient: patientSection || "No patient summary available",
        doctor: formattedDoctor || [],
      });
    } catch (err) {
      console.error(err);

      setSummary({
        patient: "Error parsing summary",
        doctor: [],
      });
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setLoading(true);

    try {
      let extractedText = "";

      if (file.type.startsWith("image/")) {
        const {
          data: { text },
        } = await Tesseract.recognize(file, "eng");

        extractedText = text;
      }

      const prompt = `
Analyze this medical information and create two summaries.

MEDICAL RECORD:
${extractedText || "No record"}

ADDITIONAL NOTES:
${notes || "None"}
IMPORTANT:
Do NOT use markdown formatting.
Do NOT use *, **, or bullet symbols.
Return plain text only.
=== PATIENT SUMMARY ===
- Health status
- Main medical issues
- Daily precautions
- Medicines mentioned
- Warning signs

=== DOCTOR'S ANALYSIS ===

1. Diagnosis Highlights:
- diagnosis
- severity
- causes

2. Prescription Review:
- medication conflicts
- side effects
- dosage adjustments

3. Management Plan:
- recommended tests
- therapies
- monitoring plan

Format response EXACTLY as:

**Patient Summary**
[text]

**Doctor's Analysis**

1. Diagnosis Highlights:
[text]

2. Prescription Review:
[text]

3. Management Plan:
[text]
`;

      const response = await axios.post(API_URL, {
        contents: [{ parts: [{ text: prompt }] }],
      });

      const rawText =
        response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      formatSummary(rawText);
      toast.success("Analysis complete");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analyze Medical Report</h1>
        <p className="text-sm text-gray-500">
          Upload an image or PDF of a medical report
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${
          file
            ? "border-emerald-300 bg-emerald-50"
            : "border-gray-200 bg-gray-50"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) =>
            e.target.files?.[0] && handleFileSelect(e.target.files[0])
          }
        />

        {file ? (
          <div className="space-y-2">
            <FileImage className="h-10 w-10 text-emerald-600 mx-auto" />

            <p className="font-medium text-gray-900">{file.name}</p>

            <p className="text-sm text-gray-500">
              {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>

            <Button
              variant="ghost"
              className="text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
            >
              <X className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-10 w-10 text-gray-400 mx-auto" />

            <p className="font-medium text-gray-700">
              Click to select or drop a file
            </p>

            <p className="text-sm text-gray-500">
              Supported: JPG, PNG, WEBP, PDF — up to 25MB
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Notes (optional)</Label>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleUploadAndAnalyze}
          disabled={!file || loading}
          className="bg-violet-600 text-white"
        >
          {loading ? "Analyzing..." : "Analyze Report"}
        </Button>

        <Button
          variant="outline"
          onClick={() => {
            setFile(null);
            setSummary({ patient: "", doctor: [] });
            setNotes("");
          }}
        >
          Reset
        </Button>
      </div>

      {summary.patient && (
        <>
          <div className="p-4 border rounded-lg bg-white">
            <h2 className="font-semibold text-lg mb-2">
              Patient Summary
            </h2>

            <div className="whitespace-pre-wrap text-gray-800">
              {summary.patient}
            </div>
          </div>

          <div className="p-4 border rounded-lg bg-white mt-4">
            <h2 className="font-semibold text-lg mb-4">
              Clinical Analysis
            </h2>

            {summary.doctor.length > 0 ? (
              <div className="space-y-6">
                {summary.doctor.map((section, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border-l-4 border-violet-500 bg-gray-50"
                  >
                    <h4 className="font-semibold mb-2">
                      {section.title}
                    </h4>

                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {section.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">
                Doctor's analysis will appear here...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}