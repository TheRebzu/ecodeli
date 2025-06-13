import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import { SeedResult, SeedOptions } from "../utils/seed-helpers";

/**
 * Seed de correction pour créer les utilisateurs spécialisés manquants
 * Utilise les utilisateurs existants dans la table users pour remplir les tables spécialisées
 */
export async function seedFixSpecializedUsers(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  try {
    logger.info("SEED", "🚀 Démarrage du seed: FIX_SPECIALIZED_USERS");

    let totalCreated = 0;
    let totalErrors = 0;

    // Récupérer tous les utilisateurs par rôle
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    });

    logger.info(
      "FIX_SPECIALIZED_USERS",
      `📊 Utilisateurs par rôle: ${JSON.stringify(usersByRole)}`,
    );

    // 1. Créer les admins
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
    });

    for (const user of adminUsers) {
      try {
        await prisma.admin.create({
          data: {
            userId: user.id,
            permissions: [
              "MANAGE_USERS",
              "MANAGE_CONTENT",
              "MANAGE_SETTINGS",
              "VIEW_ANALYTICS",
            ],
            department: "Administration",
          },
        });
        totalCreated++;
        logger.info("FIX_SPECIALIZED_USERS", `✅ Admin créé: ${user.name}`);
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          totalErrors++;
          logger.error(
            "FIX_SPECIALIZED_USERS",
            `❌ Erreur admin ${user.name}: ${error.message}`,
          );
        }
      }
    }

    // 2. Créer les clients
    const clientUsers = await prisma.user.findMany({
      where: { role: "CLIENT" },
    });

    for (const user of clientUsers) {
      try {
        await prisma.client.create({
          data: {
            userId: user.id,
            preferredLanguage: "fr",
            phone: user.phoneNumber || "0100000000",
            address: `Adresse de ${user.name}`,
            city: "Paris",
            postalCode: "75001",
            country: "France",
          },
        });
        totalCreated++;
        logger.info("FIX_SPECIALIZED_USERS", `✅ Client créé: ${user.name}`);
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          totalErrors++;
          logger.error(
            "FIX_SPECIALIZED_USERS",
            `❌ Erreur client ${user.name}: ${error.message}`,
          );
        }
      }
    }

    // 3. Créer les livreurs
    const delivererUsers = await prisma.user.findMany({
      where: { role: "DELIVERER" },
    });

    for (const user of delivererUsers) {
      try {
        await prisma.deliverer.create({
          data: {
            userId: user.id,
            phone: user.phoneNumber || "0100000000",
            vehicleType: ["BIKE", "SCOOTER", "CAR", "VAN"][
              Math.floor(Math.random() * 4)
            ],
            licensePlate: `${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            isVerified: Math.random() > 0.3, // 70% des livreurs vérifiés
            maxCapacity: parseFloat((50 + Math.random() * 100).toFixed(1)), // 50-150 kg
            isActive: Math.random() > 0.2, // 80% actifs
            rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)), // 3.5-5.0
            address: `Adresse de ${user.name}`,
            bio: `Livreur professionnel - ${user.name}`,
            yearsOfExperience: Math.floor(Math.random() * 10) + 1,
          },
        });
        totalCreated++;
        logger.info("FIX_SPECIALIZED_USERS", `✅ Livreur créé: ${user.name}`);
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          totalErrors++;
          logger.error(
            "FIX_SPECIALIZED_USERS",
            `❌ Erreur livreur ${user.name}: ${error.message}`,
          );
        }
      }
    }

    // 4. Créer les commerçants
    const merchantUsers = await prisma.user.findMany({
      where: { role: "MERCHANT" },
    });

    for (const user of merchantUsers) {
      try {
        await prisma.merchant.create({
          data: {
            userId: user.id,
            companyName: `Commerce ${user.name}`,
            businessName: `Entreprise ${user.name}`,
            address: `Adresse commerciale de ${user.name}`,
            phone: user.phoneNumber || "0100000000",
            businessType: ["RESTAURANT", "RETAIL", "PHARMACY", "SUPERMARKET"][
              Math.floor(Math.random() * 4)
            ],
            businessCity: "Paris",
            businessPostal: "75001",
            businessCountry: "France",
            isVerified: Math.random() > 0.4, // 60% des commerçants vérifiés
            description: `Commerce proposé par ${user.name}`,
            foundingYear: 2020 + Math.floor(Math.random() * 5), // 2020-2024
            employeeCount: Math.floor(Math.random() * 50) + 1, // 1-50 employés
          },
        });
        totalCreated++;
        logger.info(
          "FIX_SPECIALIZED_USERS",
          `✅ Commerçant créé: ${user.name}`,
        );
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          totalErrors++;
          logger.error(
            "FIX_SPECIALIZED_USERS",
            `❌ Erreur commerçant ${user.name}: ${error.message}`,
          );
        }
      }
    }

    // 5. Créer les prestataires
    const providerUsers = await prisma.user.findMany({
      where: { role: "PROVIDER" },
    });

    for (const user of providerUsers) {
      try {
        await prisma.provider.create({
          data: {
            userId: user.id,
            companyName: `Services ${user.name}`,
            address: `Adresse de service de ${user.name}`,
            phone: user.phoneNumber || "0100000000",
            services: ["Nettoyage", "Jardinage", "Bricolage"].slice(
              0,
              Math.floor(Math.random() * 3) + 1,
            ),
            isVerified: Math.random() > 0.4, // 60% des prestataires vérifiés
            rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)), // 3.5-5.0
            serviceType: ["PLUMBING", "ELECTRICITY", "CLEANING", "GARDENING"][
              Math.floor(Math.random() * 4)
            ],
            description: `Prestataire de services professionnels - ${user.name}`,
            professionalBio: `Expert en services avec plusieurs années d'expérience - ${user.name}`,
            serviceRadius: Math.floor(Math.random() * 20) + 5, // 5-25 km
            yearsInBusiness: Math.floor(Math.random() * 15) + 1, // 1-15 ans
            languages: ["fr", "en"].slice(0, Math.floor(Math.random() * 2) + 1),
          },
        });
        totalCreated++;
        logger.info(
          "FIX_SPECIALIZED_USERS",
          `✅ Prestataire créé: ${user.name}`,
        );
      } catch (error: any) {
        if (!error.message.includes("Unique constraint")) {
          totalErrors++;
          logger.error(
            "FIX_SPECIALIZED_USERS",
            `❌ Erreur prestataire ${user.name}: ${error.message}`,
          );
        }
      }
    }

    // Validation finale
    const finalCounts = {
      admins: await prisma.admin.count(),
      clients: await prisma.client.count(),
      deliverers: await prisma.deliverer.count(),
      merchants: await prisma.merchant.count(),
      providers: await prisma.provider.count(),
    };

    logger.info(
      "FIX_SPECIALIZED_USERS",
      `📊 Utilisateurs spécialisés créés: ${JSON.stringify(finalCounts)}`,
    );
    logger.success(
      "FIX_SPECIALIZED_USERS",
      `✅ Total créé: ${totalCreated}, Erreurs: ${totalErrors}`,
    );

    return {
      entity: "fix_specialized_users",
      created: totalCreated,
      skipped: 0,
      errors: totalErrors,
    };
  } catch (error: any) {
    logger.error(
      "FIX_SPECIALIZED_USERS",
      `❌ Erreur dans seedFixSpecializedUsers: ${error.message}`,
    );
    throw error;
  }
}
