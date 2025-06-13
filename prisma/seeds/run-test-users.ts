#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./utils/seed-logger";
import {
  seedMultiVerificationUsers,
  validateMultiVerificationUsers,
} from "./users/multi-verification-users-seed";

/**
 * Script rapide pour créer des utilisateurs de test avec différents statuts
 * Utilisé pour tester les interfaces admin avec des données réalistes
 */

async function main() {
  const prisma = new PrismaClient();
  const logger = new SeedLogger(true); // verbose = true

  try {
    logger.info(
      "TEST_USERS",
      "🚀 Démarrage du seed des utilisateurs de test...",
    );

    // Options pour forcer la recréation
    const options = {
      force: true, // Supprime et recrée les utilisateurs de test
      verbose: true,
    };

    // Exécuter le seed
    const result = await seedMultiVerificationUsers(prisma, logger, options);

    // Validation
    const isValid = await validateMultiVerificationUsers(prisma, logger);

    // Résumé final
    if (isValid && result.errors === 0) {
      logger.info("TEST_USERS", "✅ Utilisateurs de test créés avec succès !");
      logger.info("TEST_USERS", "📋 Vous pouvez maintenant tester:");
      logger.info("TEST_USERS", "   - Interface admin clients");
      logger.info("TEST_USERS", "   - Interface admin utilisateurs");
      logger.info("TEST_USERS", "   - Vérification de documents");
      logger.info("TEST_USERS", "   - Différents statuts utilisateurs");
      logger.info("TEST_USERS", "");
      logger.info("TEST_USERS", "🔑 Comptes de test créés:");
      logger.info("TEST_USERS", "   📧 admin@test-ecodeli.fr (ADMIN)");
      logger.info(
        "TEST_USERS",
        "   📧 jean.dupont@test-ecodeli.fr (CLIENT ACTIF)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 marie.martin@test-ecodeli.fr (CLIENT EN ATTENTE)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 pierre.durand@test-ecodeli.fr (CLIENT SUSPENDU)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 antoine.livreur@test-ecodeli.fr (LIVREUR ACTIF)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 sophia.velo@test-ecodeli.fr (LIVREUR EN ATTENTE)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 boulangerie.martin@test-ecodeli.fr (MERCHANT ACTIF)",
      );
      logger.info(
        "TEST_USERS",
        "   📧 paul.plombier@test-ecodeli.fr (PROVIDER ACTIF)",
      );
      logger.info("TEST_USERS", "");
      logger.info("TEST_USERS", "🔒 Mot de passe pour tous: Test2024!");
    } else {
      logger.error(
        "TEST_USERS",
        "❌ Erreurs lors de la création des utilisateurs de test",
      );
      process.exit(1);
    }
  } catch (error) {
    logger.error("TEST_USERS", `❌ Erreur fatale: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Point d'entrée
main().catch((error) => {
  console.error("❌ Erreur lors de l'exécution du script:", error);
  process.exit(1);
});
