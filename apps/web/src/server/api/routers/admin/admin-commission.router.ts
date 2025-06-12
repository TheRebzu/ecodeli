import { z } from 'zod';
import { router, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { UserRole } from '@prisma/client';

/**
 * Router pour la gestion des commissions administratives
 * Gestion des taux de commission par service, rôle et type de transaction
 */

// Schémas de validation
const commissionRateSchema = z.object({
  serviceType: z.string().min(1, 'Type de service requis'),
  userRole: z.nativeEnum(UserRole),
  rate: z.number().min(0).max(1, 'Le taux doit être entre 0 et 1'),
  calculationType: z.enum(['PERCENTAGE', 'FLAT_FEE']).default('PERCENTAGE'),
  flatFee: z.number().min(0).optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumAmount: z.number().min(0).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  validFrom: z.date().default(() => new Date()),
  validUntil: z.date().optional(),
  // Conditions spécifiques
  minTransactionAmount: z.number().min(0).optional(),
  maxTransactionAmount: z.number().min(0).optional(),
  geographicZone: z.string().optional(),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT', 'ANYTIME']).default('ANYTIME'),
  dayOfWeek: z
    .array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']))
    .optional(),
  // Métriques de performance
  performanceThreshold: z.number().min(0).max(100).optional(),
  volumeThreshold: z.number().min(0).optional(),
});

const commissionFiltersSchema = z.object({
  serviceType: z.string().optional(),
  userRole: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  validAt: z.date().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['rate', 'serviceType', 'createdAt', 'validFrom']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const commissionStatsSchema = z.object({
  period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
  userRole: z.nativeEnum(UserRole).optional(),
  serviceType: z.string().optional(),
});

export const adminCommissionRouter = router({
  /**
   * Obtenir tous les taux de commission avec filtres
   */
  getCommissionRates: protectedProcedure
    .input(commissionFiltersSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent consulter les commissions',
        });
      }

      try {
        // Construire les filtres
        const where: any = {};

        if (input.serviceType) {
          where.serviceType = { contains: input.serviceType, mode: 'insensitive' };
        }

        if (input.userRole) {
          where.userRole = input.userRole;
        }

        if (input.isActive !== undefined) {
          where.isActive = input.isActive;
        }

        if (input.validAt) {
          where.AND = [
            { validFrom: { lte: input.validAt } },
            {
              OR: [{ validUntil: null }, { validUntil: { gte: input.validAt } }],
            },
          ];
        }

        if (input.search) {
          where.OR = [
            { serviceType: { contains: input.search, mode: 'insensitive' } },
            { description: { contains: input.search, mode: 'insensitive' } },
          ];
        }

        const orderBy: any = {};
        orderBy[input.sortBy] = input.sortOrder;

        const [commissions, totalCount] = await Promise.all([
          ctx.db.commissionRule.findMany({
            where,
            orderBy,
            skip: input.offset,
            take: input.limit,
            include: {
              createdBy: {
                select: { name: true, email: true },
              },
            },
          }),
          ctx.db.commissionRule.count({ where }),
        ]);

        return {
          success: true,
          data: commissions,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des taux de commission',
        });
      }
    }),

  /**
   * Créer un nouveau taux de commission
   */
  createCommissionRate: protectedProcedure
    .input(commissionRateSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent créer des taux de commission',
        });
      }

      try {
        // Vérifier qu'il n'existe pas déjà un taux actif pour cette combinaison
        const existingRate = await ctx.db.commissionRule.findFirst({
          where: {
            serviceType: input.serviceType,
            userRole: input.userRole,
            isActive: true,
            validFrom: { lte: input.validFrom },
            OR: [{ validUntil: null }, { validUntil: { gte: input.validFrom } }],
          },
        });

        if (existingRate) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Un taux de commission actif existe déjà pour cette combinaison',
          });
        }

        const commissionRule = await ctx.db.commissionRule.create({
          data: {
            ...input,
            createdById: user.id,
          },
          include: {
            createdBy: {
              select: { name: true, email: true },
            },
          },
        });

        // Créer un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'COMMISSION_RULE',
            entityId: commissionRule.id,
            action: 'COMMISSION_RULE_CREATED',
            performedById: user.id,
            details: {
              serviceType: input.serviceType,
              userRole: input.userRole,
              rate: input.rate,
              calculationType: input.calculationType,
            },
          },
        });

        return {
          success: true,
          data: commissionRule,
          message: 'Taux de commission créé avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création du taux de commission',
        });
      }
    }),

  /**
   * Mettre à jour un taux de commission
   */
  updateCommissionRate: protectedProcedure
    .input(
      z
        .object({
          id: z.string().cuid(),
        })
        .merge(commissionRateSchema.partial())
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent modifier les taux de commission',
        });
      }

      try {
        const { id, ...updateData } = input;

        const existingRule = await ctx.db.commissionRule.findUnique({
          where: { id },
        });

        if (!existingRule) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Taux de commission non trouvé',
          });
        }

        const updatedRule = await ctx.db.commissionRule.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
          include: {
            createdBy: {
              select: { name: true, email: true },
            },
          },
        });

        // Créer un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'COMMISSION_RULE',
            entityId: id,
            action: 'COMMISSION_RULE_UPDATED',
            performedById: user.id,
            details: {
              changes: updateData,
              previousValues: {
                rate: existingRule.rate,
                isActive: existingRule.isActive,
              },
            },
          },
        });

        return {
          success: true,
          data: updatedRule,
          message: 'Taux de commission mis à jour avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour du taux de commission',
        });
      }
    }),

  /**
   * Désactiver un taux de commission
   */
  deactivateCommissionRate: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent désactiver les taux de commission',
        });
      }

      try {
        const updatedRule = await ctx.db.commissionRule.update({
          where: { id: input.id },
          data: {
            isActive: false,
            validUntil: new Date(),
            description: input.reason
              ? `${input.reason} (Désactivé le ${new Date().toLocaleDateString()})`
              : `Désactivé le ${new Date().toLocaleDateString()}`,
          },
        });

        // Créer un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'COMMISSION_RULE',
            entityId: input.id,
            action: 'COMMISSION_RULE_DEACTIVATED',
            performedById: user.id,
            details: {
              reason: input.reason,
              deactivatedAt: new Date(),
            },
          },
        });

        return {
          success: true,
          data: updatedRule,
          message: 'Taux de commission désactivé avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la désactivation du taux de commission',
        });
      }
    }),

  /**
   * Obtenir les statistiques des commissions
   */
  getCommissionStats: protectedProcedure
    .input(commissionStatsSchema)
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      try {
        const { startDate, endDate } = calculatePeriodDates(input.period);

        const baseWhere = {
          createdAt: { gte: startDate, lte: endDate },
          ...(input.userRole && { userRole: input.userRole }),
          ...(input.serviceType && { serviceType: input.serviceType }),
        };

        const [
          totalRules,
          activeRules,
          averageRate,
          rulesByRole,
          rulesByServiceType,
          recentChanges,
        ] = await Promise.all([
          // Total des règles
          ctx.db.commissionRule.count({ where: baseWhere }),

          // Règles actives
          ctx.db.commissionRule.count({
            where: { ...baseWhere, isActive: true },
          }),

          // Taux moyen
          ctx.db.commissionRule.aggregate({
            where: { ...baseWhere, isActive: true },
            _avg: { rate: true },
          }),

          // Répartition par rôle
          ctx.db.commissionRule.groupBy({
            by: ['userRole'],
            where: { ...baseWhere, isActive: true },
            _count: true,
            _avg: { rate: true },
          }),

          // Répartition par type de service
          ctx.db.commissionRule.groupBy({
            by: ['serviceType'],
            where: { ...baseWhere, isActive: true },
            _count: true,
            _avg: { rate: true },
          }),

          // Changements récents
          ctx.db.auditLog.count({
            where: {
              entityType: 'COMMISSION_RULE',
              action: {
                in: [
                  'COMMISSION_RULE_CREATED',
                  'COMMISSION_RULE_UPDATED',
                  'COMMISSION_RULE_DEACTIVATED',
                ],
              },
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
        ]);

        return {
          success: true,
          data: {
            period: { type: input.period, startDate, endDate },
            overview: {
              totalRules,
              activeRules,
              inactiveRules: totalRules - activeRules,
              averageRate: averageRate._avg.rate || 0,
              recentChanges,
            },
            distribution: {
              byRole: rulesByRole.map(item => ({
                role: item.userRole,
                count: item._count,
                averageRate: item._avg.rate || 0,
              })),
              byServiceType: rulesByServiceType.map(item => ({
                serviceType: item.serviceType,
                count: item._count,
                averageRate: item._avg.rate || 0,
              })),
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des statistiques',
        });
      }
    }),

  /**
   * Calculer la commission pour une transaction
   */
  calculateCommission: protectedProcedure
    .input(
      z.object({
        serviceType: z.string(),
        userRole: z.nativeEnum(UserRole),
        transactionAmount: z.number().min(0),
        userId: z.string().cuid().optional(),
        geographicZone: z.string().optional(),
        transactionDate: z.date().default(() => new Date()),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      try {
        // Trouver la règle de commission applicable
        const applicableRule = await ctx.db.commissionRule.findFirst({
          where: {
            serviceType: input.serviceType,
            userRole: input.userRole,
            isActive: true,
            validFrom: { lte: input.transactionDate },
            OR: [{ validUntil: null }, { validUntil: { gte: input.transactionDate } }],
            // Filtres optionnels
            ...(input.geographicZone && {
              OR: [{ geographicZone: null }, { geographicZone: input.geographicZone }],
            }),
            AND: [
              {
                OR: [
                  { minTransactionAmount: null },
                  { minTransactionAmount: { lte: input.transactionAmount } },
                ],
              },
              {
                OR: [
                  { maxTransactionAmount: null },
                  { maxTransactionAmount: { gte: input.transactionAmount } },
                ],
              },
            ],
          },
          orderBy: [
            { geographicZone: 'desc' }, // Priorité aux règles géographiques spécifiques
            { createdAt: 'desc' }, // Puis aux plus récentes
          ],
        });

        if (!applicableRule) {
          return {
            success: false,
            message: 'Aucune règle de commission applicable trouvée',
            data: {
              commissionAmount: 0,
              effectiveRate: 0,
              rule: null,
            },
          };
        }

        // Calculer la commission
        let commissionAmount = 0;

        if (applicableRule.calculationType === 'PERCENTAGE') {
          commissionAmount = input.transactionAmount * applicableRule.rate;
        } else if (applicableRule.calculationType === 'FLAT_FEE') {
          commissionAmount = applicableRule.flatFee || 0;
        }

        // Appliquer les limites min/max
        if (applicableRule.minimumAmount && commissionAmount < applicableRule.minimumAmount) {
          commissionAmount = applicableRule.minimumAmount;
        }

        if (applicableRule.maximumAmount && commissionAmount > applicableRule.maximumAmount) {
          commissionAmount = applicableRule.maximumAmount;
        }

        const effectiveRate =
          input.transactionAmount > 0 ? commissionAmount / input.transactionAmount : 0;

        return {
          success: true,
          data: {
            commissionAmount: Math.round(commissionAmount * 100) / 100, // Arrondir à 2 décimales
            effectiveRate: Math.round(effectiveRate * 10000) / 100, // Pourcentage avec 2 décimales
            rule: {
              id: applicableRule.id,
              serviceType: applicableRule.serviceType,
              rate: applicableRule.rate,
              calculationType: applicableRule.calculationType,
              description: applicableRule.description,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du calcul de la commission',
        });
      }
    }),
});

// Helper function
function calculatePeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date, endDate: Date;

  switch (period) {
    case 'WEEK':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case 'MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'QUARTER':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      break;
    default: // YEAR
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
  }

  return { startDate, endDate };
}
