"use client";

import { Loader2, MapPin, Stethoscope } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PatientForm = {
  id: string;
  patientId: string | null;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  consultationMode?: "video" | "physical";
  patient?: {
    id: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

type NearbyDoctor = {
  id: string;
  name: string;
  specialty: string;
  specialization?: string;
  clinicAddress: string;
  distance: number;
  availabilityStatus: string;
};

export default function ProcessPhysicalFromFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = String(searchParams?.get("formId") || "").trim();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<PatientForm | null>(null);
  const [doctors, setDoctors] = useState<NearbyDoctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [finalDate, setFinalDate] = useState("");

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  useEffect(() => {
    const load = async () => {
      if (!formId) {
        toast.error("Missing formId");
        router.replace("/staff/dashboard/forms?status=pending");
        return;
      }

      try {
        const formResponse = await fetch(`/api/patient-forms/${formId}`);
        const formData = await formResponse.json();

        if (!formResponse.ok || !formData.success) {
          throw new Error(formData.error || "Patient form not found");
        }

        const fetchedForm: PatientForm = formData.data;
        setForm(fetchedForm);

        if (fetchedForm.consultationMode === "video") {
          toast.error("This form is marked for video consultation.");
          router.replace("/staff/dashboard/forms?status=pending");
          return;
        }

        if (!fetchedForm.patientId) {
          throw new Error("Patient profile is not linked with this form");
        }

        const doctorsResponse = await fetch(`/api/doctors/nearby?patientId=${encodeURIComponent(fetchedForm.patientId)}`);
        const doctorsData = await doctorsResponse.json();

        if (!doctorsResponse.ok || !doctorsData.success) {
          throw new Error(doctorsData.error || "Unable to load nearby doctors");
        }

        setDoctors(doctorsData.data || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load process page");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [formId, router]);

  const handleSubmit = async () => {
    if (!form) return;

    if (!selectedDoctorId || !symptoms.trim() || !finalDate) {
      toast.error("Please select doctor, symptoms and date");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Create consultation request from patient form
      const createRes = await fetch("/api/consultations/from-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientFormId: form.id,
          doctorId: selectedDoctorId,
          symptoms: symptoms.trim(),
          preferredDate: finalDate,
          preferredTime: "TBD",
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        throw new Error(createData.error || "Failed to create physical consultation request");
      }

      // Step 2: Confirm/schedule with doctor availability check
      const consultationId = createData.data.id as string;
      const scheduleRes = await fetch(`/api/consultations/${consultationId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDate }),
      });
      const scheduleData = await scheduleRes.json();

      if (!scheduleRes.ok || !scheduleData.success) {
        throw new Error(scheduleData.error || "Selected date is not available for this doctor");
      }

      toast.success("Physical consultation scheduled successfully");
      router.replace("/staff/dashboard/physical-consultations");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process physical consultation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/staff/dashboard/forms?status=pending")}
        className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
      >
        Back to Pending Forms
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Process Physical Consultation</h1>
        <p className="text-sm text-gray-600 mt-1">Confirm nearby doctor and available date for this patient</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading form and nearby doctors...
        </div>
      ) : !form ? (
        <div className="rounded-xl bg-white border border-dashed border-gray-300 p-8 text-sm text-gray-500">
          Patient form not found.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Nearby Doctors ({doctors.length})</h2>
            {doctors.length === 0 ? (
              <p className="text-sm text-gray-500">No nearby doctors found for this patient location.</p>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {doctors.map((doctor) => {
                  const selected = selectedDoctorId === doctor.id;
                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => setSelectedDoctorId(doctor.id)}
                      className={`w-full text-left rounded-xl border p-4 transition ${
                        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{doctor.name}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Stethoscope className="h-4 w-4" /> {doctor.specialization || doctor.specialty}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {doctor.distance} km
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {doctor.clinicAddress}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Confirmation</h2>

            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="text-gray-500">Patient:</span> {form.name}</p>
              <p><span className="text-gray-500">Email:</span> {form.email}</p>
              <p><span className="text-gray-500">Phone:</span> {form.phone || "Not provided"}</p>
              <p><span className="text-gray-500">Mode:</span> <span className="inline-flex items-center gap-1"><Stethoscope className="h-3.5 w-3.5" /> Physical</span></p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Symptoms *</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="Add symptoms / reason for visit"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Final Date *</label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                value={finalDate}
                onChange={(event) => setFinalDate(event.target.value)}
              />
            </div>

            <p className="text-xs text-gray-500">
              Time slot is not required. Booking will be done for the selected date.
            </p>

            {selectedDoctor && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
                Selected doctor: <span className="font-semibold">{selectedDoctor.name}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg bg-[#4a7fff] text-white text-sm font-medium hover:bg-[#3b67e5] disabled:opacity-60"
            >
              {submitting ? "Checking availability and confirming..." : "Confirm Physical Consultation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
