// Mock Doctors Database
export const mockDoctors: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Smith',
    email: 'sarah.smith@clinic.com',
    phone: '+1 (555) 123-4567',
    specialty: 'General Medicine',
    experience: 15,
    rating: 4.8,
    consultationFee: 150,
    location: 'Medical Center A - Room 101',
    bio: 'Dr. Sarah Smith is a board-certified family medicine physician with over 15 years of experience. She specializes in preventive care, chronic disease management, and women\'s health.',
    education: [
      'MD - Harvard Medical School',
      'Residency - Massachusetts General Hospital',
      'Board Certified - American Board of Family Medicine'
    ],
    languages: ['English', 'Spanish'],
    slots: [
      { 
        id: 'slot-1',
        startDate: '2024-01-01',
        daysOfWeek: [1, 2, 3, 4, 5],
        isRecurring: true,
        frequency: 'weekly',
        timeRanges: [{ startTime: '09:00', endTime: '17:00' }],
        timeZone: 'UTC'
      }
    ],
    defaultSessionDuration: 30,
    maxPatientsPerDay: 20,
    advanceBookingDays: 30,
    isActive: true,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2025-06-20')
  },
  {
    id: 'doc-2',
    name: 'Dr. Michael Johnson',
    email: 'michael.johnson@heartclinic.com',
    phone: '+1 (555) 234-5678',
    specialty: 'Cardiology',
    experience: 12,
    rating: 4.9,
    consultationFee: 250,
    location: 'Heart Clinic - Suite 205',
    bio: 'Dr. Michael Johnson is a renowned cardiologist specializing in interventional cardiology and heart disease prevention. He has performed over 2,000 cardiac procedures.',
    education: [
      'MD - Johns Hopkins School of Medicine',
      'Cardiology Fellowship - Cleveland Clinic',
      'Board Certified - American Board of Internal Medicine'
    ],
    languages: ['English', 'French'],
    slots: [
      { 
        id: 'slot-2',
        startDate: '2024-01-01',
        daysOfWeek: [1, 2, 3, 4, 5],
        isRecurring: true,
        frequency: 'weekly',
        timeRanges: [{ startTime: '08:00', endTime: '16:00' }],
        timeZone: 'UTC'
      }
    ],
    defaultSessionDuration: 45,
    maxPatientsPerDay: 15,
    advanceBookingDays: 30,
    isActive: true,
    createdAt: new Date('2023-02-10'),
    updatedAt: new Date('2025-06-20')
  },
  {
    id: 'doc-3',
    name: 'Dr. Emma Wilson',
    email: 'emma.wilson@skincare.com',
    phone: '+1 (555) 345-6789',
    specialty: 'Dermatology',
    experience: 10,
    rating: 4.7,
    consultationFee: 200,
    location: 'Skin Care Center - Floor 3',
    bio: 'Dr. Emma Wilson is a board-certified dermatologist with expertise in medical and cosmetic dermatology. She specializes in skin cancer detection and advanced dermatological treatments.',
    education: [
      'MD - Stanford University School of Medicine',
      'Dermatology Residency - UCSF Medical Center',
      'Board Certified - American Board of Dermatology'
    ],
    languages: ['English', 'Italian'],
    slots: [
      { 
        id: 'slot-3',
        startDate: '2024-01-01',
        daysOfWeek: [1, 2, 3, 4, 6],
        isRecurring: true,
        frequency: 'weekly',
        timeRanges: [{ startTime: '10:00', endTime: '18:00' }],
        timeZone: 'UTC'
      }
    ],
    defaultSessionDuration: 30,
    maxPatientsPerDay: 25,
    advanceBookingDays: 30,
    isActive: true,
    createdAt: new Date('2023-03-05'),
    updatedAt: new Date('2025-06-20')
  },
  {
    id: 'doc-4',
    name: 'Dr. James Rodriguez',
    email: 'james.rodriguez@orthoclinic.com',
    phone: '+1 (555) 456-7890',
    specialty: 'Orthopedics',
    experience: 18,
    rating: 4.9,
    consultationFee: 300,
    location: 'Orthopedic Clinic - Building B',
    bio: 'Dr. James Rodriguez is an orthopedic surgeon specializing in sports medicine and joint replacement. He has treated professional athletes and performs complex orthopedic procedures.',
    education: [
      'MD - University of Pennsylvania School of Medicine',
      'Orthopedic Surgery Residency - Hospital for Special Surgery',
      'Sports Medicine Fellowship - Andrews Sports Medicine'
    ],
    languages: ['English', 'Spanish', 'Portuguese'],
    slots: [
      { 
        id: 'slot-4',
        startDate: '2024-01-01',
        daysOfWeek: [1, 2, 3, 4, 5],
        isRecurring: true,
        frequency: 'weekly',
        timeRanges: [{ startTime: '07:00', endTime: '15:00' }],
        timeZone: 'UTC'
      }
    ],
    defaultSessionDuration: 60,
    maxPatientsPerDay: 10,
    advanceBookingDays: 30,
    isActive: true,
    createdAt: new Date('2023-01-20'),
    updatedAt: new Date('2025-06-20')
  },
  {
    id: 'doc-5',
    name: 'Dr. Lisa Chen',
    email: 'lisa.chen@pediatrics.com',
    phone: '+1 (555) 567-8901',
    specialty: 'Pediatrics',
    experience: 8,
    rating: 4.8,
    consultationFee: 180,
    location: 'Children\'s Medical Center - Wing A',
    bio: 'Dr. Lisa Chen is a pediatrician who specializes in child development and adolescent medicine. She is passionate about providing comprehensive care for children from infancy through teenage years.',
    education: [
      'MD - University of California, Los Angeles',
      'Pediatric Residency - Children\'s Hospital Los Angeles',
      'Board Certified - American Board of Pediatrics'
    ],
    languages: ['English', 'Mandarin', 'Cantonese'],
    slots: [
      { 
        id: 'slot-5',
        startDate: '2024-01-01',
        daysOfWeek: [1, 2, 3, 4, 5],
        isRecurring: true,
        frequency: 'weekly',
        timeRanges: [{ startTime: '08:00', endTime: '16:00' }],
        timeZone: 'UTC'
      }
    ],
    defaultSessionDuration: 30,
    maxPatientsPerDay: 20,
    advanceBookingDays: 30,
    isActive: true,
    createdAt: new Date('2023-04-12'),
    updatedAt: new Date('2025-06-20')
  }
]

