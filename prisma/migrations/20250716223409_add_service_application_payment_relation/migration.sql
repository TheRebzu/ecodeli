/*
  Warnings:

  - A unique constraint covering the columns `[serviceApplicationId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "serviceApplicationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_serviceApplicationId_key" ON "Payment"("serviceApplicationId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_serviceApplicationId_fkey" FOREIGN KEY ("serviceApplicationId") REFERENCES "ServiceApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
