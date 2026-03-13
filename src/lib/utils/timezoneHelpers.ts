/**
 * Handles conversion between doctor's local timezone *and clinic timezone
 */

import { DateTime } from 'luxon';
import { CLINIC_TIMEZONE } from '../config/timezone';

export interface TimeConversion {
  clinicTime: string; // HH:mm format
  doctorTime: string; // HH:mm format
  crossesMidnight: boolean;
  dayOffset: number; // -1, 0, or 1
  warning?: string;
}

export interface DSTWarning {
  hasDSTChange: boolean;
  message?: string;
  affectedDates?: Date[];
}

/**
 * Common timezones for dropdown
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)', offset: 'UTC-5/-4' },
  { value: 'America/Chicago', label: 'US Central (CST/CDT)', offset: 'UTC-6/-5' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)', offset: 'UTC-8/-7' },
  { value: 'America/Denver', label: 'US Mountain (MST/MDT)', offset: 'UTC-7/-6' },
  { value: 'America/Phoenix', label: 'US Arizona (MST)', offset: 'UTC-7' },
  { value: 'Europe/London', label: 'United Kingdom (GMT/BST)', offset: 'UTC+0/+1' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)', offset: 'UTC+1/+2' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 'UTC+5:30' },
  { value: 'Asia/Dubai', label: 'UAE (GST)', offset: 'UTC+4' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: 'UTC+8' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)', offset: 'UTC+9' },
  { value: 'Australia/Sydney', label: 'Australia East (AEDT/AEST)', offset: 'UTC+10/+11' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZDT/NZST)', offset: 'UTC+12/+13' },
];

/**
 * Convert doctor's local time to clinic time
 * Uses current date as reference (for DST calculation)
 */
export function convertDoctorToClinicTime(
  doctorTime: string,
  doctorTimezone: string,
  referenceDate: Date = new Date()
): TimeConversion {
  const [hours, minutes] = doctorTime.split(':').map(Number);
  
  // Create datetime in doctor's timezone
  const timeInDoctorTz = DateTime.fromJSDate(referenceDate)
    .setZone(doctorTimezone)
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  
  // Convert to clinic timezone
  const timeInClinicTz = timeInDoctorTz.setZone(CLINIC_TIMEZONE);
  
  // Calculate day offset
  const doctorDay = timeInDoctorTz.day;
  const clinicDay = timeInClinicTz.day;
  const dayOffset = clinicDay - doctorDay;
  
  const crossesMidnight = Math.abs(dayOffset) > 0;
  
  let warning: string | undefined;
  if (crossesMidnight) {
    if (dayOffset > 0) {
      warning = `This time is ${dayOffset} day(s) ahead in clinic timezone`;
    } else {
      warning = `This time is ${Math.abs(dayOffset)} day(s) behind in clinic timezone`;
    }
  }
  
  return {
    clinicTime: timeInClinicTz.toFormat('HH:mm'),
    doctorTime: timeInDoctorTz.toFormat('HH:mm'),
    crossesMidnight,
    dayOffset,
    warning
  };
}

/**
 * Convert clinic time to doctor's local time
 * Used when loading existing slots for editing
 */
export function convertClinicToDoctorTime(
  clinicTime: string,
  doctorTimezone: string,
  referenceDate: Date = new Date()
): TimeConversion {
  const [hours, minutes] = clinicTime.split(':').map(Number);
  
  // Create datetime in clinic timezone
  const timeInClinicTz = DateTime.fromJSDate(referenceDate)
    .setZone(CLINIC_TIMEZONE)
    .set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  
  // Convert to doctor's timezone
  const timeInDoctorTz = timeInClinicTz.setZone(doctorTimezone);
  
  // Calculate day offset
  const clinicDay = timeInClinicTz.day;
  const doctorDay = timeInDoctorTz.day;
  const dayOffset = doctorDay - clinicDay;
  
  const crossesMidnight = Math.abs(dayOffset) > 0;
  
  let warning: string | undefined;
  if (crossesMidnight) {
    if (dayOffset > 0) {
      warning = `In your timezone, this is ${dayOffset} day(s) ahead`;
    } else {
      warning = `In your timezone, this is ${Math.abs(dayOffset)} day(s) behind`;
    }
  }
  
  return {
    clinicTime: timeInClinicTz.toFormat('HH:mm'),
    doctorTime: timeInDoctorTz.toFormat('HH:mm'),
    crossesMidnight,
    dayOffset,
    warning
  };
}

/**
 * Check if a time range crosses midnight in the doctor's timezone
 */
export function doesTimeRangeCrossMidnight(
  startTime: string,
  endTime: string
): boolean {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;
  
  return endMinutesTotal <= startMinutesTotal;
}

/**
 * Check for DST transitions in the given date range
 */
