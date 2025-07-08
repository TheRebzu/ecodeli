/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeCustomerId_key" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeSubscriptionId_key" ON "Client"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Client_stripeCustomerId_idx" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Client_stripeSubscriptionId_idx" ON "Client"("stripeSubscriptionId");
