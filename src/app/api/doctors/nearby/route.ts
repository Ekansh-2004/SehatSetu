import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { haversineDistanceKm } from "@/lib/geo";

const MAX_RADIUS_KM = 500;

async function ensureLocationColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "patients"
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "doctors"
    ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS "clinicAddress" TEXT,
    ADD COLUMN IF NOT EXISTS "address" TEXT
  `);
}

export async function GET(request: NextRequest) {
  try {
    try {
      await ensureLocationColumns();
    } catch {
      // Continue; request may still work in restricted DB setups.
    }

    const { searchParams } = new URL(request.url);
    const patientIdParam = String(searchParams.get("patientId") || "").trim();

    const latParam = searchParams.get("patient_latitude");
    const lngParam = searchParams.get("patient_longitude");
    let patientLatitude = latParam !== null ? Number(latParam) : NaN;
    let patientLongitude = lngParam !== null ? Number(lngParam) : NaN;

    if (!Number.isFinite(patientLatitude) || !Number.isFinite(patientLongitude)) {
      if (patientIdParam) {
        const patientRows = await prisma.$queryRaw<Array<{ latitude: number | null; longitude: number | null }>>`
          SELECT "latitude", "longitude"
          FROM "patients"
          WHERE "id" = ${patientIdParam}
          LIMIT 1
        `;

        const patient = patientRows[0];
        if (patient?.latitude != null && patient?.longitude != null) {
          patientLatitude = patient.latitude;
          patientLongitude = patient.longitude;
        }
      }

      if (Number.isFinite(patientLatitude) && Number.isFinite(patientLongitude)) {
        // resolved from patientId
      } else {
      const cookieStore = await cookies();
      const patientId = cookieStore.get("patient_session")?.value;

      if (patientId) {
        const patientRows = await prisma.$queryRaw<Array<{ latitude: number | null; longitude: number | null }>>`
          SELECT "latitude", "longitude"
          FROM "patients"
          WHERE "id" = ${patientId}
          LIMIT 1
        `;

        const patient = patientRows[0];
        if (patient?.latitude != null && patient?.longitude != null) {
          patientLatitude = patient.latitude;
          patientLongitude = patient.longitude;
        }
      }
      }
    }

    if (!Number.isFinite(patientLatitude) || !Number.isFinite(patientLongitude)) {
      return NextResponse.json(
        { success: false, error: "Patient latitude and longitude are required." },
        { status: 400 }
      );
    }


    const doctors = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        specialty: string;
        clinicAddress: string | null;
        address: string | null;
        location: string | null;
        latitude: number;
        longitude: number;
        availabilityCount: bigint;
      }>
    >`
      SELECT
        d."id",
        d."name",
        d."specialty",
        d."clinicAddress",
        d."address",
        d."location",
        d."latitude",
        d."longitude",
        COUNT(ds."id") AS "availabilityCount"
      FROM "doctors" d
      LEFT JOIN "doctor_slots" ds ON ds."doctorId" = d."id"
      WHERE d."isActive" = true
        AND d."latitude" IS NOT NULL
        AND d."longitude" IS NOT NULL
      GROUP BY d."id"
    `;


    const nearbyDoctors = doctors
      .map((doctor) => {
        const distance = haversineDistanceKm(
          patientLatitude,
          patientLongitude,
          doctor.latitude as number,
          doctor.longitude as number
        );


        const availabilityStatus = Number(doctor.availabilityCount) > 0 ? "Available" : "Unavailable";

        return {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          specialization: doctor.specialty,
          clinicAddress: doctor.clinicAddress || doctor.address || doctor.location || "Address not updated",
          distance: Number(distance.toFixed(2)),
          availabilityStatus,
        };
      })
      .filter((doctor) => doctor.distance <= MAX_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({
      success: true,
      data: nearbyDoctors,
      radiusKm: MAX_RADIUS_KM,
    });
  } catch (error) {
    console.error("Error fetching nearby doctors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch nearby doctors" },
      { status: 500 }
    );
  }
}
