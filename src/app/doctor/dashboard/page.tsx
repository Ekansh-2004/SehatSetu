"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';
import { Calendar, Clock, DollarSign, Mail, MapPin, Phone, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';
import { createDoctor, fetchDoctorInfo, fetchDoctorMetrics } from '@/store/api/doctorApi';

export default function DoctorDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  // Redux state
  const doctor = useAppSelector((state) => state.doctor.doctor.data);
  const loading = useAppSelector((state) => state.doctor.doctor.loading);
  const error = useAppSelector((state) => state.doctor.doctor.error);
  const doctorSpecialty = useAppSelector((state) => state.doctor.doctor.data?.specialty);
  const doctorAvailability = useAppSelector((state) => state.doctor.doctorAvailability.data?.slots);
  const doctorMetrics = useAppSelector((state) => state.doctor.doctorMetrics.data);
  const doctorMetricsLoading = useAppSelector((state) => state.doctor.doctorMetrics.loading);
  const isFetchDoctorDataCalled = useRef(false);


  useEffect(() => {
    if (isLoaded && user && !isFetchDoctorDataCalled.current) {
      isFetchDoctorDataCalled.current = true;
      // Fetch doctor data from Redux store
      fetchDoctorData();
    }
  }, [isLoaded, user]);

  // Fetch dashboard metrics when doctor data is available
  useEffect(() => {
    if (doctor && user) {
      fetchDashboardMetrics()
    }
  }, [doctor, user]);

  const fetchDoctorData = async () => {
    try {
      const response = await fetchDoctorInfo()
      if (!response) {
        // No doctor record yet — create one for this new doctor
        await createDoctor({})
      }
    } catch (error) {
      console.error('Error fetching doctor data:', error)
    } finally {
      isFetchDoctorDataCalled.current = false;
    }
  }

  const fetchDashboardMetrics = async () => {
    try {
      await fetchDoctorMetrics();
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">No doctor data found</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/doctor/dashboard/appointments')}>
            View Appointments
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctorMetricsLoading ? "..." : doctorMetrics?.totalAppointments?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {doctorMetricsLoading ? "Loading..." : doctorMetrics?.totalAppointments?.growthText || "+0 from last month"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Schedule</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctorMetricsLoading ? "..." : doctorMetrics?.todaySchedule.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {doctorMetricsLoading ? "Loading..." : doctorMetrics?.todaySchedule.text || "appointments today"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {doctorMetricsLoading ? "..." : `$${doctorMetrics?.revenue.total || 0}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {doctorMetricsLoading ? "Loading..." : doctorMetrics?.revenue.growthText || "+$0 from last month"}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Doctor Profile</CardTitle>
            <CardDescription>
              Your current profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
              </div>
              <span className="text-sm text-muted-foreground">{doctor.email}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone:</span>
              </div>
              <span className="text-sm text-muted-foreground">{doctor.phone}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Location:</span>
              </div>
              <span className="text-sm text-muted-foreground">{doctor.location}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Rating:</span>
              </div>
              <span className="text-sm text-muted-foreground">{doctor.rating}/5</span>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>
              Your practice overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Specialty</p>
                <p className="text-sm text-muted-foreground">{doctorSpecialty}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Experience</p>
                <p className="text-sm text-muted-foreground">{doctor.experience} years</p>
              </div>
              <div>
                <p className="text-sm font-medium">Consultation Fee</p>
                <p className="text-sm text-muted-foreground">${doctor.consultationFee}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Available Days</p>
                <p className="text-sm text-muted-foreground">{doctorAvailability?.length ?? 0} days/week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
