import { NextRequest, NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import { DatabaseService } from '@/lib/db/services/databaseService'
import { appointmentQuerySchema, appointmentBookingSchema, guestAppointmentSchema } from '@/lib/validation/schemas'
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE, PAYMENT_STATUS } from '../../../../types'
import { sendAppointmentConfirmationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { CLINIC_TIMEZONE } from '@/lib/config/timezone'
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS 
} from '@/lib/security/rate-limiter'
// Global types are now available without imports

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = await withRateLimit(
      request,
      '/api/appointments',
      RATE_LIMIT_CONFIGS.api
    )
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    const { searchParams } = new URL(request.url)
    
    const queryData = {
      patientId: searchParams.get('patientId'),
      doctorId: searchParams.get('doctorId'),
      date: searchParams.get('date'),
      status: searchParams.get('status') as 'scheduled' | 'completed' | 'cancelled' | 'no-show' | undefined
    }
    
    const validationResult = appointmentQuerySchema.safeParse(queryData)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: validationResult.error.errors 
        },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const { patientId, doctorId, date, status } = validationResult.data

    let appointments: IAppointment[]
    if (patientId) {
      appointments = await DatabaseService.getAppointments({ patientId })
    } else if (doctorId) {
      appointments = await DatabaseService.getAppointments({ doctorId })
    } else if (date) {
      appointments = await DatabaseService.getAppointments({ date: new Date(date) })
    } else {
      // Return all appointments (you might want to limit this in production)
      appointments = await DatabaseService.getAppointments()
    }

    // Filter by status if provided
    if (status) {
      appointments = appointments.filter(apt => apt.status === status)
    }

    console.log('appointments', appointments)
    return NextResponse.json({
      success: true,
      data: appointments
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const isGuestAppointment = body.guestName && body.guestEmail
    
    // Server-side validation
    let validationResult
    if (isGuestAppointment) {
      validationResult = guestAppointmentSchema.safeParse(body)
    } else {
      validationResult = appointmentBookingSchema.safeParse(body)
    }
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data
    const {
      patientId,
      doctorId,
      date,
      startTime,
      endTime,
      type = APPOINTMENT_TYPE.CONSULTATION,
      reason,
      symptoms,
      paymentAmount = 0,
      stripeSessionId,
      stripePaymentIntentId,
      mode = 'physical',
    } = validatedData

    // Extract guest fields if this is a guest appointment
    let guestName: string | undefined
    let guestEmail: string | undefined
    let guestPhone: string | undefined

    if (isGuestAppointment && 'guestName' in validatedData) {
      const guestData = validatedData as typeof validatedData & { guestName: string; guestEmail: string; guestPhone?: string }
      guestName = guestData.guestName
      guestEmail = guestData.guestEmail
      guestPhone = guestData.guestPhone || undefined
    }

    // If guest appointment, resolve or create guest patient record
    let resolvedPatientId = patientId as string | undefined
    
    if (isGuestAppointment && !resolvedPatientId) {
      console.log(`[APPOINTMENT] Resolving guest patient: ${guestEmail}`)
      
      // STEP 1: Try to find existing patient by email (most reliable for returning guests)
      const existingByEmail = await prisma.patient.findFirst({
        where: { 
          email: guestEmail!.trim().toLowerCase(),
          isActive: true 
        },
        orderBy: {
          createdAt: 'desc' // Get most recent if duplicates exist
        },
        select: {
          id: true,
          name: true,
          email: true,
          clerkUserId: true
        }
      })
      
      if (existingByEmail) {
        console.log(`[APPOINTMENT] Found existing patient by email: ${existingByEmail.id}`)
        resolvedPatientId = existingByEmail.id
      } else {
        let existingByComposite = null
        if (guestPhone) {
          console.log(`[APPOINTMENT] Attempting composite key lookup`)
          existingByComposite = await DatabaseService.getPatientByNameEmailPhone(
            guestName!.trim(), 
            guestEmail!.trim().toLowerCase(), 
            guestPhone.trim()
          )
        }
        
        if (existingByComposite) {
          console.log(`[APPOINTMENT] Found existing patient by composite key: ${(existingByComposite as any).id}`)
          resolvedPatientId = (existingByComposite as { id: string }).id
        } else {
          // STEP 3: Create new guest patient record
          console.log(`[APPOINTMENT] Creating new guest patient record`)
          
          const guestPatientPayload = {
            clerkUserId: `guest_${Date.now()}_${randomUUID()}`,
            name: guestName!.trim(),
            email: guestEmail!.trim().toLowerCase(),
            phone: guestPhone?.trim() || '',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'other' as const,
            street: 'N/A',
            city: 'N/A',
            state: 'N/A',
            zipCode: '00000',
            emergencyContactName: 'N/A',
            emergencyContactPhone: '+10000000000',
            emergencyContactRelationship: 'N/A',
            medicalHistory: [] as string[],
            allergies: [] as string[],
            currentMedications: [] as string[],
            insuranceProvider: null,
            insurancePolicyNumber: null,
            insuranceGroupNumber: null,
            isActive: true,
          }
          
          try {
            const createdGuestPatient = await DatabaseService.createPatient(guestPatientPayload)
            resolvedPatientId = (createdGuestPatient as { id: string }).id
            console.log(`[APPOINTMENT] Guest patient created: ${resolvedPatientId}`)
          } catch (createError: any) {
            // Handle race condition - another request may have created patient
            if (createError.code === 'P2002') {
              console.warn('[APPOINTMENT] Race condition detected - patient created by concurrent request')
              // Retry email lookup
              const retryPatient = await prisma.patient.findFirst({
                where: { email: guestEmail!.trim().toLowerCase() },
                select: { id: true }
              })
              if (retryPatient) {
                resolvedPatientId = retryPatient.id
                console.log(`[APPOINTMENT] Found patient on retry: ${resolvedPatientId}`)
              } else {
                throw createError // Re-throw if still can't find
              }
            } else {
              throw createError
            }
          }
        }
      }
      
      if (!resolvedPatientId) {
        console.error('[APPOINTMENT] Failed to resolve or create patient for guest')
        return NextResponse.json(
          { error: 'Failed to create patient record. Please try again.' },
          { status: 500 }
        )
      }
    }

    const appointmentDateTime = DateTime.fromISO(`${date}T${startTime}`, { zone: CLINIC_TIMEZONE });
    const appointmentDate = appointmentDateTime.toJSDate();
    
    // For now, we'll skip conflict checking as it's not implemented in the new service
    // TODO: Implement conflict checking in PrismaService
    const hasConflict = false

    if (hasConflict) {
      console.log(`Conflict detected for doctor ${doctorId} on ${date} at ${startTime}-${endTime}`)
      
      // Get existing appointments for debugging
      // TODO: Implement date-specific appointment filtering in PrismaService
      const existingAppointments = await DatabaseService.getAppointments({ doctorId })
      console.log('Existing appointments on this date:', existingAppointments.map(apt => ({
        id: apt.id,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status
      })))
      
      return NextResponse.json(
        { error: 'This time slot is already booked. Please select a different time.' },
        { status: 409 }
      )
    }

    console.log(`No conflict detected, proceeding with appointment creation`)

    // Additional check: Verify no existing appointment with same Stripe session
    if (stripeSessionId) {
      const existingAppointments = await DatabaseService.getAppointments({ doctorId })
      const existingWithSession = existingAppointments.find(apt => apt.stripeSessionId === stripeSessionId)
      
      if (existingWithSession) {
        console.log(`Appointment with session ${stripeSessionId} already exists`)
        return NextResponse.json(
          { success: true, data: existingWithSession },
          { status: 200 }
        )
      }
    }

    // Create appointment data
    const appointmentData = {
      patientId: resolvedPatientId,
      doctorId,
      date: appointmentDate,
      startTime,
      endTime,
      type,
      reason,
      symptoms: symptoms ? [symptoms] : [],
      status: APPOINTMENT_STATUS.SCHEDULED,
      paymentStatus: stripeSessionId ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PENDING,
      paymentAmount,
      stripeSessionId,
      stripePaymentIntentId,
      guestName,
      guestEmail,
      guestPhone,
      reminderSent: false,
      followUpRequired: false,
      mode,
    }

    // Create the appointment
    const newAppointment = await DatabaseService.createAppointment(appointmentData)

    // Send email with meeting room link after successful appointment creation
    try {
      // Create meeting room URL
      const meetingRoomUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/consultation/appointment-${newAppointment.id}?patientName=${encodeURIComponent(guestName || 'Patient')}&doctorName=${encodeURIComponent('Doctor')}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(startTime)}&appointmentId=${newAppointment.id}`

      // Get doctor information for email
      let doctorName = 'Doctor'
      try {
        const doctor = await DatabaseService.getDoctorById(doctorId)
        if (doctor) {
          doctorName = doctor.name
        }
      } catch (error) {
        console.warn('Could not fetch doctor information for email:', error)
      }

      // Send confirmation email with meeting room link
      if (guestEmail) {
        await sendAppointmentConfirmationEmail({
          patientName: guestName || 'Patient',
          patientEmail: guestEmail,
          doctorName,
          appointmentDate: date,
          appointmentTime: startTime,
          meetingRoomUrl,
          appointmentId: newAppointment.id
        })
        console.log('Appointment confirmation email sent to:', guestEmail)
      }
    } catch (emailError) {
      // Don't fail the appointment creation if email fails
      console.error('Failed to send confirmation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: newAppointment
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    const updatedAppointment = await DatabaseService.updateAppointment(id, updates)

    if (!updatedAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedAppointment
    })

  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    const deleted = await DatabaseService.deleteAppointment(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json(
      { error: 'Failed to delete appointment' },
      { status: 500 }
    )
  }
} 