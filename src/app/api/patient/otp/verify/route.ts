import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { otpStore } from '@/lib/otp-store';
import { 
  validateAndSanitize,
  logSecurityEvent
} from '@/lib/security/input-sanitizer';
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS,
  getClientIdentifier,
  resetRateLimit
} from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  
  try {
    const rateLimitResult = await withRateLimit(
      request,
      '/api/patient/otp/verify',
      RATE_LIMIT_CONFIGS.otp
    );
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit', {
        ip: clientId,
        endpoint: '/api/patient/otp/verify',
      });
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const sanitizedEmail = validateAndSanitize(email, { type: 'email' });
    if (!sanitizedEmail) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // Validate OTP format (6 digits only)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // Get stored OTP
    const otpKey = sanitizedEmail;
    const storedOtp = otpStore.get(otpKey);

    if (!storedOtp) {
      return NextResponse.json(
        { success: false, error: 'OTP not found or expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if OTP expired
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(otpKey);
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Verify OTP
    if (storedOtp.code !== otp) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      );
    }

    // OTP is valid, find patient and create session
    const patient = await prisma.patient.findUnique({
      where: { email: storedOtp.email },
    });

    if (!patient) {
      otpStore.delete(otpKey);
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Delete used OTP
    otpStore.delete(otpKey);
    
    resetRateLimit(clientId, '/api/patient/otp/verify');
    resetRateLimit(clientId, '/api/patient/otp/send');

    const cookieStore = await cookies();
    cookieStore.set('patient_session', patient.id, {
      httpOnly: true,                                    // Prevent XSS access
      secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
      sameSite: 'lax',                                  // CSRF protection
      maxAge: 60 * 60 * 24 * 7,                        // 7 days
      path: '/',
    });

    console.log(`[OTP] Successful verification for patient: ${patient.id}`);

    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
    }, { headers: rateLimitResult.headers });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

