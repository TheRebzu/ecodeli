import {
  PrismaClient,
  UserRole,
  TransactionType,
  TransactionStatus,
} from "@prisma/client";
import { SeedLogger } from "../utils/seed-logger";
import {
  SeedResult,
  SeedOptions,
  getRandomElement,
  getRandomDate,
} from "../utils/seed-helpers";
import { faker } from "@faker-js/faker";

/**
 * Interface pour définir un wallet
 */
interface WalletData {
  userId: string;
  balance: number;
  accountVerified: boolean;
  isActive: boolean;
  totalEarned: number;
  totalWithdrawn: number;
}

/**
 * Interface pour définir une transaction de wallet
 */
interface WalletTransactionData {
  walletId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  balanceAfter: number;
  createdAt: Date;
}

/**
 * Seed des portefeuilles EcoDeli
 * Crée des wallets pour livreurs et prestataires avec soldes réalistes
 */
export async function seedWallets(
  prisma: PrismaClient,
  logger: SeedLogger,
  options: SeedOptions = {},
): Promise<SeedResult> {
  logger.startSeed("WALLETS");

  const result: SeedResult = {
    entity: "wallets",
    created: 0,
    skipped: 0,
    errors: 0,
  };

  // Récupérer les livreurs et prestataires (qui ont des wallets)
  const eligibleUsers = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.DELIVERER, UserRole.PROVIDER] },
      status: "ACTIVE",
    },
    include: {
      deliverer: true,
      provider: true,
    },
  });

  if (eligibleUsers.length === 0) {
    logger.warning(
      "WALLETS",
      "Aucun livreur/prestataire trouvé - exécuter d'abord les seeds utilisateurs",
    );
    return result;
  }

  // Trouver Marie Laurent pour son wallet spécifique
  const marieLaurent = await prisma.user.findUnique({
    where: { email: "marie.laurent@orange.fr" },
    include: { deliverer: true },
  });

  // Récupérer les livraisons de Marie pour calculer ses gains
  const marieDeliveries = await prisma.delivery.findMany({
    where: { delivererId: marieLaurent?.id },
    include: { announcement: true },
  });

  // Vérifier si des wallets existent déjà
  const existingWallets = await prisma.wallet.count();

  if (existingWallets > 0 && !options.force) {
    logger.warning(
      "WALLETS",
      `${existingWallets} wallets déjà présents - utiliser force:true pour recréer`,
    );
    result.skipped = existingWallets;
    return result;
  }

  // Nettoyer si force activé
  if (options.force) {
    await prisma.walletTransaction.deleteMany({});
    await prisma.wallet.deleteMany({});
    logger.database("NETTOYAGE", "wallets et transactions", 0);
  }

  // Paramètres financiers réalistes
  const AVERAGE_MONTHLY_EARNINGS = {
    [UserRole.DELIVERER]: { min: 800, max: 2500 }, // Livreurs
    [UserRole.PROVIDER]: { min: 1200, max: 4000 }, // Prestataires
  };

  const WITHDRAWAL_PATTERNS = {
    weekly: 0.4, // 40% retirent chaque semaine
    biweekly: 0.35, // 35% toutes les 2 semaines
    monthly: 0.25, // 25% une fois par mois
  };

  let totalWallets = 0;
  let totalTransactions = 0;

  for (const user of eligibleUsers) {
    try {
      logger.progress(
        "WALLETS",
        totalWallets + 1,
        eligibleUsers.length,
        `Création wallet: ${user.name}`,
      );

      // Déterminer le profil du wallet selon le rôle et statut
      const isVerified =
        user.role === UserRole.DELIVERER
          ? user.deliverer?.isVerified || false
          : user.provider?.isVerified || false;

      const earningRange =
        AVERAGE_MONTHLY_EARNINGS[
          user.role as keyof typeof AVERAGE_MONTHLY_EARNINGS
        ];

      // Calculer les gains historiques (6 derniers mois)
      const monthsActive = faker.number.int({ min: 1, max: 6 });
      const avgMonthlyEarnings = faker.number.float({
        min: earningRange.min,
        max: earningRange.max,
        fractionDigits: 2,
      });

      const totalEarned = avgMonthlyEarnings * monthsActive;

      // Déterminer le pattern de retrait
      const withdrawalPattern = getRandomElement(
        Object.keys(WITHDRAWAL_PATTERNS),
      );
      const withdrawalFrequency =
        WITHDRAWAL_PATTERNS[
          withdrawalPattern as keyof typeof WITHDRAWAL_PATTERNS
        ];

      // Calculer les retraits effectués (80-95% des gains)
      const withdrawalRate = faker.number.float({ min: 0.8, max: 0.95 });
      const totalWithdrawn = totalEarned * withdrawalRate;

      // Balance actuelle = gains - retraits + quelques gains récents non retirés
      const recentEarnings = faker.number.float({
        min: earningRange.min * 0.1,
        max: earningRange.max * 0.3,
        fractionDigits: 2,
      });

      const currentBalance = totalEarned - totalWithdrawn + recentEarnings;

      // Créer le wallet
      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: Math.max(0, currentBalance), // Éviter les soldes négatifs
          currency: "EUR",
          isActive: true,
          accountVerified: isVerified,
          accountType:
            user.role === UserRole.DELIVERER ? "INDIVIDUAL" : "BUSINESS",
          minimumWithdrawalAmount: 10,
          automaticWithdrawal: Math.random() < withdrawalFrequency,
          withdrawalThreshold: faker.number.float({ min: 50, max: 200 }),
          withdrawalDay: faker.number.int({ min: 1, max: 28 }),
          totalEarned: totalEarned,
          totalWithdrawn: totalWithdrawn,
          earningsThisMonth: faker.number.float({
            min: earningRange.min * 0.6,
            max: earningRange.max * 1.2,
            fractionDigits: 2,
          }),
          earningsLastMonth: faker.number.float({
            min: earningRange.min * 0.8,
            max: earningRange.max,
            fractionDigits: 2,
          }),
          lastTransactionAt: getRandomDate(1, 7), // Transaction dans la semaine
          lastWithdrawalAt: withdrawalRate > 0.85 ? getRandomDate(3, 14) : null,
          notificationThreshold: 500,
          notificationsEnabled: true,
          stripeConnectAccountId: isVerified
            ? `acct_${faker.string.alphanumeric(16)}`
            : null,
          taxReportingEnabled: user.role === UserRole.PROVIDER,
        },
      });

      totalWallets++;
      result.created++;

      // Générer l'historique de transactions (6 derniers mois)
      const transactions = await generateWalletTransactions(
        wallet.id,
        totalEarned,
        totalWithdrawn,
        currentBalance,
        user.role,
        monthsActive,
      );

      for (const transactionData of transactions) {
        try {
          await prisma.walletTransaction.create({
            data: {
              walletId: transactionData.walletId,
              amount: transactionData.amount,
              currency: "EUR",
              type: transactionData.type,
              status: transactionData.status,
              description: transactionData.description,
              balanceAfter: transactionData.balanceAfter,
              createdAt: transactionData.createdAt,
              completedAt:
                transactionData.status === TransactionStatus.COMPLETED
                  ? transactionData.createdAt
                  : null,
              commissionRate:
                transactionData.type === TransactionType.EARNING
                  ? faker.number.float({ min: 0.05, max: 0.15 })
                  : null,
              isSystemGenerated: true,
              taxRate: user.role === UserRole.PROVIDER ? 0.2 : null,
              reportingCategory: getCategoryForTransaction(
                transactionData.type,
                user.role,
              ),
            },
          });

          totalTransactions++;
        } catch (error: any) {
          logger.error(
            "WALLETS",
            `❌ Erreur création transaction pour ${user.name}: ${error.message}`,
          );
          result.errors++;
        }
      }
    } catch (error: any) {
      logger.error(
        "WALLETS",
        `❌ Erreur création wallet pour ${user.name}: ${error.message}`,
      );
      result.errors++;
    }
  }

  // 1. CRÉER LE WALLET SPÉCIFIQUE DE MARIE LAURENT
  if (marieLaurent && marieDeliveries.length > 0) {
    try {
      logger.progress(
        "WALLETS",
        1,
        1,
        "Création wallet Marie Laurent avec historique",
      );

      // Calculer les gains de Marie
      const completedDeliveries = marieDeliveries.filter(
        (d) => d.status === "DELIVERED",
      );
      const activeDelivery = marieDeliveries.find(
        (d) => d.status === "IN_TRANSIT",
      );

      // Gains des livraisons terminées (sans commission EcoDeli)
      const completedEarnings = completedDeliveries.reduce(
        (sum, d) => sum + d.price,
        0,
      ); // 135€

      // Gain en attente pour la livraison active (sera crédité après livraison)
      const pendingEarnings = activeDelivery ? activeDelivery.price : 0; // 45€

      // Balance actuelle = gains terminés - retraits effectués + solde résiduel
      const totalWithdrawn = completedEarnings * 0.85; // 85% retirés
      const currentBalance = completedEarnings - totalWithdrawn + 15.5; // Solde résiduel

      const marieWallet = await prisma.wallet.create({
        data: {
          userId: marieLaurent.id,
          balance: currentBalance,
          currency: "EUR",
          isActive: true,
          accountVerified: marieLaurent.deliverer?.isVerified || true,
          accountType: "INDIVIDUAL",
          minimumWithdrawalAmount: 10,
          automaticWithdrawal: false,
          withdrawalThreshold: 100,
          withdrawalDay: 15,
          totalEarned: completedEarnings,
          totalWithdrawn: totalWithdrawn,
          earningsThisMonth: completedDeliveries
            .filter(
              (d) =>
                d.completionTime &&
                d.completionTime >=
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            )
            .reduce((sum, d) => sum + d.price, 0),
          earningsLastMonth: 0,
          lastTransactionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours
          lastWithdrawalAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Il y a 1 semaine
          notificationThreshold: 50,
          notificationsEnabled: true,
          stripeConnectAccountId: `acct_marie_laurent_123`,
          taxReportingEnabled: false,
        },
      });

      // Créer les transactions spécifiques de Marie
      let runningBalance = 0;

      // Transactions pour chaque livraison terminée
      for (const delivery of completedDeliveries) {
        runningBalance += delivery.price;

        await prisma.walletTransaction.create({
          data: {
            walletId: marieWallet.id,
            amount: delivery.price,
            currency: "EUR",
            type: TransactionType.EARNING,
            status: TransactionStatus.COMPLETED,
            description: `Gain livraison ${delivery.trackingCode}`,
            balanceAfter: runningBalance,
            createdAt: delivery.completionTime || new Date(),
            completedAt: delivery.completionTime || new Date(),
            commissionRate: 0.1,
            isSystemGenerated: true,
            reportingCategory: "DELIVERY_EARNINGS",
          },
        });
      }

      // Transaction de retrait (85% des gains)
      const withdrawalAmount = totalWithdrawn;
      runningBalance -= withdrawalAmount;

      await prisma.walletTransaction.create({
        data: {
          walletId: marieWallet.id,
          amount: -withdrawalAmount,
          currency: "EUR",
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.COMPLETED,
          description: "Retrait vers compte bancaire",
          balanceAfter: runningBalance,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          isSystemGenerated: true,
          reportingCategory: "WITHDRAWAL",
        },
      });

      // Ajustement pour le solde actuel
      runningBalance = currentBalance;

      result.created++;
      logger.success(
        "WALLETS",
        `✅ Wallet Marie Laurent créé (${currentBalance.toFixed(2)}€ disponible, ${pendingEarnings}€ en attente)`,
      );
    } catch (error: any) {
      logger.error(
        "WALLETS",
        `❌ Erreur création wallet Marie Laurent: ${error.message}`,
      );
      result.errors++;
    }
  }

  // Validation des wallets créés
  const finalWallets = await prisma.wallet.findMany({
    include: {
      user: true,
      transactions: true,
    },
  });

  if (finalWallets.length >= totalWallets - result.errors) {
    logger.validation(
      "WALLETS",
      "PASSED",
      `${finalWallets.length} wallets créés avec succès`,
    );
  } else {
    logger.validation(
      "WALLETS",
      "FAILED",
      `Attendu: ${totalWallets}, Créé: ${finalWallets.length}`,
    );
  }

  // Statistiques par rôle
  const byRole = finalWallets.reduce((acc: Record<string, number>, wallet) => {
    const role = wallet.user.role;
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  logger.info("WALLETS", `👥 Wallets par rôle: ${JSON.stringify(byRole)}`);

  // Statistiques financières
  const totalBalance = finalWallets.reduce(
    (sum, wallet) => sum + parseFloat(wallet.balance.toString()),
    0,
  );
  const avgBalance = totalBalance / finalWallets.length;

  logger.info("WALLETS", `💰 Balance totale: ${totalBalance.toFixed(2)} EUR`);
  logger.info("WALLETS", `📊 Balance moyenne: ${avgBalance.toFixed(2)} EUR`);

  // Transactions par type
  const allTransactions = await prisma.walletTransaction.findMany();
  const transactionsByType = allTransactions.reduce(
    (acc: Record<string, number>, tx) => {
      acc[tx.type] = (acc[tx.type] || 0) + 1;
      return acc;
    },
    {},
  );

  logger.info("WALLETS", `🔄 Transactions: ${totalTransactions} créées`);
  logger.info("WALLETS", `📈 Par type: ${JSON.stringify(transactionsByType)}`);

  // Wallets vérifiés
  const verifiedWallets = finalWallets.filter((w) => w.accountVerified);
  const verificationRate = Math.round(
    (verifiedWallets.length / finalWallets.length) * 100,
  );
  logger.info(
    "WALLETS",
    `✅ Taux de vérification: ${verificationRate}% (${verifiedWallets.length}/${finalWallets.length})`,
  );

  logger.endSeed("WALLETS", result);
  return result;
}

/**
 * Génère l'historique de transactions pour un wallet
 */
async function generateWalletTransactions(
  walletId: string,
  totalEarned: number,
  totalWithdrawn: number,
  currentBalance: number,
  userRole: UserRole,
  monthsActive: number,
): Promise<WalletTransactionData[]> {
  const transactions: WalletTransactionData[] = [];

  // Calculer le nombre de transactions selon l'activité
  const avgTransactionsPerMonth =
    userRole === UserRole.DELIVERER
      ? faker.number.int({ min: 20, max: 60 }) // Livreurs plus actifs
      : faker.number.int({ min: 8, max: 25 }); // Prestataires moins fréquents

  const totalTransactions = avgTransactionsPerMonth * monthsActive;

  // Distribution des types de transactions
  const earningsCount = Math.floor(totalTransactions * 0.75); // 75% gains
  const withdrawalsCount = Math.floor(totalTransactions * 0.2); // 20% retraits
  const othersCount = totalTransactions - earningsCount - withdrawalsCount; // 5% autres

  let runningBalance = 0;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsActive);

  // Générer les gains (chronologiquement)
  const avgEarningAmount = totalEarned / earningsCount;
  for (let i = 0; i < earningsCount; i++) {
    const amount = faker.number.float({
      min: avgEarningAmount * 0.3,
      max: avgEarningAmount * 1.7,
      fractionDigits: 2,
    });

    runningBalance += amount;

    const transactionDate = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    transactions.push({
      walletId,
      amount,
      type: TransactionType.EARNING,
      status: TransactionStatus.COMPLETED,
      description: generateEarningDescription(userRole),
      balanceAfter: runningBalance,
      createdAt: transactionDate,
    });
  }

  // Générer les retraits (après certains gains)
  const avgWithdrawalAmount = totalWithdrawn / withdrawalsCount;
  for (let i = 0; i < withdrawalsCount; i++) {
    const amount = faker.number.float({
      min: avgWithdrawalAmount * 0.5,
      max: avgWithdrawalAmount * 1.5,
      fractionDigits: 2,
    });

    // S'assurer que le retrait ne dépasse pas la balance
    const actualAmount = Math.min(amount, runningBalance * 0.9);
    runningBalance -= actualAmount;

    const transactionDate = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    transactions.push({
      walletId,
      amount: -actualAmount, // Négatif pour les retraits
      type: TransactionType.WITHDRAWAL,
              status: Math.random() < 0.95
        ? TransactionStatus.COMPLETED
        : TransactionStatus.PENDING,
      description: "Retrait vers compte bancaire",
      balanceAfter: runningBalance,
      createdAt: transactionDate,
    });
  }

  // Générer d'autres transactions (frais, bonus, corrections)
  for (let i = 0; i < othersCount; i++) {
          const isBonus = Math.random() < 0.7;
    const amount = isBonus
      ? faker.number.float({ min: 5, max: 50, fractionDigits: 2 })
      : -faker.number.float({ min: 1, max: 10, fractionDigits: 2 });

    runningBalance += amount;

    const transactionDate = faker.date.between({
      from: startDate,
      to: new Date(),
    });

    transactions.push({
      walletId,
      amount,
      type: isBonus ? TransactionType.BONUS : TransactionType.SERVICE_FEE,
      status: TransactionStatus.COMPLETED,
      description: isBonus ? "Bonus de performance" : "Frais de service",
      balanceAfter: runningBalance,
      createdAt: transactionDate,
    });
  }

  // Trier par date
  transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Recalculer les balances progressives
  let balance = 0;
  transactions.forEach((tx) => {
    balance += tx.amount;
    tx.balanceAfter = balance;
  });

  return transactions;
}

