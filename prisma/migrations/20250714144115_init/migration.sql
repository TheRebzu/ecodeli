-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'PENDING_DOCUMENTS', 'PENDING_VALIDATION', 'APPROVED', 'VALIDATED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('IDENTITY', 'DRIVING_LICENSE', 'INSURANCE', 'CERTIFICATION', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_CARE', 'HOME_SERVICE', 'CART_DROP', 'OTHER');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('PACKAGE_DELIVERY', 'PERSON_TRANSPORT', 'AIRPORT_TRANSFER', 'SHOPPING', 'INTERNATIONAL_PURCHASE', 'PET_SITTING', 'HOME_SERVICE', 'CART_DROP');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING_PAYMENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DELIVERY', 'SERVICE', 'SUBSCRIPTION', 'REFUND', 'COMMISSION', 'WITHDRAWAL', 'STORAGE_RENTAL');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('FREE', 'STARTER', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'DELIVERY', 'BOOKING', 'PAYMENT', 'ANNOUNCEMENT', 'VALIDATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('TRANSPORT', 'HOME_CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'PET_CARE', 'OTHER');

-- CreateEnum
CREATE TYPE "WalletOperationType" AS ENUM ('CREDIT', 'DEBIT', 'WITHDRAWAL', 'REFUND', 'FEE');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoxSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE');

-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('STANDARD', 'PREMIUM', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('DELIVERY_ISSUE', 'PAYMENT_PROBLEM', 'ACCOUNT_ACCESS', 'TECHNICAL_SUPPORT', 'BILLING_INQUIRY', 'FEATURE_REQUEST', 'COMPLAINT', 'PARTNERSHIP', 'GENERAL_INQUIRY', 'BUG_REPORT');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "CertificationCategory" AS ENUM ('SAFETY', 'QUALITY', 'TECHNICAL', 'ENVIRONMENTAL', 'COMPLIANCE', 'CUSTOMER_SERVICE', 'SPECIALIZED');

-- CreateEnum
CREATE TYPE "CertificationLevel" AS ENUM ('BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('NOT_STARTED', 'ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'SUSPENDED', 'RENEWED');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "InsuranceCategory" AS ENUM ('PROFESSIONAL_LIABILITY', 'GOODS_TRANSPORT', 'STORAGE_COVERAGE', 'PERSONAL_ACCIDENT', 'CYBER_LIABILITY', 'GENERAL_LIABILITY');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('DAMAGE_COVERAGE', 'THEFT_COVERAGE', 'LOSS_COVERAGE', 'DELAY_COVERAGE', 'LIABILITY_COVERAGE', 'PERSONAL_INJURY');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('DAMAGE', 'THEFT', 'LOSS', 'DELAY', 'PERSONAL_INJURY', 'LIABILITY', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('REPORTED', 'UNDER_INVESTIGATION', 'BEING_ASSESSED', 'APPROVED', 'REJECTED', 'SETTLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WarrantyType" AS ENUM ('SERVICE_QUALITY', 'DELIVERY_GUARANTEE', 'SATISFACTION_GUARANTEE', 'DAMAGE_PROTECTION', 'TIME_GUARANTEE');

-- CreateEnum
CREATE TYPE "WarrantyClaimType" AS ENUM ('SERVICE_DEFECT', 'LATE_DELIVERY', 'DAMAGED_GOODS', 'INCOMPLETE_SERVICE', 'UNSATISFACTORY_QUALITY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('USER_REFERRAL', 'SERVICE_REFERRAL', 'MERCHANT_REFERRAL', 'DELIVERER_REFERRAL', 'PROVIDER_REFERRAL');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralMethod" AS ENUM ('CODE', 'LINK', 'EMAIL', 'SOCIAL_MEDIA', 'WORD_OF_MOUTH', 'OTHER');

-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CASH', 'CREDIT', 'DISCOUNT', 'POINTS', 'FREE_SERVICE', 'PREMIUM_ACCESS');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('REGISTRATION', 'FIRST_ORDER', 'FIRST_DELIVERY', 'MONTHLY_ACTIVITY', 'SPENDING_THRESHOLD', 'REFERRAL_CHAIN');

-- CreateEnum
CREATE TYPE "InfluencerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('AWARENESS', 'CONVERSION', 'ENGAGEMENT', 'BRAND_PARTNERSHIP', 'PRODUCT_LAUNCH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisputeCategory" AS ENUM ('DELIVERY_NOT_RECEIVED', 'DAMAGED_PACKAGE', 'WRONG_ADDRESS', 'LATE_DELIVERY', 'PAYMENT_ISSUE', 'INAPPROPRIATE_BEHAVIOR', 'FRAUD_ATTEMPT', 'SERVICE_NOT_RENDERED', 'QUALITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'WAITING_EVIDENCE', 'MEDIATION', 'RESOLVED', 'CLOSED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DisputeResolution" AS ENUM ('FAVOR_REPORTER', 'FAVOR_REPORTED', 'PARTIAL_REFUND', 'NO_ACTION', 'MEDIATION');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPT', 'DECLINE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CLIENT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "subscriptionStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionEnd" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false,
    "tutorialCompletedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleType" TEXT,
    "licensePlate" TEXT,
    "maxWeight" DOUBLE PRECISION,
    "maxVolume" DOUBLE PRECISION,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nfcCardId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "coordinates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "fromCoordinates" JSONB NOT NULL,
    "toCoordinates" JSONB NOT NULL,
    "schedule" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxCapacity" INTEGER NOT NULL DEFAULT 1,
    "estimatedDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelivererAvailability" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelivererAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NFCCard" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "NFCCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "siret" TEXT NOT NULL,
    "vatNumber" TEXT,
    "contractStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "contractStartDate" TIMESTAMP(3),
    "contractEndDate" TIMESTAMP(3),
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION,
    "sku" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "weight" DOUBLE PRECISION,
    "dimensions" JSONB,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "minStockAlert" INTEGER NOT NULL DEFAULT 5,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartDropConfig" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "deliveryZones" JSONB[],
    "timeSlots" JSONB[],
    "maxOrdersPerSlot" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartDropConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "announcementId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,
    "merchantBillingId" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "businessName" TEXT,
    "siret" TEXT,
    "specialties" TEXT[],
    "hourlyRate" DOUBLE PRECISION,
    "description" TEXT,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyInvoiceDay" INTEGER NOT NULL DEFAULT 30,
    "activatedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "zone" JSONB,
    "legalStatus" TEXT NOT NULL DEFAULT 'AUTOENTREPRENEUR',
    "vatNumber" TEXT,
    "insuranceProvider" TEXT,
    "insurancePolicy" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "insuranceDocument" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ServiceType" NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "priceUnit" TEXT NOT NULL DEFAULT 'HOUR',
    "duration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minAdvanceBooking" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceBooking" INTEGER NOT NULL DEFAULT 720,
    "cancellationPolicy" TEXT,
    "requirements" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAvailability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderRate" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "unitType" TEXT NOT NULL DEFAULT 'HOUR',
    "minimumCharge" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTimeSlot" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAvailabilityBlock" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAvailabilityBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMonthlyInvoice" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invoiceNumber" TEXT NOT NULL,
    "invoiceUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderMonthlyInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInvoiceIntervention" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "interventionId" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderInvoiceIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderContract" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL DEFAULT 'STANDARD',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedByProvider" BOOLEAN NOT NULL DEFAULT false,
    "signedByEcoDeli" BOOLEAN NOT NULL DEFAULT false,
    "contractUrl" TEXT,
    "terms" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL,
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "delivererId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DOUBLE PRECISION,
    "pickupLongitude" DOUBLE PRECISION,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryLatitude" DOUBLE PRECISION,
    "deliveryLongitude" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "pickupDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "isFlexibleDate" BOOLEAN NOT NULL DEFAULT false,
    "preferredTimeSlot" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isPriceNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "urgencyFee" DOUBLE PRECISION,
    "insuranceFee" DOUBLE PRECISION,
    "platformFee" DOUBLE PRECISION,
    "packageDetails" JSONB,
    "personDetails" JSONB,
    "shoppingDetails" JSONB,
    "petDetails" JSONB,
    "serviceDetails" JSONB,
    "requiresValidation" BOOLEAN NOT NULL DEFAULT true,
    "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
    "allowsPartialDelivery" BOOLEAN NOT NULL DEFAULT false,
    "maxDeliverers" INTEGER NOT NULL DEFAULT 1,
    "recurringConfig" JSONB,
    "estimatedDuration" INTEGER,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "specialInstructions" TEXT,
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT,
    "merchantId" TEXT,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageAnnouncement" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "fragile" BOOLEAN NOT NULL DEFAULT false,
    "requiresInsurance" BOOLEAN NOT NULL DEFAULT false,
    "insuredValue" DOUBLE PRECISION,
    "specialInstructions" TEXT,

    CONSTRAINT "PackageAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAnnouncement" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "numberOfPeople" INTEGER,
    "duration" INTEGER,
    "recurringService" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "specialRequirements" TEXT,
    "preferredProviderId" TEXT,

    CONSTRAINT "ServiceAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelivererRoute" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "startAddress" TEXT NOT NULL,
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "endAddress" TEXT NOT NULL,
    "endLatitude" DOUBLE PRECISION NOT NULL,
    "endLongitude" DOUBLE PRECISION NOT NULL,
    "waypoints" JSONB,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "maxPackages" INTEGER NOT NULL DEFAULT 5,
    "maxWeight" DOUBLE PRECISION,
    "maxVolume" DOUBLE PRECISION,
    "vehicleType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoAccept" BOOLEAN NOT NULL DEFAULT false,
    "maxDetour" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "acceptedTypes" "AnnouncementType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelivererRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteMatch" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "distanceScore" DOUBLE PRECISION NOT NULL,
    "timeScore" DOUBLE PRECISION NOT NULL,
    "capacityScore" DOUBLE PRECISION NOT NULL,
    "typeScore" DOUBLE PRECISION NOT NULL,
    "globalScore" DOUBLE PRECISION NOT NULL,
    "pickupDetour" DOUBLE PRECISION NOT NULL,
    "deliveryDetour" DOUBLE PRECISION NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTracking" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "status" "AnnouncementStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementAttachment" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementNotification" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "trackingNumber" TEXT NOT NULL,
    "validationCode" TEXT,
    "pickupDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "actualDeliveryDate" TIMESTAMP(3),
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "currentLocation" JSONB,
    "price" DOUBLE PRECISION NOT NULL,
    "delivererFee" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "insuranceFee" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingUpdate" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "location" TEXT,
    "coordinates" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TrackingUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryHistory" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "DeliveryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStatusHistory" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "comment" TEXT,
    "location" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "fromDelivererId" TEXT NOT NULL,
    "toDelivererId" TEXT,
    "locationId" TEXT NOT NULL,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "handoverCode" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfDelivery" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientSignature" TEXT,
    "photos" TEXT[],
    "notes" TEXT,
    "validatedWithCode" BOOLEAN NOT NULL DEFAULT false,
    "validatedWithNFC" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofOfDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "address" JSONB NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "actualDuration" INTEGER,
    "report" TEXT,
    "photos" TEXT[],
    "clientSignature" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryValidation" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT,
    "deliveryId" TEXT,
    "bookingId" TEXT,
    "storageRentalId" TEXT,
    "clientId" TEXT,
    "merchantId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "type" "PaymentType" NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "stripePaymentId" TEXT,
    "stripeSessionId" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripeAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletOperation" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletOperationType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "providerId" TEXT,
    "merchantId" TEXT,
    "clientId" TEXT,
    "billingPeriodStart" TIMESTAMP(3),
    "billingPeriodEnd" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "openingHours" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "managerName" TEXT,
    "managerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageBox" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "boxNumber" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "pricePerDay" DOUBLE PRECISION NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageBox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageBoxRental" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "storageBoxId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "accessCode" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "StorageBoxRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "rejectionReason" TEXT,
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGeneration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "isPush" BOOLEAN NOT NULL DEFAULT false,
    "pushSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "announcementMatch" BOOLEAN NOT NULL DEFAULT true,
    "deliveryUpdates" BOOLEAN NOT NULL DEFAULT true,
    "paymentUpdates" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "clientId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "announcementId" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "value" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemNotification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'LOW',
    "targetRole" "UserRole",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "providerId" TEXT,
    "delivererId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "specificDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'STANDARD',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "minCommissionAmount" DOUBLE PRECISION,
    "setupFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "renewalPeriod" INTEGER NOT NULL DEFAULT 12,
    "maxOrdersPerMonth" INTEGER,
    "maxOrderValue" DOUBLE PRECISION,
    "deliveryZones" JSONB[],
    "allowedServices" TEXT[],
    "merchantSignedAt" TIMESTAMP(3),
    "merchantSignature" TEXT,
    "adminSignedAt" TIMESTAMP(3),
    "adminSignedBy" TEXT,
    "adminSignature" TEXT,
    "templatePath" TEXT,
    "signedDocumentPath" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractAmendment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "merchantSignedAt" TIMESTAMP(3),
    "adminSignedAt" TIMESTAMP(3),
    "adminSignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantBilling" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "contractId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceNumber" TEXT,
    "invoicePath" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantBilling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTutorialProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalTimeSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTutorialProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialStep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stepId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorialStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorialFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedback" TEXT,
    "rating" INTEGER,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "completionTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorialFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingSession" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "totalDistance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationUpdate" (
    "id" TEXT NOT NULL,
    "trackingSessionId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceEntry" (
    "id" TEXT NOT NULL,
    "trackingSessionId" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "isInside" BOOLEAN NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelivererLocation" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdateAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelivererLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "deliveryId" TEXT,
    "orderId" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "estimatedResolution" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketEscalation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "escalatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TicketEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSatisfaction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "wouldRecommend" BOOLEAN,
    "responseTime" INTEGER,
    "resolutionQuality" INTEGER,
    "agentHelpfulness" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketSatisfaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportKnowledgeBase" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMetrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalTickets" INTEGER NOT NULL DEFAULT 0,
    "openTickets" INTEGER NOT NULL DEFAULT 0,
    "resolvedTickets" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResolutionTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerSatisfaction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstContactResolution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CertificationCategory" NOT NULL,
    "level" "CertificationLevel" NOT NULL DEFAULT 'BASIC',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "validityDuration" INTEGER,
    "price" DOUBLE PRECISION,
    "requirements" JSONB NOT NULL,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "passScore" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationModule" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "resources" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCertification" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "certificateUrl" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "renewalNotified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "ProviderCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelivererCertification" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "certificateUrl" TEXT,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "renewalNotified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "DelivererCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleProgress" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "providerCertificationId" TEXT,
    "delivererCertificationId" TEXT,
    "status" "ModuleStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModuleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "providerCertificationId" TEXT,
    "delivererCertificationId" TEXT,
    "sessionNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeLimit" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationRequirement" (
    "id" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "minimumLevel" "CertificationLevel" NOT NULL DEFAULT 'BASIC',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationAudit" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" "CertificationStatus",
    "newStatus" "CertificationStatus" NOT NULL,
    "performedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "InsuranceCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverageAmount" DOUBLE PRECISION NOT NULL,
    "deductible" DOUBLE PRECISION NOT NULL,
    "premiumAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "terms" JSONB NOT NULL,
    "coverageDetails" JSONB NOT NULL,
    "exclusions" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceCoverage" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "coverageType" "CoverageType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "maxCoverage" DOUBLE PRECISION NOT NULL,
    "currentUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "InsuranceCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "coverageId" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimType" "ClaimType" NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'REPORTED',
    "amount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "circumstances" TEXT NOT NULL,
    "evidences" JSONB[],
    "investigationNotes" TEXT,
    "processingNotes" TEXT,
    "rejectionReason" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimAssessment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "findings" TEXT NOT NULL,
    "recommendedAmount" DOUBLE PRECISION,
    "photos" TEXT[],
    "report" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimPayment" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "ClaimPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "warrantyType" "WarrantyType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "scope" JSONB NOT NULL,
    "conditions" JSONB NOT NULL,
    "exclusions" JSONB[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceWarranty" (
    "id" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "claimsCount" INTEGER NOT NULL DEFAULT 0,
    "maxClaims" INTEGER NOT NULL DEFAULT 3,
    "totalClaimedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxClaimAmount" DOUBLE PRECISION NOT NULL DEFAULT 1000,

    CONSTRAINT "ServiceWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryWarranty" (
    "id" TEXT NOT NULL,
    "warrantyId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxClaimAmount" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "claimsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeliveryWarranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarrantyClaim" (
    "id" TEXT NOT NULL,
    "claimNumber" TEXT NOT NULL,
    "serviceWarrantyId" TEXT,
    "deliveryWarrantyId" TEXT,
    "claimantId" TEXT NOT NULL,
    "claimType" "WarrantyClaimType" NOT NULL,
    "description" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "approvedAmount" DOUBLE PRECISION,
    "status" "ClaimStatus" NOT NULL DEFAULT 'REPORTED',
    "evidences" JSONB[],
    "processingNotes" TEXT,
    "resolution" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WarrantyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "riskFactors" JSONB[],
    "score" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB[],
    "lastAssessment" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAssessment" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceAudit" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "performedBy" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsuranceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "programType" "ReferralType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "maxParticipants" INTEGER,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "eligibilityRules" JSONB NOT NULL,
    "minimumAge" INTEGER,
    "requiredRole" "UserRole",
    "requiredStatus" "ValidationStatus",
    "referrerReward" JSONB NOT NULL,
    "refereeReward" JSONB NOT NULL,
    "bonusConditions" JSONB,
    "maxReferralsPerUser" INTEGER NOT NULL DEFAULT 10,
    "maxRewardPerUser" DOUBLE PRECISION,
    "rewardValidityDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCode" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "codeId" TEXT,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referralMethod" "ReferralMethod" NOT NULL,
    "conditionsMet" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "referrerRewardStatus" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "refereeRewardStatus" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "referrerRewardAmount" DOUBLE PRECISION,
    "refereeRewardAmount" DOUBLE PRECISION,
    "referrerRewardDate" TIMESTAMP(3),
    "refereeRewardDate" TIMESTAMP(3),
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralActivity" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "successfulReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastReferralDate" TIMESTAMP(3),
    "ranking" INTEGER,
    "level" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerProgram" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "InfluencerStatus" NOT NULL DEFAULT 'PENDING',
    "minimumFollowers" INTEGER,
    "requiredPlatforms" TEXT[],
    "contentRequirements" JSONB NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "fixedReward" DOUBLE PRECISION,
    "bonusThresholds" JSONB NOT NULL,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerCampaign" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "targetAudience" JSONB NOT NULL,
    "expectedReach" INTEGER,
    "targetConversions" INTEGER,
    "budget" DOUBLE PRECISION,
    "costPerClick" DOUBLE PRECISION,
    "costPerConversion" DOUBLE PRECISION,
    "contentGuidelines" JSONB NOT NULL,
    "requiredHashtags" TEXT[],
    "brandingRequirements" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "postingSchedule" JSONB,
    "actualReach" INTEGER NOT NULL DEFAULT 0,
    "actualClicks" INTEGER NOT NULL DEFAULT 0,
    "actualConversions" INTEGER NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerLink" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "description" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluencerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InfluencerPost" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postUrl" TEXT,
    "postId" TEXT,
    "content" TEXT NOT NULL,
    "hashtags" TEXT[],
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAnalytics" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countries" JSONB NOT NULL,
    "devices" JSONB NOT NULL,
    "referrers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "category" "DisputeCategory" NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceFiles" TEXT[],
    "priority" "DisputePriority" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "ticketNumber" TEXT NOT NULL,
    "resolution" "DisputeResolution",
    "adminNotes" TEXT,
    "compensationAmount" DOUBLE PRECISION,
    "penaltyAmount" DOUBLE PRECISION,
    "actionTaken" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedResolutionDate" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "lastUpdatedBy" TEXT,
    "resolvedBy" TEXT,
    "escalatedBy" TEXT,
    "escalationReason" TEXT,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReverseAuction" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "initialPrice" DOUBLE PRECISION NOT NULL,
    "minimumPrice" DOUBLE PRECISION NOT NULL,
    "currentBestPrice" DOUBLE PRECISION NOT NULL,
    "auctionDuration" DOUBLE PRECISION NOT NULL,
    "autoAcceptThreshold" DOUBLE PRECISION,
    "maxBidders" INTEGER NOT NULL DEFAULT 10,
    "totalBids" INTEGER NOT NULL DEFAULT 0,
    "status" "AuctionStatus" NOT NULL DEFAULT 'ACTIVE',
    "winningBidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "ReverseAuction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionBid" (
    "id" TEXT NOT NULL,
    "auctionId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "estimatedDeliveryTime" INTEGER NOT NULL,
    "additionalNotes" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "delivererRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "compositeScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "AuctionBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryGroup" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'PROPOSED',
    "totalAnnouncements" INTEGER NOT NULL,
    "originalTotalPrice" DOUBLE PRECISION NOT NULL,
    "groupedPrice" DOUBLE PRECISION NOT NULL,
    "savingsAmount" DOUBLE PRECISION NOT NULL,
    "delivererBonus" DOUBLE PRECISION NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "DeliveryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementGroup" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "deliveryGroupId" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "groupedPrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AnnouncementGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupingProposal" (
    "id" TEXT NOT NULL,
    "deliveryGroupId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "responseAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_latitude_longitude_idx" ON "Profile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_token_idx" ON "PasswordReset"("token");

-- CreateIndex
CREATE INDEX "PasswordReset_email_idx" ON "PasswordReset"("email");

-- CreateIndex
CREATE INDEX "PasswordReset_expiresAt_idx" ON "PasswordReset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeCustomerId_key" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeSubscriptionId_key" ON "Client"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Client_subscriptionPlan_idx" ON "Client"("subscriptionPlan");

-- CreateIndex
CREATE INDEX "Client_stripeCustomerId_idx" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Client_stripeSubscriptionId_idx" ON "Client"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverer_userId_key" ON "Deliverer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Deliverer_nfcCardId_key" ON "Deliverer"("nfcCardId");

-- CreateIndex
CREATE INDEX "Deliverer_userId_idx" ON "Deliverer"("userId");

-- CreateIndex
CREATE INDEX "Deliverer_isActive_idx" ON "Deliverer"("isActive");

-- CreateIndex
CREATE INDEX "Deliverer_averageRating_idx" ON "Deliverer"("averageRating");

-- CreateIndex
CREATE INDEX "DeliveryRoute_delivererId_idx" ON "DeliveryRoute"("delivererId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_isActive_idx" ON "DeliveryRoute"("isActive");

-- CreateIndex
CREATE INDEX "DelivererAvailability_delivererId_idx" ON "DelivererAvailability"("delivererId");

-- CreateIndex
CREATE INDEX "DelivererAvailability_dayOfWeek_idx" ON "DelivererAvailability"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "NFCCard_delivererId_key" ON "NFCCard"("delivererId");

-- CreateIndex
CREATE UNIQUE INDEX "NFCCard_cardNumber_key" ON "NFCCard"("cardNumber");

-- CreateIndex
CREATE INDEX "NFCCard_cardNumber_idx" ON "NFCCard"("cardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_userId_key" ON "Merchant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_siret_key" ON "Merchant"("siret");

-- CreateIndex
CREATE INDEX "Merchant_userId_idx" ON "Merchant"("userId");

-- CreateIndex
CREATE INDEX "Merchant_siret_idx" ON "Merchant"("siret");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "CartDropConfig_merchantId_key" ON "CartDropConfig"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_announcementId_key" ON "Order"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_merchantId_idx" ON "Order"("merchantId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_userId_key" ON "Provider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_siret_key" ON "Provider"("siret");

-- CreateIndex
CREATE INDEX "Provider_userId_idx" ON "Provider"("userId");

-- CreateIndex
CREATE INDEX "Provider_legalStatus_idx" ON "Provider"("legalStatus");

-- CreateIndex
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");

-- CreateIndex
CREATE INDEX "Service_type_idx" ON "Service"("type");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "Service"("isActive");

-- CreateIndex
CREATE INDEX "ProviderAvailability_providerId_idx" ON "ProviderAvailability"("providerId");

-- CreateIndex
CREATE INDEX "ProviderAvailability_dayOfWeek_idx" ON "ProviderAvailability"("dayOfWeek");

-- CreateIndex
CREATE INDEX "ProviderRate_providerId_idx" ON "ProviderRate"("providerId");

-- CreateIndex
CREATE INDEX "ProviderRate_serviceType_idx" ON "ProviderRate"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTimeSlot_bookingId_key" ON "ProviderTimeSlot"("bookingId");

-- CreateIndex
CREATE INDEX "ProviderTimeSlot_providerId_idx" ON "ProviderTimeSlot"("providerId");

-- CreateIndex
CREATE INDEX "ProviderTimeSlot_date_idx" ON "ProviderTimeSlot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTimeSlot_providerId_date_startTime_key" ON "ProviderTimeSlot"("providerId", "date", "startTime");

-- CreateIndex
CREATE INDEX "ProviderAvailabilityBlock_providerId_idx" ON "ProviderAvailabilityBlock"("providerId");

-- CreateIndex
CREATE INDEX "ProviderAvailabilityBlock_startDate_endDate_idx" ON "ProviderAvailabilityBlock"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMonthlyInvoice_invoiceNumber_key" ON "ProviderMonthlyInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "ProviderMonthlyInvoice_providerId_idx" ON "ProviderMonthlyInvoice"("providerId");

-- CreateIndex
CREATE INDEX "ProviderMonthlyInvoice_month_year_idx" ON "ProviderMonthlyInvoice"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderMonthlyInvoice_providerId_month_year_key" ON "ProviderMonthlyInvoice"("providerId", "month", "year");

-- CreateIndex
CREATE INDEX "ProviderInvoiceIntervention_invoiceId_idx" ON "ProviderInvoiceIntervention"("invoiceId");

-- CreateIndex
CREATE INDEX "ProviderInvoiceIntervention_interventionId_idx" ON "ProviderInvoiceIntervention"("interventionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderInvoiceIntervention_invoiceId_interventionId_key" ON "ProviderInvoiceIntervention"("invoiceId", "interventionId");

-- CreateIndex
CREATE INDEX "ProviderContract_providerId_idx" ON "ProviderContract"("providerId");

-- CreateIndex
CREATE INDEX "ProviderContract_status_idx" ON "ProviderContract"("status");

-- CreateIndex
CREATE INDEX "ProviderContract_contractType_idx" ON "ProviderContract"("contractType");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "Admin_userId_idx" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "Announcement_authorId_idx" ON "Announcement"("authorId");

-- CreateIndex
CREATE INDEX "Announcement_delivererId_idx" ON "Announcement"("delivererId");

-- CreateIndex
CREATE INDEX "Announcement_type_idx" ON "Announcement"("type");

-- CreateIndex
CREATE INDEX "Announcement_status_idx" ON "Announcement"("status");

-- CreateIndex
CREATE INDEX "Announcement_pickupLatitude_pickupLongitude_idx" ON "Announcement"("pickupLatitude", "pickupLongitude");

-- CreateIndex
CREATE INDEX "Announcement_deliveryLatitude_deliveryLongitude_idx" ON "Announcement"("deliveryLatitude", "deliveryLongitude");

-- CreateIndex
CREATE INDEX "Announcement_pickupDate_idx" ON "Announcement"("pickupDate");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_isUrgent_idx" ON "Announcement"("isUrgent");

-- CreateIndex
CREATE UNIQUE INDEX "PackageAnnouncement_announcementId_key" ON "PackageAnnouncement"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAnnouncement_announcementId_key" ON "ServiceAnnouncement"("announcementId");

-- CreateIndex
CREATE INDEX "DelivererRoute_delivererId_idx" ON "DelivererRoute"("delivererId");

-- CreateIndex
CREATE INDEX "DelivererRoute_startDate_idx" ON "DelivererRoute"("startDate");

-- CreateIndex
CREATE INDEX "DelivererRoute_endDate_idx" ON "DelivererRoute"("endDate");

-- CreateIndex
CREATE INDEX "DelivererRoute_startLatitude_startLongitude_idx" ON "DelivererRoute"("startLatitude", "startLongitude");

-- CreateIndex
CREATE INDEX "DelivererRoute_endLatitude_endLongitude_idx" ON "DelivererRoute"("endLatitude", "endLongitude");

-- CreateIndex
CREATE INDEX "DelivererRoute_isActive_idx" ON "DelivererRoute"("isActive");

-- CreateIndex
CREATE INDEX "RouteMatch_delivererId_idx" ON "RouteMatch"("delivererId");

-- CreateIndex
CREATE INDEX "RouteMatch_status_idx" ON "RouteMatch"("status");

-- CreateIndex
CREATE INDEX "RouteMatch_globalScore_idx" ON "RouteMatch"("globalScore");

-- CreateIndex
CREATE INDEX "RouteMatch_expiresAt_idx" ON "RouteMatch"("expiresAt");

-- CreateIndex
CREATE INDEX "RouteMatch_createdAt_idx" ON "RouteMatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RouteMatch_announcementId_routeId_key" ON "RouteMatch"("announcementId", "routeId");

-- CreateIndex
CREATE INDEX "AnnouncementTracking_announcementId_idx" ON "AnnouncementTracking"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementTracking_status_idx" ON "AnnouncementTracking"("status");

-- CreateIndex
CREATE INDEX "AnnouncementTracking_createdAt_idx" ON "AnnouncementTracking"("createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementAttachment_announcementId_idx" ON "AnnouncementAttachment"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementNotification_announcementId_idx" ON "AnnouncementNotification"("announcementId");

-- CreateIndex
CREATE INDEX "AnnouncementNotification_userId_idx" ON "AnnouncementNotification"("userId");

-- CreateIndex
CREATE INDEX "AnnouncementNotification_sentAt_idx" ON "AnnouncementNotification"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_announcementId_key" ON "Delivery"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_trackingNumber_key" ON "Delivery"("trackingNumber");

-- CreateIndex
CREATE INDEX "Delivery_clientId_idx" ON "Delivery"("clientId");

-- CreateIndex
CREATE INDEX "Delivery_delivererId_idx" ON "Delivery"("delivererId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Delivery_trackingNumber_idx" ON "Delivery"("trackingNumber");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");

-- CreateIndex
CREATE INDEX "TrackingUpdate_deliveryId_idx" ON "TrackingUpdate"("deliveryId");

-- CreateIndex
CREATE INDEX "TrackingUpdate_timestamp_idx" ON "TrackingUpdate"("timestamp");

-- CreateIndex
CREATE INDEX "DeliveryHistory_deliveryId_idx" ON "DeliveryHistory"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryHistory_createdAt_idx" ON "DeliveryHistory"("createdAt");

-- CreateIndex
CREATE INDEX "DeliveryStatusHistory_deliveryId_idx" ON "DeliveryStatusHistory"("deliveryId");

-- CreateIndex
CREATE INDEX "Handover_deliveryId_idx" ON "Handover"("deliveryId");

-- CreateIndex
CREATE INDEX "Handover_handoverCode_idx" ON "Handover"("handoverCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfDelivery_deliveryId_key" ON "ProofOfDelivery"("deliveryId");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_providerId_idx" ON "Booking"("providerId");

-- CreateIndex
CREATE INDEX "Booking_scheduledDate_idx" ON "Booking"("scheduledDate");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_bookingId_key" ON "Intervention"("bookingId");

-- CreateIndex
CREATE INDEX "Intervention_providerId_idx" ON "Intervention"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryValidation_code_key" ON "DeliveryValidation"("code");

-- CreateIndex
CREATE INDEX "DeliveryValidation_deliveryId_idx" ON "DeliveryValidation"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryValidation_code_idx" ON "DeliveryValidation"("code");

-- CreateIndex
CREATE INDEX "DeliveryValidation_expiresAt_idx" ON "DeliveryValidation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_announcementId_key" ON "Payment"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_deliveryId_key" ON "Payment"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_key" ON "Payment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_storageRentalId_key" ON "Payment"("storageRentalId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_paymentMethod_idx" ON "Payment"("paymentMethod");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_stripeAccountId_key" ON "Wallet"("stripeAccountId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_isActive_idx" ON "Wallet"("isActive");

-- CreateIndex
CREATE INDEX "WalletOperation_walletId_idx" ON "WalletOperation"("walletId");

-- CreateIndex
CREATE INDEX "WalletOperation_userId_idx" ON "WalletOperation"("userId");

-- CreateIndex
CREATE INDEX "WalletOperation_type_idx" ON "WalletOperation"("type");

-- CreateIndex
CREATE INDEX "WalletOperation_status_idx" ON "WalletOperation"("status");

-- CreateIndex
CREATE INDEX "WalletOperation_createdAt_idx" ON "WalletOperation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_type_idx" ON "Invoice"("type");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_providerId_idx" ON "Invoice"("providerId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Location_type_idx" ON "Location"("type");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_locationId_key" ON "Warehouse"("locationId");

-- CreateIndex
CREATE INDEX "StorageBox_locationId_idx" ON "StorageBox"("locationId");

-- CreateIndex
CREATE INDEX "StorageBox_isAvailable_idx" ON "StorageBox"("isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "StorageBox_locationId_boxNumber_key" ON "StorageBox"("locationId", "boxNumber");

-- CreateIndex
CREATE INDEX "StorageBoxRental_clientId_idx" ON "StorageBoxRental"("clientId");

-- CreateIndex
CREATE INDEX "StorageBoxRental_storageBoxId_idx" ON "StorageBoxRental"("storageBoxId");

-- CreateIndex
CREATE INDEX "StorageBoxRental_startDate_idx" ON "StorageBoxRental"("startDate");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_validationStatus_idx" ON "Document"("validationStatus");

-- CreateIndex
CREATE INDEX "DocumentGeneration_userId_idx" ON "DocumentGeneration"("userId");

-- CreateIndex
CREATE INDEX "DocumentGeneration_documentType_idx" ON "DocumentGeneration"("documentType");

-- CreateIndex
CREATE INDEX "DocumentGeneration_entityId_idx" ON "DocumentGeneration"("entityId");

-- CreateIndex
CREATE INDEX "DocumentGeneration_createdAt_idx" ON "DocumentGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_isVerified_idx" ON "Review"("isVerified");

-- CreateIndex
CREATE INDEX "Review_providerId_idx" ON "Review"("providerId");

-- CreateIndex
CREATE INDEX "Review_clientId_idx" ON "Review"("clientId");

-- CreateIndex
CREATE INDEX "GlobalAvailability_userId_idx" ON "GlobalAvailability"("userId");

-- CreateIndex
CREATE INDEX "GlobalAvailability_date_idx" ON "GlobalAvailability"("date");

-- CreateIndex
CREATE INDEX "Analytics_type_idx" ON "Analytics"("type");

-- CreateIndex
CREATE INDEX "Analytics_entity_idx" ON "Analytics"("entity");

-- CreateIndex
CREATE INDEX "Analytics_date_idx" ON "Analytics"("date");

-- CreateIndex
CREATE INDEX "Analytics_period_idx" ON "Analytics"("period");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "Settings_key_idx" ON "Settings"("key");

-- CreateIndex
CREATE INDEX "Settings_isActive_idx" ON "Settings"("isActive");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemNotification_type_idx" ON "SystemNotification"("type");

-- CreateIndex
CREATE INDEX "SystemNotification_priority_idx" ON "SystemNotification"("priority");

-- CreateIndex
CREATE INDEX "SystemNotification_isActive_idx" ON "SystemNotification"("isActive");

-- CreateIndex
CREATE INDEX "SystemNotification_targetRole_idx" ON "SystemNotification"("targetRole");

-- CreateIndex
CREATE INDEX "Availability_providerId_idx" ON "Availability"("providerId");

-- CreateIndex
CREATE INDEX "Availability_delivererId_idx" ON "Availability"("delivererId");

-- CreateIndex
CREATE INDEX "Availability_dayOfWeek_idx" ON "Availability"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_merchantId_key" ON "Contract"("merchantId");

-- CreateIndex
CREATE INDEX "Contract_merchantId_idx" ON "Contract"("merchantId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_validFrom_idx" ON "Contract"("validFrom");

-- CreateIndex
CREATE INDEX "ContractAmendment_contractId_idx" ON "ContractAmendment"("contractId");

-- CreateIndex
CREATE INDEX "MerchantBilling_merchantId_idx" ON "MerchantBilling"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantBilling_status_idx" ON "MerchantBilling"("status");

-- CreateIndex
CREATE INDEX "MerchantBilling_dueDate_idx" ON "MerchantBilling"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantBilling_merchantId_periodStart_key" ON "MerchantBilling"("merchantId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTutorialProgress_userId_key" ON "ClientTutorialProgress"("userId");

-- CreateIndex
CREATE INDEX "ClientTutorialProgress_userId_idx" ON "ClientTutorialProgress"("userId");

-- CreateIndex
CREATE INDEX "ClientTutorialProgress_isCompleted_idx" ON "ClientTutorialProgress"("isCompleted");

-- CreateIndex
CREATE INDEX "TutorialStep_userId_idx" ON "TutorialStep"("userId");

-- CreateIndex
CREATE INDEX "TutorialStep_stepId_idx" ON "TutorialStep"("stepId");

-- CreateIndex
CREATE INDEX "TutorialStep_isCompleted_idx" ON "TutorialStep"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialStep_userId_stepId_key" ON "TutorialStep"("userId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorialFeedback_userId_key" ON "TutorialFeedback"("userId");

-- CreateIndex
CREATE INDEX "TutorialFeedback_userId_idx" ON "TutorialFeedback"("userId");

-- CreateIndex
CREATE INDEX "TutorialFeedback_rating_idx" ON "TutorialFeedback"("rating");

-- CreateIndex
CREATE INDEX "TrackingSession_deliveryId_idx" ON "TrackingSession"("deliveryId");

-- CreateIndex
CREATE INDEX "TrackingSession_delivererId_idx" ON "TrackingSession"("delivererId");

-- CreateIndex
CREATE INDEX "TrackingSession_isActive_idx" ON "TrackingSession"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingSession_deliveryId_delivererId_startTime_key" ON "TrackingSession"("deliveryId", "delivererId", "startTime");

-- CreateIndex
CREATE INDEX "LocationUpdate_trackingSessionId_idx" ON "LocationUpdate"("trackingSessionId");

-- CreateIndex
CREATE INDEX "LocationUpdate_timestamp_idx" ON "LocationUpdate"("timestamp");

-- CreateIndex
CREATE INDEX "Geofence_type_idx" ON "Geofence"("type");

-- CreateIndex
CREATE INDEX "Geofence_isActive_idx" ON "Geofence"("isActive");

-- CreateIndex
CREATE INDEX "GeofenceEntry_trackingSessionId_idx" ON "GeofenceEntry"("trackingSessionId");

-- CreateIndex
CREATE INDEX "GeofenceEntry_geofenceId_idx" ON "GeofenceEntry"("geofenceId");

-- CreateIndex
CREATE INDEX "GeofenceEntry_timestamp_idx" ON "GeofenceEntry"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "DelivererLocation_delivererId_key" ON "DelivererLocation"("delivererId");

-- CreateIndex
CREATE INDEX "DelivererLocation_delivererId_idx" ON "DelivererLocation"("delivererId");

-- CreateIndex
CREATE INDEX "DelivererLocation_isOnline_idx" ON "DelivererLocation"("isOnline");

-- CreateIndex
CREATE INDEX "DelivererLocation_lastUpdateAt_idx" ON "DelivererLocation"("lastUpdateAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "SupportTicket_authorId_idx" ON "SupportTicket"("authorId");

-- CreateIndex
CREATE INDEX "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "SupportTicket_category_idx" ON "SupportTicket"("category");

-- CreateIndex
CREATE INDEX "SupportTicket_priority_idx" ON "SupportTicket"("priority");

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_authorId_idx" ON "TicketMessage"("authorId");

-- CreateIndex
CREATE INDEX "TicketMessage_createdAt_idx" ON "TicketMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "TicketEscalation_ticketId_idx" ON "TicketEscalation"("ticketId");

-- CreateIndex
CREATE INDEX "TicketEscalation_escalatedAt_idx" ON "TicketEscalation"("escalatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSatisfaction_ticketId_key" ON "TicketSatisfaction"("ticketId");

-- CreateIndex
CREATE INDEX "TicketSatisfaction_rating_idx" ON "TicketSatisfaction"("rating");

-- CreateIndex
CREATE INDEX "TicketSatisfaction_submittedAt_idx" ON "TicketSatisfaction"("submittedAt");

-- CreateIndex
CREATE INDEX "SupportKnowledgeBase_category_idx" ON "SupportKnowledgeBase"("category");

-- CreateIndex
CREATE INDEX "SupportKnowledgeBase_isPublic_idx" ON "SupportKnowledgeBase"("isPublic");

-- CreateIndex
CREATE INDEX "SupportKnowledgeBase_isActive_idx" ON "SupportKnowledgeBase"("isActive");

-- CreateIndex
CREATE INDEX "SupportTemplate_category_idx" ON "SupportTemplate"("category");

-- CreateIndex
CREATE INDEX "SupportTemplate_isActive_idx" ON "SupportTemplate"("isActive");

-- CreateIndex
CREATE INDEX "SupportMetrics_date_idx" ON "SupportMetrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SupportMetrics_date_key" ON "SupportMetrics"("date");

-- CreateIndex
CREATE INDEX "Certification_category_idx" ON "Certification"("category");

-- CreateIndex
CREATE INDEX "Certification_isRequired_idx" ON "Certification"("isRequired");

-- CreateIndex
CREATE INDEX "Certification_isActive_idx" ON "Certification"("isActive");

-- CreateIndex
CREATE INDEX "CertificationModule_certificationId_idx" ON "CertificationModule"("certificationId");

-- CreateIndex
CREATE INDEX "CertificationModule_orderIndex_idx" ON "CertificationModule"("orderIndex");

-- CreateIndex
CREATE INDEX "ProviderCertification_providerId_idx" ON "ProviderCertification"("providerId");

-- CreateIndex
CREATE INDEX "ProviderCertification_status_idx" ON "ProviderCertification"("status");

-- CreateIndex
CREATE INDEX "ProviderCertification_expiresAt_idx" ON "ProviderCertification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCertification_providerId_certificationId_key" ON "ProviderCertification"("providerId", "certificationId");

-- CreateIndex
CREATE INDEX "DelivererCertification_delivererId_idx" ON "DelivererCertification"("delivererId");

-- CreateIndex
CREATE INDEX "DelivererCertification_status_idx" ON "DelivererCertification"("status");

-- CreateIndex
CREATE INDEX "DelivererCertification_expiresAt_idx" ON "DelivererCertification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DelivererCertification_delivererId_certificationId_key" ON "DelivererCertification"("delivererId", "certificationId");

-- CreateIndex
CREATE INDEX "ModuleProgress_moduleId_idx" ON "ModuleProgress"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleProgress_providerCertificationId_idx" ON "ModuleProgress"("providerCertificationId");

-- CreateIndex
CREATE INDEX "ModuleProgress_delivererCertificationId_idx" ON "ModuleProgress"("delivererCertificationId");

-- CreateIndex
CREATE INDEX "ExamSession_certificationId_idx" ON "ExamSession"("certificationId");

-- CreateIndex
CREATE INDEX "ExamSession_providerCertificationId_idx" ON "ExamSession"("providerCertificationId");

-- CreateIndex
CREATE INDEX "ExamSession_delivererCertificationId_idx" ON "ExamSession"("delivererCertificationId");

-- CreateIndex
CREATE INDEX "ExamSession_startedAt_idx" ON "ExamSession"("startedAt");

-- CreateIndex
CREATE INDEX "CertificationTemplate_isDefault_idx" ON "CertificationTemplate"("isDefault");

-- CreateIndex
CREATE INDEX "CertificationTemplate_isActive_idx" ON "CertificationTemplate"("isActive");

-- CreateIndex
CREATE INDEX "QualificationRequirement_serviceType_idx" ON "QualificationRequirement"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "QualificationRequirement_serviceType_certificationId_key" ON "QualificationRequirement"("serviceType", "certificationId");

-- CreateIndex
CREATE INDEX "CertificationAudit_entityType_entityId_idx" ON "CertificationAudit"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "CertificationAudit_certificationId_idx" ON "CertificationAudit"("certificationId");

-- CreateIndex
CREATE INDEX "CertificationAudit_timestamp_idx" ON "CertificationAudit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "InsurancePolicy_policyNumber_key" ON "InsurancePolicy"("policyNumber");

-- CreateIndex
CREATE INDEX "InsurancePolicy_category_idx" ON "InsurancePolicy"("category");

-- CreateIndex
CREATE INDEX "InsurancePolicy_isActive_idx" ON "InsurancePolicy"("isActive");

-- CreateIndex
CREATE INDEX "InsurancePolicy_endDate_idx" ON "InsurancePolicy"("endDate");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_policyId_idx" ON "InsuranceCoverage"("policyId");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_entityType_entityId_idx" ON "InsuranceCoverage"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_coverageType_idx" ON "InsuranceCoverage"("coverageType");

-- CreateIndex
CREATE INDEX "InsuranceCoverage_isActive_idx" ON "InsuranceCoverage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "InsuranceClaim_policyId_idx" ON "InsuranceClaim"("policyId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_coverageId_idx" ON "InsuranceClaim"("coverageId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_claimantId_idx" ON "InsuranceClaim"("claimantId");

-- CreateIndex
CREATE INDEX "InsuranceClaim_status_idx" ON "InsuranceClaim"("status");

-- CreateIndex
CREATE INDEX "InsuranceClaim_incidentDate_idx" ON "InsuranceClaim"("incidentDate");

-- CreateIndex
CREATE INDEX "ClaimAssessment_claimId_idx" ON "ClaimAssessment"("claimId");

-- CreateIndex
CREATE INDEX "ClaimAssessment_assessorId_idx" ON "ClaimAssessment"("assessorId");

-- CreateIndex
CREATE INDEX "ClaimPayment_claimId_idx" ON "ClaimPayment"("claimId");

-- CreateIndex
CREATE INDEX "ClaimPayment_paymentDate_idx" ON "ClaimPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "Warranty_warrantyType_idx" ON "Warranty"("warrantyType");

-- CreateIndex
CREATE INDEX "Warranty_isActive_idx" ON "Warranty"("isActive");

-- CreateIndex
CREATE INDEX "ServiceWarranty_warrantyId_idx" ON "ServiceWarranty"("warrantyId");

-- CreateIndex
CREATE INDEX "ServiceWarranty_serviceId_idx" ON "ServiceWarranty"("serviceId");

-- CreateIndex
CREATE INDEX "ServiceWarranty_providerId_idx" ON "ServiceWarranty"("providerId");

-- CreateIndex
CREATE INDEX "ServiceWarranty_clientId_idx" ON "ServiceWarranty"("clientId");

-- CreateIndex
CREATE INDEX "ServiceWarranty_endDate_idx" ON "ServiceWarranty"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryWarranty_deliveryId_key" ON "DeliveryWarranty"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryWarranty_warrantyId_idx" ON "DeliveryWarranty"("warrantyId");

-- CreateIndex
CREATE INDEX "DeliveryWarranty_deliveryId_idx" ON "DeliveryWarranty"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryWarranty_delivererId_idx" ON "DeliveryWarranty"("delivererId");

-- CreateIndex
CREATE INDEX "DeliveryWarranty_clientId_idx" ON "DeliveryWarranty"("clientId");

-- CreateIndex
CREATE INDEX "DeliveryWarranty_endDate_idx" ON "DeliveryWarranty"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "WarrantyClaim_claimNumber_key" ON "WarrantyClaim"("claimNumber");

-- CreateIndex
CREATE INDEX "WarrantyClaim_serviceWarrantyId_idx" ON "WarrantyClaim"("serviceWarrantyId");

-- CreateIndex
CREATE INDEX "WarrantyClaim_deliveryWarrantyId_idx" ON "WarrantyClaim"("deliveryWarrantyId");

-- CreateIndex
CREATE INDEX "WarrantyClaim_claimantId_idx" ON "WarrantyClaim"("claimantId");

-- CreateIndex
CREATE INDEX "WarrantyClaim_status_idx" ON "WarrantyClaim"("status");

-- CreateIndex
CREATE INDEX "WarrantyClaim_claimedAt_idx" ON "WarrantyClaim"("claimedAt");

-- CreateIndex
CREATE INDEX "RiskAssessment_riskLevel_idx" ON "RiskAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "RiskAssessment_lastAssessment_idx" ON "RiskAssessment"("lastAssessment");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_entityType_entityId_key" ON "RiskAssessment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InsuranceAudit_entityType_entityId_idx" ON "InsuranceAudit"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InsuranceAudit_timestamp_idx" ON "InsuranceAudit"("timestamp");

-- CreateIndex
CREATE INDEX "ReferralProgram_programType_idx" ON "ReferralProgram"("programType");

-- CreateIndex
CREATE INDEX "ReferralProgram_isActive_idx" ON "ReferralProgram"("isActive");

-- CreateIndex
CREATE INDEX "ReferralProgram_startDate_idx" ON "ReferralProgram"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCode_code_key" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_programId_idx" ON "ReferralCode"("programId");

-- CreateIndex
CREATE INDEX "ReferralCode_referrerId_idx" ON "ReferralCode"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralCode_code_idx" ON "ReferralCode"("code");

-- CreateIndex
CREATE INDEX "ReferralCode_isActive_idx" ON "ReferralCode"("isActive");

-- CreateIndex
CREATE INDEX "Referral_programId_idx" ON "Referral"("programId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "Referral_refereeId_idx" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_createdAt_idx" ON "Referral"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referrerId_refereeId_programId_key" ON "Referral"("referrerId", "refereeId", "programId");

-- CreateIndex
CREATE INDEX "ReferralActivity_referralId_idx" ON "ReferralActivity"("referralId");

-- CreateIndex
CREATE INDEX "ReferralActivity_activityType_idx" ON "ReferralActivity"("activityType");

-- CreateIndex
CREATE INDEX "ReferralActivity_occurredAt_idx" ON "ReferralActivity"("occurredAt");

-- CreateIndex
CREATE INDEX "ReferralReward_userId_idx" ON "ReferralReward"("userId");

-- CreateIndex
CREATE INDEX "ReferralReward_referralId_idx" ON "ReferralReward"("referralId");

-- CreateIndex
CREATE INDEX "ReferralReward_status_idx" ON "ReferralReward"("status");

-- CreateIndex
CREATE INDEX "ReferralReward_rewardType_idx" ON "ReferralReward"("rewardType");

-- CreateIndex
CREATE INDEX "ReferralReward_expiresAt_idx" ON "ReferralReward"("expiresAt");

-- CreateIndex
CREATE INDEX "ReferralStats_userId_idx" ON "ReferralStats"("userId");

-- CreateIndex
CREATE INDEX "ReferralStats_programId_idx" ON "ReferralStats"("programId");

-- CreateIndex
CREATE INDEX "ReferralStats_totalReferrals_idx" ON "ReferralStats"("totalReferrals");

-- CreateIndex
CREATE INDEX "ReferralStats_ranking_idx" ON "ReferralStats"("ranking");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralStats_userId_programId_key" ON "ReferralStats"("userId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerProgram_influencerId_key" ON "InfluencerProgram"("influencerId");

-- CreateIndex
CREATE INDEX "InfluencerProgram_influencerId_idx" ON "InfluencerProgram"("influencerId");

-- CreateIndex
CREATE INDEX "InfluencerProgram_status_idx" ON "InfluencerProgram"("status");

-- CreateIndex
CREATE INDEX "InfluencerProgram_approvedAt_idx" ON "InfluencerProgram"("approvedAt");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_programId_idx" ON "InfluencerCampaign"("programId");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_status_idx" ON "InfluencerCampaign"("status");

-- CreateIndex
CREATE INDEX "InfluencerCampaign_startDate_idx" ON "InfluencerCampaign"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerLink_url_key" ON "InfluencerLink"("url");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerLink_shortCode_key" ON "InfluencerLink"("shortCode");

-- CreateIndex
CREATE INDEX "InfluencerLink_programId_idx" ON "InfluencerLink"("programId");

-- CreateIndex
CREATE INDEX "InfluencerLink_shortCode_idx" ON "InfluencerLink"("shortCode");

-- CreateIndex
CREATE INDEX "InfluencerLink_isActive_idx" ON "InfluencerLink"("isActive");

-- CreateIndex
CREATE INDEX "InfluencerPost_campaignId_idx" ON "InfluencerPost"("campaignId");

-- CreateIndex
CREATE INDEX "InfluencerPost_platform_idx" ON "InfluencerPost"("platform");

-- CreateIndex
CREATE INDEX "InfluencerPost_publishedAt_idx" ON "InfluencerPost"("publishedAt");

-- CreateIndex
CREATE INDEX "LinkAnalytics_linkId_idx" ON "LinkAnalytics"("linkId");

-- CreateIndex
CREATE INDEX "LinkAnalytics_date_idx" ON "LinkAnalytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "LinkAnalytics_linkId_date_key" ON "LinkAnalytics"("linkId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_ticketNumber_key" ON "Dispute"("ticketNumber");

-- CreateIndex
CREATE INDEX "Dispute_announcementId_idx" ON "Dispute"("announcementId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "Dispute_priority_idx" ON "Dispute"("priority");

-- CreateIndex
CREATE INDEX "Dispute_category_idx" ON "Dispute"("category");

-- CreateIndex
CREATE INDEX "Dispute_createdAt_idx" ON "Dispute"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReverseAuction_announcementId_key" ON "ReverseAuction"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "ReverseAuction_winningBidId_key" ON "ReverseAuction"("winningBidId");

-- CreateIndex
CREATE INDEX "ReverseAuction_status_idx" ON "ReverseAuction"("status");

-- CreateIndex
CREATE INDEX "ReverseAuction_expiresAt_idx" ON "ReverseAuction"("expiresAt");

-- CreateIndex
CREATE INDEX "AuctionBid_auctionId_idx" ON "AuctionBid"("auctionId");

-- CreateIndex
CREATE INDEX "AuctionBid_compositeScore_idx" ON "AuctionBid"("compositeScore");

-- CreateIndex
CREATE INDEX "AuctionBid_status_idx" ON "AuctionBid"("status");

-- CreateIndex
CREATE INDEX "DeliveryGroup_delivererId_idx" ON "DeliveryGroup"("delivererId");

-- CreateIndex
CREATE INDEX "DeliveryGroup_status_idx" ON "DeliveryGroup"("status");

-- CreateIndex
CREATE INDEX "DeliveryGroup_createdAt_idx" ON "DeliveryGroup"("createdAt");

-- CreateIndex
CREATE INDEX "AnnouncementGroup_deliveryGroupId_idx" ON "AnnouncementGroup"("deliveryGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementGroup_announcementId_deliveryGroupId_key" ON "AnnouncementGroup"("announcementId", "deliveryGroupId");

-- CreateIndex
CREATE INDEX "GroupingProposal_deliveryGroupId_idx" ON "GroupingProposal"("deliveryGroupId");

-- CreateIndex
CREATE INDEX "GroupingProposal_clientId_idx" ON "GroupingProposal"("clientId");

-- CreateIndex
CREATE INDEX "GroupingProposal_status_idx" ON "GroupingProposal"("status");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverer" ADD CONSTRAINT "Deliverer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelivererAvailability" ADD CONSTRAINT "DelivererAvailability_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NFCCard" ADD CONSTRAINT "NFCCard_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartDropConfig" ADD CONSTRAINT "CartDropConfig_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_merchantBillingId_fkey" FOREIGN KEY ("merchantBillingId") REFERENCES "MerchantBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAvailability" ADD CONSTRAINT "ProviderAvailability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderRate" ADD CONSTRAINT "ProviderRate_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTimeSlot" ADD CONSTRAINT "ProviderTimeSlot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTimeSlot" ADD CONSTRAINT "ProviderTimeSlot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAvailabilityBlock" ADD CONSTRAINT "ProviderAvailabilityBlock_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMonthlyInvoice" ADD CONSTRAINT "ProviderMonthlyInvoice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvoiceIntervention" ADD CONSTRAINT "ProviderInvoiceIntervention_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ProviderMonthlyInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInvoiceIntervention" ADD CONSTRAINT "ProviderInvoiceIntervention_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderContract" ADD CONSTRAINT "ProviderContract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAnnouncement" ADD CONSTRAINT "PackageAnnouncement_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAnnouncement" ADD CONSTRAINT "ServiceAnnouncement_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelivererRoute" ADD CONSTRAINT "DelivererRoute_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteMatch" ADD CONSTRAINT "RouteMatch_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteMatch" ADD CONSTRAINT "RouteMatch_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DelivererRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteMatch" ADD CONSTRAINT "RouteMatch_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTracking" ADD CONSTRAINT "AnnouncementTracking_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementAttachment" ADD CONSTRAINT "AnnouncementAttachment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementNotification" ADD CONSTRAINT "AnnouncementNotification_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingUpdate" ADD CONSTRAINT "TrackingUpdate_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryHistory" ADD CONSTRAINT "DeliveryHistory_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStatusHistory" ADD CONSTRAINT "DeliveryStatusHistory_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfDelivery" ADD CONSTRAINT "ProofOfDelivery_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryValidation" ADD CONSTRAINT "DeliveryValidation_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_storageRentalId_fkey" FOREIGN KEY ("storageRentalId") REFERENCES "StorageBoxRental"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletOperation" ADD CONSTRAINT "WalletOperation_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletOperation" ADD CONSTRAINT "WalletOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageBox" ADD CONSTRAINT "StorageBox_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageBoxRental" ADD CONSTRAINT "StorageBoxRental_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageBoxRental" ADD CONSTRAINT "StorageBoxRental_storageBoxId_fkey" FOREIGN KEY ("storageBoxId") REFERENCES "StorageBox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageBoxRental" ADD CONSTRAINT "StorageBoxRental_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalAvailability" ADD CONSTRAINT "GlobalAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractAmendment" ADD CONSTRAINT "ContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBilling" ADD CONSTRAINT "MerchantBilling_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBilling" ADD CONSTRAINT "MerchantBilling_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTutorialProgress" ADD CONSTRAINT "ClientTutorialProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialStep" ADD CONSTRAINT "TutorialStep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ClientTutorialProgress"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorialFeedback" ADD CONSTRAINT "TutorialFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ClientTutorialProgress"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingSession" ADD CONSTRAINT "TrackingSession_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_trackingSessionId_fkey" FOREIGN KEY ("trackingSessionId") REFERENCES "TrackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEntry" ADD CONSTRAINT "GeofenceEntry_trackingSessionId_fkey" FOREIGN KEY ("trackingSessionId") REFERENCES "TrackingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEntry" ADD CONSTRAINT "GeofenceEntry_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelivererLocation" ADD CONSTRAINT "DelivererLocation_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMessage" ADD CONSTRAINT "TicketMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEscalation" ADD CONSTRAINT "TicketEscalation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEscalation" ADD CONSTRAINT "TicketEscalation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketEscalation" ADD CONSTRAINT "TicketEscalation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSatisfaction" ADD CONSTRAINT "TicketSatisfaction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportKnowledgeBase" ADD CONSTRAINT "SupportKnowledgeBase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTemplate" ADD CONSTRAINT "SupportTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationModule" ADD CONSTRAINT "CertificationModule_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCertification" ADD CONSTRAINT "ProviderCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelivererCertification" ADD CONSTRAINT "DelivererCertification_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "Deliverer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelivererCertification" ADD CONSTRAINT "DelivererCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleProgress" ADD CONSTRAINT "ModuleProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CertificationModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleProgress" ADD CONSTRAINT "ModuleProgress_providerCertificationId_fkey" FOREIGN KEY ("providerCertificationId") REFERENCES "ProviderCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleProgress" ADD CONSTRAINT "ModuleProgress_delivererCertificationId_fkey" FOREIGN KEY ("delivererCertificationId") REFERENCES "DelivererCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_providerCertificationId_fkey" FOREIGN KEY ("providerCertificationId") REFERENCES "ProviderCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_delivererCertificationId_fkey" FOREIGN KEY ("delivererCertificationId") REFERENCES "DelivererCertification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationRequirement" ADD CONSTRAINT "QualificationRequirement_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_coverageId_fkey" FOREIGN KEY ("coverageId") REFERENCES "InsuranceCoverage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssessment" ADD CONSTRAINT "ClaimAssessment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimAssessment" ADD CONSTRAINT "ClaimAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimPayment" ADD CONSTRAINT "ClaimPayment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceWarranty" ADD CONSTRAINT "ServiceWarranty_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceWarranty" ADD CONSTRAINT "ServiceWarranty_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceWarranty" ADD CONSTRAINT "ServiceWarranty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryWarranty" ADD CONSTRAINT "DeliveryWarranty_warrantyId_fkey" FOREIGN KEY ("warrantyId") REFERENCES "Warranty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryWarranty" ADD CONSTRAINT "DeliveryWarranty_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryWarranty" ADD CONSTRAINT "DeliveryWarranty_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryWarranty" ADD CONSTRAINT "DeliveryWarranty_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_serviceWarrantyId_fkey" FOREIGN KEY ("serviceWarrantyId") REFERENCES "ServiceWarranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_deliveryWarrantyId_fkey" FOREIGN KEY ("deliveryWarrantyId") REFERENCES "DeliveryWarranty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarrantyClaim" ADD CONSTRAINT "WarrantyClaim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ReferralProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCode" ADD CONSTRAINT "ReferralCode_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ReferralProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "ReferralCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralActivity" ADD CONSTRAINT "ReferralActivity_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralStats" ADD CONSTRAINT "ReferralStats_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ReferralProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerProgram" ADD CONSTRAINT "InfluencerProgram_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerCampaign" ADD CONSTRAINT "InfluencerCampaign_programId_fkey" FOREIGN KEY ("programId") REFERENCES "InfluencerProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerLink" ADD CONSTRAINT "InfluencerLink_programId_fkey" FOREIGN KEY ("programId") REFERENCES "InfluencerProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerPost" ADD CONSTRAINT "InfluencerPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InfluencerCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAnalytics" ADD CONSTRAINT "LinkAnalytics_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "InfluencerLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReverseAuction" ADD CONSTRAINT "ReverseAuction_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReverseAuction" ADD CONSTRAINT "ReverseAuction_winningBidId_fkey" FOREIGN KEY ("winningBidId") REFERENCES "AuctionBid"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "ReverseAuction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionBid" ADD CONSTRAINT "AuctionBid_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryGroup" ADD CONSTRAINT "DeliveryGroup_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementGroup" ADD CONSTRAINT "AnnouncementGroup_deliveryGroupId_fkey" FOREIGN KEY ("deliveryGroupId") REFERENCES "DeliveryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingProposal" ADD CONSTRAINT "GroupingProposal_deliveryGroupId_fkey" FOREIGN KEY ("deliveryGroupId") REFERENCES "DeliveryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingProposal" ADD CONSTRAINT "GroupingProposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupingProposal" ADD CONSTRAINT "GroupingProposal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
