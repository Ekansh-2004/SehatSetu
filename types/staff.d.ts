// Staff related types

interface Staff {
  id: string
  clerkUserId: string | null
  email: string
  name: string
  phone?: string | null
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface PatientFormSubmission {
  id: string
  patientId: string | null
  staffId: string | null
  name: string
  email: string
  phone: string
  dateOfBirth: Date
  gender: string
  street?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  emergencyContactRelationship?: string | null
  medicalHistory: string[]
  allergies: string[]
  currentMedications: string[]
  insuranceProvider?: string | null
  insurancePolicyNumber?: string | null
  insuranceGroupNumber?: string | null
  status: 'pending' | 'reviewed' | 'slots_sent' | 'slots_confirmed' | 'appointment_booked'
  notes?: string | null
  appointmentId?: string | null
  createdAt: Date
  updatedAt: Date
  patient?: Patient
  staff?: Staff
}

interface SlotOption {
  date: string
  startTime: string
  endTime: string
}

interface SlotOffer {
  id: string
  patientFormId: string
  doctorId: string
  doctorName: string
  slots: SlotOption[]
  status: 'pending' | 'confirmed' | 'expired' | 'booked'
  patientConfirmedSlot: SlotOption | null
  messageId?: string | null
  sentAt: Date
  confirmedAt: Date | null
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  doctor?: {
    id: string
    name: string
    specialty: string
    image?: string
  }
}

// API response types
type StaffResponse = ApiResponse<Staff>
type PatientFormSubmissionsResponse = ApiResponse<PatientFormSubmission[]>
type PatientFormSubmissionResponse = ApiResponse<PatientFormSubmission>

