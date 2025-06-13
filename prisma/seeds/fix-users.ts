#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./utils/seed-logger";
import { seedFixSpecializedUsers } from "./users/fix-specialized-users-seed";

async function main() {
  const prisma = new PrismaClient();
  const logger = new SeedLogger(true);

  try {
    logger.info(
      "MAIN",
      "🚀 Démarrage de la correction des utilisateurs spécialisés",
    );

    const result = await seedFixSpecializedUsers(prisma, logger, {
      force: true,
      verbose: true,
    });

    logger.success(
      "MAIN",
      `✅ Correction terminée: ${result.created} utilisateurs créés, ${result.errors} erreurs`,
    );
  } catch (error: any) {
    logger.error("MAIN", `❌ Erreur lors de la correction: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
