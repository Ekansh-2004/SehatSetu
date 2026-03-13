"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, User, Phone, Mail, MapPin, Stethoscope, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface PatientFormSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  street?: string;
  city: string;
  state: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  status: string;
  createdAt: string;
}

interface SlotOption {
  date: string;
  startTime: string;
  endTime: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image?: string;
  isActive?: boolean;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

interface DaySchedule {
  date: string;
  slots: TimeSlot[];
}

export default function PatientFormsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialStatus = searchParams?.get("status") || "pending";
  
  const [submissions, setSubmissions] = useState<PatientFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<PatientFormSubmission | null>(null);
  const [activeTab, setActiveTab] = useState(initialStatus);

  // Slot offer modal state
  const [showSlotOfferModal, setShowSlotOfferModal] = useState(false);
  const [slotOfferStep, setSlotOfferStep] = useState(1); // 1: Select Doctor, 2: Select Slots
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorAvailability, setDoctorAvailability] = useState<DaySchedule[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<SlotOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [sendingSlots, setSendingSlots] = useState(false);

  useEffect(() => {
    fetchSubmissions(activeTab);
  }, [activeTab]);

  const fetchSubmissions = async (status: string) => {
    setLoading(true);
    try {
      // When viewing "slots_sent" tab, show both slots_sent and slots_confirmed forms
      if (status === "slots_sent") {
        // Fetch all forms, then filter locally
        const response = await fetch(`/api/patient-forms`);
        const data = await response.json();
        
        if (data.success) {
          // Filter to show only slots_sent and slots_confirmed
          const filtered = data.data.filter((form: PatientFormSubmission) => 
            form.status === "slots_sent" || form.status === "slots_confirmed"
          );
          setSubmissions(filtered);
        } else {
          toast.error("Failed to load patient forms");
        }
      } else {
        const response = await fetch(`/api/patient-forms?status=${status}`);
        const data = await response.json();
        
        if (data.success) {
          setSubmissions(data.data);
        } else {
          toast.error("Failed to load patient forms");
        }
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load patient forms");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await fetch("/api/doctors");
      const data = await response.json();
      console.log("Doctors API response:", data);
      if (data.success) {
        // Show all doctors - don't filter
        console.log("Total doctors loaded:", data.data?.length || 0);
        setDoctors(data.data || []);
      } else {
        console.error("API returned error:", data);
        toast.error("Failed to load doctors");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchDoctorAvailability = async (doctorId: string) => {
    setLoadingAvailability(true);
    try {
      console.log("Fetching availability for doctor:", doctorId);
      const response = await fetch(`/api/doctors/${doctorId}/availability`);
      const data = await response.json();
      console.log("Availability API full response:", JSON.stringify(data, null, 2));

      if (data.success) {
        // The API returns data.data.availability
        const availability = data.data?.availability || [];
        console.log("Doctor availability loaded:", availability.length, "days");
        
        if (availability.length > 0) {
          console.log("First day data:", JSON.stringify(availability[0], null, 2));
          console.log("First day has", availability[0].slots?.length || 0, "slots");
          if (availability[0].slots && availability[0].slots.length > 0) {
            console.log("First slot:", JSON.stringify(availability[0].slots[0], null, 2));
          }
        }
        
        setDoctorAvailability(availability);
        
        if (availability.length === 0) {
          toast.error("This doctor has not configured their availability yet");
        }
      } else {
        console.error("API returned error:", data);
        toast.error(data.error || "Failed to load availability");
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleViewDetails = (submission: PatientFormSubmission) => {
    setSelectedSubmission(submission);
  };

  const handleSendSlotOptions = (submission: PatientFormSubmission) => {
    setSelectedSubmission(submission);
    setShowSlotOfferModal(true);
    setSlotOfferStep(1);
    setSelectedDoctor(null);
    setSelectedSlots([]);
    setDoctorAvailability([]);
    fetchDoctors();
  };

  const handleSelectDoctor = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    if (doctor) {
      setSelectedDoctor(doctor);
      fetchDoctorAvailability(doctorId);
      setSlotOfferStep(2);
    }
  };

  const handleToggleSlot = (date: string, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const endMinutes = minutes + 30;
    const endHours = hours + Math.floor(endMinutes / 60);
    const finalMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${finalMinutes.toString().padStart(2, "0")}`;

    const slot: SlotOption = {
      date,
      startTime: time,
      endTime,
    };

    const slotKey = `${date}-${time}`;
    const existingSlotIndex = selectedSlots.findIndex(
      (s) => `${s.date}-${s.startTime}` === slotKey
    );

    if (existingSlotIndex >= 0) {
      // Remove slot
      setSelectedSlots(selectedSlots.filter((_, i) => i !== existingSlotIndex));
    } else {
      // Add slot
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const isSlotSelected = (date: string, time: string) => {
    const slotKey = `${date}-${time}`;
    return selectedSlots.some((s) => `${s.date}-${s.startTime}` === slotKey);
  };

  const formatSlotForPreview = (slot: SlotOption, index: number) => {
    const date = new Date(slot.date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    
    const [hours, minutes] = slot.startTime.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const timeStr = `${displayHour}:${minutes} ${ampm}`;
    
    return `${index + 1}. ${dayName}, ${dateStr} at ${timeStr}`;
  };

  const handleSendSlots = async () => {
    if (!selectedSubmission || !selectedDoctor || selectedSlots.length === 0) {
      toast.error("Please select doctor and at least one slot");
      return;
    }

    setSendingSlots(true);
    try {
      const response = await fetch("/api/slot-offers/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientFormId: selectedSubmission.id,
          doctorId: selectedDoctor.id,
          slots: selectedSlots,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Slot options sent to ${selectedSubmission.name}!`);
        setShowSlotOfferModal(false);
        setSelectedSubmission(null);
        fetchSubmissions(activeTab);
      } else {
        toast.error(data.error || "Failed to send slot options");
      }
    } catch (error) {
      console.error("Error sending slots:", error);
      toast.error("Failed to send slot options");
    } finally {
      setSendingSlots(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "slots_sent":
        return "bg-purple-100 text-purple-800";
      case "slots_confirmed":
        return "bg-purple-100 text-purple-800"; // Group with slots_sent
      case "appointment_booked":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    // Simplify status labels
    switch (status) {
      case "pending":
        return "Pending";
      case "slots_sent":
        return "Slots Sent";
      case "slots_confirmed":
        return "Slots Sent"; // Group with slots_sent
      case "appointment_booked":
        return "Booked";
      default:
        return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patient Forms</h1>
        <p className="text-gray-600 mt-2">Review and manage patient submissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="slots_sent">Slots Sent</TabsTrigger>
          <TabsTrigger value="appointment_booked">Booked</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">No {getStatusLabel(activeTab)} forms found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          <User className="h-5 w-5 text-purple-600" />
                          {submission.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          Submitted on {new Date(submission.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {submission.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {submission.phone}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        DOB: {new Date(submission.dateOfBirth).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {submission.city}, {submission.state}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(submission)}
                      >
                        View Details
                      </Button>
                      {(submission.status === "pending" || submission.status === "reviewed") && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleSendSlotOptions(submission)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Slot Options
                        </Button>
                      )}
                      {(submission.status as string) === "slots_confirmed" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => router.push(`/staff/dashboard/appointments?formId=${submission.id}`)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!selectedSubmission && !showSlotOfferModal} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Patient Information Details</DialogTitle>
            <DialogDescription>
              Comprehensive patient information
            </DialogDescription>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Name</p>
                    <p className="font-medium">{selectedSubmission.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{selectedSubmission.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {new Date(selectedSubmission.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Gender</p>
                    <p className="font-medium capitalize">{selectedSubmission.gender}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              {selectedSubmission.street && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address
                  </h3>
                  <div className="text-sm">
                    <p>{selectedSubmission.street}</p>
                    <p>{selectedSubmission.city}, {selectedSubmission.state} {selectedSubmission.zipCode}</p>
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {selectedSubmission.emergencyContactName && (
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Name</p>
                      <p className="font-medium">{selectedSubmission.emergencyContactName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Phone</p>
                      <p className="font-medium">{selectedSubmission.emergencyContactPhone}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Relationship</p>
                      <p className="font-medium">{selectedSubmission.emergencyContactRelationship}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {(selectedSubmission.status === "pending" || selectedSubmission.status === "reviewed") && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 flex-1"
                    onClick={() => {
                      setSelectedSubmission(selectedSubmission);
                      handleSendSlotOptions(selectedSubmission);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Slot Options
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Slot Offer Modal */}
      <Dialog open={showSlotOfferModal} onOpenChange={setShowSlotOfferModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Slot Options to {selectedSubmission?.name}</DialogTitle>
            <DialogDescription>
              {slotOfferStep === 1
                ? "Step 1: Select a doctor"
                : "Step 2: Select available time slots"}
            </DialogDescription>
          </DialogHeader>

          {slotOfferStep === 1 ? (
            // Step 1: Doctor Selection
            <div className="space-y-4">
              {loadingDoctors ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : (
                <>
                  <Label>Select Doctor ({doctors.length} available)</Label>
                  {doctors.length === 0 ? (
                    <p className="text-sm text-red-600">No doctors found. Please check database.</p>
                  ) : (
                    <Select onValueChange={handleSelectDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4" />
                              <span>{doctor.name}</span>
                              <span className="text-gray-500 text-sm">- {doctor.specialty}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          ) : (
            // Step 2: Slot Selection
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedDoctor?.name}</p>
                  <p className="text-sm text-gray-500">{selectedDoctor?.specialty}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSlotOfferStep(1);
                    setSelectedSlots([]);
                  }}
                >
                  Change Doctor
                </Button>
              </div>

              {loadingAvailability ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : doctorAvailability.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No available slots found</p>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Select Time Slots</Label>
                      <p className="text-sm text-gray-600">
                        Selected: <span className="font-semibold">{selectedSlots.length}</span> slots
                      </p>
                    </div>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                      {doctorAvailability.map((day) => {
                        const availableSlots = day.slots.filter((slot: TimeSlot) => slot.isAvailable);
                        console.log(`Date ${day.date}: Total slots: ${day.slots.length}, Available: ${availableSlots.length}`);
                        
                        return (
                          <div key={day.date}>
                            <h4 className="font-medium mb-2">
                              {new Date(day.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}
                              <span className="text-sm text-gray-500 ml-2">
                                ({availableSlots.length} available)
                              </span>
                            </h4>
                            {availableSlots.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No available slots on this day</p>
                            ) : (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {availableSlots.map((slot: TimeSlot) => (
                                  <div
                                    key={slot.time}
                                    className="flex items-center gap-2"
                                  >
                                    <Checkbox
                                      id={`${day.date}-${slot.time}`}
                                      checked={isSlotSelected(day.date, slot.time)}
                                      onCheckedChange={() =>
                                        handleToggleSlot(day.date, slot.time)
                                      }
                                    />
                                    <Label
                                      htmlFor={`${day.date}-${slot.time}`}
                                      className="cursor-pointer text-sm"
                                    >
                                      {slot.time}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedSlots.length > 0 && (
                    <div className="space-y-2">
                      <Label>SMS Preview</Label>
                      <Textarea
                        readOnly
                        rows={8}
                        className="bg-gray-50"
                        value={`Hi ${selectedSubmission?.name},\n\n${selectedDoctor?.name} has these slots available for you:\n\n${selectedSlots.map((slot, i) => formatSlotForPreview(slot, i)).join("\n")}\n\nReply with the number (1-${selectedSlots.length}) to confirm your preferred slot.`}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setSlotOfferStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                      disabled={selectedSlots.length === 0 || sendingSlots}
                      onClick={handleSendSlots}
                    >
                      {sendingSlots ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send to Patient
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
