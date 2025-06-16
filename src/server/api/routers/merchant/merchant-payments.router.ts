import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus, PaymentMethod, WithdrawalStatus } from "@prisma/client";

/**
 * Router pour la gestion des paiements et revenus des commerçants
 * Virements, wallet, commissions, withdrawals selon le cahier des charges
 */

// Schémas de validation
const paymentFiltersSchema = z.object({ status: z.nativeEnum(PaymentStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  orderId: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  sortBy: z.enum(["createdAt", "amount", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0) });

const withdrawalRequestSchema = z.object({ amount: z.number().min(10).max(10000),
  bankAccount: z.object({
    iban: z.string().min(15).max(34),
    bic: z.string().min(8).max(11),
    accountHolder: z.string().min(2).max(100) }),
  reason: z.string().max(500).optional(),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL")});

const paymentStatsSchema = z.object({ period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  groupBy: z.enum(["day", "week", "month"]).default("day") });

export const merchantPaymentsRouter = router({ /**
   * Obtenir le wallet et solde du commerçant
   */
  getWallet: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "MERCHANT") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les commerçants peuvent consulter leur wallet" });
    }

    try {
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId: user.id }});

      if (!merchant) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Profil commerçant non trouvé" });
      }

      // Récupérer ou créer le wallet
      const wallet = await ctx.db.merchantWallet.findUnique({
        where: { merchantId: merchant.id },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10},
          pendingWithdrawals: {
            where: { status: { in: ["PENDING", "PROCESSING"] } }}}});

      if (!wallet) {
        wallet = await ctx.db.merchantWallet.create({
          data: {
            merchantId: merchant.id,
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0},
          include: {
            transactions: true,
            pendingWithdrawals: true}});
      }

      // Calculer les revenus du mois
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyEarnings = await ctx.db.payment.aggregate({
        where: {
          merchantId: merchant.id,
          status: "COMPLETED",
          createdAt: { gte }},
        sum: { amount }});

      // Prochaine date de virement (tous les 15 du mois)
      const nextTransferDate = new Date();
      if (nextTransferDate.getDate() > 15) {
        nextTransferDate.setMonth(nextTransferDate.getMonth() + 1);
      }
      nextTransferDate.setDate(15);

      return {
        success: true,
        data: {
          wallet: {
            ...wallet,
            balance: wallet.balance.toNumber(),
            pendingBalance: wallet.pendingBalance.toNumber(),
            totalEarned: wallet.totalEarned.toNumber(),
            totalWithdrawn: wallet.totalWithdrawn.toNumber()},
          monthlyEarnings: monthlyEarnings.sum.amount || 0,
          nextTransferDate,
          canWithdraw: wallet.balance.toNumber() >= 10,
          maxWithdrawal: wallet.balance.toNumber()}};
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du wallet" });
    }
  }),

  /**
   * Obtenir l'historique des paiements reçus
   */
  getPayments: protectedProcedure
    .input(paymentFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs paiements" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Construire les filtres
        const where: any = {
          merchantId: merchant.id,
          ...(input.status && { status: input.status }),
          ...(input.method && { method: input.method }),
          ...(input.orderId && { orderId: input.orderId }),
          ...(input.minAmount && { amount: { gte: input.minAmount } }),
          ...(input.maxAmount && { amount: { lte: input.maxAmount } }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo }})};

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [payments, totalCount] = await Promise.all([
          ctx.db.payment.findMany({
            where,
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  client: {
                    select: {
                      name: true,
                      email: true}}}},
              refunds: {
                select: {
                  id: true,
                  amount: true,
                  reason: true,
                  createdAt: true}}},
            orderBy,
            skip: input.offset,
            take: input.limit}),
          ctx.db.payment.count({ where  })]);

        // Formatter les données
        const formattedPayments = payments.map((payment) => ({ ...payment,
          amount: payment.amount.toNumber(),
          netAmount: payment.netAmount?.toNumber(),
          feeAmount: payment.feeAmount?.toNumber(),
          refundedAmount: payment.refunds.reduce(
            (sum, refund) => sum + refund.amount.toNumber(),
            0,
          ),
          customerName: payment.order?.client?.name || "Client anonyme",
          orderNumber: payment.order?.orderNumber }));

        return {
          success: true,
          data: formattedPayments,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des paiements" });
      }
    }),

  /**
   * Demander un retrait de fonds
   */
  requestWithdrawal: protectedProcedure
    .input(withdrawalRequestSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent demander des retraits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Vérifier le wallet
        const wallet = await ctx.db.merchantWallet.findUnique({
          where: { merchantId: merchant.id }});

        if (!wallet) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Wallet non trouvé" });
        }

        // Vérifier le solde
        if (wallet.balance.toNumber() < input.amount) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Solde insuffisant" });
        }

        // Vérifier les limites (max 3 retraits en attente)
        const pendingWithdrawals = await ctx.db.merchantWithdrawal.count({
          where: {
            merchantId: merchant.id,
            status: { in: ["PENDING", "PROCESSING"] }}});

        if (pendingWithdrawals >= 3) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Limite de retraits en attente atteinte (3 max)" });
        }

        // Calculer les frais (2% pour urgence, 1% normal)
        const feeRate = input.urgency === "URGENT" ? 0.02 : 0.01;
        const feeAmount = input.amount * feeRate;
        const netAmount = input.amount - feeAmount;

        // Créer la demande de retrait
        const withdrawal = await ctx.db.merchantWithdrawal.create({
          data: {
            merchantId: merchant.id,
            amount: input.amount,
            feeAmount,
            netAmount,
            bankAccount: input.bankAccount,
            reason: input.reason,
            urgency: input.urgency,
            status: "PENDING"}});

        // Déduire du solde disponible et ajouter au pending
        await ctx.db.merchantWallet.update({
          where: { merchantId: merchant.id },
          data: {
            balance: { decrement: input.amount },
            pendingBalance: { increment: input.amount }}});

        // Créer une transaction wallet
        await ctx.db.merchantWalletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAWAL_REQUEST",
            amount: -input.amount,
            description: `Demande de retrait ${input.urgency}`,
            relatedId: withdrawal.id}});

        return {
          success: true,
          data: {
            ...withdrawal,
            amount: withdrawal.amount.toNumber(),
            feeAmount: withdrawal.feeAmount.toNumber(),
            netAmount: withdrawal.netAmount.toNumber()},
          message:
            input.urgency === "URGENT"
              ? "Demande de retrait urgent créée (traitement sous 24h)"
              : "Demande de retrait créée (traitement sous 3-5 jours)"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de retrait" });
      }
    }),

  /**
   * Obtenir l'historique des retraits
   */
  getWithdrawals: protectedProcedure
    .input(
      z.object({ status: z.nativeEnum(WithdrawalStatus).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0) }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent consulter leurs retraits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const where: any = {
          merchantId: merchant.id,
          ...(input.status && { status: input.status })};

        const [withdrawals, totalCount] = await Promise.all([
          ctx.db.merchantWithdrawal.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: input.offset,
            take: input.limit}),
          ctx.db.merchantWithdrawal.count({ where  })]);

        // Formatter les données
        const formattedWithdrawals = withdrawals.map((withdrawal) => ({ ...withdrawal,
          amount: withdrawal.amount.toNumber(),
          feeAmount: withdrawal.feeAmount.toNumber(),
          netAmount: withdrawal.netAmount.toNumber(),
          canCancel: withdrawal.status === "PENDING" }));

        return {
          success: true,
          data: formattedWithdrawals,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des retraits" });
      }
    }),

  /**
   * Annuler une demande de retrait en attente
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les commerçants peuvent annuler leurs retraits" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        const withdrawal = await ctx.db.merchantWithdrawal.findFirst({
          where: {
            id: input.withdrawalId,
            merchantId: merchant.id,
            status: "PENDING"}});

        if (!withdrawal) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Retrait non trouvé ou ne peut pas être annulé" });
        }

        // Transaction pour annuler le retrait
        const result = await ctx.db.$transaction(async (tx) => {
          // Annuler le retrait
          const cancelledWithdrawal = await tx.merchantWithdrawal.update({
            where: { id: input.withdrawalId },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date()}});

          // Remettre les fonds dans le wallet
          await tx.merchantWallet.update({
            where: { merchantId: merchant.id },
            data: {
              balance: { increment: withdrawal.amount.toNumber() },
              pendingBalance: { decrement: withdrawal.amount.toNumber() }}});

          // Créer une transaction wallet
          const wallet = await tx.merchantWallet.findUnique({
            where: { merchantId: merchant.id }});

          await tx.merchantWalletTransaction.create({
            data: {
              walletId: wallet!.id,
              type: "WITHDRAWAL_CANCELLED",
              amount: withdrawal.amount.toNumber(),
              description: "Annulation demande de retrait",
              relatedId: withdrawal.id}});

          return cancelledWithdrawal;
        });

        return {
          success: true,
          data: result,
          message: "Demande de retrait annulée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation du retrait" });
      }
    }),

  /**
   * Obtenir les statistiques de paiements
   */
  getPaymentStats: protectedProcedure
    .input(paymentStatsSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "MERCHANT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId: user.id }});

        if (!merchant) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Profil commerçant non trouvé" });
        }

        // Calculer les dates
        const now = new Date();
        let startDate: Date;

        switch (input.period) {
          case "WEEK":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "MONTH":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "QUARTER":
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          case "YEAR":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        // Statistiques générales
        const [totalRevenue, totalPayments, avgPayment, byMethod] =
          await Promise.all([
            ctx.db.payment.aggregate({
              where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { gte }},
              sum: { amount }}),
            ctx.db.payment.count({
              where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { gte }}}),
            ctx.db.payment.aggregate({
              where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { gte }},
              avg: { amount }}),
            ctx.db.payment.groupBy({
              by: ["method"],
              where: {
                merchantId: merchant.id,
                status: "COMPLETED",
                createdAt: { gte }},
              sum: { amount },
              count: true})]);

        // Timeline des paiements
        const interval = input.groupBy;
        const timeline = (await ctx.db.$queryRaw`
          SELECT 
            DATE_TRUNC(${interval}, createdat) as period,
            COUNT(*)::int as payments_count,
            COALESCE(SUM(amount), 0)::float as total_amount
          FROM payments 
          WHERE merchant_id = ${merchant.id}
            AND status = 'COMPLETED'
            AND created_at >= ${startDate}
          GROUP BY DATE_TRUNC(${interval}, createdat)
          ORDER BY period ASC
        `) as Array<{
          period: Date;
          payments_count: number;
          total_amount: number;
        }>;

        return {
          success: true,
          data: {
            summary: {
              totalRevenue: totalRevenue.sum.amount || 0,
              totalPayments,
              averagePayment: avgPayment.avg.amount || 0,
              period: input.period},
            byMethod: byMethod.map((method) => ({ method: method.method,
              amount: method.sum.amount || 0,
              count: method.count,
              percentage: totalRevenue.sum.amount
                ? ((method.sum.amount || 0) /
                    (totalRevenue.sum.amount || 1)) *
                  100
                : 0 })),
            timeline: timeline.map((item) => ({ date: item.period,
              payments: item.payments_count,
              amount: item.total_amount }))}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    })});
