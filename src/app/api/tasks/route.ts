import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignedToId = searchParams.get("assignedToId");

    const staffTask = (prisma as any).staffTask;
    let tasks: unknown[] = [];

    if (staffTask) {
      const where = assignedToId ? { assignedToId } : {};
      tasks = await staffTask.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
      });
    } else {
      // Fallback for stale Prisma client in long-running dev processes.
      tasks = assignedToId
        ? await prisma.$queryRaw`
            SELECT *
            FROM "staff_tasks"
            WHERE "assignedToId" = ${assignedToId}
            ORDER BY "createdAt" DESC
          `
        : await prisma.$queryRaw`
            SELECT *
            FROM "staff_tasks"
            ORDER BY "createdAt" DESC
          `;
    }

    return NextResponse.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientName, roomBed, taskType, details, priority, assignedToId, assignedToName, notes, createdByName } = body;
    const normalizedRoomBed = roomBed?.trim() || "Not specified";

    if (!patientName || !taskType || !assignedToName) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const staffTask = (prisma as any).staffTask;
    let task: unknown;

    if (staffTask) {
      task = await staffTask.create({
        data: {
          patientName: patientName.trim(),
          roomBed: normalizedRoomBed,
          taskType,
          details: details?.trim() || null,
          priority: priority || "normal",
          assignedToId: assignedToId || null,
          assignedToName: assignedToName.trim(),
          notes: notes?.trim() || null,
          status: "pending",
          createdByName: createdByName?.trim() || "Doctor",
        },
      });
    } else {
      const now = new Date();
      const id = randomUUID();
      const rows = await prisma.$queryRaw<unknown[]>`
        INSERT INTO "staff_tasks" (
          "id",
          "patientName",
          "roomBed",
          "taskType",
          "details",
          "priority",
          "assignedToId",
          "assignedToName",
          "notes",
          "status",
          "createdByName",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${id},
          ${patientName.trim()},
          ${normalizedRoomBed},
          ${taskType},
          ${details?.trim() || null},
          ${priority || "normal"},
          ${assignedToId || null},
          ${assignedToName.trim()},
          ${notes?.trim() || null},
          ${"pending"},
          ${createdByName?.trim() || "Doctor"},
          ${now},
          ${now}
        )
        RETURNING *
      `;
      task = rows[0] ?? null;
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ success: false, error: "Failed to create task" }, { status: 500 });
  }
}