/**
 * Génère une description réaliste pour un gain
 */
function generateEarningDescription(userRole: UserRole): string {
  if (userRole === UserRole.DELIVERER) {
    const descriptions = [
      "Livraison Paris 15e - Boulangerie Dupont",
      "Course alimentaire Monoprix - Client premium",
      "Livraison express centre-ville",
      "Transport colis - Zone prioritaire",
      "Livraison restaurant - Weekend",
      "Course pharmacie - Urgence",
      "Livraison meuble - Transport lourd",
      "Course aéroport - Longue distance",
    ];
    return getRandomElement(descriptions);
  } else {
    const descriptions = [
      "Service électricité - Installation prise",
      "Intervention plomberie - Réparation fuite",
      "Service informatique - Dépannage PC",
      "Nettoyage résidentiel - Appartement 3P",
      "Jardinage - Taille haie et tonte",
      "Service climatisation - Maintenance",
      "Réparation électroménager - Lave-linge",
      "Service peinture - Chambre 15m²",
    ];
    return getRandomElement(descriptions);
  }
}

/**
 * Détermine la catégorie de reporting pour une transaction
 */
function getCategoryForTransaction(
  type: TransactionType,
  userRole: UserRole,
): string {
  const categories: Record<TransactionType, string> = {
    [TransactionType.EARNING]:
      userRole === UserRole.DELIVERER ? "DELIVERY_INCOME" : "SERVICE_INCOME",
    [TransactionType.WITHDRAWAL]: "WITHDRAWAL",
    [TransactionType.BONUS]: "BONUS_INCOME",
    [TransactionType.SERVICE_FEE]: "SERVICE_FEE",
    [TransactionType.REFUND]: "REFUND",
    [TransactionType.DEPOSIT]: "DEPOSIT",
    [TransactionType.TRANSFER]: "TRANSFER",
    [TransactionType.PLATFORM_FEE]: "PLATFORM_FEE",
    [TransactionType.COMMISSION]: "COMMISSION",
    [TransactionType.ADJUSTMENT]: "ADJUSTMENT",
    [TransactionType.TAX]: "TAX",
    [TransactionType.DELIVERY_PAYOUT]: "DELIVERY_PAYOUT",
    [TransactionType.SERVICE_PAYOUT]: "SERVICE_PAYOUT",
    [TransactionType.SUBSCRIPTION_PAYMENT]: "SUBSCRIPTION_PAYMENT",
    [TransactionType.MONTHLY_FEE]: "MONTHLY_FEE",
  };

  return categories[type] || "OTHER";
}

