/**
 * Default: America/New_York (North Carolina)
 */

export const CLINIC_TIMEZONE = process.env.NEXT_PUBLIC_CLINIC_TIMEZONE || 'America/New_York';

export const CLINIC_TIMEZONE_LABEL = process.env.NEXT_PUBLIC_CLINIC_TIMEZONE_LABEL || 'EST/EDT';

export function getTimezoneAbbreviation(date: Date = new Date()): string {
  if (process.env.NEXT_PUBLIC_CLINIC_TIMEZONE_LABEL) {
    return process.env.NEXT_PUBLIC_CLINIC_TIMEZONE_LABEL;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(date);
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  
  return timeZonePart?.value || 'ET';
}


export const timezoneConfig = {
  timezone: CLINIC_TIMEZONE,
  label: CLINIC_TIMEZONE_LABEL,
  getAbbreviation: getTimezoneAbbreviation,
} as const;


