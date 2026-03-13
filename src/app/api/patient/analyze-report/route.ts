import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientSessionId = cookieStore.get('patient_session')?.value;

    if (!patientSessionId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientSessionId } });
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const body = await request.json();
    const { fileName, mimeType, fileDataBase64, notes } = body;

    if (!fileName || !mimeType || !fileDataBase64) {
      return NextResponse.json({ success: false, error: 'fileName, mimeType and fileDataBase64 are required' }, { status: 400 });
    }

    // For now: do a lightweight "analysis" by decoding base64 and returning a mock summary.
    // In a real implementation you would run OCR, call an ML model, or forward the file to a specialized service.
    let extractedText = '';
    try {
      // Decode a small prefix to emulate extracted text
      const decoded = Buffer.from(fileDataBase64, 'base64').slice(0, 1024).toString('utf-8');
      // Strip non-printables
      extractedText = decoded.replace(/[^\x20-\x7E\n\r]/g, '');
    } catch (err) {
      console.error('Failed to decode incoming file base64:', err);
      extractedText = '';
    }

    // Very small heuristic: look for common report keywords
    const lower = extractedText.toLowerCase();
    const findings: string[] = [];
    if (lower.includes('cholesterol') || lower.includes('ldl') || lower.includes('hdl')) findings.push('Lipid panel values detected');
    if (lower.includes('glucose') || lower.includes('hba1c')) findings.push('Glucose / diabetes markers detected');
    if (lower.includes('hemoglobin') || lower.includes('rbc')) findings.push('CBC-like values detected');
    if (findings.length === 0) findings.push('No clear structured lab headings detected — recommend OCR + NLP pipeline');

    const summary = `Found ${findings.length} clue(s): ${findings.join('; ')}.` + (notes ? ` Notes: ${notes}` : '');

    return NextResponse.json({ success: true, data: { extractedText: extractedText || undefined, summary } });
  } catch (error) {
    console.error('Error analyzing report:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
