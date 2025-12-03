-- CreateTable
CREATE TABLE "ApproverConfig" (
    "id" TEXT NOT NULL,
    "workflowType" "WorkflowType" NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "actorCode" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApproverConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApproverConfig_workflowType_role_idx" ON "ApproverConfig"("workflowType", "role");

-- CreateIndex
CREATE INDEX "ApproverConfig_email_idx" ON "ApproverConfig"("email");
