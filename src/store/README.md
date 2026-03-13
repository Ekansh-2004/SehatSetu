# Redux Store Structure

This directory contains the Redux store configuration and slices for the application.

## File Structure

```
src/store/
├── index.ts           # Main store configuration
├── hooks.ts           # Typed Redux hooks
├── selectors.ts       # Reusable selectors
├── utils/
│   ├── apiCreator.ts  # Simple API creator utility
│   └── reducerCreator.ts # Reducer utilities
├── slices/            # Redux slices
│   ├── doctorSlice.ts # Doctor state management
│   └── patientSlice.ts # Patient state management
├── api/               # API functions
│   └── patientApi.ts  # Patient API functions
├── templates/         # Templates for generating new slices
│   ├── simpleSliceTemplate.ts
│   └── simpleApiTemplate.ts
└── README.md          # This file
```

## Simple Approach: apiCreator + Switch Cases

This is the recommended approach - much simpler and cleaner!

### How it Works

1. **apiCreator** handles all API calls and automatically dispatches actions
2. **Reducer** uses simple switch cases to handle `ACTION_IN_PROGRESS`, `ACTION_SUCCESS`, `ACTION_ERROR`
3. **No complex async thunks or extra boilerplate**

### Quick Start: Creating a New Slice

#### Step 1: Create the Slice
Copy `src/store/templates/simpleSliceTemplate.ts` and modify:

```typescript
// src/store/slices/appointmentSlice.ts
import { IN_PROGRESS, SUCCESS, ERROR } from '../utils/apiCreator';

export const GET_APPOINTMENT = 'GET_APPOINTMENT';
export const GET_APPOINTMENTS = 'GET_APPOINTMENTS';
export const CREATE_APPOINTMENT = 'CREATE_APPOINTMENT';

interface Appointment {
  id: string;
  date: string;
  // ... other properties
}

const appointmentSlice = (state = initialState, action: { type: string; payload: unknown }) => {
  switch (action.type) {
    case GET_APPOINTMENTS + IN_PROGRESS:
      return { ...state, status: 'loading', error: null };
    case GET_APPOINTMENTS + SUCCESS:
      return { ...state, status: 'succeeded', list: action.payload as Appointment[], error: null };
    case GET_APPOINTMENTS + ERROR:
      return { ...state, status: 'failed', error: action.payload as string };
    // ... other cases
    default:
      return state;
  }
};
```

#### Step 2: Create API Functions
Copy `src/store/templates/simpleApiTemplate.ts` and modify:

```typescript
// src/store/api/appointmentApi.ts
import { apiGet, apiPost } from '../utils/apiCreator';
import { GET_APPOINTMENTS, CREATE_APPOINTMENT } from '../slices/appointmentSlice';

export const getAppointments = (returnPromise = false) =>
  apiGet(GET_APPOINTMENTS, '/api/appointments', undefined, returnPromise);

export const createAppointment = (data: unknown, returnPromise = false) =>
  apiPost(CREATE_APPOINTMENT, '/api/appointments', data, returnPromise);
```

#### Step 3: Add to Store
```typescript
// src/store/index.ts
import appointmentReducer from './slices/appointmentSlice';

export const store = configureStore({
  reducer: {
    doctor: doctorReducer,
    patient: patientReducer,
    appointment: appointmentReducer, // Add this
  },
});
```

#### Step 4: Use in Components
```typescript
import { getAppointments, createAppointment } from '@/store/api/appointmentApi';

export default function AppointmentList() {
  const appointments = useAppSelector(state => state.appointment.list);
  const loading = useAppSelector(state => state.appointment.status === 'loading');

  useEffect(() => {
    getAppointments(); // Automatically dispatches actions!
  }, []);

  const handleCreate = () => {
    createAppointment({ date: '2024-01-01' });
  };

  // ... rest of component
}
```

## API Creator Utility

The `apiCreator` automatically handles:
- ✅ Dispatching `ACTION_IN_PROGRESS` on start
- ✅ Dispatching `ACTION_SUCCESS` on success
- ✅ Dispatching `ACTION_ERROR` on error
- ✅ Error handling and message extraction
- ✅ Promise return option for custom handling

### Usage Examples

```typescript
import { apiGet, apiPost, apiPut, apiDelete } from '@/store/utils/apiCreator';

// Simple usage - automatically dispatches actions
getPatients();

// With promise return for custom handling
try {
  const result = await getPatients(true);
  console.log('Patients loaded:', result);
} catch (error) {
  console.error('Failed to load patients:', error);
}

// Custom API call
apiCreator({
  action: 'CUSTOM_ACTION',
  url: '/api/custom',
  method: 'POST',
  data: { custom: 'data' }
});
```

## State Management Patterns

### Loading States
```typescript
const loading = useAppSelector(state => state.patient.status === 'loading');
const error = useAppSelector(state => state.patient.error);
```

### Data Access
```typescript
const patients = useAppSelector(state => state.patient.list);
const currentPatient = useAppSelector(state => state.patient.data);
```

### Error Handling
```typescript
// Automatic - errors are stored in state
const error = useAppSelector(state => state.patient.error);

// Manual - with try/catch
try {
  await createPatient(data, true);
} catch (error) {
  // Handle error manually
}
```

## Benefits of This Approach

1. **Simple**: Just copy templates and modify
2. **Consistent**: Same pattern for all entities
3. **Automatic**: No manual dispatch calls needed
4. **Flexible**: Can get promises for custom handling
5. **Type Safe**: Full TypeScript support
6. **Clean**: Minimal boilerplate code

## Migration from Old Approach

If you have existing slices using Redux Toolkit's `createAsyncThunk`:

1. Replace async thunks with `apiCreator` calls
2. Replace `extraReducers` with simple switch cases
3. Update components to use new API functions
4. Remove `useAppDispatch` calls (not needed anymore)

## Best Practices

1. **Use Templates**: Always start with the templates
2. **Consistent Naming**: Follow the established patterns
3. **Error Handling**: Let the apiCreator handle errors automatically
4. **Promise Option**: Use `returnPromise = true` when you need custom handling
5. **Type Safety**: Define proper interfaces for your entities

## Example: Complete Patient Implementation

See `src/store/slices/patientSlice.ts` and `src/store/api/patientApi.ts` for a complete working example. 