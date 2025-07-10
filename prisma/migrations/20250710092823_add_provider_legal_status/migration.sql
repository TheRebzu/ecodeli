/*
  Warnings:

  - The values [PENDING,SUSPENDED] on the enum `ContractStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ENTERPRISE] on the enum `ContractType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `amount` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `compensation` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `delivererId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `resolutionType` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `sanction` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Dispute` table. All the data in the column will be lost.
  - The `resolution` column on the `Dispute` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `DisputeTimeline` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceIntervention` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ticketNumber]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[storageRentalId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `announcementId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estimatedResolutionDate` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportedUserId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reporterId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketNumber` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContractStatus_new" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED');
ALTER TABLE "Contract" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "ProviderContract" ALTER COLUMN "status" TYPE "ContractStatus_new" USING ("status"::text::"ContractStatus_new");
ALTER TABLE "Contract" ALTER COLUMN "status" TYPE "ContractStatus_new" USING ("status"::text::"ContractStatus_new");
ALTER TYPE "ContractStatus" RENAME TO "ContractStatus_old";
ALTER TYPE "ContractStatus_new" RENAME TO "ContractStatus";
DROP TYPE "ContractStatus_old";
ALTER TABLE "Contract" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ContractType_new" AS ENUM ('STANDARD', 'PREMIUM', 'CUSTOM');
ALTER TABLE "Contract" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "ProviderContract" ALTER COLUMN "contractType" TYPE "ContractType_new" USING ("contractType"::text::"ContractType_new");
ALTER TABLE "Contract" ALTER COLUMN "type" TYPE "ContractType_new" USING ("type"::text::"ContractType_new");
ALTER TYPE "ContractType" RENAME TO "ContractType_old";
ALTER TYPE "ContractType_new" RENAME TO "ContractType";
DROP TYPE "ContractType_old";
ALTER TABLE "Contract" ALTER COLUMN "type" SET DEFAULT 'STANDARD';
COMMIT;

-- AlterEnum
ALTER TYPE "PaymentType" ADD VALUE 'STORAGE_RENTAL';

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_delivererId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeTimeline" DROP CONSTRAINT "DisputeTimeline_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DisputeTimeline" DROP CONSTRAINT "DisputeTimeline_disputeId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceApplication" DROP CONSTRAINT "ServiceApplication_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceApplication" DROP CONSTRAINT "ServiceApplication_serviceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceIntervention" DROP CONSTRAINT "ServiceIntervention_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceIntervention" DROP CONSTRAINT "ServiceIntervention_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceIntervention" DROP CONSTRAINT "ServiceIntervention_providerId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceIntervention" DROP CONSTRAINT "ServiceIntervention_serviceRequestId_fkey";

-- DropIndex
DROP INDEX "Dispute_clientId_idx";

-- DropIndex
DROP INDEX "Dispute_delivererId_idx";

-- DropIndex
DROP INDEX "Dispute_type_idx";

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "amount",
DROP COLUMN "clientId",
DROP COLUMN "compensation",
DROP COLUMN "createdBy",
DROP COLUMN "delivererId",
DROP COLUMN "deliveryId",
DROP COLUMN "resolutionType",
DROP COLUMN "sanction",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "actionTaken" TEXT[],
ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "announcementId" TEXT NOT NULL,
ADD COLUMN     "category" "DisputeCategory" NOT NULL,
ADD COLUMN     "compensationAmount" DOUBLE PRECISION,
ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalatedBy" TEXT,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "estimatedResolutionDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "evidenceFiles" TEXT[],
ADD COLUMN     "lastUpdatedBy" TEXT,
ADD COLUMN     "penaltyAmount" DOUBLE PRECISION,
ADD COLUMN     "reason" TEXT NOT NULL,
ADD COLUMN     "reportedUserId" TEXT NOT NULL,
ADD COLUMN     "reporterId" TEXT NOT NULL,
ADD COLUMN     "resolvedBy" TEXT,
ADD COLUMN     "ticketNumber" TEXT NOT NULL,
ALTER COLUMN "priority" DROP DEFAULT,
DROP COLUMN "resolution",
ADD COLUMN     "resolution" "DisputeResolution";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "storageRentalId" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "insuranceDocument" TEXT,
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "insurancePolicy" TEXT,
ADD COLUMN     "insuranceProvider" TEXT,
ADD COLUMN     "legalStatus" TEXT NOT NULL DEFAULT 'AUTOENTREPRENEUR',
ADD COLUMN     "vatNumber" TEXT;

-- DropTable
DROP TABLE "DisputeTimeline";

-- DropTable
DROP TABLE "ServiceApplication";

-- DropTable
DROP TABLE "ServiceIntervention";

-- DropEnum
DROP TYPE "DisputeCompensation";

-- DropEnum
DROP TYPE "DisputeResolutionType";

-- DropEnum
DROP TYPE "DisputeSanction";

-- DropEnum
DROP TYPE "DisputeTimelineType";

-- DropEnum
DROP TYPE "DisputeType";

-- CreateTable
CREATE TABLE "ProviderContract" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL DEFAULT 'STANDARD',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedByProvider" BOOLEAN NOT NULL DEFAULT false,
    "signedByEcoDeli" BOOLEAN NOT NULL DEFAULT false,
    "contractUrl" TEXT,
    "terms" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderContract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderContract_providerId_idx" ON "ProviderContract"("providerId");

-- CreateIndex
CREATE INDEX "ProviderContract_status_idx" ON "ProviderContract"("status");

-- CreateIndex
CREATE INDEX "ProviderContract_contractType_idx" ON "ProviderContract"("contractType");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_ticketNumber_key" ON "Dispute"("ticketNumber");

-- CreateIndex
CREATE INDEX "Dispute_announcementId_idx" ON "Dispute"("announcementId");

-- CreateIndex
CREATE INDEX "Dispute_category_idx" ON "Dispute"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_storageRentalId_key" ON "Payment"("storageRentalId");

-- CreateIndex
CREATE INDEX "Provider_legalStatus_idx" ON "Provider"("legalStatus");

-- AddForeignKey
ALTER TABLE "ProviderContract" ADD CONSTRAINT "ProviderContract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storageRentalId_fkey" FOREIGN KEY ("storageRentalId") REFERENCES "StorageBoxRental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
