import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { 
  getOrCreateWallet, 
  createWithdrawalRequest, 
  processWithdrawalRequest
} from '@/server/services/wallet.service';
import { 
  WithdrawalStatus,
  UserRole 
} from '@prisma/client';
import { 
  isRoleAllowed,
  hasDocumentAccess
} from '@/lib/auth-helpers';
import { db } from '@/server/db';
import {
  withdrawalBaseSchema,
  requestWithdrawalSchema
} from '@/schemas/withdrawal.schema';

/**
 * Router tRPC pour la gestion des retraits depuis les portefeuilles
 * Fournit des endpoints pour demander, approuver, rejeter et suivre les retraits
 */
export const withdrawalRouter = router({
  /**
   * Demande un retrait depuis le portefeuille
   */
  requestWithdrawal: protectedProcedure
    .input(z.object({
      amount: z.number().positive().min(10, { message: 'Le montant minimum de retrait est de 10€' }),
      method: z.enum(['BANK_TRANSFER', 'STRIPE_CONNECT']).default('BANK_TRANSFER'),
      expedited: z.boolean().default(false),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { amount, method, expedited, notes } = input;
        
        // Vérifier que le rôle de l'utilisateur lui permet de faire des retraits
        if (!isRoleAllowed(ctx.session.user.role as UserRole, ['DELIVERER', 'PROVIDER', 'MERCHANT'])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Votre rôle ne vous permet pas d'effectuer des retraits"
          });
        }
        
        // Récupérer le portefeuille
        const wallet = await getOrCreateWallet(userId);
        
        // Vérifier que le portefeuille a les informations bancaires requises
        if (method === 'BANK_TRANSFER' && (!wallet.iban || !wallet.bic)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Veuillez configurer vos informations bancaires avant de demander un retrait'
          });
        }
        
        // Vérifier que le compte est vérifié
        if (!wallet.accountVerified && process.env.DEMO_MODE !== 'true') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Votre compte bancaire doit être vérifié avant de pouvoir effectuer un retrait'
          });
        }
        
        // Créer la demande de retrait
        const withdrawalRequest = await createWithdrawalRequest(userId, amount, {
          method,
          expedited,
          notes
        });
        
        return {
          success: true,
          withdrawalRequest,
          message: `Demande de retrait de ${amount} ${wallet.currency} créée avec succès`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la demande de retrait",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les demandes de retrait de l'utilisateur connecté
   */
  getMyWithdrawals: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      status: z.enum(['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { page, limit, status, sortOrder } = input;
        
        // Récupérer le portefeuille
        const wallet = await getOrCreateWallet(userId);
        
        // Construire le filtre
        const where: any = {
          walletId: wallet.id
        };
        
        if (status && status !== 'ALL') {
          where.status = status;
        }
        
        // Récupérer les demandes de retrait
        const [withdrawals, total] = await Promise.all([
          ctx.db.withdrawalRequest.findMany({
            where,
            orderBy: { requestedAt: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              processedByAdmin: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }),
          ctx.db.withdrawalRequest.count({ where })
        ]);
        
        return {
          withdrawals,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des retraits",
          cause: error,
        });
      }
    }),

  /**
   * Récupère une demande de retrait spécifique
   */
  getWithdrawalById: protectedProcedure
    .input(z.object({
      withdrawalId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { withdrawalId } = input;
        
        // Récupérer la demande de retrait
        const withdrawal = await ctx.db.withdrawalRequest.findUnique({
          where: { id: withdrawalId },
          include: {
            wallet: {
              select: {
                userId: true,
                currency: true,
                accountVerified: true
              }
            },
            processedByAdmin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        if (!withdrawal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Demande de retrait non trouvée'
          });
        }
        
        // Vérifier que l'utilisateur a le droit d'accéder à cette demande
        if (withdrawal.wallet.userId !== userId && ctx.session.user.role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à accéder à cette demande de retrait"
          });
        }
        
        // Récupérer les détails supplémentaires
        const relatedTransactions = await ctx.db.walletTransaction.findMany({
          where: {
            walletId: withdrawal.walletId,
            metadata: {
              path: ['withdrawalId'],
              equals: withdrawalId
            }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        // Calculer les dates importantes
        const now = new Date();
        const daysSinceRequest = withdrawal.requestedAt
          ? Math.floor((now.getTime() - withdrawal.requestedAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        const daysUntilArrival = withdrawal.estimatedArrival
          ? Math.max(0, Math.floor((withdrawal.estimatedArrival.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null;
        
        return {
          withdrawal,
          relatedTransactions,
          timing: {
            daysSinceRequest,
            daysUntilArrival,
            isExpedited: withdrawal.expedited
          },
          canCancel: withdrawal.status === 'PENDING' && withdrawal.wallet.userId === userId,
          isAdmin: ctx.session.user.role === 'ADMIN',
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération du retrait",
          cause: error,
        });
      }
    }),

  /**
   * Annule une demande de retrait en attente
   */
  cancelWithdrawal: protectedProcedure
    .input(z.object({
      withdrawalId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
    try {
      const userId = ctx.session.user.id;
        const { withdrawalId } = input;
        
        // Récupérer la demande de retrait
        const withdrawal = await ctx.db.withdrawalRequest.findUnique({
          where: { id: withdrawalId },
          include: {
            wallet: {
              select: {
                userId: true
              }
            }
          }
        });
        
        if (!withdrawal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Demande de retrait non trouvée'
          });
        }
        
        // Vérifier que l'utilisateur est le propriétaire de la demande
        if (withdrawal.wallet.userId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à annuler cette demande de retrait"
          });
        }
        
        // Vérifier que la demande est en attente
        if (withdrawal.status !== 'PENDING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible d'annuler un retrait avec le statut "${withdrawal.status}"`
          });
        }
        
        // Annuler la demande
        const updatedWithdrawal = await ctx.db.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
            metadata: {
              ...withdrawal.metadata,
              cancelledByUser: true,
              cancelledAt: new Date().toISOString()
            }
          }
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'WITHDRAWAL_REQUEST',
            entityId: withdrawalId,
            performedById: userId,
            action: 'CANCEL_WITHDRAWAL',
            changes: {
              previousStatus: withdrawal.status,
              newStatus: 'CANCELLED'
            }
          }
        });
        
        return {
          success: true,
          withdrawal: updatedWithdrawal,
          message: 'Demande de retrait annulée avec succès'
        };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'annulation du retrait",
        cause: error,
      });
    }
  }),

  // ===== ADMIN PROCEDURES =====

  /**
   * Récupère toutes les demandes de retrait (admin uniquement)
   */
  getAllWithdrawals: adminProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      status: z.enum(['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
      userId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, status, userId, startDate, endDate, sortOrder } = input;
        
        // Construire le filtre
        const where: any = {};
        
        if (status && status !== 'ALL') {
          where.status = status;
        }
        
        if (userId) {
          const wallet = await ctx.db.wallet.findUnique({
            where: { userId },
            select: { id: true }
          });
          
          if (wallet) {
            where.walletId = wallet.id;
          } else {
            // Si l'utilisateur n'a pas de portefeuille, retourner un résultat vide
            return {
              withdrawals: [],
              pagination: {
                total: 0,
                page,
                limit,
                pages: 0
              }
            };
          }
        }
        
        if (startDate || endDate) {
          where.requestedAt = {};
          if (startDate) where.requestedAt.gte = startDate;
          if (endDate) where.requestedAt.lte = endDate;
        }
        
        // Récupérer les demandes de retrait
        const [withdrawals, total] = await Promise.all([
          ctx.db.withdrawalRequest.findMany({
            where,
            orderBy: { requestedAt: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              wallet: {
                select: {
                  userId: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true
                    }
                  }
                }
              },
              processedByAdmin: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }),
          ctx.db.withdrawalRequest.count({ where })
        ]);
        
        // Statistiques des retraits
        const stats = await ctx.db.withdrawalRequest.groupBy({
          by: ['status'],
          _count: true,
          _sum: {
            amount: true
          }
        });
        
        return {
          withdrawals,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          },
          stats
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des retraits",
          cause: error,
        });
      }
    }),

  /**
   * Approuve une demande de retrait (admin uniquement)
   */
  approveWithdrawal: adminProcedure
    .input(z.object({
      withdrawalId: z.string(),
      notes: z.string().optional(),
      processImmediately: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { withdrawalId, notes, processImmediately } = input;
        
        // Récupérer la demande de retrait
        const withdrawal = await ctx.db.withdrawalRequest.findUnique({
          where: { id: withdrawalId },
          include: {
            wallet: true
          }
        });
        
        if (!withdrawal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Demande de retrait non trouvée'
          });
        }
        
        // Vérifier que la demande est en attente
        if (withdrawal.status !== 'PENDING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible d'approuver un retrait avec le statut "${withdrawal.status}"`
          });
        }
        
        // Définir le statut selon le processus
        const newStatus = processImmediately ? 'COMPLETED' : 'PROCESSING';
        
        // Mise à jour de la demande via le service
        const result = await processWithdrawalRequest(withdrawalId, {
          action: 'APPROVE',
          adminId,
          notes,
          completeImmediately: processImmediately
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'WITHDRAWAL_REQUEST',
            entityId: withdrawalId,
            performedById: adminId,
            action: 'APPROVE_WITHDRAWAL',
            changes: {
              previousStatus: withdrawal.status,
              newStatus,
              processImmediately: processImmediately.toString(),
              notes: notes || ''
            }
          }
        });
        
        return {
          success: true,
          withdrawal: result,
          message: processImmediately
            ? 'Demande de retrait approuvée et traitée avec succès'
            : 'Demande de retrait approuvée et mise en traitement'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'approbation du retrait",
          cause: error,
        });
      }
    }),

  /**
   * Rejette une demande de retrait (admin uniquement)
   */
  rejectWithdrawal: adminProcedure
    .input(z.object({
      withdrawalId: z.string(),
      reason: z.string().min(5).max(200),
      notifyUser: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { withdrawalId, reason, notifyUser } = input;
        
        // Récupérer la demande de retrait
        const withdrawal = await ctx.db.withdrawalRequest.findUnique({
          where: { id: withdrawalId },
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        
        if (!withdrawal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Demande de retrait non trouvée'
          });
        }
        
        // Vérifier que la demande est en attente ou en traitement
        if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible de rejeter un retrait avec le statut "${withdrawal.status}"`
          });
        }
        
        // Mise à jour de la demande via le service
        const result = await processWithdrawalRequest(withdrawalId, {
          action: 'REJECT',
          adminId,
          reason,
          notifyUser
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'WITHDRAWAL_REQUEST',
            entityId: withdrawalId,
            performedById: adminId,
            action: 'REJECT_WITHDRAWAL',
            changes: {
              previousStatus: withdrawal.status,
              newStatus: 'FAILED',
              reason,
              notifyUser: notifyUser.toString()
            }
          }
        });
        
        return {
          success: true,
          withdrawal: result,
          message: 'Demande de retrait rejetée avec succès'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors du rejet du retrait",
          cause: error,
        });
      }
    }),

  /**
   * Marque une demande de retrait comme complétée (admin uniquement)
   */
  completeWithdrawal: adminProcedure
    .input(z.object({
      withdrawalId: z.string(),
      transferReference: z.string().optional(),
      notes: z.string().optional(),
      notifyUser: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { withdrawalId, transferReference, notes, notifyUser } = input;
        
        // Récupérer la demande de retrait
        const withdrawal = await ctx.db.withdrawalRequest.findUnique({
          where: { id: withdrawalId },
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true
                  }
                }
              }
            }
          }
        });
        
        if (!withdrawal) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Demande de retrait non trouvée'
          });
        }
        
        // Vérifier que la demande est en traitement
        if (withdrawal.status !== 'PROCESSING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible de compléter un retrait avec le statut "${withdrawal.status}"`
          });
        }
        
        // Mise à jour de la demande via le service
        const result = await processWithdrawalRequest(withdrawalId, {
          action: 'COMPLETE',
          adminId,
          notes,
          transferReference,
          notifyUser
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'WITHDRAWAL_REQUEST',
            entityId: withdrawalId,
            performedById: adminId,
            action: 'COMPLETE_WITHDRAWAL',
            changes: {
              previousStatus: withdrawal.status,
              newStatus: 'COMPLETED',
              transferReference: transferReference || '',
              notes: notes || '',
              notifyUser: notifyUser.toString()
            }
          }
        });
        
        return {
          success: true,
          withdrawal: result,
          message: 'Demande de retrait complétée avec succès'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la complétion du retrait",
          cause: error,
        });
      }
    }),

  /**
   * Récupère des statistiques sur les retraits (admin uniquement)
   */
  getWithdrawalStats: adminProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      groupBy: z.enum(['day', 'week', 'month']).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { startDate, endDate, groupBy } = input;
        
        // Filtrage par date
        const dateFilter: any = {};
        if (startDate) dateFilter.gte = startDate;
        if (endDate) dateFilter.lte = endDate;
        
        // Statistiques globales
        const [totalStats, statusStats, userStats] = await Promise.all([
          // Statistiques totales
          ctx.db.withdrawalRequest.aggregate({
            _count: true,
            _sum: {
              amount: true
            },
            where: startDate || endDate ? { requestedAt: dateFilter } : undefined
          }),
          
          // Statistiques par statut
          ctx.db.withdrawalRequest.groupBy({
            by: ['status'],
            _count: true,
            _sum: {
              amount: true
            },
            where: startDate || endDate ? { requestedAt: dateFilter } : undefined
          }),
          
          // Top utilisateurs avec le plus de retraits
          ctx.db.withdrawalRequest.groupBy({
            by: ['walletId'],
            _count: true,
            _sum: {
              amount: true
            },
            orderBy: {
              _sum: {
                amount: 'desc'
              }
            },
            take: 10,
            where: startDate || endDate ? { requestedAt: dateFilter } : undefined
          })
        ]);
        
        // Récupérer les informations des utilisateurs pour les top retraits
        const walletIds = userStats.map(stat => stat.walletId);
        const wallets = await ctx.db.wallet.findMany({
          where: { id: { in: walletIds } },
          select: {
            id: true,
            userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                role: true
              }
            }
          }
        });
        
        // Associer les utilisateurs aux statistiques
        const topUsers = userStats.map(stat => {
          const wallet = wallets.find(w => w.id === stat.walletId);
          return {
            withdrawals: stat._count,
            totalAmount: stat._sum.amount,
            walletId: stat.walletId,
            user: wallet?.user
          };
      });

      return {
          total: {
            count: totalStats._count,
            amount: totalStats._sum.amount
          },
          byStatus: statusStats.map(stat => ({
            status: stat.status,
            count: stat._count,
            amount: stat._sum.amount
          })),
          topUsers,
          period: {
            startDate: startDate || null,
            endDate: endDate || null
          }
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des statistiques",
        cause: error,
      });
    }
  }),

  /**
   * Simule un retrait en mode démonstration
   */
  simulateWithdrawal: protectedProcedure
    .input(z.object({
      amount: z.number().positive().min(10),
      expedited: z.boolean().default(false),
      method: z.enum(['BANK_TRANSFER', 'STRIPE_CONNECT']).default('BANK_TRANSFER'),
      simulateAdminProcess: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier qu'on est en mode démo
        if (process.env.DEMO_MODE !== 'true') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette fonctionnalité est uniquement disponible en mode démonstration'
          });
        }
        
        const userId = ctx.session.user.id;
        const { amount, expedited, method, simulateAdminProcess } = input;
        
        // Créer la demande de retrait
        const withdrawalRequest = await createWithdrawalRequest(userId, amount, {
          method,
          expedited,
          notes: 'Retrait simulé en mode démonstration'
        });
        
        // Simuler le traitement automatique par un admin si demandé
        if (simulateAdminProcess) {
          const adminUser = await ctx.db.user.findFirst({
            where: { role: 'ADMIN' },
            select: { id: true }
          });
          
          if (adminUser) {
            await processWithdrawalRequest(withdrawalRequest.id, {
              action: 'APPROVE',
              adminId: adminUser.id,
              notes: 'Retrait approuvé automatiquement (simulation)',
              completeImmediately: true
            });
          }
        }
        
        return {
          success: true,
          withdrawal: withdrawalRequest,
          message: `Demande de retrait de ${amount}€ créée avec succès`,
          simulatedAdminProcess: simulateAdminProcess
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la simulation du retrait",
          cause: error,
        });
      }
    })
});

export default withdrawalRouter;
