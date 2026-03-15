"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ClipboardList,
  User,
  BedDouble,
  Syringe,
  AlertTriangle,
  UserCheck,
  Send,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

type StaffMember = { id: string; clerkUserId: string | null; name: string; email: string; role: string };
type Task = {
  id: string;
  patientName: string;
  roomBed: string;
  taskType: string;
  details: string | null;
  priority: string;
  assignedToName: string;
  assignedToId: string | null;
  notes: string | null;
  status: string;
  completedAt: string | null;
  createdByName: string | null;
  createdAt: string;
};

const TASK_TYPES = [
  "Administer Injection",
  "Change Dressing",
  "Monitor Vitals",
  "Administer Oral Medicine",
  "Wound Care",
  "Other",
];

const TASK_BADGE_COLORS: Record<string, string> = {
  "Administer Injection": "bg-blue-100 text-blue-700",
  "Change Dressing": "bg-green-100 text-green-700",
  "Monitor Vitals": "bg-purple-100 text-purple-700",
  "Administer Oral Medicine": "bg-orange-100 text-orange-700",
  "Wound Care": "bg-teal-100 text-teal-700",
  Other: "bg-gray-100 text-gray-600",
};

const defaultForm = {
  patientName: "",
  roomBed: "",
  taskType: "",
  details: "",
  priority: "normal" as "normal" | "urgent",
  assignedToId: "",
  assignedToName: "",
  notes: "",
};

