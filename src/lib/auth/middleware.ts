import { currentUser } from '@clerk/nextjs/server'
import { DatabaseService } from '@/lib/db/services/databaseService'
// Global types are now available without imports

export interface AuthenticatedUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'doctor' | 'patient' | 'staff' | null
  doctorRecord?: IDoctor
  patientRecord?: Patient
  staffRecord?: Staff
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const user = await currentUser()
    if (!user) return null

    const role = user.unsafeMetadata?.role as 'doctor' | 'patient' | 'staff' | null
    
    let doctorRecord: IDoctor | undefined = undefined
    let patientRecord: Patient | undefined = undefined
    let staffRecord: Staff | undefined = undefined

    if (role === 'doctor') {
      const doctor = await DatabaseService.getDoctorByClerkUserId(user.id)
      doctorRecord = doctor || undefined
    } else if (role === 'patient') {
      const patient = await DatabaseService.getPatientByClerkUserId(user.id)
      patientRecord = patient || undefined
    } else if (role === 'staff') {
      // Staff record will be created on first access via create-staff API
      staffRecord = undefined
    }

    return {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined,
      role,
      doctorRecord,
      patientRecord,
      staffRecord
    }
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(requiredRole: 'doctor' | 'patient' | 'staff'): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  if (user.role !== requiredRole) {
    throw new Error(`Access denied. Required role: ${requiredRole}`)
  }
  return user
}

export async function requireDoctor(): Promise<AuthenticatedUser> {
  return requireRole('doctor')
}

export async function requirePatient(): Promise<AuthenticatedUser> {
  return requireRole('patient')
}

export async function requireStaff(): Promise<AuthenticatedUser> {
  return requireRole('staff')
} 