export function checkDSTTransitions(
  startDate: Date,
  endDate: Date | undefined,
  timezone: string
): DSTWarning {
  const start = DateTime.fromJSDate(startDate).setZone(timezone);
  
  // If no end date, check next 90 days
  const end = endDate 
    ? DateTime.fromJSDate(endDate).setZone(timezone)
    : start.plus({ days: 90 });
  
  const affectedDates: Date[] = [];
  let hasDSTChange = false;
  
  // Check each day for DST changes
  let current = start;
  let previousOffset = current.offset;
  
  while (current <= end) {
    if (current.offset !== previousOffset) {
      hasDSTChange = true;
      affectedDates.push(current.toJSDate());
      previousOffset = current.offset;
    }
    current = current.plus({ days: 1 });
  }
  
  if (!hasDSTChange) {
    return { hasDSTChange: false };
  }
  
  const message = affectedDates.length === 1
    ? `⚠️ Daylight Saving Time changes on ${affectedDates[0].toLocaleDateString()}. Your availability times may shift by 1 hour on this date.`
    : `⚠️ Daylight Saving Time changes ${affectedDates.length} times in this period. Your availability times may shift on these dates.`;
  
  return {
    hasDSTChange: true,
    message,
    affectedDates
  };
}

/**
 * Get timezone abbreviation (EST/EDT, IST, etc.)
 */
export function getTimezoneAbbr(
  timezone: string,
  date: Date = new Date()
): string {
  const dt = DateTime.fromJSDate(date).setZone(timezone);
  return dt.toFormat('ZZZZ'); // Short timezone name
}

/**
 * Format time with timezone for display
 */
export function formatTimeWithTimezone(
  time: string,
  timezone: string,
  date: Date = new Date()
): string {
  const [hours, minutes] = time.split(':').map(Number);
  const dt = DateTime.fromJSDate(date)
    .setZone(timezone)
    .set({ hour: hours, minute: minutes });
  
  return dt.toFormat('h:mm a ZZZZ'); // "1:00 PM EST"
}

/**
 * Validate that converted times don't create conflicts
 */
export function validateTimeRangeConversion(
  startTime: string,
  endTime: string,
  doctorTimezone: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if time range crosses midnight in doctor's timezone
  if (doesTimeRangeCrossMidnight(startTime, endTime)) {
    errors.push(
      'Time range crosses midnight in your timezone. Please split into separate slots for each day.'
    );
  }
  
  // Convert both times
  const startConversion = convertDoctorToClinicTime(startTime, doctorTimezone);
  const endConversion = convertDoctorToClinicTime(endTime, doctorTimezone);
  
  // Check if they end up on different days in clinic timezone
  if (startConversion.dayOffset !== endConversion.dayOffset) {
    errors.push(
      'This time range spans across different days in clinic timezone. Please adjust the times.'
    );
  }
  
  // Check if converted times are valid (start < end)
  const [startHours, startMinutes] = startConversion.clinicTime.split(':').map(Number);
  const [endHours, endMinutes] = endConversion.clinicTime.split(':').map(Number);
  
  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;
  
  if (endMinutesTotal <= startMinutesTotal) {
    errors.push(
      'Converted clinic times are invalid. End time must be after start time.'
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get helpful description of timezone relationship
 */
export function getTimezoneRelationship(
  doctorTimezone: string,
  referenceDate: Date = new Date()
): string {
  const doctorDT = DateTime.fromJSDate(referenceDate).setZone(doctorTimezone);
  const clinicDT = DateTime.fromJSDate(referenceDate).setZone(CLINIC_TIMEZONE);
  
  const offsetDiff = (doctorDT.offset - clinicDT.offset) / 60; // Convert to hours
  
  if (offsetDiff === 0) {
    return 'Same as clinic timezone';
  } else if (offsetDiff > 0) {
    return `${Math.abs(offsetDiff)} hour(s) ahead of clinic`;
  } else {
    return `${Math.abs(offsetDiff)} hour(s) behind clinic`;
  }
}

/**
 * Convert time range from doctor TZ to clinic TZ
 */
export interface TimeRange {
  startTime: string;
  endTime: string;
}

export function convertTimeRangeDoctorToClinic(
  timeRange: TimeRange,
  doctorTimezone: string,
  referenceDate: Date = new Date()
): TimeRange {
  const startConversion = convertDoctorToClinicTime(
    timeRange.startTime,
    doctorTimezone,
    referenceDate
  );
  
  const endConversion = convertDoctorToClinicTime(
    timeRange.endTime,
    doctorTimezone,
    referenceDate
  );
  
  return {
    startTime: startConversion.clinicTime,
    endTime: endConversion.clinicTime
  };
}

/**
 * Convert time range from clinic TZ to doctor TZ
 */
export function convertTimeRangeClinicToDoctor(
  timeRange: TimeRange,
  doctorTimezone: string,
  referenceDate: Date = new Date()
): TimeRange {
  const startConversion = convertClinicToDoctorTime(
    timeRange.startTime,
    doctorTimezone,
    referenceDate
  );
  
  const endConversion = convertClinicToDoctorTime(
    timeRange.endTime,
    doctorTimezone,
    referenceDate
  );
  
  return {
    startTime: startConversion.doctorTime,
    endTime: endConversion.doctorTime
  };
}

