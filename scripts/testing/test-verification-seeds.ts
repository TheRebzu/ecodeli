#!/usr/bin/env tsx

/**
 * Script de test des seeds de vérification documentaire EcoDeli
 * Usage: pnpm exec tsx scripts/test-verification-seeds.ts
 */

import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "../prisma/seeds/utils/seed-logger";

const prisma = new PrismaClient();
const logger = new SeedLogger();

async function main() {
  logger.info(
    "TEST_VERIFICATION_SEEDS",
    "🚀 Test des seeds de vérification documentaire",
  );

  try {
    // Test 1: Vérifier les documents livreurs
    logger.info("TEST", "📋 Test des documents livreurs...");
    const delivererDocs = await prisma.document.findMany({
      where: { userRole: "DELIVERER" },
      include: { user: true },
    });
    logger.success(
      "TEST",
      `✅ ${delivererDocs.length} documents livreurs trouvés`,
    );

    // Test 2: Vérifier les documents prestataires
    logger.info("TEST", "📋 Test des documents prestataires...");
    const providerDocs = await prisma.document.findMany({
      where: { userRole: "PROVIDER" },
      include: { user: true },
    });
    logger.success(
      "TEST",
      `✅ ${providerDocs.length} documents prestataires trouvés`,
    );

    // Test 3: Vérifier les documents commerçants
    logger.info("TEST", "📋 Test des documents commerçants...");
    const merchantDocs = await prisma.document.findMany({
      where: { userRole: "MERCHANT" },
      include: { user: true },
    });
    logger.success(
      "TEST",
      `✅ ${merchantDocs.length} documents commerçants trouvés`,
    );

    // Test 4: Vérifier les états de vérification
    logger.info("TEST", "📊 Test des états de vérification...");
    const verifications = await prisma.verification.findMany({
      include: { document: true, submitter: true, verifier: true },
    });
    logger.success("TEST", `✅ ${verifications.length} vérifications trouvées`);

    // Test 5: Vérifier l'historique (si disponible)
    logger.info("TEST", "📜 Test de l'historique de vérification...");
    const history = await prisma.verificationHistory.findMany({
      include: { document: true, user: true },
    });

    if (history.length > 0) {
      logger.success(
        "TEST",
        `✅ ${history.length} entrées d'historique trouvées`,
      );
    } else {
      logger.warning(
        "TEST",
        "⚠️ Aucune entrée d'historique trouvée (erreurs TypeScript à corriger)",
      );
    }

    // Statistiques détaillées
    logger.info("STATISTICS", "📊 Statistiques des documents de vérification");

    // Par rôle
    const docsByRole = await prisma.document.groupBy({
      by: ["userRole"],
      _count: { id: true },
    });

    docsByRole.forEach((group) => {
      logger.info(
        "STATS",
        `👥 ${group.userRole}: ${group._count.id} documents`,
      );
    });

    // Par statut de vérification
    const docsByStatus = await prisma.document.groupBy({
      by: ["verificationStatus"],
      _count: { id: true },
    });

    docsByStatus.forEach((group) => {
      logger.info(
        "STATS",
        `📊 ${group.verificationStatus}: ${group._count.id} documents`,
      );
    });

    // Par type de document
    const docsByType = await prisma.document.groupBy({
      by: ["type"],
      _count: { id: true },
    });

    docsByType.forEach((group) => {
      logger.info("STATS", `📄 ${group.type}: ${group._count.id} documents`);
    });

    // Vérifications par statut
    const verificationsByStatus = await prisma.verification.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    verificationsByStatus.forEach((group) => {
      logger.info(
        "STATS",
        `🔍 Vérifications ${group.status}: ${group._count.id}`,
      );
    });

    // Calcul des taux
    const totalDocs =
      delivererDocs.length + providerDocs.length + merchantDocs.length;
    const approvedDocs = await prisma.document.count({
      where: { verificationStatus: "APPROVED" },
    });
    const rejectedDocs = await prisma.document.count({
      where: { verificationStatus: "REJECTED" },
    });
    const pendingDocs = await prisma.document.count({
      where: { verificationStatus: "PENDING" },
    });

    const approvalRate = Math.round((approvedDocs / totalDocs) * 100);
    const rejectionRate = Math.round((rejectedDocs / totalDocs) * 100);
    const pendingRate = Math.round((pendingDocs / totalDocs) * 100);

    logger.info("RATES", "📈 Taux de traitement des documents");
    logger.info(
      "RATES",
      `✅ Approbation: ${approvalRate}% (${approvedDocs}/${totalDocs})`,
    );
    logger.info(
      "RATES",
      `❌ Rejet: ${rejectionRate}% (${rejectedDocs}/${totalDocs})`,
    );
    logger.info(
      "RATES",
      `⏳ En attente: ${pendingRate}% (${pendingDocs}/${totalDocs})`,
    );

    // Test d'intégrité des données
    logger.info("INTEGRITY", "🔍 Tests d'intégrité des données");

    // Vérifier que tous les documents ont des utilisateurs valides
    const docsWithoutUsers = await prisma.document.findMany({
      where: { user: { is: null } },
    });

    if (docsWithoutUsers.length === 0) {
      logger.success(
        "INTEGRITY",
        "✅ Tous les documents ont des utilisateurs associés",
      );
    } else {
      logger.error(
        "INTEGRITY",
        `❌ ${docsWithoutUsers.length} documents sans utilisateur`,
      );
    }

    // Vérifier que toutes les vérifications ont des documents
    const verificationsWithoutDocs = await prisma.verification.findMany({
      where: { document: { is: null } },
    });

    if (verificationsWithoutDocs.length === 0) {
      logger.success(
        "INTEGRITY",
        "✅ Toutes les vérifications ont des documents associés",
      );
    } else {
      logger.error(
        "INTEGRITY",
        `❌ ${verificationsWithoutDocs.length} vérifications sans document`,
      );
    }

    // Vérifier la cohérence des dates
    const docsWithInvalidDates = await prisma.document.findMany({
      where: {
        expiryDate: { lt: new Date() },
        verificationStatus: "APPROVED",
      },
    });

    if (docsWithInvalidDates.length === 0) {
      logger.success("INTEGRITY", "✅ Aucun document approuvé expiré détecté");
    } else {
      logger.warning(
        "INTEGRITY",
        `⚠️ ${docsWithInvalidDates.length} documents approuvés mais expirés`,
      );
    }

    logger.success(
      "TEST_VERIFICATION_SEEDS",
      "✅ Tous les tests de vérification sont terminés",
    );
  } catch (error: any) {
    logger.error(
      "TEST_VERIFICATION_SEEDS",
      `❌ Erreur lors des tests: ${error.message}`,
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  logger.error("MAIN", `❌ Erreur fatale: ${error.message}`);
  process.exit(1);
});
