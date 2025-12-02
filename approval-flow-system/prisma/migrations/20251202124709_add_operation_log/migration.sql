-- CreateTable
CREATE TABLE "OperationLog" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "actorCode" TEXT,
    "workflowId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationLog_workflowId_idx" ON "OperationLog"("workflowId");

-- CreateIndex
CREATE INDEX "OperationLog_operation_idx" ON "OperationLog"("operation");
