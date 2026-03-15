"use client";

import { useEffect, useRef } from "react";
import { Track } from "livekit-client";

interface TrackViewProps {
  track?: Track;
  isLocal?: boolean;
}

export const VideoTrackView = ({ track, isLocal = false }: TrackViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;
    
    track.attach(el);
    return () => {
      try {
        track.detach(el);
      } catch (e) {
        console.warn("Detach warning", e);
      }
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className="w-full h-full object-contain"
      style={{
        transform: isLocal ? "scaleX(-1)" : "none",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    />
  );
};

export const AudioTrackView = ({ track }: { track?: Track }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    
    track.attach(el);
    return () => {
      try {
        track.detach(el);
      } catch (e) {
        console.warn("Detach warning", e);
      }
    };
  }, [track]);

  return <audio ref={audioRef} autoPlay playsInline hidden />;
};
