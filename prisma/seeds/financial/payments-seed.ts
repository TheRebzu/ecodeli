import { PrismaClient, UserRole, PaymentStatus } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un paiement
 */
interface PaymentData {
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  userId: string;
  serviceType: string;
  commissionAmount: number;
  taxAmount: number;
}

/**
 * Seed des paiements EcoDeli
 * Crée des paiements Stripe avec différents statuts et méthodes
 */
export async function seedPayments(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("PAYMENTS");

  const result: SeedResult = {
    entity: "payments",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les utilisateurs clients (qui effectuent des paiements)
  const clients = await prisma.user.findMany({
    where: {
      role: UserRole.CLIENT,
      status: "ACTIVE",
    },
  });

  if (clients.length === 0) {
    logger.warning(
      "PAYMENTS",
      "Aucun client trouvé - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Trouver Jean Dupont et son annonce pour créer le paiement spécifique
  const jeanDupont = await prisma.user.findUnique({
    where: { email: "jean.dupont@orange.fr" },
  });

  const jeanAnnouncement = await prisma.announcement.findFirst({
    where: {
      clientId: jeanDupont?.id,
      title: {
        contains: "Livraison urgente d'un ordinateur portable vers Marseille",
      },
    },
  });

  const jeanDelivery = await prisma.delivery.findFirst({
    where: {
      announcementId: jeanAnnouncement?.id,
      clientId: jeanDupont?.id,
      trackingCode: "ECO-2024-PAR-MAR-001",
    },
  });

  // Vérifier si des paiements existent déjà
  const existingPayments = await prisma.payment.count();

  if (existingPayments > 0 && !options.force) {
    logger.warning(
      "PAYMENTS",
      `${existingPayments} paiements déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingPayments;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.payment.deleteMany({});
    logger.database("NETTOYAGE", "payments", 0);
  }

  // 1. CRÉER LE PAIEMENT SPÉCIFIQUE DE JEAN DUPONT
  if (jeanDupont && jeanDelivery) {
    try {
      logger.progress(
        "PAYMENTS",
        1,
        1,
        "Création paiement Jean Dupont - Livraison Marseille",
      );

      const baseAmount = 45.0; // Prix de la livraison
      const commissionRate = 0.1; // 10% de commission EcoDeli
      const commissionAmount =
        Math.round(baseAmount * commissionRate * 100) / 100; // 4.50€
      const totalAmount = baseAmount + commissionAmount; // 49.50€

      await prisma.payment.create({
        data: {
          amount: totalAmount,
          currency: "EUR",
          status: PaymentStatus.COMPLETED,
          description:
            "Livraison urgente ordinateur portable Paris → Marseille",
          userId: jeanDupont.id,
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          commissionAmount: commissionAmount,
          taxAmount: 0,
          taxRate: 0,
          paymentMethodType: "card",
          paymentProvider: "STRIPE",
          createdAt: getRandomDate(3, 4),
          updatedAt: new Date(),
        },
      });

      result.created++;
      logger.success(
        "PAYMENTS",
        "✅ Paiement spécifique Jean Dupont créé (49.50€)",
      );
    } catch (error: any) {
      logger.error(
        "PAYMENTS",
        `❌ Erreur création paiement Jean Dupont: ${error.message}`,
      );
      result.errors++;
    }
  }

  // 2. CRÉER L'HISTORIQUE DE PAIEMENTS DE MARIE LAURENT (3 livraisons)
  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
  });

  const marieHistoricalDeliveries = await prisma.delivery.findMany({
    where: {
      delivererId: marieLaurent?.id,
      status: "DELIVERED",
      trackingCode: {
        in: [
          "ECO-2024-PAR-LYO-847",
          "ECO-2024-TOU-PAR-623",
          "ECO-2024-MAR-NIC-391",
        ],
      },
    },
    include: { announcement: true, client: true },
  });

  for (const delivery of marieHistoricalDeliveries) {
    try {
      logger.progress(
        "PAYMENTS",
        result.created + 1,
        result.created + marieHistoricalDeliveries.length + 1,
        `Création paiement historique ${delivery.trackingCode}`,
      );

      const baseAmount = delivery.price; // Prix de la livraison
      const commissionRate = 0.1; // 10% de commission
      const commissionAmount =
        Math.round(baseAmount * commissionRate * 100) / 100;
      const totalAmount = baseAmount + commissionAmount;

      await prisma.payment.create({
        data: {
          amount: totalAmount,
          currency: "EUR",
          status: PaymentStatus.COMPLETED,
          description: `Livraison ${delivery.trackingCode} par Marie Laurent`,
          userId: delivery.clientId,
          stripePaymentId: `pi_${faker.string.alphanumeric(24)}`,
          paymentIntentId: `pi_${faker.string.alphanumeric(24)}`,
          commissionAmount: commissionAmount,
          taxAmount: 0,
          taxRate: 0,
          paymentMethodType: "card",
          paymentProvider: "STRIPE",
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt,
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "PAYMENTS",
        `❌ Erreur création paiement ${delivery.trackingCode}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des paiements créés
  const finalPayments = await prisma.payment.findMany({
    include: { user: true },
  });

  if (finalPayments.length >= result.created - result.errors) {
    logger.validation(
      "PAYMENTS",
      "PASSED",
      `${finalPayments.length} paiements créés avec succès`,
    );
  } else {
    logger.validation(
      "PAYMENTS",
      "FAILED",
      `Attendu: ${result.created}, Créé: ${finalPayments.length}`,
    );
  }

  // Statistiques par statut
  const byStatus = finalPayments.reduce(
    (acc: Record<string, number>, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "PAYMENTS",
    `📊 Paiements par statut: ${JSON.stringify(byStatus)}`,
  );

  // Statistiques financières
  const totalRevenue = finalPayments
    .filter((p) => p.status === PaymentStatus.COMPLETED)
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0);

  const totalCommissions = finalPayments
    .filter((p) => p.status === PaymentStatus.COMPLETED && p.commissionAmount)
    .reduce(
      (sum, payment) =>
        sum + parseFloat(payment.commissionAmount?.toString() || "0"),
      0,
    );

  logger.info(
    "PAYMENTS",
    `💰 Chiffre d'affaires: ${totalRevenue.toFixed(2)} EUR`,
  );
  logger.info(
    "PAYMENTS",
    `💼 Commissions totales: ${totalCommissions.toFixed(2)} EUR`,
  );

  // Taux de réussite
  const successfulPayments = finalPayments.filter(
    (p) => p.status === PaymentStatus.COMPLETED,
  );
  const successRate = Math.round(
    (successfulPayments.length / finalPayments.length) * 100,
  );
  logger.info(
    "PAYMENTS",
    `✅ Taux de réussite: ${successRate}% (${successfulPayments.length}/${finalPayments.length})`,
  );

  // Répartition par méthode de paiement
  const byPaymentMethod = finalPayments.reduce(
    (acc: Record<string, number>, payment) => {
      const method = payment.paymentMethodType || "unknown";
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "PAYMENTS",
    `💳 Méthodes de paiement: ${JSON.stringify(byPaymentMethod)}`,
  );

  // Montant moyen par transaction
  const avgAmount = totalRevenue / successfulPayments.length;
  logger.info("PAYMENTS", `📈 Montant moyen: ${avgAmount.toFixed(2)} EUR`);

  logger.endSeed("PAYMENTS", result);
  return result;
}
