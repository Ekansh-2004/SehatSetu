import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

interface SendMailBody {
  patientName: string;
  patientEmail: string;
  toEmail: string;
  presignedUrl: string;
  subject?: string;
}

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SendMailBody>;

    const patientName = (body.patientName || '').trim();
    const patientEmail = (body.patientEmail || '').trim();
    const toEmail = (body.toEmail || '').trim();
    const presignedUrl = (body.presignedUrl || '').trim();
    const subject = (body.subject || 'Your Consultation Report').trim();

    if (!patientName || !patientEmail || !toEmail || !presignedUrl) {
      return NextResponse.json(
        {
          error:
            'Required fields: patientName, patientEmail, toEmail, presignedUrl',
        },
        { status: 400 }
      );
    }

    const smtpHost = 'smtp.resend.com';
    const smtpPort = 465;
    const smtpUser = 'resend';
    const smtpPass = getEnv('RESEND_API_KEY');
    const secure = true;

    // Use patient-provided details as the From address as requested
    //@123 Need to check later hardcoded for now
    // const fromAddress = `${patientName} <${patientEmail}>`;
    const fromAddress = 'info@fibonacciservices.com';
    // Fetch the PDF bytes from the presigned S3 URL
    const pdfResponse = await fetch(presignedUrl);
    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch attachment: ${pdfResponse.status} ${pdfResponse.statusText}` },
        { status: 400 }
      );
    }
    const arrayBuffer = await pdfResponse.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Derive a filename from URL or default
    const inferredName = presignedUrl.split('?')[0].split('/').pop() || 'report.pdf';
    const filename = inferredName.endsWith('.pdf') ? inferredName : `${inferredName}.pdf`;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const html = `Hi ${patientName},<br/><br/>Please find attached your report from recent consultation.<br/><br/><strong>NOTE</strong> - This email has been generated from the sandbox environment, and has therefore been routed to this email address instead of the listed recipient.`;
    const text = `Hi ${patientName},\n\nPlease find attached your report from recent consultation.\n\nNOTE - This email has been generated from the sandbox environment, and has therefore been routed to this email address instead of the listed recipient.`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Mail send error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 