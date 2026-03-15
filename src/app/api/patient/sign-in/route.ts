import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { 
  validateAndSanitize, 
  safeEmailSchema, 
  logSecurityEvent,
  detectSqlInjection
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
      '/api/patient/sign-in',
      RATE_LIMIT_CONFIGS.auth
    );
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit', {
        ip: clientId,
        endpoint: '/api/patient/sign-in',
      });
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const emailValidation = safeEmailSchema.safeParse(email);
    if (!emailValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const sqlCheck = detectSqlInjection(email);
    if (sqlCheck.isSuspicious) {
      logSecurityEvent('sql_injection', {
        ip: clientId,
        endpoint: '/api/patient/sign-in',
        input: email,
        patterns: sqlCheck.patterns,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
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

    const patient = await prisma.patient.findUnique({
      where: { email: sanitizedEmail },
      // Select only auth/session fields so sign-in is resilient to unrelated schema drift.
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        password: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    // Check if patient has a password set
    if (!patient.password) {
      return NextResponse.json(
        { success: false, error: 'Please set up your password first' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    const isValidPassword = await bcrypt.compare(password, patient.password);

    if (!isValidPassword) {
      logSecurityEvent('auth_failure', {
        ip: clientId,
        endpoint: '/api/patient/sign-in',
        userId: patient.id,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: rateLimitResult.headers }
      );
    }

    resetRateLimit(clientId, '/api/patient/sign-in');

    const cookieStore = await cookies();
    cookieStore.set('patient_session', patient.id, {
      httpOnly: true,                                    // Prevent XSS access
      secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
      sameSite: 'lax',                                  // CSRF protection
      maxAge: 60 * 60 * 24 * 7,                        // 7 days
      path: '/',                                        // Available site-wide
    });

    console.log(`[AUTH] Successful login for patient: ${patient.id}`);

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
    console.error('Error signing in:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

