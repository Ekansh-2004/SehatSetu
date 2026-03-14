import { NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

type PrismaLikeError = {
  code?: string
  message?: string
}

async function ensureDoctorLocationColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "doctors"
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "clinicAddress" TEXT,
    ADD COLUMN IF NOT EXISTS "address" TEXT
  `)
}

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

    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    const primaryEmail = user.emailAddresses?.[0]?.emailAddress || `${user.id}@sehatsetu.local`
    const primaryPhone = user.phoneNumbers?.[0]?.phoneNumber || '+1 (555) 000-0000'

    // Keep runtime resilient when migration is not yet applied in current DB.
    try {
      await ensureDoctorLocationColumns()
    } catch {
      // Continue; non-Postgres/test envs may reject this statement.
    }

    const findDoctorByClerkId = () =>
      prisma.doctor.findUnique({
        where: { clerkUserId: user.id },
        include: { doctorSlots: true },
      })

    // 1) Direct lookup by Clerk ID.
    let doctor = await findDoctorByClerkId()

    // If schema drift exists in DB, add missing columns and retry once.
    if (!doctor) {
      try {
        await ensureDoctorLocationColumns()
      } catch {
        // Ignore DDL failures; normal flow will still attempt email linkage/create.
      }
      doctor = await findDoctorByClerkId()
    }

    // 2) If not linked yet, try to find by email and link the Clerk ID.
    if (!doctor) {
      const existingByEmail = await prisma.doctor.findUnique({
        where: { email: primaryEmail },
      })

      if (existingByEmail) {
        doctor = await prisma.doctor.update({
          where: { id: existingByEmail.id },
          data: { clerkUserId: user.id, updatedAt: new Date() },
          include: { doctorSlots: true },
        })
      }
    }

    // 3) Still missing: create a new doctor profile.
    if (!doctor) {
      try {
        doctor = await prisma.doctor.create({
          data: {
            clerkUserId: user.id,
            name: `Dr. ${firstName} ${lastName}`.trim() || 'Dr. Unknown',
            email: primaryEmail,
            phone: primaryPhone,
            specialty: 'General Medicine',
            experience: 0,
            rating: 0,
            consultationFee: 100,
            location: 'Clinic Location TBD',
            bio: 'Professional healthcare provider',
            education: ['Medical Degree'],
            languages: ['English'],
            isActive: true,
          },
          include: { doctorSlots: true },
        })
      } catch (error) {
        // Handle race/duplicate creates and recover by re-querying.
        const prismaError = error as PrismaLikeError
        if (prismaError?.code === 'P2002') {
          doctor = await prisma.doctor.findFirst({
            where: {
              OR: [{ clerkUserId: user.id }, { email: primaryEmail }],
            },
            include: { doctorSlots: true },
          })

          if (doctor && doctor.clerkUserId !== user.id) {
            doctor = await prisma.doctor.update({
              where: { id: doctor.id },
              data: { clerkUserId: user.id, updatedAt: new Date() },
              include: { doctorSlots: true },
            })
          }
        } else {
          throw error
        }
      }
    }

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor record could not be provisioned' },
        { status: 500 }
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