# MongoDB to MySQL Migration Guide

This guide documents the successful migration from MongoDB to MySQL/PostgreSQL using Prisma ORM for the clinic application.

## Migration Overview

The application has been successfully migrated from MongoDB to MySQL with the following changes:

### Database Changes

- **From**: MongoDB with Mongoose ODM
- **To**: MySQL with Prisma ORM
- **Database**: AWS RDS MySQL instance
- **Connection**: `mysql://admin:YOUR_PASSWORD@your-rds-instance.rds.amazonaws.com:3306/clinic_app`

### Key Components Migrated

1. **Database Models**

   - `Doctor` → `doctors` table with `doctor_slots` relationship
   - `Patient` → `patients` table with flattened address/contact fields
   - `Appointment` → `appointments` table with foreign key relationships

2. **Database Service Layer**

   - `MongoService` → `PrismaService`
   - `DatabaseService` → Updated to use PrismaService
   - All CRUD operations maintained with same interface

3. **API Routes**
   - Updated to use new database service
   - Maintained backward compatibility
   - Improved error handling

## Database Schema

### Doctors Table

```sql
CREATE TABLE doctors (
  id VARCHAR(191) PRIMARY KEY,
  clerkUserId VARCHAR(191) UNIQUE,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) UNIQUE NOT NULL,
  phone VARCHAR(191) DEFAULT 'Not provided',
  specialty VARCHAR(191) NOT NULL,
  experience INT NOT NULL,
  rating DOUBLE PRECISION NOT NULL,
  consultationFee DOUBLE PRECISION NOT NULL,
  location VARCHAR(191) NOT NULL,
  bio TEXT NOT NULL,
  education JSON NOT NULL,
  languages JSON NOT NULL,
  image VARCHAR(191),
  isActive BOOLEAN DEFAULT true,
  defaultSessionDuration INT DEFAULT 30,
  maxPatientsPerDay INT DEFAULT 20,
  advanceBookingDays INT DEFAULT 30,
  createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL
);
```

### Doctor Slots Table

```sql
CREATE TABLE doctor_slots (
  id VARCHAR(191) PRIMARY KEY,
  doctorId VARCHAR(191) NOT NULL,
  startDate VARCHAR(191) NOT NULL,
  timeRanges VARCHAR(191) DEFAULT '[]',
  daysOfWeek JSON NOT NULL,
  isRecurring BOOLEAN DEFAULT false,
  repeatUntil VARCHAR(191),
  frequency VARCHAR(191) DEFAULT 'weekly',
  timeZone VARCHAR(191) NOT NULL,
  createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);
```

### Patients Table

```sql
CREATE TABLE patients (
  id VARCHAR(191) PRIMARY KEY,
  clerkUserId VARCHAR(191) UNIQUE NOT NULL,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) UNIQUE NOT NULL,
  phone VARCHAR(191) NOT NULL,
  dateOfBirth DATETIME(3) NOT NULL,
  gender VARCHAR(191) NOT NULL,
  street VARCHAR(191) NOT NULL,
  city VARCHAR(191) NOT NULL,
  state VARCHAR(191) NOT NULL,
  zipCode VARCHAR(191) NOT NULL,
  emergencyContactName VARCHAR(191) NOT NULL,
  emergencyContactPhone VARCHAR(191) NOT NULL,
  emergencyContactRelationship VARCHAR(191) NOT NULL,
  medicalHistory JSON NOT NULL,
  allergies JSON NOT NULL,
  currentMedications JSON NOT NULL,
  insuranceProvider VARCHAR(191),
  insurancePolicyNumber VARCHAR(191),
  insuranceGroupNumber VARCHAR(191),
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL
);
```

### Appointments Table

```sql
CREATE TABLE appointments (
  id VARCHAR(191) PRIMARY KEY,
  patientId VARCHAR(191),
  doctorId VARCHAR(191) NOT NULL,
  date DATETIME(3) NOT NULL,
  startTime VARCHAR(191) NOT NULL,
  endTime VARCHAR(191) NOT NULL,
  status VARCHAR(191) DEFAULT 'scheduled',
  type VARCHAR(191) DEFAULT 'consultation',
  reason TEXT NOT NULL,
  notes TEXT,
  symptoms JSON NOT NULL,
  diagnosis TEXT,
  prescription TEXT,
  followUpRequired BOOLEAN DEFAULT false,
  followUpDate DATETIME(3),
  paymentStatus VARCHAR(191) DEFAULT 'pending',
  paymentAmount DOUBLE PRECISION NOT NULL,
  stripePaymentIntentId VARCHAR(191),
  stripeSessionId VARCHAR(191),
  reminderSent BOOLEAN DEFAULT false,
  guestName VARCHAR(191),
  guestEmail VARCHAR(191),
  guestPhone VARCHAR(191),
  createdAt DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE SET NULL,
  FOREIGN KEY (doctorId) REFERENCES doctors(id) ON DELETE CASCADE
);
```

