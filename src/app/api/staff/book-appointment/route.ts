import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db/prisma';
import { DateTime } from 'luxon';
import { CLINIC_TIMEZONE } from '@/lib/config/timezone';
import { DatabaseService } from '@/lib/db/services/databaseService';
import { RRuleSlotManager } from '@/lib/utils/rruleSlots';

const CONSULTATION_MODE_PREFIX = '[CONSULTATION_MODE]:';

function extractBookingReason(notes: string | null | undefined): string {
  if (!notes) return 'Appointment booked by staff';

  const cleaned = notes
    .split('\n')
    .filter((line) => !line.startsWith(CONSULTATION_MODE_PREFIX))
    .join('\n')
    .trim();

  return cleaned || 'Appointment booked by staff';
}

type BookingSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

async function isDoctorSlotAvailable(doctorId: string, slot: BookingSlot) {
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
      frequency: configuredSlot.isRecurring ? (configuredSlot.frequency || 'weekly') : 'daily',
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

  const dayAvailability = generatedAvailability.find((day) => day.date === slot.date);
  if (!dayAvailability) {
    return false;
  }

  return dayAvailability.slots.some(
    (availabilitySlot) => availabilitySlot.time === slot.startTime && availabilitySlot.isAvailable
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patientFormId, doctorId, slot } = await request.json();

    if (!patientFormId || !doctorId || !slot?.date || !slot?.startTime || !slot?.endTime) {
      return NextResponse.json(
        { error: 'patientFormId, doctorId, and slot (date, startTime, endTime) are required' },
        { status: 400 }
      );
    }

    const form = await prisma.patientFormSubmission.findUnique({
      where: { id: patientFormId },
    });

    if (!form) {
      return NextResponse.json({ error: 'Patient form not found' }, { status: 404 });
    }

    if (form.status === 'appointment_booked' || form.appointmentId) {
      return NextResponse.json({ error: 'This patient form is already booked' }, { status: 409 });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        defaultSessionDuration: true,
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    const sessionDuration = doctor.defaultSessionDuration || 30;
    const [startHours, startMinutes] = slot.startTime.split(':').map(Number);
    const expectedEndMinutes = startMinutes + sessionDuration;
    const expectedEndHours = startHours + Math.floor(expectedEndMinutes / 60);
    const normalizedEndTime = `${expectedEndHours.toString().padStart(2, '0')}:${(expectedEndMinutes % 60)
      .toString()
      .padStart(2, '0')}`;

    if (slot.endTime !== normalizedEndTime) {
      return NextResponse.json({ error: 'Invalid slot duration for this doctor' }, { status: 400 });
    }

    const isAvailable = await isDoctorSlotAvailable(doctorId, slot as BookingSlot);
    if (!isAvailable) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
    }

    const appointmentDate = DateTime.fromISO(slot.date, {
      zone: CLINIC_TIMEZONE,
    }).toJSDate();

    const appointmentData: Parameters<typeof prisma.appointment.create>[0]['data'] = {
      doctor: { connect: { id: doctorId } },
      date: appointmentDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'confirmed',
      type: 'consultation',
      mode: 'video',
      reason: extractBookingReason(form.notes),
      symptoms: [],
      paymentAmount: 0,
      paymentStatus: 'pending',
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.phone ?? undefined,
    };

    // Link to verified patient record if available
    if (form.patientId) {
      appointmentData.patient = { connect: { id: form.patientId } };
      // Remove guest fields when we have a real patient
      delete appointmentData.guestName;
      delete appointmentData.guestEmail;
      delete appointmentData.guestPhone;
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const latestForm = await tx.patientFormSubmission.findUnique({
        where: { id: patientFormId },
        select: {
          status: true,
          appointmentId: true,
        },
      });

      if (!latestForm) {
        throw new Error('PATIENT_FORM_NOT_FOUND');
      }

      if (latestForm.status === 'appointment_booked' || latestForm.appointmentId) {
        throw new Error('PATIENT_FORM_ALREADY_BOOKED');
      }

      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          doctorId,
          date: appointmentDate,
          status: { in: ['scheduled', 'confirmed', 'completed'] },
          OR: [
            {
              AND: [
                { startTime: { lte: slot.startTime } },
                { endTime: { gt: slot.startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: slot.endTime } },
                { endTime: { gte: slot.endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: slot.startTime } },
                { endTime: { lte: slot.endTime } },
              ],
            },
          ],
        },
        select: { id: true },
      });

      if (conflictingAppointment) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }

      const createdAppointment = await tx.appointment.create({ data: appointmentData });

      await tx.patientFormSubmission.update({
        where: { id: patientFormId },
        data: {
          status: 'appointment_booked',
          appointmentId: createdAppointment.id,
        },
      });

      return createdAppointment;
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PATIENT_FORM_ALREADY_BOOKED') {
        return NextResponse.json({ error: 'This patient form is already booked' }, { status: 409 });
      }

      if (error.message === 'SLOT_ALREADY_BOOKED') {
        return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 });
      }

      if (error.message === 'PATIENT_FORM_NOT_FOUND') {
        return NextResponse.json({ error: 'Patient form not found' }, { status: 404 });
      }
    }

    console.error('Error booking appointment directly:', error);
    return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 });
  }
}
