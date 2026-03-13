// Doctor related types

interface IDoctor {
  id: string
  clerkUserId?: string
  name: string
  email: string
  phone: string
  specialty: string
  experience: number
  rating: number
  consultationFee: number
  location: string
  bio: string
  education: string[]
  languages: string[]
  slots: IAvailabilitySlot[]
  image?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  defaultSessionDuration: number
  maxPatientsPerDay: number
  advanceBookingDays: number
}

interface IAvailabilityTimeRange {
  startTime: string;
  endTime: string;
}

interface IAvailabilitySlot {
  id: string;
  startDate: string;
  daysOfWeek: number[];
  isRecurring: boolean;
  repeatUntil?: string;
  frequency: 'weekly' | 'monthly';
  timeRanges: IAvailabilityTimeRange[]; // Always an array in frontend format
  timeZone: string;
}

// Form state interface for adding new availability slots
interface IAvailabilitySlotForm {
  daysOfWeek: number[];
  isRecurring: boolean;
  frequency: 'weekly' | 'monthly';
  startDate?: string;
  repeatUntil?: string;
  timeRanges: IAvailabilityTimeRange[];
}

interface IDoctorMetrics {
  totalAppointments: {
    count: number;
    growth: number;
    growthText: string;
  };
  todaySchedule: {
    count: number;
    text: string;
  };
  revenue: {
    total: number;
    growth: number;
    growthText: string;
  };
  patients: {
    total: number;
    newThisMonth: number;
  };
}

interface IDoctorAvailability {
  doctorId: string;
  slots: IAvailabilitySlot[];
  defaultSessionDuration: number;
  timezone: string;
  maxPatientsPerDay: number;
  advanceBookingDays: numbr;
}

// Type alias for consistency with other types (Appointment, Patient)
type Doctor = IDoctor;

// API response types
type IDoctorsResponse = IApiResponse<IDoctor[]>;
type DoctorsResponse = IApiResponse<Doctor[]>; 