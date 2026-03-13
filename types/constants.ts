// Application constants and enums

// API Endpoints
export const API_ENDPOINTS = {
  APPOINTMENTS: '/api/appointments',
  DOCTORS: '/api/doctors',
  PATIENTS: '/api/patients',
  AUTH: '/api/auth',
  WEBHOOKS: '/api/webhooks'
} as const

// Time and Scheduling
export const TIME_SLOTS = {
  DEFAULT_DURATION: 30, // minutes
  BREAK_DURATION: 15,   // minutes
  WORKING_HOURS: {
    START: '09:00',
    END: '17:00'
  }
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
} as const

// File Uploads
export const FILE_UPLOADS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
} as const

// Validation
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
} as const

// Appointment Status
export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
} as const

// Appointment Types
export const APPOINTMENT_TYPE = {
  CONSULTATION: 'consultation',
  FOLLOW_UP: 'follow-up',
  CHECK_UP: 'check-up',
  EMERGENCY: 'emergency',
  SPECIALIST: 'specialist'
} as const

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded'
} as const

// User Roles
export const USER_ROLE = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin'
} as const

// Gender Options
export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const

// API Error Types
export const API_ERROR_TYPE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

// Stripe Configuration
export const STRIPE_CONFIG = {
  API_VERSION: '2025-06-30.basil',
  CURRENCY: 'usd',
  PAYMENT_METHODS: ['card']
} as const 