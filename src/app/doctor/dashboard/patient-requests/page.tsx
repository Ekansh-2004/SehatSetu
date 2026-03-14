"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PhoneIncoming,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  Pill,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────── //
interface PatientInfo {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  gender: string | null;
  dateOfBirth: string | null;
  medicalHistory: unknown;
  allergies: unknown;
  currentMedications: unknown;
}

interface PatientRequest {
  id: string;
  patientId: string;
  summary: string;
  transcript: string | null;
  status: "PENDING" | "ACCEPTED" | "RESOLVED";
  createdAt: string;
  patient: PatientInfo;
}

// ── Helpers ────────────────────────────────────────────────────────────── //
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function renderJsonList(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.map(String);
  if (typeof data === "object") return Object.values(data as Record<string, unknown>).map(String);
  return [String(data)];
}

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle2,
  },
  RESOLVED: {
    label: "Resolved",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle2,
  },
};

// ── Main component ─────────────────────────────────────────────────────── //
export default function PatientRequestsPage() {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "ACCEPTED" | "RESOLVED">("PENDING");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/patient-requests?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Auto-refresh every 15 seconds for pending requests
  useEffect(() => {
    if (statusFilter !== "PENDING") return;
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, [statusFilter, fetchRequests]);

  const updateStatus = async (id: string, status: "ACCEPTED" | "RESOLVED") => {
    try {
      setUpdatingId(id);
      const res = await fetch("/api/patient-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove from current list since status changed
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to update request:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <PhoneIncoming className="h-8 w-8 text-blue-600" />
            Call Requests
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Patient requests from AI-assisted phone calls
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Status filter tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        {(["PENDING", "ACCEPTED", "RESOLVED"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? "bg-blue-600 text-white" : ""}
            >
              {cfg.label}
            </Button>
          );
        })}
      </div>

      {/* ── Request cards ──────────────────────────────────────────────── */}
      {loading && requests.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PhoneIncoming className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              No {statusFilter.toLowerCase()} requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const isExpanded = expandedId === req.id;
            const cfg = STATUS_CONFIG[req.status];
            const StatusIcon = cfg.icon;
            const medicalHistory = renderJsonList(req.patient.medicalHistory);
            const allergies = renderJsonList(req.patient.allergies);
            const medications = renderJsonList(req.patient.currentMedications);

            return (
              <Card key={req.id} className="overflow-hidden">
                {/* ── Card header (always visible) ───────────────────── */}
                <CardHeader
                  className="cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <CardTitle className="text-lg">{req.patient.name}</CardTitle>
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        {req.patient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {req.patient.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeAgo(req.createdAt)}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === "PENDING" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 text-white"
                          disabled={updatingId === req.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(req.id, "ACCEPTED");
                          }}
                        >
                          Accept
                        </Button>
                      )}
                      {req.status === "ACCEPTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-300 text-green-700"
                          disabled={updatingId === req.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(req.id, "RESOLVED");
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Summary always visible */}
                  <div className="mt-2 text-sm text-gray-700 bg-blue-50/60 rounded px-3 py-2">
                    <strong>Summary:</strong> {req.summary}
                  </div>
                </CardHeader>

                {/* ── Expanded content ────────────────────────────────── */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 border-t">
                    <div className="grid md:grid-cols-2 gap-6 mt-4">
                      {/* Patient info */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <User className="h-4 w-4" /> Patient Info
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-500">Name:</span>{" "}
                            <span className="font-medium">{req.patient.name}</span>
                          </div>
                          {req.patient.phone && (
                            <div>
                              <span className="text-gray-500">Phone:</span>{" "}
                              <span className="font-medium">{req.patient.phone}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Email:</span>{" "}
                            <span className="font-medium">{req.patient.email}</span>
                          </div>
                          {req.patient.gender && (
                            <div>
                              <span className="text-gray-500">Gender:</span>{" "}
                              <span className="font-medium capitalize">{req.patient.gender}</span>
                            </div>
                          )}
                          {req.patient.dateOfBirth && (
                            <div>
                              <span className="text-gray-500">DOB:</span>{" "}
                              <span className="font-medium">
                                {new Date(req.patient.dateOfBirth).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Medical history */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" /> Medical History
                        </h4>
                        {medicalHistory.length > 0 ? (
                          <ul className="space-y-1 text-sm">
                            {medicalHistory.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No medical history recorded</p>
                        )}
                      </div>

                      {/* Allergies */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" /> Allergies
                        </h4>
                        {allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {allergies.map((item, i) => (
                              <span
                                key={i}
                                className="inline-block text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No known allergies</p>
                        )}
                      </div>

                      {/* Current medications */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Pill className="h-4 w-4 text-green-600" /> Current Medications
                        </h4>
                        {medications.length > 0 ? (
                          <ul className="space-y-1 text-sm">
                            {medications.map((item, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No current medications</p>
                        )}
                      </div>
                    </div>

                    {/* Transcript */}
                    {req.transcript && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                          Call Transcript
                        </h4>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-60 overflow-auto border">
                          {req.transcript}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
