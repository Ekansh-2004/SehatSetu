# Types Structure

This directory contains all type definitions, constants, and type helpers for the application.

## File Structure

```
types/
├── appointment.d.ts  # Appointment-related types
├── doctor.d.ts      # Doctor-related types
├── patient.d.ts     # Patient-related types
├── api.d.ts         # API response/request types
├── common.d.ts      # Common utility types
├── global.d.ts      # Legacy file (now just documentation)
├── constants.ts     # Application constants and enums
├── helpers.ts       # Type helpers for constants
├── index.ts         # Main export file
└── README.md        # This file
```

## Usage

### Global Types (Interfaces)
All interfaces are declared globally in domain-specific `.d.ts` files and are available throughout the application without imports:

```typescript
// ✅ No import needed - all types are globally available
const appointment: Appointment = { /* ... */ };
const doctor: Doctor = { /* ... */ };
const patient: Patient = { /* ... */ };
const apiResponse: ApiResponse<Appointment[]> = { /* ... */ };
```

### Domain-Specific Organization

#### Appointment Types (`appointment.d.ts`)
- `Appointment` - Core appointment interface
- `AppointmentWithPatient` - Appointment with patient info
- `AppointmentDisplay` - UI display format
- `TimeSlot`, `DaySchedule` - Scheduling types
- `CreateAppointmentRequest`, `UpdateAppointmentRequest` - API request types

#### Doctor Types (`doctor.d.ts`)
- `Doctor` - Core doctor interface
- `DoctorAvailability` - Availability schedule
- `DoctorsResponse` - API response type

#### Patient Types (`patient.d.ts`)
- `Patient` - Core patient interface
- `PatientsResponse` - API response type

#### API Types (`api.d.ts`)
- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - Paginated API response
- `ApiError` - Error response format

#### Common Types (`common.d.ts`)
- `User` - User interface
- `BreadcrumbItemType` - Navigation breadcrumbs
- `QuestionCategory` - Question categories
- `MuscleSearchResult`, `QdrantSearchResponse` - Search result types
- `ComprehendMedicalEntity`, `QdrantResult` - AI/ML related types

### Constants and Type Helpers
Constants and type helpers need to be imported:

```typescript
// ✅ Import constants
import { APPOINTMENT_STATUS, APPOINTMENT_TYPE } from '@/types';
import { API_ENDPOINTS, TIME_SLOTS } from '@/types';

// ✅ Import type helpers
import type { AppointmentStatusType, PaymentStatusType } from '@/types';

// ✅ Import everything
import * as Types from '@/types';
```

### Type-Safe Usage
Type helpers provide type safety for constants:

```typescript
import type { AppointmentStatusType, PaymentStatusType } from '@/types';

function updateStatus(status: AppointmentStatusType) {
  // Type-safe status updates
}
```

## Best Practices

1. **Domain Organization**: Use separate `.d.ts` files for different domains
2. **Global Availability**: All types in `.d.ts` files are automatically global
3. **Constants**: Use `constants.ts` for all application constants and enum-like values
4. **Type Helpers**: Use `helpers.ts` for type-safe constants
5. **Imports**: Import from the main `index.ts` for clean imports
6. **Type Safety**: Use the provided type helpers for better type safety

## Adding New Types

### Adding a New Domain
Create a new `.d.ts` file for the domain:
```typescript
// types/new-domain.d.ts
declare global {
  interface NewDomainType {
    // ...
  }
}

export {};
```

### Adding to Existing Domain
Add to the appropriate `.d.ts` file:
```typescript
// In appointment.d.ts, doctor.d.ts, etc.
declare global {
  interface NewType {
    // ...
  }
}
```

### Adding Constants
Add to `constants.ts`:
```typescript
export const NEW_CONSTANTS = {
  VALUE1: 'value1',
  VALUE2: 'value2'
} as const
```

### Adding Type Helpers
Add to `helpers.ts`:
```typescript
import { NEW_CONSTANTS } from './constants';

export type NewConstantsType = typeof NEW_CONSTANTS[keyof typeof NEW_CONSTANTS];
```

## Benefits of This Structure

1. **Better Organization**: Each domain has its own file
2. **Easier Maintenance**: Find and update types quickly
3. **Better IDE Support**: Autocomplete shows relevant types
4. **Team Collaboration**: Multiple developers can work on different type files
5. **Reduced Conflicts**: Git merge conflicts are less likely
6. **Clearer Dependencies**: You can see what types depend on what
7. **Still Global**: All types remain globally available without imports 