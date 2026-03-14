"use client";

import { CheckCircle2, Clock, MapPin } from "lucide-react";

type PatientConsultationItem = {
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

type PatientConsultationStatusProps = {
  consultations: PatientConsultationItem[];
};

export default function PatientConsultationStatus({ consultations }: PatientConsultationStatusProps) {
  const scheduled = consultations.filter((item) => item.status === "SCHEDULED");
  const buildScheduleLabel = (item: PatientConsultationItem) => {
    const date = (item.finalDate || item.preferredDate).split("T")[0];
    const time = item.finalTime || item.preferredTime;
    if (!time || time.toUpperCase() === "TBD") {
      return date;
    }
    return `${date} ${time}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-gray-900">Scheduled Consultations</h3>

      {scheduled.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
          No scheduled physical consultations yet.
        </div>
      ) : (
        <div className="space-y-3">
          {scheduled.map((item) => (
            <div key={item.id} className="rounded-xl border border-green-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-gray-900">{item.doctor.name}</p>
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Scheduled
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-700">{item.symptoms}</p>

              <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {buildScheduleLabel(item)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {item.doctor.clinicAddress || item.doctor.address || item.doctor.location || "Clinic location pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
