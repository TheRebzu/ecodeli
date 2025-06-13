import { PrismaClient, UserRole, InvoiceStatus } from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un cycle de facturation
 */
interface BillingCycleData {
  userId: string;
  userRole: UserRole;
  cycleType: string;
  frequency: string;
  nextBillingDate: Date;
  lastBillingDate: Date;
  isActive: boolean;
}

/**
 * Seed des cycles de facturation EcoDeli
 * Crée des cycles mensuels pour prestataires, hebdomadaires pour livreurs
 */
export async function seedBillingCycles(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("BILLING_CYCLES");

  const result: SeedResult = {
    entity: "billing_cycles",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer tous les utilisateurs professionnels (qui ont des cycles de facturation)
  const professionalUsers = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.DELIVERER, UserRole.PROVIDER, UserRole.MERCHANT] },
      status: "ACTIVE",
    },
    include: {
      deliverer: true,
      provider: true,
      merchant: true,
    },
  });

  if (professionalUsers.length === 0) {
    logger.warning(
      "BILLING_CYCLES",
      "Aucun utilisateur professionnel trouvé - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Vérifier si des cycles existent déjà (on va créer dans les modèles existants)
  // Note: Les cycles de facturation seront stockés dans les modèles Invoice avec des métadonnées

  // Configuration des cycles par rôle
  const CYCLE_CONFIGS = {
    [UserRole.DELIVERER]: {
      frequency: "WEEKLY",
      description: "Facturation hebdomadaire des commissions livreurs",
      billingDay: 1, // Lundi
      cutoffDay: 0, // Dimanche
    },
    [UserRole.PROVIDER]: {
      frequency: "MONTHLY",
      description: "Facturation mensuelle des commissions prestataires",
      billingDay: 1, // 1er du mois
      cutoffDay: 30, // Fin de mois
    },
    [UserRole.MERCHANT]: {
      frequency: "MONTHLY",
      description: "Facturation mensuelle des commissions commerçants",
      billingDay: 15, // 15 du mois
      cutoffDay: 14, // 14 du mois précédent
    },
  };

  let totalCycles = 0;

  for (const user of professionalUsers) {
    try {
      logger.progress(
        "BILLING_CYCLES",
        totalCycles + 1,
        professionalUsers.length,
        `Création cycle: ${user.name}`,
      );

      const userRole = user.role as keyof typeof CYCLE_CONFIGS;
      const config = CYCLE_CONFIGS[userRole];

      // Déterminer si l'utilisateur a un cycle actif
      const isVerified = getUserVerificationStatus(user);
      const hasActivity = await checkUserActivity(prisma, user.id);

      if (!isVerified || !hasActivity) {
        // Pas de cycle pour les utilisateurs non vérifiés ou inactifs
        continue;
      }

      // Calculer les dates du cycle actuel
      const { lastBilling, nextBilling } = calculateBillingDates(
        config.frequency,
        config.billingDay,
      );

      // Créer un cycle de facturation en générant des factures récurrentes
      await createBillingCycle(
        prisma,
        user,
        config,
        lastBilling,
        nextBilling,
        logger,
      );

      totalCycles++;
      result.created++;
    } catch (error: any) {
      logger.error(
        "BILLING_CYCLES",
        `❌ Erreur création cycle pour ${user.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Générer des rappels d'impayés
  await createOverdueReminders(prisma, logger, result);

  // Générer des exports comptables
  await createAccountingExports(prisma, logger, result);

  // Validation des cycles créés
  const recentInvoices = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
      },
    },
    include: { user: true },
  });

  if (recentInvoices.length > 0) {
    logger.validation(
      "BILLING_CYCLES",
      "PASSED",
      `${totalCycles} cycles de facturation traités`,
    );
  } else {
    logger.warning("BILLING_CYCLES", "Aucune facture récente générée");
  }

  // Statistiques par fréquence
  const invoicesByRole = recentInvoices.reduce(
    (acc: Record<string, number>, invoice) => {
      const role = invoice.user.role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info(
    "BILLING_CYCLES",
    `📊 Factures récentes par rôle: ${JSON.stringify(invoicesByRole)}`,
  );

  // Prochaines échéances
  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 prochains jours
      },
      status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.DRAFT] },
    },
  });

  logger.info(
    "BILLING_CYCLES",
    `📅 Échéances cette semaine: ${upcomingInvoices.length} factures`,
  );

  // Factures en retard
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: "OVERDUE",
    },
  });

  if (overdueInvoices.length > 0) {
    logger.warning(
      "BILLING_CYCLES",
      `⚠️ ${overdueInvoices.length} factures en retard nécessitent un suivi`,
    );
  } else {
    logger.success("BILLING_CYCLES", "✅ Aucune facture en retard");
  }

  // Revenus récurrents estimés
  const monthlyRecurring = await calculateMonthlyRecurringRevenue(prisma);
  logger.info(
    "BILLING_CYCLES",
    `💰 Revenus récurrents mensuels estimés: ${monthlyRecurring.toFixed(2)} EUR`,
  );

  logger.endSeed("BILLING_CYCLES", result);
  return result;
}

/**
 * Obtient le statut de vérification d'un utilisateur
 */
function getUserVerificationStatus(user: any): boolean {
  switch (user.role) {
    case UserRole.DELIVERER:
      return user.deliverer?.isVerified || false;
    case UserRole.PROVIDER:
      return user.provider?.isVerified || false;
    case UserRole.MERCHANT:
      return user.merchant?.isVerified || false;
    default:
      return false;
  }
}

/**
 * Vérifie si un utilisateur a de l'activité récente
 */
async function checkUserActivity(
  prisma: PrismaClient,
  userId: string,
): Promise<boolean> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Vérifier les paiements récents liés à cet utilisateur
  const recentPayments = await prisma.payment.findMany({
    where: {
      userId: userId,
      createdAt: { gte: thirtyDaysAgo },
      status: "COMPLETED",
    },
    take: 1,
  });

  return recentPayments.length > 0;
}

/**
 * Calcule les dates de facturation selon la fréquence
 */
function calculateBillingDates(
  frequency: string,
  billingDay: number,
): {
  lastBilling: Date;
  nextBilling: Date;
} {
  const now = new Date();
  let lastBilling: Date;
  let nextBilling: Date;

  if (frequency === "WEEKLY") {
    // Facturation hebdomadaire (ex: tous les lundis)
    const daysSinceLastMonday = (now.getDay() + 6) % 7; // 0 = lundi
    lastBilling = new Date(now);
    lastBilling.setDate(now.getDate() - daysSinceLastMonday);
    lastBilling.setHours(0, 0, 0, 0);

    nextBilling = new Date(lastBilling);
    nextBilling.setDate(lastBilling.getDate() + 7);
  } else {
    // Facturation mensuelle
    lastBilling = new Date(now.getFullYear(), now.getMonth() - 1, billingDay);
    nextBilling = new Date(now.getFullYear(), now.getMonth(), billingDay);

    // Si on est avant le jour de facturation ce mois-ci
    if (now.getDate() < billingDay) {
      lastBilling.setMonth(lastBilling.getMonth() - 1);
      nextBilling.setMonth(nextBilling.getMonth() - 1);
    }
  }

  return { lastBilling, nextBilling };
}

/**
 * Crée un cycle de facturation pour un utilisateur
 */
async function createBillingCycle(
  prisma: PrismaClient,
  user: any,
  config: any,
  lastBilling: Date,
  nextBilling: Date,
  logger: SeedLogger,
): Promise<void> {
  // Générer les dernières factures du cycle
  const invoiceType = getInvoiceTypeForRole(user.role);
  const amount = calculateCycleAmount(user.role, config.frequency);

  // Vérifier si une facture existe déjà pour cette période
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      userId: user.id,
      billingPeriodStart: lastBilling,
      billingPeriodEnd: nextBilling,
    },
  });

  if (existingInvoice) {
    return; // Cycle déjà traité
  }

  // Créer la facture du cycle
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      amount: amount,
      totalAmount: amount,
      currency: "EUR",
      status: faker.helpers.weightedArrayElement([
        { weight: 0.8, value: "PAID" },
        { weight: 0.15, value: "ISSUED" },
        { weight: 0.05, value: "OVERDUE" },
      ]),
      invoiceNumber: generateInvoiceNumber(user.role, config.frequency),
      invoiceType: invoiceType,
      issueDate: lastBilling,
      dueDate: calculateDueDate(lastBilling, config.frequency),
      billingPeriodStart: lastBilling,
      billingPeriodEnd: nextBilling,
      description: `${config.description} - ${formatPeriod(lastBilling, nextBilling, config.frequency)}`,
      locale: "fr",
      paymentTerms:
        config.frequency === "WEEKLY"
          ? "Paiement à 7 jours"
          : "Paiement à 15 jours",
      billingName: user.name,
      billingAddress: faker.location.streetAddress(),
      billingCity: faker.location.city(),
      billingPostal: faker.location.zipCode(),
      billingCountry: "France",
      emailSentAt: lastBilling,
      paidDate:
        Math.random() > 0.2
          ? faker.date.between({ from: lastBilling, to: nextBilling })
          : null,
    },
  });

  // Créer les lignes de facture détaillées
  await createCycleInvoiceItems(
    prisma,
    invoice.id,
    user.role,
    amount,
    config.frequency,
  );
}

/**
 * Détermine le type de facture selon le rôle
 */
function getInvoiceTypeForRole(role: UserRole): string {
  const types: Record<UserRole, string> = {
    [UserRole.DELIVERER]: "COMMISSION_DELIVERY",
    [UserRole.PROVIDER]: "COMMISSION_SERVICE",
    [UserRole.MERCHANT]: "COMMISSION_SALES",
    [UserRole.CLIENT]: "COMMISSION",
    [UserRole.ADMIN]: "COMMISSION",
  };
  return types[role] || "COMMISSION";
}

/**
 * Calcule le montant du cycle selon le rôle et la fréquence
 */
function calculateCycleAmount(role: UserRole, frequency: string): number {
  const baseAmounts: Record<UserRole, number> = {
    [UserRole.DELIVERER]:
      frequency === "WEEKLY"
        ? faker.number.float({ min: 25, max: 150 }) // Hebdomadaire livreurs
        : faker.number.float({ min: 100, max: 600 }), // Mensuel livreurs
    [UserRole.PROVIDER]: faker.number.float({ min: 80, max: 800 }), // Mensuel prestataires
    [UserRole.MERCHANT]: faker.number.float({ min: 50, max: 500 }), // Mensuel commerçants
    [UserRole.CLIENT]: 0, // Pas de cycle pour les clients
    [UserRole.ADMIN]: 0, // Pas de cycle pour les admins
  };

  return Math.round(baseAmounts[role] * 100) / 100;
}

/**
 * Calcule la date d'échéance
 */
function calculateDueDate(issueDate: Date, frequency: string): Date {
  const dueDate = new Date(issueDate);
  if (frequency === "WEEKLY") {
    dueDate.setDate(dueDate.getDate() + 7); // 7 jours pour hebdomadaire
  } else {
    dueDate.setDate(dueDate.getDate() + 15); // 15 jours pour mensuel
  }
  return dueDate;
}

/**
 * Génère un numéro de facture spécifique au cycle
 */
function generateInvoiceNumber(role: UserRole, frequency: string): string {
  const prefixes: Record<UserRole, string> = {
    [UserRole.DELIVERER]: "DEL",
    [UserRole.PROVIDER]: "PRO",
    [UserRole.MERCHANT]: "COM",
    [UserRole.CLIENT]: "CLI",
    [UserRole.ADMIN]: "ADM",
  };

  const prefix = prefixes[role];
  const freqCode = frequency === "WEEKLY" ? "W" : "M";
  const year = new Date().getFullYear();
  const number = faker.number.int({ min: 1000, max: 9999 });

  return `${prefix}-${freqCode}-${year}-${number}`;
}

/**
 * Formate une période de facturation
 */
function formatPeriod(start: Date, end: Date, frequency: string): string {
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (frequency === "WEEKLY") {
    return `Semaine du ${formatter.format(start)} au ${formatter.format(end)}`;
  } else {
    return `Mois de ${start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;
  }
}

/**
 * Crée les lignes détaillées d'une facture de cycle
 */
async function createCycleInvoiceItems(
  prisma: PrismaClient,
  invoiceId: string,
  role: UserRole,
  totalAmount: number,
  frequency: string,
): Promise<void> {
  const items = [];

  if (role === UserRole.DELIVERER) {
    // Détail des livraisons
    const deliveryCount =
      frequency === "WEEKLY"
        ? faker.number.int({ min: 5, max: 30 })
        : faker.number.int({ min: 20, max: 120 });

    const avgCommission = totalAmount / deliveryCount;

    items.push({
      description: `Commissions sur ${deliveryCount} livraisons effectuées`,
      quantity: deliveryCount,
      unitPrice: Math.round(avgCommission * 100) / 100,
      amount: totalAmount,
    });
  } else if (role === UserRole.PROVIDER) {
    // Services par catégorie
    const serviceCategories = [
      "Plomberie",
      "Électricité",
      "Nettoyage",
      "Jardinage",
    ];
    const selectedCategories = faker.helpers.arrayElements(
      serviceCategories,
      faker.number.int({ min: 1, max: 3 }),
    );

    const amountPerCategory = totalAmount / selectedCategories.length;

    selectedCategories.forEach((category) => {
      items.push({
        description: `Commissions services ${category.toLowerCase()}`,
        quantity: 1,
        unitPrice: Math.round(amountPerCategory * 100) / 100,
        amount: Math.round(amountPerCategory * 100) / 100,
      });
    });
  } else {
    // Commissions ventes pour commerçants
    items.push({
      description: "Commissions sur ventes mensuelles",
      quantity: 1,
      unitPrice: totalAmount,
      amount: totalAmount,
    });
  }

  // Créer les lignes
  for (const item of items) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      },
    });
  }
}

