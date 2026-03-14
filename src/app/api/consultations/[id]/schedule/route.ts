import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DateTime } from "luxon";
import { CLINIC_TIMEZONE } from "@/lib/config/timezone";
import { DatabaseService } from "@/lib/db/services/databaseService";
import { RRuleSlotManager } from "@/lib/utils/rruleSlots";

async function isDoctorSlotAvailable(
  doctorId: string,
  dateIso: string,
  time?: string | null
) {
  const doctor = await DatabaseService.getDoctorById(doctorId);

  if (!doctor || !doctor.slots || doctor.slots.length === 0) {
    return false;
  }

  const maxDays = doctor.advanceBookingDays || 14;
  const generatedAvailability: Array<{ date: string; slots: Array<{ time: string; isAvailable: boolean }> }> = [];

  for (const configuredSlot of doctor.slots || []) {
    if (!configuredSlot.timeRanges || configuredSlot.timeRanges.length === 0) {
      continue;
    }

    const startDate = DateTime.fromISO(configuredSlot.startDate, { zone: CLINIC_TIMEZONE }).toJSDate();
    const endDate = configuredSlot.repeatUntil
      ? DateTime.fromISO(configuredSlot.repeatUntil, { zone: CLINIC_TIMEZONE }).toJSDate()
      : undefined;

    const rruleString = RRuleSlotManager.createRRuleString({
      startDate,
      endDate,
      daysOfWeek: configuredSlot.daysOfWeek,
      frequency: configuredSlot.isRecurring ? (configuredSlot.frequency || "weekly") : "daily",
    });

    const slotAvailability = await RRuleSlotManager.generateAvailabilitySlots(
      configuredSlot.timeRanges as IAvailabilityTimeRange[],
      rruleString,
      maxDays,
      doctor.defaultSessionDuration || 30,
      doctorId
    );

    slotAvailability.forEach((availabilityDay) => {
      const existingDay = generatedAvailability.find((day) => day.date === availabilityDay.date);
      if (existingDay) {
        availabilityDay.slots.forEach((availabilitySlot) => {
          if (!existingDay.slots.find((daySlot) => daySlot.time === availabilitySlot.time)) {
            existingDay.slots.push(availabilitySlot);
          }
        });
      } else {
        generatedAvailability.push(availabilityDay);
      }
    });
  }

  const dayAvailability = generatedAvailability.find((day) => day.date === dateIso);
  if (!dayAvailability) {
    return false;
  }

  if (!time) {
    return dayAvailability.slots.some((slot) => slot.isAvailable);
  }

  return dayAvailability.slots.some((slot) => slot.time === time && slot.isAvailable);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const prismaAny = prisma as any;
    const { id } = await params;
    const body = await request.json();

    const finalDateRaw = String(body.finalDate || "").trim();
    const finalTimeRaw = String(body.finalTime || "").trim();
    const finalTime = finalTimeRaw || null;

    if (!finalDateRaw) {
      return NextResponse.json(
        { success: false, error: "Final date is required" },
        { status: 400 }
      );
    }

    const finalDate = new Date(finalDateRaw);
    if (Number.isNaN(finalDate.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid final date" }, { status: 400 });
    }

    const existing = await prismaAny.consultation.findUnique({
      where: { id },
      select: {
        id: true,
        doctorId: true,
        status: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Consultation not found" }, { status: 404 });
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json({ success: false, error: "Completed consultation cannot be rescheduled" }, { status: 400 });
    }

    const dateIso = DateTime.fromJSDate(finalDate, { zone: CLINIC_TIMEZONE }).toISODate();
    if (!dateIso) {
      return NextResponse.json({ success: false, error: "Invalid final date" }, { status: 400 });
    }

    const available = await isDoctorSlotAvailable(existing.doctorId, dateIso, finalTime);
    if (!available) {
      return NextResponse.json(
        { success: false, error: finalTime ? "Doctor is not available at the selected date/time" : "Doctor is not available on the selected date" },
        { status: 409 }
      );
    }

    const consultation = await prismaAny.consultation.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        finalDate,
        finalTime: finalTime || null,
      },
      include: {
        doctor: { select: { name: true } },
      },
    });

    await prismaAny.notification.create({
      data: {
        patientId: consultation.patientId,
        consultationId: consultation.id,
        title: "Physical Consultation Scheduled",
        message: `Your physical consultation with Dr. ${consultation.doctor.name} has been scheduled.`,
        status: "UNREAD",
      },
    });

    return NextResponse.json({ success: true, data: consultation });
  } catch (error) {
    console.error("Error scheduling consultation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule consultation" },
      { status: 500 }
    );
  }
}
