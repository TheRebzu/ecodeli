import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { paymentService } from '@/server/services/shared/payment.service';
import { TRPCError } from '@trpc/server';
import { subscriptionService } from '@/server/services/shared/subscription.service';
import { commissionService } from '@/server/services/admin/commission.service';
import { Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { walletService } from '@/server/services/shared/wallet.service';
import {
  createPayment,
  processPaymentIntent,
  confirmPayment,
  refundPayment,
  getPaymentHistory,
  holdPaymentForDelivery,
  releasePaymentToDeliverer,
} from '@/server/services/shared/payment.service';
import {
  createPaymentSchema,
  processPaymentSchema,
  refundPaymentSchema,
  paymentHistorySchema,
  createPaymentIntentSchema,
  paymentFilterSchema,
  releaseEscrowPaymentSchema,
} from '@/schemas/payment/payment.schema';
import { PaymentStatus, UserRole } from '@prisma/client';
import { isRoleAllowed, checkPaymentAccessRights } from '@/lib/auth/auth-helpers';

// Importation conditionnelle du service de portefeuille
let importedWalletService: any;
try {
  importedWalletService = require('@/server/services/wallet.service').walletService;
} catch (error) {
  console.warn('Wallet service could not be imported:', error);
  importedWalletService = null;
}

// Utilisation directe du service de portefeuille
const walletServiceExt = {
  ...importedWalletService,
  async updateBankInformation(walletId: string, data: any) {
    // Stub pour simuler la mise à jour des informations bancaires
    console.log('Simulation: updateBankInformation', walletId, data);
    return { success: true };
  },
  async requestWithdrawal(walletId: string, amount: number, method: string) {
    // Stub pour simuler une demande de retrait
    console.log('Simulation: requestWithdrawal', walletId, amount, method);
    return {
      id: `withdraw_${Date.now()}`,
      amount,
      walletId,
      status: 'PENDING',
      requestedAt: new Date(),
    };
  },
  async updateAutomaticWithdrawalSettings(walletId: string, settings: any) {
    // Stub pour simuler la mise à jour des paramètres de retrait automatique
    console.log('Simulation: updateAutomaticWithdrawalSettings', walletId, settings);
    return { success: true };
  },
};

// Extension temporaire des méthodes manquantes pour PaymentService
// À utiliser uniquement pendant le développement
const paymentServiceExt = {
  ...paymentService,
  async createDispute(paymentId: string, reason: string, description: string) {
    // Stub pour simuler la création d'un litige
    console.log('Simulation: createDispute', paymentId, reason, description);
    return {
      id: `dispute_${Date.now()}`,
      paymentId,
      reason,
      description,
      status: 'PENDING',
      createdAt: new Date(),
    };
  },
  async getUserDisputes(userId: string, options: any) {
    // Stub pour simuler la récupération des litiges d'un utilisateur
    return {
      disputes: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 },
    };
  },
  async getDisputeById(disputeId: string, userId: string) {
    // Stub pour simuler la récupération d'un litige par son ID
    return null;
  },
  async addDisputeEvidence(
    disputeId: string,
    userId: string,
    evidenceType: string,
    content: string
  ) {
    // Stub pour simuler l'ajout de preuves à un litige
    return { success: true };
  },
  async resolveDispute(disputeId: string, resolution: string, adminId: string, notes?: string) {
    // Stub pour simuler la résolution d'un litige
    return { success: true };
  },
  async generatePaymentReport(options: any) {
    // Stub pour simuler la génération d'un rapport de paiements
    return { url: 'https://example.com/reports/payment_report.pdf' };
  },
  async getPaymentStats() {
    // Stub pour simuler les statistiques de paiement
    return {
      totalAmount: 0,
      totalCount: 0,
      successRate: 100,
      averageAmount: 0,
    };
  },
  async getAllPayments(options: any) {
    // Stub pour simuler la récupération de tous les paiements
    return {
      payments: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 },
    };
  },
  async getAllDisputes(options: any) {
    // Stub pour simuler la récupération de tous les litiges
    return {
      disputes: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 },
    };
  },
  async createRecurringPayment(data: any) {
    // Stub pour simuler la création d'un paiement récurrent
    return {
      id: `recurring_${Date.now()}`,
      ...data,
      status: 'ACTIVE',
      createdAt: new Date(),
    };
  },
  async cancelRecurringPayment(recurringPaymentId: string, userId: string) {
    // Stub pour simuler l'annulation d'un paiement récurrent
    return { success: true };
  },
};

