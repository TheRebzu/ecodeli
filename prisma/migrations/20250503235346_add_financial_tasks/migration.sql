/*
  Warnings:

  - The values [VOIDED] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRIAL,ENDED] on the enum `SubscriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [SUBSCRIPTION_FEE] on the enum `TransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `approvedByUserId` on the `bank_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `initiatedByUserId` on the `bank_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `recipientAccount` on the `bank_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `stripeTransferId` on the `bank_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `bank_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `calculatedAt` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `originalRate` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `paymentId` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `commissions` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `approvedByUserId` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `exportFormat` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `exportUrl` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `transactionCount` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `financial_reports` table. All the data in the column will be lost.
  - You are about to drop the column `discountPercent` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `isExemptFromTax` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `itemType` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `taxExemptionReason` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `unitPriceAfterDiscount` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `archivalReference` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `archivedAt` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientAddress` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientName` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientReference` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `clientVatNumber` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companyAddress` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companySiret` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `companyVatNumber` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `issuedDate` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `language` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `subscriptionId` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `totalAfterTax` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `totalBeforeTax` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `totalTax` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `stripePaymentMethodId` on the `payment_methods` table. All the data in the column will be lost.
  - You are about to drop the column `downgradedFrom` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `insuranceAmount` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `isPriority` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planChangedAt` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planDescription` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planFeatures` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planName` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `planPrice` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndsAt` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `upgradedFrom` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `accountHolder` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `accountHolderType` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `bic` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `iban` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `lastWithdrawalDate` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `stripeAccountId` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `withdrawalCount` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `adminNote` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `bankAccountLast4` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedArrivalDate` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `notifiedAt` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `processedByAdminId` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `relatedInvoiceId` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `requestedByUserId` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `stripePayoutId` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the column `stripeTransferId` on the `withdrawal_requests` table. All the data in the column will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[withdrawalRequestId]` on the table `bank_transfers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `recipientIban` to the `bank_transfers` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `bank_transfers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `serviceType` to the `commissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodEnd` to the `financial_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `periodStart` to the `financial_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reportType` to the `financial_reports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoiceNumber` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `issueDate` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `payment_methods` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `wallet_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FinancialTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FinancialTaskCategory" AS ENUM ('PAYMENT', 'INVOICE', 'WITHDRAWAL', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED', 'PARTIALLY_PAID');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "InvoiceStatus_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PENDING_CAPTURE';
ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CAPTURED';
ALTER TYPE "PaymentStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL_REFUND';
ALTER TYPE "PaymentStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE 'REQUIRES_ACTION';

-- AlterEnum
ALTER TYPE "PlanType" ADD VALUE 'CUSTOM';

-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAUSED', 'PAST_DUE', 'PENDING', 'TRIALING', 'INCOMPLETE', 'UNPAID');
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStatus" ADD VALUE 'DISPUTED';
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "TransactionStatus" ADD VALUE 'PROCESSING';

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EARNING', 'REFUND', 'PLATFORM_FEE', 'COMMISSION', 'BONUS', 'ADJUSTMENT', 'TAX', 'SERVICE_FEE', 'DELIVERY_PAYOUT', 'SERVICE_PAYOUT', 'SUBSCRIPTION_PAYMENT', 'MONTHLY_FEE');
ALTER TABLE "wallet_transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "TransactionType_old";
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WithdrawalStatus" ADD VALUE 'REJECTED';
ALTER TYPE "WithdrawalStatus" ADD VALUE 'SCHEDULED';

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceBooking" DROP CONSTRAINT "ServiceBooking_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "commissions" DROP CONSTRAINT "commissions_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_userId_fkey";

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_walletId_fkey";

-- DropForeignKey
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_userId_fkey";

-- DropForeignKey
ALTER TABLE "withdrawal_requests" DROP CONSTRAINT "withdrawal_requests_walletId_fkey";

-- DropIndex
DROP INDEX "bank_transfers_status_idx";

-- DropIndex
DROP INDEX "bank_transfers_withdrawalRequestId_idx";

-- DropIndex
DROP INDEX "commissions_paymentId_idx";

-- DropIndex
DROP INDEX "commissions_paymentId_key";

-- DropIndex
DROP INDEX "financial_reports_period_idx";

-- DropIndex
DROP INDEX "financial_reports_type_idx";

-- DropIndex
DROP INDEX "invoices_number_key";

-- DropIndex
DROP INDEX "invoices_subscriptionId_idx";

-- AlterTable
ALTER TABLE "bank_transfers" DROP COLUMN "approvedByUserId",
DROP COLUMN "initiatedByUserId",
DROP COLUMN "recipientAccount",
DROP COLUMN "stripeTransferId",
DROP COLUMN "transactionId",
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "endorsedBy" TEXT,
ADD COLUMN     "estimatedArrivalDate" TIMESTAMP(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "isRecipientVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSenderVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "platformTransactionId" TEXT,
ADD COLUMN     "recipientBic" TEXT,
ADD COLUMN     "recipientIban" TEXT NOT NULL,
ADD COLUMN     "senderIban" TEXT,
ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "transferFee" DECIMAL(65,30),
ADD COLUMN     "transferMethod" TEXT NOT NULL DEFAULT 'SEPA',
ADD COLUMN     "transferProofUrl" TEXT,
ADD COLUMN     "transferReference" TEXT,
ALTER COLUMN "currency" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatus" NOT NULL,
ALTER COLUMN "reference" DROP NOT NULL,
ALTER COLUMN "initiatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commissions" DROP COLUMN "amount",
DROP COLUMN "calculatedAt",
DROP COLUMN "discountAmount",
DROP COLUMN "originalRate",
DROP COLUMN "paidAt",
DROP COLUMN "paymentId",
DROP COLUMN "status",
DROP COLUMN "type",
ADD COLUMN     "applicableRoles" TEXT[],
ADD COLUMN     "calculationType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "flatFee" DECIMAL(65,30),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maximumAmount" DECIMAL(65,30),
ADD COLUMN     "minimumAmount" DECIMAL(65,30),
ADD COLUMN     "payoutSchedule" TEXT DEFAULT 'IMMEDIATE',
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "serviceType" TEXT NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "tierThresholds" JSONB;

-- AlterTable
ALTER TABLE "financial_reports" DROP COLUMN "approvedAt",
DROP COLUMN "approvedByUserId",
DROP COLUMN "createdAt",
DROP COLUMN "endDate",
DROP COLUMN "exportFormat",
DROP COLUMN "exportUrl",
DROP COLUMN "name",
DROP COLUMN "period",
DROP COLUMN "startDate",
DROP COLUMN "transactionCount",
DROP COLUMN "type",
DROP COLUMN "updatedAt",
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "generatedBy" TEXT,
ADD COLUMN     "netRevenue" DECIMAL(65,30),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "periodStart" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reportType" TEXT NOT NULL,
ADD COLUMN     "totalFees" DECIMAL(65,30),
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "totalRevenue" DROP NOT NULL,
ALTER COLUMN "totalCommissions" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "discountPercent",
DROP COLUMN "isExemptFromTax",
DROP COLUMN "itemType",
DROP COLUMN "subscriptionId",
DROP COLUMN "taxExemptionReason",
DROP COLUMN "totalAmount",
DROP COLUMN "unitPriceAfterDiscount",
ADD COLUMN     "amount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "itemCode" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "taxRate" DROP NOT NULL,
ALTER COLUMN "taxRate" DROP DEFAULT,
ALTER COLUMN "taxAmount" DROP NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "archivalReference",
DROP COLUMN "archivedAt",
DROP COLUMN "clientAddress",
DROP COLUMN "clientName",
DROP COLUMN "clientReference",
DROP COLUMN "clientVatNumber",
DROP COLUMN "companyAddress",
DROP COLUMN "companySiret",
DROP COLUMN "companyVatNumber",
DROP COLUMN "issuedDate",
DROP COLUMN "language",
DROP COLUMN "number",
DROP COLUMN "stripeInvoiceId",
DROP COLUMN "subscriptionId",
DROP COLUMN "totalAfterTax",
DROP COLUMN "totalBeforeTax",
DROP COLUMN "totalTax",
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingPostal" TEXT,
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "invoiceType" TEXT NOT NULL DEFAULT 'SERVICE',
ADD COLUMN     "isCreditNote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'fr',
ADD COLUMN     "merchantId" TEXT,
ADD COLUMN     "originalInvoiceId" TEXT,
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "remoteStorageUrl" TEXT,
ADD COLUMN     "serviceDescription" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(65,30),
ADD COLUMN     "taxId" TEXT,
ADD COLUMN     "taxRate" DECIMAL(65,30),
ADD COLUMN     "termsAndConditions" TEXT,
ADD COLUMN     "totalAmount" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payment_methods" DROP COLUMN "stripePaymentMethodId",
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingPostal" TEXT,
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mandateCreatedAt" TIMESTAMP(3),
ADD COLUMN     "mandateId" TEXT,
ADD COLUMN     "mandateStatus" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "token" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "downgradedFrom",
DROP COLUMN "insuranceAmount",
DROP COLUMN "isPriority",
DROP COLUMN "planChangedAt",
DROP COLUMN "planDescription",
DROP COLUMN "planFeatures",
DROP COLUMN "planName",
DROP COLUMN "planPrice",
DROP COLUMN "stripePriceId",
DROP COLUMN "trialEndsAt",
DROP COLUMN "upgradedFrom",
ADD COLUMN     "billingCycleAnchor" INTEGER,
ADD COLUMN     "couponApplied" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN     "customPlanFeatures" JSONB,
ADD COLUMN     "discountAmount" DECIMAL(65,30),
ADD COLUMN     "discountDuration" TEXT,
ADD COLUMN     "discountDurationMonths" INTEGER,
ADD COLUMN     "downgradedAt" TIMESTAMP(3),
ADD COLUMN     "gracePeriodEnd" TIMESTAMP(3),
ADD COLUMN     "lastPaymentFailure" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "nextInvoiceDate" TIMESTAMP(3),
ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "paymentFailureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "price" DECIMAL(65,30),
ADD COLUMN     "resumeAt" TIMESTAMP(3),
ADD COLUMN     "trialEnd" TIMESTAMP(3),
ADD COLUMN     "trialStart" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "upgradedAt" TIMESTAMP(3),
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "startDate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "balanceAfter" DECIMAL(65,30),
ADD COLUMN     "commissionRate" DECIMAL(65,30),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "deliveryId" TEXT,
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "isSystemGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "previousBalance" DECIMAL(65,30),
ADD COLUMN     "reportingCategory" TEXT,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "sourceTransaction" TEXT,
ADD COLUMN     "taxAmount" DECIMAL(65,30),
ADD COLUMN     "taxRate" DECIMAL(65,30),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "withdrawalId" TEXT,
ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "accountHolder",
DROP COLUMN "accountHolderType",
DROP COLUMN "bankName",
DROP COLUMN "bic",
DROP COLUMN "iban",
DROP COLUMN "lastWithdrawalDate",
DROP COLUMN "stripeAccountId",
DROP COLUMN "withdrawalCount",
ADD COLUMN     "earningsLastMonth" DECIMAL(65,30),
ADD COLUMN     "earningsThisMonth" DECIMAL(65,30),
ADD COLUMN     "encryptedBankInfo" TEXT,
ADD COLUMN     "fiscalCategory" TEXT,
ADD COLUMN     "lastWithdrawalAt" TIMESTAMP(3),
ADD COLUMN     "notificationThreshold" DECIMAL(65,30),
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripeConnectAccountId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "taxIdentifier" TEXT,
ADD COLUMN     "taxReportingEnabled" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "withdrawalThreshold" DROP NOT NULL,
ALTER COLUMN "withdrawalThreshold" DROP DEFAULT,
ALTER COLUMN "totalEarned" DROP NOT NULL,
ALTER COLUMN "totalEarned" DROP DEFAULT,
ALTER COLUMN "totalWithdrawn" DROP NOT NULL,
ALTER COLUMN "totalWithdrawn" DROP DEFAULT;

-- AlterTable
ALTER TABLE "withdrawal_requests" DROP COLUMN "adminNote",
DROP COLUMN "bankAccountLast4",
DROP COLUMN "estimatedArrivalDate",
DROP COLUMN "notifiedAt",
DROP COLUMN "processedByAdminId",
DROP COLUMN "relatedInvoiceId",
DROP COLUMN "requestedByUserId",
DROP COLUMN "stripePayoutId",
DROP COLUMN "stripeTransferId",
ADD COLUMN     "accountVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estimatedArrival" TIMESTAMP(3),
ADD COLUMN     "estimatedFee" DECIMAL(65,30),
ADD COLUMN     "expedited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastNotificationAt" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processorComments" TEXT,
ADD COLUMN     "processorId" TEXT,
ADD COLUMN     "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportingDocuments" TEXT[],
ADD COLUMN     "taxWithheld" DECIMAL(65,30),
ALTER COLUMN "currency" DROP DEFAULT;

-- DropTable
DROP TABLE "Payment";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "isEscrow" BOOLEAN NOT NULL DEFAULT false,
    "escrowReleaseCode" TEXT,
    "escrowReleaseDate" TIMESTAMP(3),
    "escrowReleasedAt" TIMESTAMP(3),
    "stripePaymentId" TEXT,
    "paymentIntentId" TEXT,
    "deliveryId" TEXT,
    "serviceId" TEXT,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "commissionAmount" DECIMAL(65,30),
    "commissionId" TEXT,
    "refundId" TEXT,
    "refundedAmount" DECIMAL(65,30),
    "refundedAt" TIMESTAMP(3),
    "disputeId" TEXT,
    "disputeStatus" TEXT,
    "metadata" JSONB,
    "capturedAt" TIMESTAMP(3),
    "paymentMethodType" TEXT,
    "paymentMethodId" TEXT,
    "receiptUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    "paymentProvider" TEXT NOT NULL DEFAULT 'STRIPE',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringFrequency" TEXT,
    "processingFee" DECIMAL(65,30),
    "taxAmount" DECIMAL(65,30),
    "taxRate" DECIMAL(65,30),
    "paymentReference" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_cycles" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT,
    "providerId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceId" TEXT,
    "totalAmount" DECIMAL(65,30),
    "serviceFees" DECIMAL(65,30),
    "commissionFees" DECIMAL(65,30),
    "processingFees" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledRunDate" TIMESTAMP(3) NOT NULL,
    "serviceSummary" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "billing_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reconciliationDate" TIMESTAMP(3),
    "bankAccount" TEXT,
    "accountNumber" TEXT,
    "notes" TEXT,

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "countryCode" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'VAT',
    "region" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "priority" "FinancialTaskPriority" NOT NULL,
    "category" "FinancialTaskCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "financial_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_deliveryId_key" ON "payments"("deliveryId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_deliveryId_idx" ON "payments"("deliveryId");

-- CreateIndex
CREATE INDEX "payments_serviceId_idx" ON "payments"("serviceId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_commissionId_idx" ON "payments"("commissionId");

-- CreateIndex
CREATE INDEX "billing_cycles_periodStart_periodEnd_idx" ON "billing_cycles"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "billing_cycles_status_idx" ON "billing_cycles"("status");

-- CreateIndex
CREATE INDEX "tax_rates_countryCode_idx" ON "tax_rates"("countryCode");

-- CreateIndex
CREATE INDEX "tax_rates_isActive_idx" ON "tax_rates"("isActive");

-- CreateIndex
CREATE INDEX "financial_tasks_userId_idx" ON "financial_tasks"("userId");

-- CreateIndex
CREATE INDEX "financial_tasks_priority_idx" ON "financial_tasks"("priority");

-- CreateIndex
CREATE INDEX "financial_tasks_category_idx" ON "financial_tasks"("category");

-- CreateIndex
CREATE INDEX "financial_tasks_completed_idx" ON "financial_tasks"("completed");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transfers_withdrawalRequestId_key" ON "bank_transfers"("withdrawalRequestId");

-- CreateIndex
CREATE INDEX "commissions_serviceType_idx" ON "commissions"("serviceType");

-- CreateIndex
CREATE INDEX "commissions_isActive_idx" ON "commissions"("isActive");

-- CreateIndex
CREATE INDEX "financial_reports_reportType_idx" ON "financial_reports"("reportType");

-- CreateIndex
CREATE INDEX "financial_reports_periodStart_periodEnd_idx" ON "financial_reports"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");

-- CreateIndex
CREATE INDEX "payment_methods_isDefault_idx" ON "payment_methods"("isDefault");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_createdAt_idx" ON "wallet_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "withdrawal_requests_status_idx" ON "withdrawal_requests"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_requestedAt_idx" ON "withdrawal_requests"("requestedAt");

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_tasks" ADD CONSTRAINT "financial_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
