import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

// Set timeout to 30 seconds to prevent data loss
export const maxDuration = 30

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

    // Check if user already has a staff record
    const existingStaff = await prisma.staff.findUnique({
      where: { clerkUserId: user.id }
    })

    if (existingStaff) {
      return NextResponse.json(
        { error: 'Staff record already exists' },
        { status: 409 }
      )
    }

    // Get user data from Clerk
    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || ''
    const primaryPhone = user.phoneNumbers?.[0]?.phoneNumber || ''
    
    // Create staff data
    const staffData = {
      clerkUserId: user.id,
      name: `${firstName} ${lastName}`.trim() || 'Staff Member',
      email: primaryEmail,
      phone: primaryPhone || null,
      role: 'staff',
      isActive: true
    }

    // Create the staff record
    const newStaff = await prisma.staff.create({
      data: staffData
    })
    
    console.log(`Created staff record for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: newStaff
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating staff record:', error)
    return NextResponse.json(
      { error: 'Failed to create staff record' },
      { status: 500 }
    )
  }
}

