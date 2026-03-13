"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Settings,
  Phone,
  User,
  Calendar,
  Clock,
  Stethoscope,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

interface PatientPreJoinProps {
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  onJoinRoom: (options: {
    videoEnabled: boolean;
    audioEnabled: boolean;
  }) => void;
  isLoading?: boolean;
}

export default function PatientPreJoin({
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  onJoinRoom,
  isLoading = false,
}: PatientPreJoinProps) {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "prompt"
  >("prompt");
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get user media and devices - optimized to prevent multiple calls
  useEffect(() => {
    let isMounted = true;

    const initializeMedia = async () => {
      if (!isMounted) return;

      try {
        setIsInitializing(true);

        // Request permissions with specific constraints to reduce flickering
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user",
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setMediaStream(stream);
        setPermissionStatus("granted");

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Ensure video plays smoothly
          try {
            await videoRef.current.play();
          } catch (playError) {
            console.error("Failed to play video:", playError);
          }
        }

        // Get available devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const cameras = deviceList.filter(
          (device) => device.kind === "videoinput"
        );
        const microphones = deviceList.filter(
          (device) => device.kind === "audioinput"
        );

        if (isMounted) {
          setDevices({ cameras, microphones });

          if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
          if (microphones.length > 0)
            setSelectedMicrophone(microphones[0].deviceId);
        }
      } catch (error) {
        console.error("Failed to get user media:", error);
        if (isMounted) {
          setPermissionStatus("denied");
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeMedia();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Ensure video element is properly attached when it becomes available
  useEffect(() => {
    if (mediaStream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(console.error);
    }
  }, [mediaStream]);

  // Update media stream when video/audio settings change - optimized
  useEffect(() => {
    if (!mediaStream) return;

    const videoTrack = mediaStream.getVideoTracks()[0];
    const audioTrack = mediaStream.getAudioTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = videoEnabled;
    }
    if (audioTrack) {
      audioTrack.enabled = audioEnabled;
    }
  }, [videoEnabled, audioEnabled, mediaStream]);

  // Optimized device change handler
  const handleDeviceChange = useCallback(
    async (deviceId: string, kind: "video" | "audio") => {
      if (!mediaStream) return;

      try {
        const constraints: MediaStreamConstraints = {};

        if (kind === "video") {
          constraints.video = {
            deviceId: { exact: deviceId },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
          };
          setSelectedCamera(deviceId);
        } else {
          constraints.audio = {
            deviceId: { exact: deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };
          setSelectedMicrophone(deviceId);
        }

        const newStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        // Replace tracks without recreating the entire stream
        if (kind === "video") {
          const videoTrack = newStream.getVideoTracks()[0];
          const oldVideoTrack = mediaStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            mediaStream.removeTrack(oldVideoTrack);
            oldVideoTrack.stop();
          }
          mediaStream.addTrack(videoTrack);
          newStream.getVideoTracks().forEach((track) => track.stop()); // Stop the temporary stream
        } else {
          const audioTrack = newStream.getAudioTracks()[0];
          const oldAudioTrack = mediaStream.getAudioTracks()[0];
          if (oldAudioTrack) {
            mediaStream.removeTrack(oldAudioTrack);
            oldAudioTrack.stop();
          }
          mediaStream.addTrack(audioTrack);
          newStream.getAudioTracks().forEach((track) => track.stop()); // Stop the temporary stream
        }

        // Update the video element only if it's not already attached
        if (videoRef.current && videoRef.current.srcObject !== mediaStream) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error("Failed to change device:", error);
      }
    },
    [mediaStream]
  );

  const handleJoinRoom = useCallback(() => {
    onJoinRoom({ videoEnabled, audioEnabled });
  }, [onJoinRoom, videoEnabled, audioEnabled]);

  if (permissionStatus === "denied") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="md" />
            </div>
            <CardTitle className="text-red-600">
              Camera and Microphone Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Please allow access to your camera and microphone to join the
              video consultation.
            </p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry Permissions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ready to Join Your Consultation?
          </h1>
          <p className="text-gray-600">
            Test your camera and microphone before joining
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Camera Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {/* Always render video element when we have permission, but control visibility with CSS */}
                    {permissionStatus === "granted" && (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          videoEnabled ? "opacity-100" : "opacity-0"
                        }`}
                        style={{
                          transform: "scaleX(-1)",
                          willChange: "transform",
                          backfaceVisibility: "hidden",
                        }}
                      />
                    )}

                    {/* Show camera off overlay when video is disabled */}
                    {(!videoEnabled || permissionStatus !== "granted") && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                          <VideoOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-75">
                            {permissionStatus !== "granted"
                              ? "Camera access required"
                              : "Camera is turned off"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Loading indicator */}
                    {isInitializing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-2"></div>
                          <p className="text-sm">Initializing camera...</p>
                        </div>
                      </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      <Button
                        size="sm"
                        variant={videoEnabled ? "default" : "destructive"}
                        onClick={() => setVideoEnabled(!videoEnabled)}
                        className="rounded-full"
                        disabled={isInitializing}
                      >
                        {videoEnabled ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <VideoOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={audioEnabled ? "default" : "destructive"}
                        onClick={() => setAudioEnabled(!audioEnabled)}
                        className="rounded-full"
                        disabled={isInitializing}
                      >
                        {audioEnabled ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <MicOff className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Device Selection */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Camera
                      </label>
                      <select
                        value={selectedCamera}
                        onChange={(e) =>
                          handleDeviceChange(e.target.value, "video")
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isInitializing}
                      >
                        {devices.cameras.map((camera) => (
                          <option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label ||
                              `Camera ${camera.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Microphone
                      </label>
                      <select
                        value={selectedMicrophone}
                        onChange={(e) =>
                          handleDeviceChange(e.target.value, "audio")
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                        disabled={isInitializing}
                      >
                        {devices.microphones.map((mic) => (
                          <option key={mic.deviceId} value={mic.deviceId}>
                            {mic.label ||
                              `Microphone ${mic.deviceId.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Appointment Info & Join */}
          <div className="space-y-6">
            {/* Appointment Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Patient: {patientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">Doctor: {doctorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{appointmentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{appointmentTime}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Status Indicators */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Camera</span>
                    <Badge variant={videoEnabled ? "default" : "secondary"}>
                      {videoEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Microphone</span>
                    <Badge variant={audioEnabled ? "default" : "secondary"}>
                      {audioEnabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Permissions</span>
                    <Badge
                      variant={
                        permissionStatus === "granted"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {permissionStatus === "granted" ? "Granted" : "Required"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Join Button */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={handleJoinRoom}
                disabled={
                  isLoading || permissionStatus !== "granted" || isInitializing
                }
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Joining...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Join Consultation
                  </div>
                )}
              </Button>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-gray-600 space-y-2"
            >
              <p className="font-medium">Tips for a great consultation:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Ensure you&apos;re in a quiet, well-lit area</li>
                <li>Test your internet connection beforehand</li>
                <li>Have your medical history ready</li>
                <li>Keep a glass of water nearby</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
