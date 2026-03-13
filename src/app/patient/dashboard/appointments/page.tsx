"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Video,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stethoscope,
  Building2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { DateTime } from "luxon";
import { CLINIC_TIMEZONE } from "@/lib/config/timezone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email?: string;
  phone?: string;
  image?: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  mode: string;
  reason?: string;
  doctor: Doctor;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

interface PatientSession {
  id: string;
  name: string;
  email: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("upcoming");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch patient session first
      const sessionRes = await fetch("/api/patient/session");
      const sessionData = await sessionRes.json();
      
      if (!sessionData.success || !sessionData.patient) {
        router.push("/patient/sign-in");
        return;
      }
      
      setPatient(sessionData.patient);

      // Fetch appointments
      const response = await fetch("/api/patient/appointments");
      const data = await response.json();

      if (data.success) {
        setAppointments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
      scheduled: {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Clock,
        label: "Scheduled",
      },
      confirmed: {
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
        label: "Confirmed",
      },
      completed: {
        color: "bg-gray-100 text-gray-600 border-gray-200",
        icon: CheckCircle2,
        label: "Completed",
      },
      cancelled: {
        color: "bg-red-100 text-red-700 border-red-200",
        icon: XCircle,
        label: "Cancelled",
      },
      pending: {
        color: "bg-amber-100 text-amber-700 border-amber-200",
        icon: AlertCircle,
        label: "Pending",
      },
    };
    return configs[status.toLowerCase()] || configs.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isUpcoming = (date: string, status: string, endTime?: string) => {
    if (status === "cancelled" || status === "completed") return false;
    
    // Extract just the date portion (YYYY-MM-DD)
    const appointmentDateStr = date.split('T')[0]; // "2026-01-22"
    
    // Get current date/time in clinic timezone (ET)
    const nowInET = DateTime.now().setZone(CLINIC_TIMEZONE);
    const todayStr = nowInET.toFormat('yyyy-MM-dd');
    
    // If appointment is in the future, it's upcoming
    if (appointmentDateStr > todayStr) return true;
    
    // If appointment is in the past, it's not upcoming
    if (appointmentDateStr < todayStr) return false;
    
    // Appointment is today - check if the end time has passed
    if (endTime) {
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const appointmentEndMinutes = endHours * 60 + endMinutes;
      const currentMinutes = nowInET.hour * 60 + nowInET.minute;
      
      // If end time has passed, it's not upcoming
      if (currentMinutes >= appointmentEndMinutes) return false;
    }
    
    return true;
  };

  const isPast = (date: string, status: string, endTime?: string) => {
    if (status === "completed") return true;
    if (status === "cancelled") return false; // Cancelled goes to cancelled tab, not past
    
    // Extract just the date portion (YYYY-MM-DD)
    const appointmentDateStr = date.split('T')[0]; // "2026-01-22"
    
    // Get current date/time in clinic timezone (ET)
    const nowInET = DateTime.now().setZone(CLINIC_TIMEZONE);
    const todayStr = nowInET.toFormat('yyyy-MM-dd');
    
    // If appointment date is in the past, it's past
    if (appointmentDateStr < todayStr) return true;
    
    // If appointment date is in the future, it's not past
    if (appointmentDateStr > todayStr) return false;
    
    // Appointment is today - check if the end time has passed
    if (endTime) {
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const appointmentEndMinutes = endHours * 60 + endMinutes;
      const currentMinutes = nowInET.hour * 60 + nowInET.minute;
      
      // If end time has passed, it's past
      if (currentMinutes >= appointmentEndMinutes) return true;
    }
    
    return false;
  };

  const handleJoinVideoCall = (appointment: Appointment) => {
    const roomId = `${appointment.id}`;
    const params = new URLSearchParams({
      patientName: patient?.name || "Patient",
      doctorName: appointment.doctor.name,
      date: formatDate(appointment.date),
      time: formatTime(appointment.startTime),
      appointmentId: appointment.id,
    });
    router.push(`/consultation/${roomId}?${params.toString()}`);
  };

  const canJoinCall = (appointment: Appointment) => {
    if (appointment.mode !== "video") return false;
    if (appointment.status === "cancelled") return false;
    
    // Allow joining 15 minutes before and up to 1 hour after start time
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.startTime.split(":");
    appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const now = new Date();
    const fifteenMinutesBefore = new Date(appointmentDateTime.getTime() - 15 * 60 * 1000);
    const oneHourAfter = new Date(appointmentDateTime.getTime() + 60 * 60 * 1000);
    
    return now >= fifteenMinutesBefore && now <= oneHourAfter;
  };

