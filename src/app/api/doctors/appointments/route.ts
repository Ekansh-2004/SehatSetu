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
    console.log('user', user)

    const clerkId = user.id;
    const doctor = await DatabaseService.getDoctorByClerkUserId(clerkId);
    const doctorId = doctor?.id;

    // Get appointments for the doctor
    const appointments = await DatabaseService.getAppointments({ doctorId })
     console.log('appointments', appointments, doctorId)
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
    const mapped : AppointmentDisplay[] = appointmentsWithPatientInfo.map(
      (apt: AppointmentWithPatient) => ({
        id: apt.id,
        patientName:
          apt.patient?.name || apt.guestName || "Unknown Patient",
        time: `${apt.startTime || ""}`,
        date: apt.date ? new Date(apt.date).toLocaleDateString() : "",
        status: apt.status,
        duration: undefined, // Not available in Appointment type
        hasRecording: false, // Not available in Appointment type
        hasReport: false, // Not available in Appointment type
        hasAI: true, // Example, adjust as needed
        features: [
          "Real-time transcription",
          "AI suggested questions",
          "Medical summary",
        ],
        mode: apt.mode || "physical",
      })
    )
    console.log('mapped', mapped)
    const response: AppointmentsResponse = {
      success: true,
      data: mapped
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