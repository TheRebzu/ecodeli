import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
} from "@prisma/client";

/**
 * Router pour le portefeuille EcoDeli des livreurs selon le cahier des charges
 * Gère le solde, l'historique des gains et les demandes de virement
 */

// Schémas de validation
const withdrawalRequestSchema = z.object({
  amount: z.number().min(10).max(5000), // Minimum 10€, maximum 5000€
  bankAccount: z.object({
    iban: z.string().min(15).max(34),
    bic: z.string().min(8).max(11).optional(),
    accountHolderName: z.string().min(2).max(100),
  }),
  reason: z.string().max(200).optional(),
  urgency: z.enum(["NORMAL", "URGENT"]).default("NORMAL"),
});

const transactionFiltersSchema = z.object({
  type: z.array(z.nativeEnum(TransactionType)).optional(),
  status: z.array(z.nativeEnum(TransactionStatus)).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const delivererWalletRouter = router({
  /**
   * Obtenir le solde et les informations du portefeuille
   */
  getWalletInfo: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent accéder à leur portefeuille",
      });
    }

    try {
      // Récupérer ou créer le portefeuille
      let wallet = await ctx.db.wallet.findUnique({
        where: { userId: user.id },
      });

      if (!wallet) {
        wallet = await ctx.db.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            currency: "EUR",
          },
        });
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
          createdAt: { gte: currentMonth },
        },
        _sum: { amount: true },
        _count: true,
      });

      // Gains en attente (non encore payés)
      const pendingEarnings = await ctx.db.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
          status: "PENDING",
        },
        _sum: { amount: true },
      });

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
          bankAccount: true,
        },
      });

      // Commission EcoDeli du mois
      const monthlyCommissions = await ctx.db.transaction.aggregate({
        where: {
          walletId: wallet.id,
          type: "PLATFORM_FEE",
          status: "COMPLETED",
          createdAt: { gte: currentMonth },
        },
        _sum: { amount: true },
      });

      return {
        success: true,
        data: {
          wallet: {
            ...wallet,
            balance: wallet.balance.toNumber(),
          },
          monthlyStats: {
            earnings: monthlyStats._sum.amount?.toNumber() || 0,
            deliveries: monthlyStats._count || 0,
            commissions: Math.abs(
              monthlyCommissions._sum.amount?.toNumber() || 0,
            ),
          },
          pendingEarnings: pendingEarnings._sum.amount?.toNumber() || 0,
          recentWithdrawals,
          canWithdraw: wallet.balance.toNumber() >= 10,
          nextPayoutDate: getNextPayoutDate(),
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du portefeuille",
      });
    }
  }),

  /**
   * Obtenir l'historique détaillé des transactions
   */
  getTransactionHistory: protectedProcedure
    .input(transactionFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent voir leur historique",
        });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              offset: 0,
              limit: input.limit,
              hasMore: false,
            },
          };
        }

        const where: any = {
          walletId: wallet.id,
          ...(input.type && { type: { in: input.type } }),
          ...(input.status && { status: { in: input.status } }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo },
            }),
          ...(input.minAmount && { amount: { gte: input.minAmount } }),
          ...(input.maxAmount && { amount: { lte: input.maxAmount } }),
        };

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
                    deliveryAddress: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.transaction.count({ where });

        // Formater les transactions pour l'affichage
        const formattedTransactions = transactions.map((t) => ({
          ...t,
          amount: t.amount.toNumber(),
          description: getTransactionDescription(t),
          displayColor: getTransactionColor(t.type),
          isCredit: ["EARNING", "DELIVERY_PAYOUT", "BONUS", "REFUND"].includes(
            t.type,
          ),
        }));

        return {
          success: true,
          data: formattedTransactions,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de l'historique",
        });
      }
    }),

  /**
   * Demander un virement
   */
  requestWithdrawal: protectedProcedure
    .input(withdrawalRequestSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent demander un virement",
        });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portefeuille non trouvé",
          });
        }

        // Vérifier le solde disponible
        if (wallet.balance.toNumber() < input.amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solde insuffisant",
          });
        }

        // Vérifier les limites (max 1 virement par jour)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayWithdrawals = await ctx.db.withdrawal.count({
          where: {
            walletId: wallet.id,
            createdAt: { gte: today },
            status: { not: "CANCELLED" },
          },
        });

        if (todayWithdrawals >= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Maximum 1 virement par jour autorisé",
          });
        }

        // Calculer les frais de virement
        let withdrawalFee = 0;
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
            status: "PENDING",
          },
        });

        // Réserver le montant (débit temporaire)
        await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { decrement: input.amount },
            reservedAmount: { increment: input.amount },
          },
        });

        // Créer la transaction de débit
        await ctx.db.transaction.create({
          data: {
            walletId: wallet.id,
            type: "WITHDRAWAL",
            amount: -input.amount,
            description: `Virement ${input.urgency === "URGENT" ? "express" : "standard"}`,
            status: "PENDING",
            relatedWithdrawalId: withdrawal.id,
          },
        });

        // Notification admin pour virement urgent
        if (input.urgency === "URGENT") {
          await ctx.db.notification.create({
            data: {
              userId: user.id, // Admin sera notifié via système
              title: "Virement urgent demandé",
              content: `${user.name} demande un virement urgent de ${input.amount}€`,
              type: "URGENT_WITHDRAWAL",
            },
          });
        }

        return {
          success: true,
          data: {
            ...withdrawal,
            amount: withdrawal.amount.toNumber(),
            fee: withdrawal.fee.toNumber(),
            netAmount: withdrawal.netAmount.toNumber(),
          },
          message: `Demande de virement ${input.urgency === "URGENT" ? "express" : "standard"} créée. ${
            input.urgency === "URGENT"
              ? "Traitement sous 24h."
              : "Traitement sous 3-5 jours ouvrés."
          }`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de virement",
        });
      }
    }),

  /**
   * Annuler un virement en attente
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent annuler leurs virements",
        });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Portefeuille non trouvé",
          });
        }

        const withdrawal = await ctx.db.withdrawal.findFirst({
          where: {
            id: input.withdrawalId,
            walletId: wallet.id,
            status: "PENDING",
          },
        });

        if (!withdrawal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Virement non trouvé ou déjà traité",
          });
        }

        // Annuler le virement
        await ctx.db.withdrawal.update({
          where: { id: input.withdrawalId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
          },
        });

        // Remettre le montant dans le solde
        await ctx.db.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: withdrawal.amount },
            reservedAmount: { decrement: withdrawal.amount },
          },
        });

        // Annuler la transaction associée
        await ctx.db.transaction.updateMany({
          where: { relatedWithdrawalId: input.withdrawalId },
          data: { status: "CANCELLED" },
        });

        return {
          success: true,
          message: "Virement annulé avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation",
        });
      }
    }),

  /**
   * Obtenir l'historique des virements
   */
  getWithdrawalHistory: protectedProcedure
    .input(
      z.object({
        status: z.array(z.nativeEnum(WithdrawalStatus)).optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Seuls les livreurs peuvent voir leur historique de virements",
        });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              offset: 0,
              limit: input.limit,
              hasMore: false,
            },
          };
        }

        const where: any = {
          walletId: wallet.id,
          ...(input.status && { status: { in: input.status } }),
        };

        const withdrawals = await ctx.db.withdrawal.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.withdrawal.count({ where });

        const formattedWithdrawals = withdrawals.map((w) => ({
          ...w,
          amount: w.amount.toNumber(),
          fee: w.fee.toNumber(),
          netAmount: w.netAmount.toNumber(),
          statusLabel: getWithdrawalStatusLabel(w.status),
          estimatedArrival: getEstimatedArrival(w),
        }));

        return {
          success: true,
          data: formattedWithdrawals,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des virements",
        });
      }
    }),

  /**
   * Obtenir les statistiques de gains
   */
  getEarningsStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "quarter", "year"]).default("month"),
        year: z.number().min(2020).max(new Date().getFullYear()).optional(),
        month: z.number().min(1).max(12).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent voir leurs statistiques",
        });
      }

      try {
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet) {
          return {
            success: true,
            data: {
              totalEarnings: 0,
              totalCommissions: 0,
              deliveryCount: 0,
              averagePerDelivery: 0,
              chartData: [],
              comparison: { previous: 0, change: 0 },
            },
          };
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
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
          _count: true,
        });

        // Commissions de la période
        const currentCommissions = await ctx.db.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: "PLATFORM_FEE",
            status: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        // Gains de la période précédente pour comparaison
        const previousEarnings = await ctx.db.transaction.aggregate({
          where: {
            walletId: wallet.id,
            type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
            status: "COMPLETED",
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { amount: true },
        });

        // Données pour le graphique (par jour/semaine/mois selon la période)
        const chartData = await getEarningsChartData(
          wallet.id,
          startDate,
          endDate,
          input.period,
        );

        const totalEarnings = currentEarnings._sum.amount?.toNumber() || 0;
        const totalCommissions = Math.abs(
          currentCommissions._sum.amount?.toNumber() || 0,
        );
        const deliveryCount = currentEarnings._count || 0;
        const previousTotal = previousEarnings._sum.amount?.toNumber() || 0;
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
              change: Math.round(change * 100) / 100,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques",
        });
      }
    }),
});

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
  const daysToAdd = withdrawal.urgency === "URGENT" ? 1 : 5;
  created.setDate(created.getDate() + daysToAdd);
  return created;
}

function calculatePeriodDates(input: any) {
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();
  let previousStartDate = new Date();
  let previousEndDate = new Date();

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
) {
  // Cette fonction générerait des données pour le graphique
  // selon la période (par jour, semaine, mois)
  // Pour l'instant, retourne un tableau vide
  return [];
}
