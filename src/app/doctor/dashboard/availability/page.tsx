"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Save,
  Plus,
  X,
  Clock,
  Repeat,
  Calendar as CalendarIcon2,
  Info,
  Trash2,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  fetchDoctorAvailability,
  updateDoctorAvailability,
} from "../../../../store/api/doctorApi";
import { useAppSelector } from "@/store/hooks";
import { 
  COMMON_TIMEZONES, 
  convertTimeRangeDoctorToClinic,
  convertTimeRangeClinicToDoctor,
  validateTimeRangeConversion,
  getTimezoneRelationship
} from "@/lib/utils/timezoneHelpers";
import { TimeRangeConverter, TimezoneInfoBox } from "@/components/TimezoneConverter";
import { DSTWarningBanner } from "@/components/DSTWarningBanner";
import { CLINIC_TIMEZONE, CLINIC_TIMEZONE_LABEL } from "@/lib/config/timezone";

const DAYS_OF_WEEK = [
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
  { value: 7, label: "Sun", fullLabel: "Sunday" },
];

const TIME_SLOTS = [
  "00:00",
  "00:15",
  "00:30",
  "00:45",
  "01:00",
  "01:15",
  "01:30",
  "01:45",
  "02:00",
  "02:15",
  "02:30",
  "02:45",
  "03:00",
  "03:15",
  "03:30",
  "03:45",
  "04:00",
  "04:15",
  "04:30",
  "04:45",
  "05:00",
  "05:15",
  "05:30",
  "05:45",
  "06:00",
  "06:15",
  "06:30",
  "06:45",
  "07:00",
  "07:15",
  "07:30",
  "07:45",
  "08:00",
  "08:15",
  "08:30",
  "08:45",
  "09:00",
  "09:15",
  "09:30",
  "09:45",
  "10:00",
  "10:15",
  "10:30",
  "10:45",
  "11:00",
  "11:15",
  "11:30",
  "11:45",
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
  "14:45",
  "15:00",
  "15:15",
  "15:30",
  "15:45",
  "16:00",
  "16:15",
  "16:30",
  "16:45",
  "17:00",
  "17:15",
  "17:30",
  "17:45",
  "18:00",
  "18:15",
  "18:30",
  "18:45",
  "19:00",
  "19:15",
  "19:30",
  "19:45",
  "20:00",
  "20:15",
  "20:30",
  "20:45",
  "21:00",
  "21:15",
  "21:30",
  "21:45",
  "22:00",
  "22:15",
  "22:30",
  "22:45",
  "23:00",
  "23:15",
  "23:30",
  "23:45",
  "24:00",
];

const SESSION_DURATIONS = [15, 30, 45, 60, 90, 120];

// Helper function to convert time to minutes for easier comparison
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Helper function to check if time ranges overlap
const doTimeRangesOverlap = (
  range1: IAvailabilityTimeRange,
  range2: IAvailabilityTimeRange
): boolean => {
  const start1 = timeToMinutes(range1.startTime);
  const end1 = timeToMinutes(range1.endTime);
  const start2 = timeToMinutes(range2.startTime);
  const end2 = timeToMinutes(range2.endTime);

  return start1 < end2 && start2 < end1;
};

