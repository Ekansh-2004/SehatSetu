"use client";

import { MapPin, Stethoscope } from "lucide-react";

export type NearbyDoctor = {
  id: string;
  name: string;
  specialty: string;
  clinicAddress: string;
  distance: number;
  availabilityStatus: string;
};

type NearbyDoctorsListProps = {
  doctors: NearbyDoctor[];
  onBook: (doctor: NearbyDoctor) => void;
};

export default function NearbyDoctorsList({ doctors, onBook }: NearbyDoctorsListProps) {
  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        No nearby doctors found within 20 km.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {doctors.map((doctor) => (
        <div key={doctor.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{doctor.name}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                <Stethoscope className="h-4 w-4" />
                {doctor.specialty}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {doctor.distance} km
            </span>
          </div>

          <p className="text-sm text-gray-600 mt-3 flex items-start gap-1">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            {doctor.clinicAddress}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                doctor.availabilityStatus === "Available"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {doctor.availabilityStatus}
            </span>

            <button
              onClick={() => onBook(doctor)}
              className="px-3 py-1.5 rounded-lg bg-[#4a7fff] text-white text-sm font-medium hover:bg-[#3b67e5] transition"
            >
              Book Physical Consultation
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
