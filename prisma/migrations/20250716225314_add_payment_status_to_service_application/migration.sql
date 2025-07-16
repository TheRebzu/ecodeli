/*
  Warnings:

  - You are about to drop the column `serviceApplicationId` on the `Payment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_serviceApplicationId_fkey";

-- DropIndex
DROP INDEX "Payment_serviceApplicationId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "serviceApplicationId";

-- AlterTable
ALTER TABLE "ServiceApplication" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "ServiceApplication_paymentStatus_idx" ON "ServiceApplication"("paymentStatus");
