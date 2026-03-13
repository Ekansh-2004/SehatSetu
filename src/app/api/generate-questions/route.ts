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
Based on this medical conversation transcript, generate relevant follow-up questions for the healthcare provider.

TRANSCRIPT:
${transcript}

Return a JSON object with a "questions" array containing categories and their questions. Use this exact JSON structure:
{
  "questions": [
    {
      "id": "symptom-clarification",
      "category": "Symptom Clarification",
      "questions": ["Question 1"]
    }
  ]
}

Only return the raw JSON object, do not return any other text or markdown formatting.
`;

    const ollamaResponse = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json' // Force Ollama to output JSON
      }),
    });

    if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
    }

    const response = await ollamaResponse.json();
    const content = response.response?.trim();
    
    if (appointmentId) {
      try {
        await callAnalyticsService('/api/analytics/track-tokens', {
          method: 'POST',
          body: JSON.stringify({
            appointmentId,
            questionsTokens: 0,
            questionsInputTokens: 0,
            questionsOutputTokens: 0
          })
        }).catch(error => {
          console.error('Failed to track questions tokens:', error);
        });
      } catch (error) {
        console.error('Failed to track questions tokens:', error);
      }
    }
    
    try {
      const parsed = JSON.parse(content || '{"questions": []}');
      const questions = parsed.questions || [];
      return NextResponse.json({ questions });
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', parseError);
      // Fallback
      const defaultQuestions = [{
          id: "general-assessment",
          category: "General Assessment",
          questions: ["Can you rate your pain on a scale of 1-10?"]
      }];
      return NextResponse.json({ questions: defaultQuestions });
    }
  } catch (error) {
    console.error('Ollama Question Generation Error:', error);
    return NextResponse.json(
      { error: 'Question generation failed' },
      { status: 500 }
    );
  }
}