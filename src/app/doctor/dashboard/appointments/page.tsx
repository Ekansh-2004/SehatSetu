"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Plus,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User as UserIcon } from "lucide-react";
import { useAppointment } from "@/context/AppointmentContext";
import { useRouter } from "next/navigation";
import CreateAppointmentForm from "@/components/CreateAppointmentForm";

// Types for appointment data
interface Patient {
  name: string;
  email: string;
  phone: string;
  gender?: string;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  reason: string;
  symptoms: string[];
  paymentStatus: string;
  paymentAmount: number;
  stripeSessionId?: string;
  reminderSent: boolean;
  followUpRequired: boolean;
  createdAt: string;
  updatedAt: string;
  patient?: Patient;
}

const getAppointmentColor = (type: string) => {
  switch (type) {
    case "consultation":
      return "bg-emerald-100 border-emerald-300 text-emerald-800";
    case "follow-up":
      return "bg-blue-100 border-blue-300 text-blue-800";
    case "specialist":
      return "bg-purple-100 border-purple-300 text-purple-800";
    case "emergency":
      return "bg-red-100 border-red-300 text-red-800";
    default:
      return "bg-gray-100 border-gray-300 text-gray-800";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "completed":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function DoctorAppointments() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month" | "day">("week");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createAppointmentModalOpen, setCreateAppointmentModalOpen] = useState(false);
  const { setAppointment } = useAppointment();
  const router = useRouter();

  // Fetch doctor ID and appointments
  useEffect(() => {
    const fetchDoctorAndAppointments = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // First get the doctor record to get the doctor ID
        const doctorResponse = await fetch("/api/auth/get-doctor");
        if (doctorResponse.ok) {
          const doctorData = await doctorResponse.json();

          // Then fetch appointments for this doctor
          const appointmentsResponse = await fetch(
            `/api/doctors/${doctorData.data.id}/appointments`
          );
          if (appointmentsResponse.ok) {
            const appointmentsData = await appointmentsResponse.json();
            console.log("Fetched appointments:", appointmentsData.data);
            setAppointments(appointmentsData.data || []);
          }
        }
      } catch (error) {
        console.error("Error fetching appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorAndAppointments();
  }, [user]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const getWeekDays = useCallback(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  const getMonthDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());

    const days = [];
    const totalDays = 42; // 6 weeks * 7 days

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  const getAppointmentsForDate = (date: Date) => {
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const filteredAppointments = appointments.filter((apt) => {
      // Handle both ISO date strings and date-only strings
      const appointmentDate = new Date(apt.date);
      const appointmentYear = appointmentDate.getFullYear();
      const appointmentMonth = (appointmentDate.getMonth() + 1)
        .toString()
        .padStart(2, "0");
      const appointmentDay = appointmentDate
        .getDate()
        .toString()
        .padStart(2, "0");
      const appointmentDateStr = `${appointmentYear}-${appointmentMonth}-${appointmentDay}`;

      return appointmentDateStr === dateStr && apt.status !== "completed";
    });

    // Debug logging for today's appointments
    if (date.toDateString() === new Date().toDateString()) {
      console.log("Looking for appointments on:", dateStr);
      console.log(
        "Available appointments:",
        appointments.map((apt) => ({
          id: apt.id,
          date: apt.date,
          parsedDate: new Date(apt.date).toISOString().split("T")[0],
        }))
      );
      console.log("Found appointments for today:", filteredAppointments.length);
    }

    return filteredAppointments;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (view === "day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setMonth(
        currentDate.getMonth() + (direction === "next" ? 1 : -1)
      );
    }
    setCurrentDate(newDate);
  };

  const timeSlotsHour = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return `${hour}:00`;
  });

  const getDayAppointments = () => {
    return getAppointmentsForDate(currentDate);
  };

  // Helper to open modal with patient info
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
  };

  // Add handler for starting consultation
  const handleStartConsultation = (appointment: Appointment) => {
    setAppointment({
      id: appointment.id,
      patientName: appointment.patient?.name || "Unknown Patient",
      time: appointment.startTime,
      date: appointment.date,
      status:
        appointment.status === "completed" ||
        appointment.status === "scheduled" ||
        appointment.status === "in-progress"
          ? appointment.status
          : "scheduled",
      duration:
        appointment.startTime && appointment.endTime
          ? `${appointment.startTime} - ${appointment.endTime}`
          : undefined,
      hasRecording: false,
      hasReport: false,
    });
    router.push(
      `/doctor/dashboard/appointments/consultation/${appointment.id}`
    );
  };

  // Patient Details Modal
  const PatientDetailsModal = (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Patient Details</DialogTitle>
        </DialogHeader>
        {selectedPatient && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserIcon className="h-6 w-6 text-emerald-600" />
              <span className="font-semibold text-lg">
                {selectedPatient.name}
              </span>
            </div>
            <div>
              <span className="font-medium">Email:</span>{" "}
              {selectedPatient.email}
            </div>
            <div>
              <span className="font-medium">Phone:</span>{" "}
              {selectedPatient.phone}
            </div>
            {selectedPatient.gender && (
              <div>
                <span className="font-medium">Gender:</span>{" "}
                {selectedPatient.gender}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Create Appointment Modal
  const CreateAppointmentModal = (
    <Dialog open={createAppointmentModalOpen} onOpenChange={setCreateAppointmentModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <CreateAppointmentForm 
            onSuccess={() => {
              setCreateAppointmentModalOpen(false);
              // Refresh appointments
              window.location.reload();
            }}
            onCancel={() => setCreateAppointmentModalOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading appointments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {PatientDetailsModal}
      {CreateAppointmentModal}

      {/* Mobile-Responsive Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Appointments
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Manage your patient appointments
            </p>
          </div>
          <Button
            onClick={() => setCreateAppointmentModalOpen(true)}
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Create Appointment
          </Button>
        </div>
      </div>

      {/* Mobile-Responsive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col space-y-2 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Today&apos;s Appointments
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">
                  {getAppointmentsForDate(new Date()).length}
                </p>
              </div>
              <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-emerald-600 self-end lg:self-center" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col space-y-2 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Confirmed
                </p>
                <p className="text-xl lg:text-2xl font-bold text-green-600">
                  {
                    appointments.filter((apt) => apt.status === "confirmed")
                      .length
                  }
                </p>
              </div>
              <User className="h-6 w-6 lg:h-8 lg:w-8 text-green-600 self-end lg:self-center" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col space-y-2 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  Pending
                </p>
                <p className="text-xl lg:text-2xl font-bold text-yellow-600">
                  {
                    appointments.filter((apt) => apt.status === "pending")
                      .length
                  }
                </p>
              </div>
              <Clock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-600 self-end lg:self-center" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex flex-col space-y-2 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <p className="text-xs lg:text-sm font-medium text-gray-600">
                  This Week
                </p>
                <p className="text-xl lg:text-2xl font-bold text-blue-600">
                  {getWeekDays().reduce(
                    (total, day) => total + getAppointmentsForDate(day).length,
                    0
                  )}
                </p>
              </div>
              <Calendar className="h-6 w-6 lg:h-8 lg:w-8 text-blue-600 self-end lg:self-center" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile-Responsive Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="space-y-4 lg:space-y-0">
            {/* Calendar Navigation - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                  className="flex-shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-lg lg:text-xl font-semibold min-w-[200px] text-center">
                  {view === "day"
                    ? currentDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : formatDate(currentDate)}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("next")}
                  className="flex-shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="w-full sm:w-auto"
              >
                Today
              </Button>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center justify-center space-x-1">
              <Button
                variant={view === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("day")}
                className="flex-1 sm:flex-initial"
              >
                Day
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("week")}
                className="flex-1 sm:flex-initial"
              >
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("month")}
                className="flex-1 sm:flex-initial"
              >
                Month
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {view === "day" ? (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-1">
                  {timeSlotsHour
                    .filter((_, i) => i >= 8 && i <= 18)
                    .map((time) => {
                      const timeAppointments = getDayAppointments().filter(
                        (apt) => apt.startTime.startsWith(time.split(":")[0])
                      );
                      return (
                        <div
                          key={time}
                          className="flex border-b border-gray-100"
                        >
                          <div className="w-16 lg:w-20 py-2 lg:py-4 text-xs lg:text-sm text-gray-500 text-right pr-2 lg:pr-4">
                            {time}
                          </div>
                          <div className="flex-1 py-2 pl-2 lg:pl-4 border-l border-gray-200">
                            {timeAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={`p-2 lg:p-3 rounded border border-l-4 cursor-pointer hover:shadow-sm mb-2 ${getAppointmentColor(
                                  appointment.type
                                )}`}
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium flex items-center gap-1 text-sm lg:text-base">
                                      <span
                                        onClick={() =>
                                          handlePatientClick(
                                            appointment.patient!
                                          )
                                        }
                                        className="flex items-center gap-1 cursor-pointer hover:underline truncate"
                                      >
                                        <UserIcon className="h-3 w-3 lg:h-4 lg:w-4 text-emerald-600 flex-shrink-0" />
                                        {appointment.patient?.name ||
                                          "Unknown Patient"}
                                      </span>
                                    </div>
                                    <div className="text-xs lg:text-sm opacity-75 truncate">
                                      {appointment.reason}
                                    </div>
                                    <div className="flex items-center text-xs opacity-75 mt-1">
                                      <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                                      {appointment.startTime} -{" "}
                                      {appointment.endTime}
                                    </div>
                                  </div>
                                  <Badge
                                    className={`${getStatusColor(
                                      appointment.status
                                    )} text-xs flex-shrink-0`}
                                  >
                                    {appointment.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {timeAppointments.length === 0 && (
                              <div className="py-4 text-gray-400 text-xs lg:text-sm">
                                No appointments scheduled
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : view === "week" ? (
            <div className="space-y-4">
              {/* Week Header - Responsive */}
              <div className="hidden lg:grid lg:grid-cols-8 gap-2">
                <div className="text-sm font-medium text-gray-500 p-2">
                  Time
                </div>
                {getWeekDays().map((day, index) => (
                  <div key={index} className="text-center p-2">
                    <div className="text-sm font-medium text-gray-900">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div
                      className={`text-lg font-semibold ${
                        day.toDateString() === new Date().toDateString()
                          ? "text-emerald-600"
                          : "text-gray-700"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Week View - List Format */}
              <div className="lg:hidden space-y-3">
                {getWeekDays().map((day, dayIndex) => {
                  const dayAppointments = getAppointmentsForDate(day);
                  const isToday =
                    day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={dayIndex}
                      className={`border rounded-lg p-3 ${
                        isToday ? "ring-2 ring-emerald-500" : ""
                      }`}
                    >
                      <div
                        className={`font-medium text-sm mb-2 ${
                          isToday ? "text-emerald-600" : "text-gray-700"
                        }`}
                      >
                        {day.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      {dayAppointments.length > 0 ? (
                        <div className="space-y-2">
                          {dayAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`text-xs p-2 rounded border border-l-4 cursor-pointer hover:shadow-sm ${getAppointmentColor(
                                appointment.type
                              )}`}
                            >
                              <div className="font-medium flex items-center gap-1">
                                <span
                                  onClick={() =>
                                    handlePatientClick(appointment.patient!)
                                  }
                                  className="flex items-center gap-1 cursor-pointer hover:underline"
                                >
                                  <UserIcon className="h-3 w-3 text-emerald-600" />
                                  {appointment.patient?.name ||
                                    "Unknown Patient"}
                                </span>
                              </div>
                              <div className="flex items-center text-xs opacity-75 mt-1">
                                <Clock className="mr-1 h-3 w-3" />
                                {appointment.startTime}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">
                          No appointments
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Week Grid */}
              <div className="hidden lg:grid lg:grid-cols-8 gap-2 overflow-y-auto max-h-96">
                {/* Time column */}
                <div className="space-y-12">
                  {timeSlotsHour
                    .filter((_, i) => i >= 8 && i <= 18)
                    .map((time) => (
                      <div
                        key={time}
                        className="text-xs text-gray-500 text-right pr-2 h-12 flex items-start"
                      >
                        {time}
                      </div>
                    ))}
                </div>

                {/* Days columns */}
                {getWeekDays().map((day, dayIndex) => (
                  <div key={dayIndex} className="border-l border-gray-100">
                    {timeSlotsHour
                      .filter((_, i) => i >= 8 && i <= 18)
                      .map((time, timeIndex) => {
                        const dayAppointments = getAppointmentsForDate(
                          day
                        ).filter((apt) =>
                          apt.startTime.startsWith(time.split(":")[0])
                        );
                        return (
                          <div key={timeIndex} className="h-24 p-1">
                            {dayAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={`text-xs p-1 rounded border border-l-4 cursor-pointer hover:shadow-sm ${getAppointmentColor(
                                  appointment.type
                                )}`}
                              >
                                <div className="font-medium truncate flex items-center gap-1">
                                  <span
                                    onClick={() =>
                                      handlePatientClick(appointment.patient!)
                                    }
                                    className="flex items-center gap-1 cursor-pointer hover:underline"
                                  >
                                    <UserIcon className="h-4 w-4 text-emerald-600" />
                                    {appointment.patient?.name ||
                                      "Unknown Patient"}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs opacity-75">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {appointment.startTime}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Month Header */}
              <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center font-medium text-gray-700 p-1 lg:p-2 text-xs lg:text-sm"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7 gap-1 lg:gap-2">
                {getMonthDays().map((day, index) => {
                  const dayAppointments = getAppointmentsForDate(day);
                  const isCurrentMonth =
                    day.getMonth() === currentDate.getMonth();
                  const isToday =
                    day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`min-h-[80px] lg:min-h-[120px] p-1 lg:p-2 border rounded text-xs lg:text-sm ${
                        isCurrentMonth ? "bg-white" : "bg-gray-50"
                      } ${isToday ? "ring-2 ring-emerald-500" : ""}`}
                    >
                      <div
                        className={`text-xs lg:text-sm font-medium mb-1 lg:mb-2 ${
                          isCurrentMonth ? "text-gray-900" : "text-gray-400"
                        } ${isToday ? "text-emerald-600" : ""}`}
                      >
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map((appointment) => (
                          <div
                            key={appointment.id}
                            className={`text-xs p-1 rounded border-l-2 cursor-pointer ${getAppointmentColor(
                              appointment.type
                            )}`}
                          >
                            <div className="font-medium truncate flex items-center gap-1">
                              <span
                                onClick={() =>
                                  handlePatientClick(appointment.patient!)
                                }
                                className="flex items-center gap-1 cursor-pointer hover:underline"
                              >
                                <UserIcon className="h-3 w-3 text-emerald-600" />
                                <span className="truncate">
                                  {appointment.patient?.name ||
                                    "Unknown Patient"}
                                </span>
                              </span>
                            </div>
                            <div className="truncate text-xs">
                              {appointment.startTime}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayAppointments.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Appointments List - Mobile Optimized */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg lg:text-xl">
            Today&apos;s Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {getAppointmentsForDate(new Date()).map((appointment) => (
              <div
                key={appointment.id}
                className="border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          getAppointmentColor(appointment.type).includes(
                            "emerald"
                          )
                            ? "bg-emerald-500"
                            : getAppointmentColor(appointment.type).includes(
                                  "blue"
                                )
                              ? "bg-blue-500"
                              : getAppointmentColor(appointment.type).includes(
                                    "purple"
                                  )
                                ? "bg-purple-500"
                                : "bg-red-500"
                        }`}
                      />
                      <h3 className="font-medium text-gray-900 flex items-center gap-1 truncate">
                        <span
                          onClick={() =>
                            handlePatientClick(appointment.patient!)
                          }
                          className="flex items-center gap-1 cursor-pointer hover:underline truncate"
                        >
                          <UserIcon className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          {appointment.patient?.name || "Unknown Patient"}
                        </span>
                      </h3>
                    </div>
                    <Badge
                      className={`${getStatusColor(
                        appointment.status
                      )} text-xs flex-shrink-0`}
                    >
                      {appointment.status}
                    </Badge>
                  </div>

                  {/* Appointment Details */}
                  <p className="text-sm text-gray-600">{appointment.reason}</p>

                  {/* Info Grid - Responsive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>
                        {appointment.startTime} - {appointment.endTime}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span>Room 101</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {appointment.patient?.phone || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {appointment.patient?.email || "N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleStartConsultation(appointment)}
                      className="w-full sm:w-auto"
                    >
                      Start Consultation
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {getAppointmentsForDate(new Date()).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No appointments scheduled for today
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
