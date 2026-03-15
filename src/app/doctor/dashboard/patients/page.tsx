"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Phone, ClipboardList, X, AlertTriangle, Send, BedDouble, UserCheck,
  CheckCircle2, Clock, RefreshCw, Users, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface PatientItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
}

interface StaffMember { id: string; clerkUserId: string | null; name: string; role: string }

interface StaffTask {
  id: string;
  patientName: string;
  roomBed: string;
  taskType: string;
  details: string | null;
  priority: "normal" | "urgent";
  assignedToName: string;
  notes: string | null;
  status: "pending" | "completed";
  completedAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

const TASK_TYPES = [
  "Administer Injection",
  "Change Dressing",
  "Monitor Vitals",
  "Administer Oral Medicine",
  "Wound Care",
  "Other",
];

const TASK_BADGE: Record<string, string> = {
  "Administer Injection": "bg-blue-100 text-blue-700",
  "Change Dressing": "bg-green-100 text-green-700",
  "Monitor Vitals": "bg-purple-100 text-purple-700",
  "Administer Oral Medicine": "bg-orange-100 text-orange-700",
  "Wound Care": "bg-teal-100 text-teal-700",
  Other: "bg-gray-100 text-gray-600",
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
  return initials || "P";
};

/* ── Task Board ── */
function TaskBoard() {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());
  const hasMounted = useRef(false);