/**
 * Valide l'intégrité des wallets
 */
export async function validateWallets(
  prisma: PrismaClient,
  logger: SeedLogger,
): Promise<boolean> {
  logger.info("VALIDATION", "🔍 Validation des wallets...");

  let isValid = true;

  // Vérifier les wallets
  const wallets = await prisma.wallet.findMany({
    include: {
      user: true,
      transactions: true,
    },
  });

  if (wallets.length === 0) {
    logger.error("VALIDATION", "❌ Aucun wallet trouvé");
    isValid = false;
  } else {
    logger.success("VALIDATION", `✅ ${wallets.length} wallets trouvés`);
  }

  // Vérifier la cohérence des balances
  let balanceErrors = 0;
  for (const wallet of wallets) {
    const calculatedBalance = wallet.transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amount.toString()),
      0,
    );

    const actualBalance = parseFloat(wallet.balance.toString());
    const diff = Math.abs(calculatedBalance - actualBalance);

    if (diff > 0.01) {
      // Tolérance de 1 centime
      balanceErrors++;
    }
  }

  if (balanceErrors === 0) {
    logger.success("VALIDATION", "✅ Toutes les balances sont cohérentes");
  } else {
    logger.warning(
      "VALIDATION",
      `⚠️ ${balanceErrors} wallets avec balance incohérente`,
    );
  }

  // Vérifier que les comptes vérifiés ont des Stripe IDs
  const verifiedWithoutStripe = wallets.filter(
    (w) => w.accountVerified && !w.stripeConnectAccountId,
  );

  if (verifiedWithoutStripe.length > 0) {
    logger.warning(
      "VALIDATION",
      `⚠️ ${verifiedWithoutStripe.length} comptes vérifiés sans Stripe Connect`,
    );
  }

  logger.success("VALIDATION", "✅ Validation des wallets terminée");
  return isValid;
}
