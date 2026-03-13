"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import { fetchDoctorInfo } from "@/store/api/doctorApi";
import { getTimezoneAbbreviation } from "@/lib/config/timezone";

interface CreateAppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}


interface DaySchedule {
  date: string;
  slots: Array<{
    time: string;
    isAvailable: boolean;
  }>;
}

interface AvailabilityResponse {
  doctorId: string;
  doctorName: string;
  availability: DaySchedule[];
  timezone?: string;
  timezoneLabel?: string;
}

export default function CreateAppointmentForm({ onSuccess, onCancel }: CreateAppointmentFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const doctor = useAppSelector((state) => state.doctor.doctor.data);
  const doctorLoading = useAppSelector((state) => state.doctor.doctor.loading);
  const [availability, setAvailability] = useState<DaySchedule[]>([]);
  const [timezoneLabel, setTimezoneLabel] = useState<string>('ET');
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest information
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [reason, setReason] = useState("General consultation");
  const [mode, setMode] = useState<'physical' | 'video'>('physical');

  // Fetch doctor information on component mount
  useEffect(() => {
    const fetchDoctor = async () => {
      if (doctorLoading) return;
      if (doctor) return;
      try {
        fetchDoctorInfo();
      } catch (error) {
        console.error("Error fetching doctor:", error);
        setError("Failed to fetch doctor information");
      }
    };

    fetchDoctor();
}, [doctor,doctorLoading]);

  // Fetch availability when doctor is loaded
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!doctor) return;

      try {
        setAvailabilityLoading(true);
        const response = await fetch(`/api/doctors/${doctor.id}/availability`);
        if (response.ok) {
          const data = await response.json();
          const availabilityData: AvailabilityResponse = data.data;
          setAvailability(availabilityData.availability || []);
          setTimezoneLabel(availabilityData.timezoneLabel || getTimezoneAbbreviation());
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
        setError("Failed to fetch availability");
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [doctor]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleDetailsSubmit = () => {
    if (!guestName || !guestEmail || !reason) {
      setError("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    if (guestPhone) {
      const phoneRegex = /^\d{10,15}$/;
      if (!phoneRegex.test(guestPhone.replace(/\D/g, ''))) {
        setError("Please enter a valid phone number (10-15 digits)");
        return;
      }
    }

    handleCreateAppointment(); // Create appointment without payment
    setError(null);
  };

  const handleCreateAppointment = async () => {
    if (!doctor || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      // Calculate end time (30 minutes after start time by default)
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const endMinutes = minutes + 30;
      const endHours = hours + Math.floor(endMinutes / 60);
      const endTime = `${endHours.toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: doctor.id,
          date: selectedDate,
          startTime: selectedTime,
          endTime: endTime,
          reason: reason,
          mode: mode,
          guestName,
          guestEmail,
          guestPhone,
          paymentAmount: doctor.consultationFee,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create appointment");
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating appointment:", error);
      setError(error instanceof Error ? error.message : "Failed to create appointment");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!doctor || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      // Create Stripe checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: doctor.consultationFee * 100, // Convert to cents
          doctorId: doctor.id,
          doctorName: doctor.name,
          date: selectedDate,
          time: selectedTime,
          patientEmail: guestEmail,
          guestName,
          guestEmail,
          guestPhone,
          isGuest: true,
          reason: reason,
          mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment session");
      }

      const { url } = await response.json();
      
      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating payment session:", error);
      setError(error instanceof Error ? error.message : "Failed to create payment session");
      setLoading(false);
    }
  };

  const getAvailableDates = () => {
    return availability
      .filter(day => day.slots.some(slot => slot.isAvailable))
      .slice(0, 14); // Show next 14 days
  };

  const getAvailableSlots = (date: string) => {
    const daySchedule = availability.find(day => day.date === date);
    return daySchedule?.slots.filter(slot => slot.isAvailable) || [];
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4 flex-shrink-0">
        <div className={`flex items-center ${currentStep >= 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Select Slot</span>
        </div>
        <div className={`w-8 h-1 ${currentStep >= 2 ? 'bg-emerald-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center ${currentStep >= 2 ? 'text-emerald-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'}`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Details</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex-shrink-0">
          {error}
        </div>
      )}

      {/* Step 1: Select Slot */}
      {currentStep === 1 && (
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Select Date and Time</h3>
            
            {/* Date Selection */}
            <div className="mb-6">
              <Label className="text-sm font-medium">Select Date</Label>
              {availabilityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    <span className="text-sm text-gray-600">Loading available dates...</span>
                  </div>
                </div>
              ) : getAvailableDates().length > 0 ? (
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {getAvailableDates().map((day) => {
                    const date = new Date(day.date);
                    const isSelected = selectedDate === day.date;
                    const isToday = day.date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <button
                        key={day.date}
                        onClick={() => handleDateSelect(day.date)}
                        className={`p-3 text-center rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isToday
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-gray-200 hover:border-emerald-300'
                        }`}
                      >
                        <div className="text-xs font-medium">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="text-lg font-bold">
                          {date.getDate()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No available dates found. Please check your availability settings.
                </div>
              )}
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div>
                <Label className="text-sm font-medium">Select Time</Label>
                {availabilityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                      <span className="text-sm text-gray-600">Loading available slots...</span>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                    <div className="text-xs text-gray-500 mb-2 text-center">
                      All times shown in {timezoneLabel}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {getAvailableSlots(selectedDate).map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`p-3 text-center rounded-lg border transition-colors ${
                            selectedTime === slot.time
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          <div>{slot.time}</div>
                          <div className="text-xs opacity-75">{timezoneLabel}</div>
                        </button>
                      ))}
                    </div>
                    {getAvailableSlots(selectedDate).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No available slots for this date
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}


          </div>

          <div className="flex justify-between pt-4 flex-shrink-0">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedDate || !selectedTime}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Patient Details */}
      {currentStep === 2 && (
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Patient Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestName">Patient Name *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>
              
              <div>
                <Label htmlFor="guestEmail">Email *</Label>
                <Input
                  id="guestEmail"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <Label htmlFor="guestPhone">Phone *</Label>
                <Input
                  id="guestPhone"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <Label htmlFor="mode">Consultation Mode</Label>
                <Select value={mode} disabled={true} onValueChange={(value: 'physical' | 'video') => setMode(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe the reason for the appointment"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 flex-shrink-0">
            <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={loading}>
              Back
            </Button>
            <Button onClick={handleDetailsSubmit} disabled={loading}>
                {loading ? "Processing..." : "Create Appointment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
