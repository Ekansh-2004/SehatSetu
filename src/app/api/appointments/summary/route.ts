import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { appointmentId, summary } = body

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      )
    }

    if (!summary) {
      return NextResponse.json(
        { error: 'Summary is required' },
        { status: 400 }
      )
    }


    return NextResponse.json({
      success: true,
      message: 'Summary processed successfully',
      data: {
        appointmentId,
        summary
      }
    })

  } catch (error) {
    console.error('Error saving appointment summary:', error)
    return NextResponse.json(
      { error: 'Failed to save summary' },
      { status: 500 }
    )
  }
}
