# MongoDB Setup Guide

This guide will help you set up MongoDB to replace the mock data in your clinic application.

## Prerequisites

1. **MongoDB Installation**: You need MongoDB installed and running locally, or a MongoDB Atlas account for cloud hosting.

2. **Node.js**: Ensure you have Node.js version 16.20.1 or higher installed.

## Setup Steps

### 1. Install Dependencies

The MongoDB dependencies have already been installed:
- `mongodb`: MongoDB driver for Node.js
- `mongoose`: MongoDB object modeling tool

### 2. Environment Configuration

Create or update your `.env.local` file with your MongoDB connection string:

```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/clinic-app

# For MongoDB Atlas (replace with your connection string)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/clinic-app?retryWrites=true&w=majority
```

### 3. Database Models

The following MongoDB models have been created:
- `Doctor`: Stores doctor information and availability
- `Patient`: Stores patient information and medical history
- `Appointment`: Stores appointment details and scheduling

### 4. Seed the Database

To populate the database with the existing mock data, run:

```bash
npm run seed
```

This will:
- Clear any existing data
- Insert the mock doctors, patients, and appointments
- Use the same IDs as the mock data for consistency

### 5. API Routes Updated

The following API routes have been updated to use MongoDB:
- `GET /api/doctors` - Fetch all doctors or filter by specialty
- `GET /api/doctors/[id]` - Fetch a specific doctor
- `GET /api/appointments` - Fetch appointments with various filters
- `POST /api/appointments` - Create new appointments
- `PUT /api/appointments` - Update existing appointments
- `DELETE /api/appointments` - Delete appointments

### 6. Database Service

A new `MongoService` class has been created in `src/lib/db/mongoService.ts` that provides the same interface as the previous `MockDatabase` but uses MongoDB operations.

## Migration from Mock Data

The application has been designed to maintain the same API interface, so existing frontend code should continue to work without changes. The main differences are:

1. **Async Operations**: All database operations are now asynchronous
2. **Real Persistence**: Data is now stored persistently in MongoDB
3. **Better Performance**: MongoDB provides better query performance for large datasets
4. **Scalability**: The application can now handle multiple users and concurrent operations

## Testing the Setup

1. Start your MongoDB server
2. Set up your environment variables
3. Run the seed script: `npm run seed`
4. Start the development server: `npm run dev`
5. Test the API endpoints to ensure they're working with MongoDB

## Troubleshooting

### Connection Issues
- Ensure MongoDB is running on the specified port
- Check your connection string format
- Verify network connectivity for cloud MongoDB instances

### Data Issues
- Run the seed script again if data is missing
- Check MongoDB logs for any errors
- Verify the database and collection names

### Performance Issues
- Consider adding database indexes for frequently queried fields
- Monitor MongoDB performance metrics
- Optimize queries if needed

## Next Steps

1. **Add Authentication**: Consider adding user authentication and authorization
2. **Data Validation**: Add more robust data validation using Mongoose schemas
3. **Error Handling**: Implement comprehensive error handling for database operations
4. **Backup Strategy**: Set up regular database backups
5. **Monitoring**: Add database monitoring and logging

## Files Modified

- `src/lib/db/mongodb.ts` - MongoDB connection setup
- `src/lib/db/models/` - Mongoose models for Doctor, Patient, and Appointment
- `src/lib/db/mongoService.ts` - Database service layer
- `src/lib/db/seed.ts` - Database seeding script
- `src/app/api/doctors/route.ts` - Updated to use MongoDB
- `src/app/api/doctors/[id]/route.ts` - Updated to use MongoDB
- `src/app/api/appointments/route.ts` - Updated to use MongoDB
- `package.json` - Added seed script
- `scripts/seed-db.ts` - Database seeding runner 