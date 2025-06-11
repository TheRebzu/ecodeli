import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';

// Schémas de validation
const ContractFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  merchantId: z.string().optional(),
  merchantCategory: z.string().optional(),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

const ContractFormSchema = z.object({
  merchantId: z.string().min(1, 'Commerçant requis'),
  templateId: z.string().optional(),
  title: z.string().min(1, 'Titre requis'),
  content: z.string().min(1, 'Contenu requis'),
  status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED', 'CANCELLED']),
  type: z.enum(['STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM']),
  monthlyFee: z.number().min(0).optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  minimumVolume: z.number().min(0).optional(),
  merchantCategory: z.string().optional(),
  deliveryZone: z.string().optional(),
  maxDeliveryRadius: z.number().min(0).optional(),
  effectiveDate: z.date().optional(),
  expiresAt: z.date().optional(),
  autoRenewal: z.boolean().optional(),
  renewalNotice: z.number().min(0).optional(),
  insuranceRequired: z.boolean().optional(),
  insuranceAmount: z.number().min(0).optional(),
  securityDeposit: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const TemplateFormSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  content: z.string().min(1, 'Contenu requis'),
  version: z.string().min(1, 'Version requise'),
  defaultType: z.enum(['STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM']),
  defaultMonthlyFee: z.number().min(0).optional(),
  defaultCommissionRate: z.number().min(0).max(1).optional(),
  defaultDuration: z.number().min(0).optional(),
  targetMerchantCategory: z.string().optional(),
  requiredDocuments: z.array(z.string()).optional(),
  minimumBusinessAge: z.number().min(0).optional(),
  minimumTurnover: z.number().min(0).optional(),
  defaultExclusivityClause: z.boolean().optional(),
  defaultInsuranceRequired: z.boolean().optional(),
  defaultSecurityDeposit: z.number().min(0).optional(),
  isActive: z.boolean(),
});

