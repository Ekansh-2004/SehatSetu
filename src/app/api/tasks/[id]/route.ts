import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["pending", "completed"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const staffTask = (prisma as any).staffTask;
    let task: unknown;

    if (staffTask) {
      task = await staffTask.update({
        where: { id },
        data: {
          status,
          completedAt: status === "completed" ? new Date() : null,
        },
      });
    } else {
      const completedAt = status === "completed" ? new Date() : null;
      const rows = await prisma.$queryRaw<unknown[]>`
        UPDATE "staff_tasks"
        SET "status" = ${status},
            "completedAt" = ${completedAt},
            "updatedAt" = ${new Date()}
        WHERE "id" = ${id}
        RETURNING *
      `;
      task = rows[0] ?? null;
    }

    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ success: false, error: "Failed to update task" }, { status: 500 });
  }
}
