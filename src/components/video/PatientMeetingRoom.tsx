"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
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
  Participant,
  TrackPublication,
} from "livekit-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MessageSquare,
  Users,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion } from "framer-motion";

interface PatientMeetingRoomProps {
  room: Room;
  token: string;
  wsUrl: string;
  onLeave: () => void;
  patientName: string;
  doctorName: string;
}

interface ParticipantInfo {
  participant: Participant;
  videoTrack?: Track;
  audioTrack?: Track;
}

export default function PatientMeetingRoom({
  room,
  token,
  wsUrl,
  onLeave,
  patientName,
  doctorName,
}: PatientMeetingRoomProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    room.state
  );
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{
      sender: string;
      message: string;
      timestamp: Date;
    }>
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const isIgnorableDisconnectError = useCallback((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return message.toLowerCase().includes("client initiated disconnect");
  }, []);

  // Simplified participant filtering - only exclude agent participants
  const visibleParticipants = useMemo(() => {
    return participants.filter(
      (participantInfo) =>
        !participantInfo.participant.identity.toLowerCase().includes("agent")
    );
  }, [participants]);

  // Get local media stream for immediate display
  useEffect(() => {
    const getLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log("🎥 Local stream attached to video element");
        }
      } catch (error) {
        console.error("Failed to get local media:", error);
      }
    };

    getLocalMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Connect to room
  useEffect(() => {
    let isCleaningUp = false;

    const connectToRoom = async () => {
      try {
        console.log("🔗 Connecting to LiveKit room:", room.name);
        await room.connect(wsUrl, token);

        if (isCleaningUp) {
          return;
        }

        setLocalParticipant(room.localParticipant);

        // Enable camera and microphone by default
        await room.localParticipant.enableCameraAndMicrophone();
        console.log("🎥 Camera and microphone enabled");

        // Wait a moment for tracks to be published
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Force publish local tracks if they're not already published
        const videoPublication = room.localParticipant.getTrackPublication(
          Track.Source.Camera
        );
        const audioPublication = room.localParticipant.getTrackPublication(
          Track.Source.Microphone
        );

        if (!videoPublication) {
          console.log("🎥 Publishing local video track...");
          await room.localParticipant.setCameraEnabled(true);
        }

        if (!audioPublication) {
          console.log("🎤 Publishing local audio track...");
          await room.localParticipant.setMicrophoneEnabled(true);
        }

        // Initial participant update
        updateParticipants();
        console.log("✅ Connected to LiveKit room:", room.name);
      } catch (error) {
        if (isIgnorableDisconnectError(error)) {
          console.log("LiveKit disconnected by client action");
          return;
        }

        console.error("❌ Failed to connect to room:", error);
      }
    };

    connectToRoom();

    // Room event listeners
    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("🔗 Connection state changed:", state);
      setConnectionState(state);
    });

    room.on(
      RoomEvent.ParticipantConnected,
      (participant: RemoteParticipant) => {
        console.log("👤 Participant connected:", participant.identity);
        updateParticipants();
      }
    );

    room.on(
      RoomEvent.ParticipantDisconnected,
      (participant: RemoteParticipant) => {
        console.log("👤 Participant disconnected:", participant.identity);
        cleanupParticipantAudio(participant.sid);
        updateParticipants();
      }
    );

    room.on(
      RoomEvent.TrackSubscribed,
      (
        track: RemoteTrack,
        publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log(
          "🎬 Track subscribed:",
          track.kind,
          "from",
          participant.identity
        );

        // Ensure video tracks are subscribed
        if (track.kind === Track.Kind.Video) {
          publication.setSubscribed(true);
          console.log("🎬 Video track subscription confirmed");

          // Try to attach to existing video element
          const videoElement = remoteVideoRefs.current.get(participant.sid);
          if (videoElement) {
            console.log(
              `🎥 Found existing video element for ${participant.identity}, attaching track`
            );
            try {
              track.attach(videoElement);
            } catch (error) {
              console.error(
                `🎥 Failed to attach to existing video element for ${participant.identity}:`,
                error
              );
            }
          }
        }

        updateParticipants();
        attachTrack(track, participant);
      }
    );

    room.on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        _publication: RemoteTrackPublication,
        participant: RemoteParticipant
      ) => {
        console.log("🎬 Track unsubscribed:", track.kind, participant.identity);
        updateParticipants();
        detachTrack(track);
      }
    );

    room.on(
      RoomEvent.LocalTrackPublished,
      (publication: LocalTrackPublication) => {
        console.log(
          "🎬 Local track published:",
          publication.kind,
          publication.source
        );

        if (publication.track) {
          attachLocalTrack(publication.track);
        }

        updateParticipants();
      }
    );

    room.on(
      RoomEvent.TrackMuted,
      (publication: TrackPublication, participant: Participant) => {
        console.log(
          `🎬 Track muted: ${publication.kind} for ${participant.identity}`
        );
        if (participant === room.localParticipant) {
          updateLocalTrackStates();
        }
        updateParticipants();
      }
    );

    room.on(
      RoomEvent.TrackUnmuted,
      (publication: TrackPublication, participant: Participant) => {
        console.log(
          `🎬 Track unmuted: ${publication.kind} for ${participant.identity}`
        );
        if (participant === room.localParticipant) {
          updateLocalTrackStates();
        }
        updateParticipants();
      }
    );

    room.on(
      RoomEvent.DataReceived,
      (payload: Uint8Array, participant?: RemoteParticipant) => {
        const message = new TextDecoder().decode(payload);
        try {
          const data = JSON.parse(message);
          if (data.type === "chat") {
            setChatMessages((prev) => [
              ...prev,
              {
                sender: participant?.identity || "Unknown",
                message: data.message,
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error("Failed to parse data message:", error);
        }
      }
    );

    return () => {
      isCleaningUp = true;
      try {
        room.disconnect();
      } catch (error) {
        if (!isIgnorableDisconnectError(error)) {
          console.error("❌ Failed to disconnect room:", error);
        }
      }
      // Cleanup all audio elements
      const audioElements = document.querySelectorAll('audio[id^="audio-"]');
      audioElements.forEach((audioElement) => {
        console.log("🔊 Cleaning up audio element");
        audioElement.remove();
      });
    };
  }, [room, token, wsUrl, isIgnorableDisconnectError]);

  const updateParticipants = useCallback(() => {
    const participantInfos: ParticipantInfo[] = [];

    console.log("🔄 Updating participants...");
    console.log("🔄 Room participants:", room.numParticipants);
    console.log("🔄 Remote participants:", room.remoteParticipants.size);

    // Add local participant
    if (room.localParticipant) {
      const localVideoTrack = room.localParticipant.getTrackPublication(
        Track.Source.Camera
      )?.track;
      const localAudioTrack = room.localParticipant.getTrackPublication(
        Track.Source.Microphone
      )?.track;

      participantInfos.push({
        participant: room.localParticipant,
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
      });
    }

    // Add remote participants
    room.remoteParticipants.forEach((participant) => {
      const remoteVideoTrack = participant.getTrackPublication(
        Track.Source.Camera
      )?.track;
      const remoteAudioTrack = participant.getTrackPublication(
        Track.Source.Microphone
      )?.track;

      console.log(
        `👤 Remote participant ${participant.identity}:`,
        "video track:",
        !!remoteVideoTrack,
        "audio track:",
        !!remoteAudioTrack
      );

      participantInfos.push({
        participant,
        videoTrack: remoteVideoTrack,
        audioTrack: remoteAudioTrack,
      });
    });

    setParticipants(participantInfos);
  }, [room]);

  const updateLocalTrackStates = useCallback(() => {
    if (!localParticipant) {
      console.log("🔍 No local participant available for track state update");
      return;
    }

    const videoPublication = localParticipant.getTrackPublication(
      Track.Source.Camera
    );
    const audioPublication = localParticipant.getTrackPublication(
      Track.Source.Microphone
    );

    const videoEnabled = videoPublication?.track && !videoPublication.isMuted;
    const audioEnabled = audioPublication?.track && !audioPublication.isMuted;

    console.log("🔍 Track state update:", {
      videoPublication: !!videoPublication,
      videoTrack: !!videoPublication?.track,
      videoMuted: videoPublication?.isMuted,
      videoEnabled,
      audioPublication: !!audioPublication,
      audioTrack: !!audioPublication?.track,
      audioMuted: audioPublication?.isMuted,
      audioEnabled,
    });

    setIsVideoEnabled(!!videoEnabled);
    setIsAudioEnabled(!!audioEnabled);
  }, [localParticipant]);

  const attachTrack = useCallback(
    (track: Track, participant: Participant) => {
      console.log(
        `🎥 Attaching track: ${track.kind} for ${participant.identity}`
      );

      if (track.kind === Track.Kind.Video) {
        const isLocal = participant === room?.localParticipant;

        if (isLocal && localVideoRef.current) {
          console.log("🎥 Attaching local video track");
          try {
            track.attach(localVideoRef.current);
          } catch (error) {
            console.error("🎥 Failed to attach local video track:", error);
          }
        } else if (!isLocal) {
          // For remote participants, we'll attach when the video element is created
          console.log("🎥 Remote video track ready for attachment");
        }
      } else if (track.kind === Track.Kind.Audio) {
        const isLocal = participant === room?.localParticipant;

        if (!isLocal) {
          console.log(
            `🔊 Attaching remote audio track for ${participant.identity}`
          );
          try {
            let audioElement = document.getElementById(
              `audio-${participant.sid}`
            ) as HTMLAudioElement;
            if (!audioElement) {
              audioElement = document.createElement("audio");
              audioElement.id = `audio-${participant.sid}`;
              audioElement.autoplay = true;
              audioElement.muted = false;
              document.body.appendChild(audioElement);
              console.log(
                `🔊 Created audio element for ${participant.identity}`
              );
            }
            track.attach(audioElement);
          } catch (error) {
            console.error(
              `🔊 Failed to attach remote audio track for ${participant.identity}:`,
              error
            );
          }
        }
      }
    },
    [room]
  );

  const detachTrack = (track: Track) => {
    track.detach();
  };

  const cleanupParticipantAudio = (participantSid: string) => {
    const audioElement = document.getElementById(`audio-${participantSid}`);
    if (audioElement) {
      console.log(
        `🔊 Removing audio element for participant ${participantSid}`
      );
      audioElement.remove();
    }
  };

  const attachLocalTrack = (track: LocalTrack) => {
    if (track.kind === Track.Kind.Video && localVideoRef.current) {
      console.log("🎥 Attaching local track");
      try {
        track.attach(localVideoRef.current);
        console.log("🎥 Local track attached successfully");
      } catch (error) {
        console.error("🎥 Failed to attach local track:", error);
      }
    }
  };

  // Ensure local video element gets stream when available
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("🎥 Setting local stream on video element");
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote video tracks when video elements are created
  const attachRemoteVideoTrack = useCallback(
    (participantSid: string, videoElement: HTMLVideoElement) => {
      const participant = room.remoteParticipants.get(participantSid);
      if (participant) {
        console.log(
          `🎥 Attempting to attach video for ${participant.identity}`
        );

        const videoPublication = participant.getTrackPublication(
          Track.Source.Camera
        );
        if (videoPublication) {
          // Ensure the track is subscribed
          videoPublication.setSubscribed(true);
          console.log(
            `🎥 Video publication found for ${participant.identity}, subscribed: ${videoPublication.isSubscribed}`
          );

          const videoTrack = videoPublication.track;
          if (videoTrack) {
            console.log(
              `🎥 Attaching remote video track for ${participant.identity}`
            );
            try {
              videoTrack.attach(videoElement);
              console.log(
                `🎥 Successfully attached video track for ${participant.identity}`
              );
            } catch (error) {
              console.error(
                `🎥 Failed to attach remote video track for ${participant.identity}:`,
                error
              );
            }
          } else {
            console.log(
              `🎥 No video track available for ${participant.identity}, waiting for subscription...`
            );
            // Set up a retry mechanism
            setTimeout(() => {
              const retryPublication = participant.getTrackPublication(
                Track.Source.Camera
              );
              if (retryPublication?.track) {
                console.log(
                  `🎥 Retrying video attachment for ${participant.identity}`
                );
                try {
                  retryPublication.track.attach(videoElement);
                } catch (error) {
                  console.error(
                    `🎥 Retry failed for ${participant.identity}:`,
                    error
                  );
                }
              }
            }, 1000);
          }
        } else {
          console.log(
            `🎥 No video publication found for ${participant.identity}, checking for tracks...`
          );
          // Check if participant has any video tracks
          const videoPublication = participant.getTrackPublication(
            Track.Source.Camera
          );
          const audioPublication = participant.getTrackPublication(
            Track.Source.Microphone
          );
          console.log(`🎥 Participant ${participant.identity} publications:`, {
            video: !!videoPublication,
            audio: !!audioPublication,
          });
        }
      } else {
        console.log(`🎥 No participant found for SID: ${participantSid}`);
      }
    },
    [room]
  );

  const toggleVideo = async () => {
    if (localParticipant) {
      try {
        console.log("🎮 Toggling video, current state:", isVideoEnabled);

        if (isVideoEnabled) {
          await localParticipant.setCameraEnabled(false);
          console.log("🎮 Video disabled");
        } else {
          await localParticipant.setCameraEnabled(true);
          console.log("🎮 Video enabled");
        }

        // Force update track states
        setTimeout(() => {
          updateLocalTrackStates();
        }, 500);

        console.log("🎮 Video toggle completed");
      } catch (error) {
        console.error("🎮 Failed to toggle video:", error);
      }
    } else {
      console.warn("🎮 No local participant available for video toggle");
    }
  };

  const toggleAudio = async () => {
    if (localParticipant) {
      try {
        console.log("🎮 Toggling audio, current state:", isAudioEnabled);

        if (isAudioEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
          console.log("🎮 Audio disabled");
        } else {
          await localParticipant.setMicrophoneEnabled(true);
          console.log("🎮 Audio enabled");
        }

        // Force update track states
        setTimeout(() => {
          updateLocalTrackStates();
        }, 500);

        console.log("🎮 Audio toggle completed");
      } catch (error) {
        console.error("🎮 Failed to toggle audio:", error);
      }
    } else {
      console.warn("🎮 No local participant available for audio toggle");
    }
  };

  // Sync track states when local participant changes
  useEffect(() => {
    if (localParticipant) {
      updateLocalTrackStates();

      // Set up periodic check for track states
      const interval = setInterval(() => {
        updateLocalTrackStates();
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [localParticipant, updateLocalTrackStates]);

  // Periodically check for remote video tracks and attach them
  useEffect(() => {
    const checkRemoteTracks = () => {
      room.remoteParticipants.forEach((participant) => {
        const videoElement = remoteVideoRefs.current.get(participant.sid);
        if (videoElement) {
          const videoPublication = participant.getTrackPublication(
            Track.Source.Camera
          );
          if (videoPublication?.track && !videoElement.srcObject) {
            console.log(
              `🎥 Found unattached video track for ${participant.identity}, attaching...`
            );
            try {
              videoPublication.track.attach(videoElement);
            } catch (error) {
              console.error(
                `🎥 Failed to attach video track for ${participant.identity}:`,
                error
              );
            }
          }
        }
      });
    };

    const interval = setInterval(checkRemoteTracks, 3000);
    return () => clearInterval(interval);
  }, [room]);

  const leaveRoom = () => {
    room.disconnect();
    onLeave();
  };

  const sendChatMessage = () => {
    if (newMessage.trim() && room.localParticipant) {
      const data = {
        type: "chat",
        message: newMessage.trim(),
      };

      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(data)));

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "You",
          message: newMessage.trim(),
          timestamp: new Date(),
        },
      ]);

      setNewMessage("");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return "bg-green-500";
      case ConnectionState.Connecting:
        return "bg-yellow-500";
      case ConnectionState.Disconnected:
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (connectionState === ConnectionState.Connecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">
            Connecting to consultation...
          </h2>
          <p className="text-gray-300">
            Please wait while we connect you with {doctorName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}
            ></div>
            <span className="text-white font-medium">
              Video Consultation with {doctorName}
            </span>
          </div>
          <Badge variant="outline" className="text-white border-white">
            <Users className="h-3 w-3 mr-1" />
            {visibleParticipants.length} participants
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-white hover:bg-gray-700"
          >
            Debug
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="text-white hover:bg-gray-700"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-gray-700"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {visibleParticipants.map((participantInfo) => {
              const isLocal = participantInfo.participant === localParticipant;
              return (
                <motion.div
                  key={participantInfo.participant.sid}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative bg-gray-800 rounded-lg overflow-hidden aspect-[4/3]"
                >
                  <video
                    ref={
                      isLocal
                        ? localVideoRef
                        : (ref) => {
                            if (ref) {
                              console.log(
                                `🎥 Video element created for ${participantInfo.participant.identity}`
                              );
                              remoteVideoRefs.current.set(
                                participantInfo.participant.sid,
                                ref
                              );
                              // Attach remote video track when element is created
                              attachRemoteVideoTrack(
                                participantInfo.participant.sid,
                                ref
                              );
                            }
                          }
                    }
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-contain"
                    style={{
                      transform: "scaleX(-1)",
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                    }}
                    onLoadedMetadata={() => {
                      console.log(
                        `🎥 Video metadata loaded for ${participantInfo.participant.identity}`
                      );
                    }}
                    onError={(e) => {
                      console.error(
                        `🎥 Video error for ${participantInfo.participant.identity}:`,
                        e
                      );
                    }}
                  />

                  {/* Participant Info Overlay */}
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {isLocal
                      ? patientName + " (You)"
                      : participantInfo.participant.identity}
                  </div>

                  {/* Muted Indicators */}
                  <div className="absolute top-4 right-4 flex gap-2">
                    {(!participantInfo.videoTrack ||
                      (participantInfo.participant === localParticipant &&
                        !isVideoEnabled) ||
                      (participantInfo.participant !== localParticipant &&
                        participantInfo.participant.getTrackPublication(
                          Track.Source.Camera
                        )?.isMuted)) && (
                      <div className="bg-red-500 p-2 rounded-full">
                        <VideoOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {(!participantInfo.audioTrack ||
                      (participantInfo.participant === localParticipant &&
                        !isAudioEnabled) ||
                      (participantInfo.participant !== localParticipant &&
                        participantInfo.participant.getTrackPublication(
                          Track.Source.Microphone
                        )?.isMuted)) && (
                      <div className="bg-red-500 p-2 rounded-full">
                        <MicOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Debug Info</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-white">
              <div className="flex justify-between items-center">
                <div>
                  <strong>Connection State:</strong> {connectionState}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    updateLocalTrackStates();
                    updateParticipants();
                  }}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
              <div>
                <strong>Total Participants:</strong>{" "}
                {visibleParticipants.length}
              </div>
              <div>
                <strong>Local Video Enabled:</strong>{" "}
                {isVideoEnabled ? "Yes" : "No"}
              </div>
              <div>
                <strong>Local Audio Enabled:</strong>{" "}
                {isAudioEnabled ? "Yes" : "No"}
              </div>
              <div>
                <strong>Local Stream:</strong>{" "}
                {localStream ? "Available" : "Not Available"}
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: true,
                      });
                      setLocalStream(stream);
                      console.log("🎥 Manual stream test successful");
                    } catch (error) {
                      console.error("🎥 Manual stream test failed:", error);
                    }
                  }}
                  className="text-xs w-full"
                >
                  Test Local Stream
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    room.remoteParticipants.forEach((participant) => {
                      const videoElement = remoteVideoRefs.current.get(
                        participant.sid
                      );
                      if (videoElement) {
                        const videoPublication =
                          participant.getTrackPublication(Track.Source.Camera);
                        if (videoPublication?.track) {
                          console.log(
                            `🎥 Manually attaching video for ${participant.identity}`
                          );
                          try {
                            videoPublication.track.attach(videoElement);
                          } catch (error) {
                            console.error(
                              `🎥 Manual attachment failed for ${participant.identity}:`,
                              error
                            );
                          }
                        }
                      }
                    });
                  }}
                  className="text-xs w-full"
                >
                  Force Attach Remote Video
                </Button>
              </div>

              <div className="border-t border-gray-600 pt-2">
                <strong>Participants:</strong>
                {visibleParticipants.map((participantInfo) => {
                  const isLocal =
                    participantInfo.participant === localParticipant;
                  const videoMuted = isLocal
                    ? !isVideoEnabled
                    : participantInfo.participant.getTrackPublication(
                        Track.Source.Camera
                      )?.isMuted;
                  const audioMuted = isLocal
                    ? !isAudioEnabled
                    : participantInfo.participant.getTrackPublication(
                        Track.Source.Microphone
                      )?.isMuted;

                  return (
                    <div
                      key={participantInfo.participant.sid}
                      className="ml-2 mt-1"
                    >
                      <div>• {participantInfo.participant.identity}</div>
                      <div className="ml-2 text-gray-400">
                        Video: {participantInfo.videoTrack ? "Yes" : "No"}
                        {videoMuted && " (Muted)"}
                      </div>
                      <div className="ml-2 text-gray-400">
                        Audio: {participantInfo.audioTrack ? "Yes" : "No"}
                        {audioMuted && " (Muted)"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Chat Sidebar */}
        {showChat && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-medium">Chat</h3>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className="text-sm">
                  <div className="text-gray-400 text-xs">{msg.sender}</div>
                  <div className="text-white">{msg.message}</div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-md text-sm"
                />
                <Button size="sm" onClick={sendChatMessage}>
                  Send
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full h-12 w-12"
          >
            {isVideoEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-12 w-12"
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={leaveRoom}
            className="rounded-full h-12 w-12"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
