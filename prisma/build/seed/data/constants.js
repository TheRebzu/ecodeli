"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSTANTS = void 0;
exports.CONSTANTS = {
    // Rôles utilisateur
    roles: {
        CLIENT: 'CLIENT',
        DELIVERER: 'DELIVERER',
        MERCHANT: 'MERCHANT',
        PROVIDER: 'PROVIDER',
        ADMIN: 'ADMIN',
    },
    // États de validation
    validationStatus: {
        PENDING: 'PENDING',
        PENDING_DOCUMENTS: 'PENDING_DOCUMENTS',
        PENDING_VALIDATION: 'PENDING_VALIDATION',
        APPROVED: 'APPROVED',
        VALIDATED: 'VALIDATED',
        REJECTED: 'REJECTED',
        SUSPENDED: 'SUSPENDED',
    },
    // Types d'annonces
    announcementTypes: {
        PACKAGE_DELIVERY: 'PACKAGE_DELIVERY',
        PERSON_TRANSPORT: 'PERSON_TRANSPORT',
        AIRPORT_TRANSFER: 'AIRPORT_TRANSFER',
        SHOPPING: 'SHOPPING',
        INTERNATIONAL_PURCHASE: 'INTERNATIONAL_PURCHASE',
        PET_SITTING: 'PET_SITTING',
        HOME_SERVICE: 'HOME_SERVICE',
        CART_DROP: 'CART_DROP',
    },
    // États des annonces
    announcementStatus: {
        DRAFT: 'DRAFT',
        ACTIVE: 'ACTIVE',
        IN_PROGRESS: 'IN_PROGRESS',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',
        EXPIRED: 'EXPIRED',
    },
    // États des livraisons
    deliveryStatus: {
        PENDING: 'PENDING',
        ACCEPTED: 'ACCEPTED',
        IN_PROGRESS: 'IN_PROGRESS',
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
        FAILED: 'FAILED',
    },
    // États des paiements
    paymentStatus: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
        REFUNDED: 'REFUNDED',
        PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
    },
    // Plans d'abonnement
    subscriptionPlans: {
        FREE: 'FREE',
        STARTER: 'STARTER',
        PREMIUM: 'PREMIUM',
    },
    // Types de documents
    documentTypes: {
        IDENTITY: 'IDENTITY',
        DRIVING_LICENSE: 'DRIVING_LICENSE',
        INSURANCE: 'INSURANCE',
        CERTIFICATION: 'CERTIFICATION',
        CONTRACT: 'CONTRACT',
        OTHER: 'OTHER',
    },
    // Catégories de services
    serviceCategories: {
        TRANSPORT: 'TRANSPORT',
        HOME_CLEANING: 'HOME_CLEANING',
        GARDENING: 'GARDENING',
        HANDYMAN: 'HANDYMAN',
        TUTORING: 'TUTORING',
        HEALTHCARE: 'HEALTHCARE',
        BEAUTY: 'BEAUTY',
        PET_CARE: 'PET_CARE',
        OTHER: 'OTHER',
    },
    // Tailles de box de stockage
    boxSizes: {
        SMALL: 'SMALL',
        MEDIUM: 'MEDIUM',
        LARGE: 'LARGE',
        EXTRA_LARGE: 'EXTRA_LARGE',
    },
    // Tarifs par défaut (en euros)
    pricing: {
        delivery: {
            basePrice: 10,
            pricePerKm: 0.8,
            urgencyFee: 5,
            insuranceFeeRate: 0.02, // 2% du montant
            platformFeeRate: 0.15, // 15% commission
        },
        services: {
            hourlyRates: {
                HOME_CLEANING: 25,
                GARDENING: 30,
                HANDYMAN: 35,
                TUTORING: 40,
                HEALTHCARE: 45,
                BEAUTY: 35,
                PET_CARE: 20,
            },
        },
        storage: {
            daily: {
                SMALL: 2,
                MEDIUM: 5,
                LARGE: 10,
                EXTRA_LARGE: 20,
            },
        },
        subscription: {
            FREE: 0,
            STARTER: 9.90,
            PREMIUM: 19.99,
        },
    },
    // Coordonnées des entrepôts
    warehouses: {
        PARIS: { name: 'Paris', lat: 48.8566, lng: 2.3522 },
        MARSEILLE: { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
        LYON: { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
        LILLE: { name: 'Lille', lat: 50.6292, lng: 3.0573 },
        RENNES: { name: 'Rennes', lat: 48.1173, lng: -1.6778 },
        MONTPELLIER: { name: 'Montpellier', lat: 43.6119, lng: 3.8772 },
    },
    // Délais par défaut (en heures)
    delays: {
        deliveryMinAdvance: 2,
        deliveryMaxAdvance: 720, // 30 jours
        serviceMinAdvance: 24,
        serviceMaxAdvance: 720,
        documentValidation: 48,
        paymentProcessing: 24,
    },
    // Limites
    limits: {
        maxDeliveriesPerDay: 10,
        maxBookingsPerDay: 5,
        maxNotificationsPerDay: 50,
        maxReferralsPerUser: 10,
        maxStorageBoxesPerUser: 3,
    },
};
