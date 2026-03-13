# Appointment Scheduling System with Stripe Payment Integration

## Overview

This system provides a complete appointment scheduling flow for patients to:
1. **Select a Doctor** - Browse available healthcare professionals
2. **Choose Time Slots** - View and select available appointment times
3. **Make Payment** - Secure payment processing via Stripe
4. **Get Confirmation** - Receive appointment confirmation after successful payment

## Features

### 🏥 **Multi-Step Booking Process**
- **Step 1**: Doctor selection with ratings, specialties, and pricing
- **Step 2**: Available time slot selection by date
- **Step 3**: Payment confirmation and processing
- **Step 4**: Success confirmation with appointment details

### 💳 **Stripe Payment Integration**
- Secure Stripe Checkout sessions
- Real-time payment verification
- Automatic redirect after successful payment
- Error handling for failed payments

### 🎨 **Professional UI/UX**
- Clean, medical-themed interface
- Progress indicators
- Responsive design
- Loading states and error handling

## Setup Instructions

### 1. **Environment Variables**

Create a `.env.local` file in your project root with:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here

# App Configuration  
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Clerk Authentication (already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

### 2. **Stripe Account Setup**

1. **Create Stripe Account**: Go to [stripe.com](https://stripe.com) and create an account
2. **Get API Keys**: 
   - Go to Developers → API Keys
   - Copy your **Publishable key** (starts with `pk_test_`)
   - Copy your **Secret key** (starts with `sk_test_`)
3. **Test Mode**: Ensure you're in test mode for development

### 3. **Test Payment Cards**

Use these test card numbers in Stripe Checkout:

- **Success**: `4242 4242 4242 4242`
- **Declined**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any postal code.

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── create-checkout-session/
│   │   │   └── route.ts                 # Stripe Checkout API
│   │   └── create-payment-intent/
│   │       └── route.ts                 # Alternative Payment API
│   └── patient/
│       └── schedule/
│           ├── page.tsx                 # Main scheduling page
│           └── success/
│               └── page.tsx             # Payment success page
```

## How It Works

### 1. **Doctor Selection**
- Displays list of available doctors
- Shows specialty, rating, experience, and consultation fee
- Click to select and proceed to time slot selection

### 2. **Time Slot Selection**
- Shows available slots for the selected doctor
- Organized by date with time options
- Click on any available slot to proceed to payment

### 3. **Payment Processing**
- Creates Stripe Checkout session
- Redirects to secure Stripe payment page
- Handles success/failure redirects
- Stores appointment metadata in Stripe

### 4. **Confirmation**
- Verifies payment status with Stripe
- Displays appointment confirmation
- Provides next steps and important notes

## API Endpoints

### `POST /api/create-checkout-session`
Creates a Stripe Checkout session for appointment payment.

**Request Body:**
```json
{
  "amount": 15000,           // Amount in cents ($150.00)
  "doctorId": 1,
  "doctorName": "Dr. Sarah Smith",
  "date": "2025-06-26",
  "time": "09:00",
  "patientEmail": "patient@example.com"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### `GET /api/create-checkout-session?session_id=cs_test_...`
Verifies payment and retrieves appointment details.

**Response:**
```json
{
  "success": true,
  "appointmentDetails": {
    "doctorId": "1",
    "date": "2025-06-26", 
    "time": "09:00",
    "amount": 150
  }
}
```

## Integration with Existing App

### 1. **Navigation Integration**
The "Schedule Now" button in the patient dashboard (`/patient/dashboard`) now links to `/patient/schedule`.

### 2. **Role-Based Access**
- Only patients can access the scheduling system
- Automatic redirect to appropriate dashboard based on user role

### 3. **Appointment Management**
- After successful booking, users can view appointments in `/patient/dashboard/appointments`
- Integration with existing appointment calendar system

## Customization Options

### 1. **Doctor Data**
Modify the `doctorsData` array in `/patient/schedule/page.tsx` to add/remove doctors:

```typescript
const doctorsData = [
  {
    id: 1,
    name: "Dr. Sarah Smith",
    specialty: "General Medicine",
    rating: 4.8,
    experience: "15 years",
    consultationFee: 150,
    location: "Medical Center A",
    availableSlots: [
      { date: "2025-06-26", slots: ["09:00", "10:00", "11:00"] }
    ]
  }
]
```

### 2. **Pricing**
- Consultation fees are stored per doctor
- Easily modify pricing in the doctor data
- Stripe handles all currency formatting

### 3. **Available Slots**
- Currently hardcoded per doctor
- Can be integrated with a real calendar/booking system
- Easy to extend with database integration

## Next Steps for Production

1. **Database Integration**
   - Store appointments in database
   - Manage doctor availability dynamically
   - Track payment history

2. **Email Notifications**
   - Send confirmation emails after booking
   - Reminder emails before appointments
   - Integration with email service (SendGrid, etc.)

3. **Calendar Integration**
   - Sync with Google Calendar
   - Doctor calendar management
   - Automated scheduling

4. **Advanced Features**
   - Appointment rescheduling
   - Cancellation with refunds
   - Recurring appointments
   - Waiting list functionality

## Testing the System

1. **Start the development server**: `npm run dev` or `bun dev`
2. **Navigate to patient dashboard**: Sign in as a patient
3. **Click "Schedule Now"**: This will take you to `/patient/schedule`
4. **Complete the booking flow**:
   - Select a doctor
   - Choose an available time slot
   - Complete payment with test card `4242 4242 4242 4242`
   - View confirmation page

## Support

For any issues with the appointment scheduling system:
1. Check Stripe dashboard for payment logs
2. Review browser console for JavaScript errors
3. Check server logs for API errors
4. Ensure all environment variables are set correctly

The system is designed to be production-ready with proper error handling, loading states, and user feedback throughout the entire booking process. 