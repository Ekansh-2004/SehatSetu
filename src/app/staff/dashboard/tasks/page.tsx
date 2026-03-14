"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Copy,
  Check,
  BedDouble,
  User,
} from "lucide-react";

type Task = {
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
};

/* ── badge colours per task type ── */
const BADGE: Record<string, { bg: string; text: string }> = {
  "Administer Injection": { bg: "bg-blue-100", text: "text-blue-700" },
  "Change Dressing": { bg: "bg-green-100", text: "text-green-700" },
  "Monitor Vitals": { bg: "bg-purple-100", text: "text-purple-700" },
  "Administer Oral Medicine": { bg: "bg-orange-100", text: "text-orange-700" },
  "Wound Care": { bg: "bg-teal-100", text: "text-teal-700" },
  Other: { bg: "bg-gray-100", text: "text-gray-600" },
};

/* ── AI assistant modal ── */
function AiModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `Guide me step by step on how to ${task.taskType} for a patient.\nPatient details: ${task.details || "No specific details provided"}.\nPatient name: ${task.patientName}, Room/Bed: ${task.roomBed}.`;

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <Sparkles className="h-4 w-4 text-[#4a7fff]" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">AI Assistant</p>
              <p className="text-xs text-gray-400">Step-by-step procedure guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            Send this message to SehatSetu AI Assistant to get a step-by-step guide for this
            procedure:
          </p>

          <div className="bg-[#f8faff] border border-blue-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
            {message}
          </div>

          <button
            onClick={copy}
            className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
            style={{
              background: copied ? "#22c55e" : "linear-gradient(135deg, #4a7fff 0%, #6a5acd 100%)",
              color: "white",
              boxShadow: copied
                ? "0 4px 14px 0 rgba(34,197,94,0.3)"
                : "0 4px 14px 0 rgba(74,127,255,0.35)",
            }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy Message
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Use this with SehatSetu AI Assistant for guided help.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── single task card ── */
function TaskCard({
  task,
  onComplete,
  onAskAI,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onAskAI: (task: Task) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const isUrgent = task.priority === "urgent";
  const isCompleted = task.status === "completed";

  const badge = BADGE[task.taskType] || { bg: "bg-gray-100", text: "text-gray-600" };

  const handleCheck = async () => {
    if (isCompleted) return;
    setCompleting(true);
    await onComplete(task.id);
    setCompleting(false);
  };

  const formatted = (iso: string) =>
    new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
        isCompleted
          ? "opacity-60 border-gray-100"
          : isUrgent
          ? "border-red-200 shadow"
          : "border-gray-100 shadow-sm"
      } ${isUrgent && !isCompleted ? "animate-pulse-border" : ""}`}
      style={{
        borderLeft: isCompleted
          ? "4px solid #d1d5db"
          : isUrgent
          ? "4px solid #ef4444"
          : "4px solid #4a7fff",
        boxShadow: isUrgent && !isCompleted
          ? "0 2px 20px 0 rgba(239,68,68,0.12)"
          : "0 2px 12px 0 rgba(74,127,255,0.07)",
      }}
    >
      {/* Urgent pulse ring */}
      {isUrgent && !isCompleted && (
        <div className="absolute top-3 right-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        </div>
      )}

      {/* ── TOP SECTION ── */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{task.patientName}</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <BedDouble className="h-3 w-3" />
                {task.roomBed}
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span
                className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.bg} ${badge.text}`}
              >
                {task.taskType}
              </span>
              {isUrgent && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-100 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Done
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Assigned by */}
        {task.createdByName && (
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <User className="h-3 w-3" />
            Assigned by {task.createdByName}
          </p>
        )}

        {/* Details */}
        {task.details && (
          <p className="text-sm text-gray-600 mt-2 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
            {task.details}
          </p>
        )}

        {/* Doctor's notes */}
        {task.notes && (
          <div className="mt-2 flex items-start gap-2">
            <span className="text-xs font-medium text-gray-500 shrink-0 mt-0.5">Note:</span>
            <p className="text-xs text-gray-500 leading-relaxed">{task.notes}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {isCompleted && task.completedAt
            ? `Completed ${formatted(task.completedAt)}`
            : `Assigned ${formatted(task.createdAt)}`}
        </div>
      </div>

      {/* ── MIDDLE SECTION: Mark as Done ── */}
      {!isCompleted && (
        <div className="px-5 py-3 border-t border-gray-50">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={handleCheck}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                completing
                  ? "border-green-400 bg-green-400"
                  : "border-gray-300 group-hover:border-[#4a7fff]"
              }`}
            >
              {completing && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-[#4a7fff] transition">
              {completing ? "Marking done…" : "Mark as Done"}
            </span>
          </label>
        </div>
      )}

      {/* ── BOTTOM SECTION: AI disclaimer strip ── */}
      <div className="bg-amber-50 border-t border-amber-100 px-5 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Not sure how to perform this procedure?{" "}
              <span className="font-medium">Our AI assistant can guide you step by step.</span>
            </p>
          </div>
          <button
            onClick={() => onAskAI(task)}
            className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 px-3 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1 shrink-0"
          >
            Ask AI Assistant <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function StaffTasksPage() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [aiTask, setAiTask] = useState<Task | null>(null);
  const lastSeenRef = useRef<number>(0);
  const hasMountedRef = useRef(false);

  const fetchTasks = useCallback(
    async (isPolling = false) => {
      try {
        const assignedToId = user?.id;
        const url = assignedToId
          ? `/api/tasks?assignedToId=${encodeURIComponent(assignedToId)}`
          : "/api/tasks";

        const res = await fetch(url);
        const data = await res.json();
        if (!data.success) return;

        const fetched: Task[] = data.data;

        if (isPolling && hasMountedRef.current) {
          // Find tasks newer than what we've seen
          const newTasks = fetched.filter(
            (t) => new Date(t.createdAt).getTime() > lastSeenRef.current && t.status === "pending"
          );
          for (const t of newTasks) {
            toast.info(`New task: ${t.taskType} for ${t.patientName}`, {
              duration: 4000,
              description: `${t.roomBed} · ${t.priority === "urgent" ? "🔴 Urgent" : "Normal"}`,
            });
          }
        }

        if (fetched.length > 0) {
          lastSeenRef.current = Math.max(...fetched.map((t) => new Date(t.createdAt).getTime()));
        }

        setTasks(fetched);
        hasMountedRef.current = true;
      } catch {
        // ignore polling errors
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user) return;
    fetchTasks(false);
    const interval = setInterval(() => fetchTasks(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchTasks, user]);

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (data.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, status: "completed", completedAt: new Date().toISOString() }
              : t
          )
        );
        toast.success("Task marked as complete!", { duration: 3000 });
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  const pending = tasks
    .filter((t) => t.status === "pending")
    .sort((a, b) => {
      if (a.priority === "urgent" && b.priority !== "urgent") return -1;
      if (b.priority === "urgent" && a.priority !== "urgent") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completed = tasks
    .filter((t) => t.status === "completed")
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  return (
    <div className="min-h-screen" style={{ background: "#f0f4ff" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* ── HEADER ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-[#4a7fff]" />
            My Tasks
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Tasks assigned to you by the doctor
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#4a7fff] text-white">
                {pending.length} pending
              </span>
            )}
          </p>
        </div>

        {/* ── LOADING ── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#4a7fff] border-t-transparent" />
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!loading && tasks.length === 0 && (
          <div
            className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
            style={{ boxShadow: "0 2px 16px 0 rgba(74,127,255,0.07)" }}
          >
            <ClipboardList className="h-14 w-14 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No tasks assigned yet</p>
            <p className="text-gray-400 text-sm mt-1">
              The doctor will assign tasks when needed.
            </p>
          </div>
        )}

        {/* ── PENDING TASKS ── */}
        {!loading && pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onAskAI={setAiTask}
              />
            ))}
          </div>
        )}

        {/* ── COMPLETED SECTION ── */}
        {!loading && completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition mb-3"
            >
              {showCompleted ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Completed Tasks ({completed.length})
            </button>

            {showCompleted && (
              <div className="space-y-4">
                {completed.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onAskAI={setAiTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AI MODAL ── */}
      {aiTask && <AiModal task={aiTask} onClose={() => setAiTask(null)} />}
    </div>
  );
}
