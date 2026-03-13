// Type helpers for constants

import {
  APPOINTMENT_STATUS,
  APPOINTMENT_TYPE,
  PAYMENT_STATUS,
  USER_ROLE,
  GENDER,
  HTTP_STATUS,
  API_ERROR_TYPE
} from './constants';

// Appointment related types
export type AppointmentStatusType = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];
export type AppointmentTypeType = typeof APPOINTMENT_TYPE[keyof typeof APPOINTMENT_TYPE];
export type PaymentStatusType = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// User related types
export type UserRoleType = typeof USER_ROLE[keyof typeof USER_ROLE];
export type GenderType = typeof GENDER[keyof typeof GENDER];

// API related types
export type HttpStatusType = typeof HTTP_STATUS[keyof typeof HTTP_STATUS];
export type ApiErrorTypeType = typeof API_ERROR_TYPE[keyof typeof API_ERROR_TYPE]; 