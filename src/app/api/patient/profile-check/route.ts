import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

/**
 * Check if authenticated user has a patient profile
 * Returns patient data if exists, or Clerk data for profile creation
 */
export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      console.log('[PROFILE-CHECK] Unauthorized - No user session')
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Please sign in to continue' 
        },
        { status: 401 }
      )
    }

    console.log(`[PROFILE-CHECK] Checking profile for user: ${user.id}`)

    // Check if patient record exists
    const patient = await prisma.patient.findUnique({
      where: { clerkUserId: user.id },
      select: {
        id: true,
        clerkUserId: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        gender: true,
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
        isActive: true,
        type: true,
        createdAt: true
      }
    })

    if (!patient) {
      console.log(`[PROFILE-CHECK] No patient record found for user: ${user.id}`)
      
      return NextResponse.json({
        success: true,
        exists: false,
        requiresProfileCreation: true,
        clerkUserId: user.id,
        clerkData: {
          email: user.emailAddresses[0]?.emailAddress || '',
          phone: user.phoneNumbers[0]?.phoneNumber || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || ''
        }
      })
    }

    // Patient exists - check if active
    if (!patient.isActive) {
      console.warn(`[PROFILE-CHECK] Patient record is inactive: ${patient.id}`)
      return NextResponse.json({
        success: false,
        error: 'Your patient profile is inactive. Please contact support.'
      }, { status: 403 })
    }

    console.log(`[PROFILE-CHECK] Patient record found: ${patient.id}`)

    return NextResponse.json({
      success: true,
      exists: true,
      requiresProfileCreation: false,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactPhone: patient.emergencyContactPhone,
        emergencyContactRelationship: patient.emergencyContactRelationship,
        medicalHistory: patient.medicalHistory,
        allergies: patient.allergies,
        currentMedications: patient.currentMedications,
        insuranceProvider: patient.insuranceProvider,
        insurancePolicyNumber: patient.insurancePolicyNumber,
        insuranceGroupNumber: patient.insuranceGroupNumber,
        type: patient.type
      }
    })
  } catch (error) {
    console.error('[PROFILE-CHECK] Unexpected error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred while checking your profile' 
      },
      { status: 500 }
    )
  }
}


