-- AlterTable
ALTER TABLE "ImportLog" ADD COLUMN     "detail" JSONB;

-- AlterTable
ALTER TABLE "OperationLog" ADD COLUMN     "tokenHash" TEXT;

-- CreateIndex
CREATE INDEX "OperationLog_tokenHash_idx" ON "OperationLog"("tokenHash");
