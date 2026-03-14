import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const patientFormId = String(body.patientFormId || "").trim();
    const doctorId = String(body.doctorId || "").trim();
    const symptoms = String(body.symptoms || "").trim();
    const preferredDateRaw = String(body.preferredDate || "").trim();
    const preferredTime = String(body.preferredTime || "").trim() || "TBD";

    if (!patientFormId || !doctorId || !symptoms || !preferredDateRaw) {
      return NextResponse.json(
        { success: false, error: "patientFormId, doctorId, symptoms and preferredDate are required" },
        { status: 400 }
      );
    }

    const preferredDate = new Date(preferredDateRaw);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid preferred date" }, { status: 400 });
    }

    const form = await prisma.patientFormSubmission.findUnique({
      where: { id: patientFormId },
      select: {
        id: true,
        patientId: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (!form) {
      return NextResponse.json({ success: false, error: "Patient form not found" }, { status: 404 });
    }

    if (!form.patientId) {
      return NextResponse.json(
        { success: false, error: "Patient record is not linked to this form" },
        { status: 400 }
      );
    }

    if (!["pending", "reviewed"].includes(form.status)) {
      return NextResponse.json(
        { success: false, error: "Only pending/reviewed forms can be processed" },
        { status: 409 }
      );
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true },
    });

    if (!doctor) {
      return NextResponse.json({ success: false, error: "Doctor not found" }, { status: 404 });
    }

    const consultation = await prisma.$transaction(async (tx) => {
      const created = await (tx as any).consultation.create({
        data: {
          consultationType: "PHYSICAL",
          status: "REQUESTED",
          patientId: form.patientId,
          doctorId,
          symptoms,
          preferredDate,
          preferredTime,
          patientName: form.name,
          patientPhone: form.phone || "Not provided",
          reportFileName: null,
        },
      });

      await tx.patientFormSubmission.update({
        where: { id: patientFormId },
        data: {
          status: "reviewed",
          notes: `Physical request mapped to consultation ${created.id}`,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: consultation }, { status: 201 });
  } catch (error) {
    console.error("Error creating consultation from patient form:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process physical consultation request" },
      { status: 500 }
    );
  }
}
