"use client";

import { useState, useEffect, ReactNode, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Calendar,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Plus,
  CalendarPlus,
  FileImage,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PatientSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface NavItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  description: string;
  hideOnInstantBooking?: boolean;
}

const navItems: NavItem[] = [
  { 
    title: "Dashboard", 
    href: "/patient/dashboard", 
    icon: LayoutDashboard,
    description: "Overview & quick actions"
  },
  { 
    title: "My Forms", 
    href: "/patient/dashboard/forms", 
    icon: FileText,
    description: "Submitted intake forms",
    hideOnInstantBooking: true
  },
    {
    title: "Predict Disease", 
    href: "/patient/dashboard/predict", 
    icon: FolderOpen,
    description: "AI-powered disease prediction"
  },
  { 
    title: "Medical Documents", 
    href: "/patient/dashboard/documents", 
    icon: FolderOpen,
    description: "HIPAA compliant storage"
  },
  {
    title: "Analyze Report",
    href: "/patient/dashboard/analyze-report",
    icon: FileImage,
    description: "Analyze medical reports",
  },
  {
    title: "Chat",
    href: "/patient/dashboard/chat",
    icon: MessageCircle,
    description: "Ask about your health records",
  },
  { 
    title: "Appointments", 
    href: "/patient/dashboard/appointments", 
    icon: Calendar,
    description: "Confirmed consultations"
  },
  { 
    title: "Government Schemes", 
    href: "/scheme?role=patient", 
    icon: Shield,
    description: "Available health schemes"
  },
];

export default function PatientDashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);

  useEffect(() => {
    checkSession();
    setInstantBookingEnabled(process.env.NEXT_PUBLIC_INSTANT_BOOKING === 'true');
  }, []);

  // Filter nav items based on instant booking mode
  const filteredNavItems = useMemo(() => {
    if (instantBookingEnabled) {
      return navItems.filter(item => !item.hideOnInstantBooking);
    }
    return navItems;
  }, [instantBookingEnabled]);

  const checkSession = async () => {
    try {
      const response = await fetch("/api/patient/session");
      const data = await response.json();

      if (data.success && data.patient) {
        setPatient(data.patient);
      } else {
        router.push("/patient/sign-in");
      }
    } catch (error) {
      console.error("Error checking session:", error);
      router.push("/patient/sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/patient/session", { method: "DELETE" });
      toast.success("Logged out successfully");
      router.push("/patient/sign-in");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-600 mx-auto" />
          </div>
          <p className="mt-6 text-gray-600 font-medium">Loading your dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col bg-white/95 backdrop-blur-xl border-r border-gray-200/80 shadow-sm">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <Logo size="md" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className={`text-xs truncate ${isActive ? "text-emerald-600/70" : "text-gray-400"}`}>
                      {item.description}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="w-1.5 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* HIPAA Badge */}
          <div className="p-4 mx-4 mb-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Shield className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-emerald-700">HIPAA Compliant</p>
                <p className="text-[10px] text-gray-500">Your data is protected</p>
              </div>
            </div>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <Avatar className="h-10 w-10 border-2 border-emerald-200">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-semibold">
                      {getInitials(patient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-900 truncate">{patient.name}</p>
                    <p className="text-xs text-gray-500 truncate">{patient.email}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-gray-500">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
          <div className="h-full flex items-center justify-between px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-gray-900">
                  Welcome back, {patient.name.split(" ")[0]}
                </h1>
                <p className="text-xs text-gray-500">
                  Manage your health information securely
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => router.push("/patient/dashboard/forms/new")}
              >
                {instantBookingEnabled ? (
                  <>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Book Appointment</span>
                    <span className="sm:hidden">Book</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">New Intake Form</span>
                    <span className="sm:hidden">New Form</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
