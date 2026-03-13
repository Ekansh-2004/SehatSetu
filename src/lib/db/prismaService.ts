import prisma from './prisma'
import { RRule } from 'rrule'

// Type definitions for function parameters
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

type UpdateAppointmentData = Partial<CreateAppointmentData>

export class PrismaService {
  // Helper function to parse RRULE and reconstruct expected interface
  static parseSlotFromRRule(slot: { id: string; timeRanges: string; rrule: string; startDate?: string }) {
    // Parse timeRanges from JSON string to array
    let parsedTimeRanges = []
    if (typeof slot.timeRanges === 'string') {
      try {
        parsedTimeRanges = JSON.parse(slot.timeRanges)
      } catch (error) {
        console.error('Error parsing timeRanges in parseSlotFromRRule:', error)
        parsedTimeRanges = []
      }
    } else {
      parsedTimeRanges = slot.timeRanges || []
    }

    try {
      if (!slot.rrule) {
        // Fallback for slots without RRULE
        return {
          id: slot.id,
          startDate: slot.startDate ?? new Date().toISOString().split('T')[0], // Today as fallback
          daysOfWeek: [],
          isRecurring: false,
          frequency: 'weekly' as const,
          timeRanges: parsedTimeRanges,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }

      // Parse RRULE
      const rrule = RRule.fromString(slot.rrule)
      const options = rrule.origOptions
      console.log('parseSlotFromRRule - options:', options)

      // Extract start date from DTSTART
      const dtstartMatch = slot.rrule.match(/DTSTART[^:]*:([^\r\n]+)/)
      let startDate = new Date().toISOString().split('T')[0] // Default to today
      if (dtstartMatch) {
        const startDateStr = dtstartMatch[1]
        // Parse YYYYMMDDTHHMMSS format
        const year = startDateStr.substring(0, 4)
        const month = startDateStr.substring(4, 6)
        const day = startDateStr.substring(6, 8)
        startDate = `${year}-${month}-${day}`
      }

      // Extract days of week from RRULE
      const daysOfWeek: number[] = []
      if (options.byweekday) {
        const weekdays = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU]
        const byweekdayArray = Array.isArray(options.byweekday) ? options.byweekday : [options.byweekday]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        byweekdayArray.forEach((day: any) => {
          const index = weekdays.indexOf(day)
          if (index !== -1) {
            daysOfWeek.push(index + 1) // Convert to 1-7 format
          }
        })
      }

      // Determine frequency
      let frequency: 'weekly' | 'monthly' = 'weekly'
      if (options.freq === RRule.MONTHLY) {
        frequency = 'monthly'
      }

      // Extract end date from UNTIL
      let repeatUntil: string | undefined
      if (options.until) {
        repeatUntil = options.until.toISOString().split('T')[0]
      }

      return {
        id: slot.id,
        startDate,
        daysOfWeek,
        isRecurring: startDate !== repeatUntil,
        frequency,
        repeatUntil,
        timeRanges: parsedTimeRanges,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    } catch (error) {
      console.error('Error parsing RRULE for slot:', slot.id, error)
      // Fallback for parsing errors
      return {
        id: slot.id,
        startDate: new Date().toISOString().split('T')[0],
        daysOfWeek: [],
        isRecurring: false,
        frequency: 'weekly' as const,
        timeRanges: parsedTimeRanges,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  }

  // Doctor operations
  static async getDoctors() {
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      include: {
        doctorSlots: true
      }
    })
    
    return doctors.map((doc) => ({
      ...doc,
      id: doc.id,
      slots: doc.doctorSlots.map((slot) => this.parseSlotFromRRule(slot))
    }))
  }

  static async getDoctorById(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        doctorSlots: true
      }
    })
    
    if (!doctor) return null
    
    return {
      ...doctor,
      slots: doctor.doctorSlots.map(slot => this.parseSlotFromRRule(slot))
    }
  }

  static async getDoctorByClerkUserId(clerkUserId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { clerkUserId },
      include: {
        doctorSlots: true
      }
    })
    
    if (!doctor) return null
    
    return {
      ...doctor,
      slots: doctor.doctorSlots.map(slot => this.parseSlotFromRRule(slot))
    }
  }

  static async createDoctor(data: CreateDoctorData) {
    const { slots, ...doctorData } = data
    
    const doctor = await prisma.doctor.create({
      data: {
        ...doctorData,
        education: doctorData.education || [],
        languages: doctorData.languages || []
      },
      include: {
        doctorSlots: true
      }
    })
    
    // Create slots if provided
    if (slots && slots.length > 0) {
      await prisma.doctorSlot.createMany({
        data: slots.map((slot) => ({
          doctorId: doctor.id,
          timeRanges: slot.timeRanges,
          rrule: slot.rrule
        }))
      })
    }
    
    return doctor
  }

  static async updateDoctor(id: string, data: UpdateDoctorData) {
    const { slots, ...doctorData } = data as UpdateDoctorData & { slots?: Array<{ timeRanges: string; rrule: string }> }
    
    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...doctorData,
        education: doctorData.education || [],
        languages: doctorData.languages || []
      },
      include: {
        doctorSlots: true
      }
    })
    
    // Update slots if provided
    if (slots) {
      // Delete existing slots
      await prisma.doctorSlot.deleteMany({
        where: { doctorId: id }
      })
      
      // Create new slots
      if (slots.length > 0) {
        await prisma.doctorSlot.createMany({
          data: slots.map((slot: { timeRanges: string; rrule: string }) => ({
            doctorId: id,
            timeRanges: slot.timeRanges,
            rrule: slot.rrule
          }))
        })
      }
    }
    
    return doctor
  }

  static async deleteDoctor(id: string) {
    return await prisma.doctor.update({
      where: { id },
      data: { isActive: false }
    })
  }

  // Patient operations
  static async getPatients() {
    const patients = await prisma.patient.findMany({
      where: { isActive: true }
    })
    
    return patients.map(patient => ({
      ...patient,
      address: {
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode
      },
      emergencyContact: {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relationship: patient.emergencyContactRelationship
      },
      insuranceInfo: patient.insuranceProvider ? {
        provider: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNumber || '',
        groupNumber: patient.insuranceGroupNumber || ''
      } : undefined,
      medicalHistory: patient.medicalHistory as string[],
      allergies: patient.allergies as string[],
      currentMedications: patient.currentMedications as string[]
    }))
  }

  static async getPatientById(id: string) {
    const patient = await prisma.patient.findUnique({
      where: { id }
    })
    
    if (!patient) return null
    
    return {
      ...patient,
      address: {
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode
      },
      emergencyContact: {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relationship: patient.emergencyContactRelationship
      },
      insuranceInfo: patient.insuranceProvider ? {
        provider: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNumber || '',
        groupNumber: patient.insuranceGroupNumber || ''
      } : undefined,
      medicalHistory: patient.medicalHistory as string[],
      allergies: patient.allergies as string[],
      currentMedications: patient.currentMedications as string[]
    }
  }

  static async getPatientByClerkUserId(clerkUserId: string) {
    const patient = await prisma.patient.findUnique({
      where: { clerkUserId }
    })
    
    if (!patient) return null
    
    return {
      ...patient,
      address: {
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode
      },
      emergencyContact: {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relationship: patient.emergencyContactRelationship
      },
      insuranceInfo: patient.insuranceProvider ? {
        provider: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNumber || '',
        groupNumber: patient.insuranceGroupNumber || ''
      } : undefined,
      medicalHistory: patient.medicalHistory as string[],
      allergies: patient.allergies as string[],
      currentMedications: patient.currentMedications as string[]
    }
  }

  static async getPatientByNameEmailPhone(name: string, email: string, phone: string) {
    const patient = await prisma.patient.findFirst({
      where: { 
        name: name,
        email: email,
        phone: phone
      }
    })

    if (!patient) return null

    return {
      ...patient,
      address: {
        street: patient.street,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode
      },
      emergencyContact: {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relationship: patient.emergencyContactRelationship
      },
      insuranceInfo: patient.insuranceProvider ? {
        provider: patient.insuranceProvider,
        policyNumber: patient.insurancePolicyNumber || '',
        groupNumber: patient.insuranceGroupNumber || ''
      } : undefined,
      medicalHistory: patient.medicalHistory as string[],
      allergies: patient.allergies as string[],
      currentMedications: patient.currentMedications as string[]
    }
  }
  
  static async createPatient(data: CreatePatientData) {
    const { address, emergencyContact, insuranceInfo, ...patientData } = data as CreatePatientData & {
      address?: { street: string; city: string; state: string; zipCode: string };
      emergencyContact?: { name: string; phone: string; relationship: string };
      insuranceInfo?: { provider: string; policyNumber?: string; groupNumber?: string };
    }
    
    return await prisma.patient.create({
      data: {
        ...patientData,
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.zipCode || '',
        emergencyContactName: emergencyContact?.name || '',
        emergencyContactPhone: emergencyContact?.phone || '',
        emergencyContactRelationship: emergencyContact?.relationship || '',
        insuranceProvider: insuranceInfo?.provider,
        insurancePolicyNumber: insuranceInfo?.policyNumber,
        insuranceGroupNumber: insuranceInfo?.groupNumber,
        medicalHistory: patientData.medicalHistory || [],
        allergies: patientData.allergies || [],
        currentMedications: patientData.currentMedications || []
      }
    })
  }

  static async updatePatient(id: string, data: UpdatePatientData) {
    const { address, emergencyContact, insuranceInfo, ...patientData } = data as UpdatePatientData & {
      address?: { street: string; city: string; state: string; zipCode: string };
      emergencyContact?: { name: string; phone: string; relationship: string };
      insuranceInfo?: { provider: string; policyNumber?: string; groupNumber?: string };
    }
    
    return await prisma.patient.update({
      where: { id },
      data: {
        ...patientData,
        street: address?.street || patientData.street,
        city: address?.city || patientData.city,
        state: address?.state || patientData.state,
        zipCode: address?.zipCode || patientData.zipCode,
        emergencyContactName: emergencyContact?.name || patientData.emergencyContactName,
        emergencyContactPhone: emergencyContact?.phone || patientData.emergencyContactPhone,
        emergencyContactRelationship: emergencyContact?.relationship || patientData.emergencyContactRelationship,
        insuranceProvider: insuranceInfo?.provider || patientData.insuranceProvider,
        insurancePolicyNumber: insuranceInfo?.policyNumber || patientData.insurancePolicyNumber,
        insuranceGroupNumber: insuranceInfo?.groupNumber || patientData.insuranceGroupNumber,
        medicalHistory: patientData.medicalHistory || [],
        allergies: patientData.allergies || [],
        currentMedications: patientData.currentMedications || []
      }
    })
  }

  static async deletePatient(id: string) {
    return await prisma.patient.update({
      where: { id },
      data: { isActive: false }
    })
  }

  // Appointment operations
  static async getAppointments(filters?: {
    patientId?: string
    doctorId?: string
    status?: string
    date?: Date
  }) {
    const where: { patientId?: string; doctorId?: string; status?: string; date?: { gte: Date; lt: Date } } = {}
    
    if (filters?.patientId) where.patientId = filters.patientId
    if (filters?.doctorId) where.doctorId = filters.doctorId
    if (filters?.status) where.status = filters.status
    if (filters?.date) {
      where.date = {
        gte: new Date(filters.date.setHours(0, 0, 0, 0)),
        lt: new Date(filters.date.setHours(23, 59, 59, 999))
      }
    }
    
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        doctor: true
      },
      orderBy: { date: 'asc' }
    })
    
    return appointments.map(appointment => ({
      ...appointment,
      symptoms: appointment.symptoms as string[]
    }))
  }

  static async getAppointmentById(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true
      }
    })
    
    if (!appointment) return null
    
    return {
      ...appointment,
      symptoms: appointment.symptoms as string[]
    }
  }

  static async createAppointment(data: CreateAppointmentData) {
    return await prisma.appointment.create({
      data: {
        ...data,
        symptoms: data.symptoms || []
      },
      include: {
        patient: true,
        doctor: true
      }
    })
  }

  static async updateAppointment(id: string, data: UpdateAppointmentData) {
    return await prisma.appointment.update({
      where: { id },
      data: {
        ...data,
        symptoms: data.symptoms || []
      },
      include: {
        patient: true,
        doctor: true
      }
    })
  }

  static async deleteAppointment(id: string) {
    return await prisma.appointment.delete({
      where: { id }
    })
  }

  // Utility methods
  static async getDoctorsBySpecialty(specialty: string) {
    const doctors = await prisma.doctor.findMany({
      where: { 
        specialty: { contains: specialty },
        isActive: true 
      },
      include: {
        doctorSlots: true
      }
    })
    
    return doctors.map(doc => ({
      ...doc,
      slots: doc.doctorSlots.map(slot => this.parseSlotFromRRule(slot))
    }))
  }

  static async getAppointmentsByDateRange(startDate: Date, endDate: Date, doctorId?: string) {
    const where: { date: { gte: Date; lte: Date }; doctorId?: string } = {
      date: {
        gte: startDate,
        lte: endDate
      }
    }
    
    if (doctorId) where.doctorId = doctorId
    
    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        doctor: true
      },
      orderBy: { date: 'asc' }
    })
    
    return appointments.map(appointment => ({
      ...appointment,
      symptoms: appointment.symptoms as string[]
    }))
  }
} 