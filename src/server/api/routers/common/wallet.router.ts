// src/server/api/routers/wallet.router.ts
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getOrCreateWallet,
  getWallet,
  getWalletBalance,
  listWalletTransactions,
  createWalletTransaction,
  calculateEarnings} from "@/server/services/shared/wallet.service";
import { TransactionType } from "@prisma/client";
import { isRoleAllowed } from "@/lib/auth/auth-helpers";
import { db } from "@/server/db";
import {
  WalletConfigSchema,
  requestWithdrawalSchema} from "@/schemas/payment/wallet.schema";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

/**
 * Router tRPC pour la gestion des portefeuilles électroniques
 * Fournit des endpoints pour consulter les soldes, l'historique des transactions,
 * et gérer la configuration des portefeuilles
 */
export const walletRouter = router({ /**
   * Récupère le portefeuille de l'utilisateur connecté
   */
  getMyWallet: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const userId = ctx.session.user.id;
      const wallet = await getOrCreateWallet(userId);

      // Récupérer les statistiques
      const now = new Date();
      const firstDayOfMonth = startOfMonth(now);
      const lastDayOfMonth = endOfMonth(now);

      const previousMonth = subMonths(now, 1);
      const firstDayPreviousMonth = startOfMonth(previousMonth);
      const lastDayPreviousMonth = endOfMonth(previousMonth);

      // Obtenir les transactions en attente
      const pendingWithdrawals = await ctx.db.withdrawalRequest.findMany({
        where: {
          walletId: wallet.id,
          status: "PENDING"},
        select: {
          id: true,
          amount: true,
          requestedAt: true,
          estimatedArrival: true}});

      // Calculer les gains de ce mois et du mois précédent
      const earningsThisMonth = await calculateEarnings(wallet.id, {
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth});

      const earningsPreviousMonth = await calculateEarnings(wallet.id, {
        startDate: firstDayPreviousMonth,
        endDate: lastDayPreviousMonth});

      return {
        wallet,
        stats: {
          pendingWithdrawals,
          earningsThisMonth,
          earningsPreviousMonth,
          totalEarned: wallet.totalEarned || 0,
          totalWithdrawn: wallet.totalWithdrawn || 0}};
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message:
          error.message || "Erreur lors de la récupération du portefeuille",
        cause: error });
    }
  }),

  /**
   * Récupère un résumé du portefeuille client pour la page payments
   * Utilisé spécifiquement par la page payments du client
   */
  getClientWalletSummary: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const userId = ctx.session.user.id;
      const wallet = await getOrCreateWallet(userId);

      // Calculer les statistiques mensuelles
      const now = new Date();
      const firstDayOfMonth = startOfMonth(now);
      const lastDayOfMonth = endOfMonth(now);

      // Récupérer les transactions du mois en cours
      const monthlyTransactions = await ctx.db.walletTransaction.findMany({
        where: {
          walletId: wallet.id,
          status: "COMPLETED",
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth}},
        orderBy: { createdAt: "desc" },
        take: 5, // Dernières 5 transactions pour l'activité récente
      });

      // Calculer les entrées et sorties du mois
      const monthlyIncoming = monthlyTransactions
        .filter((tx) => Number(tx.amount) > 0)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);

      const monthlyOutgoing = Math.abs(
        monthlyTransactions
          .filter((tx) => Number(tx.amount) < 0)
          .reduce((sum, tx) => sum + Number(tx.amount), 0),
      );

      // Calculer le solde en attente (demandes de retrait en cours)
      const pendingWithdrawals = await ctx.db.withdrawalRequest.aggregate({
        where: {
          walletId: wallet.id,
          status: "PENDING"},
        sum: { amount }});

      // Activité récente pour le graphique
      const recentActivity = monthlyTransactions.map((tx) => ({ date: tx.createdAt,
        amount: Number(tx.amount),
        type:
          Number(tx.amount) > 0 ? ("INCOMING" as const) : ("OUTGOING" as const) }));

      return {
        balance: Number(wallet.balance),
        pendingBalance: Number(pendingWithdrawals.sum.amount || 0),
        currency: wallet.currency,
        monthlyIncoming,
        monthlyOutgoing,
        recentActivity};
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message:
          error.message ||
          "Erreur lors de la récupération du résumé du portefeuille",
        cause: error });
    }
  }),

  /**
   * Récupère le solde du portefeuille de l'utilisateur
   */
  getBalance: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const userId = ctx.session.user.id;
      const walletBalance = await getWalletBalance(userId);
      return walletBalance;
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Erreur lors de la récupération du solde",
        cause: error });
    }
  }),

  /**
   * Récupère l'historique des transactions du portefeuille avec pagination
   */
  getTransactionHistory: protectedProcedure
    .input(
      z.object({ page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
        type: z
          .enum([
            "ALL",
            "EARNING",
            "WITHDRAWAL",
            "PLATFORM_FEE",
            "COMMISSION",
            "ADJUSTMENT"])
          .optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc") }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const userId = ctx.session.user.id;

        // Récupérer l'ID du portefeuille
        const wallet = await getOrCreateWallet(userId);

        // Définir les filtres
        const transactionType =
          input.type !== "ALL" && input.type
            ? (input.type as TransactionType)
            : undefined;

        const transactions = await listWalletTransactions(wallet.id, {
          page: input.page,
          limit: input.limit,
          type: transactionType,
          startDate: input.startDate,
          endDate: input.endDate,
          sortDirection: input.sortOrder});

        return transactions;
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message ||
            "Erreur lors de la récupération de l'historique des transactions",
          cause: error });
      }
    }),

  /**
   * Récupère les statistiques du portefeuille sur différentes périodes
   */
  getWalletStats: protectedProcedure
    .input(
      z.object({ period: z
          .enum(["daily", "weekly", "monthly", "yearly"])
          .default("monthly"),
        startDate: z.date().optional(),
        endDate: z.date().optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const userId = ctx.session.user.id;
        const wallet = await getOrCreateWallet(userId);

        // Calculer les statistiques de base
        const [totalEarnings, totalWithdrawals, pendingWithdrawals] =
          await Promise.all([
            calculateEarnings(wallet.id, {
              startDate: input.startDate,
              endDate: input.endDate}),
            ctx.db.walletTransaction.aggregate({
              where: {
                walletId: wallet.id,
                type: "WITHDRAWAL",
                createdAt: {
                  gte: input.startDate,
                  lte: input.endDate}},
              sum: { amount }}),
            ctx.db.withdrawalRequest.aggregate({
              where: {
                walletId: wallet.id,
                status: "PENDING"},
              sum: { amount },
              count: true})]);

        // Calculer les statistiques par période
        const periodStats = await calculateEarnings(wallet.id, {
          startDate: input.startDate,
          endDate: input.endDate,
          groupBy: input.period});

        return {
          totalEarnings,
          totalWithdrawals: Math.abs(Number(totalWithdrawals.sum.amount || 0)),
          pendingAmount: Number(pendingWithdrawals.sum.amount || 0),
          pendingCount: pendingWithdrawals.count,
          periodStats,
          currentBalance: Number(wallet.balance),
          currency: wallet.currency};
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la récupération des statistiques",
          cause: error });
      }
    }),

  /**
   * Met à jour la configuration du portefeuille
   */
  updateWalletConfig: protectedProcedure
    .input(WalletConfigSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const userId = ctx.session.user.id;
        const wallet = await getOrCreateWallet(userId);

        // Mettre à jour la configuration
        const updatedWallet = await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            minimumWithdrawalAmount: input.minimumWithdrawalAmount,
            automaticWithdrawal: input.automaticWithdrawal,
            withdrawalThreshold: input.withdrawalThreshold || 100,
            withdrawalDay: input.withdrawalDay}});

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "WALLET",
            entityId: wallet.id,
            performedById: userId,
            action: "UPDATE_WALLET_CONFIG",
            changes: {
              minimumWithdrawalAmount: input.minimumWithdrawalAmount.toString(),
              automaticWithdrawal: input.automaticWithdrawal.toString(),
              withdrawalThreshold: (
                input.withdrawalThreshold || 100
              ).toString(),
              withdrawalDay: input.withdrawalDay?.toString() || "null"}}});

        return updatedWallet;
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message ||
            "Erreur lors de la mise à jour de la configuration",
          cause: error });
      }
    }),

  /**
   * Met à jour les informations bancaires du portefeuille
   */
  updateBankInformation: protectedProcedure
    .input(
      z.object({ iban: z.string().min(15).max(34),
        bic: z.string().min(8).max(11),
        bankName: z.string().min(2).max(100),
        accountHolder: z.string().min(2).max(100),
        accountHolderType: z
          .enum(["individual", "company"])
          .default("individual") }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const userId = ctx.session.user.id;
        const wallet = await getOrCreateWallet(userId);

        // Mettre à jour les informations bancaires
        const updatedWallet = await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            iban: input.iban,
            bic: input.bic,
            bankName: input.bankName,
            accountHolder: input.accountHolder,
            accountHolderType: input.accountHolderType,
            accountVerified: false, // Vérification obligatoire en production
          }});

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "WALLET",
            entityId: wallet.id,
            performedById: userId,
            action: "UPDATE_BANK_INFORMATION",
            changes: {
              iban: `${input.iban.substring(0, 2)}...${input.iban.substring(input.iban.length - 4)}`,
              bic: input.bic,
              bankName: input.bankName,
              accountHolder: input.accountHolder,
              accountHolderType: input.accountHolderType}}});

        return {
          success: true,
          wallet: updatedWallet,
          message: "Informations bancaires mises à jour avec succès",
          requiresVerification: true};
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message ||
            "Erreur lors de la mise à jour des informations bancaires",
          cause: error });
      }
    }),

  /**
   * Récupère le portefeuille d'un utilisateur spécifique (admin uniquement)
   */
  getUserWallet: adminProcedure
    .input(
      z.object({ userId: z.string() }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const wallet = await getOrCreateWallet(input.userId);

        // Récupérer les statistiques
        const pendingWithdrawals = await ctx.db.withdrawalRequest.findMany({
          where: {
            walletId: wallet.id,
            status: "PENDING"},
          select: {
            id: true,
            amount: true,
            requestedAt: true,
            estimatedArrival: true}});

        // Récupérer les informations de l'utilisateur
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true}});

        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Utilisateur non trouvé" });
        }

        return {
          wallet,
          user,
          pendingWithdrawals};
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la récupération du portefeuille",
          cause: error });
      }
    }),

  /**
   * Crée une transaction d'ajustement (admin uniquement)
   */
  createAdjustment: adminProcedure
    .input(
      z.object({ userId: z.string(),
        amount: z.number(),
        description: z.string().min(5).max(200),
        reason: z.string().min(5).max(200) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const adminId = ctx.session.user.id;
        const wallet = await getOrCreateWallet(input.userId);

        // Créer la transaction d'ajustement
        const transaction = await createWalletTransaction(wallet.id, {
          amount: input.amount,
          type: "ADJUSTMENT",
          description: input.description,
          reference: `ADJ-${Date.now()}`,
          metadata: {
            reason: input.reason,
            adjustedBy: adminId,
            adjustedAt: new Date().toISOString()}});

        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "WALLET_TRANSACTION",
            entityId: transaction.id,
            performedById: adminId,
            action: "CREATE_ADJUSTMENT",
            changes: {
              userId: input.userId,
              amount: input.amount.toString(),
              description: input.description,
              reason: input.reason}}});

        return {
          success: true,
          transaction,
          message: `Ajustement de ${input.amount} ${wallet.currency} effectué avec succès`};
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la création de l'ajustement",
          cause: error });
      }
    })});

export default walletRouter;