export const adminContractsRouter = createTRPCRouter({
  // Récupérer tous les contrats avec pagination et filtres
  getAll: protectedProcedure
    .input(z.object({
      page: z.number(),
      pageSize: z.number(),
      filters: ContractFiltersSchema.default({})
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { page, pageSize, filters = {} } = input;
        const skip = (page - 1) * pageSize;

        // Construire les conditions de filtrage
        const where: any = {};

        if (filters.status) {
          where.status = filters.status;
        }

        if (filters.type) {
          where.type = filters.type;
        }

        if (filters.merchantId) {
          where.merchantId = filters.merchantId;
        }

        if (filters.search) {
          where.OR = [
            { merchant: { companyName: { contains: filters.search, mode: 'insensitive' } } },
            { merchant: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
            { merchant: { user: { email: { contains: filters.search, mode: 'insensitive' } } } },
          ];
        }

        if (filters.dateRange?.from || filters.dateRange?.to) {
          where.createdAt = {};
          if (filters.dateRange.from) {
            where.createdAt.gte = filters.dateRange.from;
          }
          if (filters.dateRange.to) {
            where.createdAt.lte = filters.dateRange.to;
          }
        }

        // Exécuter les requêtes en parallèle
        const [contracts, totalCount] = await Promise.all([
          ctx.db.contract.findMany({
            where,
            include: {
              merchant: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true
                    }
                  }
                }
              },
              negotiations: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
          }),
          ctx.db.contract.count({ where }),
        ]);

        return {
          contracts,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          currentPage: page,
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des contrats:', error);
        
        // Retourner des données par défaut en cas d'erreur
        return {
          contracts: [],
          totalCount: 0,
          totalPages: 1,
          currentPage: input.page,
        };
      }
    }),

  // Récupérer les statistiques des contrats
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const [
          totalContracts,
          activeContracts,
          expiringSoon,
          draftContracts,
          suspendedContracts,
          contractsByType,
          contractsByCategory,
          averageCommission,
          totalMonthlyRevenue
        ] = await Promise.all([
          ctx.db.contract.count(),
          ctx.db.contract.count({ where: { status: 'ACTIVE' } }),
          ctx.db.contract.count({
            where: {
              status: 'ACTIVE',
              expiresAt: {
                lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
              }
            }
          }),
          ctx.db.contract.count({ where: { status: 'DRAFT' } }),
          ctx.db.contract.count({ where: { status: 'SUSPENDED' } }),
          ctx.db.contract.groupBy({
            by: ['type'],
            _count: true,
          }),
          ctx.db.contract.groupBy({
            by: ['merchantCategory'],
            where: { merchantCategory: { not: null } },
            _count: true,
          }),
          ctx.db.contract.aggregate({
            _avg: { commissionRate: true },
            where: { status: 'ACTIVE', commissionRate: { not: null } },
          }),
          ctx.db.contract.aggregate({
            _sum: { monthlyFee: true },
            where: { status: 'ACTIVE', monthlyFee: { not: null } },
          }),
        ]);

        return {
          totalContracts,
          activeContracts,
          expiringSoon,
          draftContracts,
          suspendedContracts,
          contractsByType,
          contractsByCategory,
          averageCommission: averageCommission._avg.commissionRate || 0,
          totalMonthlyRevenue: totalMonthlyRevenue._sum.monthlyFee || 0,
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques de contrats:', error);
        
        // Retourner des données par défaut en cas d'erreur
        return {
          totalContracts: 0,
          activeContracts: 0,
          expiringSoon: 0,
          draftContracts: 0,
          suspendedContracts: 0,
          contractsByType: [],
          contractsByCategory: [],
          averageCommission: 0,
          totalMonthlyRevenue: 0,
        };
      }
    }),

  // Récupérer la liste des commerçants
  getMerchants: protectedProcedure.query(async ({ ctx }) => {
    try {
      return ctx.db.merchant.findMany({
        select: {
          id: true,
          companyName: true,
          businessType: true,
          user: {
            select: {
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              contracts: true
            }
          }
        },
        orderBy: {
          companyName: 'asc'
        }
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des commerçants:', error);
      return [];
    }
  }),

  // Créer un nouveau contrat
  create: protectedProcedure
    .input(ContractFormSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le commerçant existe
      const merchant = await ctx.db.merchant.findUnique({
        where: { id: input.merchantId },
      });

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Commerçant non trouvé',
        });
      }

      // Générer un numéro de contrat unique
      const contractNumber = `CT-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      return ctx.db.contract.create({
        data: {
          ...input,
          contractNumber,
          signedById: ctx.session.user.id,
        },
        include: {
          merchant: {
            select: {
              id: true,
              companyName: true,
              businessType: true,
            }
          },
        },
      });
    }),

  // Mettre à jour un contrat
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
    }).merge(ContractFormSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const contract = await ctx.db.contract.findUnique({
        where: { id },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      return ctx.db.contract.update({
        where: { id },
        data,
        include: {
          merchant: {
            select: {
              id: true,
              companyName: true,
              businessType: true,
            }
          },
        },
      });
    }),

  // Supprimer un contrat
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.id },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      // Empêcher la suppression des contrats actifs
      if (contract.status === 'ACTIVE') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Impossible de supprimer un contrat actif',
        });
      }

      return ctx.db.contract.delete({
        where: { id: input.id },
      });
    }),

  // Activer un contrat
  activate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: 'ACTIVE',
          validatedAt: new Date(),
          signedById: ctx.session.user.id,
        },
      });
    }),

  // Suspendre un contrat
  suspend: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contract.update({
        where: { id: input.id },
        data: {
          status: 'SUSPENDED',
          notes: input.reason ? `Suspendu: ${input.reason}` : undefined,
        },
      });
    }),

  // Générer un PDF du contrat
  generatePdf: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.id },
        include: {
          merchant: true,
          template: true,
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      // TODO: Intégrer avec un service de génération PDF
      const fileUrl = `/api/pdf/contract/${contract.id}`;

      await ctx.db.contract.update({
        where: { id: input.id },
        data: { fileUrl },
      });

      return { fileUrl };
    }),

  // Templates de contrats
  getTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.contractTemplate.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          _count: {
            select: { contracts: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    }),

  getActiveTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.contractTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    }),

  createTemplate: protectedProcedure
    .input(TemplateFormSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contractTemplate.create({
        data: {
          ...input,
          createdById: ctx.session.user.id,
        },
      });
    }),

  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.string(),
    }).merge(TemplateFormSchema.partial()))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.contractTemplate.update({
        where: { id },
        data,
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.contractTemplate.findUnique({
        where: { id: input.id },
        include: { _count: { select: { contracts: true } } },
      });

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template non trouvé',
        });
      }

      if (template._count.contracts > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Impossible de supprimer un template utilisé par des contrats',
        });
      }

      return ctx.db.contractTemplate.delete({
        where: { id: input.id },
      });
    }),

  activateTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contractTemplate.update({
        where: { id: input.id },
        data: { isActive: true },
      });
    }),

  deactivateTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.contractTemplate.update({
        where: { id: input.id },
        data: { isActive: false },
      });
    }),
});
