"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Room,
  RemoteParticipant,
  LocalParticipant,
  Track,
  ConnectionState,
  RoomEvent,
  RemoteTrackPublication,
  RemoteTrack,
  LocalTrackPublication,
  LocalTrack,
  TrackPublication,
  Participant,
} from "livekit-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  Phone,
  PhoneOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { forwardRef, useImperativeHandle } from "react";
import { VideoTrackView, AudioTrackView } from "./TrackViews";

interface DoctorVideoTileProps {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  onCallStart?: () => void;
  onCallEnd?: () => void;
  isConsultationCompleted?: boolean;
  embedded?: boolean;
  // Transcription controls (moved here from page)
  onStartRecording?: () => void;
  onPauseRecording?: () => void;
  onStopRecording?: () => void;
  onEndConsultation?: () => void;
  onClearMessages?: () => void;
  onDownloadTranscript?: () => void;
  isRecording?: boolean;
  recordingState?: "stopped" | "recording" | "paused";
  transcriptConnectionStatus?:
    | "disconnected"
    | "connecting"
    | "connected"
    | "error";
  isGeneratingPdf?: boolean;
  isUploadingPdf?: boolean;
  consultationStartTime?: number | null;
  messagesLength?: number;
}

export interface DoctorVideoTileRef {
  startCall: () => Promise<void>;
  endCall: () => void;
}

interface ParticipantInfo {
  participant: Participant;
  videoTrack?: Track;
  audioTrack?: Track;
}



