import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiCreator';
import { 
  GET_DOCTOR, 
  GET_DOCTORS, 
  CREATE_DOCTOR, 
  UPDATE_DOCTOR, 
  DELETE_DOCTOR,
  DOCTOR_AVAILABILITY,
  FETCH_DOCTOR_METRICS,
  FETCH_DOCTOR_APPOINTMENTS,
} from '../actions/doctor';

// API functions
export const getDoctor = (id: string) =>
  apiGet(GET_DOCTOR, `/api/doctors/${id}`);

export const getDoctors = () =>
  apiGet(GET_DOCTORS, '/api/doctors');

export const createDoctor = (doctorData: unknown) =>
  apiPost(CREATE_DOCTOR, '/api/auth/create-doctor', doctorData);

export const updateDoctor = (id: string, doctorData: unknown) =>
  apiPut(UPDATE_DOCTOR, `/api/doctors/${id}`, doctorData);

export const deleteDoctor = (id: string) =>
  apiDelete(DELETE_DOCTOR, `/api/doctors/${id}`);

// Update doctor profile (specific endpoint for profile updates)
export const updateDoctorProfile = (doctorData: unknown) =>
  apiPut(UPDATE_DOCTOR, '/api/doctors/update-profile', doctorData);

// Fetch current doctor info (for authenticated doctor)
export const fetchDoctorInfo = () =>
  apiGet(GET_DOCTOR, '/api/auth/get-doctor');

export const fetchDoctorAvailability = () =>
  apiGet(DOCTOR_AVAILABILITY, '/api/doctors/availability');

export const updateDoctorAvailability = (doctorData: unknown) =>
  apiPut(DOCTOR_AVAILABILITY, '/api/doctors/availability', doctorData);

export const fetchDoctorMetrics = () =>
  apiGet(FETCH_DOCTOR_METRICS, '/api/doctors/metrics');

export const fetchDoctorAppointments = () =>
  apiGet(FETCH_DOCTOR_APPOINTMENTS, '/api/doctors/appointments');
