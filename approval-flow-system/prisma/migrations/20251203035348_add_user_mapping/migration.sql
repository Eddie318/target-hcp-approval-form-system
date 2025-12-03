-- CreateTable
CREATE TABLE "UserMapping" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "actorCode" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "name" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMapping_actorCode_idx" ON "UserMapping"("actorCode");

-- CreateIndex
CREATE INDEX "UserMapping_actorRole_idx" ON "UserMapping"("actorRole");

-- CreateIndex
CREATE UNIQUE INDEX "UserMapping_email_actorCode_actorRole_key" ON "UserMapping"("email", "actorCode", "actorRole");
