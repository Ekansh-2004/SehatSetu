"use client";

import { useState, useEffect } from "react";
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
  ChevronRight,
} from "lucide-react";

type StaffMember = { id: string; clerkUserId: string | null; name: string; email: string; role: string };
type Task = {
  id: string;
  patientName: string;
  roomBed: string;
  taskType: string;
  priority: string;
  assignedToName: string;
  status: string;
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
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(true);

  useEffect(() => {
    fetchStaffList();
    fetchRecentTasks();
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

  const fetchRecentTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) setRecentTasks(data.data.slice(0, 6));
    } catch {
      // ignore
    }
  };

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
        fetchRecentTasks();
      } else {
        toast.error(data.error || "Failed to assign task");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7fff]/30 focus:border-[#4a7fff] transition placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-[#4a7fff]" />
          Task Assignment
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Assign care tasks to staff members before you leave
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── TASK CREATOR FORM ─── */}
        <div className="lg:col-span-2">
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
              {/* Row 1: Patient Name + Room/Bed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <label className={labelClass}>
                    Room / Bed Number
                  </label>
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

              {/* Task Type */}
              <div>
                <label className={labelClass}>
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.taskType}
                  onChange={(e) => setForm({ ...form, taskType: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select a task type…</option>
                  {TASK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medicine / Details */}
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

              {/* Priority toggle pills */}
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
                      {p === "urgent" && (
                        <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                      )}
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign To */}
              <div>
                <label className={labelClass}>
                  Assign To <span className="text-red-500">*</span>
                </label>
                {staffLoading ? (
                  <div className={inputClass + " text-gray-400 cursor-not-allowed"}>
                    Loading staff…
                  </div>
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
                    No staff members available yet. Ask staff to sign in once so they appear here.
                  </div>
                )}
              </div>

              {/* Notes */}
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

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || staffList.length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
                style={{
                  background: loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #4a7fff 0%, #6a5acd 100%)",
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

        {/* ─── RECENTLY ASSIGNED SIDEBAR ─── */}
        <div className="space-y-4">
          <div
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 2px 16px 0 rgba(74,127,255,0.07)" }}
          >
            <h3 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#4a7fff]" />
              Recently Assigned
            </h3>

            {recentTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border-l-4 bg-gray-50 ${
                      task.priority === "urgent" ? "border-red-400" : "border-[#4a7fff]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {task.patientName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{task.roomBed}</p>
                      </div>
                      {task.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          TASK_BADGE_COLORS[task.taskType] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {task.taskType}
                      </span>
                      {task.priority === "urgent" && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">
                          Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">→ {task.assignedToName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div className="bg-[#f0f4ff] rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-[#4a7fff] mb-1">Quick Tip</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Mark tasks as <strong>Urgent</strong> for time-sensitive procedures. Staff see urgent tasks
              highlighted in red at the top of their dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
