"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";



interface MuscleInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  muscleName: string | null;
  muscleData?: {
    muscle_name?: string;
    description?: string;
    s3_url?: string;
    imageData?: string; // Base64 data URL
    presignedUrl?: string; // Presigned S3 URL
    score?: number; // Confidence score
    [key: string]: unknown; // Allow arbitrary keys like 'Image URL'
  } | null;
}

export function MuscleInfoModal({
  open,
  onOpenChange,
  muscleName,
  muscleData,
}: MuscleInfoModalProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  useEffect(() => {
    // Reset state when modal opens with new muscle data
    console.log(
      "🔍 Modal useEffect triggered - muscleName:",
      muscleName,
      "muscleData:",
      !!muscleData
    );

    // Always reset presigned URL first to clear any previous image
    setPresignedUrl(null);
    setIsLoadingImage(false);

    if (!muscleData || !open) {
      return;
    }

    // If we have s3_url but not presignedUrl, fetch it from the backend
    if (muscleData?.s3_url && !muscleData?.presignedUrl) {
      setIsLoadingImage(true);
      const fetchPresigned = async () => {
        try {
          console.log("🔍 Fetching presigned URL for:", muscleData.s3_url);
          const res = await fetch("/api/get-presigned-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3Url: muscleData.s3_url }),
          });
          const data = await res.json();
          if (data.presignedUrl) {
            console.log("✅ Presigned URL fetched successfully");
            setPresignedUrl(data.presignedUrl);
          } else {
            console.log("❌ No presigned URL returned");
          }
        } catch (err) {
          console.error("❌ Failed to fetch presigned URL", err);
        } finally {
          setIsLoadingImage(false);
        }
      };
      fetchPresigned();
    } else if (muscleData?.presignedUrl) {
      console.log("✅ Using existing presigned URL");
      setPresignedUrl(muscleData.presignedUrl);
    } else {
      console.log("ℹ️ No image URL available for this muscle");
    }
  }, [muscleData, muscleName, open]); // Added muscleName and open to dependencies

  // Only use the presigned URL for the image
  const imageUrl = presignedUrl;

  console.log(
    "🔍 Modal render - imageUrl:",
    imageUrl?.substring(0, 80),
    "isLoading:",
    isLoadingImage
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full">
        <DialogHeader>
          <DialogTitle>
            {muscleName || "Muscle Info"}
            {muscleData?.score && (
              <span className="text-sm text-gray-500 ml-2">
                (Confidence: {(muscleData.score * 100).toFixed(1)}%)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {muscleData ? (
          <div className="flex flex-col items-center gap-4">
            {isLoadingImage ? (
              <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded">
                <span className="text-gray-400">Loading image...</span>
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={muscleName || "Muscle"}
                className="w-full h-auto max-h-[400px] max-w-[400px] object-contain rounded shadow border mx-auto"
                onError={() => {
                  console.log(
                    "❌ Image failed to load:",
                    imageUrl?.substring(0, 50)
                  );
                }}
                onLoad={() => {
                  console.log("✅ Image loaded successfully");
                }}
              />
            ) : (
              <div className="w-full h-32 flex items-center justify-center bg-gray-100 rounded">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
            <DialogDescription className="text-gray-700 text-base text-center">
              {muscleData.description || "No description available."}
            </DialogDescription>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p>No information available for: {muscleName}</p>
          </div>
        )}
        <DialogClose asChild>
          <Button className="mt-4 w-full">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
