"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const API_KEY = "AIzaSyD22Js_yz2uaRGplGJluVVUAOvtGUd_CgU";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

export default function PredictPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<any>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);

    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const convertImageToBase64 = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };

      reader.onerror = reject;
    });
  };

  const extract = (text: string, field: string) => {
    const regex = new RegExp(`\\*\\*${field}:\\*\\* (.+)`);
    const match = text.match(regex);
    return match ? match[1] : "Unknown";
  };

  const handlePredict = async () => {
    if (!file) {
      toast.error("Please upload an image first");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const base64Image = await convertImageToBase64(file);

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `You are an experienced medical doctor. Analyze the medical image and provide a structured diagnosis.

**Response Format:**
- **Diagnosis:** [Medical condition]
- **Risk Level:** [Low / Moderate / High]
- **Confidence Score:** [Percentage]
- **Prescription:** [Medicine names]`,
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "AI prediction failed");
      }

      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No diagnosis available";

      const parsedPrescription = extract(aiResponse, "Prescription");

      const parsed = {
        diagnosis: extract(aiResponse, "Diagnosis"),
        risk: extract(aiResponse, "Risk Level"),
        confidence: extract(aiResponse, "Confidence Score"),
        prescription: parsedPrescription.toLowerCase() === "unknown" ? "Consult a doctor" : parsedPrescription,
      };

      setResult(parsed);

      toast.success("Prediction complete");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Predict Disease</CardTitle>
          <CardDescription>
            Upload an image to get an AI-powered suggestion.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileChange}
              />
              <Upload className="h-6 w-6 text-gray-500" />
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop an image
              </p>
            </label>

            {preview && (
              <div className="rounded-lg overflow-hidden border border-gray-100">
                <img
                  src={preview}
                  alt="preview"
                  className="w-full object-contain"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handlePredict}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? "Predicting..." : "Predict"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => router.push("/patient/dashboard")}
              >
                Back
              </Button>
            </div>

            {result && (
              <div className="p-4 bg-white border border-gray-100 rounded-lg space-y-2">
                <h3 className="font-semibold text-gray-900">
                  AI Diagnosis Result
                </h3>
                <p><b>Diagnosis:</b> {result.diagnosis}</p>
                <p><b>Risk Level:</b> {result.risk}</p>
                <p><b>Confidence:</b> {result.confidence}</p>
                <p><b>Prescription:</b> {result.prescription}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}