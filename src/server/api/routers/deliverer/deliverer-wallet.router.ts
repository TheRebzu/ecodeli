import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  TransactionType,
  TransactionStatus,
  WithdrawalStatus} from "@prisma/client";

/**
 * Router pour le portefeuille EcoDeli des livreurs selon le cahier des charges
 * Gère le solde, l'historique des gains et les demandes de virement
 */

// Schémas de validation
const withdrawalRequestSchema = z.object({ amount: z.number().min(10).max(5000), // Minimum 10€, maximum 5000€
  bankAccount: z.object({
    iban: z.string().min(15).max(34),
    bic: z.string().min(8).max(11).optional(),
    accountHolderName: z.string().min(2).max(100) }),
  reason: z.string().max(200).optional(),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL")});

const transactionFiltersSchema = z.object({ type: z.array(z.nativeEnum(TransactionType)).optional(),
  status: z.array(z.nativeEnum(TransactionStatus)).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

export const delivererWalletRouter = router({ /**
   * Obtenir le solde et les informations du portefeuille
   */
  getWalletInfo: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent accéder à leur portefeuille" });
    }

    try {
      // Récupérer ou créer le portefeuille
      const wallet = await ctx.db.wallet.findUnique({
        where: { userId: user.id }});

      if (!wallet) {
        wallet = await ctx.db.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            currency: "EUR"}});
      }

      // Calculer les statistiques du mois en cours
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const monthlyStats = await ctx.db.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
          status: "COMPLETED",
          createdAt: { gte }},
        sum: { amount },
        count: true});

      // Gains en attente (non encore payés)
      const pendingEarnings = await ctx.db.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
          status: "PENDING"},
        sum: { amount }});

      // Derniers virements
      const recentWithdrawals = await ctx.db.withdrawal.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          processedAt: true,
          bankAccount: true}});

      // Commission EcoDeli du mois
      const monthlyCommissions = await ctx.db.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "PLATFORM_FEE",
          status: "COMPLETED",
          createdAt: { gte }},
        sum: { amount }});

      return {
        success: true,
        data: {
          wallet: {
            ...wallet,
            balance: wallet.balance.toNumber()},
          monthlyStats: {
            earnings: monthlyStats.sum.amount?.toNumber() || 0,
            deliveries: monthlyStats.count || 0,
            commissions: Math.abs(
              monthlyCommissions.sum.amount?.toNumber() || 0,
            )},
          pendingEarnings: pendingEarnings.sum.amount?.toNumber() || 0,
          recentWithdrawals,
          canWithdraw: wallet.balance.toNumber() >= 10,
          nextPayoutDate: getNextPayoutDate()}};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du portefeuille" });
    }
  }),

  /**
   * Obtenir l'historique détaillé des transactions
   */
  getTransactionHistory: protectedProcedure
    .input(transactionFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent voir leur historique" });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id }});

        if (!wallet) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              offset: 0,
              limit: input.limit,
              hasMore: false}};
        }

        const where: any = {
          walletId: wallet.id,
          ...(input.type && { type: { in: input.type } }),
          ...(input.status && { status: { in: input.status } }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo }}),
          ...(input.minAmount && { amount: { gte: input.minAmount } }),
          ...(input.maxAmount && { amount: { lte: input.maxAmount } })};

        const transactions = await ctx.db.transaction.findMany({
          where,
          include: {
            // Relations pour avoir plus de contexte
            relatedDelivery: {
              select: {
                id: true,
                announcement: {
                  select: {
                    title: true,
                    pickupAddress: true,
                    deliveryAddress: true}}}}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.transaction.count({ where  });

        // Formater les transactions pour l'affichage
        const formattedTransactions = transactions.map((t) => ({ ...t,
          amount: t.amount.toNumber(),
          description: getTransactionDescription(t),
          displayColor: getTransactionColor(t.type),
          isCredit: ["EARNING", "DELIVERY_PAYOUT", "BONUS", "REFUND"].includes(
            t.type,
          ) }));

        return {
          success: true,
          data: formattedTransactions,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique" });
      }
    }),

  /**
   * Demander un virement
   */
  requestWithdrawal: protectedProcedure
    .input(withdrawalRequestSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent demander un virement" });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id }});

        if (!wallet) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Portefeuille non trouvé" });
        }

        // Vérifier le solde disponible
        if (wallet.balance.toNumber() < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Solde insuffisant" });
        }

        // Vérifier les limites (max 1 virement par jour)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayWithdrawals = await ctx.db.withdrawal.count({
          where: {
            walletId: wallet.id,
            createdAt: { gte },
            status: { not: "CANCELLED" }}});

        if (todayWithdrawals >= 1) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Maximum 1 virement par jour autorisé" });
        }

        // Calculer les frais de virement
        const withdrawalFee = 0;
        if (input.urgency === "URGENT") {
          withdrawalFee = Math.min(input.amount * 0.02, 5); // 2% max 5€
        } else {
          withdrawalFee = input.amount > 100 ? 0 : 1; // Gratuit au-dessus de 100€
        }

        const netAmount = input.amount - withdrawalFee;

        // Créer la demande de virement
        const withdrawal = await ctx.db.withdrawal.create({
          data: {
            walletId: wallet.id,
            amount: input.amount,
            fee: withdrawalFee,
            netAmount,
            currency: "EUR",
            bankAccount: input.bankAccount,
            reason: input.reason,
            urgency: input.urgency,
            status: "PENDING"}});

        // Réserver le montant (débit temporaire)
        await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: input.amount },
            reservedAmount: { increment: input.amount }}});

        // Créer la transaction de débit
        await ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAWAL",
            amount: -input.amount,
            description: `Virement ${input.urgency === "URGENT" ? "express" : "standard"}`,
            status: "PENDING",
            relatedWithdrawalId: withdrawal.id}});

        // Notification admin pour virement urgent
        if (input.urgency === "URGENT") {
          await ctx.db.notification.create({
            data: {
              userId: user.id, // Admin sera notifié via système
              title: "Virement urgent demandé",
              content: `${user.name} demande un virement urgent de ${input.amount}€`,
              type: "URGENT_WITHDRAWAL"}});
        }

        return {
          success: true,
          data: {
            ...withdrawal,
            amount: withdrawal.amount.toNumber(),
            fee: withdrawal.fee.toNumber(),
            netAmount: withdrawal.netAmount.toNumber()},
          message: `Demande de virement ${input.urgency === "URGENT" ? "express" : "standard"} créée. ${
            input.urgency === "URGENT"
              ? "Traitement sous 24h."
              : "Traitement sous 3-5 jours ouvrés."
          }`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de virement" });
      }
    }),

  /**
   * Annuler un virement en attente
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent annuler leurs virements" });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id }});

        if (!wallet) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Portefeuille non trouvé" });
        }

        const withdrawal = await ctx.db.withdrawal.findFirst({
          where: {
            id: input.withdrawalId,
            walletId: wallet.id,
            status: "PENDING"}});

        if (!withdrawal) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Virement non trouvé ou déjà traité" });
        }

        // Annuler le virement
        await ctx.db.withdrawal.update({
          where: { id: input.withdrawalId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date()}});

        // Remettre le montant dans le solde
        await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: withdrawal.amount },
            reservedAmount: { decrement: withdrawal.amount }}});

        // Annuler la transaction associée
        await ctx.db.transaction.updateMany({
          where: { relatedWithdrawalId: input.withdrawalId },
          data: { status: "CANCELLED" }});

        return {
          success: true,
          message: "Virement annulé avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation" });
      }
    }),

  /**
   * Obtenir l'historique des virements
   */
  getWithdrawalHistory: protectedProcedure
    .input(
      z.object({ status: z.array(z.nativeEnum(WithdrawalStatus)).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0) }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les livreurs peuvent voir leur historique de virements" });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id }});

        if (!wallet) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              offset: 0,
              limit: input.limit,
              hasMore: false}};
        }

        const where: any = {
          walletId: wallet.id,
          ...(input.status && { status: { in: input.status } })};

        const withdrawals = await ctx.db.withdrawal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.withdrawal.count({ where  });

        const formattedWithdrawals = withdrawals.map((w) => ({ ...w,
          amount: w.amount.toNumber(),
          fee: w.fee.toNumber(),
          netAmount: w.netAmount.toNumber(),
          statusLabel: getWithdrawalStatusLabel(w.status),
          estimatedArrival: getEstimatedArrival(w) }));

        return {
          success: true,
          data: formattedWithdrawals,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des virements" });
      }
    }),

  /**
   * Obtenir les statistiques de gains
   */
  getEarningsStats: protectedProcedure
    .input(
      z.object({ period: z.enum(["week", "month", "quarter", "year"]).default("month"),
        year: z.number().min(2020).max(new Date().getFullYear()).optional(),
        month: z.number().min(1).max(12).optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent voir leurs statistiques" });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id }});

        if (!wallet) {
          return {
            success: true,
            data: {
              totalEarnings: 0,
              totalCommissions: 0,
              deliveryCount: 0,
              averagePerDelivery: 0,
              chartData: [],
              comparison: { previous: 0, change: 0 }}};
        }

        // Calculer les dates selon la période
        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculatePeriodDates(input);

        // Gains de la période actuelle
        const currentEarnings = await ctx.db.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate }},
          sum: { amount },
          count: true});

        // Commissions de la période
        const currentCommissions = await ctx.db.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: "PLATFORM_FEE",
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate }},
          sum: { amount }});

        // Gains de la période précédente pour comparaison
        const previousEarnings = await ctx.db.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
            status: "COMPLETED",
            createdAt: { gte: previousStartDate, lte: previousEndDate }},
          sum: { amount }});

        // Données pour le graphique (par jour/semaine/mois selon la période)
        const chartData = await getEarningsChartData(
          wallet.id,
          startDate,
          endDate,
          input.period,
        );

        const totalEarnings = currentEarnings.sum.amount?.toNumber() || 0;
        const totalCommissions = Math.abs(
          currentCommissions.sum.amount?.toNumber() || 0,
        );
        const deliveryCount = currentEarnings.count || 0;
        const previousTotal = previousEarnings.sum.amount?.toNumber() || 0;
        const change =
          previousTotal > 0
            ? ((totalEarnings - previousTotal) / previousTotal) * 100
            : 0;

        return {
          success: true,
          data: {
            totalEarnings,
            totalCommissions,
            deliveryCount,
            averagePerDelivery:
              deliveryCount > 0 ? totalEarnings / deliveryCount : 0,
            chartData,
            comparison: {
              previous: previousTotal,
              change: Math.round(change * 100) / 100}}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    })});

