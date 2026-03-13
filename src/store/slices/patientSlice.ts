import { IN_PROGRESS, SUCCESS, ERROR } from '../utils/actionTypes';
import { CREATE_PATIENT, DELETE_PATIENT, GET_PATIENT, GET_PATIENTS, UPDATE_PATIENT } from '../actions/patient';

// Patient interface
interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
}

// State interface
interface PatientState {
  data: Patient | null;
  list: Patient[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// Initial state
const initialState: PatientState = {
  data: null,
  list: [],
  status: 'idle',
  error: null,
};

// Manual switch cases organized by action type
const patientSlice = (state = initialState, action: { type: string; payload?: unknown }) => {
  switch (action.type) {
    // GET_PATIENT actions
    case GET_PATIENT + IN_PROGRESS:
      return { ...state, status: 'loading' as const, error: null };
    case GET_PATIENT + SUCCESS:
      return { ...state, status: 'succeeded' as const, data: action.payload as Patient, error: null };
    case GET_PATIENT + ERROR:
      return { ...state, status: 'failed' as const, error: action.payload as string };

    // GET_PATIENTS actions
    case GET_PATIENTS + IN_PROGRESS:
      return { ...state, status: 'loading' as const, error: null };
    case GET_PATIENTS + SUCCESS:
      return { ...state, status: 'succeeded' as const, list: action.payload as Patient[], error: null };
    case GET_PATIENTS + ERROR:
      return { ...state, status: 'failed' as const, error: action.payload as string };

    // CREATE_PATIENT actions
    case CREATE_PATIENT + IN_PROGRESS:
      return { ...state, status: 'loading' as const, error: null };
    case CREATE_PATIENT + SUCCESS:
      return { 
        ...state, 
        status: 'succeeded' as const, 
        data: action.payload as Patient,
        list: [...state.list, action.payload as Patient],
        error: null 
      };
    case CREATE_PATIENT + ERROR:
      return { ...state, status: 'failed' as const, error: action.payload as string };

    // UPDATE_PATIENT actions
    case UPDATE_PATIENT + IN_PROGRESS:
      return { ...state, status: 'loading' as const, error: null };
    case UPDATE_PATIENT + SUCCESS:
      const updatedPatient = action.payload as Patient;
      return { 
        ...state, 
        status: 'succeeded' as const, 
        data: updatedPatient,
        list: state.list.map(p => p.id === updatedPatient.id ? updatedPatient : p),
        error: null 
      };
    case UPDATE_PATIENT + ERROR:
      return { ...state, status: 'failed' as const, error: action.payload as string };

    // DELETE_PATIENT actions
    case DELETE_PATIENT + IN_PROGRESS:
      return { ...state, status: 'loading' as const, error: null };
    case DELETE_PATIENT + SUCCESS:
      return { 
        ...state, 
        status: 'succeeded' as const, 
        data: null,
        list: state.list.filter(p => p.id !== action.payload),
        error: null 
      };
    case DELETE_PATIENT + ERROR:
      return { ...state, status: 'failed' as const, error: action.payload as string };

    default:
      return state;
  }
};

export default patientSlice; 