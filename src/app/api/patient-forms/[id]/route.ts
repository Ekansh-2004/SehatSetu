import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { 
  sanitizeId, 
  sanitizeString,
  detectSqlInjection,
  detectXss,
  logSecurityEvent 
} from '@/lib/security/input-sanitizer'
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS,
  getClientIdentifier
} from '@/lib/security/rate-limiter'

// Set timeout to 30 seconds to prevent data loss
export const maxDuration = 30

// Update patient form submission (for staff)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimitResult = await withRateLimit(
      request,
      '/api/patient-forms/[id]',
      RATE_LIMIT_CONFIGS.api,
      { userId: user.id }
    )
    
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!
    }

    // TODO: Re-enable proper staff role validation once staff records are finalized.
    // TEMPORARY: Allow all Clerk-authenticated users to update patient forms

    const { id: rawId } = await params
    
    const id = sanitizeId(rawId)
    if (!id) {
      return NextResponse.json(
        { error: 'Invalid form ID format' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    const body = await request.json()
    const { status, notes, appointmentId } = body

    const allowedStatuses = ['pending', 'reviewed', 'slots_sent', 'slots_confirmed', 'appointment_booked']
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400, headers: rateLimitResult.headers }
      )
    }

    let sanitizedNotes = notes
    if (notes) {
      const xssCheck = detectXss(notes)
      if (xssCheck.isSuspicious) {
        logSecurityEvent('xss', {
          userId: user.id,
          endpoint: '/api/patient-forms/[id]',
          input: notes,
          patterns: xssCheck.patterns,
        })
        return NextResponse.json(
          { error: 'Invalid notes content' },
          { status: 400, headers: rateLimitResult.headers }
        )
      }
      sanitizedNotes = sanitizeString(notes)
    }

    let sanitizedAppointmentId = appointmentId
    if (appointmentId) {
      sanitizedAppointmentId = sanitizeId(appointmentId)
      if (!sanitizedAppointmentId) {
        return NextResponse.json(
          { error: 'Invalid appointment ID format' },
          { status: 400, headers: rateLimitResult.headers }
        )
      }
    }

    const updatedSubmission = await prisma.patientFormSubmission.update({
      where: { id },
      data: {
        status,
        notes: sanitizedNotes,
        appointmentId: sanitizedAppointmentId,
        staffId: null // TEMPORARY: Set to null since we're not verifying staff
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedSubmission
    }, { headers: rateLimitResult.headers })

  } catch (error) {
    console.error('Error updating patient form:', error)
    return NextResponse.json(
      { error: 'Failed to update form' },
      { status: 500 }
    )
  }
}

