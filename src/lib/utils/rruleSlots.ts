import { RRule } from 'rrule'
import { DateTime } from 'luxon'
import { DatabaseService } from '../db/services/databaseService'
import { CLINIC_TIMEZONE } from '../config/timezone'

export interface TimeRange {
  startTime: string
  endTime: string
}

export interface AvailabilitySlot {
  date: string
  slots: Array<{
    time: string
    isAvailable: boolean
  }>
}

export class RRuleSlotManager {
  /**
   * Generate availability slots based on RRULE and time ranges
   */
  static async generateAvailabilitySlots(
    timeRanges: TimeRange[],
    rruleString: string,
    maxDays: number = 14,
    sessionDuration: number = 30,
    doctorId: string
  ): Promise<AvailabilitySlot[]> {
    try {
      // Validate inputs
      if (!rruleString || !timeRanges || timeRanges.length === 0) {
        console.log('Invalid inputs:', { rruleString, timeRanges })
        return []
      }
      
      // Clean up RRULE string - remove timezone info for parsing
      let cleanRruleString = rruleString
      
      // Extract start date from DTSTART
      const dtstartMatch = rruleString.match(/DTSTART[^:]*:([^\r\n]+)/)
      if (dtstartMatch) {
        const startDateStr = dtstartMatch[1]
        // Parse the date properly (format: YYYYMMDDTHHMMSS)
        const year = startDateStr.substring(0, 4)
        const month = startDateStr.substring(4, 6)
        const day = startDateStr.substring(6, 8)
        const hour = startDateStr.substring(9, 11)
        const minute = startDateStr.substring(11, 13)
        const second = startDateStr.substring(13, 15)
        
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second))
        cleanRruleString = `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n${rruleString.split('\n')[1]}`
      }
      
      // Parse RRULE
      const rrule = RRule.fromString(cleanRruleString)
      
      const todayInClinic = DateTime.now().setZone(CLINIC_TIMEZONE).startOf('day');
      const endDateInClinic = todayInClinic.plus({ days: maxDays });
      
      const occurrenceDates = rrule.between(
        todayInClinic.toJSDate(),
        endDateInClinic.toJSDate(),
        true // Include start date
      )

      // Fetch appointments that should block slots (scheduled, confirmed, or completed)
      // Only cancelled appointments should free up the slot
      const appointments = await DatabaseService.getAppointments({ doctorId });
      const activeAppointments = appointments.filter(apt => 
        apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'completed'
      );
      
      // Group appointments by date for efficient lookup
      const appointmentsByDate = new Map<string, Array<{ startTime: string; endTime: string }>>();
      activeAppointments.forEach(appointment => {
        const appointmentInClinic = DateTime.fromJSDate(appointment.date).setZone(CLINIC_TIMEZONE);
        const dateStr = appointmentInClinic.toFormat('yyyy-MM-dd');
        if (!appointmentsByDate.has(dateStr)) {
          appointmentsByDate.set(dateStr, []);
        }
        appointmentsByDate.get(dateStr)!.push({
          startTime: appointment.startTime,
          endTime: appointment.endTime
        });
      });
      
      // Helper function to check if a slot overlaps with any appointment
      const isSlotBooked = (dateStr: string, slotStart: string, slotEnd: string): boolean => {
        const dayAppointments = appointmentsByDate.get(dateStr) || [];
        return dayAppointments.some(apt => {
          // Convert times to minutes for easier comparison
          const [slotStartH, slotStartM] = slotStart.split(':').map(Number);
          const [slotEndH, slotEndM] = slotEnd.split(':').map(Number);
          const [aptStartH, aptStartM] = apt.startTime.split(':').map(Number);
          const [aptEndH, aptEndM] = apt.endTime.split(':').map(Number);
          
          const slotStartMin = slotStartH * 60 + slotStartM;
          const slotEndMin = slotEndH * 60 + slotEndM;
          const aptStartMin = aptStartH * 60 + aptStartM;
          const aptEndMin = aptEndH * 60 + aptEndM;
          
          // Check for any overlap
          return slotStartMin < aptEndMin && slotEndMin > aptStartMin;
        });
      };