// Helper functions
function getNextPayoutDate(): Date {
  const nextPayout = new Date();
  // Prochaine paie le 1er du mois suivant
  nextPayout.setMonth(nextPayout.getMonth() + 1, 1);
  nextPayout.setHours(0, 0, 0, 0);
  return nextPayout;
}

function getTransactionDescription(transaction: any): string {
  switch (transaction.type) {
    case "EARNING":
    case "DELIVERY_PAYOUT":
      return (
        transaction.relatedDelivery?.announcement?.title || "Gain de livraison"
      );
    case "PLATFORM_FEE":
      return "Commission EcoDeli";
    case "WITHDRAWAL":
      return "Virement bancaire";
    case "BONUS":
      return "Bonus performance";
    case "REFUND":
      return "Remboursement";
    default:
      return transaction.description || "Transaction";
  }
}

function getTransactionColor(type: TransactionType): string {
  switch (type) {
    case "EARNING":
    case "DELIVERY_PAYOUT":
    case "BONUS":
    case "REFUND":
      return "green";
    case "PLATFORM_FEE":
    case "WITHDRAWAL":
      return "red";
    default:
      return "gray";
  }
}

function getWithdrawalStatusLabel(status: WithdrawalStatus): string {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "PROCESSING":
      return "En cours";
    case "COMPLETED":
      return "Terminé";
    case "FAILED":
      return "Échec";
    case "CANCELLED":
      return "Annulé";
    case "REJECTED":
      return "Rejeté";
    default:
      return status;
  }
}

