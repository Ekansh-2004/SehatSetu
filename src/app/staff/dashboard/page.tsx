"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    pendingForms: 0,
    reviewedForms: 0,
    bookedAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [pendingRes, reviewedRes, bookedRes] = await Promise.all([
        fetch("/api/patient-forms?status=pending"),
        fetch("/api/patient-forms?status=reviewed"),
        fetch("/api/patient-forms?status=appointment_booked"),
      ]);

      const pending = await pendingRes.json();
      const reviewed = await reviewedRes.json();
      const booked = await bookedRes.json();

      setStats({
        pendingForms: pending.success ? pending.data.length : 0,
        reviewedForms: reviewed.success ? reviewed.data.length : 0,
        bookedAppointments: booked.success ? booked.data.length : 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Pending Forms",
      value: stats.pendingForms,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      link: "/staff/dashboard/forms?status=pending",
    },
    {
      title: "Reviewed Forms",
      value: stats.reviewedForms,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/staff/dashboard/forms?status=reviewed",
    },
    {
      title: "Booked Appointments",
      value: stats.bookedAppointments,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/staff/dashboard/forms?status=appointment_booked",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage patient forms and appointments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{loading ? "..." : stat.value}</div>
                  <p className="text-xs text-gray-500 mt-2">
                    Click to view details
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/staff/dashboard/forms">
            <Button variant="outline" className="w-full justify-start" size="lg">
              <Users className="h-5 w-5 mr-3" />
              View Patient Forms
            </Button>
          </Link>
          <Link href="/staff/dashboard/appointments">
            <Button variant="outline" className="w-full justify-start" size="lg">
              <Calendar className="h-5 w-5 mr-3" />
              Book Appointment
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

