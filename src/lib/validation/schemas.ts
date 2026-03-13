import * as z from 'zod'

// ============================================================================
// SECURITY VALIDATION HELPERS
// ============================================================================

/**
 * SQL injection pattern detector for validation
 * Only detects actual attack patterns, not just keywords
 * (e.g., "Please update the records" is allowed, but "'; DROP TABLE --" is not)
 */
const containsSqlInjection = (value: string): boolean => {
  const patterns = [
    // Classic injection with quotes
    /['"`]\s*(OR|AND)\s+['"`\d]/i,
    // Union-based injection
    /\bUNION\s+(ALL\s+)?SELECT\b/i,
    // Comment after quote (attack pattern)
    /['"`]\s*(--|#|\/\*)/,
    // Stacked dangerous commands
    /;\s*(DROP|DELETE|TRUNCATE)\s/i,
    // Boolean tautologies
    /\bOR\s+1\s*=\s*1\b/i,
    /'\s*OR\s*'[^']*'\s*=\s*'/i,
  ]
  return patterns.some(pattern => pattern.test(value))
}

/**
 * XSS pattern detector for validation
 */
const containsXss = (value: string): boolean => {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
  ]
  return patterns.some(pattern => pattern.test(value))
}

/**
 * Safe string validator - blocks SQL injection and XSS
 */
const safeString = z.string().refine(
  (val) => !containsSqlInjection(val) && !containsXss(val),
  { message: 'Input contains invalid characters' }
)

/**
 * Safe ID validator - only alphanumeric, hyphen, underscore
 */
const safeId = z.string()
  .min(1, 'ID is required')
  .max(50, 'ID is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')

// ============================================================================
// USER REGISTRATION SCHEMAS
// ============================================================================

// User registration schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .refine((val) => !containsSqlInjection(val), { message: 'Invalid email' }),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
  rememberMe: z.boolean().optional(),
})

export const registerSchema = z
  .object({
    firstName: safeString.pipe(z.string().min(2, 'First name must be at least 2 characters').max(100)),
    lastName: safeString.pipe(z.string().min(2, 'Last name must be at least 2 characters').max(100)),
    email: z.string()
      .email('Please enter a valid email address')
      .max(255)
      .refine((val) => !containsSqlInjection(val), { message: 'Invalid email' }),
    phone: z.string()
      .min(10, 'Please enter a valid phone number')
      .max(20)
      .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, 'Invalid phone format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(8, 'Please confirm your password').max(128),
    terms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords don\'t match',
    path: ['confirmPassword'],
  })

// Patient registration schema
export const patientRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(5, 'ZIP code must be at least 5 characters'),
  }),
  emergencyContact: z.object({
    name: z.string().min(2, 'Emergency contact name is required'),
    phone: z.string().min(10, 'Emergency contact phone is required'),
    relationship: z.string().min(1, 'Relationship is required'),
  }),
  medicalHistory: z.string().optional(),
  allergies: z.string().optional(),
  currentMedications: z.string().optional(),
  insuranceInfo: z.object({
    provider: z.string().min(1, 'Insurance provider is required'),
    policyNumber: z.string().min(1, 'Policy number is required'),
    groupNumber: z.string().min(1, 'Group number is required'),
  }),
})

// Doctor registration schema
export const doctorRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  specialty: z.string().min(2, 'Specialty is required'),
  experience: z.number().min(0, 'Experience must be 0 or greater'),
  rating: z.number().min(0).max(5, 'Rating must be between 0 and 5'),
  consultationFee: z.number().min(0, 'Consultation fee must be 0 or greater'),
  location: z.string().min(1, 'Location is required'),
  bio: z.string().optional(),
  education: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availability: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    slotDuration: z.number().min(15, 'Slot duration must be at least 15 minutes'),
    breakTimes: z.array(z.object({
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    })).optional(),
  })).optional(),
})

// Appointment booking schema
export const appointmentBookingSchema = z.object({
  patientId: safeId.optional(),
  doctorId: safeId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  reason: safeString.pipe(z.string().min(1, 'Reason is required').max(1000)),
  symptoms: safeString.pipe(z.string().max(2000)).optional(),
  type: z.enum(['consultation', 'follow-up', 'emergency']).default('consultation'),
  paymentAmount: z.number().min(0).max(100000).optional(),
  stripeSessionId: z.string().max(500).optional(),
  stripePaymentIntentId: z.string().max(500).optional(),
  mode: z.enum(['physical', 'video']).default('physical'),
})

// Guest appointment schema
export const guestAppointmentSchema = appointmentBookingSchema.extend({
  guestName: z.string().min(2, 'Guest name is required'),
  guestEmail: z.string().email('Please enter a valid email address'),
  guestPhone: z.string().min(10, 'Please enter a valid phone number').optional().or(z.literal('')),
})

// Payment schema
export const paymentSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  doctorName: z.string().min(1, 'Doctor name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  patientEmail: z.string().email('Please enter a valid email address').optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email('Please enter a valid email address').optional(),
  guestPhone: z.string().optional(),
  isGuest: z.boolean().default(false),
  reason: z.string().min(1, 'Reason is required'),
  mode: z.enum(['physical', 'video']).default('physical'),
})

// API query schemas - with security validation
export const doctorQuerySchema = z.object({
  specialty: safeString.pipe(z.string().max(100)).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).max(10000).optional(),
})

export const appointmentQuerySchema = z.object({
  patientId: safeId.nullable().optional(),
  doctorId: safeId.nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').nullable().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).nullable().optional(),
})

// ============================================================================
// EXPORTED SECURITY HELPERS
// ============================================================================
export { containsSqlInjection, containsXss, safeString, safeId }

// Role selection schema
export const roleSelectionSchema = z.object({
  role: z.enum(['doctor', 'patient'], {
    errorMap: () => ({ message: 'Please select either doctor or patient' }),
  }),
})

// Export types
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type PatientRegistrationData = z.infer<typeof patientRegistrationSchema>
export type DoctorRegistrationData = z.infer<typeof doctorRegistrationSchema>
export type AppointmentBookingData = z.infer<typeof appointmentBookingSchema>
export type GuestAppointmentData = z.infer<typeof guestAppointmentSchema>
export type PaymentData = z.infer<typeof paymentSchema>
export type DoctorQueryData = z.infer<typeof doctorQuerySchema>
export type AppointmentQueryData = z.infer<typeof appointmentQuerySchema>
export type RoleSelectionData = z.infer<typeof roleSelectionSchema> 