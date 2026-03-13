// Appointment related types

interface IAppointment {
  id: string
  patientId?: string
  doctorId: string
  date: Date
  startTime: string
  endTime: string
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show'
  type: 'consultation' | 'follow-up' | 'check-up' | 'emergency' | 'specialist'
  reason: string
  symptoms?: string[]
  diagnosis?: string
  prescription?: string
  followUpRequired: boolean
  followUpDate?: Date
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentAmount: number
  stripePaymentIntentId?: string
  stripeSessionId?: string
  reminderSent: boolean
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  consultationSummaryFileUuid?: string
  createdAt: Date
  updatedAt: Date
  mode: 'physical' | 'video'
}

interface AppointmentWithPatient extends IAppointment {
  patient?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface AppointmentDisplay {
  id: string;
  patientName: string;
  time: string;
  date: string;
  status: string;
  duration?: string;
  hasRecording?: boolean;
  hasReport?: boolean;
  hasAI?: boolean;
  features?: string[];
  mode?: 'physical' | 'video';
}

interface TimeSlot {
  time: string
  isAvailable: boolean
  appointmentId?: string
}

interface DaySchedule {
  date: string
  dayOfWeek: number
  slots: TimeSlot[]
}

// Request types
interface CreateAppointmentRequest {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

interface UpdateAppointmentRequest {
  status?: string;
  diagnosis?: string;
  prescription?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  consultationSummaryFileUuid?: string;
}

// API response types
type AppointmentsResponse = ApiResponse<AppointmentDisplay[]>;
