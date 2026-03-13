"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/ui/logo";
import Link from "next/link";
import { Users, Calendar, LayoutDashboard, Shield } from "lucide-react";

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

      // TODO: Re-enable proper staff role validation once staff records are finalized.
      // TEMPORARY: Allow all Clerk-authenticated users to access staff dashboard
      // Previously checked staff record existence via /api/auth/create-staff
      setIsStaff(true);
      setLoading(false);
      
      /* ORIGINAL CODE - COMMENTED OUT FOR TEMPORARY ACCESS
      try {
        const response = await fetch("/api/auth/create-staff", {
          method: "POST",
        });

        if (response.ok || response.status === 409) {
          setIsStaff(true);
        } else {
          router.push("/staff/sign-in");
        }
      } catch (error) {
        console.error("Error checking staff access:", error);
        router.push("/staff/sign-in");
      } finally {
        setLoading(false);
      }
      */
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
                  href="/scheme?role=staff"
                  className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Schemes
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
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

