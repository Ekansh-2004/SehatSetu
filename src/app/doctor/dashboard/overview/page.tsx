"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, DollarSign, Users, Activity } from "lucide-react";
import AnimatedNumber from "@/components/ui/animated-number";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

interface DashboardMetrics {
  totalAppointments: {
    count: number;
    growth: number;
    growthText: string;
  };
  todaySchedule: {
    count: number;
    text: string;
  };
  revenue: {
    total: number;
    growth: number;
    growthText: string;
  };
  patients: {
    total: number;
    newThisMonth: number;
  };
}

const OverviewPage: React.FC = () => {
  const { user } = useUser();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch dashboard metrics
  useEffect(() => {
    if (user) {
      fetchDashboardMetrics();
    }
  }, [user]);

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const response = await fetch('/api/doctors/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 dashboard-content min-h-full">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 dashboard-icon-revenue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              {metricsLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <AnimatedNumber
                  value={metrics?.revenue.total || 0}
                  prefix="$"
                  className="font-medium"
                  fontSize={24}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? (
                "Loading..."
              ) : (
                <>
                  <AnimatedNumber
                    value={Math.abs(metrics?.revenue.growth || 0)}
                    prefix={metrics?.revenue.growth && metrics.revenue.growth >= 0 ? "+" : "-"}
                    fontSize={12}
                    suffix=" USD"
                    delay={0.2}
                  />{" "}
                  from last month
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-5 w-5 dashboard-icon-patients" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              {metricsLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <AnimatedNumber
                  value={metrics?.patients.total || 0}
                  className="font-medium"
                  fontSize={24}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? (
                "Loading..."
              ) : (
                <>
                  <AnimatedNumber
                    value={metrics?.patients.newThisMonth || 0}
                    prefix="+"
                    fontSize={12}
                    suffix=" new"
                    delay={0.4}
                  />{" "}
                  this month
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CreditCard className="h-5 w-5 dashboard-icon-appointments" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              {metricsLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                <AnimatedNumber
                  value={metrics?.totalAppointments.count || 0}
                  className="font-medium"
                  fontSize={24}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {metricsLoading ? (
                "Loading..."
              ) : (
                <>
                  <AnimatedNumber
                    value={Math.abs(metrics?.totalAppointments.growth || 0)}
                    prefix={metrics?.totalAppointments.growth && metrics.totalAppointments.growth >= 0 ? "+" : "-"}
                    fontSize={12}
                    delay={0.6}
                  />
                  &nbsp;from last month
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              Active Patients
            </CardTitle>
            <Activity className="h-5 w-5 dashboard-icon-active" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium">
              <AnimatedNumber
                value={573}
                prefix="+"
                className="font-medium"
                fontSize={24}
              />
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <AnimatedNumber
                value={201}
                prefix="+"
                fontSize={12}
                delay={0.8}
              />
              &nbsp;since last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4 hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader>
            <CardTitle>Patient Visits Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100 flex items-center justify-center">
              <p className="text-muted-foreground">
                Chart visualization will go here
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 hover:scale-101 transition-all duration-300 hover:shadow-xl">
          <CardHeader>
            <CardTitle>Recent Appointments</CardTitle>
            <CardDescription className="flex items-center">
              You have&nbsp;
              {metricsLoading ? (
                <span>...</span>
              ) : (
                <AnimatedNumber value={metrics?.todaySchedule.count || 0} fontSize={14} delay={1} />
              )}
              &nbsp;appointments today.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                <div className="ml-4 grid gap-1">
                  <p className="text-sm font-medium leading-none">John Smith</p>
                  <p className="text-sm text-muted-foreground">
                    General Checkup
                  </p>
                </div>
                <div className="ml-auto font-medium text-blue-600">
                  10:00 AM
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <div className="ml-4 grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    Sarah Johnson
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Follow-up Visit
                  </p>
                </div>
                <div className="ml-auto font-medium text-green-600">
                  11:30 AM
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                <div className="ml-4 grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    Michael Brown
                  </p>
                  <p className="text-sm text-muted-foreground">Consultation</p>
                </div>
                <div className="ml-auto font-medium text-purple-600">
                  2:15 PM
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                <div className="ml-4 grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    Emily Davis
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Lab Results Review
                  </p>
                </div>
                <div className="ml-auto font-medium text-orange-600">
                  3:45 PM
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="hover:scale-101 transition-all duration-300 hover:shadow-xl">
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
          <CardDescription>
            A list of your recent patients and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-teal-100">
            <div className="h-[300px] w-full bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">
                Patient data table will go here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPage;
