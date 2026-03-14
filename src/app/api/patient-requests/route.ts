import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// ─── POST — called by the Twilio+AI calling backend after a call ends ───
// The calling backend sends the patient's phone number (not the DB id).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId: phone, summary, transcript } = body;

    // ── Validate required fields ────────────────────────────────────────
    if (!phone || typeof phone !== "string") {
      return NextResponse.json(
        { success: false, error: "patientId (phone number) is required and must be a string" },
        { status: 400 }
      );
    }

    if (!summary || typeof summary !== "string") {
      return NextResponse.json(
        { success: false, error: "summary is required and must be a string" },
        { status: 400 }
      );
    }

    // ── Look up the patient by phone number ─────────────────────────────
    let patient = await prisma.patient.findUnique({
      where: { phone },
    });

    // If no patient exists with this phone, create one automatically
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          phone,
          name: body.name || `Patient (${phone})`,
          email: body.email || `${phone}@auto.sehatsetu.in`,
          type: "call",
        },
      });
    }

    // ── Create the patient request ──────────────────────────────────────
    const patientRequest = await prisma.patientRequest.create({
      data: {
        patientId: patient.id, // store the actual DB id
        summary,
        transcript: transcript ?? null,
        // status defaults to PENDING via the schema
      },
      include: {
        patient: {
          select: {
            name: true,
            phone: true,
            email: true,
            gender: true,
            dateOfBirth: true,
            medicalHistory: true,
            allergies: true,
            currentMedications: true,
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, request: patientRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating patient request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET — called by the doctor dashboard to poll for requests ───────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";

    // Validate the status value
    const validStatuses = ["PENDING", "ACCEPTED", "RESOLVED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const requests = await prisma.patientRequest.findMany({
      where: {
        status: status as "PENDING" | "ACCEPTED" | "RESOLVED",
      },
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            gender: true,
            dateOfBirth: true,
            medicalHistory: true,
            allergies: true,
            currentMedications: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Error fetching patient requests:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH — update request status (doctor accepts/resolves) ─────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["ACCEPTED", "RESOLVED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updated = await prisma.patientRequest.update({
      where: { id },
      data: { status: status as "ACCEPTED" | "RESOLVED" },
      include: {
        patient: {
          select: { name: true, phone: true },
        },
      },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    console.error("Error updating patient request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
