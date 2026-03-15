"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

interface PatientSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface PatientSessionContextType {
  patient: PatientSession | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const PatientSessionContext = createContext<PatientSessionContextType>({
  patient: null,
  loading: true,
  logout: async () => {},
});

export function usePatientSession() {
  return useContext(PatientSessionContext);
}

export function PatientSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/patient/session");
        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.patient) {
          setPatient(data.patient);
        } else {
          router.push("/patient/sign-in");
        }
      } catch (error) {
        console.error("Error checking session:", error);
        if (!cancelled) router.push("/patient/sign-in");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkSession();
    return () => { cancelled = true; };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/patient/session", { method: "DELETE" });
      setPatient(null);
      router.push("/home");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, [router]);

  return (
    <PatientSessionContext.Provider value={{ patient, loading, logout }}>
      {children}
    </PatientSessionContext.Provider>
  );
}
