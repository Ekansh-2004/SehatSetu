#!/usr/bin/env node
import prisma from "../src/lib/db/prisma";
import { mockDoctors, mockPatients } from "../src/lib/db/mockData";

async function main() {
  console.log("Starting DB seed...");

  for (const d of mockDoctors) {
    try {
      await prisma.doctor.upsert({
        where: { email: d.email },
        update: {
          name: d.name,
          phone: d.phone,
          specialty: d.specialty,
          experience: d.experience,
          rating: d.rating,
          consultationFee: d.consultationFee,
          location: d.location,
          bio: d.bio,
          education: d.education as any,
          languages: d.languages as any,
          isActive: d.isActive ?? true,
          defaultSessionDuration: d.defaultSessionDuration ?? 30,
          maxPatientsPerDay: d.maxPatientsPerDay ?? 20,
          advanceBookingDays: d.advanceBookingDays ?? 30,
          updatedAt: d.updatedAt ?? new Date(),
        },
        create: {
          name: d.name,
          email: d.email,
          phone: d.phone,
          specialty: d.specialty,
          experience: d.experience,
          rating: d.rating,
          consultationFee: d.consultationFee,
          location: d.location,
          bio: d.bio,
          education: d.education as any,
          languages: d.languages as any,
          isActive: d.isActive ?? true,
          defaultSessionDuration: d.defaultSessionDuration ?? 30,
          maxPatientsPerDay: d.maxPatientsPerDay ?? 20,
          advanceBookingDays: d.advanceBookingDays ?? 30,
          createdAt: d.createdAt ?? new Date(),
          updatedAt: d.updatedAt ?? new Date(),
        },
      });
      console.log(`Upserted doctor: ${d.email}`);
    } catch (e) {
      console.error(`Failed to upsert doctor ${d.email}:`, e);
    }
  }

  for (const p of mockPatients) {
    try {
      await prisma.patient.upsert({
        where: { email: p.email },
        update: {
          name: p.name,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth ?? null,
          gender: p.gender ?? null,
          street: p.address?.street ?? null,
          city: p.address?.city ?? null,
          state: p.address?.state ?? null,
          zipCode: p.address?.zipCode ?? null,
          emergencyContactName: p.emergencyContact?.name ?? null,
          emergencyContactPhone: p.emergencyContact?.phone ?? null,
          medicalHistory: p.medicalHistory as any,
          allergies: p.allergies as any,
          currentMedications: p.currentMedications as any,
          isActive: p.isActive ?? true,
          updatedAt: p.updatedAt ?? new Date(),
        },
        create: {
          name: p.name,
          email: p.email,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth ?? null,
          gender: p.gender ?? null,
          street: p.address?.street ?? null,
          city: p.address?.city ?? null,
          state: p.address?.state ?? null,
          zipCode: p.address?.zipCode ?? null,
          emergencyContactName: p.emergencyContact?.name ?? null,
          emergencyContactPhone: p.emergencyContact?.phone ?? null,
          medicalHistory: p.medicalHistory as any,
          allergies: p.allergies as any,
          currentMedications: p.currentMedications as any,
          isActive: p.isActive ?? true,
          createdAt: p.createdAt ?? new Date(),
          updatedAt: p.updatedAt ?? new Date(),
        },
      });
      console.log(`Upserted patient: ${p.email}`);
    } catch (e) {
      console.error(`Failed to upsert patient ${p.email}:`, e);
    }
  }

  console.log("DB seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
