/*
  Warnings:

  - You are about to drop the column `actionTaken` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `adminNotes` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `announcementId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `compensationAmount` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `escalatedAt` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `escalatedBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `escalationReason` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedResolutionDate` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `evidenceFiles` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `lastUpdatedBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `penaltyAmount` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `reportedUserId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `reporterId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `ticketNumber` on the `Dispute` table. All the data in the column will be lost.
  - The `resolution` column on the `Dispute` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `amount` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivererId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deliveryId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('DELIVERY_ISSUE', 'PAYMENT_DISPUTE', 'SERVICE_QUALITY', 'CANCELLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeResolutionType" AS ENUM ('RESOLVED_CLIENT_FAVOR', 'RESOLVED_DELIVERER_FAVOR', 'PARTIAL_RESOLUTION', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeCompensation" AS ENUM ('FULL_REFUND', 'PARTIAL_REFUND', 'CREDIT', 'NONE');

-- CreateEnum
CREATE TYPE "DisputeSanction" AS ENUM ('WARNING', 'SUSPENSION', 'BAN', 'NONE');

-- CreateEnum
CREATE TYPE "DisputeTimelineType" AS ENUM ('COMMENT', 'STATUS_CHANGE', 'RESOLUTION');

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_reportedUserId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_reporterId_fkey";

-- DropIndex
DROP INDEX "Dispute_announcementId_idx";

-- DropIndex
DROP INDEX "Dispute_category_idx";

-- DropIndex
DROP INDEX "Dispute_ticketNumber_key";

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "actionTaken",
DROP COLUMN "adminNotes",
DROP COLUMN "announcementId",
DROP COLUMN "category",
DROP COLUMN "compensationAmount",
DROP COLUMN "escalatedAt",
DROP COLUMN "escalatedBy",
DROP COLUMN "escalationReason",
DROP COLUMN "estimatedResolutionDate",
DROP COLUMN "evidenceFiles",
DROP COLUMN "lastUpdatedBy",
DROP COLUMN "penaltyAmount",
DROP COLUMN "reason",
DROP COLUMN "reportedUserId",
DROP COLUMN "reporterId",
DROP COLUMN "resolvedBy",
DROP COLUMN "ticketNumber",
ADD COLUMN     "amount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "compensation" "DisputeCompensation",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "delivererId" TEXT NOT NULL,
ADD COLUMN     "deliveryId" TEXT NOT NULL,
ADD COLUMN     "resolutionType" "DisputeResolutionType",
ADD COLUMN     "sanction" "DisputeSanction",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "type" "DisputeType" NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 'MEDIUM',
DROP COLUMN "resolution",
ADD COLUMN     "resolution" TEXT;

-- CreateTable
CREATE TABLE "DisputeTimeline" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "type" "DisputeTimelineType" NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeTimeline_disputeId_idx" ON "DisputeTimeline"("disputeId");

-- CreateIndex
CREATE INDEX "DisputeTimeline_createdAt_idx" ON "DisputeTimeline"("createdAt");

-- CreateIndex
CREATE INDEX "DisputeTimeline_type_idx" ON "DisputeTimeline"("type");

-- CreateIndex
CREATE INDEX "Dispute_type_idx" ON "Dispute"("type");

-- CreateIndex
CREATE INDEX "Dispute_clientId_idx" ON "Dispute"("clientId");

-- CreateIndex
CREATE INDEX "Dispute_delivererId_idx" ON "Dispute"("delivererId");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeTimeline" ADD CONSTRAINT "DisputeTimeline_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
