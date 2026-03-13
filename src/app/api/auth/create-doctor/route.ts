import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { DatabaseService } from '@/lib/db/services/databaseService'

export async function POST() {
  try {
    // Get the authenticated user from Clerk
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has a doctor record
    const existingDoctor = await DatabaseService.getDoctorByClerkUserId(user.id)
    if (existingDoctor) {
      return NextResponse.json(
        { error: 'Doctor record already exists' },
        { status: 409 }
      )
    }

    // Get user data from Clerk
    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
    console.log('user', JSON.stringify(user, null, 2))
    
    // Extract phone number from Clerk user data
    const primaryPhone = user.phoneNumbers?.[0]?.phoneNumber || ''
    
    // Create doctor data with default values (no slots - doctor must configure availability)
    const doctorData = {
      clerkUserId: user.id,
      name: `Dr. ${firstName} ${lastName}`.trim() || 'Dr. Unknown',
      email: primaryEmail,
      phone: primaryPhone || '+1 (555) 000-0000', // Use Clerk phone or default
      specialty: 'General Medicine', // Default, will be updated later
      experience: 0, // Will be updated later
      rating: 0,
      consultationFee: 100, // Default fee, will be updated later
      location: 'Clinic Location TBD', // Will be updated later
      bio: 'Professional healthcare provider', // Will be updated later
      education: ['Medical Degree'], // Will be updated later
      languages: ['English'], // Default
      // No slots - doctor must configure availability settings
      isActive: true
    }

    // Create the doctor record in MySQL database
    const newDoctor = await DatabaseService.createDoctor(doctorData)
    
    console.log(`Created doctor record for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: newDoctor
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating doctor record:', error)
    return NextResponse.json(
      { error: 'Failed to create doctor record' },
      { status: 500 }
    )
  }
} 