import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const dbStaff = await prisma.staff.findMany({
      where: { isActive: true },
      select: { id: true, clerkUserId: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    const staffById = new Map(
      dbStaff.map((s) => [s.clerkUserId || s.id, s])
    );

    // Fallback source: pull users directly from Clerk where role=staff.
    // This keeps dropdowns populated even if staff rows were not created in DB yet.
    try {
      const client = await clerkClient();
      const usersResult = await client.users.getUserList({ limit: 100 });

      for (const user of usersResult.data) {
        const roleUnsafe = user.unsafeMetadata?.role;
        const rolePublic = user.publicMetadata?.role;
        const role = (roleUnsafe || rolePublic || "").toString().toLowerCase();

        // Primary include: explicitly tagged staff users.
        const isStaffRole = role === "staff";

        // Temporary onboarding fallback:
        // include users that are not explicitly doctor/admin/patient when role is missing.
        const isLikelyStaffWithoutMetadata = !role || role === "user";
        const isExcludedRole = role === "doctor" || role === "admin" || role === "patient";

        if (!isStaffRole && (isExcludedRole || !isLikelyStaffWithoutMetadata)) continue;

        const key = user.id;
        if (staffById.has(key)) continue;

        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const email = user.emailAddresses?.[0]?.emailAddress || "";

        staffById.set(key, {
          id: user.id,
          clerkUserId: user.id,
          name: fullName || "Staff Member",
          email,
          role: "staff",
        });
      }
    } catch (clerkError) {
      console.warn("Clerk staff fallback failed:", clerkError);
    }

    const staff = Array.from(staffById.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ success: true, data: staff });
  } catch (error) {
    console.error("Error fetching staff list:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch staff" }, { status: 500 });
  }
}
