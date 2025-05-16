import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { withdrawalService } from '@/server/services/withdrawal.service';
import {
  createWithdrawalRequestSchema,
  processWithdrawalRequestSchema,
  finalizeBankTransferSchema,
  withdrawalSearchSchema,
  pendingWithdrawalsSchema,
  withdrawalStatsSchema,
} from '@/schemas/withdrawal.schema';

/**
 * Routeur tRPC pour la gestion des virements bancaires
 */
export const withdrawalRouter = router({
  /**
   * Crée une nouvelle demande de virement
   */
  createWithdrawalRequest: protectedProcedure
    .input(createWithdrawalRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const withdrawalRequest = await withdrawalService.createWithdrawalRequest(
          userId,
          input.amount,
          input.preferredMethod
        );

        return withdrawalRequest;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la création de la demande de virement',
          cause: error,
        });
      }
    }),

  /**
   * Récupère les détails d'une demande de virement
   */
  getWithdrawalDetails: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await withdrawalService.getWithdrawalRequestDetails(input.requestId, userId);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des détails du virement',
          cause: error,
        });
      }
    }),

  /**
   * Récupère l'historique des demandes de virement d'un utilisateur
   */
  getUserWithdrawalHistory: protectedProcedure
    .input(withdrawalSearchSchema.omit({ userId: true, walletId: true }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const result = await withdrawalService.getUserWithdrawalHistory(userId, input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération de l'historique des virements",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les statistiques de virement pour un utilisateur
   */
  getUserWithdrawalStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;
      const stats = await withdrawalService.getUserWithdrawalStats(userId);
      return stats;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la récupération des statistiques de virement',
        cause: error,
      });
    }
  }),

  // Endpoints administrateurs

  /**
   * Récupère toutes les demandes de virement en attente (admin)
   */
  getPendingWithdrawals: adminProcedure
    .input(pendingWithdrawalsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const result = await withdrawalService.getPendingWithdrawals(input);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération des virements en attente',
          cause: error,
        });
      }
    }),

  /**
   * Traite (approuve ou rejette) une demande de virement (admin)
   */
  processWithdrawalRequest: adminProcedure
    .input(processWithdrawalRequestSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const result = await withdrawalService.processWithdrawalRequest(
          input.requestId,
          input.action,
          adminId,
          input.notes
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du traitement de la demande de virement',
          cause: error,
        });
      }
    }),

  /**
   * Finalise un virement bancaire (admin)
   */
  finalizeBankTransfer: adminProcedure
    .input(finalizeBankTransferSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const details = {
          reference: input.reference,
          failureReason: input.failureReason,
        };

        const result = await withdrawalService.finalizeBankTransfer(
          input.bankTransferId,
          input.status,
          adminId,
          details
        );

        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la finalisation du virement bancaire',
          cause: error,
        });
      }
    }),

  /**
   * Recherche des demandes de virement avec filtrage (admin)
   */
  searchWithdrawals: adminProcedure.input(withdrawalSearchSchema).query(async ({ ctx, input }) => {
    try {
      // Si l'utilisateur est spécifié, rechercher par ID utilisateur
      if (input.userId) {
        const result = await withdrawalService.getUserWithdrawalHistory(input.userId, {
          page: input.page,
          limit: input.limit,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return result;
      }

      // Si le wallet est spécifié, rechercher par ID wallet
      if (input.walletId) {
        // Pour cet exemple, nous récupérons d'abord l'utilisateur associé au wallet
        const wallet = await ctx.db.wallet.findUnique({
          where: { id: input.walletId },
          select: { userId: true },
        });

        if (!wallet) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Portefeuille non trouvé',
          });
        }

        const result = await withdrawalService.getUserWithdrawalHistory(wallet.userId, {
          page: input.page,
          limit: input.limit,
          status: input.status,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        return result;
      }

      // Si aucun filtre spécifique, rechercher toutes les demandes (avec pagination)
      const requests = await ctx.db.withdrawalRequest.findMany({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.startDate && input.endDate
            ? {
                requestedAt: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              }
            : {}),
        },
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          bankTransfer: true,
        },
        orderBy: { requestedAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      });

      const total = await ctx.db.withdrawalRequest.count({
        where: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.startDate && input.endDate
            ? {
                requestedAt: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              }
            : {}),
        },
      });

      return {
        withdrawalRequests: requests,
        pagination: {
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Erreur lors de la recherche des demandes de virement',
        cause: error,
      });
    }
  }),

  /**
   * Génère un rapport de virements pour une période donnée (admin)
   */
  generateWithdrawalReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        format: z.enum(['PDF', 'CSV', 'JSON']).default('JSON'),
        includeUserDetails: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { startDate, endDate } = input;

        // Récupérer toutes les demandes de virement pour la période
        const withdrawalRequests = await ctx.db.withdrawalRequest.findMany({
          where: {
            requestedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            wallet: {
              include: {
                user: input.includeUserDetails
                  ? {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                      },
                    }
                  : false,
              },
            },
            bankTransfer: true,
          },
          orderBy: { requestedAt: 'desc' },
        });

        // Calculer les statistiques
        const totalRequested = withdrawalRequests.reduce((sum, req) => sum + Number(req.amount), 0);

        const completedRequests = withdrawalRequests.filter(req => req.status === 'COMPLETED');
        const totalCompleted = completedRequests.reduce((sum, req) => sum + Number(req.amount), 0);

        const rejectedRequests = withdrawalRequests.filter(req => req.status === 'REJECTED');
        const totalRejected = rejectedRequests.reduce((sum, req) => sum + Number(req.amount), 0);

        const pendingRequests = withdrawalRequests.filter(
          req => req.status === 'PENDING' || req.status === 'PROCESSING'
        );
        const totalPending = pendingRequests.reduce((sum, req) => sum + Number(req.amount), 0);

        // Regrouper par statut
        const byStatus = withdrawalRequests.reduce((acc: any, req) => {
          if (!acc[req.status]) {
            acc[req.status] = { count: 0, amount: 0 };
          }
          acc[req.status].count++;
          acc[req.status].amount += Number(req.amount);
          return acc;
        }, {});

        // Formater le rapport selon le format demandé
        if (input.format === 'JSON') {
          return {
            period: { startDate, endDate },
            summary: {
              totalRequests: withdrawalRequests.length,
              totalAmount: totalRequested,
              completedCount: completedRequests.length,
              completedAmount: totalCompleted,
              rejectedCount: rejectedRequests.length,
              rejectedAmount: totalRejected,
              pendingCount: pendingRequests.length,
              pendingAmount: totalPending,
            },
            byStatus,
            withdrawalRequests,
          };
        }

        // Pour les autres formats, on renvoie l'URL du fichier généré
        // Dans une implémentation réelle, on générerait le fichier correspondant
        return {
          format: input.format,
          url: `/reports/withdrawals_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.${input.format.toLowerCase()}`,
          summary: {
            totalRequests: withdrawalRequests.length,
            totalAmount: totalRequested,
            completedCount: completedRequests.length,
            completedAmount: totalCompleted,
          },
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la génération du rapport',
          cause: error,
        });
      }
    }),
});

export default withdrawalRouter;
