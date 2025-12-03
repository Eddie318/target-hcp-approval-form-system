-- CreateTable
CREATE TABLE "UserHierarchy" (
    "actorCode" TEXT NOT NULL,
    "dsmCode" TEXT,
    "rsmCode" TEXT,

    CONSTRAINT "UserHierarchy_pkey" PRIMARY KEY ("actorCode")
);
