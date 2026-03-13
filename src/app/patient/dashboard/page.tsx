"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FolderOpen,
  Calendar,
  Video,
  Plus,
  Clock,
  ChevronRight,
  Upload,
  Eye,
  ExternalLink,
  Stethoscope,
  Shield,
  FileImage,
} from "lucide-react";
import { DateTime } from "luxon";
import { CLINIC_TIMEZONE } from "@/lib/config/timezone";

interface PatientSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface FormSubmission {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  notes?: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  mode: string;
  doctor: {
    name: string;
    specialty: string;
  };
  reason: string;
}

interface MedicalDocument {
  uuid: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  uploadedAt: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function PatientDashboard() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);

  useEffect(() => {
    setInstantBookingEnabled(process.env.NEXT_PUBLIC_INSTANT_BOOKING === 'true');
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch patient session
      const sessionRes = await fetch("/api/patient/session");
      const sessionData = await sessionRes.json();
      
      if (!sessionData.success || !sessionData.patient) {
        router.push("/patient/sign-in");
        return;
      }
      
      setPatient(sessionData.patient);

      // Fetch forms, appointments, and documents in parallel
      const [formsRes, appointmentsRes, documentsRes] = await Promise.all([
        fetch(`/api/patient/forms?patientId=${sessionData.patient.id}`),
        fetch(`/api/patient/appointments?patientId=${sessionData.patient.id}`),
        fetch(`/api/patient/documents?patientId=${sessionData.patient.id}`),
      ]);

      const [formsData, appointmentsData, documentsData] = await Promise.all([
        formsRes.json(),
        appointmentsRes.json(),
        documentsRes.json(),
      ]);

      if (formsData.success) setForms(formsData.data || []);
      if (appointmentsData.success) setAppointments(appointmentsData.data || []);
      if (documentsData.success) setDocuments(documentsData.data || []);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 border-amber-200",
      reviewed: "bg-blue-100 text-blue-700 border-blue-200",
      scheduled: "bg-emerald-100 text-emerald-700 border-emerald-200",
      completed: "bg-gray-100 text-gray-600 border-gray-200",
      confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status.toLowerCase()] || colors.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  const upcomingAppointments = appointments.filter((apt) => {
    if (apt.status === "cancelled" || apt.status === "completed") return false;
    
    // Extract just the date portion (YYYY-MM-DD)
    const appointmentDateStr = apt.date.split('T')[0];
    
    // Get current date/time in clinic timezone (ET)
    const nowInET = DateTime.now().setZone(CLINIC_TIMEZONE);
    const todayStr = nowInET.toFormat('yyyy-MM-dd');
    
    // If appointment is in the future, it's upcoming
    if (appointmentDateStr > todayStr) return true;
    
    // If appointment is in the past, it's not upcoming
    if (appointmentDateStr < todayStr) return false;
    
    // Appointment is today - check if the end time has passed
    if (apt.endTime) {
      const [endHours, endMinutes] = apt.endTime.split(':').map(Number);
      const appointmentEndMinutes = endHours * 60 + endMinutes;
      const currentMinutes = nowInET.hour * 60 + nowInET.minute;
      
      // If end time has passed, it's not upcoming
      if (currentMinutes >= appointmentEndMinutes) return false;
    }
    
    return true;
  });

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

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
      className="space-y-8"
    >
      {/* Quick Stats */}
      <motion.div variants={itemVariants} className={`grid gap-4 ${instantBookingEnabled ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {!instantBookingEnabled && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 hover:border-emerald-200 transition-colors shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Submitted Forms</p>
                  <p className="text-3xl font-bold text-emerald-600">{forms.length}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 hover:border-blue-200 transition-colors shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Appointments</p>
                <p className="text-3xl font-bold text-blue-600">{upcomingAppointments.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100 hover:border-violet-200 transition-colors shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medical Documents</p>
                <p className="text-3xl font-bold text-violet-600">{documents.length}</p>
              </div>
              <div className="p-3 bg-violet-100 rounded-xl">
                <FolderOpen className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 sm:grid-cols-2 ${instantBookingEnabled ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex flex-col items-center gap-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 text-gray-700"
                onClick={() => router.push("/patient/dashboard/forms/new")}
              >
                <Plus className="h-5 w-5 text-emerald-600" />
                <span className="font-medium">{instantBookingEnabled ? 'Book Appointment' : 'New Form'}</span>
                <span className="text-xs text-gray-500">{instantBookingEnabled ? 'Schedule a visit' : 'Submit intake form'}</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-gray-700"
                onClick={() => router.push("/patient/dashboard/documents")}
              >
                <Upload className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Upload Image</span>
                <span className="text-xs text-gray-500">Predict Disease</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex flex-col items-center gap-2 border-teal-200 hover:bg-teal-50 hover:border-teal-300 text-gray-700"
                onClick={() => router.push("/patient/dashboard/analyze-report")}
              >
                <FileImage className="h-5 w-5 text-teal-600" />
                <span className="font-medium">Analyze Report</span>
                <span className="text-xs text-gray-500">Analyze medical report</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 px-6 flex flex-col items-center gap-2 border-violet-200 hover:bg-violet-50 hover:border-violet-300 text-gray-700"
                onClick={() => router.push("/patient/dashboard/appointments")}
              >
                <Calendar className="h-5 w-5 text-violet-600" />
                <span className="font-medium">View Appointments</span>
                <span className="text-xs text-gray-500">Your schedule</span>
              </Button>

              {!instantBookingEnabled && (
                <Button
                  variant="outline"
                  className="h-auto py-4 px-6 flex flex-col items-center gap-2 border-amber-200 hover:bg-amber-50 hover:border-amber-300 text-gray-700"
                  onClick={() => router.push("/patient/dashboard/forms")}
                >
                  <Eye className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">View Forms</span>
                  <span className="text-xs text-gray-500">All submissions</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className={`grid gap-6 ${instantBookingEnabled ? '' : 'lg:grid-cols-2'}`}>
        {/* Upcoming Appointments */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-gray-200 shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Upcoming Appointments
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Your scheduled consultations
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => router.push("/patient/dashboard/appointments")}
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming appointments</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => router.push("/patient/dashboard/forms/new")}
                  >
                    {instantBookingEnabled ? 'Book Appointment' : 'Submit Intake Form'}
                  </Button>
                </div>
              ) : (
                upcomingAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {apt.doctor.name}
                          </p>
                          <Badge className={getStatusColor(apt.status)}>
                            {apt.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{apt.doctor.specialty}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDate(apt.date)} at {formatTime(apt.startTime)}
                          </span>
                          {apt.mode === "video" && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <Video className="h-3.5 w-3.5" />
                              Video Call
                            </span>
                          )}
                        </div>
                      </div>
                      {apt.mode === "video" && (apt.status === "scheduled" || apt.status === "confirmed") && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleJoinVideoCall(apt)}
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Join Call
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Forms - Hidden in instant booking mode */}
        {!instantBookingEnabled && (
          <motion.div variants={itemVariants}>
            <Card className="bg-white border-gray-200 shadow-sm h-full">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Recent Forms
                  </CardTitle>
                  <CardDescription className="text-gray-500">
                    Your submitted intake forms
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={() => router.push("/patient/dashboard/forms")}
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {forms.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No forms submitted yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => router.push("/patient/dashboard/forms/new")}
                    >
                      Submit Form
                    </Button>
                  </div>
                ) : (
                  forms.slice(0, 3).map((form, index) => {
                    // Calculate form number (most recent = highest number)
                    const formNumber = forms.length - index;
                    return (
                      <div
                        key={form.id}
                        className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                        onClick={() => router.push(`/patient/dashboard/forms/${form.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">Intake Form #{formNumber}</p>
                              <Badge className={getStatusColor(form.status)}>
                                {form.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              Submitted on {formatDate(form.createdAt)}
                            </p>
                            {form.notes && (
                              <p className="text-xs text-gray-400 line-clamp-1">{form.notes}</p>
                            )}
                          </div>
                          <Eye className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Medical Documents */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-violet-600" />
                Medical Documents
                <Badge className="ml-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                  <Shield className="h-3 w-3 mr-1" />
                  HIPAA Secured
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-500">
                Your uploaded medical records and documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-violet-200 text-violet-600 hover:bg-violet-50"
              onClick={() => router.push("/patient/dashboard/documents")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No documents uploaded yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Upload your medical records, lab results, and prescriptions
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-violet-200 text-violet-600 hover:bg-violet-50"
                  onClick={() => router.push("/patient/dashboard/documents")}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.slice(0, 6).map((doc) => (
                  <div
                    key={doc.uuid}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-200 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-violet-100 rounded-lg">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.fileSize / 1024).toFixed(1)} KB • {formatDate(doc.uploadedAt)}
                        </p>
                        {doc.category && (
                          <Badge variant="outline" className="mt-2 text-xs border-gray-200 text-gray-500">
                            {doc.category}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