      const availability: AvailabilitySlot[] = []

      occurrenceDates.forEach(date => {
        const dateInClinic = DateTime.fromJSDate(date).setZone(CLINIC_TIMEZONE);
        const dateStr = dateInClinic.toFormat('yyyy-MM-dd');
        
        const isToday = dateStr === todayInClinic.toFormat('yyyy-MM-dd');
        
        const nowInClinic = DateTime.now().setZone(CLINIC_TIMEZONE);
        const currentTimeStr = nowInClinic.toFormat('HH:mm');
        
        
        // Generate time slots for this date
        const slots: Array<{ time: string; isAvailable: boolean }> = []
        
        timeRanges.forEach(range => {
          const startTime = range.startTime
          const endTime = range.endTime
          
          // Generate slots based on session duration
          let currentTime = startTime
          while (currentTime < endTime) {
            // Check if we have enough time for a complete slot
            const [currentHours, currentMinutes] = currentTime.split(':').map(Number)
            const currentTotalMinutes = currentHours * 60 + currentMinutes
            
            const [endHours, endMinutes] = endTime.split(':').map(Number)
            const endTotalMinutes = endHours * 60 + endMinutes
            // Add session duration minutes
            const nextMinutes = currentMinutes + sessionDuration
            const nextHours = currentHours + Math.floor(nextMinutes / 60)
            const finalMinutes = nextMinutes % 60;
            const newCurrentTime = `${nextHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;  
            
            // Only create slot if we have enough time for a complete session
            if (endTotalMinutes - currentTotalMinutes >= sessionDuration) {
              const currentClinicMinutes = nowInClinic.hour * 60 + nowInClinic.minute;
              
              if (isToday && currentTotalMinutes <= currentClinicMinutes) {
                currentTime = newCurrentTime;
                continue;
              }
              
              // Check if this slot overlaps with any existing appointment
              const isBooked = isSlotBooked(dateStr, currentTime, newCurrentTime);
              slots.push({
                time: currentTime,
                isAvailable: !isBooked,
              })
            }
            
          
            currentTime = newCurrentTime;
          }
        })

        if (slots.length > 0) {
          availability.push({
            date: dateStr,
            slots
          })
        }
      })

      return availability
    } catch (error) {
      console.error('Error generating availability slots from RRULE:', error)
      return []
    }
  }

  /**
   * Create RRULE string from configuration
   */
  static createRRuleString(config: {
    startDate: Date
    endDate?: Date
    daysOfWeek: number[]
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval?: number
  }): string {
    const { startDate, endDate, daysOfWeek, frequency, interval = 1 } = config;
    const rrule = new RRule({
      freq: frequency === 'daily' ? RRule.DAILY :
            frequency === 'weekly' ? RRule.WEEKLY :
            frequency === 'monthly' ? RRule.MONTHLY :
            RRule.YEARLY,
      dtstart: startDate,
      until: endDate,
      interval,
      byweekday: daysOfWeek.map(day => {
        // Convert 1-7 (Monday-Sunday) to RRule weekday constants
        const weekdays = [
          RRule.MO, // 1 = Monday
          RRule.TU, // 2 = Tuesday
          RRule.WE, // 3 = Wednesday
          RRule.TH, // 4 = Thursday
          RRule.FR, // 5 = Friday
          RRule.SA, // 6 = Saturday
          RRule.SU  // 7 = Sunday
        ]
        return weekdays[day - 1]
      })
    })

    const rruleString = rrule.toString()
    console.log('Generated RRULE string:', rruleString)
    return rruleString
  }

  /**
   * Parse time ranges from JSON string
   */
  static parseTimeRanges(timeRangesStr: string): TimeRange[] {
    try {
      return typeof timeRangesStr === 'string' 
        ? JSON.parse(timeRangesStr) 
        : timeRangesStr
    } catch (error) {
      console.error('Error parsing time ranges:', error)
      return []
    }
  }
} 