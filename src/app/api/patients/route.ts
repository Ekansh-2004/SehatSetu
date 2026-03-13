import { NextResponse } from 'next/server'
import { DatabaseService } from '@/lib/db/services/databaseService'

export async function GET() {
  try {
    const patients = await DatabaseService.getPatients()
    return NextResponse.json({ success: true, data: patients })
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
} 