"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.seedDatabase = seedDatabase;
const client_1 = require("@prisma/client");
const seed_config_1 = require("./config/seed.config");
const dependencies_1 = require("./config/dependencies");
// Import des seeds individuels
const _00_cleanup_seed_1 = require("./seeds/00-cleanup.seed");
exports.prisma = new client_1.PrismaClient({
    log: seed_config_1.seedConfig.logLevel === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
});
async function seedDatabase() {
    const context = {
        prisma: exports.prisma,
        config: seed_config_1.seedConfig,
        data: new Map()
    };
    console.log('Starting EcoDeli database seed with configuration:', {
        environment: seed_config_1.seedConfig.environment,
        cleanFirst: seed_config_1.seedConfig.cleanFirst,
        seedTestScenarios: seed_config_1.seedConfig.seedTestScenarios,
    });
    try {
        // 1. Nettoyage optionnel de la base
        if (seed_config_1.seedConfig.cleanFirst) {
            console.log('Cleaning database...');
            await (0, _00_cleanup_seed_1.cleanDatabase)(context);
        }
        // 2. Exécution des seeds dans l'ordre des dépendances
        for (const seed of dependencies_1.seedDependencies) {
            console.log(`\nRunning ${seed.name}...`);
            const startTime = Date.now();
            try {
                const result = await seed.fn(context);
                // Stocker les résultats pour les seeds suivants
                if (result) {
                    context.data.set(seed.name, result);
                }
                const duration = Date.now() - startTime;
                console.log(`${seed.name} completed in ${duration}ms`);
            }
            catch (error) {
                console.error(`Error in ${seed.name}:`, error);
                throw error;
            }
        }
        // 3. Génération du rapport
        if (seed_config_1.seedConfig.generateReport) {
            await generateSeedReport(context);
        }
        console.log('\nDatabase seeding completed successfully!');
        // 4. Afficher les comptes de test créés
        displayTestAccounts(context);
    }
    catch (error) {
        console.error('Seeding failed:', error);
        throw error;
    }
    finally {
        await exports.prisma.$disconnect();
    }
}
async function generateSeedReport(context) {
    console.log('\nGenerating seed report...');
    const counts = {
        users: await context.prisma.user.count(),
        announcements: await context.prisma.announcement.count(),
        deliveries: await context.prisma.delivery.count(),
        bookings: await context.prisma.booking.count(),
        payments: await context.prisma.payment.count(),
        invoices: await context.prisma.invoice.count(),
        reviews: await context.prisma.review.count(),
        notifications: await context.prisma.notification.count(),
    };
    console.log('\nDatabase Summary:');
    Object.entries(counts).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} records`);
    });
}
function displayTestAccounts(context) {
    const users = context.data.get('users') || [];
    console.log('\nTest Accounts Created:');
    console.log('────────────────────────');
    console.log('All passwords: Test123!');
    console.log('');
    const usersByRole = users.reduce((acc, user) => {
        if (!acc[user.role])
            acc[user.role] = [];
        acc[user.role].push(user);
        return acc;
    }, {});
    Object.entries(usersByRole).forEach(([role, roleUsers]) => {
        console.log(`\n${role}:`);
        roleUsers.forEach((user) => {
            console.log(`   - ${user.email} (${user.name || 'No name'})`);
        });
    });
}
// Function removed as emojis are no longer used 
