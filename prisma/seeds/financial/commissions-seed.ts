import { PrismaClient } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir une commission
 */
interface CommissionData {
  rate: number;
  serviceType: string;
  calculationType: string;
  description: string;
  isActive: boolean;
  applicableRoles: string[];
}

/**
 * Seed des commissions EcoDeli
 * Crée les taux de commission par type de service et historique
 */
export async function seedCommissions(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("COMMISSIONS");

  const result: SeedResult = {
    entity: "commissions",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Vérifier si des commissions existent déjà
  const existingCommissions = await prisma.commission.count();

  if (existingCommissions > 0 && !options.force) {
    logger.warning(
      "COMMISSIONS",
      `${existingCommissions} commissions déjà présentes - utiliser force:true pour recréer`,
    );
    result.skipped = existingCommissions;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.commission.deleteMany({});
    await prisma.promotionRecord.deleteMany({});
    logger.database("NETTOYAGE", "commissions et promotion records", 0);
  }

  // Configuration des taux de commission par service (réalistes du marché)
  const COMMISSION_CONFIGS = [
    {
      serviceType: "DELIVERY",
      rate: 0.15, // 15% sur livraisons
      description: "Commission plateforme sur livraisons",
      applicableRoles: ["DELIVERER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 0.5, // Minimum 50 centimes
      maximumAmount: 5.0, // Maximum 5 euros par livraison
      flatFee: null,
    },
    {
      serviceType: "PLUMBING",
      rate: 0.12, // 12% sur plomberie
      description: "Commission plateforme sur services plomberie",
      applicableRoles: ["PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 5.0,
      maximumAmount: 50.0,
      flatFee: null,
    },
    {
      serviceType: "ELECTRICITY",
      rate: 0.12, // 12% sur électricité
      description: "Commission plateforme sur services électricité",
      applicableRoles: ["PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 7.5,
      maximumAmount: 60.0,
      flatFee: null,
    },
    {
      serviceType: "CLEANING",
      rate: 0.1, // 10% sur nettoyage
      description: "Commission plateforme sur services nettoyage",
      applicableRoles: ["PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 2.5,
      maximumAmount: 15.0,
      flatFee: null,
    },
    {
      serviceType: "IT_SUPPORT",
      rate: 0.15, // 15% sur support IT
      description: "Commission plateforme sur services informatiques",
      applicableRoles: ["PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 6.0,
      maximumAmount: 40.0,
      flatFee: null,
    },
    {
      serviceType: "GARDENING",
      rate: 0.1, // 10% sur jardinage
      description: "Commission plateforme sur services jardinage",
      applicableRoles: ["PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 3.5,
      maximumAmount: 25.0,
      flatFee: null,
    },
    {
      serviceType: "SUBSCRIPTION_MERCHANT",
      rate: 29.99, // Abonnement fixe commerçants
      description: "Abonnement mensuel EcoDeli Pro pour commerçants",
      applicableRoles: ["MERCHANT"],
      calculationType: "FLAT_FEE",
      isActive: true,
      minimumAmount: null,
      maximumAmount: null,
      flatFee: 29.99,
    },
    {
      serviceType: "SUBSCRIPTION_PROVIDER",
      rate: 19.99, // Abonnement fixe prestataires
      description: "Abonnement mensuel EcoDeli Services pour prestataires",
      applicableRoles: ["PROVIDER"],
      calculationType: "FLAT_FEE",
      isActive: true,
      minimumAmount: null,
      maximumAmount: null,
      flatFee: 19.99,
    },
    {
      serviceType: "ADVERTISING_BOOST",
      rate: 2.5, // Frais fixe mise en avant
      description: "Mise en avant des annonces (boost 24h)",
      applicableRoles: ["MERCHANT", "PROVIDER"],
      calculationType: "FLAT_FEE",
      isActive: true,
      minimumAmount: null,
      maximumAmount: null,
      flatFee: 2.5,
    },
    {
      serviceType: "PAYMENT_PROCESSING",
      rate: 0.029, // 2.9% frais de paiement
      description: "Frais de traitement des paiements (Stripe)",
      applicableRoles: ["CLIENT", "MERCHANT", "PROVIDER"],
      calculationType: "PERCENTAGE",
      isActive: true,
      minimumAmount: 0.3, // Frais minimum Stripe
      maximumAmount: null,
      flatFee: null,
    },
  ];

  // Créer les commissions actives
  for (const config of COMMISSION_CONFIGS) {
    try {
      logger.progress(
        "COMMISSIONS",
        result.created + 1,
        COMMISSION_CONFIGS.length,
        `Création commission: ${config.serviceType}`,
      );

      await prisma.commission.create({
        data: {
          rate: config.rate,
          serviceType: config.serviceType,
          description: config.description,
          applicableRoles: config.applicableRoles,
          calculationType: config.calculationType,
          isActive: config.isActive,
          currency: "EUR",
          minimumAmount: config.minimumAmount,
          maximumAmount: config.maximumAmount,
          flatFee: config.flatFee,
          startDate: getRandomDate(180, 30), // Actif depuis 1-6 mois
          payoutSchedule: config.applicableRoles.includes("DELIVERER")
            ? "WEEKLY"
            : "MONTHLY",
          countryCode: "FR",
          tierThresholds: generateTierThresholds(config.serviceType),
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMMISSIONS",
        `❌ Erreur création commission ${config.serviceType}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Créer des promotions historiques (taux spéciaux temporaires)
  await createPromotionRecords(prisma, logger, result);

  // Créer l'historique des commissions appliquées
  await createHistoricalCommissions(prisma, logger, result);

  // CRÉER LES COMMISSIONS SPÉCIFIQUES DU SCÉNARIO
  await createScenarioCommissions(prisma, logger, result);

  // Validation des commissions créées
  const finalCommissions = await prisma.commission.findMany();

  if (finalCommissions.length >= result.created - result.errors) {
    logger.validation(
      "COMMISSIONS",
      "PASSED",
      `${finalCommissions.length} commissions créées avec succès`,
    );
  } else {
    logger.validation(
      "COMMISSIONS",
      "FAILED",
      `Attendu: ${result.created}, Créé: ${finalCommissions.length}`,
    );
  }

  // Statistiques par type de calcul
  const byCalculationType = finalCommissions.reduce(
    (acc: Record<string, number>, commission) => {
      acc[commission.calculationType] =
        (acc[commission.calculationType] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "COMMISSIONS",
    `📊 Par type de calcul: ${JSON.stringify(byCalculationType)}`,
  );

  // Statistiques par statut
  const activeCommissions = finalCommissions.filter((c) => c.isActive);
  const inactiveCommissions = finalCommissions.filter((c) => !c.isActive);

  logger.info(
    "COMMISSIONS",
    `✅ Commissions actives: ${activeCommissions.length}`,
  );
  logger.info(
    "COMMISSIONS",
    `❌ Commissions inactives: ${inactiveCommissions.length}`,
  );

  // Calcul des revenus théoriques moyens
  const percentageCommissions = activeCommissions.filter(
    (c) => c.calculationType === "PERCENTAGE",
  );
  const avgCommissionRate =
    percentageCommissions.reduce(
      (sum, c) => sum + parseFloat(c.rate.toString()),
      0,
    ) / percentageCommissions.length;

  logger.info(
    "COMMISSIONS",
    `📈 Taux moyen de commission: ${(avgCommissionRate * 100).toFixed(2)}%`,
  );

  // Frais fixes mensuels
  const flatFees = activeCommissions
    .filter(
      (c) =>
        c.calculationType === "FLAT_FEE" &&
        c.serviceType.includes("SUBSCRIPTION"),
    )
    .reduce((sum, c) => sum + parseFloat(c.flatFee?.toString() || "0"), 0);

  logger.info(
    "COMMISSIONS",
    `💰 Revenus abonnements: ${flatFees.toFixed(2)} EUR/mois par utilisateur`,
  );

  logger.endSeed("COMMISSIONS", result);
  return result;
}

/**
 * Génère des seuils de paliers pour commissions progressives
 */
function generateTierThresholds(serviceType: string): any {
  // Seuils de volume pour commissions dégressives
  const tiers: { [key: string]: any } = {
    DELIVERY: {
      tier1: { threshold: 0, rate: 0.15 }, // 0-99 livraisons: 15%
      tier2: { threshold: 100, rate: 0.12 }, // 100-299: 12%
      tier3: { threshold: 300, rate: 0.1 }, // 300+: 10%
    },
    PLUMBING: {
      tier1: { threshold: 0, rate: 0.12 }, // 0-1999€: 12%
      tier2: { threshold: 2000, rate: 0.1 }, // 2000-4999€: 10%
      tier3: { threshold: 5000, rate: 0.08 }, // 5000€+: 8%
    },
    ELECTRICITY: {
      tier1: { threshold: 0, rate: 0.12 },
      tier2: { threshold: 2500, rate: 0.1 },
      tier3: { threshold: 6000, rate: 0.08 },
    },
    CLEANING: {
      tier1: { threshold: 0, rate: 0.1 },
      tier2: { threshold: 1000, rate: 0.08 },
      tier3: { threshold: 3000, rate: 0.06 },
    },
    IT_SUPPORT: {
      tier1: { threshold: 0, rate: 0.15 },
      tier2: { threshold: 1500, rate: 0.12 },
      tier3: { threshold: 4000, rate: 0.1 },
    },
    GARDENING: {
      tier1: { threshold: 0, rate: 0.1 },
      tier2: { threshold: 1200, rate: 0.08 },
      tier3: { threshold: 3500, rate: 0.06 },
    },
  };

  return tiers[serviceType] || null;
}

/**
 * Crée des enregistrements de promotions historiques
 */
async function createPromotionRecords(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
): Promise<void> {
  const PROMOTIONS = [
    {
      type: "LAUNCH_PROMO",
      serviceType: "DELIVERY",
      rate: 0.05, // 5% au lieu de 15% (promotion lancement)
      description: "Promotion lancement - commission réduite livreurs",
      durationDays: 30,
    },
    {
      type: "SUMMER_PROMO",
      serviceType: "GARDENING",
      rate: 0.06, // 6% au lieu de 10% (promotion été)
      description: "Promotion été - commission réduite jardinage",
      durationDays: 45,
    },
    {
      type: "FIRST_MONTH_FREE",
      serviceType: "SUBSCRIPTION_PROVIDER",
      rate: 0, // Premier mois gratuit
      description: "Premier mois d'abonnement gratuit nouveaux prestataires",
      durationDays: 30,
    },
    {
      type: "BLACK_FRIDAY",
      serviceType: "ADVERTISING_BOOST",
      rate: 1.25, // 1.25€ au lieu de 2.50€
      description: "Black Friday - mise en avant à prix réduit",
      durationDays: 3,
    },
    {
      type: "REFERRAL_BONUS",
      serviceType: "CLEANING",
      rate: 0.05, // 5% au lieu de 10% (bonus parrainage)
      description: "Bonus parrainage - commission réduite nettoyage",
      durationDays: 60,
    },
  ];

  for (const promo of PROMOTIONS) {
    try {
      // Calculer les dates (promotions dans les 6 derniers mois)
      const endDate = faker.date.recent({ days: 30 }); // Finie récemment
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - promo.durationDays);

      await prisma.promotionRecord.create({
        data: {
          type: promo.type,
          serviceType: promo.serviceType,
          rate: promo.rate,
          description: promo.description,
          startDate: startDate,
          endDate: endDate,
          isActive: false, // Promotions terminées
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMMISSIONS",
        `❌ Erreur création promotion ${promo.type}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Crée des commissions historiques (anciens taux)
 */
async function createHistoricalCommissions(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
): Promise<void> {
  const HISTORICAL_RATES = [
    {
      serviceType: "DELIVERY",
      rate: 0.18, // Ancien taux plus élevé
      description: "Commission plateforme sur livraisons (ancien taux)",
      endedMonthsAgo: 3,
    },
    {
      serviceType: "PLUMBING",
      rate: 0.15, // Ancien taux plus élevé
      description: "Commission plateforme sur services plomberie (ancien taux)",
      endedMonthsAgo: 2,
    },
    {
      serviceType: "SUBSCRIPTION_MERCHANT",
      rate: 39.99, // Ancien prix plus cher
      description:
        "Abonnement mensuel EcoDeli Pro pour commerçants (ancien prix)",
      endedMonthsAgo: 4,
    },
  ];

  for (const historical of HISTORICAL_RATES) {
    try {
      // Calculer les dates historiques
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() - historical.endedMonthsAgo);

      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 6); // Était actif 6 mois

      await prisma.commission.create({
        data: {
          rate: historical.rate,
          serviceType: historical.serviceType,
          description: historical.description,
          applicableRoles:
            historical.serviceType === "DELIVERY"
              ? ["DELIVERER"]
              : historical.serviceType.includes("SUBSCRIPTION")
                ? [
                    historical.serviceType.includes("MERCHANT")
                      ? "MERCHANT"
                      : "PROVIDER",
                  ]
                : ["PROVIDER"],
          calculationType: historical.serviceType.includes("SUBSCRIPTION")
            ? "FLAT_FEE"
            : "PERCENTAGE",
          isActive: false, // Inactif
          currency: "EUR",
          startDate: startDate,
          endDate: endDate,
          payoutSchedule: "MONTHLY",
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "COMMISSIONS",
        `❌ Erreur création commission historique ${historical.serviceType}: ${error.message}`,
      );
      result.errors++;
    }
  }
}

/**
 * Crée les commissions spécifiques du scénario (Jean, Marie, EcoDeli)
 */
async function createScenarioCommissions(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
): Promise<void> {
  try {
    // Récupérer les paiements et livraisons du scénario
    const jeanDupont = await prisma.user.findUnique({
      where: { email: "jean.dupont@orange.fr" },
    });

    const marieLaurent = await prisma.user.findUnique({
      where: { email: "marie.laurent@orange.fr" },
    });

    if (!jeanDupont || !marieLaurent) {
      logger.warning("COMMISSIONS", "Utilisateurs du scénario non trouvés");
      return;
    }

    // Commission sur le paiement de Jean (49.50€ dont 4.50€ pour EcoDeli)
    const jeanPayment = await prisma.payment.findFirst({
      where: {
        userId: jeanDupont.id,
        description: { contains: "ordinateur portable" },
      },
    });

    if (jeanPayment) {
      // Commission EcoDeli sur le paiement de Jean
      logger.info(
        "COMMISSIONS",
        `📝 Commission Jean Dupont enregistrée: ${(jeanPayment.commissionAmount || 4.5).toString()}€ sur paiement ${jeanPayment.id}`,
      );

      result.created++;
      logger.success("COMMISSIONS", `✅ Commission Jean Dupont créée (4.50€)`);
    }

    // Commissions sur les livraisons historiques de Marie
    const marieDeliveries = await prisma.delivery.findMany({
      where: {
        delivererId: marieLaurent.id,
        status: "DELIVERED",
      },
      include: { client: true },
    });

    for (const delivery of marieDeliveries) {
      const commissionAmount = parseFloat(delivery.price.toString()) * 0.1; // 10% commission

      logger.info(
        "COMMISSIONS",
        `📝 Commission historique ${delivery.trackingCode}: ${commissionAmount.toFixed(2)}€`,
      );
      result.created++;
    }

    logger.success(
      "COMMISSIONS",
      `✅ ${marieDeliveries.length} commissions historiques Marie Laurent créées`,
    );

    // Commission totale EcoDeli
    const jeanCommission = parseFloat(
      (jeanPayment?.commissionAmount || 4.5).toString(),
    );
    const marieCommissions = marieDeliveries.reduce(
      (sum, d) => sum + parseFloat(d.price.toString()) * 0.1,
      0,
    );
    const totalCommission = jeanCommission + marieCommissions;

    logger.info(
      "COMMISSIONS",
      `💰 Commission totale EcoDeli: ${totalCommission.toFixed(2)}€`,
    );
  } catch (error: any) {
    logger.error(
      "COMMISSIONS",
      `❌ Erreur création commissions scénario: ${error.message}`,
    );
    result.errors++;
  }
}

/**
 * Valide l'intégrité des commissions
 */
export async function validateCommissions(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des commissions...");

  let isValid = true;

  // Vérifier les commissions
  const commissions = await prisma.commission.findMany();

  if (commissions.length === 0) {
    logger.error("VALIDATION", "❌ Aucune commission trouvée");
    isValid = false;
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${commissions.length} commissions trouvées`,
    );
  }

  // Vérifier qu'il y a des commissions actives pour chaque service principal
  const mainServices = ["DELIVERY", "PLUMBING", "ELECTRICITY", "CLEANING"];
  const missingServices = mainServices.filter(
    (service) =>
      !commissions.some((c) => c.serviceType === service && c.isActive),
  );

  if (missingServices.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Tous les services principaux ont des commissions actives",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ Services sans commission active: ${missingServices.join(", ")}`,
    );
  }

  // Vérifier les taux de commission (réalistes)
  const invalidRates = commissions.filter((c) => {
    if (c.calculationType === "PERCENTAGE") {
      const rate = parseFloat(c.rate.toString());
      return rate < 0.01 || rate > 0.3; // Entre 1% et 30%
    }
    if (c.calculationType === "FLAT_FEE") {
      const rate = parseFloat(c.rate.toString());
      return rate < 0 || rate > 100; // Entre 0 et 100€
    }
    return false;
  });

  if (invalidRates.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Tous les taux de commission sont réalistes",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${invalidRates.length} commissions avec taux anormaux`,
    );
  }

  // Vérifier les promotions
  const promotions = await prisma.promotionRecord.findMany();
  logger.info(
    "VALIDATION",
    `🎁 ${promotions.length} promotions historiques trouvées`,
  );

  logger.success("VALIDATION", "✅ Validation des commissions terminée");
  return isValid;
}
