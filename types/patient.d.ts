// Patient related types

interface Patient {
  id: string
  clerkUserId: string
  name: string
  email: string
  phone: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  medicalHistory: string[]
  allergies: string[]
  currentMedications: string[]
  insuranceInfo?: {
    provider: string
    policyNumber: string
    groupNumber: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// API response types
type PatientsResponse = ApiResponse<Patient[]>; 