import { PrismaClient } from "@prisma/client";
import { seedConfig } from "./config/seed.config.js";
import { seedDependencies } from "./config/dependencies";

// Import des seeds individuels
import { cleanDatabase } from "./seeds/00-cleanup.seed";
import { seedUsers } from "./seeds/01-users.seed";
import { seedAuth } from "./seeds/02-auth.seed";
import { seedClient } from "./seeds/03-client.seed";
import { seedDeliverer } from "./seeds/04-deliverer.seed";
import { seedMerchant } from "./seeds/05-merchant.seed";
import { seedProviders } from "./seeds/06-provider.seed";
import { seedAdmin } from "./seeds/07-admin.seed";
import { seedAnnouncements } from "./seeds/08-announcement.seed";
import { seedDeliveries } from "./seeds/09-delivery.seed";
import { seedDeliveryValidations } from "./seeds/10a-delivery-validation.seed";
import { seedBookings } from "./seeds/10-booking.seed";
import { seedPayments } from "./seeds/11-payment.seed";
import { seedInvoices } from "./seeds/12-invoice.seed";
import { seedLocations } from "./seeds/13-location.seed";
import { seedDocuments } from "./seeds/14-document.seed";
import { seedNotifications } from "./seeds/15-notification.seed";
import { seedReviews } from "./seeds/16-review.seed";
import { seedContracts } from "./seeds/17-contract.seed";
import { seedTutorials } from "./seeds/18-tutorial.seed";
import { seedTracking } from "./seeds/19-tracking.seed";
import { seedSupport } from "./seeds/20-support.seed";
import { seedCertifications } from "./seeds/21-certifications.seed";
import { seedInsurance } from "./seeds/22-insurance.seed";
import { seedReferrals } from "./seeds/23-referral.seed";
import { seedDisputes } from "./seeds/24-disputes.seed";
import { seedAnalytics } from "./seeds/25-analytics.seed";

export const prisma = new PrismaClient({
  log:
    seedConfig.logLevel === "debug"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

export interface SeedContext {
  prisma: PrismaClient;
  config: typeof seedConfig;
  data: Map<string, any>;
}

export async function seedDatabase() {
  const context: SeedContext = {
    prisma,
    config: seedConfig,
    data: new Map(),
  };

  console.log("Starting EcoDeli database seed with configuration:", {
    environment: seedConfig.environment,
    cleanFirst: seedConfig.cleanFirst,
    seedTestScenarios: seedConfig.seedTestScenarios,
  });

  try {
    // 1. Nettoyage optionnel de la base
    if (seedConfig.cleanFirst) {
      console.log("Cleaning database...");
      await cleanDatabase(context);
    }

    // 2. Exécution des seeds dans l'ordre des dépendances
    for (const seed of seedDependencies) {
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
      } catch (error) {
        console.error(`Error in ${seed.name}:`, error);
        throw error;
      }
    }

    // 3. Génération du rapport
    if (seedConfig.generateReport) {
      await generateSeedReport(context);
    }

    // Injection d'une annonce pour un utilisateur client (utilise le premier client disponible)
    const firstClient = await context.prisma.user.findFirst({
      where: { role: "CLIENT" }
    });
    
    if (firstClient) {
      const { injectAnnouncementForUser } = await import("./seeds/08-announcement.seed");
      await injectAnnouncementForUser(context.prisma, firstClient.id);
    }

    console.log("\nDatabase seeding completed successfully!");

    // 4. Afficher les comptes de test créés
    displayTestAccounts(context);
  } catch (error) {
    console.error("Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function generateSeedReport(context: SeedContext) {
  console.log("\nGenerating seed report...");

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

  console.log("\nDatabase Summary:");
  Object.entries(counts).forEach(([table, count]) => {
    console.log(`   - ${table}: ${count} records`);
  });
}

function displayTestAccounts(context: SeedContext) {
  const users = context.data.get("users") || [];

  console.log("\nTest Accounts Created:");
  console.log("────────────────────────");
  console.log("All passwords: Test123!");
  console.log("");

  const usersByRole = users.reduce((acc: any, user: any) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {});

  Object.entries(usersByRole).forEach(([role, roleUsers]: [string, any]) => {
    console.log(`\n${role}:`);
    roleUsers.forEach((user: any) => {
      console.log(`   - ${user.email} (${user.name || "No name"})`);
    });
  });
}

// Function removed as emojis are no longer used