function getEstimatedArrival(withdrawal: any): Date | null {
  if (withdrawal.status !== "PENDING" && withdrawal.status !== "PROCESSING") {
    return null;
  }

  const created = new Date(withdrawal.createdAt);
  const createdDay = created.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
  
  // Calculer les jours de traitement selon le type de virement et la méthode
  let processingDays = 0;
  
  // Délais de traitement bancaire réels
  switch (withdrawal.method) {
    case "INSTANT_TRANSFER":
      // Virement instantané - quelques minutes à quelques heures
      processingDays = 0;
      break;
    case "SEPA_TRANSFER":
      // Virement SEPA - 1 jour ouvré
      processingDays = 1;
      break;
    case "INTERNATIONAL_TRANSFER":
      // Virement international - 3-5 jours ouvrés
      processingDays = withdrawal.urgency === "URGENT" ? 3 : 5;
      break;
    case "PAYPAL":
      // PayPal - instantané ou 1 jour selon le compte
      processingDays = 0;
      break;
    case "WISE":
      // Wise (ex-TransferWise) - quelques heures à 2 jours
      processingDays = withdrawal.urgency === "URGENT" ? 0 : 2;
      break;
    default:
      // Virement bancaire standard - 1-3 jours ouvrés
      processingDays = withdrawal.urgency === "URGENT" ? 1 : 3;
  }
  
  // Ajouter des jours supplémentaires selon le montant (contrôles de sécurité)
  if (withdrawal.amount > 5000) {
    processingDays += 1; // Contrôle de sécurité pour gros montants
  }
  if (withdrawal.amount > 10000) {
    processingDays += 1; // Contrôle additionnel pour très gros montants
  }
  
  // Calculer la date d'arrivée estimée en tenant compte des jours ouvrés
  const estimatedDate = new Date(created);
  let daysToAdd = processingDays;
  
  // Si on démarre un vendredi et qu'il faut plus d'un jour, décaler après le weekend
  if (createdDay === 5 && processingDays > 0) { // Vendredi
    daysToAdd += 2; // Ajouter le weekend
  }
  // Si on démarre un samedi
  else if (createdDay === 6 && processingDays > 0) { // Samedi
    daysToAdd += 1; // Ajouter le dimanche
  }
  
  // Ajouter les jours en évitant les weekends
  let currentDate = new Date(estimatedDate);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();
    
    // Compter seulement les jours ouvrés (lundi à vendredi)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      addedDays++;
    }
  }
  
  // Facteur saisonnier (périodes de forte charge bancaire)
  const month = currentDate.getMonth() + 1;
  if (month === 12 || month === 1) {
    // Décembre-Janvier : période de fin/début d'année
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Définir l'heure selon le type de virement
  if (withdrawal.method === "INSTANT_TRANSFER") {
    // Virement instantané - dans les 2 heures
    currentDate.setHours(currentDate.getHours() + 2);
  } else {
    // Autres virements - avant 16h le jour de réception
    currentDate.setHours(16, 0, 0, 0);
  }
  
  return currentDate;
}

