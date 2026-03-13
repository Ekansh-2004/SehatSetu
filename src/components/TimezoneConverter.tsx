/**
 * Timezone Converter Component
 * 
 * Shows real-time preview of timezone conversion with warnings
 */

import React from 'react';
import { ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { 
  convertDoctorToClinicTime, 
  formatTimeWithTimezone,
  getTimezoneAbbr 
} from '@/lib/utils/timezoneHelpers';
import { CLINIC_TIMEZONE, CLINIC_TIMEZONE_LABEL } from '@/lib/config/timezone';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimezoneConverterProps {
  doctorTime: string;
  doctorTimezone: string;
  label?: string;
  showWarnings?: boolean;
  compact?: boolean;
}

export const TimezoneConverter: React.FC<TimezoneConverterProps> = ({
  doctorTime,
  doctorTimezone,
  label,
  showWarnings = true,
  compact = false
}) => {
  if (!doctorTime || doctorTime === '') {
    return null;
  }

  const conversion = convertDoctorToClinicTime(doctorTime, doctorTimezone);
  const doctorAbbr = getTimezoneAbbr(doctorTimezone);
  const clinicAbbr = CLINIC_TIMEZONE_LABEL || getTimezoneAbbr(CLINIC_TIMEZONE);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">{conversion.doctorTime}</span>
        <ArrowRight className="w-3 h-3" />
        <span className="font-medium text-emerald-600">{conversion.clinicTime} {clinicAbbr}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">{label || 'Your Time'} ({doctorAbbr})</div>
          <div className="font-mono font-semibold text-base">{conversion.doctorTime}</div>
        </div>
        
        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">Clinic Time ({clinicAbbr})</div>
          <div className="font-mono font-semibold text-base text-emerald-600">
            {conversion.clinicTime}
          </div>
        </div>
      </div>

      {showWarnings && conversion.warning && (
        <Alert className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {conversion.warning}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

interface TimeRangeConverterProps {
  startTime: string;
  endTime: string;
  doctorTimezone: string;
  showWarnings?: boolean;
}

export const TimeRangeConverter: React.FC<TimeRangeConverterProps> = ({
  startTime,
  endTime,
  doctorTimezone,
  showWarnings = true
}) => {
  if (!startTime || !endTime) {
    return null;
  }

  const startConversion = convertDoctorToClinicTime(startTime, doctorTimezone);
  const endConversion = convertDoctorToClinicTime(endTime, doctorTimezone);
  
  const doctorAbbr = getTimezoneAbbr(doctorTimezone);
  const clinicAbbr = CLINIC_TIMEZONE_LABEL || getTimezoneAbbr(CLINIC_TIMEZONE);

  const hasWarning = startConversion.crossesMidnight || endConversion.crossesMidnight;
  const dayOffsetMismatch = startConversion.dayOffset !== endConversion.dayOffset;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
        <Info className="w-4 h-4" />
        <span>Time Conversion Preview</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Your Timezone */}
        <div className="bg-white rounded-md p-3 border border-gray-200">
          <div className="text-xs font-medium text-gray-600 mb-2">
            Your Time ({doctorAbbr})
          </div>
          <div className="text-lg font-mono font-semibold text-gray-900">
            {startTime} - {endTime}
          </div>
        </div>

        {/* Clinic Timezone */}
        <div className="bg-emerald-50 rounded-md p-3 border border-emerald-200">
          <div className="text-xs font-medium text-emerald-700 mb-2">
            📍 Clinic Time ({clinicAbbr})
          </div>
          <div className="text-lg font-mono font-semibold text-emerald-700">
            {startConversion.clinicTime} - {endConversion.clinicTime}
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            Patients will see this time
          </div>
        </div>
      </div>

      {showWarnings && hasWarning && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {dayOffsetMismatch ? (
              <span>
                ⚠️ <strong>Warning:</strong> This time range spans across different days in clinic timezone. 
                Please adjust your times or split into separate slots.
              </span>
            ) : (
              <span>
                {startConversion.warning || endConversion.warning}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

interface TimezoneInfoBoxProps {
  doctorTimezone: string;
}

export const TimezoneInfoBox: React.FC<TimezoneInfoBoxProps> = ({ doctorTimezone }) => {
  const now = new Date();
  const doctorTime = formatTimeWithTimezone('12:00', doctorTimezone, now);
  const clinicTime = formatTimeWithTimezone('12:00', CLINIC_TIMEZONE, now);

  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-sm text-blue-800">
        <div className="font-semibold mb-1">How timezone conversion works:</div>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Set your availability times in <strong>your timezone</strong></li>
          <li>Times are automatically converted to <strong>clinic timezone</strong></li>
          <li>Patients always see times in clinic timezone</li>
          <li>You can change your timezone anytime - existing slots stay in clinic time</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};

