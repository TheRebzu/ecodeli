/*
  Warnings:

  - The values [IN_PROGRESS] on the enum `DeliveryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED');
ALTER TABLE "Delivery" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "status" TYPE "DeliveryStatus_new" USING ("status"::text::"DeliveryStatus_new");
ALTER TABLE "TrackingUpdate" ALTER COLUMN "status" TYPE "DeliveryStatus_new" USING ("status"::text::"DeliveryStatus_new");
ALTER TABLE "DeliveryStatusHistory" ALTER COLUMN "status" TYPE "DeliveryStatus_new" USING ("status"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "DeliveryStatus_old";
ALTER TABLE "Delivery" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
