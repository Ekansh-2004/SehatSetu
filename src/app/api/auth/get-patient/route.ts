import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { DatabaseService } from '@/lib/db/services/databaseService'

export async function GET() {
  try {
    // Get the authenticated user from Clerk
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get existing patient record
    const patient = await DatabaseService.getPatientByClerkUserId(user.id)
    console.log('patient--------------------', patient)
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: patient
    })

  } catch (error) {
    console.error('Error fetching patient record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patient record' },
      { status: 500 }
    )
  }
} 