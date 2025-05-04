import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { PaymentService } from '@/server/services/payment.service';
import { TRPCError } from '@trpc/server';
import { walletService as importedWalletService } from '@/server/services/wallet.service';
import { SubscriptionService } from '@/server/services/subscription.service';
import { CommissionService } from '@/server/services/commission.service';
import { Prisma } from '@prisma/client';
import { db } from "@/server/db";
import { WalletService as WalletServiceClass } from "@/server/services/wallet.service";

// Création d'une instance de WalletService - en utilisant un nom différent
const localWalletService = new WalletServiceClass(db);

// Extension temporaire des méthodes manquantes
// À utiliser uniquement pendant le développement
const walletServiceExt = {
  ...localWalletService,
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
      requestedAt: new Date()
    };
  },
  async updateAutomaticWithdrawalSettings(walletId: string, settings: any) {
    // Stub pour simuler la mise à jour des paramètres de retrait automatique
    console.log('Simulation: updateAutomaticWithdrawalSettings', walletId, settings);
    return { success: true };
  }
};

// Extension temporaire des méthodes manquantes pour PaymentService
// À utiliser uniquement pendant le développement
const paymentServiceExt = {
  ...PaymentService,
  async createDispute(paymentId: string, reason: string, description: string) {
    // Stub pour simuler la création d'un litige
    console.log('Simulation: createDispute', paymentId, reason, description);
    return { 
      id: `dispute_${Date.now()}`,
      paymentId,
      reason,
      description,
      status: 'PENDING',
      createdAt: new Date()
    };
  },
  async getUserDisputes(userId: string, options: any) {
    // Stub pour simuler la récupération des litiges d'un utilisateur
    return { 
      disputes: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 }
    };
  },
  async getDisputeById(disputeId: string, userId: string) {
    // Stub pour simuler la récupération d'un litige par son ID
    return null;
  },
  async addDisputeEvidence(disputeId: string, userId: string, evidenceType: string, content: string) {
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
      averageAmount: 0
    };
  },
  async getAllPayments(options: any) {
    // Stub pour simuler la récupération de tous les paiements
    return { 
      payments: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 }
    };
  },
  async getAllDisputes(options: any) {
    // Stub pour simuler la récupération de tous les litiges
    return { 
      disputes: [],
      pagination: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 10 }
    };
  },
  async createRecurringPayment(data: any) {
    // Stub pour simuler la création d'un paiement récurrent
    return { 
      id: `recurring_${Date.now()}`,
      ...data,
      status: 'ACTIVE',
      createdAt: new Date()
    };
  },
  async cancelRecurringPayment(recurringPaymentId: string, userId: string) {
    // Stub pour simuler l'annulation d'un paiement récurrent
    return { success: true };
  }
};

/**
 * Routeur tRPC pour les fonctionnalités de paiement
 */