/**
 * Crée des rappels pour factures impayées
 */
async function createOverdueReminders(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
): Promise<void> {
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: "OVERDUE",
      reminderSentAt: null,
    },
    take: 10, // Limiter pour l'exemple
  });

  for (const invoice of overdueInvoices) {
    try {
      // Marquer le rappel comme envoyé
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          reminderSentAt: new Date(),
          notes: "Rappel automatique envoyé pour facture en retard",
        },
      });

      result.created++;
    } catch (error: any) {
      logger.error(
        "BILLING_CYCLES",
        `❌ Erreur rappel facture ${invoice.invoiceNumber}: ${error.message}`,
      );
      result.errors++;
    }
  }

  if (overdueInvoices.length > 0) {
    logger.info(
      "BILLING_CYCLES",
      `📧 ${overdueInvoices.length} rappels d'impayés envoyés`,
    );
  }
}

/**
 * Crée des exports comptables fictifs
 */
async function createAccountingExports(
  prisma: PrismaClient,
  logger: SeedLogger,
  result: SeedResult,
): Promise<void> {
  // Créer des "exports" en ajoutant des métadonnées aux factures récentes
  const recentPaidInvoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      paidDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
      },
    },
    take: 20,
  });

  let exportCount = 0;
  for (const invoice of recentPaidInvoices) {
    try {
      // Ajouter des informations d'export comptable
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          notes: [
            invoice.notes || "",
            `Export comptable: ECO-EXPORT-${new Date().getFullYear()}-${String(exportCount + 1).padStart(4, "0")}`,
            `Date export: ${new Date().toISOString().split("T")[0]}`,
          ]
            .filter(Boolean)
            .join(" | "),
        },
      });

      exportCount++;
    } catch (error: any) {
      logger.error(
        "BILLING_CYCLES",
        `❌ Erreur export comptable: ${error.message}`,
      );
      result.errors++;
    }
  }

  if (exportCount > 0) {
    logger.info(
      "BILLING_CYCLES",
      `📊 ${exportCount} factures marquées pour export comptable`,
    );
    result.created += exportCount;
  }
}

