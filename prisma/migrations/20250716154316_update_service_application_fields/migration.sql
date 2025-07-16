/*
  Warnings:

  - Added the required column `updatedAt` to the `ServiceApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ServiceApplication" ADD COLUMN     "availableDates" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "proposedPrice" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ServiceApplication_status_idx" ON "ServiceApplication"("status");

-- CreateIndex
CREATE INDEX "ServiceApplication_createdAt_idx" ON "ServiceApplication"("createdAt");
