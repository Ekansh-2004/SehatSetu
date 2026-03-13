import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiCreator';
import { 
  GET_PATIENT, 
  GET_PATIENTS, 
  CREATE_PATIENT, 
  UPDATE_PATIENT, 
  DELETE_PATIENT 
} from '../actions/patient';

// API functions
export const getPatient = (id: string) =>
  apiGet(GET_PATIENT, `/api/patients/${id}`);

export const getPatients = () =>
  apiGet(GET_PATIENTS, '/api/patients');

export const createPatient = (patientData: unknown) =>
  apiPost(CREATE_PATIENT, '/api/patients', patientData);

export const updatePatient = (id: string, patientData: unknown) =>
  apiPut(UPDATE_PATIENT, `/api/patients/${id}`, patientData);

export const deletePatient = (id: string) =>
  apiDelete(DELETE_PATIENT, `/api/patients/${id}`);

// Example usage:
// getPatients() - dispatches actions automatically and returns promise
// await getPatients() - wait for the result 