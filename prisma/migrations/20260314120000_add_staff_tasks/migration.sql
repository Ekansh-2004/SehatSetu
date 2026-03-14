-- CreateTable
CREATE TABLE "public"."staff_tasks" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "roomBed" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "details" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedToId" TEXT,
    "assignedToName" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_tasks_assignedToId_idx" ON "public"."staff_tasks"("assignedToId");

-- CreateIndex
CREATE INDEX "staff_tasks_status_idx" ON "public"."staff_tasks"("status");

-- CreateIndex
CREATE INDEX "staff_tasks_createdAt_idx" ON "public"."staff_tasks"("createdAt");
