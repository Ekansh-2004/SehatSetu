"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  ArrowLeft,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { generateAppointmentConfirmationPDF } from "@/lib/pdf-generator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AppointmentDetails {
  id: string;
  doctorId: string;
  doctorName: string;
  date: string;
  time: string;
  amount: number;
  sessionId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  patientId?: string | null;
  mode?: 'physical' | 'video';
}

const calculateEndTime = (startTime: string) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const endMinutes = minutes + 30;
  const endHours = hours + Math.floor(endMinutes / 60);
  const finalMinutes = endMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${finalMinutes
    .toString()
    .padStart(2, "0")}`;
};

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") || null;
  const guestSessionId = searchParams?.get("guest_session_id") || null;

  const [appointmentDetails, setAppointmentDetails] =
    useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const hasRunForSession = useRef<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState<string>("medical_record");
  const [fileDescription, setFileDescription] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");


  const verifyPaymentAndCreateAppointment = useCallback(async () => {
    if (processing || !sessionId || hasRunForSession.current === sessionId)
      return;

    try {
      setProcessing(true);
      hasRunForSession.current = sessionId;

      // First, verify the payment with Stripe
      const verifyResponse = await fetch(
        `/api/create-checkout-session?session_id=${sessionId}`
      );

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify payment");
      }

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error("Payment verification failed");
      }

      const { appointmentDetails: details } = verifyData;

      // Get guest info from server-side session if available
      let guestInfo = null;
      if (guestSessionId) {
        try {
          const sessionResponse = await fetch(
            `/api/guest-session?sessionId=${guestSessionId}`
          );
          if (sessionResponse.ok) {
            const sessionData = await sessionResponse.json();
            if (sessionData.success) {
              guestInfo = sessionData.data;
            }
          }
        } catch (error) {
          console.warn("Failed to fetch guest session:", error);
        }
      }

      // Create the appointment in our database
      const appointmentResponse = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: undefined, // Guest appointment
          doctorId: details.doctorId,
          date: details.date,
          startTime: details.time,
          endTime: calculateEndTime(details.time),
          reason: details.reason || "General consultation",
          paymentAmount: details.amount,
          stripeSessionId: sessionId,
          guestName: details.guestInfo?.name || guestInfo?.guestName,
          guestEmail: details.guestInfo?.email || guestInfo?.guestEmail,
          guestPhone: details.guestInfo?.phone || guestInfo?.guestPhone,
          mode: details.mode || 'physical',
        }),
      });

      if (!appointmentResponse.ok) {
        const errorData = await appointmentResponse.json();
        throw new Error(errorData.error || "Failed to create appointment");
      }

      const appointmentData = await appointmentResponse.json();

      // Get doctor details
      const doctorResponse = await fetch(`/api/doctors/${details.doctorId}`);
      const doctorData = await doctorResponse.json();

      setAppointmentDetails({
        id: appointmentData.data.id,
        doctorId: details.doctorId,
        doctorName: doctorData.success
          ? doctorData.data.name
          : "Unknown Doctor",
        date: details.date,
        time: details.time,
        amount: details.amount,
        sessionId: sessionId,
        guestName: appointmentData.data.guestName,
        guestEmail: appointmentData.data.guestEmail,
        guestPhone: appointmentData.data.guestPhone,
        patientId: appointmentData.data.patientId || null,
        mode: details.mode || 'physical',
      });

      // Clean up guest session after successful appointment creation
      if (guestSessionId) {
        try {
          await fetch(`/api/guest-session?sessionId=${guestSessionId}`, {
            method: "DELETE",
          });
        } catch (error) {
          console.warn("Failed to delete guest session:", error);
        }
      }
    } catch (error) {
      console.error("Error processing appointment:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  }, [sessionId, guestSessionId, processing]);


  const handleDownloadPDF = async () => {
    if (!appointmentDetails) return;
    
    try {
      const meetingLink = `${window.location.origin}/consultation/${appointmentDetails.id}`;
      
      await generateAppointmentConfirmationPDF({
        appointmentId: appointmentDetails.id,
        doctorName: appointmentDetails.doctorName,
        date: appointmentDetails.date,
        time: appointmentDetails.time,
        endTime: calculateEndTime(appointmentDetails.time),
        patientName: appointmentDetails.guestName || "Guest",
        patientEmail: appointmentDetails.guestEmail || "N/A",
        patientPhone: appointmentDetails.guestPhone || "N/A",
        amount: appointmentDetails.amount,
        sessionId: appointmentDetails.sessionId || "N/A",
        meetingLink: appointmentDetails.mode === 'video' ? meetingLink : undefined,
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } 
  };

  const handleStartGuestUpload = async () => {
    if (!appointmentDetails || !selectedFile) return;
    if (!fileName || !fileName.trim()) {
      setUploadError("File name is required");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      console.log("appointmentDetails-----------------", JSON.stringify(appointmentDetails));
      console.log("selectedFile-----------------", JSON.stringify({
        fileName: fileName,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        appointmentId: appointmentDetails.id,
        patientId: appointmentDetails.patientId,
        doctorId: appointmentDetails.doctorId,
        tenantId: undefined,
        category: fileCategory,
        description: fileDescription || undefined,
      }));
      const res = await fetch("/api/files/guest-generate-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileName,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          appointmentId: appointmentDetails.id,
          patientId: appointmentDetails.patientId,
          doctorId: appointmentDetails.doctorId,
          tenantId: undefined,
          category: fileCategory,
          description: fileDescription || undefined,
        }),
      });

      const data = await res.json();
      console.log("data-----------------", JSON.stringify(data));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to initialize upload");
      }

      const putRes = await fetch(data.upload.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!putRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadSuccess("File uploaded successfully.");
      setSelectedFile(null);
      setFileDescription("");
      setFileName("");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      verifyPaymentAndCreateAppointment();
    } else {
      setLoading(false);
      setError("No session ID provided");
    }
  }, [sessionId, verifyPaymentAndCreateAppointment]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-6" />
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processing Your Appointment
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your booking...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <Logo size="lg" className="mx-auto mb-6" />
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 mb-4">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Booking Error
            </h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/book">
              <Button className="bg-red-600 hover:bg-red-700">Try Again</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!appointmentDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Logo size="lg" className="mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Appointment Found
          </h2>
          <p className="text-gray-600 mb-4">
            Unable to retrieve appointment details.
          </p>
          <Link href="/book">
            <Button>Book New Appointment</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Logo */}
        <div className="text-center mb-8">
          <Logo size="lg" className="mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Appointment Confirmed!
          </h1>
          <p className="text-gray-600">
            Your appointment has been successfully booked and confirmed.
          </p>
        </div>

        {/* Success Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">
                    {appointmentDetails.doctorName}
                  </p>
                  <p className="text-sm text-gray-600">Healthcare Provider</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">
                    {new Date(appointmentDetails.date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                  <p className="text-sm text-gray-600">Appointment Date</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold">
                    {appointmentDetails.time} -{" "}
                    {calculateEndTime(appointmentDetails.time)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Appointment Time (30 minutes)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="font-semibold">{appointmentDetails?.mode === 'video' ? 'Video consultation' : 'In-person visit'}</p>
                  <p className="text-sm text-gray-600">Consultation Type</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold">
                    {appointmentDetails.guestName}
                  </p>
                  <p className="text-sm text-gray-600">Patient Name</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">
                    {appointmentDetails.guestEmail}
                  </p>
                  <p className="text-sm text-gray-600">Email Address</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="font-semibold">
                    {appointmentDetails.guestPhone}
                  </p>
                  <p className="text-sm text-gray-600">Phone Number</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
            <CardDescription>
              Your payment has been processed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount Paid</span>
              <span className="text-green-600">
                ${appointmentDetails.amount}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Payment processed via Stripe • Transaction ID:{" "}
              {appointmentDetails.sessionId}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Confirmation
          </Button>

          <Link href="/book">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Book Another Appointment
            </Button>
          </Link>
        </div>

        {/* Important Notes */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Please arrive 10 minutes before your scheduled appointment time</li>
            <li>• Bring a valid photo ID and your insurance card (if applicable)</li>
            <li>• You will receive a reminder email 24 hours before your appointment</li>
            <li>• To reschedule or cancel, please contact us at least 24 hours in advance</li>
            <li>• If you need to cancel, please call us at (555) 123-4567</li>
          </ul>
        </div>

        {/* Upload Medical Documents */}
        <div className="mt-8 bg-white border rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Upload medical documents</h3>
          <p className="text-sm text-gray-600 mb-4">Attach any prior prescriptions, lab reports, or relevant documents for your doctor.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
              <Label htmlFor="file">Select file</Label>
              <Input id="file" type="file" onChange={(e) => { const f = e.target.files?.[0] || null; setSelectedFile(f); setFileName(f?.name || ""); }} />
            </div>
            <div>
              <Label htmlFor="filename">File name</Label>
              <Input id="filename" placeholder="File name (with extension)" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={fileCategory} onValueChange={setFileCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_record">Medical record</SelectItem>
                  <SelectItem value="lab_result">Lab result</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input id="desc" placeholder="e.g., CBC report" value={fileDescription} onChange={(e) => setFileDescription(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <Button disabled={!selectedFile || uploading} onClick={handleStartGuestUpload}>
                {uploading ? 'Uploading...' : 'Upload document'}
              </Button>
              {uploadError && <p className="text-red-600 text-sm mt-2">{uploadError}</p>}
              {uploadSuccess && <p className="text-green-600 text-sm mt-2">{uploadSuccess}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Logo size="lg" className="mx-auto mb-6" />
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">
          Please wait while we load your appointment details...
        </p>
      </div>
    </div>
  );
}

export default function BookingSuccess() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingSuccessContent />
    </Suspense>
  );
}
