import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    const prismaAny = prisma as any;
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") || "patient").toLowerCase();

    if (role === "doctor") {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      const doctor = await prisma.doctor.findFirst({ where: { clerkUserId: user.id }, select: { id: true } });
      if (!doctor) {
        return NextResponse.json({ success: false, error: "Doctor not found" }, { status: 404 });
      }

      const consultations = await prismaAny.consultation.findMany({
        where: { doctorId: doctor.id },
        orderBy: { createdAt: "desc" },
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, data: consultations });
    }

    if (role === "staff") {
      const statusParam = searchParams.get("status")?.toUpperCase();
      const consultations = await prismaAny.consultation.findMany({
        where: statusParam
          ? { status: statusParam as "REQUESTED" | "SCHEDULED" | "COMPLETED" }
          : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true,
              clinicAddress: true,
              address: true,
            },
          },
          patient: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, data: consultations });
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const consultations = await prismaAny.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            clinicAddress: true,
            address: true,
            location: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: consultations });
  } catch (error) {
    console.error("Error fetching consultations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch consultations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prismaAny = prisma as any;
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, phone: true },
    });

    if (!patient) {
      return NextResponse.json({ success: false, error: "Patient not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const doctorId = String(formData.get("doctorId") || "").trim();
    const patientName = String(formData.get("patientName") || patient.name || "").trim();
    const phoneNumber = String(formData.get("phoneNumber") || patient.phone || "").trim();
    const symptoms = String(formData.get("symptoms") || "").trim();
    const preferredDateRaw = String(formData.get("preferredDate") || "").trim();
    const preferredTime = String(formData.get("preferredTime") || "").trim() || "TBD";
    const reportFile = formData.get("report") as File | null;

    if (!doctorId || !patientName || !phoneNumber || !symptoms || !preferredDateRaw) {
      return NextResponse.json(
        { success: false, error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    const preferredDate = new Date(preferredDateRaw);
    if (Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid preferred date" }, { status: 400 });
    }

    const consultation = await prismaAny.consultation.create({
      data: {
        consultationType: "PHYSICAL",
        status: "REQUESTED",
        patientId,
        doctorId,
        symptoms,
        preferredDate,
        preferredTime,
        patientName,
        patientPhone: phoneNumber,
        reportFileName: reportFile?.name || null,
      },
      include: {
        doctor: {
          select: { id: true, name: true, specialty: true, clinicAddress: true, address: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: consultation }, { status: 201 });
  } catch (error) {
    console.error("Error creating consultation request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create consultation request" },
      { status: 500 }
    );
  }
}