  const fetchTasks = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!data.success) return;

      const all: StaffTask[] = data.data;

      if (isPolling && hasMounted.current) {
        const newlyDone = all.filter(
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
        all.filter((t) => t.status === "completed").forEach((t) => notifiedIds.current.add(t.id));
        hasMounted.current = true;
      }

      setTasks(all);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(false);
    const iv = setInterval(() => fetchTasks(true), 20_000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTasks(false);
  };

  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4a7fff] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tasks", value: tasks.length, color: "text-gray-800", bg: "bg-gray-50", border: "border-gray-200" },
          { label: "Pending", value: pending.length, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Completed", value: completed.length, color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.bg} ${s.border} px-5 py-4 flex flex-col gap-1`}>
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-[#4a7fff] font-medium hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Pending ({pending.length})</h3>
          </div>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-gray-400 text-sm">
              No pending tasks
            </div>
          ) : (
            <div className="space-y-3">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TASK_BADGE[t.taskType] || "bg-gray-100 text-gray-600"}`}>
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

        {/* Completed column */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Completed ({completed.length})</h3>
          </div>
          {completed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center text-gray-400 text-sm">
              No completed tasks yet
            </div>
          ) : (
            <div className="space-y-3">
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TASK_BADGE[t.taskType] || "bg-gray-100 text-gray-600"}`}>
                        {t.taskType}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs text-gray-400">
                      <span className="text-green-600 font-medium">✓ Done by {t.assignedToName}</span>
                      {t.completedAt && <span>Completed {fmt(t.completedAt)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Quick-assign modal ── */
function AssignTaskModal({
  patient,
  staffList,
  onClose,
  createdByName,
}: {
  patient: PatientItem;
  staffList: StaffMember[];
  onClose: () => void;
  createdByName: string;
}) {
  const [form, setForm] = useState({
    roomBed: "",
    taskType: "",
    details: "",
    priority: "normal" as "normal" | "urgent",
    assignedToId: "",
    assignedToName: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4a7fff]/30 focus:border-[#4a7fff] transition placeholder-gray-400";

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = staffList.find((s) => (s.clerkUserId || s.id) === e.target.value);
    setForm({ ...form, assignedToId: e.target.value, assignedToName: selected?.name || "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.taskType || !form.assignedToId) {
      toast.error("Please fill Task Type and Assign To");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name,
          roomBed: form.roomBed,
          taskType: form.taskType,
          details: form.details,
          priority: form.priority,
          assignedToId: form.assignedToId,
          assignedToName: form.assignedToName,
          notes: form.notes,
          createdByName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Task assigned to ${form.assignedToName}!`, {
          description: `${form.taskType} for ${patient.name}`,
        });
        onClose();
      } else {
        toast.error(data.error || "Failed to assign task");
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100"
        style={{ boxShadow: "0 8px 40px 0 rgba(74,127,255,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#f0f4ff] flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-[#4a7fff]" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Assign Task</p>
              <p className="text-xs text-gray-400">{patient.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3">
          {/* Room / Bed */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Room / Bed Number
            </label>
            <div className="relative">
              <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={form.roomBed}
                onChange={(e) => setForm({ ...form, roomBed: e.target.value })}
                placeholder="e.g. Room 204, Bed 2"
                className={inputClass + " pl-9"}
              />
            </div>
          </div>

          {/* Task Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Task Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.taskType}
              onChange={(e) => setForm({ ...form, taskType: e.target.value })}
              className={inputClass}
            >
              <option value="">Select task type…</option>
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medicine / Details</label>
            <input
              type="text"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="e.g. Insulin 10 units subcutaneous"
              className={inputClass}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <div className="flex gap-2">
              {(["normal", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition border ${
                    form.priority === p
                      ? p === "urgent"
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-[#4a7fff] text-white border-[#4a7fff]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {p === "urgent" && <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />}
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Assign To <span className="text-red-500">*</span>
            </label>
            {staffList.length > 0 ? (
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <select
                  value={form.assignedToId}
                  onChange={handleStaffChange}
                  className={inputClass + " pl-9"}
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
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special instructions…"
              rows={2}
              className={inputClass + " resize-none"}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || staffList.length === 0}
            className="w-full py-2.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition mt-1 disabled:opacity-60"
            style={{
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #4a7fff 0%, #6a5acd 100%)",
              boxShadow: loading ? "none" : "0 4px 14px 0 rgba(74,127,255,0.35)",
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                Assigning…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Assign Task
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const PatientsPage: React.FC = () => {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignPatient, setAssignPatient] = useState<PatientItem | null>(null);

  // read ?tab= from URL so notification bell deep-link works
  const activeTab = searchParams.get("tab") === "tasks" ? "tasks" : "patients";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/patients");
        const data: IApiResponse<Patient[]> = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load patients");
        setPatients((data?.data || []).map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          image: (p as unknown as { image?: string | null }).image ?? null,
        })));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load patients";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    const fetchStaff = async () => {
      try {
        const res = await fetch("/api/staff/list");
        const data = await res.json();
        if (data.success) setStaffList(data.data);
      } catch { /* ignore */ }
    };

    fetchPatients();
    fetchStaff();
  }, []);

  const filtered = patients.filter((p) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Management</h1>
        <p className="text-gray-500 text-sm mt-1">Manage patients and track assigned staff tasks</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-2">
          <TabsTrigger value="patients" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4" />
            Task Board
          </TabsTrigger>
        </TabsList>

        {/* ── PATIENTS TAB ── */}
        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by name, email, or phone"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <Button onClick={() => setFilter("")} variant="secondary" disabled={!filter}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardContent>
                <div className="p-6 text-muted-foreground">Loading patients...</div>
              </CardContent>
            </Card>
          )}

          {error && !loading && (
            <Card>
              <CardContent>
                <div className="p-6 text-red-600">{error}</div>
              </CardContent>
            </Card>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.length === 0 ? (
                <Card className="sm:col-span-2 lg:col-span-3">
                  <CardContent>
                    <div className="p-6 text-muted-foreground">No patients found.</div>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((p) => (
                  <Card key={p.id} className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2 min-h-[40px]">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                          {p.image ? (
                            <AvatarImage alt={p.name} src={p.image} />
                          ) : (
                            <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <CardTitle className="text-base truncate">{p.name}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{p.email}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span className="truncate tabular-nums">{p.phone}</span>
                        </div>
                        <button
                          onClick={() => setAssignPatient(p)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-[#4a7fff] border border-[#4a7fff]/30 bg-[#f0f4ff] hover:bg-[#4a7fff] hover:text-white transition"
                        >
                          <ClipboardList className="h-3.5 w-3.5" />
                          Assign Task
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* ── TASK BOARD TAB ── */}
        <TabsContent value="tasks">
          <TaskBoard />
        </TabsContent>
      </Tabs>

      {/* Quick-assign modal */}
      {assignPatient && (
        <AssignTaskModal
          patient={assignPatient}
          staffList={staffList}
          onClose={() => setAssignPatient(null)}
          createdByName={user?.fullName || user?.firstName || "Doctor"}
        />
      )}
    </div>
  );
};

export default PatientsPage;
