"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedConfig = void 0;
exports.seedConfig = {
    // Environnement
    environment: process.env.NODE_ENV || 'development',
    // Options de seed
    cleanFirst: process.env.SEED_CLEAN_FIRST === 'true' || true,
    seedTestScenarios: process.env.SEED_TEST_SCENARIOS === 'true' || true,
    generateReport: process.env.SEED_GENERATE_REPORT === 'true' || true,
    // Logging
    logLevel: process.env.SEED_LOG_LEVEL || 'info',
    // Nombre d'enregistrements par type
    counts: {
        usersPerRole: parseInt(process.env.SEED_USERS_PER_ROLE || '5'),
        announcements: parseInt(process.env.SEED_ANNOUNCEMENTS || '50'),
        deliveries: parseInt(process.env.SEED_DELIVERIES || '30'),
        bookings: parseInt(process.env.SEED_BOOKINGS || '20'),
        reviews: parseInt(process.env.SEED_REVIEWS || '40'),
        notifications: parseInt(process.env.SEED_NOTIFICATIONS || '100'),
        supportTickets: parseInt(process.env.SEED_SUPPORT_TICKETS || '15'),
    },
    // Configuration temporelle
    timeRange: {
        // Données historiques sur 3 mois
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
    },
    // Configuration géographique
    cities: ['Paris', 'Marseille', 'Lyon', 'Lille', 'Rennes', 'Montpellier'],
    // Mots de passe par défaut
    defaultPassword: 'Test123!',
    // Chemins des fichiers
    paths: {
        uploads: process.env.UPLOAD_PATH || '/uploads',
        documents: process.env.DOCUMENTS_PATH || '/uploads/documents',
        invoices: process.env.INVOICES_PATH || '/uploads/invoices',
    },
    // Configuration Stripe (test mode)
    stripe: {
        testMode: true,
        testSecretKey: process.env.STRIPE_TEST_SECRET_KEY || 'sk_test_placeholder',
        testPublishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || 'pk_test_placeholder',
    },
    // Configuration OneSignal (test mode)
    oneSignal: {
        testMode: true,
        appId: process.env.ONESIGNAL_APP_ID || 'test_app_id',
        apiKey: process.env.ONESIGNAL_API_KEY || 'test_api_key',
    },
    // Configuration PDF
    pdf: {
        generateReal: process.env.GENERATE_REAL_PDFS === 'true' || false,
        templatePath: '/templates/pdf',
    },
    // Test scenarios
    scenarios: {
        completedDelivery: true,
        ongoingService: true,
        disputeResolution: true,
        monthlyBilling: true,
        referralSuccess: true,
    },
};
