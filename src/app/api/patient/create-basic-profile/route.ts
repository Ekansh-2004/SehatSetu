import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

// Validation helper
const validateBasicProfileData = (data: any): { valid: boolean; errors: string[] } => {
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

  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Valid phone number is required')
  } else {
    const phoneDigits = data.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      errors.push('Phone number must be 10-15 digits')
    }
  }

  if (!data.dateOfBirth) {
    errors.push('Date of birth is required')
  } else {
    const dob = new Date(data.dateOfBirth)
    if (isNaN(dob.getTime())) {
      errors.push('Invalid date of birth')
    } else {
      const age = (new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      if (age < 0 || age > 150) {
        errors.push('Invalid date of birth - must be between 0 and 150 years old')
      }
    }
  }

  if (!data.gender || !['male', 'female', 'other'].includes(data.gender)) {
    errors.push('Gender must be one of: male, female, other')
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Create basic patient profile for authenticated user
 * This is step 1 of patient onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    
    if (!user) {
      console.log('[BASIC-PROFILE] Unauthorized - No user session')
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Please sign in to continue' 
        },
        { status: 401 }
      )
    }

    console.log(`[BASIC-PROFILE] Creating profile for user: ${user.id}`)

    // Parse and validate request body
    let basicData: any
    try {
      basicData = await request.json()
    } catch (parseError) {
      console.error('[BASIC-PROFILE] Invalid JSON in request body')
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body - must be valid JSON' 
        },
        { status: 400 }
      )
    }

    // Validate input data
    const validation = validateBasicProfileData(basicData)
    if (!validation.valid) {
      console.warn('[BASIC-PROFILE] Validation failed:', validation.errors)
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed',
          details: validation.errors 
        },
        { status: 400 }
      )
    }

    // Check if patient already exists (prevent duplicates)
    const existingPatient = await prisma.patient.findUnique({
      where: { clerkUserId: user.id }
    })

    if (existingPatient) {
      console.log(`[BASIC-PROFILE] Patient already exists: ${existingPatient.id}`)
      return NextResponse.json(
        { 
          success: false,
          error: 'Patient profile already exists',
          patient: {
            id: existingPatient.id,
            name: existingPatient.name,
            email: existingPatient.email
          }
        },
        { status: 409 }
      )
    }

    // Use transaction to ensure data consistency
    const patient = await prisma.$transaction(async (tx) => {
      // Double-check within transaction (handle race conditions)
      const doubleCheck = await tx.patient.findUnique({
        where: { clerkUserId: user.id }
      })

      if (doubleCheck) {
        throw new Error('PATIENT_ALREADY_EXISTS')
      }

      // Create patient with validated basic data
      return await tx.patient.create({
        data: {
          clerkUserId: user.id,
          name: basicData.name.trim(),
          email: basicData.email.trim().toLowerCase(),
          phone: basicData.phone.trim(),
          dateOfBirth: new Date(basicData.dateOfBirth),
          gender: basicData.gender,
          // Default values for extended fields (filled in detailed form)
          street: 'Not provided',
          city: 'Not provided',
          state: 'Not provided',
          zipCode: '00000',
          emergencyContactName: 'Not provided',
          emergencyContactPhone: '',
          emergencyContactRelationship: 'Not provided',
          medicalHistory: [],
          allergies: [],
          currentMedications: [],
          insuranceProvider: null,
          insurancePolicyNumber: null,
          insuranceGroupNumber: null,
          isActive: true,
          type: 'verified'
        },
        select: {
          id: true,
          clerkUserId: true,
          name: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          gender: true,
          type: true,
          createdAt: true
        }
      })
    })

    console.log(`[BASIC-PROFILE] Patient created successfully: ${patient.id}`)

    return NextResponse.json({
      success: true,
      message: 'Basic profile created successfully',
      patient
    }, { status: 201 })

  } catch (error: any) {
    // Handle specific errors
    if (error.message === 'PATIENT_ALREADY_EXISTS') {
      console.warn('[BASIC-PROFILE] Race condition - patient created by concurrent request')
      return NextResponse.json(
        { 
          success: false,
          error: 'Patient profile already exists. Please refresh and try again.' 
        },
        { status: 409 }
      )
    }

    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      console.error('[BASIC-PROFILE] Unique constraint violation:', error.meta)
      return NextResponse.json(
        { 
          success: false,
          error: 'A patient with this information already exists' 
        },
        { status: 409 }
      )
    }

    console.error('[BASIC-PROFILE] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred while creating your profile' 
      },
      { status: 500 }
    )
  }
}


