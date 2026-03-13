import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { DatabaseService } from '@/lib/db/services/databaseService'
import { RRuleSlotManager } from '@/lib/utils/rruleSlots'
import { CLINIC_TIMEZONE } from '@/lib/config/timezone'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: doctorId } = await params
    const { searchParams } = new URL(request.url)
    
    // Validate doctor exists
    const doctor = await DatabaseService.getDoctorById(doctorId)
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor not found' },
        { status: 404 }
      )
    }

    // Use doctor's advance booking days setting, with fallback to 14 days
    const requestedDays = parseInt(searchParams.get('days') || '0')
    const doctorAdvanceDays = doctor.advanceBookingDays || 14
    const maxDays = requestedDays > 0 ? Math.min(requestedDays, doctorAdvanceDays) : doctorAdvanceDays

    // Check if doctor has configured their availability settings
    if (!doctor.slots || doctor.slots.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          doctorId,
          doctorName: doctor.name,
          availability: [],
          message: "Doctor has not configured availability settings yet"
        }
      })
    }

    // Generate availability using RRULE
    const availability: Array<{ date: string; slots: Array<{ time: string; isAvailable: boolean }> }> = []
    
    for (const slot of doctor.slots || []) {
      // The slot is already in frontend format (timeRanges is array, no rrule property)
      // We need to reconstruct the RRULE from the slot data
      if (slot.timeRanges && slot.timeRanges.length > 0 ) {
        // Reconstruct RRULE from slot data
        const startDate = DateTime.fromISO(slot.startDate, { zone: CLINIC_TIMEZONE }).toJSDate();
        
        let endDate = undefined
        if (slot.repeatUntil) {
          endDate = DateTime.fromISO(slot.repeatUntil, { zone: CLINIC_TIMEZONE }).toJSDate();
        }
        
        const rruleString = RRuleSlotManager.createRRuleString({
          startDate,
          endDate,
          daysOfWeek: slot.daysOfWeek,
          frequency: slot.isRecurring ? (slot.frequency || 'weekly') : 'daily'
        })
        
        
        
        // Generate slots using reconstructed RRULE
        const slotAvailability = await RRuleSlotManager.generateAvailabilitySlots(
          slot.timeRanges as IAvailabilityTimeRange[],
          rruleString,
          maxDays,
          doctor.defaultSessionDuration || 30, 
          doctorId
        )
        
        // Merge with existing availability (avoid duplicates)
        slotAvailability.forEach(slotData => {
          const existingIndex = availability.findIndex(a => a.date === slotData.date)
          if (existingIndex >= 0) {
            // Merge slots for the same date
            const existingSlots = availability[existingIndex].slots
            slotData.slots.forEach(newSlot => {
              if (!existingSlots.find(s => s.time === newSlot.time)) {
                existingSlots.push(newSlot)
              }
            })
            // Sort slots by time
            existingSlots.sort((a, b) => a.time.localeCompare(b.time))
          } else {
            availability.push(slotData)
          }
        })
      }
    }
    
    // Sort availability by date
    availability.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor.name,
        availability,
        timezone: CLINIC_TIMEZONE,
        timezoneLabel: process.env.NEXT_PUBLIC_CLINIC_TIMEZONE_LABEL || 'ET'
      }
    })
  } catch (error) {
    console.error('Error fetching doctor availability:', error)
    return NextResponse.json(
      { error: 'Failed to fetch availability' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: doctorId } = await params
    const body = await request.json()
    const { date, startTime, endTime } = body

    // Validate required fields
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Date, startTime, and endTime are required' },
        { status: 400 }
      )
    }

    // Simple time format validation
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:mm format' },
        { status: 400 }
      )
    }

    // TODO: Implement proper slot availability checking with MySQL
    // For now, return that the slot is available
    const isAvailable = true

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'This time slot is not available' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        isAvailable: true,
        date,
        startTime,
        endTime
      }
    })
  } catch (error) {
    console.error('Error checking slot availability:', error)
    return NextResponse.json(
      { error: 'Failed to check slot availability' },
      { status: 500 }
    )
  }
} 