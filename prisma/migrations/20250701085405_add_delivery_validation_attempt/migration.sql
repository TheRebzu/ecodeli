-- CreateTable
CREATE TABLE "DeliveryValidationAttempt" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "attemptedCode" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "attemptedBy" TEXT NOT NULL,

    CONSTRAINT "DeliveryValidationAttempt_pkey" PRIMARY KEY ("id")
);
