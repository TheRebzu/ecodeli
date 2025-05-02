/*
  Warnings:

  - The `status` column on the `reservations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BoxType" AS ENUM ('STANDARD', 'CLIMATE_CONTROLLED', 'SECURE', 'EXTRA_LARGE', 'REFRIGERATED', 'FRAGILE');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'DAMAGED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BoxActionType" AS ENUM ('RESERVATION_CREATED', 'RESERVATION_UPDATED', 'RESERVATION_CANCELLED', 'BOX_ACCESSED', 'BOX_CLOSED', 'PAYMENT_PROCESSED', 'EXTENDED_RENTAL', 'INSPECTION_COMPLETED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'EXTENDED');

-- AlterTable
ALTER TABLE "boxes" ADD COLUMN     "boxType" "BoxType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "dimensions" JSONB,
ADD COLUMN     "features" TEXT[],
ADD COLUMN     "floorLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastInspectedAt" TIMESTAMP(3),
ADD COLUMN     "locationDescription" TEXT,
ADD COLUMN     "maxWeight" DOUBLE PRECISION,
ADD COLUMN     "status" "BoxStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "accessCode" TEXT,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "extendedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAccessed" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originalEndDate" TIMESTAMP(3),
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
DROP COLUMN "status",
ADD COLUMN     "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "availableBoxes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "openingHours" JSONB,
ADD COLUMN     "reservedBoxes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "box_usage_history" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "reservationId" TEXT,
    "clientId" TEXT NOT NULL,
    "actionType" "BoxActionType" NOT NULL,
    "actionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,
    "ipAddress" TEXT,
    "deviceInfo" TEXT,

    CONSTRAINT "box_usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "box_availability_subscriptions" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "minSize" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "boxType" "BoxType",
    "warehouseId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastNotified" TIMESTAMP(3),

    CONSTRAINT "box_availability_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "box_usage_history_boxId_idx" ON "box_usage_history"("boxId");

-- CreateIndex
CREATE INDEX "box_usage_history_reservationId_idx" ON "box_usage_history"("reservationId");

-- CreateIndex
CREATE INDEX "box_usage_history_clientId_idx" ON "box_usage_history"("clientId");

-- CreateIndex
CREATE INDEX "box_availability_subscriptions_boxId_idx" ON "box_availability_subscriptions"("boxId");

-- CreateIndex
CREATE INDEX "box_availability_subscriptions_clientId_idx" ON "box_availability_subscriptions"("clientId");

-- CreateIndex
CREATE INDEX "boxes_status_idx" ON "boxes"("status");

-- CreateIndex
CREATE INDEX "reservations_status_idx" ON "reservations"("status");

-- AddForeignKey
ALTER TABLE "box_usage_history" ADD CONSTRAINT "box_usage_history_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_usage_history" ADD CONSTRAINT "box_usage_history_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_usage_history" ADD CONSTRAINT "box_usage_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_availability_subscriptions" ADD CONSTRAINT "box_availability_subscriptions_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "box_availability_subscriptions" ADD CONSTRAINT "box_availability_subscriptions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
