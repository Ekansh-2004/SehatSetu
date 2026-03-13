import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { DatabaseService } from '@/lib/db/services/databaseService'


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the authenticated user from Clerk
    const user = await currentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: doctorId } = await params

    // Get appointments for the doctor
    const appointments = await DatabaseService.getAppointments({ doctorId })
    // console.log('appointments', appointments)
    // Populate patient information for each appointment
    const appointmentsWithPatientInfo = await Promise.all(
      appointments.map(async (appointment: IAppointment) => {
        // Check if patientId exists before trying to fetch
        let patient = null
        if (appointment.patientId) {
          try {
            patient = await DatabaseService.getPatientById(appointment.patientId)
          } catch (error) {
            console.warn(`Failed to fetch patient ${appointment.patientId}:`, error)
          }
        }
        
        return {
          ...appointment,
          patient: patient ? {
            name: patient.name,
            email: patient.email,
            phone: patient.phone
          } : {
            name: appointment.guestName ?? 'Unknown Patient',
            email: appointment.guestEmail ?? 'N/A',
            phone: appointment.guestPhone ?? 'N/A'
          }
        }
      })
    )
    console.log('appointmentsWithPatientInfo', appointmentsWithPatientInfo)
    const response: AppointmentsResponse = {
      success: true,
      data: appointmentsWithPatientInfo
    };
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching doctor appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
} 