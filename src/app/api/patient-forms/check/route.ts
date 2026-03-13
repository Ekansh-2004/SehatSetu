import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

// Set timeout to 30 seconds to prevent data loss
export const maxDuration = 30

// Check if patient has submitted form
export async function GET() {
  try {
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if patient has submitted a form
    const submission = await prisma.patientFormSubmission.findFirst({
      where: {
        email: user.primaryEmailAddress?.emailAddress || ''
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: submission
    })

  } catch (error) {
    console.error('Error checking patient form:', error)
    return NextResponse.json(
      { error: 'Failed to check form status' },
      { status: 500 }
    )
  }
}

