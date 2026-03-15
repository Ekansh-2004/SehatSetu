"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import NearbyDoctorsList, { NearbyDoctor } from "./NearbyDoctorsList";
import PhysicalConsultationForm from "./PhysicalConsultationForm";
import PatientConsultationStatus from "./PatientConsultationStatus";

type PatientSession = {
  id: string;
  name: string;
  phone?: string | null;
};

type Consultation = {
  id: string;
  status: string;
  symptoms: string;
  preferredDate: string;
  preferredTime: string;
  finalDate: string | null;
  finalTime: string | null;
  doctor: {
    name: string;
    clinicAddress: string | null;
    address: string | null;
    location: string | null;
  };
};

type NotificationItem = {
  id: string;
  message: string;
  status: string;
};

export default function PhysicalConsultationDashboard() {
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<NearbyDoctor | null>(null);
  const [loading, setLoading] = useState(true);

  const syncPatientLocation = async (): Promise<boolean> => {
    return await new Promise<boolean>((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch("/api/user/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                role: "patient",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              }),
            });

            const data = await response.json().catch(() => ({}));
            resolve(Boolean(response.ok && data.success));
          } catch {
            resolve(false);
          }
        },
        () => resolve(false),
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  };

  const fetchPatient = async () => {
    const response = await fetch("/api/patient/session");
    const data = await response.json();
    if (data.success) {
      setPatient(data.patient);
      return data.patient as PatientSession;
    }
    return null;
  };

  const fetchNearbyDoctors = async () => {
    const response = await fetch("/api/doctors/nearby");
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || "Failed to fetch nearby doctors");
    }
    setDoctors(data.data || []);
  };

  const fetchConsultations = async () => {
    const response = await fetch("/api/consultations?role=patient");
    const data = await response.json();
    if (data.success) {
      setConsultations(data.data || []);
    }
  };

  const fetchNotifications = async () => {
    const response = await fetch("/api/notifications");
    const data = await response.json();
    if (!data.success) {
      return;
    }

    const unread = (data.data as NotificationItem[]).filter((item) => item.status === "UNREAD");
    if (unread.length > 0) {
      for (const item of unread) {
        toast.success(item.message);
      }
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      const patientSession = await fetchPatient();
      if (!patientSession) {
        return;
      }

      await syncPatientLocation();

      await Promise.all([fetchNearbyDoctors(), fetchConsultations(), fetchNotifications()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load physical consultation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(async () => {
      await syncPatientLocation();
      fetchNearbyDoctors();
      fetchConsultations();
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Physical Consultation</h1>
        <p className="text-sm text-gray-600 mt-1">These doctors are available near you.</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-sm text-gray-500">Loading...</div>
      ) : (
        <>
          <NearbyDoctorsList doctors={doctors} onBook={(doctor) => setSelectedDoctor(doctor)} />
          <PatientConsultationStatus consultations={consultations} />
        </>
      )}

      <Dialog open={Boolean(selectedDoctor)} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Physical Consultation</DialogTitle>
          </DialogHeader>
          {selectedDoctor && patient && (
            <PhysicalConsultationForm
              doctor={selectedDoctor}
              patientName={patient.name}
              patientPhone={patient.phone}
              onSuccess={async () => {
                setSelectedDoctor(null);
                await refreshAll();
              }}
              onCancel={() => setSelectedDoctor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