/**
 * Calcule les revenus récurrents mensuels
 */
async function calculateMonthlyRecurringRevenue(
  prisma: PrismaClient,
): Promise<number> {
  // Calculer à partir des factures récentes de type commission
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const monthlyInvoices = await prisma.invoice.findMany({
    where: {
      status: "PAID",
      paidDate: { gte: lastMonth },
      invoiceType: {
        in: ["COMMISSION_DELIVERY", "COMMISSION_SERVICE", "COMMISSION_SALES"],
      },
    },
  });

  const totalRevenue = monthlyInvoices.reduce(
    (sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()),
    0,
  );

  // Projeter sur une base mensuelle
  return totalRevenue;
}

/**
 * Valide l'intégrité des cycles de facturation
 */
export async function validateBillingCycles(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des cycles de facturation...");

  let isValid = true;

  // Vérifier les factures récurrentes
  const recurringInvoices = await prisma.invoice.findMany({
    where: {
      invoiceType: {
        in: ["COMMISSION_DELIVERY", "COMMISSION_SERVICE", "COMMISSION_SALES"],
      },
    },
    include: { user: true, items: true },
  });

  if (recurringInvoices.length === 0) {
    logger.warning("VALIDATION", "⚠️ Aucune facture récurrente trouvée");
  } else {
    logger.success(
      "VALIDATION",
      `✅ ${recurringInvoices.length} factures récurrentes trouvées`,
    );
  }

  // Vérifier la cohérence des périodes de facturation
  const invalidPeriods = recurringInvoices.filter((invoice) => {
    if (!invoice.billingPeriodStart || !invoice.billingPeriodEnd) return true;
    return invoice.billingPeriodStart >= invoice.billingPeriodEnd;
  });

  if (invalidPeriods.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Toutes les périodes de facturation sont cohérentes",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${invalidPeriods.length} factures avec périodes incohérentes`,
    );
  }

  // Vérifier que les factures ont des lignes de détail
  const invoicesWithoutItems = recurringInvoices.filter(
    (inv) => inv.items.length === 0,
  );

  if (invoicesWithoutItems.length === 0) {
    logger.success(
      "VALIDATION",
      "✅ Toutes les factures ont des lignes de détail",
    );
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${invoicesWithoutItems.length} factures sans lignes de détail`,
    );
  }

  logger.success(
    "VALIDATION",
    "✅ Validation des cycles de facturation terminée",
  );
  return isValid;
}
