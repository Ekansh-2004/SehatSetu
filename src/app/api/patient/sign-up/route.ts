import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, countryCode, dateOfBirth, gender, password, consentToAlerts } = body;

    // Phone is optional - only email is required as primary identifier
    if (!name || !email || !dateOfBirth || !gender || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, date of birth, gender and password are required' },
        { status: 400 }
      );
    }

    let finalPhone = phone?.trim() || null;
    const selectedCountryCode = countryCode || '+1';
    
    if (!finalPhone || finalPhone === selectedCountryCode) {
      const randomDigits = Array.from({ length: 10 }, () => 
        Math.floor(Math.random() * 10)
      ).join('');
      finalPhone = `${selectedCountryCode}${randomDigits}`;
    }

    // Build the OR conditions for existing patient check
    const orConditions: Array<{ email: string } | { phone: string }> = [{ email }];
    
    // Only check for phone conflict if phone is provided
    if (finalPhone && finalPhone.trim()) {
      orConditions.push({ phone: finalPhone.trim() });
    }

    // Check if patient already exists
    const existingPatient = await prisma.patient.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existingPatient) {
      if (existingPatient.email === email) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      if (finalPhone && finalPhone.trim() && existingPatient.phone === finalPhone.trim()) {
        return NextResponse.json(
          { success: false, error: 'An account with this phone number already exists' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const patient = await prisma.patient.create({
      data: {
        name,
        email,
        phone: finalPhone,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        password: hashedPassword,
        consentToAlerts: finalPhone ? (consentToAlerts || false) : false,
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
      },
    });

    // Create session cookie
    const cookieStore = await cookies();
    cookieStore.set('patient_session', patient.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
    });
  } catch (error) {
    console.error('Error signing up:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

