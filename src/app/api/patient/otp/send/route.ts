import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import nodemailer from 'nodemailer';
import { otpStore } from '@/lib/otp-store';
import { 
  validateAndSanitize,
  detectSqlInjection,
  logSecurityEvent
} from '@/lib/security/input-sanitizer';
import { 
  withRateLimit, 
  RATE_LIMIT_CONFIGS,
  getClientIdentifier
} from '@/lib/security/rate-limiter';

export const runtime = 'nodejs';

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  return value;
}

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  
  try {
    const rateLimitResult = await withRateLimit(
      request,
      '/api/patient/otp/send',
      RATE_LIMIT_CONFIGS.otp
    );
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit', {
        ip: clientId,
        endpoint: '/api/patient/otp/send',
      });
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
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

    if (detectSqlInjection(email).isSuspicious) {
      logSecurityEvent('sql_injection', {
        ip: clientId,
        endpoint: '/api/patient/otp/send',
        input: email,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    // Check if patient exists
    const patient = await prisma.patient.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    const otpKey = email.toLowerCase().trim();
    otpStore.set(otpKey, {
      code: otpCode,
      expiresAt,
      email: email.toLowerCase().trim(),
    });

    // Send OTP email using nodemailer (same as other email routes)
    try {
      const smtpHost = 'smtp.resend.com';
      const smtpPort = 465;
      const smtpUser = 'resend';
      const smtpPass = getEnv('RESEND_API_KEY');
      const fromEmail = getEnv('SMTP_FROM_EMAIL', 'info@fibonacciservices.com');

      if (!smtpUser || !smtpPass) {
        otpStore.delete(otpKey);
        return NextResponse.json(
          { success: false, error: 'Email service not configured. Please contact support.' },
          { status: 500 }
        );
      }

      const secure = true;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure,
        auth: { user: smtpUser, pass: smtpPass },
      });

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Your Login OTP</h1>
              <p style="color: #666; font-size: 16px;">One-Time Password for secure sign-in</p>
            </div>
            
            <p style="color: #333; font-size: 16px;">Hi ${patient.name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Your One-Time Password (OTP) for logging into your Clinix account is:
            </p>
            
            <div style="background-color: #f3f4f6; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; border: 2px dashed #d1d5db;">
              <h1 style="color: #2563eb; font-size: 40px; margin: 0; letter-spacing: 10px; font-family: monospace;">${otpCode}</h1>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⏰ This OTP will expire in <strong>10 minutes</strong>.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you didn't request this OTP, please ignore this email.
            </p>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated message, please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Your Clinix Login OTP',
        html: emailHtml,
        text: `Hi ${patient.name},\n\nYour OTP for logging into Clinix is: ${otpCode}\n\nThis OTP will expire in 10 minutes.\n\nIf you didn't request this OTP, please ignore this email.`,
      });

    } catch (emailError) {
      console.error('Error sending OTP email:', emailError);
      otpStore.delete(otpKey);
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email address',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
