import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { DatabaseService } from '@/lib/db/services/databaseService'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a patient record
    const existingPatient = await DatabaseService.getPatientByClerkUserId(user.id)
    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient record already exists' },
        { status: 409 }
      )
    }

    // Get form data from request body
    const formData = await request.json()

    // Create patient data with form data and defaults
    const patientData = {
      clerkUserId: user.id,
      name: formData.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      email: formData.email || user.emailAddresses?.[0]?.emailAddress || '',
      phone: formData.phone || user.phoneNumbers?.[0]?.phoneNumber || '+1 (555) 000-0000',
      dateOfBirth: new Date(formData.dateOfBirth || '1990-01-01'),
      gender: formData.gender || 'other',
      street: formData.address?.street || 'Address to be updated',
      city: formData.address?.city || 'City to be updated',
      state: formData.address?.state || 'State to be updated',
      zipCode: formData.address?.zipCode || '00000',
      emergencyContactName: formData.emergencyContact?.name || 'Emergency Contact to be updated',
      emergencyContactPhone: formData.emergencyContact?.phone || '+1 (555) 000-0000',
      emergencyContactRelationship: formData.emergencyContact?.relationship || 'Family',
      medicalHistory: formData.medicalHistory ? formData.medicalHistory.split(',').map((item: string) => item.trim()) : [],
      allergies: formData.allergies ? formData.allergies.split(',').map((item: string) => item.trim()) : [],
      currentMedications: formData.currentMedications ? formData.currentMedications.split(',').map((item: string) => item.trim()) : [],
      insuranceProvider: formData.insuranceInfo?.provider || 'Insurance to be updated',
      insurancePolicyNumber: formData.insuranceInfo?.policyNumber || 'POL000000',
      insuranceGroupNumber: formData.insuranceInfo?.groupNumber || 'GRP000',
      isActive: true
    }

    // Create the patient record in MongoDB
    const newPatient = await DatabaseService.createPatient(patientData)
    
    console.log(`Created patient record for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: newPatient
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating patient record:', error)
    return NextResponse.json(
      { error: 'Failed to create patient record' },
      { status: 500 }
    )
  }
} 