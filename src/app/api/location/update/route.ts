import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { reverseGeocodeAddress } from "@/lib/geo";
import { DatabaseService } from "@/lib/db/services/databaseService";

type Role = "doctor" | "patient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const role = (body.role as Role) || "patient";
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { success: false, error: "Latitude and longitude are required." },
        { status: 400 }
      );
    }

    if (role === "doctor") {
      const user = await currentUser();
      if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }

      const address = await reverseGeocodeAddress(latitude, longitude);
      const rows = await prisma.$queryRaw<unknown[]>`
        UPDATE "doctors"
        SET
          "latitude" = ${latitude},
          "longitude" = ${longitude},
          "clinicAddress" = ${address || null},
          "address" = ${address || null},
          "location" = COALESCE(${address || null}, "location"),
          "updatedAt" = ${new Date()}
        WHERE "clerkUserId" = ${user.id}
        RETURNING "id"
      `;

      if (!rows.length) {
        // Self-heal: create a minimal doctor profile for first-time users.
        const primaryEmail = user.emailAddresses?.[0]?.emailAddress || `${user.id}@sehatsetu.local`;
        const firstName = user.firstName || "";
        const lastName = user.lastName || "";
        const fullName = `Dr. ${firstName} ${lastName}`.trim() || "Dr. Unknown";
        const primaryPhone = user.phoneNumbers?.[0]?.phoneNumber || "+1 (555) 000-0000";

        const existingByEmail = await prisma.doctor.findUnique({
          where: { email: primaryEmail },
          select: { id: true },
        });

        if (existingByEmail) {
          await prisma.doctor.update({
            where: { id: existingByEmail.id },
            data: { clerkUserId: user.id, updatedAt: new Date() },
          });
        } else {
          await DatabaseService.createDoctor({
            clerkUserId: user.id,
            name: fullName,
            email: primaryEmail,
            phone: primaryPhone,
            specialty: "General Medicine",
            experience: 0,
            rating: 0,
            consultationFee: 100,
            location: address || "Clinic Location TBD",
            bio: "Professional healthcare provider",
            education: ["Medical Degree"],
            languages: ["English"],
            isActive: true,
          });
        }

        await prisma.$queryRaw`
          UPDATE "doctors"
          SET
            "latitude" = ${latitude},
            "longitude" = ${longitude},
            "clinicAddress" = ${address || null},
            "address" = ${address || null},
            "location" = COALESCE(${address || null}, "location"),
            "updatedAt" = ${new Date()}
          WHERE "clerkUserId" = ${user.id}
        `;
      }

      return NextResponse.json({ success: true, message: "Doctor location updated" });
    }

    const cookieStore = await cookies();
    const patientId = cookieStore.get("patient_session")?.value;

    if (!patientId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$queryRaw`
      UPDATE "patients"
      SET
        "latitude" = ${latitude},
        "longitude" = ${longitude},
        "updatedAt" = ${new Date()}
      WHERE "id" = ${patientId}
    `;

    return NextResponse.json({ success: true, message: "Patient location updated" });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update location" },
      { status: 500 }
    );
  }
}
