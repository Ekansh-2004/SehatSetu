"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Calendar, Clock, Sparkles, Check, Loader2, Download, Mail, ArrowUpDown, List } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useAppointment } from "../../../../../context/AppointmentContext";
import { useRouter } from "next/navigation";
import { fetchDoctorAppointments } from "../../../../../store/api/doctorApi";
import { useSelector } from "react-redux";
import { RootState } from "../../../../../store";

const ConsultationPage: React.FC = () => {
  const { data, loading } = useSelector((state: RootState) => state.doctor.doctorAppointments);
  const appointments = data || [];
  const { setAppointment } = useAppointment();
  const router = useRouter();
  const [downloadingAppointments, setDownloadingAppointments] = useState<Set<string>>(new Set());
  const [emailSending, setEmailSending] = useState<Record<string, { patient: boolean; doctor: boolean }>>({});
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  // Separate appointments by status
  const { scheduledAppointments, completedAppointments, allAppointments } = useMemo(() => {
    const scheduled = appointments.filter((appointment: AppointmentDisplay) => 
      appointment.status !== "completed"
    );
    const completed = appointments.filter((appointment: AppointmentDisplay) => 
      appointment.status === "completed"
    );
    return { 
      scheduledAppointments: scheduled, 
      completedAppointments: completed,
      allAppointments: appointments
    };
  }, [appointments]);

  // Sort appointments based on selected sort option
  const sortAppointments = (appointments: AppointmentDisplay[]) => {
    return [...appointments].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          // First compare by date, then by time if dates are equal
          const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateComparison !== 0) return dateComparison;
          return b.time.localeCompare(a.time);
        case "date-asc":
          // First compare by date, then by time if dates are equal
          const dateComparisonAsc = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateComparisonAsc !== 0) return dateComparisonAsc;
          return a.time.localeCompare(b.time);
        case "name-asc":
          return a.patientName.localeCompare(b.patientName);
        case "name-desc":
          return b.patientName.localeCompare(a.patientName);
        case "time-asc":
          return a.time.localeCompare(b.time);
        case "time-desc":
          return b.time.localeCompare(a.time);
        default:
          return 0;
      }
    });
  };

  const sortedAllAppointments = useMemo(() => 
    sortAppointments(allAppointments), 
    [allAppointments, sortBy]
  );

  const sortedScheduledAppointments = useMemo(() => 
    sortAppointments(scheduledAppointments), 
    [scheduledAppointments, sortBy]
  );

  const sortedCompletedAppointments = useMemo(() => 
    sortAppointments(completedAppointments), 
    [completedAppointments, sortBy]
  );

  const handleStartConsultation = (appointment: AppointmentDisplay) => {
    setAppointment(appointment);
    router.push(
      `/doctor/dashboard/appointments/consultation/${appointment.id}`
    );
  };

  const handleDownloadSummary = async (appointmentId: string) => {
    try {
      setDownloadingAppointments(prev => new Set(prev).add(appointmentId));
      
      const response = await fetch(`/api/doctors/appointments/${appointmentId}/consultation-summary`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get consultation summary');
      }

      // Download the file using the presigned URL
      const downloadResponse = await fetch(data.presignedUrl);
      if (!downloadResponse.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await downloadResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName || `consultation-summary-${appointmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Consultation summary downloaded successfully');

    } catch (error) {
      console.error('❌ Error downloading consultation summary:', error);
      alert('Failed to download consultation summary. Please try again.');
    } finally {
      setDownloadingAppointments(prev => {
        const newSet = new Set(prev);
        newSet.delete(appointmentId);
        return newSet;
      });
    }
  };

  const sendEmail = async (
    appointmentId: string,
    target: 'patient' | 'doctor'
  ) => {
    try {
      setEmailSending(prev => ({
        ...prev,
        [appointmentId]: { patient: target === 'patient' ? true : prev[appointmentId]?.patient || false, doctor: target === 'doctor' ? true : prev[appointmentId]?.doctor || false }
      }));

      // First, get the summary details (names, emails, presigned URL)
      const summaryRes = await fetch(`/api/doctors/appointments/${appointmentId}/consultation-summary`);
      const summary = await summaryRes.json();
      console.log('summary--------------------', summary)
      if (!summary.success) {
        throw new Error(summary.error || 'Failed to get consultation summary');
      }

      const endpoint = target === 'patient' ? '/api/mail-to-patient' : '/api/mail-to-doctor';
      const payload = {
        patientName: summary.patientName,
        patientEmail: summary.patientEmail || 'no-reply@example.com',
        toEmail: target === 'patient' ? (summary.patientEmail || '') : (summary.doctorEmail || ''),
        presignedUrl: summary.presignedUrl,
        subject: target === 'patient'
          ? `Your Consultation Report - ${summary.patientName}`
          : `Consultation Report for ${summary.patientName}`,
      };

      if (!payload.toEmail) {
        throw new Error('Missing recipient email');
      }

      console.log('payload--------------------', payload)
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log(`✅ Email sent to ${target}`);
     // alert(`Email sent to ${target === 'patient' ? 'patient' : 'you'}.`);

    } catch (error) {
      console.error('❌ Error sending email:', error);
     // alert('Failed to send email. Please try again.');
    } finally {
      setEmailSending(prev => ({
        ...prev,
        [appointmentId]: { patient: target === 'patient' ? false : prev[appointmentId]?.patient || false, doctor: target === 'doctor' ? false : prev[appointmentId]?.doctor || false }
      }));
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      
      try {
        await fetchDoctorAppointments();
      } catch {
        console.log("Error fetching appointments");
      }
    };
    fetchAppointments();
  }, []);

  // Render appointment card component
  const renderAppointmentCard = (appointment: AppointmentDisplay) => (
    <Card
      key={appointment.id}
      className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
    >
      <CardHeader className="pb-4">
        <div className="space-y-3">
          {/* Header Row - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg lg:text-xl truncate">
                {appointment.patientName}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 shrink-0">
              <Clock className="h-4 w-4" />
              <span>
                {appointment.time} • {appointment.date}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status and Features Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                {appointment.status}
              </Badge>
              {appointment.mode && (
                <Badge
                  className={`${appointment.mode === 'video' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'} text-xs`}
                >
                  {appointment.mode === 'video' ? 'Video' : 'In-person'}
                </Badge>
              )}
              {appointment.hasAI && (
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
            {appointment.status === "completed" ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadSummary(appointment.id)}
                  disabled={downloadingAppointments.has(appointment.id)}
                  className="w-full sm:w-auto"
                >
                  {downloadingAppointments.has(appointment.id) ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Download Report
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendEmail(appointment.id, 'patient')}
                  disabled={!!emailSending[appointment.id]?.patient}
                  className="w-full sm:w-auto"
                >
                  {emailSending[appointment.id]?.patient ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Emailing patient report...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Email Report to Patient
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendEmail(appointment.id, 'doctor')}
                  disabled={!!emailSending[appointment.id]?.doctor}
                  className="w-full sm:w-auto"
                >
                  {emailSending[appointment.id]?.doctor ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Emailing your report...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Email Report to Me
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleStartConsultation(appointment)}
                className="w-full sm:w-auto"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Consultation
              </Button>
            )}
          </div>

          {/* AI Features Section */}
          {appointment.features && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 mb-2">
                AI Features Available:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                {appointment.features.map(
                  (feature: string, idx: number) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs justify-center sm:justify-start"
                    >
                      {feature}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Render empty state component
  const renderEmptyState = (message: string, description: string) => (
    <Card className="border-dashed">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {message}
            </h3>
            <p className="text-gray-600">
              {description}
            </p>
          </div>
          <Link href="/doctor/dashboard/appointments">
            <Button>View All Appointments</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Mobile-Responsive Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              Consultation Management
            </h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Manage your patient consultations
            </p>
          </div>
          <Link href="/doctor/dashboard/appointments">
            <Button variant="outline" className="w-full sm:w-auto">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-6">
        {/* Enhanced Tabs and Sort Controls */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Enhanced Tab List - Mobile Responsive */}
              <div className="w-full lg:flex-1">
                <TabsList className="grid w-full grid-cols-3 h-auto min-h-[48px] bg-gray-100 p-1 rounded-xl">
                  <TabsTrigger 
                    value="all" 
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all duration-200 text-xs sm:text-sm"
                  >
                    <List className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-medium whitespace-nowrap">All</span>
                    <Badge variant="secondary" className="ml-0 sm:ml-1 bg-blue-100 text-blue-700 text-xs px-1 py-0">
                      {allAppointments.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="scheduled" 
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600 transition-all duration-200 text-xs sm:text-sm"
                  >
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-medium whitespace-nowrap">Scheduled</span>
                    <Badge variant="secondary" className="ml-0 sm:ml-1 bg-orange-100 text-orange-700 text-xs px-1 py-0">
                      {scheduledAppointments.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-green-600 transition-all duration-200 text-xs sm:text-sm"
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="font-medium whitespace-nowrap">Completed</span>
                    <Badge variant="secondary" className="ml-0 sm:ml-1 bg-green-100 text-green-700 text-xs px-1 py-0">
                      {completedAppointments.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              {/* Enhanced Sort Dropdown - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-lg border shadow-sm lg:w-auto">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[200px] border-0 bg-gray-50 focus:ring-2 focus:ring-blue-500">
                    <SelectValue placeholder="Select sorting..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest First)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest First)</SelectItem>
                    <SelectItem value="name-asc">Patient Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Patient Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading appointments...</p>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                {/* All Consultations Tab */}
                <TabsContent value="all" className="space-y-4">
                  {sortedAllAppointments.length === 0 ? (
                    renderEmptyState(
                      "No consultations found",
                      "You don't have any consultations yet."
                    )
                  ) : (
                    <div className="space-y-4">
                      {sortedAllAppointments.map(renderAppointmentCard)}
                    </div>
                  )}
                </TabsContent>

                {/* Scheduled Consultations Tab */}
                <TabsContent value="scheduled" className="space-y-4">
                  {sortedScheduledAppointments.length === 0 ? (
                    renderEmptyState(
                      "No scheduled consultations",
                      "You don't have any scheduled consultations at the moment."
                    )
                  ) : (
                    <div className="space-y-4">
                      {sortedScheduledAppointments.map(renderAppointmentCard)}
                    </div>
                  )}
                </TabsContent>

                {/* Completed Consultations Tab */}
                <TabsContent value="completed" className="space-y-4">
                  {sortedCompletedAppointments.length === 0 ? (
                    renderEmptyState(
                      "No completed consultations",
                      "You haven't completed any consultations yet."
                    )
                  ) : (
                    <div className="space-y-4">
                      {sortedCompletedAppointments.map(renderAppointmentCard)}
                    </div>
                  )}
                </TabsContent>
              </div>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ConsultationPage;
