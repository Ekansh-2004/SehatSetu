"use client";

import { useEffect, useState } from "react";

type DoctorConsultation = {
  id: string;
  patientName: string;
  symptoms: string;
  finalDate: string | null;
  finalTime: string | null;
  preferredDate: string;
  preferredTime: string;
  status: string;
};

export default function DoctorPhysicalConsultations() {
  const [consultations, setConsultations] = useState<DoctorConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  const buildScheduleLabel = (item: DoctorConsultation) => {
    const date = (item.finalDate || item.preferredDate).split("T")[0];
    const time = item.finalTime || item.preferredTime;
    if (!time || time.toUpperCase() === "TBD") {
      return date;
    }
    return `${date} ${time}`;
  };

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const response = await fetch("/api/consultations?role=doctor");
        const data = await response.json();
        if (data.success) {
          setConsultations(data.data || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConsultations();
  }, []);

  const scheduled = consultations.filter((item) => item.status === "SCHEDULED");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Physical Consultations</h1>
        <p className="text-sm text-gray-600 mt-1">Scheduled visits from nearby physical bookings</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-sm text-gray-500">Loading...</div>
      ) : scheduled.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-gray-300 p-8 text-sm text-gray-500">
          No scheduled physical consultations yet.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduled.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{item.patientName}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Scheduled</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{item.symptoms}</p>
              <p className="mt-2 text-sm text-gray-600">
                {buildScheduleLabel(item)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
