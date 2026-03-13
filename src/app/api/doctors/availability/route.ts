import { NextRequest, NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db/services/databaseService'
import { currentUser } from '@clerk/nextjs/server'
import { RRuleSlotManager } from '@/lib/utils/rruleSlots'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const doctor = await DatabaseService.getDoctorByClerkUserId(user.id)
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }

    // DatabaseService already converts slots from RRULE format to frontend format
    const processedSlots = doctor.slots || []

    return NextResponse.json({
      success: true,
      data: {
        slots: processedSlots, // Already converted from RRULE format by DatabaseService
        defaultSessionDuration: doctor.defaultSessionDuration,
        maxPatientsPerDay: doctor.maxPatientsPerDay,
        advanceBookingDays: doctor.advanceBookingDays
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

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    
    const {
      slots,
      defaultSessionDuration,
      maxPatientsPerDay,
      advanceBookingDays
    } = body

    // If slots are provided, validate them
    if (slots && Array.isArray(slots)) {
      for (const slot of slots) {
        const {
          id,
          startDate,
          timeRanges = [],
          daysOfWeek,
          isRecurring,
          frequency,
        } = slot;

        if (!id || !startDate || !timeRanges.length || !daysOfWeek ) {
          return NextResponse.json(
            { error: 'Slot must have id, startDate, timeRanges, daysOfWeek' },
            { status: 400 }
          )
        }
      
        if (isRecurring && daysOfWeek && daysOfWeek.length === 0) {
          return NextResponse.json(
            { error: 'Slot must have at least one day of week if it is recurring' },
            { status: 400 }
          )
        }
        for (const day of daysOfWeek) {
          if (day < 1 || day > 7) {
            return NextResponse.json(
              { error: 'Invalid day of week' },
              { status: 400 }
            )
          }
        }
        if (isRecurring && frequency && !['weekly', 'monthly'].includes(frequency)) {
          return NextResponse.json(
            { error: 'Frequency must be weekly or monthly' },
            { status: 400 }
          )
        }
      }
    }

    // Validate other fields
    if (defaultSessionDuration && (defaultSessionDuration < 15 || defaultSessionDuration > 120)) {
      return NextResponse.json(
        { error: 'Default session duration must be between 15 and 120 minutes' },
        { status: 400 }
      )
    }

    if (maxPatientsPerDay && (maxPatientsPerDay < 1 || maxPatientsPerDay > 50)) {
      return NextResponse.json(
        { error: 'Max patients per day must be between 1 and 50' },
        { status: 400 }
      )
    }

    if (advanceBookingDays && (advanceBookingDays < 1 || advanceBookingDays > 365)) {
      return NextResponse.json(
        { error: 'Advance booking days must be between 1 and 365' },
        { status: 400 }
      )
    }

    const updateData: Partial<IDoctor> = {
      updatedAt: new Date()
    }

    // Update with new slots format if provided
    if (slots !== undefined) {
      // Convert new slot format to RRULE format for database storage
      const processedSlots = slots.map((slot: IAvailabilitySlot) => {
        // Generate RRULE string from slot configuration
        let rruleString = ''
        
        if (slot.isRecurring && slot.daysOfWeek && slot.daysOfWeek.length > 0) {
          // For recurring slots, create RRULE with specified days of week
          const startDate = new Date(slot.startDate)
          const endDate = slot.repeatUntil ? new Date(slot.repeatUntil) : undefined
          
          rruleString = RRuleSlotManager.createRRuleString({
            startDate,
            endDate,
            daysOfWeek: slot.daysOfWeek,
            frequency: slot.frequency || 'weekly'
          })
        }else{
          rruleString = RRuleSlotManager.createRRuleString({
            startDate: new Date(slot.startDate),
            endDate: new Date(slot.startDate),
            daysOfWeek: slot.daysOfWeek,
            frequency: slot.frequency || 'weekly'
          })
        }
        
        return {
          id: slot.id,
          timeRanges: JSON.stringify(slot.timeRanges || []),
          rrule: rruleString,
          startDate: slot.startDate,
          repeatUntil: slot.repeatUntil
        }
      })
      
      updateData.slots = processedSlots
    }
    

    // Update with old availability format if provided
    // if (availability !== undefined) {
    //   updateData.availability = normalizedAvailability
    // }

    if (defaultSessionDuration !== undefined) {
      updateData.defaultSessionDuration = defaultSessionDuration
    }
    // Note: timezone is not stored in the database schema, so we skip it
    if (maxPatientsPerDay !== undefined) {
      updateData.maxPatientsPerDay = maxPatientsPerDay
    }
    if (advanceBookingDays !== undefined) {
      updateData.advanceBookingDays = advanceBookingDays
    }

    const doctor = await DatabaseService.getDoctorByClerkUserId(user.id)
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })
    }
    
    // Update using DatabaseService with proper schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedDoctor = await DatabaseService.updateDoctor(doctor.id, updateData as any)
    
    if (!updatedDoctor) {
      return NextResponse.json({ error: 'Failed to update doctor' }, { status: 500 })
    }

    // DatabaseService already converts slots from RRULE format to frontend format
    const responseData = {
      slots: slots || [],
      defaultSessionDuration: updatedDoctor?.defaultSessionDuration || 30,
      maxPatientsPerDay: updatedDoctor?.maxPatientsPerDay || 20,
      advanceBookingDays: updatedDoctor?.advanceBookingDays || 30,
    }
    
    
    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error updating doctor availability:', error)
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    )
  }
} 