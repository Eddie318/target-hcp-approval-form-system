-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MR', 'DSM', 'RSM', 'BISO1', 'BISO2', 'RSD', 'CD');

-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('NEW_TARGET_HOSPITAL', 'CANCEL_TARGET_HOSPITAL', 'NEW_LINK_PHARMACY', 'CANCEL_LINK_PHARMACY', 'REGION_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'REJECTED', 'WITHDRAWN', 'APPROVED');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('HOSPITAL', 'PHARMACY');

-- CreateEnum
CREATE TYPE "WhitelistStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "salesType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pharmacy" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "pharmacyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HospitalAssignment" (
    "id" TEXT NOT NULL,
    "hospitalCode" TEXT NOT NULL,
    "mrCode" TEXT NOT NULL,
    "dsmCode" TEXT,
    "rsmCode" TEXT,
    "sharePercent" DECIMAL(65,30) NOT NULL,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HospitalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhitelistRecord" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "pharmacyType" TEXT,
    "status" "WhitelistStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhitelistRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetMetric" (
    "id" TEXT NOT NULL,
    "hospitalCode" TEXT NOT NULL,
    "availableAmount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "type" "WorkflowType" NOT NULL,
    "status" "WorkflowStatus" NOT NULL,
    "title" TEXT,
    "payload" JSONB,
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "role" "UserRole" NOT NULL,
    "assignee" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowAction" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepId" TEXT,
    "action" "WorkflowActionType" NOT NULL,
    "actorCode" TEXT,
    "comment" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepId" TEXT,
    "filename" TEXT NOT NULL,
    "url" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_code_key" ON "Hospital"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_code_key" ON "Pharmacy"("code");

-- CreateIndex
CREATE INDEX "HospitalAssignment_hospitalCode_idx" ON "HospitalAssignment"("hospitalCode");

-- CreateIndex
CREATE INDEX "HospitalAssignment_mrCode_idx" ON "HospitalAssignment"("mrCode");

-- CreateIndex
CREATE UNIQUE INDEX "HospitalAssignment_hospitalCode_mrCode_key" ON "HospitalAssignment"("hospitalCode", "mrCode");

-- CreateIndex
CREATE INDEX "WhitelistRecord_code_idx" ON "WhitelistRecord"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TargetMetric_hospitalCode_key" ON "TargetMetric"("hospitalCode");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowStep_role_idx" ON "WorkflowStep"("role");

-- CreateIndex
CREATE INDEX "WorkflowAction_workflowId_idx" ON "WorkflowAction"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowAction_stepId_idx" ON "WorkflowAction"("stepId");

-- CreateIndex
CREATE INDEX "Attachment_workflowId_idx" ON "Attachment"("workflowId");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowAction" ADD CONSTRAINT "WorkflowAction_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "WorkflowStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;
