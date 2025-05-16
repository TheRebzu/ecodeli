import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/api/trpc';
import { UserRole } from '@prisma/client';
import { walletService } from '@/server/services/wallet.service';
import { withdrawalService } from '@/server/services/withdrawal.service';
import { CreateWithdrawalSchema } from '@/schemas/withdrawal.schema';
import { WalletService } from '@/server/services/wallet.service';
import { AuditService } from '@/server/services/audit.service';
import { AuditAction } from '@prisma/client';

export const walletRouter = router({
  /**
   * Récupère le portefeuille de l'utilisateur connecté
   */
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    try {
      const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);
      return wallet;
    } catch (error) {
      console.error('Erreur lors de la récupération du portefeuille:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: (error as Error).message,
        cause: error,
      });
    }
  }),

  /**
   * Récupère le solde du portefeuille
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Récupérer le portefeuille
      const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

      // Récupérer le solde
      const balance = await walletService.getBalance(wallet.id);
      return balance;
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: (error as Error).message,
        cause: error,
      });
    }
  }),

  /**
   * Récupère l'historique des transactions
   */
  getTransactionHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit } = input;

        // Récupérer le portefeuille
        const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

        // Récupérer l'historique des transactions
        const history = await walletService.getTransactionHistory(wallet.id, page, limit);
        return history;
      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique des transactions:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: (error as Error).message,
          cause: error,
        });
      }
    }),

  /**
   * Récupère les statistiques du portefeuille
   */
  getWalletStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Récupérer le portefeuille
      const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

      // Récupérer les statistiques
      const stats = await walletService.getWalletStats(wallet.id);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques du portefeuille:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: (error as Error).message,
        cause: error,
      });
    }
  }),

  /**
   * Crée un compte Stripe Connect
   */
  createConnectAccount: protectedProcedure
    .input(
      z.object({
        country: z.string().default('FR'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { country } = input;

        // Récupérer le portefeuille
        const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

        // Vérifier si le portefeuille a déjà un compte Stripe
        if (wallet.stripeAccountId && wallet.accountVerified) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Vous avez déjà un compte Stripe Connect vérifié',
          });
        }

        // Créer le compte Connect
        const result = await walletService.createStripeConnectAccount(
          ctx.session.user.id,
          ctx.session.user.email,
          country
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Échec de la création du compte Stripe Connect',
            cause: result.error,
          });
        }

        return {
          accountId: result.accountId,
          success: true,
        };
      } catch (error) {
        console.error('Erreur lors de la création du compte Stripe Connect:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: (error as Error).message,
          cause: error,
        });
      }
    }),

  /**
   * Génère un lien d'onboarding pour le compte Stripe Connect
   */
  generateOnboardingLink: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { returnUrl } = input;

        // Récupérer le portefeuille
        const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

        // Vérifier si le portefeuille a un compte Stripe
        if (!wallet.stripeAccountId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Vous devez d'abord créer un compte Stripe Connect",
          });
        }

        // Générer le lien d'onboarding
        const result = await walletService.generateOnboardingLink(
          wallet.stripeAccountId,
          returnUrl
        );

        if (!result.success) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "Échec de la génération du lien d'onboarding",
            cause: result.error,
          });
        }

        return {
          url: result.url,
          success: true,
        };
      } catch (error) {
        console.error("Erreur lors de la génération du lien d'onboarding:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: (error as Error).message,
          cause: error,
        });
      }
    }),

  /**
   * Vérifie l'état de vérification du compte Stripe Connect
   */
  checkConnectAccountStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Récupérer le portefeuille
      const wallet = await walletService.getOrCreateWallet(ctx.session.user.id);

      // Si pas de compte Stripe, retourner un statut par défaut
      if (!wallet.stripeAccountId) {
        return {
          isVerified: false,
          stripeAccountId: null,
          success: true,
        };
      }

      // Vérifier le statut du compte
      const status = await walletService.checkConnectAccountStatus(wallet.id);

      return {
        isVerified: wallet.accountVerified,
        stripeAccountId: wallet.stripeAccountId,
        details: status,
        success: true,
      };
    } catch (error) {
      console.error('Erreur lors de la vérification du compte Stripe Connect:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: (error as Error).message,
        cause: error,
      });
    }
  }),

  /**
   * Récupère les demandes de virement
   */
  getWithdrawals: protectedProcedure
    .input(
      z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un livreur ou un prestataire
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { role: true },
        });

        if (!user || (user.role !== UserRole.DELIVERER && user.role !== UserRole.PROVIDER)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non autorisé à accéder aux demandes de virement',
          });
        }

        return await withdrawalService.getUserWithdrawals(
          ctx.session.user.id,
          input.page,
          input.limit
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des demandes de virement',
          cause: error,
        });
      }
    }),

  /**
   * Crée une demande de virement
   */
  createWithdrawalRequest: protectedProcedure
    .input(CreateWithdrawalSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un livreur ou un prestataire
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { role: true },
        });

        if (!user || (user.role !== UserRole.DELIVERER && user.role !== UserRole.PROVIDER)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non autorisé à créer une demande de virement',
          });
        }

        const withdrawal = await withdrawalService.createWithdrawalRequest(
          ctx.session.user.id,
          input.amount,
          input.currency
        );

        return { withdrawal };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création de la demande de virement',
          cause: error,
        });
      }
    }),

  /**
   * Annule une demande de virement
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({ withdrawalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un livreur ou un prestataire
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { role: true },
        });

        if (!user || (user.role !== UserRole.DELIVERER && user.role !== UserRole.PROVIDER)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Non autorisé à annuler une demande de virement',
          });
        }

        const withdrawal = await withdrawalService.cancelWithdrawal(
          input.withdrawalId,
          ctx.session.user.id
        );

        return { withdrawal };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'annulation de la demande de virement",
          cause: error,
        });
      }
    }),

  /**
   * Obtenir le solde du portefeuille de l'utilisateur connecté
   */
  getUserWalletBalance: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Créer une instance de WalletService avec la connexion db du contexte
    const walletService = new WalletService(ctx.db);
    const wallet = await walletService.getUserWallet(userId);

    if (!wallet) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Wallet not found',
      });
    }

    // Calculer le montant disponible, en attente et réservé
    const pendingAmount = await walletService.getPendingAmount(userId);
    const reservedAmount = await walletService.getReservedAmount(userId);
    const availableAmount = wallet.balance - pendingAmount - reservedAmount;

    return {
      balance: wallet.balance,
      currency: wallet.currency,
      lastUpdated: wallet.updatedAt,
      pendingAmount,
      reservedAmount,
      availableAmount,
    };
  }),

  /**
   * Obtenir l'historique des transactions du portefeuille
   */
  getWalletTransactions: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        type: z.enum(['ALL', 'CREDIT', 'DEBIT', 'WITHDRAWAL']).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const walletService = new WalletService(ctx.db);

      const skip = (input.page - 1) * input.limit;
      const { transactions, total } = await walletService.getWalletTransactions(userId, {
        skip,
        take: input.limit,
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      return {
        transactions,
        pagination: {
          totalCount: total,
          pageCount: Math.ceil(total / input.limit),
          currentPage: input.page,
          perPage: input.limit,
        },
      };
    }),

  /**
   * Transférer des fonds entre utilisateurs
   */
  transferFunds: protectedProcedure
    .input(
      z.object({
        recipientId: z.string(),
        amount: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const senderId = ctx.session.user.id;
      const walletService = new WalletService(ctx.db);
      const auditService = new AuditService(ctx.db);

      // Vérifier si l'utilisateur a suffisamment de fonds
      const senderWallet = await walletService.getUserWallet(senderId);
      if (!senderWallet || senderWallet.balance < input.amount) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Insufficient funds',
        });
      }

      // Vérifier si le destinataire existe
      const recipientWallet = await walletService.getUserWallet(input.recipientId);
      if (!recipientWallet) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Recipient not found',
        });
      }

      // Effectuer le transfert
      const transaction = await walletService.transferFunds({
        senderId,
        recipientId: input.recipientId,
        amount: input.amount,
        description: input.description || 'Transfert de fonds',
      });

      // Journaliser l'action
      await auditService.log({
        userId: senderId,
        action: AuditAction.FUNDS_TRANSFER,
        resource: 'wallet',
        resourceId: transaction.id,
        details: {
          amount: input.amount,
          recipientId: input.recipientId,
          description: input.description,
        },
      });

      return transaction;
    }),
});
