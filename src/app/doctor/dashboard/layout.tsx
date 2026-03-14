"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { generateBreadcrumbs } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { Bell, CheckCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useUser } from "@clerk/nextjs";

type TaskNotif = {
  id: string;
  patientName: string;
  taskType: string;
  priority: string;
  status: string;
  assignedToName: string;
  completedAt: string | null;
};

function DoctorNotificationBell() {
  const [completedTasks, setCompletedTasks] = useState<TaskNotif[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track the IDs of tasks we've already notified about
  const notifiedIds = useRef<Set<string>>(new Set());
  const hasMountedRef = useRef(false);

  const fetchTasks = useCallback(async (isPolling = false) => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!data.success) return;

      const all: TaskNotif[] = data.data;
      const done = all.filter((t) => t.status === "completed").slice(0, 20);

      if (isPolling && hasMountedRef.current) {
        const newlyDone = done.filter((t) => !notifiedIds.current.has(t.id));
        for (const t of newlyDone) {
          notifiedIds.current.add(t.id);
          setUnread((n) => n + 1);
          toast.success(`✅ Task completed by ${t.assignedToName}`, {
            description: `${t.taskType} for ${t.patientName}`,
            duration: 5000,
          });
        }
      } else if (!hasMountedRef.current) {
        done.forEach((t) => notifiedIds.current.add(t.id));
        hasMountedRef.current = true;
      }

      setCompletedTasks(done);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTasks(false);
    const iv = setInterval(() => fetchTasks(true), 20_000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

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
        aria-label="Task completion notifications"
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
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
            <p className="text-sm font-semibold text-gray-800">Completed Tasks</p>
            <Link
              href="/doctor/dashboard/patients?tab=tasks"
              onClick={() => setOpen(false)}
              className="text-xs text-[#4a7fff] font-medium hover:underline"
            >
              View all →
            </Link>
          </div>

          {completedTasks.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <ClipboardList className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No completed tasks yet</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {completedTasks.map((task) => (
                <Link
                  key={task.id}
                  href="/doctor/dashboard/patients?tab=tasks"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-[#f8faff] transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{task.taskType}</p>
                    <p className="text-xs text-gray-400 truncate">
                      for {task.patientName} · by {task.assignedToName}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DashboardLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItemType[]>([]);

  useEffect(() => {
    if (pathname) {
      setBreadcrumbs(generateBreadcrumbs(pathname));
    }
  }, [pathname]);

  // Role validation - redirect if not doctor
  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.unsafeMetadata?.role as string;
      if (userRole && userRole !== "doctor") {
        router.push("/doctor/dashboard");
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider className="p-2">
      <AppSidebar />
      <SidebarInset className="bg-sidebar">
        <div className="flex flex-col min-h-full w-full">
          <div className="bg-white rounded-sm shadow-md overflow-hidden flex-1 flex flex-col min-h-0">
            <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4 bg-gray-200/60"
                />
                <Logo size="sm" variant="icon" className="mr-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.href} className="flex items-center">
                        {index > 0 && (
                          <BreadcrumbSeparator className="mx-2 text-gray-300" />
                        )}
                        <BreadcrumbItem
                          className={index === 0 ? "hidden md:block" : ""}
                        >
                          {crumb.isLast ? (
                            <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.href}>
                              {crumb.name}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <div className="flex items-center gap-2 pr-4">
                <DoctorNotificationBell />
              </div>
            </header>
            <div className="flex-1 p-6 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
