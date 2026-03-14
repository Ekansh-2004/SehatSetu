"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PatientPostLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const finish = () => {
      router.replace("/patient/dashboard");
    };

    if (!("geolocation" in navigator)) {
      finish();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await fetch("/api/user/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "patient",
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
        } catch {
          // Do not block sign-in flow.
        } finally {
          finish();
        }
      },
      () => {
        finish();
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-600">
      Completing sign in...
    </div>
  );
}
