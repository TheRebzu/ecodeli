import { z } from 'zod';
import {
  financialProcedure,
  protectedProcedure,
  adminProcedure,
  router as createTRPCRouter,
} from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserRole, PaymentStatus } from '@prisma/client';
import { paymentService } from '@/server/services/shared/payment.service';
import { walletService } from '@/server/services/wallet.service';
import { invoiceService } from '@/server/services/shared/invoice.service';
import { commissionService } from '@/server/services/admin/commission.service';
import { subscriptionService } from '@/server/services/shared/subscription.service';
import {
  financialProtect,
  validateFinancialAmount,
  validateWithdrawal,
  preventDoubleInvoicing,
} from '@/server/api/middlewares/financial-security.middleware';

/**
 * Router tRPC pour les fonctionnalités financières
 */
export const financialRouter = createTRPCRouter({
  /**
   * STATISTIQUES FINANCIÈRES
   */
  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const [
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalAmount,
          refundedAmount,
        ] = await Promise.all([
          ctx.db.payment.count({
            where: { createdAt: { gte: input.startDate, lte: input.endDate } },
          }),
          ctx.db.payment.count({
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: input.startDate, lte: input.endDate },
            },
          }),
          ctx.db.payment.count({
            where: {
              status: PaymentStatus.PENDING,
              createdAt: { gte: input.startDate, lte: input.endDate },
            },
          }),
          ctx.db.payment.count({
            where: {
              status: PaymentStatus.FAILED,
              createdAt: { gte: input.startDate, lte: input.endDate },
            },
          }),
          ctx.db.payment.aggregate({
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: input.startDate, lte: input.endDate },
            },
            _sum: { amount: true },
          }),
          ctx.db.payment.aggregate({
            where: {
              status: PaymentStatus.REFUNDED,
              createdAt: { gte: input.startDate, lte: input.endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalAmount: totalAmount._sum.amount || 0,
          refundedAmount: refundedAmount._sum.amount || 0,
          successRate: totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
          timeRange: {
            startDate: input.startDate,
            endDate: input.endDate,
          },
        };
      } catch (error) {
        console.error('Erreur dans financial.getStats:', error);
        throw error;
      }
    }),

  /**
   * PAIEMENTS
   */
  createPayment: protectedProcedure
    .use(financialProtect([]))
    .use(validateFinancialAmount('amount', { min: 0.5 }))
    .input(
      z.object({
        amount: z.number().positive(),
        description: z.string(),
        currency: z.string().default('EUR'),
        serviceId: z.string().optional(),
        deliveryId: z.string().optional(),
        invoiceId: z.string().optional(),
        isEscrow: z.boolean().default(false),
        paymentMethodId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return await paymentService.initiatePayment({
        userId,
        ...input,
      });
    }),

  getPaymentDetails: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { paymentId } = input;

      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          delivery: true,
          service: true,
          invoice: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Paiement non trouvé',
        });
      }

      // Vérifier que l'utilisateur a le droit d'accéder à ce paiement
      const isOwner = payment.userId === session.user.id;
      const isAdmin = session.user.role === UserRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas accès à ce paiement",
        });
      }

      return payment;
    }),

  listUserPayments: protectedProcedure
    .input(
      z.object({
        status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).default('ALL'),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
        userId: z.string().optional(), // Utilisé par les administrateurs
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { status, limit, cursor, userId } = input;

      // Vérifier si l'utilisateur est administrateur pour filtrer par userId
      const targetUserId =
        session.user.role === UserRole.ADMIN && userId ? userId : session.user.id;

      // Construire le filtre de statut
      const statusFilter = status === 'ALL' ? undefined : { status: status as PaymentStatus };

      // Récupérer les paiements
      const payments = await db.payment.findMany({
        where: {
          userId: targetUserId,
          ...statusFilter,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1, // +1 pour déterminer s'il y a une page suivante
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              pickupAddress: true,
              deliveryAddress: true,
            },
          },
          service: {
            select: {
              id: true,
              providerId: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
            },
          },
        },
      });

      // Déterminer s'il y a une page suivante
      const hasNextPage = payments.length > limit;
      if (hasNextPage) {
        payments.pop(); // Supprimer l'élément supplémentaire
      }

      // Récupérer le curseur pour la pagination
      const nextCursor = hasNextPage ? payments[payments.length - 1].id : undefined;

      return {
        payments,
        pagination: {
          hasNextPage,
          nextCursor,
        },
      };
    }),

  refundPayment: protectedProcedure
    .use(financialProtect([UserRole.ADMIN]))
    .input(
      z.object({
        paymentId: z.string(),
        amount: z.number().optional(),
        reason: z.string().min(5).max(200),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { paymentId, amount, reason } = input;

      // Vérifier si le paiement existe
      const payment = await ctx.db.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Paiement non trouvé',
        });
      }

      return await paymentService.refundPayment(paymentId, amount, reason);
    }),

  /**
   * PORTEFEUILLES
   */
  getUserWallet: protectedProcedure.query(async ({ ctx }) => {
    const { session } = ctx;
    const userId = session.user.id;

    const wallet = await walletService.getOrCreateWallet(userId);

    // Récupérer les transactions récentes
    const recentTransactions = await ctx.db.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      wallet,
      recentTransactions,
    };
  }),

  getWalletTransactions: protectedProcedure
    .input(
      z.object({
        walletId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        type: z.enum(['ALL', 'DEPOSIT', 'WITHDRAWAL', 'EARNING', 'REFUND']).default('ALL'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, db } = ctx;
      const { walletId, limit, cursor, type } = input;

      // Vérifier que le portefeuille appartient à l'utilisateur
      const wallet = await db.wallet.findUnique({
        where: { id: walletId },
      });

      if (!wallet) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Portefeuille non trouvé',
        });
      }

      // Vérifier que l'utilisateur a le droit d'accéder à ce portefeuille
      const isOwner = wallet.userId === session.user.id;
      const isAdmin = session.user.role === UserRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas accès à ce portefeuille",
        });
      }

      // Construire le filtre de type
      const typeFilter = type === 'ALL' ? {} : { type };

      // Récupérer les transactions
      const transactions = await db.walletTransaction.findMany({
        where: {
          walletId,
          ...typeFilter,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit + 1, // +1 pour déterminer s'il y a une page suivante
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          payment: true,
        },
      });

      // Déterminer s'il y a une page suivante
      const hasNextPage = transactions.length > limit;
      if (hasNextPage) {
        transactions.pop(); // Supprimer l'élément supplémentaire
      }

      // Récupérer le curseur pour la pagination
      const nextCursor = hasNextPage ? transactions[transactions.length - 1].id : undefined;

      return {
        transactions,
        pagination: {
          hasNextPage,
          nextCursor,
        },
      };
    }),

  requestWithdrawal: protectedProcedure
    .use(validateWithdrawal())
    .input(
      z.object({
        walletId: z.string(),
        amount: z.number().positive(),
        bankDetails: z.object({
          accountHolderName: z.string(),
          iban: z.string(),
          bic: z.string().optional(),
          bankName: z.string().optional(),
        }),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      const { walletId, amount, bankDetails, notes } = input;

      return await walletService.requestWithdrawal({
        walletId,
        userId: session.user.id,
        amount,
        bankDetails,
        notes,
      });
    }),

  /**
   * COMMISSIONS
   */
  adjustUserCommissionRate: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        serviceType: z.enum(['DELIVERY', 'SERVICE', 'STORAGE', 'CUSTOM']),
        newRate: z.number().min(0).max(1),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, serviceType, newRate } = input;

      return await commissionService.adjustUserCommissionRate(userId, serviceType, newRate);
    }),

  getUserCommissions: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        months: z.number().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const { months, userId } = input;

      // Vérifier les permissions
      const targetUserId = userId || session.user.id;

      if (targetUserId !== session.user.id && session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas le droit de consulter les commissions d'un autre utilisateur",
        });
      }

      return await commissionService.getUserCommissionSummary(targetUserId, months);
    }),

  generateMonthlyCommissionInvoices: adminProcedure
    .input(
      z.object({
        month: z.number().min(0).max(11).optional(),
        year: z.number().min(2020).max(2100).optional(),
        roleFilter: z.array(z.enum(['DELIVERER', 'PROVIDER', 'MERCHANT'])).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await commissionService.generateMonthlyCommissionInvoices(input);
    }),

  /**
   * FACTURES
   */
  createInvoice: protectedProcedure
    .use(preventDoubleInvoicing())
    .input(
      z.object({
        items: z
          .array(
            z.object({
              description: z.string(),
              quantity: z.number().positive(),
              unitPrice: z.number().positive(),
              taxRate: z.number().min(0).max(1).optional(),
              serviceId: z.string().optional(),
              deliveryId: z.string().optional(),
            })
          )
          .min(1),
        dueDate: z.date().optional(),
        notes: z.string().optional(),
        reference: z.string().optional(),
        invoiceType: z.string().optional(),
        companyName: z.string().optional(),
        billingAddress: z.string().optional(),
        billingName: z.string().optional(),
        taxId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;

      return await invoiceService.createInvoice({
        userId: session.user.id,
        ...input,
      });
    }),

  finalizeInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { invoiceId } = input;

      // Vérifier que la facture existe et appartient à l'utilisateur
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Facture non trouvée',
        });
      }

      if (invoice.userId !== session.user.id && session.user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas le droit de finaliser cette facture",
        });
      }

      return await invoiceService.finalizeInvoice(invoiceId);
    }),

  getUserInvoices: protectedProcedure
    .input(
      z.object({
        status: z.enum(['ALL', 'DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED']).default('ALL'),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
        userId: z.string().optional(), // Utilisé par les administrateurs
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, session } = ctx;
      const { status, limit, cursor, userId } = input;

      // Vérifier si l'utilisateur est administrateur pour filtrer par userId
      const targetUserId =
        session.user.role === UserRole.ADMIN && userId ? userId : session.user.id;

      // Construire le filtre de statut
      const statusFilter = status === 'ALL' ? {} : { status };

      // Récupérer les factures
      const invoices = await db.invoice.findMany({
        where: {
          userId: targetUserId,
          ...statusFilter,
        },
        orderBy: {
          issueDate: 'desc',
        },
        take: limit + 1, // +1 pour déterminer s'il y a une page suivante
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          items: true,
        },
      });

      // Déterminer s'il y a une page suivante
      const hasNextPage = invoices.length > limit;
      if (hasNextPage) {
        invoices.pop(); // Supprimer l'élément supplémentaire
      }

      // Récupérer le curseur pour la pagination
      const nextCursor = hasNextPage ? invoices[invoices.length - 1].id : undefined;

      return {
        invoices,
        pagination: {
          hasNextPage,
          nextCursor,
        },
      };
    }),

  /**
   * ABONNEMENTS
   */
  getSubscriptionPlans: protectedProcedure.query(async () => {
    return await subscriptionService.getPlans();
  }),

  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const { db, session } = ctx;

    // Trouver l'abonnement actif
    const subscription = await db.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (!subscription) {
      return {
        currentPlan: 'FREE',
        subscription: null,
        planDetails: subscriptionService.getPlan('FREE'),
      };
    }

    return {
      currentPlan: subscription.planType,
      subscription,
      planDetails: subscriptionService.getPlan(subscription.planType),
    };
  }),

  createSubscription: protectedProcedure
    .input(
      z.object({
        planType: z.enum(['FREE', 'STARTER', 'PREMIUM', 'CUSTOM']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session } = ctx;
      const { planType } = input;

      return await subscriptionService.createSubscription(session.user.id, planType);
    }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const { session } = ctx;

    return await subscriptionService.cancelSubscription(session.user.id);
  }),
});