const DoctorVideoTile = forwardRef<DoctorVideoTileRef, DoctorVideoTileProps>(
  (
    {
      appointmentId,
      patientName,
      doctorName,
      onCallStart,
      onCallEnd,
      isConsultationCompleted = false,
      embedded = false,
      // transcription props
      onStartRecording,
      onEndConsultation,
      onClearMessages,
      onDownloadTranscript,
      isRecording = false,
      transcriptConnectionStatus = "disconnected",
      isGeneratingPdf = false,
      isUploadingPdf = false,
      messagesLength = 0,
    },
    ref
  ) => {
    const isIgnorableDisconnectError = (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "";

      return message.toLowerCase().includes("client initiated disconnect");
    };

    const [room, setRoom] = useState<Room | null>(null);
    const [connectionState, setConnectionState] = useState<ConnectionState>(
      ConnectionState.Disconnected
    );
    const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
    const [localParticipant, setLocalParticipant] =
      useState<LocalParticipant | null>(null);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    // removed isConnecting UI state (handled externally)
    const [isExpanded] = useState(true);

    // Helper function to filter out agent participants
    const getVisibleParticipants = useCallback(() => {
      return participants.filter(
        (participantInfo) =>
          !participantInfo.participant.identity
            .toLowerCase()
            .startsWith("agent")
      );
    }, [participants]);

    // Expose endCall method to parent component
    useImperativeHandle(ref, () => ({
      startCall: async () => {
        await startCall();
      },
      endCall: () => {
        if (room) {
          room.disconnect();
          setRoom(null);
          setConnectionState(ConnectionState.Disconnected);
          setParticipants([]);
          setLocalParticipant(null);
          onCallEnd?.();
        }
      },
    }));

    // Initialize room connection data
    const initializeConnection = async () => {
      try {
        // First create/ensure room exists
        const roomResponse = await fetch("/api/livekit/room", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: `${appointmentId}`,
            appointmentId,
            maxParticipants: 2,
          }),
        });

        if (!roomResponse.ok) {
          throw new Error("Failed to create room");
        }

        // Get access token
        const tokenResponse = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName: `${appointmentId}`,
            participantName: doctorName,
            participantRole: "doctor",
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get access token");
        }

        const tokenData = await tokenResponse.json();

        return {
          success: true,
          token: tokenData.token,
          wsUrl: tokenData.wsUrl,
        };
      } catch (error) {
        console.error("Failed to initialize connection:", error);
        return { success: false, error: error };
      }
    };

    // Connect to room
    const connectToRoom = async (token: string, wsUrl: string) => {
      if (!token || !wsUrl) {
        console.error("No token or wsUrl");
        return;
      }

      try {
        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: {
              width: 1280,
              height: 720,
            },
          },
          // Graceful disconnect; prevent auto-reconnect loops after end
          reconnectPolicy: {
            nextRetryDelayInMs: () => -1, // disable reconnects after manual end
          },
        });

        setRoom(newRoom);

        // Room event listeners
        newRoom.on(
          RoomEvent.ConnectionStateChanged,
          (state: ConnectionState) => {
            console.log("Connection state changed:", state);
            setConnectionState(state);
          }
        );

        newRoom.on(
          RoomEvent.ParticipantConnected,
          (participant: RemoteParticipant) => {
            console.log("Participant connected:", participant.identity);
            updateParticipants(newRoom);
          }
        );

        newRoom.on(
          RoomEvent.ParticipantDisconnected,
          (participant: RemoteParticipant) => {
            console.log("Participant disconnected:", participant.identity);
            updateParticipants(newRoom);
          }
        );

        newRoom.on(
          RoomEvent.TrackSubscribed,
          (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            console.log(
              "🎬 Doctor: Track subscribed:",
              track.kind,
              participant.identity
            );

            // Subscribe to all video qualities for better reliability
            if (
              track.kind === Track.Kind.Video &&
              publication instanceof RemoteTrackPublication
            ) {
              publication.setSubscribed(true);
              console.log("🎬 Doctor: Explicitly subscribed to video track");
            }

            updateParticipants(newRoom);
          }
        );

        newRoom.on(
          RoomEvent.TrackUnsubscribed,
          (
            track: RemoteTrack,
            publication: RemoteTrackPublication,
            participant: RemoteParticipant
          ) => {
            console.log(
              "Track unsubscribed:",
              track.kind,
              participant.identity
            );
            updateParticipants(newRoom);
          }
        );

        newRoom.on(
          RoomEvent.LocalTrackPublished,
          (publication: LocalTrackPublication) => {
            console.log("Local track published:", publication.kind);
            updateParticipants(newRoom);
          }
        );

        // Add track muted/unmuted event listeners
        newRoom.on(
          RoomEvent.TrackMuted,
          (publication: TrackPublication, participant: Participant) => {
            console.log(
              `Track muted: ${publication.kind} for ${participant.identity}`
            );
            if (participant === newRoom.localParticipant) {
              updateLocalTrackStates();
            }
            updateParticipants(newRoom);
          }
        );

        newRoom.on(
          RoomEvent.TrackUnmuted,
          (publication: TrackPublication, participant: Participant) => {
            console.log(
              `Track unmuted: ${publication.kind} for ${participant.identity}`
            );
            if (participant === newRoom.localParticipant) {
              updateLocalTrackStates();
            }
            updateParticipants(newRoom);
          }
        );

        // Connect to room
        await newRoom.connect(wsUrl, token);
        setLocalParticipant(newRoom.localParticipant);

        // Register LiveKit text stream handler for transcription topic
        if (typeof newRoom.registerTextStreamHandler === "function") {
          newRoom.registerTextStreamHandler(
            "lk.transcription",
            async (reader, participantInfo) => {
              const info = reader.info;
              console.log("info:", info);
              console.log(
                `Received text stream from ${participantInfo.identity}\n` +
                  `  Topic: ${info.topic}\n` +
                  `  Timestamp: ${info.timestamp}\n` +
                  `  ID: ${info.id}\n` +
                  `  Size: ${info.size}` // Optional, only available if the stream was sent with `sendText`
              );

              // Process the stream incrementally using a for-await loop.
              // let fullText = "";
              // for await (const chunk of reader) {
              //   console.log(`Next chunk: ${chunk}`);
              //   fullText += chunk;
              // }
              // console.log(`Full transcription: ${fullText}`);

              const text = await reader.readAll();
              console.log(
                `Full transcription from ${participantInfo.identity}: ${text}`
              );
            }
          );
        } else {
          console.warn(
            "LiveKit text streams are not supported by this client version."
          );
        }

        // Enable camera and microphone
        await newRoom.localParticipant.enableCameraAndMicrophone();

        console.log("Connected to LiveKit room:", newRoom.name);
        onCallStart?.();
      } catch (error) {
        if (isIgnorableDisconnectError(error)) {
          console.log("LiveKit disconnected by client action");
          return;
        }

        console.error("Failed to connect to room:", error);
      }
    };

    const updateParticipants = (currentRoom: Room) => {
      const participantInfos: ParticipantInfo[] = [];

      console.log("🔄 Doctor: Updating participants...");

      // Add local participant
      if (currentRoom.localParticipant) {
        const localVideoTrack =
          currentRoom.localParticipant.getTrackPublication(
            Track.Source.Camera
          )?.track;
        const localAudioTrack =
          currentRoom.localParticipant.getTrackPublication(
            Track.Source.Microphone
          )?.track;

        console.log("🔄 Doctor local video track:", localVideoTrack);
        console.log("🔄 Doctor local audio track:", localAudioTrack);

        participantInfos.push({
          participant: currentRoom.localParticipant,
          videoTrack: localVideoTrack,
          audioTrack: localAudioTrack,
        });
      }

      // Add remote participants
      currentRoom.remoteParticipants.forEach((participant) => {
        const remoteVideoTrack = participant.getTrackPublication(
          Track.Source.Camera
        )?.track;
        const remoteAudioTrack = participant.getTrackPublication(
          Track.Source.Microphone
        )?.track;

        console.log(`🔄 Doctor remote participant ${participant.identity}:`, {
          videoTrack: remoteVideoTrack,
          audioTrack: remoteAudioTrack,
        });

        participantInfos.push({
          participant,
          videoTrack: remoteVideoTrack,
          audioTrack: remoteAudioTrack,
        });
      });

      setParticipants(participantInfos);
    };

    // Update local track states based on actual LiveKit track status
    const updateLocalTrackStates = useCallback(() => {
      if (!localParticipant) return;

      const videoPublication = localParticipant.getTrackPublication(
        Track.Source.Camera
      );
      const audioPublication = localParticipant.getTrackPublication(
        Track.Source.Microphone
      );

      const videoEnabled = videoPublication?.track && !videoPublication.isMuted;
      const audioEnabled = audioPublication?.track && !audioPublication.isMuted;

      console.log(
        "🎮 Doctor: Updating track states - Video:",
        videoEnabled,
        "Audio:",
        audioEnabled
      );

      setIsVideoEnabled(!!videoEnabled);
      setIsAudioEnabled(!!audioEnabled);
    }, [localParticipant]);



    const startCall = async () => {
      const response = await initializeConnection();
      if (response.success) {
        await connectToRoom(response.token, response.wsUrl);
      }
    };

    const toggleVideo = async () => {
      if (localParticipant) {
        try {
          if (isVideoEnabled) {
            await localParticipant.setCameraEnabled(false);
          } else {
            await localParticipant.setCameraEnabled(true);
          }
          // State will be updated via event listeners
          console.log("🎮 Doctor: Video toggle completed");
        } catch (error) {
          console.error("🎮 Doctor: Failed to toggle video:", error);
        }
      }
    };

    const toggleAudio = async () => {
      if (localParticipant) {
        try {
          if (isAudioEnabled) {
            await localParticipant.setMicrophoneEnabled(false);
          } else {
            await localParticipant.setMicrophoneEnabled(true);
          }
          // State will be updated via event listeners
          console.log("🎮 Doctor: Audio toggle completed");
        } catch (error) {
          console.error("🎮 Doctor: Failed to toggle audio:", error);
        }
      }
    };

    // Sync track states when local participant changes
    useEffect(() => {
      if (localParticipant) {
        updateLocalTrackStates();
      }
    }, [localParticipant, updateLocalTrackStates]);

    // Monitor track publications and ensure proper track states
    useEffect(() => {
      if (!localParticipant) return;

      const checkTrackPublications = () => {
        const videoPublication = localParticipant.getTrackPublication(
          Track.Source.Camera
        );
        const audioPublication = localParticipant.getTrackPublication(
          Track.Source.Microphone
        );

        // Log track publication status
        console.log("🔍 Doctor: Track publications check:", {
          video: {
            publication: !!videoPublication,
            track: !!videoPublication?.track,
            muted: videoPublication?.isMuted,
          },
          audio: {
            publication: !!audioPublication,
            track: !!audioPublication?.track,
            muted: audioPublication?.isMuted,
          },
        });

        updateLocalTrackStates();
      };

      // Check immediately
      checkTrackPublications();

      // Set up a periodic check for track publications
      const interval = setInterval(checkTrackPublications, 1000);

      return () => clearInterval(interval);
    }, [localParticipant, updateLocalTrackStates]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (room) {
          room.disconnect();
        }
      };
    }, [room]);

    const isConnected = connectionState === ConnectionState.Connected;

    return (
      <motion.div
        layout
        drag={!embedded}
        dragMomentum={false}
        dragElastic={embedded ? 0 : 0.2}
        className={
          embedded
            ? "w-full bg-white rounded-lg shadow-sm border"
            : "fixed bottom-4 right-4 z-50 w-72 md:w-80 bg-white rounded-lg shadow-lg border"
        }
      >
        <Card className="h-full">
          <CardHeader className="pb-2 md:pb-3">
            <CardTitle className="text-sm md:text-base lg:text-lg flex items-center gap-2 min-w-0 flex-1">
              <Video className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span className="hidden md:inline truncate">
                Video Consultation
              </span>
              <span className="md:hidden truncate">Video</span>
            </CardTitle>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="text-xs px-1.5 py-0.5"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      isConnected ? "bg-green-400" : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="hidden md:inline text-xs">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                  <span className="md:hidden text-xs">
                    {isConnected ? "On" : "Off"}
                  </span>
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {!isConnected && !isConsultationCompleted && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={startCall}
                    className="h-8"
                  >
                    <Phone className="h-3 w-3 md:mr-2" />
                    <span className="hidden md:inline">Start</span>
                  </Button>
                )}
                {isConnected && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      // Delegate ending the entire consultation (transcription + video) to parent
                      onEndConsultation?.();
                    }}
                    className="h-8"
                  >
                    <PhoneOff className="h-3 w-3 md:mr-2" />
                    <span className="hidden md:inline">End</span>
                  </Button>
                )}
                {/* Expand/Minimize removed; expanded by default */}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6">
            {!isConnected ? (
              // Not connected state (respect expand)
              <div
                className={`flex items-center justify-center ${
                  isExpanded
                    ? "h-56 md:h-72 lg:h-[20rem]"
                    : "h-32 md:h-40 lg:h-48"
                } bg-gray-50 rounded-lg`}
              >
                <div className="text-center space-y-3 md:space-y-4 px-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Video className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1 text-sm md:text-base">
                      {isConsultationCompleted
                        ? "Consultation Ended"
                        : "Ready to start consultation"}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500">
                      {isConsultationCompleted
                        ? "This consultation has been completed"
                        : `Use Start Consultation to begin the video call with ${patientName}`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              // Connected state
              <div className="space-y-3 md:space-y-4">
                {/* Video Participants */}
                <div
                  className={`grid gap-2 md:gap-3 ${getVisibleParticipants().length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  {getVisibleParticipants().map((participantInfo) => {
                    const isLocal =
                      participantInfo.participant === localParticipant;
                    return (
                      <motion.div
                        key={participantInfo.participant.sid}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative bg-gray-900 rounded-lg overflow-hidden aspect-[4/3] ${isExpanded ? "max-h-80 md:max-h-[28rem] lg:max-h-[32rem]" : "max-h-48 md:max-h-64 lg:max-h-72"}`}
                      >
                        <VideoTrackView track={participantInfo.videoTrack} isLocal={isLocal} />
                        {!isLocal && <AudioTrackView track={participantInfo.audioTrack} />}

                        {/* Participant Info */}
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black bg-opacity-50 text-white px-1 py-0.5 md:px-2 md:py-1 rounded text-xs">
                          {isLocal
                            ? `${doctorName} (You)`
                            : participantInfo.participant.identity}
                        </div>

                        {/* Status Indicators */}
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex gap-1">
                          {(!participantInfo.videoTrack || participantInfo.videoTrack.isMuted) && (
                            <div className="bg-red-500 p-0.5 md:p-1 rounded">
                              <VideoOff className="h-2 w-2 md:h-3 md:w-3 text-white" />
                            </div>
                          )}
                          {(!participantInfo.audioTrack || participantInfo.audioTrack.isMuted) && (
                            <div className="bg-red-500 p-0.5 md:p-1 rounded">
                              <MicOff className="h-2 w-2 md:h-3 md:w-3 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t">
                  <Button
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                    disabled={isConsultationCompleted}
                    className="h-8 md:h-9"
                  >
                    {isVideoEnabled ? (
                      <Video className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    ) : (
                      <VideoOff className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">
                      {isVideoEnabled ? "Video On" : "Video Off"}
                    </span>
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                    disabled={isConsultationCompleted}
                    className="h-8 md:h-9"
                  >
                    {isAudioEnabled ? (
                      <Mic className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    ) : (
                      <MicOff className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">
                      {isAudioEnabled ? "Mic On" : "Mic Off"}
                    </span>
                  </Button>

                  {/* Transcription controls */}
                  {onStartRecording && !isRecording && (
                    <Button
                      size="sm"
                      className="h-8 md:h-9"
                      variant="default"
                      onClick={onStartRecording}
                      disabled={
                        transcriptConnectionStatus === "connecting" ||
                        isConsultationCompleted ||
                        isGeneratingPdf ||
                        isUploadingPdf
                      }
                    >
                      {transcriptConnectionStatus === "connecting"
                        ? "Connecting..."
                        : "Start"}
                    </Button>
                  )}
                  {/* Pause/Stop controls removed as unnecessary */}
                  {/* End button removed from control row; header End handles termination */}
                  {onClearMessages && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 md:h-9"
                      onClick={onClearMessages}
                      disabled={
                        (messagesLength || 0) === 0 ||
                        isConsultationCompleted ||
                        isGeneratingPdf ||
                        isUploadingPdf
                      }
                    >
                      Clear
                    </Button>
                  )}
                  {onDownloadTranscript && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 md:h-9"
                      onClick={onDownloadTranscript}
                      disabled={
                        (messagesLength || 0) === 0 ||
                        isConsultationCompleted ||
                        isGeneratingPdf ||
                        isUploadingPdf
                      }
                    >
                      Download
                    </Button>
                  )}
                </div>

                {/* Participant List */}
                {getVisibleParticipants().length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-2 md:p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
                      <span className="text-xs md:text-sm font-medium text-gray-700">
                        Participants ({getVisibleParticipants().length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {getVisibleParticipants().map((participantInfo) => {
                        const isLocal =
                          participantInfo.participant === localParticipant;
                        return (
                          <div
                            key={participantInfo.participant.sid}
                            className="flex items-center justify-between text-xs md:text-sm"
                          >
                            <span className="text-gray-700">
                              {isLocal
                                ? `${doctorName} (You)`
                                : participantInfo.participant.identity}
                            </span>
                            <div className="flex gap-1">
                              {participantInfo.videoTrack && (
                                <Video className="h-3 w-3 text-green-600" />
                              )}
                              {participantInfo.audioTrack && (
                                <Mic className="h-3 w-3 text-green-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

DoctorVideoTile.displayName = "DoctorVideoTile";

export default DoctorVideoTile;