/**
 * Routeur tRPC pour les fonctionnalités de paiement
 * Gère les paiements réels et simulés en mode démonstration
 */
export const paymentRouter = router({
  /**
   * Récupère la liste des paiements pour l'utilisateur connecté avec pagination
   */
  getUserPayments: protectedProcedure.input(paymentFilterSchema).query(async ({ ctx, input }) => {
    try {
      const userId = ctx.session.user.id;
      const result = await getPaymentHistory(userId, input);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des paiements',
        cause: error,
      });
    }
  }),

  /**
   * Récupère les transactions de paiement pour un client avec pagination
   * Utilisé spécifiquement par la page payments du client
   */
  getClientTransactions: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
        type: z.enum(['PAYMENT', 'REFUND', 'WITHDRAWAL', 'DEPOSIT']).optional(),
        status: z.enum(['COMPLETED', 'PENDING', 'FAILED', 'CANCELLED']).optional(),
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { page, limit, type, status, search, startDate, endDate } = input;

        // Construire les conditions de recherche
        const where: any = { userId };

        if (status) {
          where.status = status;
        }

        if (search) {
          where.OR = [
            { description: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (startDate || endDate) {
          where.createdAt = {};
          if (startDate) {
            where.createdAt.gte = new Date(startDate);
          }
          if (endDate) {
            where.createdAt.lte = new Date(endDate);
          }
        }

        // Compter le total
        const totalCount = await ctx.db.payment.count({ where });

        // Récupérer les paiements avec pagination - simplifiés sans includes problématiques
        const payments = await ctx.db.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        });

        // Transformer les données pour correspondre au format attendu par le client
        const transactions = payments.map(payment => ({
          id: payment.id,
          type: 'PAYMENT' as const, // Type fixe pour les paiements
          status: payment.status as 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED',
          amount: Number(payment.amount),
          currency: payment.currency,
          date: payment.createdAt,
          description: payment.description || `Paiement #${payment.id.slice(-6)}`,
          paymentMethod: payment.paymentMethodType
            ? {
                type: payment.paymentMethodType,
                last4: undefined,
                brand: undefined,
              }
            : undefined,
          reference: payment.stripePaymentId || payment.id,
          recipient: payment.deliveryId
            ? {
                name: `Livraison #${payment.deliveryId.slice(-6)}`,
                id: payment.deliveryId,
              }
            : payment.serviceId
              ? {
                  name: `Service #${payment.serviceId.slice(-6)}`,
                  id: payment.serviceId,
                }
              : undefined,
          metadata: {
            invoiceId: payment.invoiceId,
            serviceId: payment.serviceId,
          },
        }));

        return {
          transactions,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit),
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des transactions',
          cause: error,
        });
      }
    }),

  /**
   * Récupère un paiement par son ID
   */
  getPaymentById: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { id: userId, role } = ctx.session.user;

        // Récupérer le paiement avec ses relations
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          include: {
            delivery: true,
            service: true,
            subscription: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            refunds: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier les autorisations d'accès au paiement
        await checkPaymentAccessRights(ctx.db, payment, userId, role);

        // Récupérer les événements associés si disponibles en mode démo
        // ou les événements réels en production
        const paymentEvents = await ctx.db.paymentEvent.findMany({
          where: { paymentId: input.paymentId },
          orderBy: { createdAt: 'desc' },
        });

        return {
          payment,
          events: paymentEvents,
          canRefund:
            payment.status === PaymentStatus.COMPLETED && ['CLIENT', 'ADMIN'].includes(role),
          canCancel:
            payment.status === PaymentStatus.PENDING &&
            (payment.userId === userId || role === 'ADMIN'),
          isDemoMode: process.env.DEMO_MODE === 'true',
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération du paiement',
          cause: error,
        });
      }
    }),

  /**
   * Crée un paiement (mode démonstration)
   */
  createPayment: protectedProcedure.input(createPaymentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Assignation automatique de l'ID utilisateur depuis la session
      const paymentData = {
        ...input,
        userId: ctx.session.user.id,
      };

      // Créer le paiement via le service
      const result = await createPayment(paymentData);

      // Logger l'événement de création de paiement
      await ctx.db.paymentEvent.create({
        data: {
          paymentId: result.id,
          eventType: 'PAYMENT_CREATED',
          description: `Paiement créé: ${input.amount} ${input.currency}`,
          metadata: {
            isDemo: process.env.DEMO_MODE === 'true',
            createdBy: ctx.session.user.id,
          },
        },
      });

      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la création du paiement',
        cause: error,
      });
    }
  }),

  /**
   * Crée un intent de paiement
   */
  createPaymentIntent: protectedProcedure
    .input(createPaymentIntentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Génération de l'intent de paiement
        const result = await paymentService.initiatePayment({
          ...input,
          userId,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du payment intent',
          cause: error,
        });
      }
    }),

  /**
   * Confirme un paiement après validation
   */
  confirmPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id: userId, role } = ctx.session.user;

        // Récupérer le paiement
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier que l'utilisateur est autorisé à confirmer ce paiement
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à confirmer ce paiement",
          });
        }

        // Confirmer le paiement
        const result = await confirmPayment(input.paymentId);

        // Logger l'événement de confirmation
        await ctx.db.paymentEvent.create({
          data: {
            paymentId: result.id,
            eventType: 'PAYMENT_CONFIRMED',
            description: `Paiement confirmé`,
            metadata: {
              confirmedBy: ctx.session.user.id,
              isDemo: process.env.DEMO_MODE === 'true',
            },
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la confirmation du paiement',
          cause: error,
        });
      }
    }),

  /**
   * Crée un paiement avec conservation des fonds (escrow)
   */
  createEscrowPayment: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().default('EUR'),
        deliveryId: z.string(),
        releaseAfterDays: z.number().min(1).max(30).optional(),
        generateReleaseCode: z.boolean().optional(),
        paymentMethodId: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;

        // Vérifier que l'utilisateur est un client
        if (ctx.session.user.role !== 'CLIENT') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Seul un client peut créer un paiement sous séquestre',
          });
        }

        // Créer le paiement sous séquestre
        const result = await holdPaymentForDelivery(userId, input.deliveryId, {
          amount: input.amount,
          currency: input.currency,
          releaseAfterDays: input.releaseAfterDays,
          generateReleaseCode: input.generateReleaseCode,
          paymentMethodId: input.paymentMethodId,
          description:
            input.description || `Paiement sous séquestre pour livraison #${input.deliveryId}`,
          metadata: input.metadata,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du paiement escrow',
          cause: error,
        });
      }
    }),

  /**
   * Libère un paiement conservé
   */
  releaseEscrowPayment: protectedProcedure
    .input(releaseEscrowPaymentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id: userId, role } = ctx.session.user;

        // Récupérer le paiement
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          include: { delivery: true },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier que l'utilisateur est autorisé (client qui a payé ou admin)
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à libérer ce paiement",
          });
        }

        // Libérer le paiement
        const result = await releasePaymentToDeliverer(input.paymentId, {
          releaseCode: input.releaseCode,
          releaseByAdmin: role === 'ADMIN',
          adminId: role === 'ADMIN' ? userId : undefined,
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la libération du paiement',
          cause: error,
        });
      }
    }),

  /**
   * Annule un paiement
   */
  cancelPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est autorisé à annuler ce paiement
        const { id: userId, role } = ctx.session.user;
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: { userId: true, status: true },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier que le paiement est en statut PENDING
        if (payment.status !== PaymentStatus.PENDING) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seuls les paiements en attente peuvent être annulés',
          });
        }

        // Seul l'administrateur ou le propriétaire du paiement peut l'annuler
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à annuler ce paiement",
          });
        }

        // Annuler le paiement
        const result = await ctx.db.payment.update({
          where: { id: input.paymentId },
          data: {
            status: PaymentStatus.CANCELLED,
            updatedAt: new Date(),
            metadata: {
              cancelledBy: userId,
              cancelledAt: new Date().toISOString(),
              isDemo: process.env.DEMO_MODE === 'true',
            },
          },
        });

        // Logger l'événement d'annulation
        await ctx.db.paymentEvent.create({
          data: {
            paymentId: input.paymentId,
            eventType: 'PAYMENT_CANCELLED',
            description: 'Paiement annulé',
            metadata: {
              cancelledBy: userId,
              isDemo: process.env.DEMO_MODE === 'true',
            },
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'annulation du paiement",
          cause: error,
        });
      }
    }),

  /**
   * Rembourse un paiement
   */
  refundPayment: protectedProcedure.input(refundPaymentSchema).mutation(async ({ ctx, input }) => {
    try {
      // Vérifier que l'utilisateur est autorisé à rembourser ce paiement
      const { id: userId, role } = ctx.session.user;

      // Seules ces rôles peuvent effectuer un remboursement
      if (!['ADMIN', 'MERCHANT'].includes(role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Seuls les administrateurs et les marchands peuvent effectuer des remboursements',
        });
      }

      const payment = await ctx.db.payment.findUnique({
        where: { id: input.paymentId },
        select: {
          userId: true,
          status: true,
          amount: true,
          merchantId: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Paiement non trouvé',
        });
      }

      // Vérifier que le paiement est en statut COMPLETED
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seuls les paiements complétés peuvent être remboursés',
        });
      }

      // Vérifier les permissions supplémentaires pour les marchands
      if (role === 'MERCHANT' && payment.merchantId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à rembourser ce paiement",
        });
      }

      // Effectuer le remboursement
      const result = await refundPayment({
        paymentId: input.paymentId,
        amount: input.amount || Number(payment.amount),
        reason: input.reason,
        demoSuccessScenario: input.demoSuccessScenario,
      });

      // Logger l'événement de remboursement
      await ctx.db.paymentEvent.create({
        data: {
          paymentId: input.paymentId,
          eventType: 'PAYMENT_REFUNDED',
          description: `Remboursement: ${input.amount || Number(payment.amount)} - Raison: ${input.reason}`,
          metadata: {
            refundedBy: userId,
            reason: input.reason,
            isDemo: process.env.DEMO_MODE === 'true',
          },
        },
      });

      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors du remboursement',
        cause: error,
      });
    }
  }),

  /**
   * Récupère l'historique des paiements
   */
  getPaymentHistory: protectedProcedure
    .input(paymentHistorySchema)
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await getPaymentHistory(userId, input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération de l'historique",
          cause: error,
        });
      }
    }),

  /**
   * Récupère tous les paiements (admin uniquement)
   */
  getAllPayments: adminProcedure.input(paymentFilterSchema).query(async ({ ctx, input }) => {
    try {
      // Construction du filtre
      const where: any = {};

      if (input.status) where.status = input.status;
      if (input.userId) where.userId = input.userId;
      if (input.minAmount) where.amount = { gte: input.minAmount };
      if (input.maxAmount) {
        where.amount = {
          ...where.amount,
          lte: input.maxAmount,
        };
      }
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = input.startDate;
        if (input.endDate) where.createdAt.lte = input.endDate;
      }
      if (input.serviceId) where.serviceId = input.serviceId;
      if (input.deliveryId) where.deliveryId = input.deliveryId;
      if (input.subscriptionId) where.subscriptionId = input.subscriptionId;

      // Pagination
      const skip = (input.page - 1) * input.limit;

      // Récupérer les paiements
      const [payments, total] = await Promise.all([
        ctx.db.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            refunds: true,
            delivery: {
              select: {
                id: true,
                status: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
        ctx.db.payment.count({ where }),
      ]);

      const pages = Math.ceil(total / input.limit);

      return {
        payments,
        total,
        pages,
        page: input.page,
        limit: input.limit,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des paiements',
        cause: error,
      });
    }
  }),

  /**
   * Simule un paiement réussi (uniquement pour le mode démo)
   */
  simulateSuccessfulPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        delay: z.number().min(0).max(3000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier qu'on est en mode démo
        if (process.env.DEMO_MODE !== 'true') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette fonctionnalité est uniquement disponible en mode démonstration',
          });
        }

        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: {
            userId: true,
            status: true,
            amount: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier que le paiement est en attente
        if (payment.status !== PaymentStatus.PENDING) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seuls les paiements en attente peuvent être simulés',
          });
        }

        // Vérifier que l'utilisateur est le propriétaire du paiement ou un admin
        const userId = ctx.session.user.id;
        const role = ctx.session.user.role;

        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à simuler ce paiement",
          });
        }

        // Simuler un délai si demandé
        if (input.delay && input.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, input.delay));
        }

        // Simuler le paiement réussi
        const result = await paymentService.processSuccessfulPayment(
          input.paymentId,
          Number(payment.amount),
          {
            simulatedByUser: userId,
            demoMode: true,
            simulatedAt: new Date().toISOString(),
          }
        );

        // Logger l'événement de simulation
        await ctx.db.paymentEvent.create({
          data: {
            paymentId: input.paymentId,
            eventType: 'PAYMENT_SIMULATED',
            description: 'Paiement simulé en mode démo',
            metadata: {
              simulatedBy: userId,
              isDemo: true,
            },
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la simulation du paiement',
          cause: error,
        });
      }
    }),

  /**
   * Simule un paiement échoué (uniquement pour le mode démo)
   */
  simulateFailedPayment: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
        reason: z.string().optional(),
        delay: z.number().min(0).max(3000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier qu'on est en mode démo
        if (process.env.DEMO_MODE !== 'true') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette fonctionnalité est uniquement disponible en mode démonstration',
          });
        }

        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: {
            userId: true,
            status: true,
          },
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé',
          });
        }

        // Vérifier que le paiement est en attente
        if (payment.status !== PaymentStatus.PENDING) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seuls les paiements en attente peuvent être simulés',
          });
        }

        // Vérifier que l'utilisateur est le propriétaire du paiement ou un admin
        const userId = ctx.session.user.id;
        const role = ctx.session.user.role;

        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à simuler ce paiement",
          });
        }

        // Simuler un délai si demandé
        if (input.delay && input.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, input.delay));
        }

        // Simuler l'échec du paiement
        const result = await ctx.db.payment.update({
          where: { id: input.paymentId },
          data: {
            status: PaymentStatus.FAILED,
            errorMessage: input.reason || 'Paiement échoué (simulation)',
            updatedAt: new Date(),
            metadata: {
              simulatedByUser: userId,
              demoMode: true,
              simulatedAt: new Date().toISOString(),
              simulatedFailure: true,
            },
          },
        });

        // Logger l'événement de simulation d'échec
        await ctx.db.paymentEvent.create({
          data: {
            paymentId: input.paymentId,
            eventType: 'PAYMENT_SIMULATION_FAILED',
            description: input.reason || "Simulation d'échec de paiement en mode démo",
            metadata: {
              simulatedBy: userId,
              isDemo: true,
              failureReason: input.reason || 'Échec simulé',
            },
          },
        });

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la simulation d'échec du paiement",
          cause: error,
        });
      }
    }),

  /**
   * Génère un rapport de paiements (admin uniquement)
   */
  generatePaymentReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']).optional(),
        type: z.enum(['DELIVERY', 'SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE']).optional(),
        format: z.enum(['CSV', 'PDF']).default('PDF'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que la période demandée est valide
        if (input.startDate >= input.endDate) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'La date de début doit être antérieure à la date de fin',
          });
        }

        // Simuler la génération d'un rapport en mode démo
        if (process.env.DEMO_MODE === 'true') {
          // Attendre pour simuler un traitement
          await new Promise(resolve => setTimeout(resolve, 1500));

          const fileName = `rapport-paiements-${input.startDate.toISOString().split('T')[0]}-${
            input.endDate.toISOString().split('T')[0]
          }.${input.format.toLowerCase()}`;

          return {
            success: true,
            fileUrl: `/demo/reports/${fileName}`,
            fileName,
            isDemo: true,
          };
        }

        // En production, il faudrait implémenter la génération réelle du rapport ici

        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: "La génération de rapports réels n'est pas encore implémentée",
        });
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération du rapport',
          cause: error,
        });
      }
    }),
});

export default paymentRouter;
