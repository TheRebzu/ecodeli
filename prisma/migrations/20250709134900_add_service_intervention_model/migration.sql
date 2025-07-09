-- CreateTable
CREATE TABLE "ServiceIntervention" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "paymentId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceIntervention_providerId_idx" ON "ServiceIntervention"("providerId");

-- CreateIndex
CREATE INDEX "ServiceIntervention_clientId_idx" ON "ServiceIntervention"("clientId");

-- CreateIndex
CREATE INDEX "ServiceIntervention_serviceRequestId_idx" ON "ServiceIntervention"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceIntervention_status_idx" ON "ServiceIntervention"("status");

-- CreateIndex
CREATE INDEX "ServiceIntervention_scheduledDate_idx" ON "ServiceIntervention"("scheduledDate");

-- AddForeignKey
ALTER TABLE "ServiceIntervention" ADD CONSTRAINT "ServiceIntervention_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIntervention" ADD CONSTRAINT "ServiceIntervention_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIntervention" ADD CONSTRAINT "ServiceIntervention_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceIntervention" ADD CONSTRAINT "ServiceIntervention_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
