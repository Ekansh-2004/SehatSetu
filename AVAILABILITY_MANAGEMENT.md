# Doctor Availability Management System

## Overview

The Doctor Availability Management System allows doctors to **manually configure their availability settings**, including session duration, days off, and weekly schedules. **No default availability is assumed** - doctors must explicitly set their working hours. This system is designed to be RDS-friendly for future database migrations.

### Key Principle: Doctor-Controlled Availability

- **No Default Availability**: Doctors start with empty availability and must configure it themselves
- **Full Control**: Doctors decide exactly when they are available
- **No Assumptions**: The system never assumes a doctor is available without explicit configuration
- **Patient Safety**: Patients only see availability that doctors have explicitly set

## Features

### 1. Weekly Schedule Management
- Set availability for each day of the week (Monday-Sunday)
- Configure start and end times for each day
- Set slot duration (15-120 minutes)
- Enable/disable specific days
- Add break times within working hours

### 2. Session Duration Settings
- Default session duration (15-120 minutes)
- Per-day slot duration override
- Flexible scheduling options

### 3. Days Off Management
- Select specific dates when unavailable
- Calendar-based date picker
- Easy removal of days off

### 4. Advanced Settings
- Timezone configuration
- Maximum patients per day (1-50)
- Advance booking days (1-365 days)
- Available until date (optional cutoff date)
- Break time management

### 5. Available Until Date
- Set a cutoff date after which no new appointments can be booked
- Useful for doctors going on vacation, retiring, or limiting their practice
- Optional field - leave empty for no limit
- Cannot be set to a past date
- Automatically filters out availability beyond the cutoff date

## Database Schema

### Doctor Model Updates

The Doctor model has been enhanced with new fields:

```typescript
interface Doctor {
  // ... existing fields ...
  
  // Enhanced availability management
  availability: DoctorAvailability[]
  defaultSessionDuration: number // in minutes, default 30
  daysOff: string[] // Array of dates in YYYY-MM-DD format
  timezone: string // e.g., "America/New_York"
  maxPatientsPerDay: number // maximum number of patients per day
  advanceBookingDays: number // how many days in advance patients can book
  availableUntil?: string // Date in YYYY-MM-DD format, after which no new appointments can be booked
}

interface DoctorAvailability {
  dayOfWeek: number // 1=Monday, 2=Tuesday, ..., 7=Sunday
  startTime: string // "09:00"
  endTime: string // "17:00"
  slotDuration: number // in minutes, e.g., 30
  isAvailable: boolean // whether this day is available
  breakTimes?: {
    startTime: string
    endTime: string
  }[]
}
```

## API Endpoints

### GET /api/doctors/availability
Retrieve doctor's availability settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "availability": [...],
    "defaultSessionDuration": 30,
    "daysOff": ["2024-01-15", "2024-01-16"],
    "timezone": "America/New_York",
    "maxPatientsPerDay": 20,
    "advanceBookingDays": 30,
    "availableUntil": "2024-12-31"
  }
}
```

### PUT /api/doctors/availability
Update doctor's availability settings.

**Request Body:**
```json
{
  "availability": [...],
  "defaultSessionDuration": 30,
  "daysOff": ["2024-01-15"],
  "timezone": "America/New_York",
  "maxPatientsPerDay": 20,
  "advanceBookingDays": 30
}
```

## UI Components

### Availability Page
Located at `/doctor/dashboard/availability`, this page provides:

1. **General Settings Section**
   - Default session duration
   - Maximum patients per day
   - Advance booking days
   - Timezone selection

2. **Weekly Schedule Section**
   - Day-by-day availability configuration
   - Start/end time selection
   - Slot duration per day
   - Break time management
   - Enable/disable days

3. **Days Off Section**
   - Calendar date picker
   - Selected days off display
   - Easy removal of days off

## Migration

### Running the Reset Script

To reset all doctor availability and force manual configuration:

```bash
# Using bun
bun run scripts/reset-doctor-availability.ts

# Using node
node -r ts-node/register scripts/reset-doctor-availability.ts
```

The reset script will:
- Remove all default availability settings
- Keep only essential default values (session duration, timezone, etc.)
- Force doctors to manually configure their availability
- Log all changes

### Reset Details

The reset removes all availability and sets only these essential defaults:
- `defaultSessionDuration`: 30 minutes
- `daysOff`: Empty array
- `timezone`: "UTC"
- `maxPatientsPerDay`: 20
- `advanceBookingDays`: 30
- `availability`: Empty array (doctors must configure manually)

### Important Note

**Doctors must manually configure their availability** - no default availability is assumed. This ensures that:
- Doctors have full control over their schedules
- No unintended availability is shown to patients
- Each doctor explicitly sets their working hours
- The system respects doctor preferences completely

## RDS Compatibility

The schema is designed to be easily migratable to RDS:

### Table Structure (Future RDS Migration)
```sql
CREATE TABLE doctors (
  id VARCHAR(255) PRIMARY KEY,
  clerk_user_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  -- ... other fields ...
  default_session_duration INT DEFAULT 30,
  timezone VARCHAR(50) DEFAULT 'UTC',
  max_patients_per_day INT DEFAULT 20,
  advance_booking_days INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE doctor_availability (
  id VARCHAR(255) PRIMARY KEY,
  doctor_id VARCHAR(255) REFERENCES doctors(id),
  day_of_week INT NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  slot_duration INT NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_break_times (
  id VARCHAR(255) PRIMARY KEY,
  availability_id VARCHAR(255) REFERENCES doctor_availability(id),
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_days_off (
  id VARCHAR(255) PRIMARY KEY,
  doctor_id VARCHAR(255) REFERENCES doctors(id),
  date_off DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Examples

### Setting Up Weekly Availability
1. Navigate to `/doctor/dashboard/availability`
2. Configure general settings (session duration, timezone, etc.)
3. Add days to the weekly schedule
4. Set start/end times and slot duration for each day
5. Add break times if needed
6. Save settings

### Managing Days Off
1. Click "Select date" in the Days Off section
2. Choose dates from the calendar
3. Selected dates appear as removable tags
4. Click the X button to remove a day off

### Break Time Management
1. In the Weekly Schedule section, click "Add Break" for a specific day
2. Set start and end times for the break
3. Multiple breaks can be added per day
4. Remove breaks using the X button

## Validation Rules

- **Session Duration**: 15-120 minutes
- **Max Patients Per Day**: 1-50
- **Advance Booking Days**: 1-365
- **Day of Week**: 1-7 (Monday-Sunday)
- **Time Format**: HH:mm (24-hour format)
- **Days Off**: YYYY-MM-DD format

## Error Handling

The system includes comprehensive error handling:
- Input validation with user-friendly error messages
- Database error handling
- Network error recovery
- Toast notifications for user feedback

## Future Enhancements

1. **Recurring Days Off**: Set recurring days off (e.g., every Monday)
2. **Holiday Calendar**: Integration with holiday calendars
3. **Emergency Availability**: Override normal schedule for emergencies
4. **Multi-location Support**: Different schedules for different locations
5. **Availability Templates**: Pre-configured availability patterns
6. **Conflict Detection**: Warn about scheduling conflicts
7. **Bulk Operations**: Update multiple days at once 