## Migration Steps Completed

### 1. Dependencies Installation

```bash
npm install mysql2 prisma @prisma/client
```

### 2. Prisma Setup

```bash
npx prisma init
```

### 3. Schema Definition

- Created `prisma/schema.prisma` with all models
- Defined relationships between tables
- Added proper indexes for performance

### 4. Database Migration

```bash
npx prisma migrate dev --name init
```

### 5. Data Seeding

```bash
npm run seed:mysql
```

### 6. Service Layer Updates

- Created `PrismaService` with all CRUD operations
- Updated `DatabaseService` to use PrismaService
- Maintained same interface for backward compatibility

### 7. API Route Updates

- Updated `/api/doctors` route to use new service
- Tested and verified functionality

## Environment Configuration

### Required Environment Variables

```env
# Database Configuration

DATABASE_URL="mysql://admin:YOUR_PASSWORD@your-rds-instance.rds.amazonaws.com:3306/clinic_app"
```

## Available Scripts

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema changes (development)
npm run db:push

# Seed database with mock data
npm run seed:mysql
```

## Data Migration Notes

### Structural Changes

1. **Embedded Documents → Separate Tables**: Doctor slots are now in a separate table with foreign key relationships
2. **Nested Objects → Flattened Fields**: Patient address and emergency contact are flattened into individual columns
3. **Arrays → JSON Fields**: Education, languages, symptoms, etc. are stored as JSON fields
4. **ObjectId → CUID**: Using CUID for primary keys instead of MongoDB ObjectId

### Data Transformation

- All existing mock data has been successfully migrated
- Doctor availability slots are properly structured
- Patient data includes all required fields
- Appointment relationships are maintained

## Performance Improvements

### Indexes Added

- Primary keys on all tables
- Foreign key indexes for relationships
- Status and date indexes for appointments
- Email and clerkUserId unique indexes

### Query Optimizations

- Prisma's query optimization
- Proper relationship loading with `include`
- Efficient filtering and sorting

## Testing

### API Endpoints Tested

- ✅ `GET /api/doctors` - Returns all doctors with slots
- ✅ `GET /api/doctors?specialty=Cardiology` - Filters by specialty
- ✅ Database seeding - All mock data successfully inserted

### Data Integrity Verified

- ✅ Doctor-slots relationships
- ✅ Foreign key constraints
- ✅ Unique constraints
- ✅ Data types and formats

## Next Steps

### Immediate Actions

1. Update remaining API routes to use new database service
2. Test all CRUD operations
3. Verify appointment booking flow
4. Update any remaining MongoDB references

### Future Enhancements

1. Add database connection pooling
2. Implement database backup strategy
3. Add database monitoring
4. Consider read replicas for scaling

## Rollback Plan

If needed, the application can be rolled back to MongoDB by:

1. Reverting environment variables
2. Restoring MongoDB service imports
3. Reverting API route changes
4. Restoring MongoDB models

## Troubleshooting

### Common Issues

1. **Connection Errors**: Verify DATABASE_URL format and network access
2. **Migration Failures**: Check database permissions and schema conflicts
3. **Type Errors**: Ensure Prisma client is generated after schema changes
4. **Performance Issues**: Monitor query performance and add indexes as needed

### Support

- Prisma documentation: https://www.prisma.io/docs
- MySQL documentation: https://dev.mysql.com/doc/
- AWS RDS documentation: https://docs.aws.amazon.com/rds/

## Migration Status

✅ **COMPLETED**: Core migration from MongoDB to MySQL
✅ **COMPLETED**: Database schema and relationships
✅ **COMPLETED**: Service layer updates
✅ **COMPLETED**: Basic API route updates
✅ **COMPLETED**: Data seeding and testing

🔄 **IN PROGRESS**: Remaining API route updates
⏳ **PENDING**: Full application testing
⏳ **PENDING**: Performance optimization
⏳ **PENDING**: Documentation updates