  const handleCancelClick = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!appointmentToCancel) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/patient/appointments/${appointmentToCancel.id}/cancel`, {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Appointment cancelled successfully");
        // Update the local state to reflect the cancellation
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentToCancel.id
              ? { ...apt, status: "cancelled" }
              : apt
          )
        );
        setCancelDialogOpen(false);
        setAppointmentToCancel(null);
      } else {
        toast.error(data.error || "Failed to cancel appointment");
      }
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Failed to cancel appointment");
    } finally {
      setCancelling(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.doctor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "upcoming" && isUpcoming(apt.date, apt.status, apt.endTime)) ||
      (activeTab === "past" && isPast(apt.date, apt.status, apt.endTime)) ||
      (activeTab === "cancelled" && apt.status === "cancelled");

    return matchesSearch && matchesTab;
  });

  const upcomingCount = appointments.filter((apt) => isUpcoming(apt.date, apt.status, apt.endTime)).length;
  const pastCount = appointments.filter((apt) => isPast(apt.date, apt.status, apt.endTime)).length;
  const cancelledCount = appointments.filter((apt) => apt.status === "cancelled").length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-500">View and manage your scheduled consultations</p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by doctor, specialty, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 border border-gray-200 p-1">
            <TabsTrigger 
              value="upcoming" 
              className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              Upcoming
              {upcomingCount > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 border-0">
                  {upcomingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="past"
              className="data-[state=active]:bg-white data-[state=active]:text-gray-700 data-[state=active]:shadow-sm"
            >
              Past
              {pastCount > 0 && (
                <Badge className="ml-2 bg-gray-200 text-gray-600 border-0">
                  {pastCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled"
              className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:shadow-sm"
            >
              Cancelled
              {cancelledCount > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700 border-0">
                  {cancelledCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="all"
              className="data-[state=active]:bg-white data-[state=active]:text-violet-600 data-[state=active]:shadow-sm"
            >
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredAppointments.length === 0 ? (
              <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="py-16 text-center">
                  <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No Appointments Found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery
                      ? "No appointments match your search criteria"
                      : activeTab === "upcoming"
                      ? "You don't have any upcoming appointments"
                      : "No appointments in this category"}
                  </p>
                  <p className="text-sm text-gray-400">
                    Submit an intake form using the button in the navigation bar to schedule an appointment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <motion.div variants={containerVariants} className="space-y-4">
                {filteredAppointments.map((apt) => {
                  const statusConfig = getStatusConfig(apt.status);
                  const StatusIcon = statusConfig.icon;
                  const showJoinButton = canJoinCall(apt);

                  return (
                    <motion.div key={apt.id} variants={itemVariants}>
                      <Card className="bg-white border-gray-200 hover:border-gray-300 transition-all overflow-hidden shadow-sm">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row">
                            {/* Date Section */}
                            <div className="lg:w-32 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-r border-gray-100">
                              <p className="text-3xl font-bold text-blue-600">
                                {new Date(apt.date).getDate()}
                              </p>
                              <p className="text-sm text-gray-500 uppercase">
                                {new Date(apt.date).toLocaleDateString("en-US", { month: "short" })}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(apt.date).getFullYear()}
                              </p>
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 p-6">
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div className="space-y-3">
                                  {/* Doctor Info */}
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                                      {apt.doctor.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {apt.doctor.name}
                                      </p>
                                      <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Stethoscope className="h-3.5 w-3.5" />
                                        {apt.doctor.specialty}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Time & Mode */}
                                  <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                      <Clock className="h-4 w-4 text-gray-400" />
                                      {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                                    </span>
                                    <span className={`flex items-center gap-1.5 ${
                                      apt.mode === "video" ? "text-emerald-600" : "text-amber-600"
                                    }`}>
                                      {apt.mode === "video" ? (
                                        <>
                                          <Video className="h-4 w-4" />
                                          Video Consultation
                                        </>
                                      ) : (
                                        <>
                                          <Building2 className="h-4 w-4" />
                                          In-Person Visit
                                        </>
                                      )}
                                    </span>
                                    <Badge className={statusConfig.color}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {statusConfig.label}
                                    </Badge>
                                  </div>

                                  {/* Reason */}
                                  {apt.reason && (
                                    <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                                      <span className="font-medium text-gray-600">Reason:</span> {apt.reason}
                                    </p>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                  {showJoinButton && (
                                    <Button
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => handleJoinVideoCall(apt)}
                                    >
                                      <Video className="h-4 w-4 mr-2" />
                                      Join Video Call
                                    </Button>
                                  )}
                                  {apt.mode === "video" && !showJoinButton && isUpcoming(apt.date, apt.status, apt.endTime) && (
                                    <Button
                                      variant="outline"
                                      className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                      onClick={() => handleJoinVideoCall(apt)}
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Open Waiting Room
                                    </Button>
                                  )}
                                  {/* Cancel Button - only for upcoming appointments */}
                                  {isUpcoming(apt.date, apt.status, apt.endTime) && apt.status !== "cancelled" && (
                                    <Button
                                      variant="outline"
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={() => handleCancelClick(apt)}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Helpful Info */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-700">Video Consultation Tips</p>
                <p className="text-sm text-gray-600 mt-1">
                  You can join your video consultation 15 minutes before the scheduled time. Make sure you have a stable internet connection and your camera/microphone are working properly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {appointmentToCancel && (
                <div className="space-y-2 mt-2">
                  <p>Are you sure you want to cancel this appointment?</p>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <p><strong>Doctor:</strong> {appointmentToCancel.doctor.name}</p>
                    <p><strong>Date:</strong> {formatDate(appointmentToCancel.date)}</p>
                    <p><strong>Time:</strong> {formatTime(appointmentToCancel.startTime)}</p>
                  </div>
                  <p className="text-amber-600 text-sm">
                    This action cannot be undone. The time slot will be freed up for other patients.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Appointment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
