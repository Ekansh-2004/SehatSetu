"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function BookAppointment() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/patient/session');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.patient) {
            // Patient is logged in - redirect to dashboard forms
            router.push('/patient/dashboard/forms/new');
          } else {
            // Not logged in - redirect to sign up
            router.push('/patient/sign-up');
          }
        } else {
          // Not logged in - redirect to sign up
          router.push('/patient/sign-up');
        }
      } catch (error) {
        console.log('No active patient session, redirecting to sign up');
        router.push('/patient/sign-up');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
