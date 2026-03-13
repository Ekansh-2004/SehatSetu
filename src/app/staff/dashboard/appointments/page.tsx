"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle, 
  ArrowLeft,
  Stethoscope,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SlotOption {
  date: string;
  startTime: string;
  endTime: string;
}

interface SlotOffer {
  id: string;
  doctorId: string;
  doctorName: string;
  slots: SlotOption[];
  status: string;
  patientConfirmedSlot: SlotOption | null;
  confirmedAt: string | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
    image?: string;
  };
}

export default function StaffAppointmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formId = searchParams?.get("formId");

  const [patientForm, setPatientForm] = useState<PatientFormSubmission | null>(null);
  const [slotOffer, setSlotOffer] = useState<SlotOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (formId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [formId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch patient form
      const formResponse = await fetch(`/api/patient-forms?status=slots_confirmed`);
      const formData = await formResponse.json();
      
      if (formData.success) {
        const form = formData.data.find((f: PatientFormSubmission) => f.id === formId);
        if (form) {
          setPatientForm(form);
          
          // Fetch slot offers
          const offerResponse = await fetch(`/api/slot-offers/${formId}`);
          const offerData = await offerResponse.json();
          
          if (offerData.success && offerData.data.length > 0) {
            // Find the confirmed slot offer
            const confirmedOffer = offerData.data.find((offer: SlotOffer) => offer.status === "confirmed");
            if (confirmedOffer) {
              setSlotOffer(confirmedOffer);
            } else {
              toast.error("No confirmed slot found");
            }
          } else {
            toast.error("No slot offers found");
          }
        } else {
          toast.error("Patient form not found or not in confirmed status");
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeBooking = async () => {
    if (!slotOffer) {
      toast.error("No slot offer found");
      return;
    }

    setBooking(true);
    try {
      const response = await fetch("/api/slot-offers/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotOfferId: slotOffer.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Appointment booked successfully!");
        setBookingSuccess(true);
        
        // Redirect to forms page after 2 seconds
        setTimeout(() => {
          router.push("/staff/dashboard/forms?status=appointment_booked");
        }, 2000);
      } else {
        toast.error(data.error || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  const formatSlot = (slot: SlotOption) => {
    const date = new Date(slot.date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    
    const [hours, minutes] = slot.startTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minutes} ${ampm}`;
    
    return {
      dayName,
      dateStr,
      timeStr,
      fullStr: `${dayName}, ${dateStr} at ${timeStr}`,
    };
  };

  if (!formId) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/staff/dashboard/forms")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Button>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No patient form selected</p>
            <Button
              className="mt-4"
              onClick={() => router.push("/staff/dashboard/forms?status=slots_confirmed")}
            >
              View Confirmed Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">
              Appointment Booked Successfully!
            </h2>
            <p className="text-green-700 mb-4">
              Confirmation SMS has been sent to {patientForm?.name}
            </p>
            <p className="text-sm text-green-600">
              Redirecting to forms page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patientForm || !slotOffer || !slotOffer.patientConfirmedSlot) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          onClick={() => router.push("/staff/dashboard/forms")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Button>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">Patient form or confirmed slot not found</p>
            <Button
              className="mt-4"
              onClick={() => router.push("/staff/dashboard/forms?status=slots_confirmed")}
            >
              View Confirmed Forms
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedSlot = formatSlot(slotOffer.patientConfirmedSlot);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/staff/dashboard/forms?status=slots_confirmed")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Button>
        <Badge className="bg-teal-100 text-teal-800">
          Patient Confirmed Slot
        </Badge>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Complete Appointment Booking</h1>
        <p className="text-gray-600 mt-2">Review and finalize the patient's confirmed appointment</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Patient Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{patientForm.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date of Birth</p>
                <p className="font-medium">
                  {new Date(patientForm.dateOfBirth).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{patientForm.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{patientForm.phone}</p>
                </div>
              </div>
              {patientForm.city && patientForm.state && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{patientForm.city}, {patientForm.state}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Gender</p>
                <p className="font-medium capitalize">{patientForm.gender}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor & Appointment Details Card */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-purple-600" />
              Appointment Details
            </CardTitle>
            <CardDescription>
              Patient confirmed this slot on {slotOffer.confirmedAt ? new Date(slotOffer.confirmedAt).toLocaleString() : "N/A"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Doctor</p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-200 flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-purple-700" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{slotOffer.doctor.name}</p>
                  <p className="text-sm text-gray-600">{slotOffer.doctor.specialty}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Confirmed Time Slot</p>
              <div className="flex items-start gap-3 bg-white rounded-lg p-4 border-2 border-purple-300">
                <Calendar className="h-6 w-6 text-purple-600 mt-1" />
                <div>
                  <p className="font-semibold text-lg text-purple-900">
                    {formattedSlot.dayName}
                  </p>
                  <p className="text-purple-700">{formattedSlot.dateStr}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <p className="font-medium text-purple-900">{formattedSlot.timeStr}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">All Slot Options Sent</p>
              <div className="space-y-2">
                {slotOffer.slots.map((slot, index) => {
                  const formatted = formatSlot(slot);
                  const isConfirmed =
                    slot.date === slotOffer.patientConfirmedSlot?.date &&
                    slot.startTime === slotOffer.patientConfirmedSlot?.startTime;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 p-2 rounded ${
                        isConfirmed ? "bg-green-100 border border-green-300" : "bg-gray-50"
                      }`}
                    >
                      {isConfirmed && <CheckCircle className="h-4 w-4 text-green-600" />}
                      <span className={isConfirmed ? "font-medium text-green-900" : "text-gray-600"}>
                        {index + 1}. {formatted.fullStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Card */}
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Ready to Finalize</h3>
                <p className="text-sm text-green-700">
                  Click the button below to create the appointment and send a final confirmation SMS to the patient.
                </p>
              </div>
              
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
                disabled={booking}
                onClick={handleFinalizeBooking}
              >
                {booking ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Finalizing Appointment...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Finalize Appointment
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
