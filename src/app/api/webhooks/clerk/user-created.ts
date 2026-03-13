import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db/services/databaseService';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    if (event.type !== 'user.created') {
      return NextResponse.json({ error: 'Not a user.created event' }, { status: 400 });
    }

    const user = event.data;
    // You can adjust this logic to match your app's way of distinguishing doctors
    const isDoctor = user.unsafe_metadata?.role === 'doctor' || user.public_metadata?.role === 'doctor';
    if (!isDoctor) {
      return NextResponse.json({ success: true, message: 'Not a doctor, skipping.' });
    }

    // Check if doctor already exists
    const existingDoctor = await DatabaseService.getDoctorByClerkUserId(user.id);
    if (existingDoctor) {
      return NextResponse.json({ success: true, message: 'Doctor already exists.' });
    }

    // Create doctor record
    const doctorData = {
      clerkUserId: user.id,
      name: `Dr. ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Dr. Unknown',
      email: user.email_addresses?.[0]?.email_address || '',
      phone: user.phone_numbers?.[0]?.phone_number || '+1 (555) 000-0000',
      specialty: 'General Medicine',
      experience: 0,
      rating: 0,
      consultationFee: 100,
      location: 'Clinic Location TBD',
      bio: 'Professional healthcare provider',
      education: ['Medical Degree'],
      languages: ['English'],
      availability: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 30, breakTimes: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 30, breakTimes: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 30, breakTimes: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 30, breakTimes: [{ startTime: '12:00', endTime: '13:00' }] },
        { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', slotDuration: 30, breakTimes: [{ startTime: '12:00', endTime: '13:00' }] }
      ],
      isActive: true
    };

    const newDoctor = await DatabaseService.createDoctor(doctorData);
    return NextResponse.json({ success: true, data: newDoctor });
  } catch (error) {
    console.error('Error in Clerk user.created webhook:', error);
    return NextResponse.json({ error: 'Failed to create doctor record from webhook' }, { status: 500 });
  }
} 