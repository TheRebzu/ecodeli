import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, PaymentStatus, WithdrawalStatus } from "@prisma/client";

/**
 * Router pour les paiements des livreurs
 * Gestion des gains, retraits et historique des paiements
 */
export const delivererPaymentsRouter = createTRPCRouter({
  // Récupérer l'historique des paiements du livreur
  getMyPayments: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(PaymentStatus).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à ces données",
        });
      }

      try {
        const where = {
          delivererId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
        };

        const [earnings, total] = await Promise.all([
          ctx.db.deliveryEarning.findMany({
            where,
            include: {
              delivery: {
                select: {
                  id: true,
                  status: true,
                  completedAt: true,
                },
              },
              announcement: {
                select: {
                  id: true,
                  title: true,
                  type: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.deliveryEarning.count({ where }),
        ]);

        return {
          success: true,
          data: {
            earnings,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des paiements:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des paiements",
        });
      }
    }),

  // Obtenir les statistiques de gains du livreur
  getEarningsStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalEarnings, monthlyEarnings, pendingEarnings, walletBalance] = await Promise.all([
        ctx.db.deliveryEarning.aggregate({
          where: {
            delivererId: user.id,
            status: "PAID",
          },
          _sum: { amount: true },
        }),
        ctx.db.deliveryEarning.aggregate({
          where: {
            delivererId: user.id,
            status: "PAID",
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { amount: true },
        }),
        ctx.db.deliveryEarning.aggregate({
          where: {
            delivererId: user.id,
            status: "PENDING",
          },
          _sum: { amount: true },
        }),
        ctx.db.wallet.findUnique({
          where: { userId: user.id },
          select: { balance: true },
        }),
      ]);

      const stats = {
        totalEarnings: totalEarnings._sum.amount || 0,
        monthlyEarnings: monthlyEarnings._sum.amount || 0,
        pendingEarnings: pendingEarnings._sum.amount || 0,
        availableBalance: walletBalance?.balance || 0,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Demander un retrait
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive("Le montant doit être positif"),
        method: z.enum(["BANK_TRANSFER", "PAYPAL", "STRIPE"]),
        bankDetails: z.object({
          accountName: z.string().optional(),
          iban: z.string().optional(),
          bic: z.string().optional(),
        }).optional(),
        paypalEmail: z.string().email().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent demander des retraits",
        });
      }

      try {
        // Vérifier le solde disponible
        const wallet = await ctx.db.wallet.findUnique({
          where: { userId: user.id },
        });

        if (!wallet || wallet.balance < input.amount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Solde insuffisant pour ce retrait",
          });
        }

        // Validation des détails selon la méthode
        if (input.method === "BANK_TRANSFER" && !input.bankDetails?.iban) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Les détails bancaires sont requis pour un virement",
          });
        }

        if (input.method === "PAYPAL" && !input.paypalEmail) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "L'email PayPal est requis",
          });
        }

        // Créer la demande de retrait
        const withdrawal = await ctx.db.withdrawal.create({
          data: {
            userId: user.id,
            amount: input.amount,
            method: input.method,
            status: WithdrawalStatus.PENDING,
            bankDetails: input.bankDetails,
            paypalEmail: input.paypalEmail,
            description: input.description,
          },
        });

        // Débiter temporairement le portefeuille (en attente)
        await ctx.db.wallet.update({
          where: { userId: user.id },
          data: {
            balance: { decrement: input.amount },
            pendingWithdrawals: { increment: input.amount },
          },
        });

        // Envoyer notification à l'équipe finance
        await ctx.db.notification.create({
          data: {
            userId: "admin", // À remplacer par un système d'admin réel
            type: "WITHDRAWAL_REQUEST",
            title: "Demande de retrait - Livreur",
            message: `${user.name} a demandé un retrait de ${input.amount}€ via ${input.method}`,
            data: {
              withdrawalId: withdrawal.id,
              delivererId: user.id,
              amount: input.amount,
              method: input.method,
              bankDetails: input.bankDetails,
            },
          },
        });

        console.log(`💰 Demande de retrait créée:`, {
          withdrawalId: withdrawal.id,
          userId: user.id,
          amount: input.amount,
          method: input.method,
        });

        return {
          success: true,
          data: withdrawal,
          message: "Votre demande de retrait a été soumise",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la demande de retrait:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la demande de retrait",
        });
      }
    }),

  // Obtenir l'historique des retraits
  getWithdrawalHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(WithdrawalStatus).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const where = {
          userId: user.id,
          ...(input.status && { status: input.status }),
        };

        const [withdrawals, total] = await Promise.all([
          ctx.db.withdrawal.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.withdrawal.count({ where }),
        ]);

        return {
          success: true,
          data: {
            withdrawals,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des retraits:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des retraits",
        });
      }
    }),

  // Obtenir le détail du portefeuille
  getWalletDetails: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [wallet, recentTransactions, pendingEarnings] = await Promise.all([
        ctx.db.wallet.findUnique({
          where: { userId: user.id },
        }),
        ctx.db.walletTransaction.findMany({
          where: { walletId: user.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            delivery: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        }),
        ctx.db.deliveryEarning.aggregate({
          where: {
            delivererId: user.id,
            status: "PENDING",
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      if (!wallet) {
        // Créer le portefeuille s'il n'existe pas
        const newWallet = await ctx.db.wallet.create({
          data: {
            userId: user.id,
            balance: 0,
            currency: "EUR",
          },
        });

        return {
          success: true,
          data: {
            wallet: newWallet,
            recentTransactions: [],
            pendingEarnings: {
              amount: 0,
              count: 0,
            },
          },
        };
      }

      return {
        success: true,
        data: {
          wallet,
          recentTransactions,
          pendingEarnings: {
            amount: pendingEarnings._sum.amount || 0,
            count: pendingEarnings._count.id || 0,
          },
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du portefeuille:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération du portefeuille",
      });
    }
  }),

  // Obtenir les gains par période
  getEarningsByPeriod: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month", "quarter", "year"]).default("month"),
        year: z.number().optional(),
        month: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (input.period) {
          case "week":
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            startDate = weekStart;
            endDate = new Date(weekStart);
            endDate.setDate(weekStart.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
          case "month":
            startDate = new Date(input.year || now.getFullYear(), input.month ?? now.getMonth(), 1);
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          case "quarter":
            const quarter = Math.floor((input.month ?? now.getMonth()) / 3);
            startDate = new Date(input.year || now.getFullYear(), quarter * 3, 1);
            endDate = new Date(startDate.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
            break;
          case "year":
            startDate = new Date(input.year || now.getFullYear(), 0, 1);
            endDate = new Date(startDate.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        }

        const earnings = await ctx.db.deliveryEarning.findMany({
          where: {
            delivererId: user.id,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            delivery: {
              select: {
                id: true,
                completedAt: true,
              },
            },
            announcement: {
              select: {
                title: true,
                type: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const groupedEarnings = earnings.reduce((acc, earning) => {
          const date = earning.createdAt.toISOString().split('T')[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              totalAmount: 0,
              count: 0,
              earnings: [],
            };
          }
          acc[date].totalAmount += earning.amount;
          acc[date].count += 1;
          acc[date].earnings.push(earning);
          return acc;
        }, {} as Record<string, any>);

        return {
          success: true,
          data: {
            period: input.period,
            startDate,
            endDate,
            totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
            totalDeliveries: earnings.length,
            dailyBreakdown: Object.values(groupedEarnings),
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des gains par période:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des gains",
        });
      }
    }),
});
