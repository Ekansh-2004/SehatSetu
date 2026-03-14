import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db/prisma'
import { currentUser } from '@clerk/nextjs/server'

// Set timeout to 30 seconds to prevent data loss
export const maxDuration = 30

const CONSULTATION_MODE_PREFIX = '[CONSULTATION_MODE]:'

function normalizeConsultationMode(input: unknown): 'video' | 'physical' {
  if (typeof input !== 'string') return 'physical'
  return input.toLowerCase() === 'video' ? 'video' : 'physical'
}

function buildNotesWithMode(existingNotes: unknown, consultationMode: 'video' | 'physical'): string {
  const cleaned = typeof existingNotes === 'string'
    ? existingNotes
        .split('\n')
        .filter((line) => !line.startsWith(CONSULTATION_MODE_PREFIX))
        .join('\n')
        .trim()
    : ''

  return cleaned
    ? `${CONSULTATION_MODE_PREFIX}${consultationMode}\n${cleaned}`
    : `${CONSULTATION_MODE_PREFIX}${consultationMode}`
}

function extractConsultationMode(notes: unknown): 'video' | 'physical' {
  if (typeof notes !== 'string') return 'physical'
  const markerLine = notes
    .split('\n')
    .find((line) => line.startsWith(CONSULTATION_MODE_PREFIX))

  if (!markerLine) return 'physical'

  const mode = markerLine.slice(CONSULTATION_MODE_PREFIX.length).trim().toLowerCase()
  return mode === 'video' ? 'video' : 'physical'
}

// Get all patient form submissions (for staff)
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Re-enable proper staff role validation once staff records are finalized.
    // TEMPORARY: Allow all Clerk-authenticated users to access patient forms

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Build where clause - if status is null, fetch all forms
    const whereClause = status ? { status } : {}

    const submissions = await prisma.patientFormSubmission.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const mappedSubmissions = submissions.map((submission) => ({
      ...submission,
      consultationMode: extractConsultationMode(submission.notes),
    }))

    return NextResponse.json({
      success: true,
      data: mappedSubmissions
    })

  } catch (error) {
    console.error('Error fetching patient forms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient forms' },
      { status: 500 }
    )
  }
}

