"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { NearbyDoctor } from "./NearbyDoctorsList";

type PhysicalConsultationFormProps = {
  doctor: NearbyDoctor;
  patientName: string;
  patientPhone?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function PhysicalConsultationForm({
  doctor,
  patientName,
  patientPhone,
  onSuccess,
  onCancel,
}: PhysicalConsultationFormProps) {
  const [form, setForm] = useState({
    patientName,
    phoneNumber: patientPhone || "",
    symptoms: "",
    preferredDate: "",
  });
  const [report, setReport] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7fff]/30";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.patientName || !form.phoneNumber || !form.symptoms || !form.preferredDate) {
      toast.error("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("doctorId", doctor.id);
      payload.append("patientName", form.patientName);
      payload.append("phoneNumber", form.phoneNumber);
      payload.append("symptoms", form.symptoms);
      payload.append("preferredDate", form.preferredDate);
      payload.append("preferredTime", "TBD");
      if (report) {
        payload.append("report", report);
      }

      const response = await fetch("/api/consultations", {
        method: "POST",
        body: payload,
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create consultation request");
      }

      toast.success("Consultation request submitted.");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
        Booking with <span className="font-semibold">{doctor.name}</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name</label>
        <input
          className={inputClass}
          value={form.patientName}
          readOnly
          onChange={() => undefined}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
        <input
          className={inputClass}
          value={form.phoneNumber}
          onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
          placeholder="Enter phone number"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Symptoms / Reason for Visit</label>
        <textarea
          className={inputClass + " resize-none"}
          rows={3}
          value={form.symptoms}
          onChange={(event) => setForm((prev) => ({ ...prev, symptoms: event.target.value }))}
          placeholder="Briefly describe symptoms"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date</label>
          <input
            className={inputClass}
            type="date"
            value={form.preferredDate}
            onChange={(event) => setForm((prev) => ({ ...prev, preferredDate: event.target.value }))}
          />
        </div>
      </div>

      <p className="text-xs text-gray-500">Time slot is not required. Request will be created for the selected date.</p>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Upload Reports (optional)</label>
        <input
          className={inputClass}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(event) => setReport(event.target.files?.[0] || null)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-2 rounded-lg bg-[#4a7fff] text-white text-sm font-medium hover:bg-[#3b67e5] disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
