import { NextRequest, NextResponse } from 'next/server';
import { callAnalyticsService } from "@/lib/config/analytics-service";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3';

export async function POST(request: NextRequest) {
  try {
    const { transcript, appointmentId } = await request.json();

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    const prompt = `
You are a medical AI assistant. Analyze this medical conversation transcript and create a comprehensive clinical summary in markdown format.

TRANSCRIPT:
${transcript}

Sections to include:
## Chief Complaint
## Present Illness
## Assessment
## Symptoms Reported
## Medical History Discussion
## Plan/Recommendations
## Additional Notes

Keep the summary comprehensive but concise. Focus on clinically relevant information only. Do not add any introductory text.
`;

    // Fetch from Ollama instead of OpenAI
    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!ollamaResponse.ok) {
       throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const response = await ollamaResponse.json();
    const summary = response.response?.trim();
    
    // We send 0 as tokens for Ollama to not break the analytics database schema
    if (appointmentId) {
      try {
        await callAnalyticsService('/api/analytics/track-tokens', {
          method: 'POST',
          body: JSON.stringify({
            appointmentId,
            summaryTokens: 0,
            summaryInputTokens: 0,
            summaryOutputTokens: 0
          })
        }).catch(error => {
          console.error('Failed to track tokens (Ollama bypassed):', error);
        });
      } catch (error) {
        console.error('Failed to track tokens:', error);
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Ollama Summarization Error:', error);
    return NextResponse.json(
      { error: 'Summarization failed' },
      { status: 500 }
    );
  }
} 