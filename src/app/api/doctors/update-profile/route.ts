import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/services/databaseService';

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const doctor = await DatabaseService.getDoctorByClerkUserId(user.id);
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 });
    }
    const updates = await request.json();
    const updatedDoctor = await DatabaseService.updateDoctor(doctor.id, updates);
    if (!updatedDoctor) {
      return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: updatedDoctor });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    return NextResponse.json({ error: 'Failed to update doctor profile' }, { status: 500 });
  }
} 