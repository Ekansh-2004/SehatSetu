"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type ConsultationRequest = {
  id: string;
  patientName: string;
  patientPhone: string;
  symptoms: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  doctor: {
    name: string;
    specialty: string;
    address: string | null;
  };
  patient: {
    name: string;
    email: string;
    phone: string | null;
  };
};

export default function ConsultationRequestsPanel() {
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Record<string, { finalDate: string }>>({});

  const preferredScheduleLabel = (request: ConsultationRequest) => {
    const date = request.preferredDate.split("T")[0];
    const time = request.preferredTime;
    if (!time || time.toUpperCase() === "TBD") {
      return date;
    }
    return `${date} ${time}`;
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/consultations?role=staff&status=REQUESTED");
      const data = await response.json();
      if (data.success) {
        setRequests(data.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const schedule = async (id: string) => {
    const finalDate = scheduleForm[id]?.finalDate;

    if (!finalDate) {
      toast.error("Please set final date.");
      return;
    }

    setSchedulingId(id);
    try {
      const response = await fetch(`/api/consultations/${id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalDate }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to schedule consultation");
      }

      toast.success("Physical consultation scheduled.");
      await fetchRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule consultation");
    } finally {
      setSchedulingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Physical Consultation Requests</h1>
        <p className="text-sm text-gray-600 mt-1">Check doctor availability and confirm final schedule.</p>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-gray-200 p-8 text-sm text-gray-500">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-gray-300 p-8 text-sm text-gray-500">
          No pending physical consultation requests.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Patient</p>
                  <p className="font-semibold text-gray-900">{request.patientName}</p>
                  <p className="text-sm text-gray-600">{request.patient?.email}</p>
                  <p className="text-sm text-gray-600">{request.patientPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Doctor Requested</p>
                  <p className="font-semibold text-gray-900">{request.doctor.name}</p>
                  <p className="text-sm text-gray-600">{request.doctor.specialty}</p>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-700">Symptoms: {request.symptoms}</div>
              <div className="mt-1 text-sm text-gray-700">
                Preferred: {preferredScheduleLabel(request)}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Final Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    value={scheduleForm[request.id]?.finalDate || ""}
                    onChange={(event) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        [request.id]: {
                          finalDate: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <button
                  onClick={() => schedule(request.id)}
                  disabled={schedulingId === request.id}
                  className="px-3 py-2 rounded-lg bg-[#4a7fff] text-white text-sm font-medium hover:bg-[#3b67e5] disabled:opacity-60"
                >
                  {schedulingId === request.id ? "Scheduling..." : "Confirm Appointment"}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Only date is required for confirmation.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
