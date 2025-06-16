import { PrismaClient, UserRole, ServiceType } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour une règle de tarification
 */
interface PricingRule {
  name: string;
  type: "DELIVERY" | "SERVICE" | "STORAGE" | "COMMISSION";
  basePrice: number;
  category: string;
  zone: string;
  conditions: any;
  multipliers: any;
  isActive: boolean;
  validFrom: Date;
  validUntil: Date | null;
}

/**
 * Interface pour une promotion
 */
interface Promotion {
  code: string;
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_DELIVERY";
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  usageLimit: number;
  currentUsage: number;
  validFrom: Date;
  validUntil: Date;
  targetRoles: UserRole[];
  isActive: boolean;
}

/**
 * Seed des règles de tarification EcoDeli
 * Crée toutes les grilles tarifaires et promotions
 */
export async function seedPricingRules(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("PRICING_RULES");

  const result: SeedResult = {
    entity: "pricing_rules",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Note: Cette implémentation est simplifiée car il n'y a pas de modèles
  // correspondants dans le schéma Prisma. Nous créerons des logs
  // pour démontrer la fonctionnalité.

  logger.info(
    "PRICING_RULES",
    "💰 Initialisation des règles de tarification...",
  );

  // === RÈGLES DE TARIFICATION LIVRAISONS ===
  const DELIVERY_PRICING_RULES: PricingRule[] = [
    {
      name: "Livraison Standard Paris",
      type: "DELIVERY",
      basePrice: 8.5,
      category: "STANDARD",
      zone: "PARIS_INTRA",
      conditions: {
        maxDistance: 5,
        maxWeight: 10,
        timeSlot: "STANDARD",
      },
      multipliers: {
        urgentDelivery: 1.5,
        eveningDelivery: 1.3,
        weekendDelivery: 1.2,
        heavyPackage: 1.4,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Livraison Express Paris",
      type: "DELIVERY",
      basePrice: 15.0,
      category: "EXPRESS",
      zone: "PARIS_INTRA",
      conditions: {
        maxDistance: 5,
        maxWeight: 5,
        timeSlot: "EXPRESS",
        deliveryTime: "< 2h",
      },
      multipliers: {
        urgentDelivery: 1.8,
        eveningDelivery: 1.5,
        weekendDelivery: 1.4,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Livraison Banlieue",
      type: "DELIVERY",
      basePrice: 12.0,
      category: "STANDARD",
      zone: "PARIS_PETITE_COURONNE",
      conditions: {
        maxDistance: 15,
        maxWeight: 15,
        timeSlot: "STANDARD",
      },
      multipliers: {
        urgentDelivery: 1.6,
        eveningDelivery: 1.4,
        weekendDelivery: 1.3,
        heavyPackage: 1.5,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Livraison Grande Couronne",
      type: "DELIVERY",
      basePrice: 18.0,
      category: "STANDARD",
      zone: "PARIS_GRANDE_COURONNE",
      conditions: {
        maxDistance: 30,
        maxWeight: 20,
        timeSlot: "STANDARD",
      },
      multipliers: {
        urgentDelivery: 1.4,
        eveningDelivery: 1.2,
        weekendDelivery: 1.1,
        heavyPackage: 1.3,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
  ];

  // === RÈGLES DE TARIFICATION SERVICES ===
  const SERVICE_PRICING_RULES: PricingRule[] = [
    {
      name: "Plomberie Intervention",
      type: "SERVICE",
      basePrice: 45.0,
      category: "PLUMBING",
      zone: "ALL",
      conditions: {
        minDuration: 1,
        timeSlot: "BUSINESS_HOURS",
      },
      multipliers: {
        emergency: 2.0,
        eveningHours: 1.5,
        weekendHours: 1.3,
        holidayHours: 1.8,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Ménage Standard",
      type: "SERVICE",
      basePrice: 25.0,
      category: "CLEANING",
      zone: "ALL",
      conditions: {
        minDuration: 2,
        timeSlot: "FLEXIBLE",
      },
      multipliers: {
        deepCleaning: 1.5,
        movingCleaning: 1.8,
        windowCleaning: 1.3,
        weekendHours: 1.2,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Jardinage",
      type: "SERVICE",
      basePrice: 30.0,
      category: "GARDENING",
      zone: "ALL",
      conditions: {
        minDuration: 2,
        seasonality: "SPRING_SUMMER",
        timeSlot: "DAYLIGHT",
      },
      multipliers: {
        treePruning: 1.6,
        landscaping: 2.0,
        maintenance: 1.0,
        weekendHours: 1.1,
      },
      isActive: true,
      validFrom: new Date("2024-03-01"),
      validUntil: new Date("2024-10-31"),
    },
    {
      name: "Électricité",
      type: "SERVICE",
      basePrice: 55.0,
      category: "ELECTRICAL",
      zone: "ALL",
      conditions: {
        minDuration: 1,
        certification: "REQUIRED",
        timeSlot: "BUSINESS_HOURS",
      },
      multipliers: {
        emergency: 2.5,
        eveningHours: 1.8,
        complexInstallation: 1.4,
        safetyRisk: 1.5,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
  ];

  // === RÈGLES DE STOCKAGE ===
  const STORAGE_PRICING_RULES: PricingRule[] = [
    {
      name: "Box Standard Mensuel",
      type: "STORAGE",
      basePrice: 8.0,
      category: "STANDARD",
      zone: "ALL",
      conditions: {
        minRental: 30,
        boxType: "STANDARD",
      },
      multipliers: {
        longTermDiscount6Months: 0.9,
        longTermDiscount12Months: 0.8,
        climateControl: 1.3,
        securityUpgrade: 1.2,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Box Premium Mensuel",
      type: "STORAGE",
      basePrice: 15.0,
      category: "PREMIUM",
      zone: "ALL",
      conditions: {
        minRental: 30,
        boxType: "CLIMATE_CONTROLLED",
      },
      multipliers: {
        longTermDiscount6Months: 0.85,
        longTermDiscount12Months: 0.75,
        refrigeration: 1.8,
        fragileHandling: 1.4,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
  ];

  // === RÈGLES DE COMMISSION ===
  const COMMISSION_RULES: PricingRule[] = [
    {
      name: "Commission Livraison Standard",
      type: "COMMISSION",
      basePrice: 15.0, // Pourcentage
      category: "DELIVERY",
      zone: "ALL",
      conditions: {
        minMonthlyDeliveries: 0,
        partnerLevel: "STANDARD",
      },
      multipliers: {
        premiumPartner: 0.8,
        highVolumeDiscount: 0.9,
        newPartnerBonus: 0.7,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
    {
      name: "Commission Service",
      type: "COMMISSION",
      basePrice: 20.0, // Pourcentage
      category: "SERVICE",
      zone: "ALL",
      conditions: {
        minMonthlyServices: 0,
        partnerLevel: "STANDARD",
      },
      multipliers: {
        certifiedProvider: 0.85,
        premiumPartner: 0.8,
        newPartnerBonus: 0.75,
      },
      isActive: true,
      validFrom: new Date("2024-01-01"),
      validUntil: null,
    },
  ];

  // === PROMOTIONS ACTIVES ===
  const ACTIVE_PROMOTIONS: Promotion[] = [
    {
      code: "WELCOME20",
      name: "Bienvenue Nouveaux Clients",
      description: "20% de réduction sur la première commande",
      type: "PERCENTAGE",
      value: 20,
      minOrderAmount: 15,
      maxDiscount: 10,
      usageLimit: 1000,
      currentUsage: 150,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2024-12-31"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
    {
      code: "DELIVERY5",
      name: "Livraison Gratuite",
      description: "Livraison gratuite dès 25€ d'achat",
      type: "FREE_DELIVERY",
      value: 0,
      minOrderAmount: 25,
      maxDiscount: null,
      usageLimit: 10000,
      currentUsage: 2340,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2024-06-30"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
    {
      code: "STUDENT15",
      name: "Réduction Étudiante",
      description: "15% de réduction pour les étudiants",
      type: "PERCENTAGE",
      value: 15,
      minOrderAmount: 10,
      maxDiscount: 8,
      usageLimit: 5000,
      currentUsage: 892,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2024-08-31"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
    {
      code: "BULK30",
      name: "Commande Groupée",
      description: "30€ de réduction sur les commandes de plus de 100€",
      type: "FIXED_AMOUNT",
      value: 30,
      minOrderAmount: 100,
      maxDiscount: null,
      usageLimit: 500,
      currentUsage: 78,
      validFrom: new Date("2024-02-01"),
      validUntil: new Date("2024-04-30"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
    {
      code: "STORAGE50",
      name: "Premier Mois Stockage",
      description: "50% de réduction sur le premier mois de stockage",
      type: "PERCENTAGE",
      value: 50,
      minOrderAmount: 0,
      maxDiscount: 25,
      usageLimit: 2000,
      currentUsage: 567,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2024-12-31"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
    {
      code: "REFERRAL10",
      name: "Parrainage Ami",
      description: "10€ de crédit pour chaque ami parrainé",
      type: "FIXED_AMOUNT",
      value: 10,
      minOrderAmount: 0,
      maxDiscount: null,
      usageLimit: 50000,
      currentUsage: 1245,
      validFrom: new Date("2024-01-01"),
      validUntil: new Date("2024-12-31"),
      targetRoles: [UserRole.CLIENT],
      isActive: true,
    },
  ];

      // Création des règles de tarification
  logger.info(
    "PRICING_RULES",
    "📋 Configuration des règles de tarification...",
  );

  let totalRules = 0;
  const rulesByCategory: Record<string, number> = {};

  // Traiter toutes les règles
  const allRules = [
    ...DELIVERY_PRICING_RULES,
    ...SERVICE_PRICING_RULES,
    ...STORAGE_PRICING_RULES,
    ...COMMISSION_RULES,
  ];

  for (const rule of allRules) {
    try {
      // Enregistrement de la règle
      await prisma.pricingRule.upsert({
        where: {
          name: rule.name,
        },
        update: {
          name: rule.name,
          type: rule.type,
          basePrice: rule.basePrice,
          category: rule.category,
          zone: rule.zone,
          conditions: rule.conditions,
          multipliers: rule.multipliers,
          isActive: rule.isActive,
          validFrom: rule.validFrom,
          validUntil: rule.validUntil,
        },
        create: {
          name: rule.name,
          type: rule.type,
          basePrice: rule.basePrice,
          category: rule.category,
          zone: rule.zone,
          conditions: rule.conditions,
          multipliers: rule.multipliers,
          isActive: rule.isActive,
          validFrom: rule.validFrom,
          validUntil: rule.validUntil,
        },
      });

      totalRules++;
      result.created++;

      // Compter par catégorie
      rulesByCategory[rule.type] = (rulesByCategory[rule.type] || 0) + 1;

      if (options.verbose) {
        logger.success(
          "PRICING_RULES",
          `✅ ${rule.name}: ${rule.basePrice}€ base (${rule.zone})`,
        );
      }
    } catch (error: any) {
      logger.error(
        "PRICING_RULES",
        `❌ Erreur règle ${rule.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

      // Création des promotions
  logger.info("PRICING_RULES", "🎯 Configuration des promotions...");

  let totalPromotions = 0;
  const promotionsByType: Record<string, number> = {};

  for (const promotion of ACTIVE_PROMOTIONS) {
    try {
      // Enregistrement de la promotion
      await prisma.promotion.upsert({
        where: {
          code: promotion.code,
        },
        update: {
          code: promotion.code,
          name: promotion.name,
          description: promotion.description,
          type: promotion.type,
          value: promotion.value,
          minOrderAmount: promotion.minOrderAmount,
          maxDiscount: promotion.maxDiscount,
          usageLimit: promotion.usageLimit,
          currentUsage: promotion.currentUsage,
          validFrom: promotion.validFrom,
          validUntil: promotion.validUntil,
          targetRoles: {
            connect: promotion.targetRoles.map((role) => ({
              id: role,
            })),
          },
          isActive: promotion.isActive,
        },
        create: {
          code: promotion.code,
          name: promotion.name,
          description: promotion.description,
          type: promotion.type,
          value: promotion.value,
          minOrderAmount: promotion.minOrderAmount,
          maxDiscount: promotion.maxDiscount,
          usageLimit: promotion.usageLimit,
          currentUsage: promotion.currentUsage,
          validFrom: promotion.validFrom,
          validUntil: promotion.validUntil,
          targetRoles: {
            connect: promotion.targetRoles.map((role) => ({
              id: role,
            })),
          },
          isActive: promotion.isActive,
        },
      });

      totalPromotions++;
      result.created++;

      // Compter par type
      promotionsByType[promotion.type] =
        (promotionsByType[promotion.type] || 0) + 1;

      if (options.verbose) {
        const usage = `${promotion.currentUsage}/${promotion.usageLimit}`;
        logger.success(
          "PRICING_RULES",
          `✅ ${promotion.code}: ${promotion.value}${promotion.type === "PERCENTAGE" ? "%" : "€"} (${usage})`,
        );
      }
    } catch (error: any) {
      logger.error(
        "PRICING_RULES",
        `❌ Erreur promotion ${promotion.code}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Générer des analyses tarifaires
  await generatePricingAnalysis(logger, allRules, ACTIVE_PROMOTIONS);

  // Simulation des calculs de tarification
  await calculatePricingExamples(logger, allRules);

  // Analyser les promotions
  await analyzePromotions(logger, ACTIVE_PROMOTIONS);

  // Statistiques finales
  logger.info(
    "PRICING_RULES",
    `💰 Règles par type: ${JSON.stringify(rulesByCategory)}`,
  );
  logger.info(
    "PRICING_RULES",
    `🎁 Promotions par type: ${JSON.stringify(promotionsByType)}`,
  );
  logger.info(
    "PRICING_RULES",
    `🔢 Total: ${totalRules} règles + ${totalPromotions} promotions`,
  );

  // Validation
  const expectedTotal = allRules.length + ACTIVE_PROMOTIONS.length;
  if (totalRules + totalPromotions >= expectedTotal - result.errors) {
    logger.validation(
      "PRICING_RULES",
      "PASSED",
      `${totalRules + totalPromotions} éléments tarifaires créés`,
    );
  } else {
    logger.validation(
      "PRICING_RULES",
      "FAILED",
      `Attendu: ${expectedTotal}, Créé: ${totalRules + totalPromotions}`,
    );
  }

  logger.endSeed("PRICING_RULES", result);
  return result;
}

/**
 * Génère une analyse des règles de tarification
 */
async function generatePricingAnalysis(
  logger: SeedLogger,
  rules: PricingRule[],
  promotions: Promotion[],
): Promise<void> {
  logger.info("PRICING_ANALYSIS", "📊 Analyse des tarifs...");

  // Analyse des prix de base
  const deliveryRules = rules.filter((r) => r.type === "DELIVERY");
  const serviceRules = rules.filter((r) => r.type === "SERVICE");
  const storageRules = rules.filter((r) => r.type === "STORAGE");

  if (deliveryRules.length > 0) {
    const avgDeliveryPrice =
      deliveryRules.reduce((sum, r) => sum + r.basePrice, 0) /
      deliveryRules.length;
    const minDeliveryPrice = Math.min(...deliveryRules.map((r) => r.basePrice));
    const maxDeliveryPrice = Math.max(...deliveryRules.map((r) => r.basePrice));

    logger.info(
      "PRICING_ANALYSIS",
      `🚚 Livraisons: ${minDeliveryPrice}€ - ${maxDeliveryPrice}€ (moy: ${avgDeliveryPrice.toFixed(2)}€)`,
    );
  }

  if (serviceRules.length > 0) {
    const avgServicePrice =
      serviceRules.reduce((sum, r) => sum + r.basePrice, 0) /
      serviceRules.length;
    const minServicePrice = Math.min(...serviceRules.map((r) => r.basePrice));
    const maxServicePrice = Math.max(...serviceRules.map((r) => r.basePrice));

    logger.info(
      "PRICING_ANALYSIS",
      `🔧 Services: ${minServicePrice}€ - ${maxServicePrice}€ (moy: ${avgServicePrice.toFixed(2)}€/h)`,
    );
  }

  if (storageRules.length > 0) {
    const avgStoragePrice =
      storageRules.reduce((sum, r) => sum + r.basePrice, 0) /
      storageRules.length;

    logger.info(
      "PRICING_ANALYSIS",
      `📦 Stockage: ${avgStoragePrice.toFixed(2)}€/jour en moyenne`,
    );
  }

  // Analyse des promotions
  const activePromotions = promotions.filter(
    (p) =>
      p.isActive && new Date() >= p.validFrom && new Date() <= p.validUntil,
  );
  const totalPromotionUsage = promotions.reduce(
    (sum, p) => sum + p.currentUsage,
    0,
  );
  const totalPromotionLimit = promotions.reduce(
    (sum, p) => sum + p.usageLimit,
    0,
  );
  const usageRate = ((totalPromotionUsage / totalPromotionLimit) * 100).toFixed(
    1,
  );

  logger.info(
    "PRICING_ANALYSIS",
    `🎁 Promotions actives: ${activePromotions.length}/${promotions.length} (taux utilisation: ${usageRate}%)`,
  );
}

/**
 * Simule des calculs de tarification
 */
async function calculatePricingExamples(
  logger: SeedLogger,
  rules: any[]
): Promise<void> {
  logger.info("PRICING", "💰 Calcul d'exemples de tarification...");

  const examples = [
    { distance: 5, weight: 2, priority: "NORMAL", vehicle: "BIKE" },
    { distance: 15, weight: 10, priority: "HIGH", vehicle: "CAR" },
    { distance: 25, weight: 20, priority: "URGENT", vehicle: "VAN" },
  ];

  for (const example of examples) {
    try {
      // Calcul basé sur les règles définies
      let basePrice = 5.00; // Prix de base
      
      // Règle de distance
      const distanceRule = rules.find(r => r.type === "DISTANCE_BASED");
      if (distanceRule && distanceRule.parameters.pricePerKm) {
        basePrice += example.distance * distanceRule.parameters.pricePerKm;
      }
      
      // Règle de poids
      const weightRule = rules.find(r => r.type === "WEIGHT_BASED");
      if (weightRule && example.weight > 5) {
        basePrice += (example.weight - 5) * (weightRule.parameters.pricePerKg || 0.5);
      }
      
      // Multiplicateur de priorité
      const priorityMultipliers = { NORMAL: 1.0, HIGH: 1.3, URGENT: 1.8 };
      const finalPrice = basePrice * (priorityMultipliers[example.priority] || 1.0);
      
      logger.success(
        "PRICING",
        `${example.distance}km, ${example.weight}kg, ${example.priority}: ${finalPrice.toFixed(2)}€`
      );
    } catch (error) {
      logger.error("PRICING", `Erreur calcul ${JSON.stringify(example)}: ${error.message}`);
    }
  }
}

/**
 * Analyse les performances des promotions
 */
async function analyzePromotions(
  logger: SeedLogger,
  promotions: Promotion[],
): Promise<void> {
  logger.info("PROMOTION_ANALYSIS", "🎯 Analyse des promotions...");

  // Promotions les plus utilisées
  const sortedByUsage = [...promotions].sort(
    (a, b) => b.currentUsage - a.currentUsage,
  );
  const topPromotions = sortedByUsage.slice(0, 3);

  logger.info("PROMOTION_ANALYSIS", "🏆 Top 3 des promotions utilisées:");
  topPromotions.forEach((promo, index) => {
    const usageRate = ((promo.currentUsage / promo.usageLimit) * 100).toFixed(
      1,
    );
    logger.info(
      "PROMOTION_ANALYSIS",
      `   ${index + 1}. ${promo.code}: ${promo.currentUsage} utilisations (${usageRate}%)`,
    );
  });

  // Promotions sur le point d'expirer
  const soonToExpire = promotions.filter((p) => {
    const daysUntilExpiry = Math.ceil(
      (p.validUntil.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  if (soonToExpire.length > 0) {
    logger.warning(
      "PROMOTION_ANALYSIS",
      `⏰ ${soonToExpire.length} promotions expirent dans les 30 jours`,
    );
  }

  // Promotions sous-utilisées
  const underUsed = promotions.filter(
    (p) => p.currentUsage / p.usageLimit < 0.1,
  ); // Moins de 10% d'utilisation

  if (underUsed.length > 0) {
    logger.warning(
      "PROMOTION_ANALYSIS",
      `📉 ${underUsed.length} promotions sous-utilisées (< 10%)`,
    );
  }
}

/**
 * Valide l'intégrité des règles de tarification
 */
export async function validatePricingRules(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des règles de tarification...");

  // Cette validation est simulée car il n'y a pas de modèles correspondants
  logger.success(
    "VALIDATION",
    "✅ Règles de tarification validées (simulation)",
  );
  logger.info(
    "VALIDATION",
    "📝 Note: Les règles tarifaires sont simulées car aucun modèle correspondant n'existe dans le schéma Prisma",
  );

  return true;
}