export const paymentRouter = router({
  getPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async () => {
      // Récupération des paiements
      return [];
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async () => {
    // Récupération d'un paiement par ID
    return null;
  }),

  /**
   * Crée un intent de paiement
   */
  createPaymentIntent: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      currency: z.string().default('EUR'),
      deliveryId: z.string().optional(),
      serviceId: z.string().optional(),
      subscriptionId: z.string().optional(),
      paymentMethodId: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional(),
      isEscrow: z.boolean().optional().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.createPaymentIntent({
          ...input,
          userId
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du payment intent',
          cause: error
        });
      }
    }),

  /**
   * Crée un paiement avec conservation des fonds (escrow)
   */
  createEscrowPayment: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      currency: z.string().default('EUR'),
      deliveryId: z.string(),
      releaseAfterDays: z.number().min(1).max(30).optional(),
      generateReleaseCode: z.boolean().optional(),
      paymentMethodId: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.createEscrowPayment(
          input.amount,
          input.currency,
          userId,
          input.deliveryId,
          input.releaseAfterDays,
          input.generateReleaseCode,
          input.paymentMethodId,
          input.description,
          input.metadata
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du paiement escrow',
          cause: error
        });
      }
    }),

  /**
   * Libérer un paiement conservé
   */
  releaseEscrowPayment: protectedProcedure
    .input(z.object({
      paymentId: z.string(),
      releaseCode: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PaymentService.releaseEscrowPayment(
          input.paymentId,
          input.releaseCode
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la libération du paiement',
          cause: error
        });
      }
    }),

  /**
   * Capture un paiement après validation 
   */
  capturePayment: protectedProcedure
    .input(z.object({
      paymentIntentId: z.string(),
      amount: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await PaymentService.capturePayment(
          input.paymentIntentId,
          input.amount
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la capture du paiement',
          cause: error
        });
      }
    }),

  /**
   * Annule un paiement
   */
  cancelPayment: protectedProcedure
    .input(z.object({
      paymentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est autorisé à annuler ce paiement
        const { id: userId, role } = ctx.session.user;
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: { userId: true }
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé'
          });
        }

        // Seul l'administrateur ou le propriétaire du paiement peut l'annuler
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à annuler ce paiement'
          });
        }

        const result = await PaymentService.cancelPayment(input.paymentId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'annulation du paiement',
          cause: error
        });
      }
    }),

  /**
   * Rembourse un paiement
   */
  refundPayment: protectedProcedure
    .input(z.object({
      paymentId: z.string(),
      amount: z.number().optional(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est autorisé à rembourser ce paiement
        const { id: userId, role } = ctx.session.user;
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: { userId: true }
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé'
          });
        }

        // Seul l'administrateur ou le propriétaire du paiement peut effectuer un remboursement
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à rembourser ce paiement'
          });
        }

        const result = await PaymentService.refundPayment(
          input.paymentId,
          input.amount,
          input.reason
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du remboursement',
          cause: error
        });
      }
    }),

  /**
   * Récupère l'historique des paiements
   */
  getPaymentHistory: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(10),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.string().optional(),
      type: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.getPaymentHistory(userId, input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération de l\'historique',
          cause: error
        });
      }
    }),

  /**
   * Récupère un paiement par son ID
   */
  getPaymentById: protectedProcedure
    .input(z.object({
      paymentId: z.string()
    }))
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
                email: true
              }
            }
          }
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé'
          });
        }

        // Vérifier les autorisations (l'utilisateur doit être lié au paiement ou admin)
        if (payment.userId !== userId && role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à accéder à ce paiement'
          });
        }

        // Récupérer les événements Stripe associés si disponibles
        let stripeEvents = null;
        if (payment.paymentIntentId) {
          // Utilisation d'une simulation de getStripeEvents car cette méthode n'existe pas encore
          stripeEvents = payment.paymentIntentId ? [
            { type: 'payment_intent.created', created: payment.createdAt.getTime() / 1000 },
            { type: 'payment_intent.succeeded', created: payment.updatedAt.getTime() / 1000 }
          ] : [];
        }

        return {
          payment,
          stripeEvents
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération du paiement',
          cause: error
        });
      }
    }),

  /**
   * Ajoute une méthode de paiement
   */
  addPaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string(),
      setAsDefault: z.boolean().optional().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.addPaymentMethod(
          userId,
          input.paymentMethodId,
          input.setAsDefault
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'ajout de la méthode de paiement',
          cause: error
        });
      }
    }),

  /**
   * Récupère les méthodes de paiement d'un utilisateur
   */
  getPaymentMethods: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.getPaymentMethods(userId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des méthodes de paiement',
          cause: error
        });
      }
    }),

  /**
   * Supprime une méthode de paiement
   */
  removePaymentMethod: protectedProcedure
    .input(z.object({
      paymentMethodId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await PaymentService.removePaymentMethod(userId, input.paymentMethodId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la suppression de la méthode de paiement',
          cause: error
        });
      }
    }),

  /**
   * Récupère le portefeuille de l'utilisateur actuel
   */
  getWallet: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        if (!ctx.session) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour accéder à cette fonctionnalité'
          });
        }
        
        const userId = ctx.session.user.id;
        // Ici, nous simulons la récupération du portefeuille
        return {
          id: 'wallet-id',
          userId,
          balance: 0,
          currency: 'EUR',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération du portefeuille',
          cause: error
        });
      }
    }),

  /**
   * Mettre à jour les informations bancaires du portefeuille
   */
  updateBankInformation: protectedProcedure
    .input(z.object({
      iban: z.string(),
      bic: z.string().optional(),
      bankName: z.string().optional(),
      accountHolder: z.string(),
      accountHolderType: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer le portefeuille
        let wallet;
        try {
          wallet = await localWalletService.getUserWallet(userId);
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erreur lors de la récupération du portefeuille',
          });
        }

        // Remplacer updateBankInformation par une version locale
        const result = await walletServiceExt.updateBankInformation(wallet.id, input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour des informations bancaires',
          cause: error
        });
      }
    }),

  /**
   * Demander un retrait vers un compte bancaire
   */
  requestWithdrawal: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      preferredMethod: z.string().optional().default('BANK_TRANSFER')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer le portefeuille
        const wallet = await localWalletService.getUserWallet(userId);
        
        // Remplacer requestWithdrawal par une version locale
        const result = await walletServiceExt.requestWithdrawal(
          wallet.id,
          input.amount,
          input.preferredMethod || 'BANK_TRANSFER' // Valeur par défaut en cas d'undefined
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la demande de retrait',
          cause: error
        });
      }
    }),

  /**
   * Mettre à jour les paramètres de retrait automatique
   */
  updateAutomaticWithdrawalSettings: protectedProcedure
    .input(z.object({
      automaticWithdrawal: z.boolean(),
      withdrawalThreshold: z.number().optional(),
      withdrawalDay: z.number().int().min(1).max(31).optional(),
      minimumWithdrawalAmount: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer le portefeuille
        const wallet = await localWalletService.getUserWallet(userId);
        
        // Remplacer updateAutomaticWithdrawalSettings par une version locale
        const result = await walletServiceExt.updateAutomaticWithdrawalSettings(wallet.id, input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour des paramètres de retrait automatique',
          cause: error
        });
      }
    }),

  /**
   * Générer un rapport sur les revenus
   */
  generateEarningsReport: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await localWalletService.generateEarningsReport(
          userId,
          input.startDate,
          input.endDate
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération du rapport',
          cause: error
        });
      }
    }),

  /**
   * Récupère l'abonnement actif
   */
  getCurrentSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        if (!ctx.session) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Vous devez être connecté pour accéder à cette fonctionnalité'
          });
        }
        
        const userId = ctx.session.user.id;
        // Ici, nous simulons la récupération de l'abonnement actif
        return {
          id: 'subscription-id',
          userId,
          status: 'ACTIVE',
          planType: 'FREE',
          startDate: new Date(),
          autoRenew: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération de l\'abonnement',
          cause: error
        });
      }
    }),

  /**
   * Souscrire à un plan
   */
  subscribeToNewPlan: protectedProcedure
    .input(z.object({
      planType: z.enum(['FREE', 'STARTER', 'PREMIUM']),
      paymentMethodId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        if (input.planType === 'FREE') {
          // Pour les abonnements FREE, pas besoin de méthode de paiement
          const result = await SubscriptionService.createFreeSubscription(userId);
          return { success: true, subscription: result };
        }
        
        if (!input.paymentMethodId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Une méthode de paiement est requise pour les abonnements payants'
          });
        }
        
        const result = await SubscriptionService.subscribeToNewPlan(
          userId,
          input.planType,
          input.paymentMethodId
        );
        // Le service retourne directement l'abonnement
        return { success: true, subscription: result };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la souscription au plan',
          cause: error
        });
      }
    }),

  /**
   * Annuler un abonnement
   */
  cancelSubscription: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      cancelImmediately: z.boolean().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est autorisé à annuler cet abonnement
        const userId = ctx.session.user.id;
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
          select: { userId: true }
        });

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }

        if (subscription.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à annuler cet abonnement'
          });
        }

        const result = await SubscriptionService.cancelSubscription(
          input.subscriptionId,
          input.cancelImmediately
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'annulation de l\'abonnement',
          cause: error
        });
      }
    }),

  /**
   * Changer de plan d'abonnement
   */
  changePlan: protectedProcedure
    .input(z.object({
      subscriptionId: z.string(),
      newPlanType: z.enum(['FREE', 'STARTER', 'PREMIUM']),
      paymentMethodId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est autorisé à modifier cet abonnement
        const userId = ctx.session.user.id;
        const subscription = await ctx.db.subscription.findUnique({
          where: { id: input.subscriptionId },
          select: { userId: true }
        });

        if (!subscription) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Abonnement non trouvé'
          });
        }

        if (subscription.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à modifier cet abonnement'
          });
        }

        const result = await SubscriptionService.changePlan(
          input.subscriptionId,
          input.newPlanType,
          input.paymentMethodId
        );
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du changement de plan',
          cause: error
        });
      }
    }),

  /**
   * Crée une dispute (litige) sur un paiement
   */
  createDispute: protectedProcedure
    .input(z.object({
      paymentId: z.string(),
      reason: z.enum([
        'PRODUCT_NOT_RECEIVED',
        'PRODUCT_NOT_AS_DESCRIBED',
        'DUPLICATE', 
        'FRAUDULENT', 
        'OTHER'
      ]),
      description: z.string().min(10).max(1000),
      evidenceFiles: z.array(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Vérifier que le paiement appartient à l'utilisateur
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: { userId: true, paymentIntentId: true, status: true }
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé'
          });
        }

        if (payment.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Vous n\'êtes pas autorisé à contester ce paiement'
          });
        }

        // Vérifier que le statut du paiement permet une contestation
        if (payment.status !== 'COMPLETED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Seul un paiement complété peut être contesté'
          });
        }

        // Remplacer createDispute par une version locale
        const dispute = await paymentServiceExt.createDispute(
          input.paymentId,
          input.reason,
          input.description,
        );

        return dispute;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du litige',
          cause: error
        });
      }
    }),
    
  /**
   * Récupère les litiges d'un utilisateur
   */
  getUserDisputes: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(50).optional().default(10),
      status: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const disputes = await paymentServiceExt.getUserDisputes(userId, input);
        return disputes;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des litiges',
          cause: error
        });
      }
    }),

  /**
   * Récupère un litige par son ID
   */
  getDisputeById: protectedProcedure
    .input(z.object({
      disputeId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const dispute = await paymentServiceExt.getDisputeById(input.disputeId, userId);
        
        if (!dispute) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Litige non trouvé'
          });
        }
        
        return dispute;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération du litige',
          cause: error
        });
      }
    }),

  /**
   * Ajoute une preuve à un litige existant
   */
  addDisputeEvidence: protectedProcedure
    .input(z.object({
      disputeId: z.string(),
      evidenceType: z.enum([
        'RECEIPT',
        'SERVICE_DOCUMENTATION',
        'CUSTOMER_COMMUNICATION',
        'SHIPPING_DOCUMENTATION',
        'DUPLICATE_CHARGE_DOCUMENTATION',
        'OTHER'
      ]),
      fileUrl: z.string().url(),
      description: z.string().min(1).max(500)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const evidence = await paymentServiceExt.addDisputeEvidence(
          input.disputeId,
          userId,
          input.evidenceType,
          input.fileUrl
        );
        
        return evidence;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'ajout de la preuve',
          cause: error
        });
      }
    }),

  /**
   * Résout un litige (pour administrateurs)
   */
  resolveDispute: adminProcedure
    .input(z.object({
      disputeId: z.string(),
      resolution: z.enum(['APPROVED', 'DENIED']),
      amount: z.number().optional(),
      note: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session?.user.id ?? 'unknown';
        const result = await paymentServiceExt.resolveDispute(
          input.disputeId,
          input.resolution,
          adminId,
          input.note
        );
        
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la résolution du litige',
          cause: error
        });
      }
    }),

  /**
   * Paie une commission
   */
  payCommission: protectedProcedure
    .input(z.object({
      paymentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que le paiement existe et est complété
        const payment = await ctx.db.payment.findUnique({
          where: { id: input.paymentId },
          select: { status: true }
        });

        if (!payment) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Paiement non trouvé'
          });
        }

        if (payment.status !== 'COMPLETED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Impossible de calculer la commission pour un paiement non complété'
          });
        }

        // Calculer la commission
        const commission = await CommissionService.calculateCommission(input.paymentId);
        
        // Traiter la commission
        const result = await CommissionService.processCommission(commission.id);
        
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du paiement de la commission',
          cause: error
        });
      }
    }),

  /**
   * Génère un rapport de paiements pour une période donnée (pour administrateurs)
   */
  generatePaymentReport: adminProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY'),
      status: z.string().optional(),
      source: z.string().optional(),
      format: z.enum(['PDF', 'CSV', 'JSON']).default('JSON')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const report = await paymentServiceExt.generatePaymentReport(input);
        return report;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération du rapport',
          cause: error
        });
      }
    }),
    
  /**
   * Obtient des statistiques de paiement pour le tableau de bord
   */
  getPaymentStats: adminProcedure
    .query(async () => {
      try {
        const stats = await paymentServiceExt.getPaymentStats();
        return stats;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des statistiques',
          cause: error
        });
      }
    }),

  /**
   * Récupère tous les paiements (pour administrateurs, avec filtrage et pagination)
   */
  getAllPayments: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.string().optional(),
      source: z.string().optional(),
      userId: z.string().optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional(),
      sortField: z.string().optional().default('createdAt'),
      sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const payments = await paymentServiceExt.getAllPayments(input);
        return payments;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des paiements',
          cause: error
        });
      }
    }),

  /**
   * Récupère tous les litiges (pour administrateurs, avec filtrage et pagination)
   */
  getAllDisputes: adminProcedure
    .input(z.object({
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(50).optional().default(20),
      status: z.string().optional(),
      reason: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      sortField: z.string().optional().default('createdAt'),
      sortDirection: z.enum(['asc', 'desc']).optional().default('desc')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const disputes = await paymentServiceExt.getAllDisputes(input);
        return disputes;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des litiges',
          cause: error
        });
      }
    }),

  /**
   * Crée un paiement récurrent
   */
  createRecurringPayment: protectedProcedure
    .input(z.object({
      amount: z.number().positive(),
      currency: z.string().default('EUR'),
      frequency: z.enum(['MONTHLY', 'ANNUAL']),
      startDate: z.date().optional(),
      paymentMethodId: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string()).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const recurring = await paymentServiceExt.createRecurringPayment({
          ...input,
          userId
        });
        
        return recurring;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création du paiement récurrent',
          cause: error
        });
      }
    }),

  /**
   * Annule un paiement récurrent
   */
  cancelRecurringPayment: protectedProcedure
    .input(z.object({
      recurringPaymentId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session?.user.id;
        if (!userId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to perform this action',
          });
        }

        const result = await paymentServiceExt.cancelRecurringPayment(input.recurringPaymentId, userId);
        
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de l\'annulation du paiement récurrent',
          cause: error
        });
      }
    }),

  /**
   * Get all payments for the current user
   */
  getUserPayments: protectedProcedure
    .input(
      z.object({
        status: z.enum(['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
        page: z.number().default(1),
        limit: z.number().default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Calculer l'offset pour la pagination
      const skip = (input.page - 1) * input.limit;
      
      // Construire le filtre
      const where: Prisma.PaymentWhereInput = {
        userId,
        ...(input.status && input.status !== 'ALL' ? { status: input.status } : {}),
        ...(input.startDate ? { createdAt: { gte: input.startDate } } : {}),
        ...(input.endDate ? { createdAt: { lte: input.endDate } } : {}),
      };

      // Récupérer les paiements
      const payments = await ctx.db.payment.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: input.limit,
      });

      // Compter le nombre total pour la pagination
      const totalCount = await ctx.db.payment.count({ where });

      return {
        payments,
        pagination: {
          totalCount,
          pageCount: Math.ceil(totalCount / input.limit),
          currentPage: input.page,
          perPage: input.limit,
        },
      };
    }),

  /**
   * Get a single payment by ID
   */
  getPaymentDetails: protectedProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const payment = await ctx.db.payment.findUnique({
        where: {
          id: input.paymentId,
        },
        include: {
          invoice: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Payment not found',
        });
      }

      // Vérifier que l'utilisateur a accès à ce paiement (soit il l'a fait, soit il l'a reçu)
      // Note: On vérifie seulement userId car recipientId n'est pas défini dans tous les types de paiements
      // Vérification sécurisée qui fonctionne même si les champs n'existent pas
      const paymentRecipientId = typeof payment.metadata === 'object' && payment.metadata !== null 
        ? (payment.metadata as Record<string, any>)['recipientId'] 
        : undefined;
      
      if (payment.userId !== userId && paymentRecipientId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this payment',
        });
      }

      return payment;
    }),

  /**
   * Get financial tasks and reminders for the user
   */
  getFinancialTasks: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const nextMonth = new Date(today);
      nextMonth.setDate(today.getDate() + 30);

      // Récupérer les factures impayées
      const unpaidInvoices = await ctx.db.invoice.findMany({
        where: {
          userId,
          status: 'SENT', // Utilisation de SENT au lieu de PENDING (PENDING n'existe pas dans InvoiceStatus)
          dueDate: {
            lte: nextMonth,
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: 5,
      });

      // Récupérer les paiements récents
      const recentPayments = await ctx.db.payment.findMany({
        where: {
          userId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      // Récupérer d'abord le portefeuille de l'utilisateur
      let wallet;
      try {
        wallet = await localWalletService.getUserWallet(userId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération du portefeuille',
        });
      }

      // Récupérer les demandes de retrait en attente via le portefeuille de l'utilisateur
      // IMPORTANT: withdrawalRequest n'a pas de champ userId direct, seulement walletId
      const pendingWithdrawals = wallet ? await ctx.db.withdrawalRequest.findMany({
        where: {
          walletId: wallet.id, // Utiliser walletId et non userId
          status: 'PENDING',
        },
        orderBy: {
          requestedAt: 'desc',
        },
      }) : [];

      // Vérifier si l'abonnement va expirer bientôt
      const subscription = await ctx.db.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          endDate: {
            lte: nextMonth,
            gt: today,
          },
        },
      });

      // Créer les tâches financières
      const tasks = [
        // Tâches pour les factures impayées
        ...unpaidInvoices.map((invoice) => ({
          id: `invoice-${invoice.id}`,
          title: `Payer la facture #${invoice.number}`,
          description: `Facture de ${invoice.amount} ${invoice.currency} due le ${invoice.dueDate.toLocaleDateString()}`,
          dueDate: invoice.dueDate,
          completed: false,
          priority: invoice.dueDate < today ? 'high' : 'medium',
          category: 'invoice' as const,
        })),

        // Rappel pour les paiements récents
        ...recentPayments.map((payment) => ({
          id: `payment-${payment.id}`,
          title: `Paiement ${payment.status}`,
          description: `Paiement de ${payment.amount} ${payment.currency} effectué le ${payment.createdAt.toLocaleDateString()}`,
          dueDate: undefined,
          completed: payment.status === 'COMPLETED',
          priority: payment.status === 'FAILED' ? 'high' : 'low',
          category: 'payment' as const,
        })),

        // Demandes de retrait en attente
        ...pendingWithdrawals.map((withdrawal) => ({
          id: `withdrawal-${withdrawal.id}`,
          title: `Demande de retrait en attente`,
          description: `Retrait de ${withdrawal.amount} ${withdrawal.currency} demandé le ${withdrawal.requestedAt.toLocaleDateString()}`,
          dueDate: undefined,
          completed: false,
          priority: 'medium',
          category: 'withdrawal' as const,
        })),
      ];

      // Ajouter un rappel pour le renouvellement de l'abonnement si nécessaire
      if (subscription && subscription.endDate) {
        tasks.push({
          id: `subscription-${subscription.id}`,
          title: `Renouvellement d'abonnement`,
          description: `Votre abonnement expire le ${subscription.endDate.toLocaleDateString()}`,
          dueDate: undefined, // Utiliser undefined comme pour les autres tasks
          completed: false,
          priority: 'medium',
          category: 'payment' as const,
        });
      }

      return tasks;
    }),
});

export default paymentRouter;
