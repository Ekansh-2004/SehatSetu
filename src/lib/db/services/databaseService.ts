import { PrismaService } from '../prismaService'

// Import types from prismaService
type CreateDoctorData = {
  clerkUserId?: string | null
  name: string
  email: string
  phone?: string
  specialty: string
  experience: number
  rating: number
  consultationFee: number
  location: string
  bio: string
  education: string[]
  languages: string[]
  image?: string | null
  isActive?: boolean
  defaultSessionDuration?: number
  maxPatientsPerDay?: number
  advanceBookingDays?: number
  slots?: Array<{
    timeRanges: string
    rrule: string
  }>
}

type UpdateDoctorData = Partial<CreateDoctorData>

type CreatePatientData = {
  clerkUserId: string
  name: string
  email: string
  phone: string
  dateOfBirth: Date
  gender: string
  street: string
  city: string
  state: string
  zipCode: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelationship: string
  medicalHistory: string[]
  allergies: string[]
  currentMedications: string[]
  insuranceProvider?: string | null
  insurancePolicyNumber?: string | null
  insuranceGroupNumber?: string | null
  isActive?: boolean
}

type UpdatePatientData = Partial<CreatePatientData>

type CreateAppointmentData = {
  patientId?: string | null
  doctorId: string
  date: Date
  startTime: string
  endTime: string
  status?: string
  type?: string
  reason: string
  notes?: string | null
  symptoms?: string[]
  diagnosis?: string | null
  prescription?: string | null
  followUpRequired?: boolean
  followUpDate?: Date | null
  paymentStatus?: string
  paymentAmount: number
  stripePaymentIntentId?: string | null
  stripeSessionId?: string | null
  reminderSent?: boolean
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  mode?: 'physical' | 'video'
}

export class DatabaseService {
  // Doctor operations
  static async getDoctors(): Promise<IDoctor[]> {
    return await PrismaService.getDoctors() as unknown as IDoctor[]
  }

  static async getDoctorById(id: string): Promise<IDoctor | null> {
    return await PrismaService.getDoctorById(id) as unknown as IDoctor | null
  }

  static async getDoctorByClerkUserId(clerkUserId: string): Promise<IDoctor | null> {
    return await PrismaService.getDoctorByClerkUserId(clerkUserId) as unknown as IDoctor | null
  }

  static async createDoctor(data: CreateDoctorData): Promise<IDoctor> {
    return await PrismaService.createDoctor(data) as unknown as IDoctor
  }

  static async updateDoctor(id: string, data: UpdateDoctorData): Promise<IDoctor> {
    return await PrismaService.updateDoctor(id, data) as unknown as IDoctor
  }

  static async deleteDoctor(id: string): Promise<IDoctor> {
    return await PrismaService.deleteDoctor(id) as unknown as IDoctor
  }

  // Patient operations
  static async getPatients(): Promise<Patient[]> {
    return await PrismaService.getPatients() as unknown as Patient[]
  }

  static async getPatientById(id: string): Promise<Patient | null> {
    return await PrismaService.getPatientById(id) as unknown as Patient | null
  }

  static async getPatientByClerkUserId(clerkUserId: string): Promise<Patient | null> {
    return await PrismaService.getPatientByClerkUserId(clerkUserId) as unknown as Patient | null
  }

  static async getPatientByNameEmailPhone(name: string, email: string, phone: string): Promise<Patient | null> {
    return await PrismaService.getPatientByNameEmailPhone(name, email, phone) as unknown as Patient | null
  }

  static async createPatient(data: CreatePatientData): Promise<Patient> {
    return await PrismaService.createPatient(data) as unknown as Patient
  }

  static async updatePatient(id: string, data: UpdatePatientData): Promise<Patient> {
    return await PrismaService.updatePatient(id, data) as unknown as Patient
  }

  static async deletePatient(id: string): Promise<Patient> {
    return await PrismaService.deletePatient(id) as unknown as Patient
  }

  // Appointment operations
  static async getAppointments(filters?: {
    patientId?: string
    doctorId?: string
    status?: string
    date?: Date
  }): Promise<IAppointment[]> {
    return await PrismaService.getAppointments(filters) as unknown as IAppointment[]
  }

  static async getAppointmentById(id: string): Promise<IAppointment | null> {
    return await PrismaService.getAppointmentById(id) as unknown as IAppointment | null
  }

  static async createAppointment(data: CreateAppointmentData): Promise<IAppointment> {
    return await PrismaService.createAppointment(data) as unknown as IAppointment
  }

  static async updateAppointment(id: string, data: Partial<IAppointment>): Promise<IAppointment> {
    return await PrismaService.updateAppointment(id, data) as unknown as IAppointment
  }

  static async deleteAppointment(id: string): Promise<IAppointment> {
    return await PrismaService.deleteAppointment(id) as unknown as IAppointment
  }

  // Utility methods
  static async getDoctorsBySpecialty(specialty: string): Promise<IDoctor[]> {
    return await PrismaService.getDoctorsBySpecialty(specialty) as unknown as IDoctor[]
  }

  static async getAppointmentsByDateRange(startDate: Date, endDate: Date, doctorId?: string): Promise<IAppointment[]> {
    return await PrismaService.getAppointmentsByDateRange(startDate, endDate, doctorId) as unknown as IAppointment[]
  }
} 