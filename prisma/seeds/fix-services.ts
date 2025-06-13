#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "./utils/seed-logger";
import { seedFixProviderServices } from "./services/fix-provider-services-seed";

async function main() {
  const prisma = new PrismaClient();
  const logger = new SeedLogger(true);

  try {
    logger.info(
      "MAIN",
      "🚀 Démarrage de la correction des services prestataires",
    );

    // Debug: vérifier les prestataires
    const providerCount = await prisma.provider.count();
    logger.info("MAIN", `📊 Prestataires trouvés: ${providerCount}`);

    const result = await seedFixProviderServices(prisma, logger, {
      force: true,
      verbose: true,
    });

    logger.success(
      "MAIN",
      `✅ Correction terminée: ${result.created} services créés, ${result.errors} erreurs`,
    );
  } catch (error: any) {
    logger.error("MAIN", `❌ Erreur lors de la correction: ${error.message}`);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