export default function DoctorTasksPage() {
  const { user } = useUser();
  const [form, setForm] = useState(defaultForm);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const hasMounted = useRef(false);

  const fetchTasks = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!data.success) return;

      const fetched: Task[] = data.data;

      if (isPolling && hasMounted.current) {
        const newlyDone = fetched.filter(
          (t) => t.status === "completed" && !notifiedIds.current.has(t.id)
        );
        for (const t of newlyDone) {
          notifiedIds.current.add(t.id);
          toast.success(`✅ Task completed by ${t.assignedToName}`, {
            description: `${t.taskType} for ${t.patientName}`,
            duration: 5000,
          });
        }
      } else if (!hasMounted.current) {
        fetched.filter((t) => t.status === "completed").forEach((t) => notifiedIds.current.add(t.id));
        hasMounted.current = true;
      }

      setAllTasks(fetched);
    } catch {
      // ignore
    } finally {
      setTasksLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchStaffList = async () => {
    try {
      const res = await fetch("/api/staff/list");
      const data = await res.json();
      if (data.success) setStaffList(data.data);
    } catch {
      // silently fail
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchTasks(false);
    const iv = setInterval(() => fetchTasks(true), 20_000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staffList.find((s) => s.clerkUserId === e.target.value || s.id === e.target.value);
    setForm({
      ...form,
      assignedToId: e.target.value,
      assignedToName: selected?.name || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName || !form.taskType || !form.assignedToId) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          createdByName: user?.fullName || user?.firstName || "Doctor",
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Task assigned to ${form.assignedToName}!`, {
          description: `${form.taskType} for ${form.patientName} (${form.roomBed})`,
        });
        setForm(defaultForm);
        fetchTasks(false);
      } else {
        toast.error(data.error || "Failed to assign task");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTasks(false);
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7fff]/30 focus:border-[#4a7fff] transition placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  const pending = allTasks.filter((t) => t.status === "pending");
  const completed = allTasks.filter((t) => t.status === "completed");

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#4a7fff]" />
            Task Assignment
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Assign care tasks to staff members and track completion in real time
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-[#4a7fff] font-medium hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: allTasks.length, color: "text-gray-800", bg: "bg-gray-50", border: "border-gray-200" },
          { label: "Pending", value: pending.length, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Completed", value: completed.length, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.bg} ${s.border} px-5 py-4`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── TASK CREATOR FORM ─── */}
        <div className="lg:col-span-1">
          <div
            className="bg-white rounded-2xl border border-gray-100 p-6"
            style={{ boxShadow: "0 2px 16px 0 rgba(74,127,255,0.07)" }}
          >
            <h2 className="font-semibold text-gray-800 mb-5 flex items-center gap-2 text-base">
              <span className="w-7 h-7 rounded-full bg-[#f0f4ff] flex items-center justify-center">
                <Syringe className="h-4 w-4 text-[#4a7fff]" />
              </span>
              New Task
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelClass}>
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.patientName}
                      onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className={inputClass + " pl-10"}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Room / Bed Number</label>
                  <div className="relative">
                    <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.roomBed}
                      onChange={(e) => setForm({ ...form, roomBed: e.target.value })}
                      placeholder="e.g. Room 204, Bed 2"
                      className={inputClass + " pl-10"}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Task Type <span className="text-red-500">*</span></label>
                <select
                  value={form.taskType}
                  onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select a task type…</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Medicine / Details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="e.g. Insulin 10 units subcutaneous before meals"
                  rows={2}
                  className={inputClass + " resize-none"}
                />
              </div>

              <div>
                <label className={labelClass}>Priority</label>
                <div className="flex gap-3">
                  {(["normal", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition border ${
                        form.priority === p
                          ? p === "urgent"
                            ? "bg-red-500 text-white border-red-500 shadow"
                            : "bg-[#4a7fff] text-white border-[#4a7fff] shadow"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {p === "urgent" && <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Assign To <span className="text-red-500">*</span></label>
                {staffLoading ? (
                  <div className={inputClass + " text-gray-400 cursor-not-allowed"}>Loading staff…</div>
                ) : staffList.length > 0 ? (
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={form.assignedToId}
                      onChange={handleStaffChange}
                      className={inputClass + " pl-10"}
                    >
                      <option value="">Select staff member…</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.clerkUserId || s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className={inputClass + " text-amber-700 bg-amber-50 border-amber-200"}>
                    No staff members available yet.
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Notes for Staff (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions or precautions…"
                  rows={2}
                  className={inputClass + " resize-none"}
                />
              </div>

              <button
                type="submit"
                disabled={loading || staffList.length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
                style={{
                  background: loading ? "#94a3b8" : "linear-gradient(135deg, #4a7fff 0%, #6a5acd 100%)",
                  boxShadow: loading ? "none" : "0 4px 14px 0 rgba(74,127,255,0.35)",
                }}
              >
                {loading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Assigning…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Assign Task
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ─── LIVE TASK BOARD ─── */}
        <div className="lg:col-span-2 space-y-4">
          {tasksLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4a7fff] border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pending */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-gray-800 text-sm">Pending ({pending.length})</h3>
                </div>
                {pending.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-gray-400 text-xs">
                    No pending tasks
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                    {pending.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl border shadow-sm overflow-hidden"
                        style={{
                          borderLeft: t.priority === "urgent" ? "4px solid #ef4444" : "4px solid #4a7fff",
                          boxShadow: t.priority === "urgent"
                            ? "0 2px 12px 0 rgba(239,68,68,0.10)"
                            : "0 2px 12px 0 rgba(74,127,255,0.07)",
                        }}
                      >
                        {t.priority === "urgent" && (
                          <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                            <span className="text-xs font-semibold text-red-600">Urgent</span>
                          </div>
                        )}
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">{t.patientName}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <BedDouble className="h-3 w-3" /> {t.roomBed}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TASK_BADGE_COLORS[t.taskType] || "bg-gray-100 text-gray-600"}`}>
                              {t.taskType}
                            </span>
                          </div>
                          {t.details && (
                            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">{t.details}</p>
                          )}
                          <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
                            <span>→ {t.assignedToName}</span>
                            <span>{fmt(t.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <h3 className="font-semibold text-gray-800 text-sm">Completed ({completed.length})</h3>
                </div>
                {completed.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-gray-400 text-xs">
                    No completed tasks yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                    {completed.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden opacity-90"
                        style={{ borderLeft: "4px solid #22c55e" }}
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-semibold text-gray-700 text-sm">{t.patientName}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <BedDouble className="h-3 w-3" /> {t.roomBed}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TASK_BADGE_COLORS[t.taskType] || "bg-gray-100 text-gray-600"}`}>
                              {t.taskType}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
                            <span className="text-green-600 font-medium">✓ Done by {t.assignedToName}</span>
                            {t.completedAt && <span>{fmt(t.completedAt)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

