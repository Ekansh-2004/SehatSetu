"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { Users, Calendar, LayoutDashboard, Shield, ClipboardList, Bell } from "lucide-react";
import { toast } from "sonner";

type Task = { id: string; patientName: string; taskType: string; priority: string; status: string; createdAt: string };

function NotificationBell({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const lastSeenRef = useRef<number>(Date.now());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  const fetchTasks = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch(`/api/tasks?assignedToId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!data.success) return;

      const fetched: Task[] = data.data.filter((t: Task) => t.status === "pending").slice(0, 10);

      if (isPolling && hasMountedRef.current) {
        const newTasks = fetched.filter(
          (t) => new Date(t.createdAt).getTime() > lastSeenRef.current
        );
        for (const t of newTasks) {
          toast.info(`New task assigned: ${t.taskType} for ${t.patientName}`, {
            duration: 4000,
            description: t.priority === "urgent" ? "🔴 Urgent — please attend immediately" : undefined,
          });
          setUnread((n) => n + 1);
        }
        if (fetched.length > 0) {
          lastSeenRef.current = Math.max(...fetched.map((t) => new Date(t.createdAt).getTime()));
        }
      } else if (!hasMountedRef.current) {
        if (fetched.length > 0) {
          lastSeenRef.current = Math.max(...fetched.map((t) => new Date(t.createdAt).getTime()));
        }
        setUnread(fetched.length);
        hasMountedRef.current = true;
      }

      setTasks(fetched);
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    fetchTasks(false);
    const iv = setInterval(() => fetchTasks(true), 30_000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    setUnread(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#4a7fff] text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
          style={{ boxShadow: "0 8px 30px 0 rgba(74,127,255,0.15)" }}
        >
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">My Pending Tasks</p>
            <Link
              href="/staff/dashboard/tasks"
              onClick={() => setOpen(false)}
              className="text-xs text-[#4a7fff] font-medium hover:underline"
            >
              View all →
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No pending tasks</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href="/staff/dashboard/tasks"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#f8faff] transition"
                >
                  <div
                    className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      task.priority === "urgent" ? "bg-red-500" : "bg-[#4a7fff]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{task.taskType}</p>
                    <p className="text-xs text-gray-400 truncate">for {task.patientName}</p>
                  </div>
                  {task.priority === "urgent" && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-red-100 text-red-600 shrink-0">
                      Urgent
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStaffAccess = async () => {
      if (!isLoaded) return;
      if (!user) {
        router.push("/staff/sign-in");
        return;
      }
      setIsStaff(true);
      setLoading(false);
    };
    checkStaffAccess();
  }, [user, isLoaded, router]);

  if (loading || !isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Logo size="sm" />
              <nav className="hidden md:flex gap-6">
                <Link
                  href="/staff/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  href="/staff/dashboard/forms"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Patient Forms
                </Link>
                <Link
                  href="/staff/dashboard/appointments"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Appointments
                </Link>
                <Link
                  href="/staff/dashboard/chat"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Link>
                <Link
                  href="/scheme?role=staff"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Schemes
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification bell */}
              {user?.id && <NotificationBell userId={user.id} />}
              <span className="text-sm text-gray-600">Staff Portal</span>
              <UserButton afterSignOutUrl="/staff/sign-in" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