export default function AvailabilityPage() {
  const [settings, setSettings] = useState<{
    slots: IAvailabilitySlot[];
    defaultSessionDuration: number;
    timezone: string;
    maxPatientsPerDay: number;
    advanceBookingDays: number;
  }>({
    slots: [],
    defaultSessionDuration: 30,
    timezone: "UTC",
    maxPatientsPerDay: 20,
    advanceBookingDays: 30, // Default 30 days advance booking
  });
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [doctorTimezone, setDoctorTimezone] = useState<string>(CLINIC_TIMEZONE);
  
  const [currentSlot, setCurrentSlot] = useState<IAvailabilitySlotForm>({
    daysOfWeek: [],
    isRecurring: true, // Default to recurring
    frequency: "weekly",
    startDate: new Date().toISOString().split("T")[0], // Default to today
    timeRanges: [{ startTime: "09:00", endTime: "17:00" }], // Default time range
  });
  const doctorAvailability = useAppSelector(
    (state) => state.doctor.doctorAvailability.data
  );
  useEffect(() => {
    fetchDoctorAvailability();
  }, []);

  useEffect(() => {
    console.log("Doctor availability data received:", doctorAvailability);
    if (doctorAvailability) {
      // Map IDoctorAvailability to settings format
      setSettings({
        slots: doctorAvailability.slots || [],
        defaultSessionDuration: doctorAvailability.defaultSessionDuration ?? 30, // Default value
        timezone:doctorAvailability.timezone ?? "UTC", // Default value
        maxPatientsPerDay: doctorAvailability.maxPatientsPerDay ?? 20, // Default value
        advanceBookingDays: doctorAvailability.advanceBookingDays ?? 30, // Default value
      });
    }
  }, [doctorAvailability]);

  const saveAvailabilitySettings = async () => {
    setSaving(true);
    try {
      const response = await updateDoctorAvailability(settings);
      /* const response = await fetch('/api/doctors/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      }); */
      console.log(
        "Save setting sent from client",
        JSON.stringify(response),
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Error saving availability settings:", error);
      toast.error("Failed to save availability settings");
    } finally {
      setSaving(false);
    }
  };

  const addTimeRange = () => {
    setCurrentSlot((prev) => ({
      ...prev,
      timeRanges: [
        ...prev.timeRanges,
        { startTime: "09:00", endTime: "17:00" },
      ],
    }));
  };

  const removeTimeRange = (index: number) => {
    setCurrentSlot((prev) => ({
      ...prev,
      timeRanges: prev.timeRanges.filter((_, i) => i !== index),
    }));
  };

  const updateTimeRange = (
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setCurrentSlot((prev) => ({
      ...prev,
      timeRanges: prev.timeRanges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      ),
    }));
  };

  const validateTimeRanges = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const { timeRanges } = currentSlot;

    // Check if there are any time ranges
    if (timeRanges.length === 0) {
      errors.push("At least one time range is required");
      return { isValid: false, errors };
    }

    // Check each time range
    timeRanges.forEach((range, index) => {
      const startMinutes = timeToMinutes(range.startTime);
      const endMinutes = timeToMinutes(range.endTime);

      // Check if end time is after start time
      if (endMinutes <= startMinutes) {
        errors.push(
          `Time range ${index + 1}: End time must be after start time`
        );
      }

      // Check if duration is a multiple of session duration
      const duration = endMinutes - startMinutes;
      if (duration % settings.defaultSessionDuration !== 0) {
        // Instead of error, just log that incomplete slots will be left blank
        console.log(
          `Time range ${
            index + 1
          }: Duration (${duration}min) is not a multiple of ${
            settings.defaultSessionDuration
          }min. Incomplete slots will be left blank.`
        );
      }
    });

    // Check for overlaps between time ranges
    for (let i = 0; i < timeRanges.length; i++) {
      for (let j = i + 1; j < timeRanges.length; j++) {
        if (doTimeRangesOverlap(timeRanges[i], timeRanges[j])) {
          errors.push(`Time ranges ${i + 1} and ${j + 1} overlap`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const addAvailabilitySlot = async () => {
    // Validate time ranges
    const validation = validateTimeRanges();
    if (!validation.isValid) {
      validation.errors.forEach((error) => toast.error(error));
      return;
    }

    for (const range of currentSlot.timeRanges) {
      const tzValidation = validateTimeRangeConversion(
        range.startTime,
        range.endTime,
        doctorTimezone
      );
      
      if (!tzValidation.isValid) {
        tzValidation.errors.forEach((error) => toast.error(error));
        return;
      }
    }

    // For recurring slots, require days of week
    if (
      currentSlot.isRecurring &&
      (!currentSlot.daysOfWeek || currentSlot.daysOfWeek.length === 0)
    ) {
      toast.error(
        "Please select at least one day of the week for recurring availability"
      );
      return;
    }

    // For non-recurring slots, require a specific date
    if (!currentSlot.isRecurring && !currentSlot.startDate) {
      toast.error(
        "Please select a specific date for non-recurring availability"
      );
      return;
    }

    // Helper function to format date in local timezone
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const convertedTimeRanges = currentSlot.timeRanges.map((range) => {
      return convertTimeRangeDoctorToClinic(
        { startTime: range.startTime, endTime: range.endTime },
        doctorTimezone
      );
    });

    console.log('[TIMEZONE] Converting availability:', {
      doctorTimezone,
      clinicTimezone: CLINIC_TIMEZONE,
      originalTimes: currentSlot.timeRanges,
      convertedTimes: convertedTimeRanges
    });

    const newSlot: IAvailabilitySlot = {
      id: `slot-${Date.now()}`,
      startDate: currentSlot.startDate!,
      timeRanges: convertedTimeRanges, // Store in clinic timezone
      daysOfWeek: currentSlot.isRecurring
        ? currentSlot.daysOfWeek
        : [
            new Date(currentSlot.startDate!).getDay() === 0
              ? 7
              : new Date(currentSlot.startDate!).getDay(),
          ],
      isRecurring: currentSlot.isRecurring,
      frequency: currentSlot.frequency,
      repeatUntil: currentSlot.repeatUntil,
      timeZone: CLINIC_TIMEZONE, // Always store clinic timezone
    };

    // Create updated settings with the new slot
    const updatedSettings = {
      ...settings,
      slots: [...settings.slots, newSlot],
    };

    // Update local state immediately for better UX
    setSettings(updatedSettings);

    // Reset current slot
    setCurrentSlot({
      daysOfWeek: [],
      isRecurring: true,
      frequency: "weekly",
      startDate: formatLocalDate(new Date()),
      timeRanges: [{ startTime: "09:00", endTime: "17:00" }],
    });

    // Close modal
    setIsAddModalOpen(false);

    toast.success("Availability slot added successfully");
  };

  const removeAvailabilitySlot = async (slotId: string) => {
    try {
      // Create updated settings without the slot
      const updatedSettings = {
        ...settings,
        slots: settings.slots.filter((slot) => slot.id !== slotId),
      };

      // Update local state immediately for better UX
      setSettings(updatedSettings);

      // Call API to update the database
      const response = await fetch("/api/doctors/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slots: updatedSettings.slots,
          defaultSessionDuration: updatedSettings.defaultSessionDuration,
          maxPatientsPerDay: updatedSettings.maxPatientsPerDay,
          advanceBookingDays: updatedSettings.advanceBookingDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to delete slot:", errorData);
        toast.error("Failed to delete slot. Please try again.");

        // Revert local state if API call failed
        setSettings(settings);
        return;
      }

      toast.success("Slot deleted successfully");
    } catch (error) {
      console.error("Error deleting slot:", error);
      toast.error("Failed to delete slot. Please try again.");

      // Revert local state if API call failed
      setSettings(settings);
    }
  };

  const toggleDayOfWeek = (dayOfWeek: number) => {
    setCurrentSlot((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(dayOfWeek)
        ? prev.daysOfWeek.filter((d) => d !== dayOfWeek)
        : [...(prev.daysOfWeek || []), dayOfWeek],
    }));
  };

  const getActiveDaysForDate = (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sunday from 0 to 7

    // Use local date formatting instead of UTC to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;

    console.log(
      `=== Checking availability for date: ${dateString} (day ${dayOfWeek}) ===`
    );
    console.log("All slots:", settings.slots);

    const activeSlots = settings.slots.filter((slot) => {
      console.log(`\n--- Checking slot:`, slot);
      console.log(`Slot isRecurring: ${slot.isRecurring}`);
      console.log(`Slot startDate: ${slot.startDate}`);
      console.log(`Slot daysOfWeek: ${slot.daysOfWeek}`);
      console.log(
        `Comparing: slot.startDate (${slot.startDate}) === dateString (${dateString})`
      );

      if (slot.isRecurring) {
        // For recurring slots: check day of week and repeat until date
        const dayMatch = slot.daysOfWeek.includes(dayOfWeek);
        const dateMatch =
          !slot.repeatUntil || new Date(slot.repeatUntil) >= date;
        console.log(
          `Recurring slot - dayMatch: ${dayMatch}, dateMatch: ${dateMatch}`
        );
        return dayMatch && dateMatch;
      } else {
        // For non-recurring slots: check if the specific date matches
        // Validate that slot.startDate is a valid date
        if (!slot.startDate || isNaN(new Date(slot.startDate).getTime())) {
          console.log(
            `Non-recurring slot - invalid startDate: ${slot.startDate}`
          );
          return false;
        }
        const dateMatch = slot.startDate === dateString;
        console.log(`Non-recurring slot - dateMatch: ${dateMatch}`);
        return dateMatch;
      }
    });

    console.log(`\n*** Final active slots for ${dateString}:`, activeSlots);
    console.log(`=== End check for ${dateString} ===\n`);
    return activeSlots;
  };

  const getActiveDaysSummary = () => {
    console.log("Current settings:", settings);
    console.log("Settings slots:", settings.slots);
    const activeDays = new Set<number>();
    settings.slots.forEach((slot) => {
      if (slot.isRecurring) {
        // For recurring slots: add all configured days of week
        slot.daysOfWeek.forEach((day) => activeDays.add(day));
      }
      // For non-recurring slots: don't add to active days summary
      // They are only available on their specific dates
    });
    return Array.from(activeDays).sort();
  };

  const activeDaysSummary = getActiveDaysSummary();

  // Get all dates with availability (for display purposes)
  const getDatesWithAvailability = () => {
    const dates = new Set<string>();
    settings.slots.forEach((slot) => {
      if (slot.isRecurring) {
        // For recurring slots, we can't show all future dates, so just show the pattern
        // This is handled by activeDaysSummary
      } else {
        // For non-recurring slots, add the specific date
        if (slot.startDate && !isNaN(new Date(slot.startDate).getTime())) {
          dates.add(slot.startDate);
        }
      }
    });
    return Array.from(dates).sort();
  };

  const datesWithAvailability = getDatesWithAvailability();

  const isSaveSettingsDisabled = saving || JSON.stringify(settings) === JSON.stringify(doctorAvailability);

  return (
    <>
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Availability Settings
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={saveAvailabilitySettings}
            disabled={isSaveSettingsDisabled}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button onClick={() => fetchDoctorAvailability()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CalendarIcon2 className="h-6 w-6 text-primary" />
                    Calendar View
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Select dates and see your availability at a glance
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-muted-foreground">
                      Available ({activeDaysSummary.length} days)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
                    <span className="text-muted-foreground">Not Available</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar */}
              <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl p-6 border shadow-sm">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-lg"
                  disabled={(date) => date < new Date()}
                  classNames={{
                    day_selected:
                      "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg font-semibold",
                    day_today:
                      "bg-accent text-accent-foreground rounded-lg font-semibold",
                    day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors relative",
                    day_disabled: "text-muted-foreground/50",
                    head_cell: "text-muted-foreground font-semibold text-sm",
                    nav_button:
                      "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-accent rounded-lg transition-colors",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    caption:
                      "flex justify-center pt-1 relative items-center text-base font-semibold mb-4",
                    table: "w-full",
                    tbody: "space-y-1",
                    row: "flex w-full mt-2",
                    cell: "text-center text-sm relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  }}
                />

                {/* Availability Indicator */}
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      Available Days This Month:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {activeDaysSummary.length > 0
                        ? activeDaysSummary
                            .map(
                              (day) =>
                                DAYS_OF_WEEK.find((d) => d.value === day)?.label
                            )
                            .join(", ")
                        : "None configured"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected Date Info */}
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-foreground">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </h4>
                  <Badge
                    variant={
                      getActiveDaysForDate(selectedDate).length > 0
                        ? "default"
                        : "secondary"
                    }
                    className="px-3 py-1"
                  >
                    {getActiveDaysForDate(selectedDate).length > 0
                      ? "Available"
                      : "Not Available"}
                  </Badge>
                </div>

                {getActiveDaysForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-3">
                      You have {getActiveDaysForDate(selectedDate).length} time
                      slot
                      {getActiveDaysForDate(selectedDate).length > 1
                        ? "s"
                        : ""}{" "}
                      available on this date:
                    </p>
                    {getActiveDaysForDate(selectedDate).map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <div className="flex flex-col gap-1">
                              {slot?.timeRanges?.map(
                                (timeRange, rangeIndex) => (
                                  <span
                                    key={rangeIndex}
                                    className="font-medium"
                                  >
                                    {timeRange.startTime} - {timeRange.endTime}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {slot.isRecurring ? (
                              // For recurring slots: show day of week
                              slot.daysOfWeek.map((day) => (
                                <Badge
                                  key={day}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {
                                    DAYS_OF_WEEK.find((d) => d.value === day)
                                      ?.label
                                  }
                                </Badge>
                              ))
                            ) : (
                              // For non-recurring slots: show "One-time"
                              <Badge variant="outline" className="text-xs">
                                One-time
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.isRecurring && (
                            <Badge variant="secondary" className="text-xs">
                              <Repeat className="h-3 w-3 mr-1" />
                              {slot.frequency}
                              {slot.repeatUntil &&
                                ` until ${format(
                                  new Date(slot.repeatUntil),
                                  "MMM d, yyyy"
                                )}`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium text-lg mb-2">
                      No availability set for this date
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Use the &quot;Add Availability&quot; button to schedule
                      time for this day
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg text-center border border-primary/20">
                  <div className="text-2xl font-bold text-primary">
                    {activeDaysSummary.length}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    Active Days
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg text-center border border-primary/20">
                  <div className="text-2xl font-bold text-primary">
                    {settings.slots.length}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">
                    Time Slots
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-6">
          {/* Active Days Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Active Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Recurring Days */}
                {activeDaysSummary.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Recurring Days:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeDaysSummary.map((day) => (
                        <Badge key={day} variant="default">
                          {DAYS_OF_WEEK.find((d) => d.value === day)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Specific Dates */}
                {datesWithAvailability.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Specific Dates:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {datesWithAvailability.map((date) => {
                        const dateObj = new Date(date);
                        if (isNaN(dateObj.getTime())) {
                          return null; // Skip invalid dates
                        }
                        return (
                          <Badge key={date} variant="outline">
                            {format(dateObj, "MMM d")}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeDaysSummary.length === 0 &&
                  datesWithAvailability.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No active days configured
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Add New Availability */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Availability
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Availability</DialogTitle>
                <DialogDescription>
                  Set multiple time ranges and recurring patterns for your
                  availability
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* DST Warning */}
                {currentSlot.startDate && (
                  <DSTWarningBanner
                    startDate={currentSlot.startDate}
                    endDate={currentSlot.repeatUntil}
                    timezone={doctorTimezone}
                  />
                )}

                {/* Time Ranges */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">
                        Time Ranges
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Set times in your timezone - they'll be converted to clinic time
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTimeRange}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Range
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {currentSlot?.timeRanges?.map((timeRange, index) => (
                      <div
                        key={index}
                        className="relative p-4 border rounded-lg bg-gradient-to-r from-background to-muted/20 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <span className="text-sm font-medium text-foreground">
                              Time Range {index + 1}
                            </span>
                          </div>
                          {currentSlot.timeRanges.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimeRange(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-1">
                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground">
                              From
                            </Label>
                            <Select
                              value={timeRange.startTime}
                              onValueChange={(value) =>
                                updateTimeRange(index, "startTime", value)
                              }
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select start time" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-sm font-medium text-muted-foreground">
                              To
                            </Label>
                            <Select
                              value={timeRange.endTime}
                              onValueChange={(value) =>
                                updateTimeRange(index, "endTime", value)
                              }
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select end time" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_SLOTS.map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Duration indicator */}
                        <div className="mt-3 pt-3 border-t border-muted/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Duration:
                            </span>
                            <span className="font-medium">
                              {(() => {
                                const startMinutes = timeToMinutes(
                                  timeRange.startTime
                                );
                                const endMinutes = timeToMinutes(
                                  timeRange.endTime
                                );
                                const duration = endMinutes - startMinutes;
                                const hours = Math.floor(duration / 60);
                                const minutes = duration % 60;
                                return `${hours}h ${minutes}m`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Timezone Conversion Preview */}
                  {currentSlot.timeRanges.length > 0 && currentSlot.timeRanges[0].startTime && currentSlot.timeRanges[0].endTime && (
                    <TimeRangeConverter
                      startTime={currentSlot.timeRanges[0].startTime}
                      endTime={currentSlot.timeRanges[0].endTime}
                      doctorTimezone={doctorTimezone}
                      showWarnings={true}
                    />
                  )}

                  {/* Validation Messages */}
                  {(() => {
                    const validation = validateTimeRanges();
                    if (!validation.isValid) {
                      return (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm font-medium text-destructive mb-2">
                            Please fix the following issues:
                          </p>
                          <ul className="text-xs text-destructive space-y-1">
                            {validation.errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Days of Week - Only for Recurring */}
                {currentSlot.isRecurring && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          variant={
                            currentSlot.daysOfWeek?.includes(day.value)
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className="text-xs"
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring Settings */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={currentSlot.isRecurring}
                      onCheckedChange={(checked) =>
                        setCurrentSlot((prev) => ({
                          ...prev,
                          isRecurring: checked,
                        }))
                      }
                    />
                    <Label>Recurring</Label>
                  </div>

                  {currentSlot.isRecurring ? (
                    <div className="space-y-2 pl-6">
                      <div className="space-y-2">
                        <Label>Frequency</Label>
                        <Select
                          value={currentSlot.frequency}
                          onValueChange={(value: "weekly" | "monthly") =>
                            setCurrentSlot((prev) => ({
                              ...prev,
                              frequency: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Repeat Until (Optional)</Label>
                        <Input
                          type="date"
                          value={currentSlot.repeatUntil || ""}
                          onChange={(e) =>
                            setCurrentSlot((prev) => ({
                              ...prev,
                              repeatUntil: e.target.value || undefined,
                            }))
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave empty for infinite recurring
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pl-6">
                      <div className="space-y-2">
                        <Label>Specific Date</Label>
                        <Input
                          type="date"
                          value={currentSlot.startDate || ""}
                          onChange={(e) =>
                            setCurrentSlot((prev) => ({
                              ...prev,
                              startDate: e.target.value,
                            }))
                          }
                          min={new Date().toISOString().split("T")[0]}
                        />
                        <p className="text-xs text-muted-foreground">
                          Select the specific date for this availability
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addAvailabilitySlot}
                    className="flex-1"
                    disabled={!validateTimeRanges().isValid}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Availability
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure your working timezone and session preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timezone Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Your Working Timezone
                </Label>
                <Select
                  value={doctorTimezone}
                  onValueChange={(value) => setDoctorTimezone(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label} ({tz.offset})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getTimezoneRelationship(doctorTimezone)}
                </p>
              </div>

              {/* Info Box */}
              <TimezoneInfoBox doctorTimezone={doctorTimezone} />

              <div className="space-y-2">
                <Label>Default Session Duration (minutes)</Label>
                <Select
                  value={settings.defaultSessionDuration.toString()}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultSessionDuration: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_DURATIONS.map((duration) => (
                      <SelectItem key={duration} value={duration.toString()}>
                        {duration} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Time ranges must be multiples of this duration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Max Patients Per Day</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxPatientsPerDay}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      maxPatientsPerDay: parseInt(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Advance Booking Days</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.advanceBookingDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      advanceBookingDays: parseInt(e.target.value),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  How many days in advance patients can book appointments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Current Availability Slots */}
          {settings.slots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Current Availability Slots
                </CardTitle>
                <CardDescription>
                  All times displayed in clinic timezone ({CLINIC_TIMEZONE_LABEL})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {settings.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="group relative p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-gradient-to-r from-background to-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Time Ranges */}
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <div className="flex flex-col gap-1">
                              {slot?.timeRanges?.map(
                                (timeRange, rangeIndex) => (
                                  <div key={rangeIndex} className="flex items-center gap-2">
                                    <span className="font-semibold text-lg">
                                      {timeRange.startTime} - {timeRange.endTime}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {CLINIC_TIMEZONE_LABEL}
                                    </Badge>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Days or Date */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {slot.isRecurring ? "Days:" : "Date:"}
                            </span>
                            <div className="flex gap-1">
                              {slot.isRecurring ? (
                                // For recurring slots: show days of week
                                slot.daysOfWeek.map((day) => (
                                  <Badge
                                    key={day}
                                    variant="default"
                                    className="text-xs px-2 py-1"
                                  >
                                    {
                                      DAYS_OF_WEEK.find((d) => d.value === day)
                                        ?.label
                                    }
                                  </Badge>
                                ))
                              ) : (
                                // For non-recurring slots: show specific date
                                <Badge
                                  variant="default"
                                  className="text-xs px-2 py-1"
                                >
                                  {format(
                                    new Date(slot.startDate),
                                    "MMM d, yyyy"
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Recurring Info */}
                          {slot.isRecurring && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                <Repeat className="h-3 w-3 mr-1" />
                                {slot.frequency}
                                {slot.repeatUntil &&
                                  ` until ${format(
                                    new Date(slot.repeatUntil),
                                    "MMM d, yyyy"
                                  )}`}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAvailabilitySlot(slot.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
