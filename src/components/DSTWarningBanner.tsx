/**
 * DST Warning Banner Component
 * 
 * Shows warnings about Daylight Saving Time transitions
 */

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { checkDSTTransitions, DSTWarning } from '@/lib/utils/timezoneHelpers';
import { Badge } from '@/components/ui/badge';

interface DSTWarningBannerProps {
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timezone: string;
}

export const DSTWarningBanner: React.FC<DSTWarningBannerProps> = ({
  startDate,
  endDate,
  timezone
}) => {
  const [warning, setWarning] = useState<DSTWarning | null>(null);

  useEffect(() => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : undefined;
    
    const dstCheck = checkDSTTransitions(start, end, timezone);
    
    if (dstCheck.hasDSTChange) {
      setWarning(dstCheck);
    } else {
      setWarning(null);
    }
  }, [startDate, endDate, timezone]);

  if (!warning || !warning.hasDSTChange) {
    return null;
  }

  return (
    <Alert variant="default" className="bg-amber-50 border-amber-300">
      <Clock className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 font-semibold">
        Daylight Saving Time Change Detected
      </AlertTitle>
      <AlertDescription className="text-amber-800 text-sm space-y-2">
        <p>{warning.message}</p>
        {warning.affectedDates && warning.affectedDates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {warning.affectedDates.map((date, idx) => (
              <Badge key={idx} variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
                {date.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Badge>
            ))}
          </div>
        )}
        <p className="text-xs mt-2 italic">
          💡 Tip: Your availability times will automatically adjust. Review your schedule after DST changes.
        </p>
      </AlertDescription>
    </Alert>
  );
};

