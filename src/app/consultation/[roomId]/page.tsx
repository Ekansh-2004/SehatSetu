"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Room as RoomType } from "livekit-client";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, Loader2, Scan } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";

// Lazy-load heavy LiveKit components (~2MB livekit-client)
const PatientPreJoin = dynamic(
  () => import("@/components/video/PatientPreJoin"),
  { ssr: false, loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  )}
);

const PatientMeetingRoom = dynamic(
  () => import("@/components/video/PatientMeetingRoom"),
  { ssr: false, loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  )}
);

interface ConsultationPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ConsultationPage({ params }: ConsultationPageProps) {
  const [roomId, setRoomId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<
    "loading" | "pre-join" | "meeting" | "ended" | "error"
  >("loading");
  const [room, setRoom] = useState<RoomType | null>(null);
  const [token, setToken] = useState<string>("");
  const [wsUrl, setWsUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [appointmentData, setAppointmentData] = useState<{
    patientName: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentId: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Get roomId from params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.roomId);
    };
    getParams();
  }, [params]);

  // Initialize consultation data
  useEffect(() => {
    if (!roomId) return;

    const initializeConsultation = async () => {
      try {
        // Get appointment data from URL params or fetch from API
        const patientName = searchParams?.get("patientName") || "Patient";
        const doctorName = searchParams?.get("doctorName") || "Doctor";
        const appointmentDate =
          searchParams?.get("date") || new Date().toLocaleDateString();
        const appointmentTime =
          searchParams?.get("time") || new Date().toLocaleTimeString();
        const appointmentId = searchParams?.get("appointmentId") || roomId;

        setAppointmentData({
          patientName,
          doctorName,
          appointmentDate,
          appointmentTime,
          appointmentId,
        });

        // Verify room exists and get token
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: roomId,
            participantName: patientName,
            participantRole: "patient",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get access token");
        }

        const data = await response.json();
        setToken(data.token);
        setWsUrl(data.wsUrl);
        setCurrentStep("pre-join");
      } catch (error) {
        console.error("Failed to initialize consultation:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to initialize consultation"
        );
        setCurrentStep("error");
      }
    };

    initializeConsultation();
  }, [roomId, searchParams]);

  const handleJoinRoom = async () => {
    try {
      setCurrentStep("loading");

      // Dynamic import of livekit-client only when user actually joins
      const { Room } = await import("livekit-client");

      // Create LiveKit room instance with improved configuration
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
          },
          facingMode: "user",
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        // Ensure proper track subscription
        stopLocalTrackOnUnpublish: false,
      });

      setRoom(newRoom);
      setCurrentStep("meeting");
    } catch (error) {
      console.error("Failed to join room:", error);
      setError(error instanceof Error ? error.message : "Failed to join room");
      setCurrentStep("error");
    }
  };

  const handleLeaveRoom = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
    }
    setCurrentStep("ended");
  };

  const handleReturnHome = () => {
    router.push("/");
  };

  // Loading state
  if (currentStep === "loading" || !appointmentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading consultation...
          </h2>
          <p className="text-gray-600">
            Please wait while we prepare your consultation room
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (currentStep === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">
              Unable to Join Consultation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
              <Button variant="outline" onClick={handleReturnHome}>
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Consultation ended state
  if (currentStep === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <CardTitle className="text-green-600">Consultation Ended</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for using our telemedicine platform. Your consultation
              with {appointmentData.doctorName} has ended.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                You should receive a summary of your consultation via email
                shortly.
              </p>
              <Link href="/doctor/dashboard/medical-imaging" passHref>
                <Button variant="outline" className="w-full mb-2">
                  <Scan className="h-4 w-4 mr-2" />
                  View Medical Imaging
                </Button>
              </Link>
              <Button onClick={handleReturnHome} className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-join screen
  if (currentStep === "pre-join") {
    return (
      <PatientPreJoin
        patientName={appointmentData.patientName}
        doctorName={appointmentData.doctorName}
        appointmentDate={appointmentData.appointmentDate}
        appointmentTime={appointmentData.appointmentTime}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  // Meeting room
  if (currentStep === "meeting" && room && token && wsUrl) {
    return (
      <PatientMeetingRoom
        room={room}
        token={token}
        wsUrl={wsUrl}
        onLeave={handleLeaveRoom}
        patientName={appointmentData.patientName}
        doctorName={appointmentData.doctorName}
      />
    );
  }

  return null;
}
