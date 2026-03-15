import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const prismaAny = prisma as any;
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prismaAny.notification.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const prismaAny = prisma as any;
    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const notificationId = String(body.notificationId || "").trim();

    if (!notificationId) {
      await prismaAny.notification.updateMany({
        where: { patientId, status: "UNREAD" },
        data: { status: "READ", readAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    await prismaAny.notification.updateMany({
      where: { id: notificationId, patientId },
      data: { status: "READ", readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ success: false, error: "Failed to update notifications" }, { status: 500 });
  }
}
