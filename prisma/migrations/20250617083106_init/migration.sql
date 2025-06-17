/*
  Warnings:

  - The values [DRIVING_LICENSE,INSURANCE,QUALIFICATION_CERTIFICATE,SELFIE] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ServiceCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[contractNumber]` on the table `contracts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[delivererId,announcementId]` on the table `delivery_applications` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('VACATION', 'SICK_LEAVE', 'UNAVAILABLE', 'MAINTENANCE', 'EMERGENCY', 'PERSONAL', 'CLOSED');

-- CreateEnum
CREATE TYPE "RejectionReason" AS ENUM ('UNREADABLE', 'EXPIRED', 'INCOMPLETE', 'FAKE', 'WRONG_TYPE', 'LOW_QUALITY', 'INFORMATION_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PROVIDER_ABSENT');

-- CreateEnum
CREATE TYPE "RescheduleReason" AS ENUM ('CLIENT_REQUEST', 'PROVIDER_REQUEST', 'WEATHER_CONDITION', 'EMERGENCY', 'ILLNESS', 'TECHNICAL_ISSUE', 'TRAFFIC_DELAY', 'DOUBLE_BOOKING', 'LOCATION_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CLIENT_CANCELLED', 'PROVIDER_CANCELLED', 'SYSTEM_CANCELLED', 'NO_PAYMENT', 'SERVICE_UNAVAILABLE', 'LOCATION_INACCESSIBLE', 'WEATHER_CONDITION', 'EMERGENCY', 'ILLNESS', 'MUTUAL_AGREEMENT', 'POLICY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentNotificationType" AS ENUM ('REMINDER_24H', 'REMINDER_2H', 'REMINDER_30MIN', 'CONFIRMATION', 'RESCHEDULE', 'CANCELLATION', 'PROVIDER_EN_ROUTE', 'ARRIVAL', 'COMPLETION');

-- CreateEnum
CREATE TYPE "DocumentVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RequiredDocumentType" AS ENUM ('IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'VEHICLE_REGISTRATION', 'BANK_RIB', 'BUSINESS_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'BICYCLE', 'SCOOTER', 'VAN', 'TRUCK', 'FOOT', 'OTHER');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "MatchingStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'REMINDER', 'ALERT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "ClientSubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "PersonalServiceType" AS ENUM ('PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'GROCERY_SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_SITTING', 'HOME_SERVICES', 'OTHER');

-- CreateEnum
CREATE TYPE "HabilitationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InterventionType" AS ENUM ('SCHEDULED', 'EMERGENCY', 'RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('CLIENT_TO_PROVIDER', 'PROVIDER_TO_CLIENT', 'ADMIN_REVIEW');

-- CreateEnum
CREATE TYPE "AutoInvoicingStatus" AS ENUM ('ENABLED', 'DISABLED', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('REVENUE', 'USER_COUNT', 'DELIVERY_COUNT', 'CONVERSION', 'SATISFACTION', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "SiteStatsType" AS ENUM ('PARIS', 'MARSEILLE', 'LYON', 'LILLE', 'MONTPELLIER', 'RENNES');

-- CreateEnum
CREATE TYPE "ForecastType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PlannedRouteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CartDropType" AS ENUM ('INSTANT', 'SCHEDULED', 'RECURRING');

-- CreateEnum
CREATE TYPE "CartDropStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TutorialType" AS ENUM ('ONBOARDING', 'FEATURE_GUIDE', 'OVERLAY', 'INTERACTIVE', 'VIDEO', 'WALKTHROUGH');

-- CreateEnum
CREATE TYPE "TutorialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DISABLED');

-- CreateEnum
CREATE TYPE "StepContentType" AS ENUM ('TEXT', 'HTML', 'VIDEO', 'IMAGE', 'OVERLAY', 'TOOLTIP', 'MODAL', 'HIGHLIGHT');

-- CreateEnum
CREATE TYPE "StepActionType" AS ENUM ('CLICK', 'HOVER', 'INPUT', 'SCROLL', 'NAVIGATE', 'WAIT', 'COMPLETE', 'SKIP');

-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MatchingAlgorithm" AS ENUM ('DISTANCE_BASED', 'TIME_OPTIMIZED', 'COST_EFFICIENT', 'HYBRID', 'AI_ENHANCED', 'MANUAL');

-- CreateEnum
CREATE TYPE "MatchingCriteriaType" AS ENUM ('DISTANCE', 'TIME_WINDOW', 'VEHICLE_TYPE', 'PACKAGE_TYPE', 'WEIGHT_LIMIT', 'PRICE_RANGE', 'RATING_MINIMUM', 'LANGUAGE', 'GENDER_PREFERENCE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MatchingPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MatchingResultStatus" AS ENUM ('PENDING', 'SUGGESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'AUTO_ASSIGNED');

-- CreateEnum
CREATE TYPE "NFCCardStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'LOST', 'STOLEN', 'DAMAGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NFCTransactionType" AS ENUM ('DELIVERY_START', 'DELIVERY_END', 'PACKAGE_PICKUP', 'PACKAGE_DELIVERY', 'VALIDATION', 'ACCESS_GRANT', 'SYSTEM_CHECK');

-- CreateEnum
CREATE TYPE "NFCAssignmentStatus" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'PENDING', 'REVOKED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AnnouncementType" ADD VALUE 'PARTIAL_DELIVERY';
ALTER TYPE "AnnouncementType" ADD VALUE 'FINAL_DISTRIBUTION';
ALTER TYPE "AnnouncementType" ADD VALUE 'CART_DROP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'PROOF_OF_ADDRESS', 'VEHICLE_INSURANCE', 'VEHICLE_REGISTRATION', 'BUSINESS_LICENSE', 'INSURANCE_CERTIFICATE', 'PROFESSIONAL_QUALIFICATION', 'TAX_CERTIFICATE', 'BUSINESS_REGISTRATION', 'VAT_REGISTRATION', 'OTHER');
ALTER TABLE "documents" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;

-- DropIndex
DROP INDEX "ProviderAvailability_providerId_idx";

-- AlterTable
ALTER TABLE "ProviderAvailability" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "isAtHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAtShop" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOnline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "preparationTime" INTEGER,
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "tags" TEXT[];

-- AlterTable
ALTER TABLE "ServiceBooking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "confirmationCode" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "participantCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "providerNotes" TEXT,
ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rescheduledFrom" TEXT;

-- AlterTable
ALTER TABLE "ServiceCategory" ADD COLUMN     "color" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ServiceReview" ADD COLUMN     "communication" INTEGER,
ADD COLUMN     "cons" TEXT[],
ADD COLUMN     "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pros" TEXT[],
ADD COLUMN     "punctuality" INTEGER,
ADD COLUMN     "quality" INTEGER,
ADD COLUMN     "valueForMoney" INTEGER,
ADD COLUMN     "wouldRecommend" BOOLEAN;

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "autoAssign" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cartDropSlot" TIMESTAMP(3),
ADD COLUMN     "confirmationCode" TEXT,
ADD COLUMN     "enableSmartMatching" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "estimatedDistance" DOUBLE PRECISION,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "insuranceAmount" DOUBLE PRECISION,
ADD COLUMN     "intermediatePointAddress" TEXT,
ADD COLUMN     "intermediatePointLatitude" DOUBLE PRECISION,
ADD COLUMN     "intermediatePointLongitude" DOUBLE PRECISION,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "matchingRadius" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
ADD COLUMN     "matchingScore" DOUBLE PRECISION,
ADD COLUMN     "maxApplications" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "merchantId" TEXT,
ADD COLUMN     "minRating" DOUBLE PRECISION,
ADD COLUMN     "preferredGender" "Gender",
ADD COLUMN     "priorityDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "recurringDays" TEXT,
ADD COLUMN     "relayDelivererId" TEXT,
ADD COLUMN     "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "routeCompatibility" DOUBLE PRECISION,
ADD COLUMN     "subscriptionTier" TEXT,
ADD COLUMN     "trafficFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "urgencyLevel" "UrgencyLevel" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "validationCode" TEXT,
ADD COLUMN     "validationPhoto" TEXT,
ADD COLUMN     "weatherSensitive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "billing_cycles" ADD COLUMN     "contractId" TEXT;

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "adminSignature" TEXT,
ADD COLUMN     "autoRenewal" BOOLEAN DEFAULT false,
ADD COLUMN     "bonusStructure" JSONB,
ADD COLUMN     "commissionRate" DECIMAL(5,4),
ADD COLUMN     "contractNumber" TEXT,
ADD COLUMN     "deliveryZone" TEXT,
ADD COLUMN     "effectiveDate" TIMESTAMP(3),
ADD COLUMN     "exclusivityClause" BOOLEAN DEFAULT false,
ADD COLUMN     "insuranceAmount" DECIMAL(10,2),
ADD COLUMN     "insuranceRequired" BOOLEAN DEFAULT false,
ADD COLUMN     "lastRenegotiationDate" TIMESTAMP(3),
ADD COLUMN     "maxDeliveryRadius" DOUBLE PRECISION,
ADD COLUMN     "merchantCategory" TEXT,
ADD COLUMN     "merchantSignature" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "minimumVolume" INTEGER,
ADD COLUMN     "monthlyFee" DECIMAL(10,2),
ADD COLUMN     "negotiationHistory" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "penaltyClause" JSONB,
ADD COLUMN     "performanceTargets" JSONB,
ADD COLUMN     "qualityMetrics" JSONB,
ADD COLUMN     "renewalNotice" INTEGER,
ADD COLUMN     "securityDeposit" DECIMAL(10,2),
ADD COLUMN     "serviceLevelAgreement" JSONB,
ADD COLUMN     "signedById" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "terms" JSONB,
ADD COLUMN     "territoryRestrictions" JSONB,
ADD COLUMN     "type" "ContractType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "volumeDiscounts" JSONB;

-- AlterTable
ALTER TABLE "delivery_applications" ADD COLUMN     "autoMatchScore" DOUBLE PRECISION,
ADD COLUMN     "autoVerificationAttempted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoVerificationScore" DOUBLE PRECISION,
ADD COLUMN     "availableFrom" TIMESTAMP(3),
ADD COLUMN     "availableTo" TIMESTAMP(3),
ADD COLUMN     "distanceFromDelivery" DOUBLE PRECISION,
ADD COLUMN     "distanceFromPickup" DOUBLE PRECISION,
ADD COLUMN     "documentsExpiryCheck" TIMESTAMP(3),
ADD COLUMN     "documentsVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "isInPreferredZone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualReviewRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedBy" TEXT;

-- CreateTable
CREATE TABLE "tutorials" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TutorialType" NOT NULL DEFAULT 'ONBOARDING',
    "status" "TutorialStatus" NOT NULL DEFAULT 'DRAFT',
    "targetRole" "UserRole",
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "showOnLogin" BOOLEAN NOT NULL DEFAULT false,
    "showOnPage" TEXT,
    "triggerEvent" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "estimatedDuration" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_steps" (
    "id" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" "StepContentType" NOT NULL DEFAULT 'TEXT',
    "targetElement" TEXT,
    "position" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "actionType" "StepActionType",
    "actionTarget" TEXT,
    "actionValue" TEXT,
    "isSkippable" BOOLEAN NOT NULL DEFAULT true,
    "autoAdvance" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER,
    "validationRule" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorial_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorialId" TEXT NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "skipCount" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tutorial_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tutorial_step_completions" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'COMPLETED',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "actionPerformed" TEXT,
    "userInput" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "hintUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tutorial_step_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "overlay_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overlayData" JSONB NOT NULL,
    "showOnFirstVisit" BOOLEAN NOT NULL DEFAULT true,
    "maxDisplayCount" INTEGER NOT NULL DEFAULT 3,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overlay_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_subscription_details" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentPlan" "ClientSubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "monthlyPrice" DECIMAL(6,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripeSubscriptionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "hasInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuranceAmount" DECIMAL(8,2),
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "hasFirstDeliveryFree" BOOLEAN NOT NULL DEFAULT false,
    "priorityShippingBonus" INTEGER NOT NULL DEFAULT 0,
    "freePriorityPerMonth" INTEGER NOT NULL DEFAULT 0,
    "usedPriorityThisMonth" INTEGER NOT NULL DEFAULT 0,
    "currentMonthUsage" JSONB,
    "lastResetDate" TIMESTAMP(3),
    "previousPlan" "ClientSubscriptionPlan",
    "planChangedAt" TIMESTAMP(3),
    "planChangeReason" TEXT,
    "billingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "usageNotifications" BOOLEAN NOT NULL DEFAULT true,
    "promotionNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_subscription_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_usage_history" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSavings" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "priorityDeliveries" INTEGER NOT NULL DEFAULT 0,
    "freePriorityUsed" INTEGER NOT NULL DEFAULT 0,
    "insuranceClaims" INTEGER NOT NULL DEFAULT 0,
    "packageDeliveries" INTEGER NOT NULL DEFAULT 0,
    "personalServices" INTEGER NOT NULL DEFAULT 0,
    "storageUsage" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "customerFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_promotions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "promotionCode" TEXT NOT NULL,
    "promotionType" TEXT NOT NULL,
    "discountAmount" DECIMAL(8,2),
    "discountPercent" INTEGER,
    "freeMonths" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timesUsed" INTEGER NOT NULL DEFAULT 1,
    "maxUsage" INTEGER,

    CONSTRAINT "subscription_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_configs" (
    "id" TEXT NOT NULL,
    "planType" "ClientSubscriptionPlan" NOT NULL,
    "monthlyPrice" DECIMAL(6,2) NOT NULL,
    "yearlyPrice" DECIMAL(6,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "insuranceAmount" DECIMAL(8,2),
    "discountPercentage" INTEGER NOT NULL DEFAULT 0,
    "priorityShippingBonus" INTEGER NOT NULL DEFAULT 0,
    "freePriorityPerMonth" INTEGER NOT NULL DEFAULT 0,
    "hasFirstDeliveryFree" BOOLEAN NOT NULL DEFAULT false,
    "maxDeliveriesPerMonth" INTEGER,
    "maxStorageHours" INTEGER,
    "maxInsuranceClaims" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featuredPlan" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "limitations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "subscription_plan_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_matchings" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "matchingScore" DOUBLE PRECISION NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "ratingScore" DOUBLE PRECISION NOT NULL,
    "availabilityScore" DOUBLE PRECISION NOT NULL,
    "preferenceScore" DOUBLE PRECISION NOT NULL,
    "routeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experienceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loyaltyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distance" DOUBLE PRECISION NOT NULL,
    "estimatedTime" INTEGER NOT NULL,
    "isInRoute" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "trafficLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "weatherCondition" TEXT,
    "timeOfDay" TEXT,
    "dayOfWeek" INTEGER,
    "successProbability" DOUBLE PRECISION,
    "estimatedEarnings" DOUBLE PRECISION,
    "customerSatisfactionPrediction" DOUBLE PRECISION,
    "status" "MatchingStatus" NOT NULL DEFAULT 'SUGGESTED',
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "announcement_matchings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_notifications" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "announcementId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "sentByEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentByPush" BOOLEAN NOT NULL DEFAULT false,
    "sentBySms" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_configurations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "distanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "ratingWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "availabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "preferenceWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "speedWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "routeWeight" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "experienceWeight" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "performanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "loyaltyWeight" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "minMatchingScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "maxDistance" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "minDelivererRating" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "maxDeliveriesPerHour" INTEGER NOT NULL DEFAULT 3,
    "notificationTimeout" INTEGER NOT NULL DEFAULT 15,
    "maxSuggestions" INTEGER NOT NULL DEFAULT 5,
    "reminderInterval" INTEGER NOT NULL DEFAULT 5,
    "enableWeatherFactor" BOOLEAN NOT NULL DEFAULT true,
    "enableTrafficFactor" BOOLEAN NOT NULL DEFAULT true,
    "enableTimeOfDayFactor" BOOLEAN NOT NULL DEFAULT true,
    "enableMLPredictions" BOOLEAN NOT NULL DEFAULT false,
    "mlModelVersion" TEXT,
    "minPredictionConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "experimentGroup" TEXT,
    "experimentActive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_routes" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "departureAddress" TEXT NOT NULL,
    "departureCity" TEXT NOT NULL,
    "departurePostalCode" TEXT NOT NULL,
    "departureLatitude" DOUBLE PRECISION,
    "departureLongitude" DOUBLE PRECISION,
    "arrivalAddress" TEXT NOT NULL,
    "arrivalCity" TEXT NOT NULL,
    "arrivalPostalCode" TEXT NOT NULL,
    "arrivalLatitude" DOUBLE PRECISION,
    "arrivalLongitude" DOUBLE PRECISION,
    "waypoints" JSONB,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringDays" TEXT,
    "recurringEndDate" TIMESTAMP(3),
    "availableCapacity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxPackageSize" TEXT,
    "acceptFragile" BOOLEAN NOT NULL DEFAULT true,
    "acceptCooling" BOOLEAN NOT NULL DEFAULT false,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'CAR',
    "enableMatching" BOOLEAN NOT NULL DEFAULT true,
    "notificationRadius" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "minPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_announcement_matches" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "timeScore" DOUBLE PRECISION NOT NULL,
    "capacityScore" DOUBLE PRECISION NOT NULL,
    "pickupDetour" DOUBLE PRECISION NOT NULL,
    "deliveryDetour" DOUBLE PRECISION NOT NULL,
    "totalDetour" DOUBLE PRECISION NOT NULL,
    "estimatedProfit" DOUBLE PRECISION NOT NULL,
    "status" "MatchingStatus" NOT NULL DEFAULT 'SUGGESTED',
    "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "route_announcement_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_documents" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" "RequiredDocumentType" NOT NULL,
    "documentUrl" TEXT,
    "status" "DocumentVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "expiryDate" TIMESTAMP(3),
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "ocrText" TEXT,
    "ocrConfidence" DOUBLE PRECISION,
    "autoValidated" BOOLEAN NOT NULL DEFAULT false,
    "validationScore" DOUBLE PRECISION,
    "validationFlags" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "replacedAt" TIMESTAMP(3),
    "checksum" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "watermarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_preferences" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "preferredTypes" "AnnouncementType"[],
    "maxDistanceKm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "minPricePerKm" DOUBLE PRECISION,
    "preferWeekends" BOOLEAN NOT NULL DEFAULT true,
    "preferEvenings" BOOLEAN NOT NULL DEFAULT true,
    "acceptUrgent" BOOLEAN NOT NULL DEFAULT true,
    "maxWeight" DOUBLE PRECISION,
    "hasVehicle" BOOLEAN NOT NULL DEFAULT false,
    "vehicleType" "VehicleType",
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyByPush" BOOLEAN NOT NULL DEFAULT true,
    "notifyBySms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_validation_audits" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "previousStatus" "DocumentVerificationStatus" NOT NULL,
    "newStatus" "DocumentVerificationStatus" NOT NULL,
    "actionBy" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,
    "validationData" JSONB,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_validation_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_schedules" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxDeliveries" INTEGER NOT NULL DEFAULT 3,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "breakStart" TEXT,
    "breakEnd" TEXT,
    "timeSlots" INTEGER NOT NULL DEFAULT 4,
    "preferredZones" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_service_routes" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "estimatedDuration" INTEGER,
    "averageEarnings" DOUBLE PRECISION,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "lastUsed" TIMESTAMP(3),
    "maxDeliveries" INTEGER NOT NULL DEFAULT 5,
    "vehicleType" TEXT,
    "trafficFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "weatherSensitive" BOOLEAN NOT NULL DEFAULT false,
    "preferredTimeSlots" TEXT[],
    "dayPreferences" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_service_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "centerLatitude" DOUBLE PRECISION NOT NULL,
    "centerLongitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "cityName" TEXT,
    "postalCodes" TEXT[],
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION,
    "trafficLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "parkingDifficulty" TEXT NOT NULL DEFAULT 'EASY',
    "accessNotes" TEXT,
    "timeRestrictions" TEXT[],
    "vehicleRestrictions" TEXT[],
    "weatherSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_statistics" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION,
    "totalDistance" DOUBLE PRECISION,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelConsumption" DOUBLE PRECISION,
    "customerSatisfaction" DOUBLE PRECISION,
    "onTimeRate" DOUBLE PRECISION,
    "weatherCondition" TEXT,
    "trafficCondition" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_availabilities" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverer_availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_stats" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "completedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "cancelledDeliveries" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestCompletionTime" INTEGER,
    "averageCompletionTime" DOUBLE PRECISION,
    "lastDeliveryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_criteria" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "algorithm" "MatchingAlgorithm" NOT NULL DEFAULT 'HYBRID',
    "priority" "MatchingPriority" NOT NULL DEFAULT 'NORMAL',
    "maxDistance" DOUBLE PRECISION,
    "preferredRadius" DOUBLE PRECISION,
    "allowPartialRoute" BOOLEAN NOT NULL DEFAULT true,
    "timeWindowStart" TIMESTAMP(3),
    "timeWindowEnd" TIMESTAMP(3),
    "maxDelay" INTEGER,
    "requiredVehicleTypes" "VehicleType"[],
    "minVehicleCapacity" DOUBLE PRECISION,
    "minDelivererRating" DOUBLE PRECISION,
    "preferredLanguages" TEXT[],
    "genderPreference" "Gender",
    "maxPrice" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "allowNegotiation" BOOLEAN NOT NULL DEFAULT true,
    "packageTypes" "PackageType"[],
    "maxWeight" DOUBLE PRECISION,
    "requiresHandling" BOOLEAN NOT NULL DEFAULT false,
    "autoAssignAfter" INTEGER,
    "maxSuggestions" INTEGER NOT NULL DEFAULT 5,
    "scoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matching_results" (
    "id" TEXT NOT NULL,
    "criteriaId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "status" "MatchingResultStatus" NOT NULL DEFAULT 'PENDING',
    "overallScore" DOUBLE PRECISION NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "timeScore" DOUBLE PRECISION NOT NULL,
    "priceScore" DOUBLE PRECISION NOT NULL,
    "ratingScore" DOUBLE PRECISION NOT NULL,
    "calculatedDistance" DOUBLE PRECISION NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "suggestedPrice" DECIMAL(10,2) NOT NULL,
    "algorithm" "MatchingAlgorithm" NOT NULL,
    "processingTime" INTEGER NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matching_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_matching_preferences" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "preferredRadius" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "maxRadius" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "homeLatitude" DOUBLE PRECISION,
    "homeLongitude" DOUBLE PRECISION,
    "availableFrom" TEXT,
    "availableTo" TEXT,
    "availableDays" INTEGER[],
    "maxWorkingHours" INTEGER NOT NULL DEFAULT 8,
    "acceptedPackageTypes" "PackageType"[],
    "maxPackageWeight" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "acceptFragile" BOOLEAN NOT NULL DEFAULT true,
    "acceptRefrigerated" BOOLEAN NOT NULL DEFAULT false,
    "minPrice" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "maxPrice" DECIMAL(10,2),
    "acceptNegotiation" BOOLEAN NOT NULL DEFAULT true,
    "instantNotification" BOOLEAN NOT NULL DEFAULT true,
    "maxSuggestions" INTEGER NOT NULL DEFAULT 10,
    "autoDeclineAfter" INTEGER NOT NULL DEFAULT 60,
    "averageResponseTime" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliverer_matching_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_announcements" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "detourDistance" DOUBLE PRECISION NOT NULL,
    "detourTime" INTEGER NOT NULL,
    "priceOffered" DECIMAL(10,2) NOT NULL,
    "status" "MatchingStatus" NOT NULL DEFAULT 'SUGGESTED',
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfc_cards" (
    "id" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" "NFCCardStatus" NOT NULL DEFAULT 'INACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "delivererId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfc_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfc_card_assignments" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "status" "NFCAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "reason" TEXT,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nfc_card_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfc_card_transactions" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "transactionType" "NFCTransactionType" NOT NULL,
    "amount" DECIMAL(10,2),
    "description" TEXT,
    "location" TEXT,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "deviceInfo" TEXT,
    "isSuccessful" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "deliveryId" TEXT,
    "transactionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nfc_card_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_validation_codes" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "generatedBy" TEXT,
    "validatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_validation_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_planned_routes" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlannedRouteStatus" NOT NULL DEFAULT 'DRAFT',
    "departureAddress" TEXT NOT NULL,
    "departureLat" DOUBLE PRECISION NOT NULL,
    "departureLng" DOUBLE PRECISION NOT NULL,
    "arrivalAddress" TEXT NOT NULL,
    "arrivalLat" DOUBLE PRECISION NOT NULL,
    "arrivalLng" DOUBLE PRECISION NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "maxWeight" DOUBLE PRECISION,
    "maxVolume" DOUBLE PRECISION,
    "maxPackages" INTEGER,
    "vehicleRequired" "VehicleType",
    "pricePerKm" DOUBLE PRECISION,
    "fixedPrice" DOUBLE PRECISION,
    "minimumPrice" DOUBLE PRECISION,
    "waypoints" JSONB,
    "availableSeats" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "estimatedDistance" DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "actualDistance" DOUBLE PRECISION,
    "actualDuration" INTEGER,
    "notifyOnMatch" BOOLEAN NOT NULL DEFAULT true,
    "autoAcceptMatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "deliverer_planned_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_route_announcements" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "status" "MatchingStatus" NOT NULL DEFAULT 'SUGGESTED',
    "pickupOrder" INTEGER,
    "deliveryOrder" INTEGER,
    "detourDistance" DOUBLE PRECISION,
    "detourTime" INTEGER,
    "delivererAccepted" BOOLEAN NOT NULL DEFAULT false,
    "clientAccepted" BOOLEAN NOT NULL DEFAULT false,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "planned_route_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliverer_route_performances" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "executionDate" TIMESTAMP(3) NOT NULL,
    "actualDistance" DOUBLE PRECISION NOT NULL,
    "actualDuration" INTEGER NOT NULL,
    "fuelCost" DOUBLE PRECISION,
    "tollCost" DOUBLE PRECISION,
    "totalEarnings" DOUBLE PRECISION NOT NULL,
    "packagesDelivered" INTEGER NOT NULL DEFAULT 0,
    "onTimeDeliveries" INTEGER NOT NULL DEFAULT 0,
    "lateDeliveries" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "customerFeedback" TEXT,
    "issues" JSONB,
    "delays" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "deliverer_route_performances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_optimizations" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startingPoint" JSONB NOT NULL,
    "destinations" JSONB NOT NULL,
    "constraints" JSONB NOT NULL,
    "optimizedRoute" JSONB,
    "totalDistance" DOUBLE PRECISION,
    "totalDuration" INTEGER,
    "estimatedEarnings" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "route_optimizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderException" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ExceptionType" NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "reason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderSpecialSlot" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSpecialSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_services" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceType" "PersonalServiceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "basePrice" DECIMAL(8,2) NOT NULL,
    "pricePerHour" DECIMAL(6,2),
    "pricePerKm" DECIMAL(4,2),
    "minimumPrice" DECIMAL(6,2),
    "serviceRadius" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "baseLocation" TEXT NOT NULL,
    "baseLat" DOUBLE PRECISION NOT NULL,
    "baseLng" DOUBLE PRECISION NOT NULL,
    "maxPassengers" INTEGER,
    "hasWheelchairAccess" BOOLEAN,
    "vehicleType" "VehicleType",
    "hasChildSeat" BOOLEAN,
    "airportCoverage" TEXT[],
    "trackFlights" BOOLEAN,
    "waitingIncluded" INTEGER,
    "luggageCapacity" TEXT,
    "maxShoppingValue" DECIMAL(8,2),
    "hasShoppingCard" BOOLEAN,
    "preferredStores" TEXT[],
    "specialtyProducts" BOOLEAN,
    "countriesCovered" TEXT[],
    "maxPurchaseValue" DECIMAL(10,2),
    "customsHandling" BOOLEAN,
    "shippingIncluded" BOOLEAN,
    "petTypesAccepted" TEXT[],
    "maxPetSize" TEXT,
    "hasVeterinaryExp" BOOLEAN,
    "homeOrTravel" TEXT,
    "serviceCategories" TEXT[],
    "toolsProvided" BOOLEAN,
    "materialsIncluded" BOOLEAN,
    "maxJobDuration" INTEGER,
    "certifications" JSONB,
    "insurance" JSONB,
    "backgroundCheck" BOOLEAN NOT NULL DEFAULT false,
    "advanceBooking" INTEGER NOT NULL DEFAULT 24,
    "cancellationPolicy" TEXT,
    "isEmergencyService" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_service_bookings" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "serviceAddress" TEXT NOT NULL,
    "serviceLat" DOUBLE PRECISION NOT NULL,
    "serviceLng" DOUBLE PRECISION NOT NULL,
    "accessInstructions" TEXT,
    "serviceDetails" JSONB NOT NULL,
    "specialRequests" TEXT,
    "quotedPrice" DECIMAL(8,2) NOT NULL,
    "finalPrice" DECIMAL(8,2),
    "extraCharges" JSONB,
    "providerArrivedAt" TIMESTAMP(3),
    "serviceStartedAt" TIMESTAMP(3),
    "serviceCompletedAt" TIMESTAMP(3),
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "completionProof" TEXT,
    "clientNotes" TEXT,
    "providerNotes" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" "CancellationReason",
    "rescheduledFrom" TIMESTAMP(3),
    "rescheduledTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_service_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_service_reviews" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "punctuality" INTEGER,
    "quality" INTEGER,
    "communication" INTEGER,
    "value" INTEGER,
    "wouldRecommend" BOOLEAN,
    "wouldBookAgain" BOOLEAN,
    "providerResponse" TEXT,
    "providerResponseAt" TIMESTAMP(3),
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_service_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_service_photos" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isMainPhoto" BOOLEAN NOT NULL DEFAULT false,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_service_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_habilitations" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "habilitationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuingAuthority" TEXT NOT NULL,
    "status" "HabilitationStatus" NOT NULL DEFAULT 'PENDING',
    "certificateUrl" TEXT,
    "documentUrls" TEXT[],
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "renewalRequired" BOOLEAN NOT NULL DEFAULT false,
    "renewalNoticeDays" INTEGER,
    "lastRenewalAt" TIMESTAMP(3),
    "validationNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_habilitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_service_habilitations" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "habilitationId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "provider_service_habilitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_interventions" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "interventionType" "InterventionType" NOT NULL DEFAULT 'SCHEDULED',
    "status" "InterventionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "travelTime" INTEGER,
    "travelDistance" DOUBLE PRECISION,
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "gpsCheckin" JSONB,
    "gpsCheckout" JSONB,
    "workDescription" TEXT NOT NULL,
    "materialUsed" JSONB,
    "toolsUsed" JSONB,
    "beforePhotos" TEXT[],
    "duringPhotos" TEXT[],
    "afterPhotos" TEXT[],
    "signatureUrl" TEXT,
    "completionProof" TEXT,
    "issues" JSONB,
    "additionalWork" TEXT,
    "extraCharges" JSONB,
    "hoursWorked" DOUBLE PRECISION,
    "quotedPrice" DECIMAL(8,2) NOT NULL,
    "finalPrice" DECIMAL(8,2),
    "invoiceGenerated" BOOLEAN NOT NULL DEFAULT false,
    "invoiceUrl" TEXT,
    "clientSatisfaction" INTEGER,
    "clientFeedback" TEXT,
    "internalNotes" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "provider_interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_evaluations" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "interventionId" TEXT,
    "evaluationType" "EvaluationType" NOT NULL DEFAULT 'CLIENT_TO_PROVIDER',
    "overallRating" INTEGER NOT NULL,
    "comment" TEXT,
    "punctualityRating" INTEGER,
    "qualityRating" INTEGER,
    "communicationRating" INTEGER,
    "professionalismRating" INTEGER,
    "valueRating" INTEGER,
    "cleanlinessRating" INTEGER,
    "wouldRecommend" BOOLEAN,
    "wouldRebook" BOOLEAN,
    "strengths" TEXT[],
    "improvements" TEXT[],
    "providerResponse" TEXT,
    "providerResponseAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationNotes" TEXT,
    "affectsRating" BOOLEAN NOT NULL DEFAULT true,
    "isDisplayed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_auto_invoicing" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "AutoInvoicingStatus" NOT NULL DEFAULT 'DISABLED',
    "billingDay" INTEGER NOT NULL DEFAULT 1,
    "companyName" TEXT,
    "siretNumber" TEXT,
    "vatNumber" TEXT,
    "billingAddress" JSONB,
    "invoiceTemplate" TEXT,
    "includeDetails" BOOLEAN NOT NULL DEFAULT true,
    "groupByService" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountIban" TEXT,
    "bankAccountBic" TEXT,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "minimumAmount" DECIMAL(8,2),
    "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastInvoiceDate" TIMESTAMP(3),
    "nextInvoiceDate" TIMESTAMP(3),

    CONSTRAINT "provider_auto_invoicing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_monthly_invoices" (
    "id" TEXT NOT NULL,
    "autoInvoicingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "totalEarnings" DECIMAL(10,2) NOT NULL,
    "platformCommission" DECIMAL(8,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "vatAmount" DECIMAL(8,2),
    "interventionCount" INTEGER NOT NULL DEFAULT 0,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "pdfUrl" TEXT,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_monthly_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAppointment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT,
    "bookingId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRule" TEXT,
    "isVirtual" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "addressId" TEXT,
    "locationNotes" TEXT,
    "price" DECIMAL(65,30),
    "paymentId" TEXT,
    "clientNotes" TEXT,
    "providerNotes" TEXT,
    "internalNotes" TEXT,
    "confirmationCode" TEXT,
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "remindersSent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastReminderSent" TIMESTAMP(3),
    "notificationsSent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "originalAppointmentId" TEXT,
    "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "rescheduleReason" "RescheduleReason",
    "rescheduleNotes" TEXT,
    "rescheduledBy" TEXT,
    "rescheduledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" "CancellationReason",
    "cancellationNotes" TEXT,
    "refundAmount" DECIMAL(65,30),
    "cancellationFee" DECIMAL(65,30),
    "completedAt" TIMESTAMP(3),
    "noShowAt" TIMESTAMP(3),
    "clientPresent" BOOLEAN,
    "providerPresent" BOOLEAN,
    "hasReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClientAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentHistory" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT,
    "changedBy" TEXT,
    "changedByRole" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentNotification" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "AppointmentNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledFor" TIMESTAMP(3),
    "failed" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentSlot" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "bookedBy" TEXT,
    "appointmentId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringRule" TEXT,
    "parentSlotId" TEXT,
    "price" DECIMAL(65,30),
    "minNotice" INTEGER,
    "maxAdvance" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAvailabilityRule" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "daysOfWeek" INTEGER[],
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "slotDuration" INTEGER NOT NULL,
    "breakBetween" INTEGER NOT NULL DEFAULT 0,
    "maxAppointmentsPerDay" INTEGER,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentAvailabilityException" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "type" "ExceptionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentAvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_cash_registers" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "cashRegisterType" TEXT NOT NULL,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSync" TIMESTAMP(3),
    "syncFrequency" INTEGER NOT NULL DEFAULT 5,
    "autoCreateDelivery" BOOLEAN NOT NULL DEFAULT true,
    "defaultRadius" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "deliveryTimeSlots" JSONB,
    "enableZoneGrouping" BOOLEAN NOT NULL DEFAULT true,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 5,
    "groupingRadius" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "notifyCustomer" BOOLEAN NOT NULL DEFAULT true,
    "notifyMerchant" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_cash_registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_drops" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerEmail" TEXT,
    "userId" TEXT,
    "items" JSONB NOT NULL,
    "totalAmount" DECIMAL(8,2) NOT NULL,
    "deliveryFee" DECIMAL(6,2) NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLat" DOUBLE PRECISION NOT NULL,
    "deliveryLng" DOUBLE PRECISION NOT NULL,
    "deliveryInstructions" TEXT,
    "type" "CartDropType" NOT NULL DEFAULT 'INSTANT',
    "status" "CartDropStatus" NOT NULL DEFAULT 'PENDING',
    "requestedDeliveryTime" TIMESTAMP(3),
    "confirmedDeliveryTime" TIMESTAMP(3),
    "groupId" TEXT,
    "groupPosition" INTEGER,
    "isGroupLead" BOOLEAN NOT NULL DEFAULT false,
    "preparationTime" INTEGER,
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "assignedDelivererId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "deliveryCode" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT,
    "paidAt" TIMESTAMP(3),
    "merchantCommission" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "cart_drops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_drop_groups" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deliveryZone" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "status" "CartDropStatus" NOT NULL DEFAULT 'PENDING',
    "maxItems" INTEGER NOT NULL DEFAULT 5,
    "currentItems" INTEGER NOT NULL DEFAULT 0,
    "totalWeight" DOUBLE PRECISION,
    "totalVolume" DOUBLE PRECISION,
    "assignedDelivererId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "optimizedRoute" JSONB,
    "estimatedDuration" INTEGER,
    "estimatedDistance" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_drop_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_delivery_zones" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coordinates" JSONB NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION,
    "deliveryFee" DECIMAL(6,2) NOT NULL,
    "freeThreshold" DECIMAL(8,2),
    "maxDeliveryTime" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "timeSlots" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "groupingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minGroupSize" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_register_terminals" (
    "id" TEXT NOT NULL,
    "cashRegisterId" TEXT NOT NULL,
    "terminalName" TEXT NOT NULL,
    "terminalId" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "softwareVersion" TEXT,
    "lastHeartbeat" TIMESTAMP(3),
    "displayCartDrop" BOOLEAN NOT NULL DEFAULT true,
    "autoSuggestDelivery" BOOLEAN NOT NULL DEFAULT true,
    "dailyTransactions" INTEGER NOT NULL DEFAULT 0,
    "cartDropRequests" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_register_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultType" "ContractType" NOT NULL DEFAULT 'STANDARD',
    "defaultMonthlyFee" DECIMAL(10,2),
    "defaultCommissionRate" DECIMAL(5,4),
    "defaultDuration" INTEGER,
    "targetMerchantCategory" TEXT,
    "requiredDocuments" JSONB,
    "minimumBusinessAge" INTEGER,
    "minimumTurnover" DECIMAL(12,2),
    "defaultExclusivityClause" BOOLEAN DEFAULT false,
    "defaultInsuranceRequired" BOOLEAN DEFAULT false,
    "defaultSecurityDeposit" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_amendments" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "amendmentType" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "businessJustification" TEXT,
    "impactAssessment" JSONB,
    "merchantApproved" BOOLEAN DEFAULT false,
    "adminApproved" BOOLEAN DEFAULT false,
    "merchantApprovedAt" TIMESTAMP(3),
    "adminApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "signedById" TEXT,

    CONSTRAINT "contract_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_negotiations" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "negotiationRound" INTEGER NOT NULL,
    "proposedChanges" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "response" TEXT,
    "respondedBy" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_performance" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "averageDeliveryTime" DOUBLE PRECISION,
    "customerSatisfaction" DOUBLE PRECISION,
    "totalRevenue" DECIMAL(12,2),
    "commissionPaid" DECIMAL(12,2),
    "avgOrderValue" DECIMAL(10,2),
    "slaCompliance" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "targetsMet" JSONB,
    "bonusEarned" DECIMAL(10,2),
    "penaltiesApplied" DECIMAL(10,2),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "contract_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_kpis" (
    "id" TEXT NOT NULL,
    "kpiType" "KpiType" NOT NULL,
    "currentValue" DECIMAL(15,2) NOT NULL,
    "previousValue" DECIMAL(15,2),
    "targetValue" DECIMAL(15,2),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "formula" TEXT,
    "alertThreshold" DECIMAL(15,2),
    "isAlert" BOOLEAN NOT NULL DEFAULT false,
    "alertMessage" TEXT,
    "growthRate" DECIMAL(8,4),
    "trend" TEXT,
    "siteBreakdown" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_history" (
    "id" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multi_site_stats" (
    "id" TEXT NOT NULL,
    "siteType" "SiteStatsType" NOT NULL,
    "siteName" TEXT NOT NULL,
    "siteAddress" TEXT NOT NULL,
    "siteLat" DOUBLE PRECISION NOT NULL,
    "siteLng" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "periodType" TEXT NOT NULL,
    "deliveryCount" INTEGER NOT NULL DEFAULT 0,
    "activeDeliverers" INTEGER NOT NULL DEFAULT 0,
    "storageOccupancy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDeliveryTime" DOUBLE PRECISION,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "averageOrderValue" DECIMAL(8,2),
    "customerSatisfaction" DOUBLE PRECISION,
    "onTimeDeliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newCustomers" INTEGER NOT NULL DEFAULT 0,
    "activeCustomers" INTEGER NOT NULL DEFAULT 0,
    "churnRate" DOUBLE PRECISION,
    "maxStorageCapacity" INTEGER NOT NULL,
    "currentStorageUsage" INTEGER NOT NULL DEFAULT 0,
    "availableDeliverers" INTEGER NOT NULL DEFAULT 0,
    "activeAlerts" INTEGER NOT NULL DEFAULT 0,
    "criticalIssues" INTEGER NOT NULL DEFAULT 0,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "rankAmongSites" INTEGER,
    "performanceIndex" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "multi_site_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_forecasts" (
    "id" TEXT NOT NULL,
    "forecastType" "ForecastType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "projectedRevenue" DECIMAL(15,2) NOT NULL,
    "projectedCosts" DECIMAL(15,2) NOT NULL,
    "projectedProfit" DECIMAL(15,2) NOT NULL,
    "projectedGrowthRate" DECIMAL(6,4) NOT NULL,
    "projectedDeliveries" INTEGER NOT NULL,
    "projectedNewUsers" INTEGER NOT NULL,
    "projectedChurnRate" DECIMAL(6,4) NOT NULL,
    "scenarioType" TEXT NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "assumptions" JSONB NOT NULL,
    "riskFactors" JSONB,
    "actualRevenue" DECIMAL(15,2),
    "actualCosts" DECIMAL(15,2),
    "actualProfit" DECIMAL(15,2),
    "accuracyScore" DOUBLE PRECISION,
    "lastRevisedAt" TIMESTAMP(3),
    "revisionNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_monitoring" (
    "id" TEXT NOT NULL,
    "systemStatus" TEXT NOT NULL DEFAULT 'HEALTHY',
    "uptime" DOUBLE PRECISION NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "errorRate" DOUBLE PRECISION NOT NULL,
    "dbConnectionCount" INTEGER NOT NULL,
    "dbQueryTime" DOUBLE PRECISION NOT NULL,
    "dbStorageUsage" DOUBLE PRECISION NOT NULL,
    "apiRequestCount" INTEGER NOT NULL,
    "apiErrorCount" INTEGER NOT NULL,
    "apiLatency" DOUBLE PRECISION NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "concurrentSessions" INTEGER NOT NULL,
    "newRegistrations" INTEGER NOT NULL,
    "ongoingDeliveries" INTEGER NOT NULL,
    "pendingDeliveries" INTEGER NOT NULL,
    "completedToday" INTEGER NOT NULL,
    "revenueToday" DECIMAL(10,2) NOT NULL,
    "transactionsCount" INTEGER NOT NULL,
    "averageBasket" DECIMAL(8,2) NOT NULL,
    "activeAlerts" JSONB,
    "criticalAlerts" INTEGER NOT NULL DEFAULT 0,
    "warningAlerts" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_monitoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_configurations" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "threshold" DECIMAL(15,2) NOT NULL,
    "operator" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailNotification" BOOLEAN NOT NULL DEFAULT true,
    "smsNotification" BOOLEAN NOT NULL DEFAULT false,
    "pushNotification" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "notifyRoles" TEXT[],
    "notifyUsers" TEXT[],
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_triggers" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "triggerValue" DECIMAL(15,2) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_verifications" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifierId" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "businessDocuments" TEXT[],
    "identityDocuments" TEXT[],
    "addressDocuments" TEXT[],
    "businessRegistered" BOOLEAN NOT NULL DEFAULT false,
    "taxCompliant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "merchant_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_verifications" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifierId" TEXT,
    "notes" TEXT,
    "rejectionReason" TEXT,
    "identityDocuments" TEXT[],
    "qualificationDocs" TEXT[],
    "insuranceDocs" TEXT[],
    "addressDocuments" TEXT[],
    "qualificationsVerified" BOOLEAN NOT NULL DEFAULT false,
    "insuranceValid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "provider_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_steps_tutorialId_stepNumber_key" ON "tutorial_steps"("tutorialId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_progress_userId_tutorialId_key" ON "tutorial_progress"("userId", "tutorialId");

-- CreateIndex
CREATE UNIQUE INDEX "tutorial_step_completions_progressId_stepId_key" ON "tutorial_step_completions"("progressId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "overlay_configs_userId_pagePath_key" ON "overlay_configs"("userId", "pagePath");

-- CreateIndex
CREATE UNIQUE INDEX "client_subscription_details_userId_key" ON "client_subscription_details"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "client_subscription_details_stripeSubscriptionId_key" ON "client_subscription_details"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "client_subscription_details_currentPlan_idx" ON "client_subscription_details"("currentPlan");

-- CreateIndex
CREATE INDEX "client_subscription_details_nextBillingDate_idx" ON "client_subscription_details"("nextBillingDate");

-- CreateIndex
CREATE INDEX "client_subscription_details_stripeSubscriptionId_idx" ON "client_subscription_details"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_stripePaymentId_key" ON "subscription_payments"("stripePaymentId");

-- CreateIndex
CREATE INDEX "subscription_payments_subscriptionId_idx" ON "subscription_payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_payments_status_idx" ON "subscription_payments"("status");

-- CreateIndex
CREATE INDEX "subscription_payments_periodStart_periodEnd_idx" ON "subscription_payments"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "monthly_usage_history_subscriptionId_idx" ON "monthly_usage_history"("subscriptionId");

-- CreateIndex
CREATE INDEX "monthly_usage_history_year_month_idx" ON "monthly_usage_history"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_usage_history_subscriptionId_year_month_key" ON "monthly_usage_history"("subscriptionId", "year", "month");

-- CreateIndex
CREATE INDEX "subscription_promotions_subscriptionId_idx" ON "subscription_promotions"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_promotions_promotionCode_idx" ON "subscription_promotions"("promotionCode");

-- CreateIndex
CREATE INDEX "subscription_promotions_validUntil_idx" ON "subscription_promotions"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plan_configs_planType_key" ON "subscription_plan_configs"("planType");

-- CreateIndex
CREATE INDEX "subscription_plan_configs_isActive_sortOrder_idx" ON "subscription_plan_configs"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "announcement_matchings_announcementId_idx" ON "announcement_matchings"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_matchings_delivererId_idx" ON "announcement_matchings"("delivererId");

-- CreateIndex
CREATE INDEX "announcement_matchings_matchingScore_idx" ON "announcement_matchings"("matchingScore");

-- CreateIndex
CREATE INDEX "announcement_matchings_status_idx" ON "announcement_matchings"("status");

-- CreateIndex
CREATE INDEX "announcement_matchings_successProbability_idx" ON "announcement_matchings"("successProbability");

-- CreateIndex
CREATE INDEX "announcement_matchings_calculatedAt_idx" ON "announcement_matchings"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_matchings_announcementId_delivererId_key" ON "announcement_matchings"("announcementId", "delivererId");

-- CreateIndex
CREATE INDEX "deliverer_notifications_delivererId_idx" ON "deliverer_notifications"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_notifications_announcementId_idx" ON "deliverer_notifications"("announcementId");

-- CreateIndex
CREATE INDEX "deliverer_notifications_type_idx" ON "deliverer_notifications"("type");

-- CreateIndex
CREATE INDEX "deliverer_notifications_status_idx" ON "deliverer_notifications"("status");

-- CreateIndex
CREATE INDEX "deliverer_notifications_sentAt_idx" ON "deliverer_notifications"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "matching_configurations_name_key" ON "matching_configurations"("name");

-- CreateIndex
CREATE INDEX "matching_configurations_isActive_idx" ON "matching_configurations"("isActive");

-- CreateIndex
CREATE INDEX "matching_configurations_experimentGroup_idx" ON "matching_configurations"("experimentGroup");

-- CreateIndex
CREATE INDEX "deliverer_routes_delivererId_idx" ON "deliverer_routes"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_routes_departureCity_idx" ON "deliverer_routes"("departureCity");

-- CreateIndex
CREATE INDEX "deliverer_routes_arrivalCity_idx" ON "deliverer_routes"("arrivalCity");

-- CreateIndex
CREATE INDEX "deliverer_routes_departureDate_idx" ON "deliverer_routes"("departureDate");

-- CreateIndex
CREATE INDEX "deliverer_routes_isActive_idx" ON "deliverer_routes"("isActive");

-- CreateIndex
CREATE INDEX "route_announcement_matches_routeId_idx" ON "route_announcement_matches"("routeId");

-- CreateIndex
CREATE INDEX "route_announcement_matches_announcementId_idx" ON "route_announcement_matches"("announcementId");

-- CreateIndex
CREATE INDEX "route_announcement_matches_matchScore_idx" ON "route_announcement_matches"("matchScore");

-- CreateIndex
CREATE INDEX "route_announcement_matches_status_idx" ON "route_announcement_matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "route_announcement_matches_routeId_announcementId_key" ON "route_announcement_matches"("routeId", "announcementId");

-- CreateIndex
CREATE INDEX "application_documents_applicationId_idx" ON "application_documents"("applicationId");

-- CreateIndex
CREATE INDEX "application_documents_status_idx" ON "application_documents"("status");

-- CreateIndex
CREATE INDEX "application_documents_documentType_idx" ON "application_documents"("documentType");

-- CreateIndex
CREATE INDEX "application_documents_expiryDate_idx" ON "application_documents"("expiryDate");

-- CreateIndex
CREATE INDEX "application_documents_autoValidated_idx" ON "application_documents"("autoValidated");

-- CreateIndex
CREATE UNIQUE INDEX "application_documents_applicationId_documentType_version_key" ON "application_documents"("applicationId", "documentType", "version");

-- CreateIndex
CREATE UNIQUE INDEX "deliverer_preferences_delivererId_key" ON "deliverer_preferences"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_preferences_delivererId_idx" ON "deliverer_preferences"("delivererId");

-- CreateIndex
CREATE INDEX "document_validation_audits_documentId_idx" ON "document_validation_audits"("documentId");

-- CreateIndex
CREATE INDEX "document_validation_audits_actionBy_idx" ON "document_validation_audits"("actionBy");

-- CreateIndex
CREATE INDEX "document_validation_audits_actionType_idx" ON "document_validation_audits"("actionType");

-- CreateIndex
CREATE INDEX "document_validation_audits_createdAt_idx" ON "document_validation_audits"("createdAt");

-- CreateIndex
CREATE INDEX "deliverer_schedules_delivererId_idx" ON "deliverer_schedules"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_schedules_dayOfWeek_idx" ON "deliverer_schedules"("dayOfWeek");

-- CreateIndex
CREATE INDEX "deliverer_schedules_isAvailable_idx" ON "deliverer_schedules"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "deliverer_schedules_delivererId_dayOfWeek_key" ON "deliverer_schedules"("delivererId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "schedule_exceptions_scheduleId_idx" ON "schedule_exceptions"("scheduleId");

-- CreateIndex
CREATE INDEX "schedule_exceptions_date_idx" ON "schedule_exceptions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_exceptions_scheduleId_date_key" ON "schedule_exceptions"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "deliverer_service_routes_delivererId_idx" ON "deliverer_service_routes"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_service_routes_isActive_idx" ON "deliverer_service_routes"("isActive");

-- CreateIndex
CREATE INDEX "deliverer_service_routes_priority_idx" ON "deliverer_service_routes"("priority");

-- CreateIndex
CREATE INDEX "deliverer_service_routes_successRate_idx" ON "deliverer_service_routes"("successRate");

-- CreateIndex
CREATE INDEX "delivery_zones_routeId_idx" ON "delivery_zones"("routeId");

-- CreateIndex
CREATE INDEX "delivery_zones_centerLatitude_centerLongitude_idx" ON "delivery_zones"("centerLatitude", "centerLongitude");

-- CreateIndex
CREATE INDEX "delivery_zones_cityName_idx" ON "delivery_zones"("cityName");

-- CreateIndex
CREATE INDEX "delivery_zones_trafficLevel_idx" ON "delivery_zones"("trafficLevel");

-- CreateIndex
CREATE INDEX "route_statistics_routeId_idx" ON "route_statistics"("routeId");

-- CreateIndex
CREATE INDEX "route_statistics_date_idx" ON "route_statistics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "route_statistics_routeId_date_key" ON "route_statistics"("routeId", "date");

-- CreateIndex
CREATE INDEX "deliverer_availabilities_delivererId_idx" ON "deliverer_availabilities"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_availabilities_startDate_endDate_idx" ON "deliverer_availabilities"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "deliverer_availabilities_isAvailable_idx" ON "deliverer_availabilities"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "deliverer_stats_delivererId_key" ON "deliverer_stats"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_stats_delivererId_idx" ON "deliverer_stats"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_stats_averageRating_idx" ON "deliverer_stats"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "matching_criteria_announcementId_key" ON "matching_criteria"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "matching_results_criteriaId_delivererId_key" ON "matching_results"("criteriaId", "delivererId");

-- CreateIndex
CREATE UNIQUE INDEX "deliverer_matching_preferences_delivererId_key" ON "deliverer_matching_preferences"("delivererId");

-- CreateIndex
CREATE UNIQUE INDEX "route_announcements_routeId_announcementId_key" ON "route_announcements"("routeId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "nfc_cards_cardNumber_key" ON "nfc_cards"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "nfc_cards_serialNumber_key" ON "nfc_cards"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_validation_codes_deliveryId_key" ON "delivery_validation_codes"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_validation_codes_code_key" ON "delivery_validation_codes"("code");

-- CreateIndex
CREATE INDEX "deliverer_planned_routes_delivererId_idx" ON "deliverer_planned_routes"("delivererId");

-- CreateIndex
CREATE INDEX "deliverer_planned_routes_status_idx" ON "deliverer_planned_routes"("status");

-- CreateIndex
CREATE INDEX "deliverer_planned_routes_departureTime_idx" ON "deliverer_planned_routes"("departureTime");

-- CreateIndex
CREATE INDEX "deliverer_planned_routes_isRecurring_idx" ON "deliverer_planned_routes"("isRecurring");

-- CreateIndex
CREATE INDEX "deliverer_planned_routes_isPublic_idx" ON "deliverer_planned_routes"("isPublic");

-- CreateIndex
CREATE INDEX "planned_route_announcements_routeId_idx" ON "planned_route_announcements"("routeId");

-- CreateIndex
CREATE INDEX "planned_route_announcements_announcementId_idx" ON "planned_route_announcements"("announcementId");

-- CreateIndex
CREATE INDEX "planned_route_announcements_status_idx" ON "planned_route_announcements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "planned_route_announcements_routeId_announcementId_key" ON "planned_route_announcements"("routeId", "announcementId");

-- CreateIndex
CREATE INDEX "deliverer_route_performances_routeId_idx" ON "deliverer_route_performances"("routeId");

-- CreateIndex
CREATE INDEX "deliverer_route_performances_executionDate_idx" ON "deliverer_route_performances"("executionDate");

-- CreateIndex
CREATE INDEX "route_optimizations_delivererId_idx" ON "route_optimizations"("delivererId");

-- CreateIndex
CREATE INDEX "route_optimizations_status_idx" ON "route_optimizations"("status");

-- CreateIndex
CREATE INDEX "ProviderException_providerId_date_idx" ON "ProviderException"("providerId", "date");

-- CreateIndex
CREATE INDEX "ProviderSpecialSlot_providerId_date_idx" ON "ProviderSpecialSlot"("providerId", "date");

-- CreateIndex
CREATE INDEX "ProviderSpecialSlot_isBooked_idx" ON "ProviderSpecialSlot"("isBooked");

-- CreateIndex
CREATE INDEX "personal_services_providerId_idx" ON "personal_services"("providerId");

-- CreateIndex
CREATE INDEX "personal_services_serviceType_idx" ON "personal_services"("serviceType");

-- CreateIndex
CREATE INDEX "personal_services_isActive_isApproved_idx" ON "personal_services"("isActive", "isApproved");

-- CreateIndex
CREATE INDEX "personal_services_averageRating_idx" ON "personal_services"("averageRating");

-- CreateIndex
CREATE INDEX "personal_services_baseLat_baseLng_idx" ON "personal_services"("baseLat", "baseLng");

-- CreateIndex
CREATE INDEX "personal_service_bookings_serviceId_idx" ON "personal_service_bookings"("serviceId");

-- CreateIndex
CREATE INDEX "personal_service_bookings_clientId_idx" ON "personal_service_bookings"("clientId");

-- CreateIndex
CREATE INDEX "personal_service_bookings_status_idx" ON "personal_service_bookings"("status");

-- CreateIndex
CREATE INDEX "personal_service_bookings_scheduledAt_idx" ON "personal_service_bookings"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "personal_service_reviews_bookingId_key" ON "personal_service_reviews"("bookingId");

-- CreateIndex
CREATE INDEX "personal_service_reviews_serviceId_idx" ON "personal_service_reviews"("serviceId");

-- CreateIndex
CREATE INDEX "personal_service_reviews_clientId_idx" ON "personal_service_reviews"("clientId");

-- CreateIndex
CREATE INDEX "personal_service_reviews_providerId_idx" ON "personal_service_reviews"("providerId");

-- CreateIndex
CREATE INDEX "personal_service_reviews_rating_idx" ON "personal_service_reviews"("rating");

-- CreateIndex
CREATE INDEX "personal_service_reviews_isPublic_idx" ON "personal_service_reviews"("isPublic");

-- CreateIndex
CREATE INDEX "personal_service_photos_serviceId_sortOrder_idx" ON "personal_service_photos"("serviceId", "sortOrder");

-- CreateIndex
CREATE INDEX "personal_service_photos_isMainPhoto_idx" ON "personal_service_photos"("isMainPhoto");

-- CreateIndex
CREATE INDEX "provider_habilitations_providerId_idx" ON "provider_habilitations"("providerId");

-- CreateIndex
CREATE INDEX "provider_habilitations_status_idx" ON "provider_habilitations"("status");

-- CreateIndex
CREATE INDEX "provider_habilitations_habilitationType_idx" ON "provider_habilitations"("habilitationType");

-- CreateIndex
CREATE INDEX "provider_habilitations_expiresAt_idx" ON "provider_habilitations"("expiresAt");

-- CreateIndex
CREATE INDEX "provider_service_habilitations_serviceId_idx" ON "provider_service_habilitations"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_service_habilitations_serviceId_habilitationId_key" ON "provider_service_habilitations"("serviceId", "habilitationId");

-- CreateIndex
CREATE UNIQUE INDEX "provider_interventions_bookingId_key" ON "provider_interventions"("bookingId");

-- CreateIndex
CREATE INDEX "provider_interventions_providerId_idx" ON "provider_interventions"("providerId");

-- CreateIndex
CREATE INDEX "provider_interventions_status_idx" ON "provider_interventions"("status");

-- CreateIndex
CREATE INDEX "provider_interventions_scheduledStart_idx" ON "provider_interventions"("scheduledStart");

-- CreateIndex
CREATE INDEX "provider_interventions_interventionType_idx" ON "provider_interventions"("interventionType");

-- CreateIndex
CREATE UNIQUE INDEX "provider_evaluations_interventionId_key" ON "provider_evaluations"("interventionId");

-- CreateIndex
CREATE INDEX "provider_evaluations_providerId_idx" ON "provider_evaluations"("providerId");

-- CreateIndex
CREATE INDEX "provider_evaluations_clientId_idx" ON "provider_evaluations"("clientId");

-- CreateIndex
CREATE INDEX "provider_evaluations_overallRating_idx" ON "provider_evaluations"("overallRating");

-- CreateIndex
CREATE INDEX "provider_evaluations_isPublic_affectsRating_idx" ON "provider_evaluations"("isPublic", "affectsRating");

-- CreateIndex
CREATE INDEX "provider_evaluations_createdAt_idx" ON "provider_evaluations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_auto_invoicing_providerId_key" ON "provider_auto_invoicing"("providerId");

-- CreateIndex
CREATE INDEX "provider_auto_invoicing_status_idx" ON "provider_auto_invoicing"("status");

-- CreateIndex
CREATE INDEX "provider_auto_invoicing_nextInvoiceDate_idx" ON "provider_auto_invoicing"("nextInvoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "provider_monthly_invoices_invoiceNumber_key" ON "provider_monthly_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "provider_monthly_invoices_autoInvoicingId_idx" ON "provider_monthly_invoices"("autoInvoicingId");

-- CreateIndex
CREATE INDEX "provider_monthly_invoices_status_idx" ON "provider_monthly_invoices"("status");

-- CreateIndex
CREATE INDEX "provider_monthly_invoices_issueDate_idx" ON "provider_monthly_invoices"("issueDate");

-- CreateIndex
CREATE UNIQUE INDEX "provider_monthly_invoices_providerId_periodYear_periodMonth_key" ON "provider_monthly_invoices"("providerId", "periodYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "ClientAppointment_confirmationCode_key" ON "ClientAppointment"("confirmationCode");

-- CreateIndex
CREATE INDEX "ClientAppointment_clientId_idx" ON "ClientAppointment"("clientId");

-- CreateIndex
CREATE INDEX "ClientAppointment_providerId_idx" ON "ClientAppointment"("providerId");

-- CreateIndex
CREATE INDEX "ClientAppointment_serviceId_idx" ON "ClientAppointment"("serviceId");

-- CreateIndex
CREATE INDEX "ClientAppointment_status_idx" ON "ClientAppointment"("status");

-- CreateIndex
CREATE INDEX "ClientAppointment_startTime_idx" ON "ClientAppointment"("startTime");

-- CreateIndex
CREATE INDEX "ClientAppointment_endTime_idx" ON "ClientAppointment"("endTime");

-- CreateIndex
CREATE INDEX "ClientAppointment_createdAt_idx" ON "ClientAppointment"("createdAt");

-- CreateIndex
CREATE INDEX "ClientAppointment_confirmationCode_idx" ON "ClientAppointment"("confirmationCode");

-- CreateIndex
CREATE INDEX "ClientAppointment_originalAppointmentId_idx" ON "ClientAppointment"("originalAppointmentId");

-- CreateIndex
CREATE INDEX "AppointmentHistory_appointmentId_idx" ON "AppointmentHistory"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentHistory_createdAt_idx" ON "AppointmentHistory"("createdAt");

-- CreateIndex
CREATE INDEX "AppointmentHistory_action_idx" ON "AppointmentHistory"("action");

-- CreateIndex
CREATE INDEX "AppointmentNotification_appointmentId_idx" ON "AppointmentNotification"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentNotification_recipientId_idx" ON "AppointmentNotification"("recipientId");

-- CreateIndex
CREATE INDEX "AppointmentNotification_type_idx" ON "AppointmentNotification"("type");

-- CreateIndex
CREATE INDEX "AppointmentNotification_scheduledFor_idx" ON "AppointmentNotification"("scheduledFor");

-- CreateIndex
CREATE INDEX "AppointmentNotification_sent_idx" ON "AppointmentNotification"("sent");

-- CreateIndex
CREATE INDEX "AppointmentNotification_createdAt_idx" ON "AppointmentNotification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSlot_appointmentId_key" ON "AppointmentSlot"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentSlot_providerId_idx" ON "AppointmentSlot"("providerId");

-- CreateIndex
CREATE INDEX "AppointmentSlot_startTime_idx" ON "AppointmentSlot"("startTime");

-- CreateIndex
CREATE INDEX "AppointmentSlot_endTime_idx" ON "AppointmentSlot"("endTime");

-- CreateIndex
CREATE INDEX "AppointmentSlot_isAvailable_idx" ON "AppointmentSlot"("isAvailable");

-- CreateIndex
CREATE INDEX "AppointmentSlot_isBooked_idx" ON "AppointmentSlot"("isBooked");

-- CreateIndex
CREATE INDEX "AppointmentSlot_bookedBy_idx" ON "AppointmentSlot"("bookedBy");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityRule_providerId_idx" ON "AppointmentAvailabilityRule"("providerId");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityRule_daysOfWeek_idx" ON "AppointmentAvailabilityRule"("daysOfWeek");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityRule_validFrom_idx" ON "AppointmentAvailabilityRule"("validFrom");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityRule_isActive_idx" ON "AppointmentAvailabilityRule"("isActive");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityException_providerId_idx" ON "AppointmentAvailabilityException"("providerId");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityException_date_idx" ON "AppointmentAvailabilityException"("date");

-- CreateIndex
CREATE INDEX "AppointmentAvailabilityException_type_idx" ON "AppointmentAvailabilityException"("type");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_cash_registers_merchantId_key" ON "merchant_cash_registers"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_cash_registers_isActive_idx" ON "merchant_cash_registers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cart_drops_transactionId_key" ON "cart_drops"("transactionId");

-- CreateIndex
CREATE INDEX "cart_drops_cashRegisterId_idx" ON "cart_drops"("cashRegisterId");

-- CreateIndex
CREATE INDEX "cart_drops_merchantId_idx" ON "cart_drops"("merchantId");

-- CreateIndex
CREATE INDEX "cart_drops_status_idx" ON "cart_drops"("status");

-- CreateIndex
CREATE INDEX "cart_drops_groupId_idx" ON "cart_drops"("groupId");

-- CreateIndex
CREATE INDEX "cart_drops_requestedDeliveryTime_idx" ON "cart_drops"("requestedDeliveryTime");

-- CreateIndex
CREATE INDEX "cart_drop_groups_merchantId_idx" ON "cart_drop_groups"("merchantId");

-- CreateIndex
CREATE INDEX "cart_drop_groups_status_idx" ON "cart_drop_groups"("status");

-- CreateIndex
CREATE INDEX "cart_drop_groups_scheduledTime_idx" ON "cart_drop_groups"("scheduledTime");

-- CreateIndex
CREATE INDEX "merchant_delivery_zones_merchantId_idx" ON "merchant_delivery_zones"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_delivery_zones_isActive_idx" ON "merchant_delivery_zones"("isActive");

-- CreateIndex
CREATE INDEX "cash_register_terminals_isActive_idx" ON "cash_register_terminals"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cash_register_terminals_cashRegisterId_terminalId_key" ON "cash_register_terminals"("cashRegisterId", "terminalId");

-- CreateIndex
CREATE INDEX "contract_templates_isActive_idx" ON "contract_templates"("isActive");

-- CreateIndex
CREATE INDEX "contract_templates_defaultType_idx" ON "contract_templates"("defaultType");

-- CreateIndex
CREATE INDEX "contract_templates_targetMerchantCategory_idx" ON "contract_templates"("targetMerchantCategory");

-- CreateIndex
CREATE INDEX "contract_amendments_contractId_idx" ON "contract_amendments"("contractId");

-- CreateIndex
CREATE INDEX "contract_amendments_status_idx" ON "contract_amendments"("status");

-- CreateIndex
CREATE INDEX "contract_amendments_amendmentType_idx" ON "contract_amendments"("amendmentType");

-- CreateIndex
CREATE INDEX "contract_negotiations_contractId_idx" ON "contract_negotiations"("contractId");

-- CreateIndex
CREATE INDEX "contract_negotiations_status_idx" ON "contract_negotiations"("status");

-- CreateIndex
CREATE INDEX "contract_performance_contractId_idx" ON "contract_performance"("contractId");

-- CreateIndex
CREATE INDEX "contract_performance_periodStart_periodEnd_idx" ON "contract_performance"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "platform_kpis_kpiType_periodType_idx" ON "platform_kpis"("kpiType", "periodType");

-- CreateIndex
CREATE INDEX "platform_kpis_periodStart_periodEnd_idx" ON "platform_kpis"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "platform_kpis_isAlert_idx" ON "platform_kpis"("isAlert");

-- CreateIndex
CREATE INDEX "kpi_history_kpiId_timestamp_idx" ON "kpi_history"("kpiId", "timestamp");

-- CreateIndex
CREATE INDEX "multi_site_stats_siteType_idx" ON "multi_site_stats"("siteType");

-- CreateIndex
CREATE INDEX "multi_site_stats_periodStart_periodEnd_idx" ON "multi_site_stats"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "multi_site_stats_rankAmongSites_idx" ON "multi_site_stats"("rankAmongSites");

-- CreateIndex
CREATE INDEX "financial_forecasts_forecastType_idx" ON "financial_forecasts"("forecastType");

-- CreateIndex
CREATE INDEX "financial_forecasts_periodStart_periodEnd_idx" ON "financial_forecasts"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "financial_forecasts_scenarioType_idx" ON "financial_forecasts"("scenarioType");

-- CreateIndex
CREATE INDEX "platform_monitoring_systemStatus_idx" ON "platform_monitoring"("systemStatus");

-- CreateIndex
CREATE INDEX "platform_monitoring_timestamp_idx" ON "platform_monitoring"("timestamp");

-- CreateIndex
CREATE INDEX "alert_configurations_isActive_idx" ON "alert_configurations"("isActive");

-- CreateIndex
CREATE INDEX "alert_configurations_severity_idx" ON "alert_configurations"("severity");

-- CreateIndex
CREATE INDEX "alert_triggers_alertId_idx" ON "alert_triggers"("alertId");

-- CreateIndex
CREATE INDEX "alert_triggers_triggeredAt_idx" ON "alert_triggers"("triggeredAt");

-- CreateIndex
CREATE INDEX "alert_triggers_isResolved_idx" ON "alert_triggers"("isResolved");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_verifications_merchantId_key" ON "merchant_verifications"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_verifications_merchantId_idx" ON "merchant_verifications"("merchantId");

-- CreateIndex
CREATE INDEX "merchant_verifications_verifierId_idx" ON "merchant_verifications"("verifierId");

-- CreateIndex
CREATE INDEX "merchant_verifications_status_idx" ON "merchant_verifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_verifications_providerId_key" ON "provider_verifications"("providerId");

-- CreateIndex
CREATE INDEX "provider_verifications_providerId_idx" ON "provider_verifications"("providerId");

-- CreateIndex
CREATE INDEX "provider_verifications_verifierId_idx" ON "provider_verifications"("verifierId");

-- CreateIndex
CREATE INDEX "provider_verifications_status_idx" ON "provider_verifications"("status");

-- CreateIndex
CREATE INDEX "ProviderAvailability_providerId_dayOfWeek_idx" ON "ProviderAvailability"("providerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ProviderAvailability_isActive_idx" ON "ProviderAvailability"("isActive");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "ServiceBooking_status_idx" ON "ServiceBooking"("status");

-- CreateIndex
CREATE INDEX "ServiceBooking_startTime_idx" ON "ServiceBooking"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE INDEX "ServiceCategory_isActive_sortOrder_idx" ON "ServiceCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceCategory_parentId_idx" ON "ServiceCategory"("parentId");

-- CreateIndex
CREATE INDEX "ServiceReview_rating_idx" ON "ServiceReview"("rating");

-- CreateIndex
CREATE INDEX "ServiceReview_createdAt_idx" ON "ServiceReview"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceReview_isVerified_idx" ON "ServiceReview"("isVerified");

-- CreateIndex
CREATE INDEX "announcements_autoAssign_idx" ON "announcements"("autoAssign");

-- CreateIndex
CREATE INDEX "announcements_urgencyLevel_idx" ON "announcements"("urgencyLevel");

-- CreateIndex
CREATE INDEX "announcements_matchingScore_idx" ON "announcements"("matchingScore");

-- CreateIndex
CREATE INDEX "billing_cycles_contractId_idx" ON "billing_cycles"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_contractNumber_key" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_type_idx" ON "contracts"("type");

-- CreateIndex
CREATE INDEX "contracts_contractNumber_idx" ON "contracts"("contractNumber");

-- CreateIndex
CREATE INDEX "contracts_effectiveDate_idx" ON "contracts"("effectiveDate");

-- CreateIndex
CREATE INDEX "contracts_merchantCategory_idx" ON "contracts"("merchantCategory");

-- CreateIndex
CREATE INDEX "delivery_applications_verificationStatus_idx" ON "delivery_applications"("verificationStatus");

-- CreateIndex
CREATE INDEX "delivery_applications_autoMatchScore_idx" ON "delivery_applications"("autoMatchScore");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_applications_delivererId_announcementId_key" ON "delivery_applications"("delivererId", "announcementId");

-- AddForeignKey
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_steps" ADD CONSTRAINT "tutorial_steps_tutorialId_fkey" FOREIGN KEY ("tutorialId") REFERENCES "tutorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_progress" ADD CONSTRAINT "tutorial_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_progress" ADD CONSTRAINT "tutorial_progress_tutorialId_fkey" FOREIGN KEY ("tutorialId") REFERENCES "tutorials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_step_completions" ADD CONSTRAINT "tutorial_step_completions_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "tutorial_progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutorial_step_completions" ADD CONSTRAINT "tutorial_step_completions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "tutorial_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overlay_configs" ADD CONSTRAINT "overlay_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_subscription_details" ADD CONSTRAINT "client_subscription_details_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscription_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_usage_history" ADD CONSTRAINT "monthly_usage_history_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscription_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_promotions" ADD CONSTRAINT "subscription_promotions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "client_subscription_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_relayDelivererId_fkey" FOREIGN KEY ("relayDelivererId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_matchings" ADD CONSTRAINT "announcement_matchings_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_matchings" ADD CONSTRAINT "announcement_matchings_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_notifications" ADD CONSTRAINT "deliverer_notifications_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_notifications" ADD CONSTRAINT "deliverer_notifications_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_routes" ADD CONSTRAINT "deliverer_routes_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_announcement_matches" ADD CONSTRAINT "route_announcement_matches_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_announcement_matches" ADD CONSTRAINT "route_announcement_matches_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_applications" ADD CONSTRAINT "delivery_applications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "delivery_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "application_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_preferences" ADD CONSTRAINT "deliverer_preferences_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_validation_audits" ADD CONSTRAINT "document_validation_audits_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "application_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_validation_audits" ADD CONSTRAINT "document_validation_audits_actionBy_fkey" FOREIGN KEY ("actionBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_schedules" ADD CONSTRAINT "deliverer_schedules_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "deliverer_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_service_routes" ADD CONSTRAINT "deliverer_service_routes_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_service_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_statistics" ADD CONSTRAINT "route_statistics_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_service_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_availabilities" ADD CONSTRAINT "deliverer_availabilities_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_stats" ADD CONSTRAINT "deliverer_stats_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_criteria" ADD CONSTRAINT "matching_criteria_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_results" ADD CONSTRAINT "matching_results_criteriaId_fkey" FOREIGN KEY ("criteriaId") REFERENCES "matching_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_results" ADD CONSTRAINT "matching_results_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matching_results" ADD CONSTRAINT "matching_results_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_matching_preferences" ADD CONSTRAINT "deliverer_matching_preferences_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_announcements" ADD CONSTRAINT "route_announcements_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_planned_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_announcements" ADD CONSTRAINT "route_announcements_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_cards" ADD CONSTRAINT "nfc_cards_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_assignments" ADD CONSTRAINT "nfc_card_assignments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "nfc_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_assignments" ADD CONSTRAINT "nfc_card_assignments_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_assignments" ADD CONSTRAINT "nfc_card_assignments_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_transactions" ADD CONSTRAINT "nfc_card_transactions_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "nfc_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_transactions" ADD CONSTRAINT "nfc_card_transactions_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfc_card_transactions" ADD CONSTRAINT "nfc_card_transactions_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_validation_codes" ADD CONSTRAINT "delivery_validation_codes_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_planned_routes" ADD CONSTRAINT "deliverer_planned_routes_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_route_announcements" ADD CONSTRAINT "planned_route_announcements_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_planned_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_route_announcements" ADD CONSTRAINT "planned_route_announcements_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_route_performances" ADD CONSTRAINT "deliverer_route_performances_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "deliverer_planned_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_optimizations" ADD CONSTRAINT "route_optimizations_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderException" ADD CONSTRAINT "ProviderException_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderSpecialSlot" ADD CONSTRAINT "ProviderSpecialSlot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBooking" ADD CONSTRAINT "ServiceBooking_rescheduledFrom_fkey" FOREIGN KEY ("rescheduledFrom") REFERENCES "ServiceBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_services" ADD CONSTRAINT "personal_services_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_services" ADD CONSTRAINT "personal_services_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_bookings" ADD CONSTRAINT "personal_service_bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "personal_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_bookings" ADD CONSTRAINT "personal_service_bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_reviews" ADD CONSTRAINT "personal_service_reviews_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "personal_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_reviews" ADD CONSTRAINT "personal_service_reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "personal_service_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_reviews" ADD CONSTRAINT "personal_service_reviews_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_reviews" ADD CONSTRAINT "personal_service_reviews_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_reviews" ADD CONSTRAINT "personal_service_reviews_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_service_photos" ADD CONSTRAINT "personal_service_photos_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "personal_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_habilitations" ADD CONSTRAINT "provider_habilitations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_habilitations" ADD CONSTRAINT "provider_habilitations_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_service_habilitations" ADD CONSTRAINT "provider_service_habilitations_habilitationId_fkey" FOREIGN KEY ("habilitationId") REFERENCES "provider_habilitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_interventions" ADD CONSTRAINT "provider_interventions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_evaluations" ADD CONSTRAINT "provider_evaluations_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_evaluations" ADD CONSTRAINT "provider_evaluations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_evaluations" ADD CONSTRAINT "provider_evaluations_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "provider_interventions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_evaluations" ADD CONSTRAINT "provider_evaluations_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_auto_invoicing" ADD CONSTRAINT "provider_auto_invoicing_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_monthly_invoices" ADD CONSTRAINT "provider_monthly_invoices_autoInvoicingId_fkey" FOREIGN KEY ("autoInvoicingId") REFERENCES "provider_auto_invoicing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_monthly_invoices" ADD CONSTRAINT "provider_monthly_invoices_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ServiceBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAppointment" ADD CONSTRAINT "ClientAppointment_originalAppointmentId_fkey" FOREIGN KEY ("originalAppointmentId") REFERENCES "ClientAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHistory" ADD CONSTRAINT "AppointmentHistory_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClientAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentHistory" ADD CONSTRAINT "AppointmentHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentNotification" ADD CONSTRAINT "AppointmentNotification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClientAppointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentNotification" ADD CONSTRAINT "AppointmentNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_bookedBy_fkey" FOREIGN KEY ("bookedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "ClientAppointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentSlot" ADD CONSTRAINT "AppointmentSlot_parentSlotId_fkey" FOREIGN KEY ("parentSlotId") REFERENCES "AppointmentSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAvailabilityRule" ADD CONSTRAINT "AppointmentAvailabilityRule_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentAvailabilityException" ADD CONSTRAINT "AppointmentAvailabilityException_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cycles" ADD CONSTRAINT "billing_cycles_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_cash_registers" ADD CONSTRAINT "merchant_cash_registers_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drops" ADD CONSTRAINT "cart_drops_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "merchant_cash_registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drops" ADD CONSTRAINT "cart_drops_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drops" ADD CONSTRAINT "cart_drops_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drops" ADD CONSTRAINT "cart_drops_assignedDelivererId_fkey" FOREIGN KEY ("assignedDelivererId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drops" ADD CONSTRAINT "cart_drops_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "cart_drop_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drop_groups" ADD CONSTRAINT "cart_drop_groups_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_drop_groups" ADD CONSTRAINT "cart_drop_groups_assignedDelivererId_fkey" FOREIGN KEY ("assignedDelivererId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_delivery_zones" ADD CONSTRAINT "merchant_delivery_zones_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_register_terminals" ADD CONSTRAINT "cash_register_terminals_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "merchant_cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_negotiations" ADD CONSTRAINT "contract_negotiations_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_negotiations" ADD CONSTRAINT "contract_negotiations_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_negotiations" ADD CONSTRAINT "contract_negotiations_respondedBy_fkey" FOREIGN KEY ("respondedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_performance" ADD CONSTRAINT "contract_performance_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_history" ADD CONSTRAINT "kpi_history_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "platform_kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_forecasts" ADD CONSTRAINT "financial_forecasts_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_configurations" ADD CONSTRAINT "alert_configurations_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alert_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_triggers" ADD CONSTRAINT "alert_triggers_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verifications" ADD CONSTRAINT "provider_verifications_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_verifications" ADD CONSTRAINT "provider_verifications_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
