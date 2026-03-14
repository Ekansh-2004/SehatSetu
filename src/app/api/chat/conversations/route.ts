import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

// GET — list all chat sessions for the authenticated patient (with messages)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json(
        { success: false, error: "No active session" },
        { status: 401 }
      );
    }

    const sessions = await prisma.chatSession.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — create a new chat session
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
    const title = body.title || "New chat";

    const session = await prisma.chatSession.create({
      data: { patientId, title },
      include: { messages: true },
    });

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat session:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
