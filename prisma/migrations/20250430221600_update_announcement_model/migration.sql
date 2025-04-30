-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "estimatedDistance" DOUBLE PRECISION,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "requiresId" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "specialInstructions" TEXT;

-- AlterTable
ALTER TABLE "delivery_applications" ADD COLUMN     "estimatedDeliveryTime" TIMESTAMP(3),
ADD COLUMN     "estimatedPickupTime" TIMESTAMP(3),
ADD COLUMN     "isPreferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT;
