-- CreateTable
CREATE TABLE "ServiceApplication" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableDates" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceApplication_serviceRequestId_idx" ON "ServiceApplication"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceApplication_providerId_idx" ON "ServiceApplication"("providerId");

-- CreateIndex
CREATE INDEX "ServiceApplication_status_idx" ON "ServiceApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceApplication_serviceRequestId_providerId_key" ON "ServiceApplication"("serviceRequestId", "providerId");

-- AddForeignKey
ALTER TABLE "ServiceApplication" ADD CONSTRAINT "ServiceApplication_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceApplication" ADD CONSTRAINT "ServiceApplication_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
