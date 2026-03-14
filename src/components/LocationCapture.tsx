"use client";

import { useEffect } from "react";

type LocationCaptureProps = {
  role: "doctor" | "patient";
};

export default function LocationCapture({ role }: LocationCaptureProps) {
  useEffect(() => {
    const markerKey = `location-captured-${role}`;
    if (sessionStorage.getItem(markerKey) === "true") {
      return;
    }

    if (!("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/user/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) {
            return;
          }

          sessionStorage.setItem(markerKey, "true");
        } catch {
          // Ignore optional location persistence failures.
        }
      },
      () => {
        // User may deny location permission; this should not show a blocking toast.
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, [role]);

  return null;
}