// Validation helper for form data
const validateFormData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters')
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('Valid email is required')
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format')
    }
  }

  // Phone is optional - patients can choose not to provide it
  // Just email is required for primary identification

  if (!data.dateOfBirth) {
    errors.push('Date of birth is required')
  }

  if (!data.gender || !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Gender is required and must be one of: male, female, other')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Submit patient form
 * Supports both authenticated patients and guest users
 */
export async function POST(request: NextRequest) {
  try {
    // Check for patient session (custom auth)
    const cookieStore = await cookies()
    const patientSessionId = cookieStore.get('patient_session')?.value

    console.log(`[PATIENT-FORM] Processing form submission (Patient Session: ${patientSessionId ? 'Yes' : 'No'})`)

    // Parse request body
    let formData: any
    try {
      formData = await request.json()
    } catch (parseError) {
      console.error('[PATIENT-FORM] Invalid JSON in request body')
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body - must be valid JSON' 
        },
        { status: 400 }
      )
    }

    // Validate form data
    const validation = validateFormData(formData)
    if (!validation.valid) {
      console.warn('[PATIENT-FORM] Validation failed:', validation.errors)
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    let patientId: string | null = null

    // If patient is authenticated, link to their account
    if (patientSessionId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientSessionId },
        // Avoid selecting non-essential columns so missing optional DB columns
        // (for example from drifted environments) do not break form submission.
        select: {
          id: true,
          phone: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelationship: true,
          medicalHistory: true,
          allergies: true,
          currentMedications: true,
          insuranceProvider: true,
          insurancePolicyNumber: true,
          insuranceGroupNumber: true,
          consentToAlerts: true,
        },
      })
      
      if (patient) {
        patientId = patient.id
        console.log(`[PATIENT-FORM] Form linked to authenticated patient: ${patientId}`)
        
        // Update patient record with latest form data
        try {
          await prisma.patient.update({
            where: { id: patient.id },
            data: {
              name: formData.name.trim(),
              email: formData.email.trim().toLowerCase(),
              phone: formData.phone?.trim() || patient.phone,
              dateOfBirth: new Date(formData.dateOfBirth),
              gender: formData.gender,
              street: formData.street || patient.street,
              city: formData.city || patient.city,
              state: formData.state || patient.state,
              zipCode: formData.zipCode || patient.zipCode,
              emergencyContactName: formData.emergencyContactName || patient.emergencyContactName,
              emergencyContactPhone: formData.emergencyContactPhone || patient.emergencyContactPhone,
              emergencyContactRelationship: formData.emergencyContactRelationship || patient.emergencyContactRelationship,
              medicalHistory: formData.medicalHistory && formData.medicalHistory.length > 0 
                ? formData.medicalHistory 
                : patient.medicalHistory,
              allergies: formData.allergies && formData.allergies.length > 0 
                ? formData.allergies 
                : patient.allergies,
              currentMedications: formData.currentMedications && formData.currentMedications.length > 0 
                ? formData.currentMedications 
                : patient.currentMedications,
              insuranceProvider: formData.insuranceProvider || patient.insuranceProvider,
              insurancePolicyNumber: formData.insurancePolicyNumber || patient.insurancePolicyNumber,
              insuranceGroupNumber: formData.insuranceGroupNumber || patient.insuranceGroupNumber,
              consentToAlerts: formData.consentToAlerts !== undefined ? formData.consentToAlerts : patient.consentToAlerts,
            }
          })
          
          console.log(`[PATIENT-FORM] Patient record updated: ${patient.id}`)
        } catch (updateError) {
          console.error('[PATIENT-FORM] Failed to update patient record:', updateError)
        }
      }
    } else {
      // Guest user - try to find or create patient record
      console.log('[PATIENT-FORM] Processing as guest user')
      
      // Check if patient exists with this email or phone
      const orConditions: Array<{ email: string } | { phone: string }> = [
        { email: formData.email.trim().toLowerCase() },
      ]
      // Only search by phone if provided
      if (formData.phone?.trim()) {
        orConditions.push({ phone: formData.phone.trim() })
      }
      
      const existingPatient = await prisma.patient.findFirst({
        where: {
          OR: orConditions,
        },
        select: {
          id: true,
          dateOfBirth: true,
          gender: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelationship: true,
          consentToAlerts: true,
        },
      })

      if (existingPatient) {
        patientId = existingPatient.id
        console.log(`[PATIENT-FORM] Found existing patient record: ${patientId}`)
        
        // Update existing patient record
        try {
          await prisma.patient.update({
            where: { id: existingPatient.id },
            data: {
              name: formData.name.trim(),
              dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : existingPatient.dateOfBirth,
              gender: formData.gender || existingPatient.gender,
              street: formData.street || existingPatient.street,
              city: formData.city || existingPatient.city,
              state: formData.state || existingPatient.state,
              zipCode: formData.zipCode || existingPatient.zipCode,
              emergencyContactName: formData.emergencyContactName || existingPatient.emergencyContactName,
              emergencyContactPhone: formData.emergencyContactPhone || existingPatient.emergencyContactPhone,
              emergencyContactRelationship: formData.emergencyContactRelationship || existingPatient.emergencyContactRelationship,
              consentToAlerts: formData.consentToAlerts !== undefined ? formData.consentToAlerts : existingPatient.consentToAlerts,
            }
          })
        } catch (updateError) {
          console.error('[PATIENT-FORM] Failed to update existing patient:', updateError)
        }
      } else {
        // Create new patient record for guest
        try {
          const newPatient = await prisma.patient.create({
            data: {
              name: formData.name.trim(),
              email: formData.email.trim().toLowerCase(),
              phone: formData.phone?.trim() || null,
              dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
              gender: formData.gender || null,
              street: formData.street || null,
              city: formData.city || null,
              state: formData.state || null,
              zipCode: formData.zipCode || null,
              emergencyContactName: formData.emergencyContactName || null,
              emergencyContactPhone: formData.emergencyContactPhone || null,
              emergencyContactRelationship: formData.emergencyContactRelationship || null,
              consentToAlerts: formData.consentToAlerts || false,
              medicalHistory: [],
              allergies: [],
              currentMedications: [],
              type: 'guest',
            },
          })
          
          patientId = newPatient.id
          console.log(`[PATIENT-FORM] Created new patient record: ${patientId}`)
        } catch (createError) {
          console.error('[PATIENT-FORM] Failed to create patient record:', createError)
        }
      }
    }
    
    const consultationMode = normalizeConsultationMode(formData.consultationMode)

    // Create form submission
    const submission = await prisma.patientFormSubmission.create({
      data: {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || null,
        dateOfBirth: new Date(formData.dateOfBirth),
        gender: formData.gender,
        street: formData.street?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        zipCode: formData.zipCode?.trim() || null,
        emergencyContactName: formData.emergencyContactName?.trim() || null,
        emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
        emergencyContactRelationship: formData.emergencyContactRelationship?.trim() || null,
        medicalHistory: formData.medicalHistory || [],
        allergies: formData.allergies || [],
        currentMedications: formData.currentMedications || [],
        insuranceProvider: formData.insuranceProvider?.trim() || null,
        insurancePolicyNumber: formData.insurancePolicyNumber?.trim() || null,
        insuranceGroupNumber: formData.insuranceGroupNumber?.trim() || null,
        status: 'pending',
        notes: buildNotesWithMode(formData.notes, consultationMode),
        patient: patientId ? {
          connect: { id: patientId }
        } : undefined
      },
      include: {
        patient: patientId ? {
          select: {
            id: true,
            name: true,
            email: true,
            type: true
          }
        } : false
      }
    })

    console.log(`[PATIENT-FORM] Form submission created: ${submission.id}${patientId ? ` (linked to patient: ${patientId})` : ' (no patient link)'}`)

    return NextResponse.json({
      success: true,
      data: {
        ...submission,
        consultationMode,
      },
      message: 'Form submitted successfully. Our staff will contact you soon to schedule your appointment.'
    }, { status: 201 })

  } catch (error: any) {
    console.error('[PATIENT-FORM] Unexpected error:', error)
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false,
          error: 'A submission with this information already exists' 
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred while submitting your form. Please try again.' 
      },
      { status: 500 }
    )
  }
}