function calculatePeriodDates(input: any) {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();
  const previousStartDate = new Date();
  const previousEndDate = new Date();

  switch (input.period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      previousStartDate.setDate(now.getDate() - 14);
      previousEndDate.setDate(now.getDate() - 7);
      break;
    case "month":
      if (input.year && input.month) {
        startDate = new Date(input.year, input.month - 1, 1);
        endDate = new Date(input.year, input.month, 0);
        previousStartDate = new Date(input.year, input.month - 2, 1);
        previousEndDate = new Date(input.year, input.month - 1, 0);
      } else {
        startDate.setMonth(now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        previousStartDate.setMonth(now.getMonth() - 1, 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate = new Date(startDate.getTime() - 1);
      }
      break;
    case "quarter":
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      previousStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      previousEndDate = new Date(now.getFullYear(), quarter * 3, 0);
      break;
    case "year":
      startDate = new Date(input.year || now.getFullYear(), 0, 1);
      endDate = new Date((input.year || now.getFullYear()) + 1, 0, 0);
      previousStartDate = new Date((input.year || now.getFullYear()) - 1, 0, 1);
      previousEndDate = new Date(input.year || now.getFullYear(), 0, 0);
      break;
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

async function getEarningsChartData(
  walletId: string,
  startDate: Date,
  endDate: Date,
  period: string,
  ctx: any
) {
  try {
    // Récupérer toutes les transactions de gain pour la période
    const earnings = await ctx.db.walletTransaction.findMany({
      where: {
        walletId,
        type: {
          in: ['EARNING', 'DELIVERY_PAYOUT', 'BONUS']
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Générer les intervalles selon la période
    const chartData = [];
    let currentDate = new Date(startDate);
    
    // Déterminer l'incrément selon la période
    const incrementFunction = getDateIncrement(period);
    const formatFunction = getDateFormat(period);
    
    while (currentDate <= endDate) {
      const intervalStart = new Date(currentDate);
      const intervalEnd = new Date(currentDate);
      incrementFunction(intervalEnd);
      
      // Calculer les gains pour cet intervalle
      const intervalEarnings = earnings.filter(earning => {
        const earningDate = new Date(earning.createdAt);
        return earningDate >= intervalStart && earningDate < intervalEnd;
      });
      
      // Calculer les métriques
      const totalAmount = intervalEarnings.reduce((sum, earning) => sum + earning.amount, 0);
      const totalTransactions = intervalEarnings.length;
      const deliveryPayouts = intervalEarnings.filter(e => e.type === 'DELIVERY_PAYOUT').length;
      const bonuses = intervalEarnings.filter(e => e.type === 'BONUS').reduce((sum, e) => sum + e.amount, 0);
      
      chartData.push({
        date: formatFunction(intervalStart),
        rawDate: intervalStart,
        totalAmount: totalAmount / 100, // Convertir en euros
        totalTransactions,
        deliveryCount: deliveryPayouts,
        bonusAmount: bonuses / 100, // Convertir en euros
        averagePerDelivery: deliveryPayouts > 0 ? (totalAmount - bonuses) / deliveryPayouts / 100 : 0
      });
      
      currentDate = intervalEnd;
    }
    
    // Ajouter des métriques de comparaison
    if (chartData.length > 1) {
      for (let i = 1; i < chartData.length; i++) {
        const current = chartData[i];
        const previous = chartData[i - 1];
        
        current.growthRate = previous.totalAmount > 0 
          ? ((current.totalAmount - previous.totalAmount) / previous.totalAmount) * 100 
          : 0;
          
        current.trend = current.growthRate > 5 ? 'up' : current.growthRate < -5 ? 'down' : 'stable';
      }
    }
    
    return chartData;
    
  } catch (error) {
    console.error('Erreur lors de la génération des données graphique:', error);
    return [];
  }
}

function getDateIncrement(period: string) {
  switch (period) {
    case 'week':
      return (date: Date) => date.setDate(date.getDate() + 1); // Par jour pour une semaine
    case 'month':
      return (date: Date) => date.setDate(date.getDate() + 1); // Par jour pour un mois
    case 'quarter':
      return (date: Date) => date.setDate(date.getDate() + 7); // Par semaine pour un trimestre
    case 'year':
      return (date: Date) => date.setMonth(date.getMonth() + 1); // Par mois pour une année
    default:
      return (date: Date) => date.setDate(date.getDate() + 1);
  }
}

function getDateFormat(period: string) {
  switch (period) {
    case 'week':
    case 'month':
      return (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD
    case 'quarter':
      return (date: Date) => {
        const weekNumber = Math.ceil(date.getDate() / 7);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-S${weekNumber}`;
      };
    case 'year':
      return (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return (date: Date) => date.toISOString().split('T')[0];
  }
}