// Mock Patients Database
export const mockPatients: Patient[] = [
  {
    id: 'patient-1',
    clerkUserId: 'user_123456789',
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 111-2222',
    dateOfBirth: new Date('1985-03-15'),
    gender: 'male',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    emergencyContact: {
      name: 'Jane Doe',
      phone: '+1 (555) 111-3333',
      relationship: 'Spouse'
    },
    medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin', 'Shellfish'],
    currentMedications: ['Metformin 500mg', 'Lisinopril 10mg'],
    insuranceInfo: {
      provider: 'Blue Cross Blue Shield',
      policyNumber: 'BC123456789',
      groupNumber: 'GRP001'
    },
    isActive: true,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2025-06-20')
  }
]

// Mock Appointments Database
export const mockAppointments: IAppointment[] = [
  {
    id: 'apt-1',
    patientId: 'patient-1',
    doctorId: 'doc-1',
    date: new Date('2025-06-30'),
    startTime: '15:00',
    endTime: '15:30',
    status: 'confirmed',
    type: 'consultation',
    reason: 'Annual checkup',
    symptoms: ['General wellness check'],
    paymentStatus: 'paid',
    paymentAmount: 150,
    stripeSessionId: 'cs_test_123456',
    reminderSent: false,
    followUpRequired: false,
    createdAt: new Date('2025-06-25'),
    updatedAt: new Date('2025-06-25'),
    mode: 'physical'
  },
  // Add some existing appointments to test conflict detection
  {
    id: 'apt-2',
    patientId: 'patient-2',
    doctorId: 'doc-1',
    date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow's date for testing
    startTime: '09:00',
    endTime: '09:30',
    status: 'scheduled',
    type: 'consultation',
    reason: 'Follow-up appointment',
    symptoms: [],
    paymentStatus: 'paid',
    paymentAmount: 150,
    stripeSessionId: 'cs_test_789',
    reminderSent: false,
    followUpRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    mode: 'physical'
  },
  // Add another appointment for the same doctor on a different time
  {
    id: 'apt-3',
    patientId: 'patient-3',

    
    doctorId: 'doc-1',
    date: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // Tomorrow's date
    startTime: '10:00',
    endTime: '10:30',
    status: 'scheduled',
    type: 'consultation',
    reason: 'Consultation',
    symptoms: [],
    paymentStatus: 'paid',
    paymentAmount: 150,
    stripeSessionId: 'cs_test_999',
    reminderSent: false,
    followUpRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    mode: 'physical'
  }
]

// Helper functions for database operations
export class MockDatabase {
  static getDoctors(): Doctor[] {
    return mockDoctors.filter(doc => doc.isActive)
  }

  static getDoctorById(id: string): Doctor | null {
    return mockDoctors.find(doc => doc.id === id && doc.isActive) || null
  }

  static getDoctorsBySpecialty(specialty: string): Doctor[] {
    return mockDoctors.filter(doc => 
      doc.isActive && 
      doc.specialty.toLowerCase().includes(specialty.toLowerCase())
    )
  }

  static getPatientByClerkId(clerkUserId: string): Patient | null {
    return mockPatients.find(patient => 
      patient.clerkUserId === clerkUserId && patient.isActive
    ) || null
  }

  static getAppointmentsByPatient(patientId: string): IAppointment[] {
    return mockAppointments.filter(apt => apt.patientId === patientId)
  }

  static getAppointmentsByDoctor(doctorId: string): IAppointment[] {
    return mockAppointments.filter(apt => apt.doctorId === doctorId)
  }

  static getAppointmentsByDate(date: Date): IAppointment[] {
    const dateStr = date.toISOString().split('T')[0]
    return mockAppointments.filter(apt => 
      apt.date.toISOString().split('T')[0] === dateStr
    )
  }

  static createAppointment(appointment: Omit<IAppointment, 'id' | 'createdAt' | 'updatedAt'>): IAppointment {
    const newAppointment: IAppointment = {
      ...appointment,
      id: `apt-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    console.log('newAppointment', newAppointment)
    mockAppointments.push(newAppointment)
    return newAppointment
  }

  static updateAppointment(id: string, updates: Partial<IAppointment>): IAppointment | null {
    const index = mockAppointments.findIndex(apt => apt.id === id)
    if (index === -1) return null

    mockAppointments[index] = {
      ...mockAppointments[index],
      ...updates,
      updatedAt: new Date()
    }
    return mockAppointments[index]
  }

  static deleteAppointment(id: string): boolean {
    const index = mockAppointments.findIndex(apt => apt.id === id)
    if (index === -1) return false

    mockAppointments.splice(index, 1)
    return true
  }
} 