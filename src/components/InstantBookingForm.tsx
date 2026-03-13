"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Video,
  Building2,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  experience: number;
  rating: number;
  consultationFee: number;
  location: string;
  defaultSessionDuration: number;
}

interface TimeSlot {
  time: string;
  isAvailable: boolean;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

interface PatientSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

interface InstantBookingFormProps {
  patient: PatientSession;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function InstantBookingForm({ patient }: InstantBookingFormProps) {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<"physical" | "video">("physical");
  const [timezoneLabel, setTimezoneLabel] = useState<string>("ET");
  const [booking, setBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<{
    appointmentId: string;
    doctorName: string;
    date: string;
    time: string;
    mode: "physical" | "video";
  } | null>(null);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await fetch("/api/doctors");
      const data = await response.json();
      if (data.success) {
        setDoctors(data.data || []);
      } else {
        toast.error("Failed to load doctors");
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchAvailability = useCallback(async (doctorId: string) => {
    setLoadingSlots(true);
    setSelectedDate("");
    setSelectedTime("");
    try {
      const response = await fetch(`/api/doctors/${doctorId}/availability`);
      const data = await response.json();
      if (data.success) {
        // Filter to only include available slots and dates that have them
        const availableDays = (data.data.availability || [])
          .map((day: DayAvailability) => ({
            ...day,
            slots: day.slots.filter((slot) => slot.isAvailable),
          }))
          .filter((day: DayAvailability) => day.slots.length > 0);
        setAvailability(availableDays);
        // Set timezone label from API response
        if (data.data.timezoneLabel) {
          setTimezoneLabel(data.data.timezoneLabel);
        }
      } else {
        toast.error("Failed to load availability");
        setAvailability([]);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      toast.error("Failed to load availability");
      setAvailability([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  const handleDoctorSelect = (doctorId: string) => {
    const doctor = doctors.find((d) => d.id === doctorId);
    setSelectedDoctor(doctor || null);
    if (doctor) {
      fetchAvailability(doctor.id);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime || !patient) {
      toast.error("Please select a doctor, date, and time");
      return;
    }

    setBooking(true);
    try {
      const response = await fetch("/api/patient/instant-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          date: selectedDate,
          startTime: selectedTime,
          patientId: patient.id,
          mode: selectedMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBookingSuccess(true);
        setBookedAppointment({
          appointmentId: data.data.appointmentId,
          doctorName: selectedDoctor.name,
          date: selectedDate,
          time: selectedTime,
          mode: selectedMode,
        });
        toast.success("Appointment booked successfully!");
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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

  const getAvailableSlotsForDate = (date: string): TimeSlot[] => {
    const dayData = availability.find((d) => d.date === date);
    return dayData?.slots || [];
  };

  const resetBooking = () => {
    setBookingSuccess(false);
    setBookedAppointment(null);
    setSelectedDoctor(null);
    setAvailability([]);
    setSelectedDate("");
    setSelectedTime("");
    setSelectedMode("physical");
  };

  // Success state
  if (bookingSuccess && bookedAppointment) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto"
      >
        <Card className="border-emerald-200 shadow-xl">
          <CardContent className="pt-8 pb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Appointment Confirmed!
            </h2>
            <p className="text-gray-600 mb-6">
              Your appointment has been successfully booked.
            </p>
            <div className="bg-emerald-50 rounded-xl p-4 text-left mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Stethoscope className="h-5 w-5 text-emerald-600" />
                  <span className="text-gray-700">
                    {bookedAppointment.doctorName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <span className="text-gray-700">
                    {formatDate(bookedAppointment.date)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <span className="text-gray-700">
                    {formatTime(bookedAppointment.time)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {bookedAppointment.mode === "video" ? (
                    <Video className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  )}
                  <span className="text-gray-700">
                    {bookedAppointment.mode === "video" ? "Video Consultation" : "In-Person Visit"}
                  </span>
                </div>
              </div>
            </div>
            {/* Video consultation info */}
            {bookedAppointment.mode === "video" && (
              <div className="bg-blue-50 rounded-xl p-4 text-left mb-6 border border-blue-200">
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-700">Video Consultation</p>
                    <p className="text-sm text-blue-600 mt-1">
                      A confirmation email with the meeting link has been sent to your email. 
                      You can also join from your appointments dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {bookedAppointment.mode === "video" && (
                <Button
                  onClick={() => {
                    const params = new URLSearchParams({
                      patientName: patient.name,
                      doctorName: bookedAppointment.doctorName,
                      date: formatDate(bookedAppointment.date),
                      time: formatTime(bookedAppointment.time),
                      appointmentId: bookedAppointment.appointmentId,
                    });
                    router.push(`/consultation/${bookedAppointment.appointmentId}?${params.toString()}`);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Go to Waiting Room
                </Button>
              )}
              <Button
                onClick={() => router.push("/patient/dashboard/appointments")}
                className={bookedAppointment.mode === "video" ? "w-full" : "w-full bg-emerald-600 hover:bg-emerald-700"}
                variant={bookedAppointment.mode === "video" ? "outline" : "default"}
              >
                View My Appointments
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={resetBooking}
                className="w-full"
              >
                Book Another Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Book Your Appointment</h1>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Zap className="h-3 w-3 mr-1" />
            Instant Booking
          </Badge>
        </div>
        <p className="text-gray-500">
          Select a doctor and choose an available time slot. Your appointment will be instantly confirmed.
        </p>
      </motion.div>

      {/* Doctor Selection */}
      <motion.div variants={itemVariants} initial="hidden" animate="visible">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Stethoscope className="h-5 w-5 text-amber-600" />
              </div>
              Step 1: Select a Doctor
            </CardTitle>
            <CardDescription>
              Choose your preferred doctor from the list
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDoctors ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : doctors.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No doctors available at the moment
              </p>
            ) : (
              <div className="space-y-4">
                <Label>Available Doctors ({doctors.length})</Label>
                <Select onValueChange={handleDoctorSelect}>
                  <SelectTrigger className="h-auto py-3">
                    <SelectValue placeholder="Choose a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        <div className="flex items-center gap-3 py-1">
                          <Stethoscope className="h-4 w-4 text-amber-600" />
                          <div>
                            <span className="font-medium">{doctor.name}</span>
                            <span className="text-gray-500 ml-2">
                              - {doctor.specialty}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Selected Doctor Info */}
                <AnimatePresence>
                  {selectedDoctor && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl">
                          <Stethoscope className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {selectedDoctor.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {selectedDoctor.specialty}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Date Selection */}
      <AnimatePresence>
        {selectedDoctor && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  Step 2: Select a Date
                </CardTitle>
                <CardDescription>
                  Choose an available date for your appointment
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : availability.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No available slots for this doctor
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {availability.slice(0, 8).map((day) => {
                      const date = new Date(day.date);
                      const isSelected = selectedDate === day.date;
                      const availableCount = day.slots.length;
                      return (
                        <button
                          key={day.date}
                          onClick={() => handleDateSelect(day.date)}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <p className="text-xs text-gray-500 uppercase">
                            {date.toLocaleDateString("en-US", {
                              weekday: "short",
                            })}
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {date.getDate()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {date.toLocaleDateString("en-US", {
                              month: "short",
                            })}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-2 text-xs ${
                              isSelected
                                ? "bg-blue-100 text-blue-700 border-blue-300"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {availableCount} slots
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Time Selection */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  Step 3: Select a Time
                </CardTitle>
                <CardDescription>
                  Choose your preferred time slot on {formatDate(selectedDate)} (All times in {timezoneLabel})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {getAvailableSlotsForDate(selectedDate).map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleTimeSelect(slot.time)}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                        }`}
                      >
                        <span className="font-medium">
                          {formatTime(slot.time)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode Selection */}
      <AnimatePresence>
        {selectedTime && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Card className="border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-violet-100 rounded-lg">
                    <Video className="h-5 w-5 text-violet-600" />
                  </div>
                  Step 4: Consultation Mode
                </CardTitle>
                <CardDescription>
                  Choose how you&apos;d like to have your consultation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedMode("physical")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedMode === "physical"
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        selectedMode === "physical" ? "bg-violet-100" : "bg-gray-100"
                      }`}>
                        <Building2 className={`h-5 w-5 ${
                          selectedMode === "physical" ? "text-violet-600" : "text-gray-500"
                        }`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${
                          selectedMode === "physical" ? "text-violet-700" : "text-gray-700"
                        }`}>In-Person</p>
                        <p className="text-xs text-gray-500">Visit the clinic</p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedMode("video")}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedMode === "video"
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        selectedMode === "video" ? "bg-violet-100" : "bg-gray-100"
                      }`}>
                        <Video className={`h-5 w-5 ${
                          selectedMode === "video" ? "text-violet-600" : "text-gray-500"
                        }`} />
                      </div>
                      <div>
                        <p className={`font-semibold ${
                          selectedMode === "video" ? "text-violet-700" : "text-gray-700"
                        }`}>Video Call</p>
                        <p className="text-xs text-gray-500">Online consultation</p>
                      </div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Summary & Submit */}
      <AnimatePresence>
        {selectedDoctor && selectedDate && selectedTime && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  Booking Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Doctor</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDoctor.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedDoctor.specialty}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedDate).getFullYear()}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Time</p>
                    <p className="font-semibold text-gray-900">
                      {formatTime(selectedTime)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedDoctor.defaultSessionDuration || 30} min
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Mode</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {selectedMode === "video" ? (
                        <>
                          <Video className="h-4 w-4 text-violet-600" />
                          Video Call
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-violet-600" />
                          In-Person
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedMode === "video" ? "Online" : "At clinic"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleBookAppointment}
                  disabled={booking}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg"
                >
                  {booking ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Confirm Instant Booking
                    </>
                  )}
                </Button>
                <p className="text-center text-xs text-gray-500 mt-3">
                  Your appointment will be immediately confirmed
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

