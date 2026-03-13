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

    // Get existing doctor record
    const doctor = await DatabaseService.getDoctorByClerkUserId(user.id)
    
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: doctor
    })

  } catch (error) {
    console.error('Error fetching doctor record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor record' },
      { status: 500 }
    )
  }
} 