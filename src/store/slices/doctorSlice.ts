import { CREATE_DOCTOR, DOCTOR_AVAILABILITY, FETCH_DOCTOR_APPOINTMENTS, FETCH_DOCTOR_METRICS, GET_DOCTOR, GET_DOCTORS, UPDATE_DOCTOR } from '../actions/doctor';
import { IN_PROGRESS, SUCCESS, ERROR } from '../utils/actionTypes';
// Action-specific state interface
interface ActionState<T> {
  loading: boolean;
  success: boolean;
  error: string | null;
  data: T | null;
}

// State interface with separate states for each action
interface DoctorState {  
  // Individual action states
  getDoctors: ActionState<IDoctor[]>;
  doctor: ActionState<IDoctor>;
  doctorAvailability: ActionState<IDoctorAvailability>;
  doctorMetrics: ActionState<IDoctorMetrics>;
  doctorAppointments: ActionState<AppointmentDisplay[]>;
}

// Initial action state
const initialActionStateDoctor: ActionState<IDoctor> = {
  loading: false,
  success: false,
  error: null,
  data: null,
};
const initialActionStateGetDoctors: ActionState<IDoctor[]> = {
  loading: false,
  success: false,
  error: null,
  data: null,
};
const initialActionStateDoctorAvailability: ActionState<IDoctorAvailability> = {
  loading: false,
  success: false,
  error: null,
  data: null,
};
const initialActionStateDoctorMetrics: ActionState<IDoctorMetrics> = {
  loading: false,
  success: false,
  error: null,
  data: {
    totalAppointments: {
      count: 0,
      growth: 0,
      growthText: "+0 from last month",
    },
    todaySchedule: {
      count: 0,
      text: "appointments today",
    },
    revenue: {
      total: 0,
      growth: 0,
      growthText: "+0 from last month",
    },
    patients: {
      total: 0,
      newThisMonth: 0,
    },
  },
};

const initialActionStateDoctorAppointments: ActionState<AppointmentDisplay[]> = {
  loading: false,
  success: false,
  error: null,
  data: null,
};

// Initial state
const initialState: DoctorState = {
  // Initialize each action state
  doctor: initialActionStateDoctor,
  getDoctors: initialActionStateGetDoctors,
  doctorAvailability: initialActionStateDoctorAvailability,
  doctorMetrics: initialActionStateDoctorMetrics,
  doctorAppointments: initialActionStateDoctorAppointments,
};

// Manual switch cases organized by action type
const doctorSlice = (state = initialState, action: { type: string; payload?: unknown }) => {
  switch (action.type) {
    // GET_DOCTOR actions
    case GET_DOCTOR + IN_PROGRESS:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: true, success: false, error: null }
      };
    case GET_DOCTOR + SUCCESS:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: true, error: null, data: action.payload as IDoctor }
      };
    case GET_DOCTOR + ERROR:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: false, error: action.payload as string}
      };

    // GET_DOCTORS actions
    case GET_DOCTORS + IN_PROGRESS:
      return { 
        ...state, 
        getDoctors: { ...state.getDoctors, loading: true, success: false, error: null }
      };
    case GET_DOCTORS + SUCCESS:
      return { 
        ...state, 
        getDoctors: { ...state.getDoctors, loading: false, success: true, error: null, data: action.payload as IDoctor[] }
      };
    case GET_DOCTORS + ERROR:
      return { 
        ...state, 
        getDoctors: { ...state.getDoctors, loading: false, success: false, error: action.payload as string }
      };

    // CREATE_DOCTOR actions
    case CREATE_DOCTOR + IN_PROGRESS:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: true, success: false, error: null }
      };
    case CREATE_DOCTOR + SUCCESS:
      const newDoctor = action.payload as IDoctor;
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: true, error: null, data: newDoctor }
      };
    case CREATE_DOCTOR + ERROR:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: false, error: action.payload as string}
      };

    // UPDATE_DOCTOR actions
    case UPDATE_DOCTOR + IN_PROGRESS:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: true, success: false, error: null }
      };
    case UPDATE_DOCTOR + SUCCESS:
      const updatedDoctor = action.payload as IDoctor;
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: true, error: null, data: updatedDoctor }
      };
    case UPDATE_DOCTOR + ERROR:
      return { 
        ...state, 
        doctor: { ...state.doctor, loading: false, success: false, error: action.payload as string }
      };

    // DOCTOR_AVAILABILITY actions
    case DOCTOR_AVAILABILITY + IN_PROGRESS:
      return { 
        ...state, 
        doctorAvailability: { ...state.doctorAvailability, loading: true, success: false, error: null }
      };
    case DOCTOR_AVAILABILITY + SUCCESS:
      return { 
        ...state, 
        doctorAvailability: { ...state.doctorAvailability, loading: false, success: true, error: null, data: action.payload as IDoctorAvailability }
      };
    case DOCTOR_AVAILABILITY + ERROR:
      return { 
        ...state, 
        doctorAvailability: { ...state.doctorAvailability, loading: false, success: false, error: action.payload as string }
      };


    // FETCH_DOCTOR_METRICS actions
    case FETCH_DOCTOR_METRICS + IN_PROGRESS:
      return { 
        ...state, 
        doctorMetrics: { ...state.doctorMetrics, loading: true, success: false, error: null }
      };
    case FETCH_DOCTOR_METRICS + SUCCESS:
      return { 
        ...state, 
        doctorMetrics: { ...state.doctorMetrics, loading: false, success: true, error: null, data: action.payload as IDoctorMetrics }
      };
    case FETCH_DOCTOR_METRICS + ERROR:
      return { 
        ...state, 
        doctorMetrics: { ...state.doctorMetrics, loading: false, success: false, error: action.payload as string }
      };

    // FETCH_DOCTOR_APPOINTMENTS actions
    case FETCH_DOCTOR_APPOINTMENTS + IN_PROGRESS:
      return { 
        ...state, 
        doctorAppointments: { ...state.doctorAppointments, loading: true, success: false, error: null }
      };
    case FETCH_DOCTOR_APPOINTMENTS + SUCCESS:
      return {
        ...state, 
        doctorAppointments: { ...state.doctorAppointments, loading: false, success: true, error: null, data: action.payload as AppointmentDisplay[] }
      };
    case FETCH_DOCTOR_APPOINTMENTS + ERROR:
      return { 
        ...state, 
        doctorAppointments: { ...state.doctorAppointments, loading: false, success: false, error: action.payload as string }
      };
    default:
      return state;
  }
};

export default doctorSlice; 