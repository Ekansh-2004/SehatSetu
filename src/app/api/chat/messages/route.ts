import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

// POST — create a new message in a chat session
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "No active session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      sessionId,
      sender,
      text,
      emergency = false,
      symptoms,
      possible_diseases,
      recommendations,
      follow_up_questions,
    } = body;

    if (!sessionId || !sender || !text) {
      return NextResponse.json(
        { success: false, error: "sessionId, sender, and text are required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to this patient
    const session = await prisma.chatSession.findFirst({
      where: { id: sessionId, patientId },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        sender,
        text,
        emergency,
        symptoms: symptoms ?? undefined,
        possible_diseases: possible_diseases ?? undefined,
        recommendations: recommendations ?? undefined,
        follow_up_questions: follow_up_questions ?? undefined,
      },
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat message:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
