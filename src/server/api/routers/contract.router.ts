import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ContractStatus, ContractType } from '@prisma/client';
import { contractService } from '@/server/services/contract.service';

// Schémas de validation
const contractCreateSchema = z.object({
  merchantId: z.string(),
  templateId: z.string().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.nativeEnum(ContractType),
  monthlyFee: z.number().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  minimumVolume: z.number().int().positive().optional(),
  effectiveDate: z.date().optional(),
  expiresAt: z.date().optional(),
  terms: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

const contractUpdateSchema = z.object({
  contractId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  monthlyFee: z.number().positive().optional(),
  commissionRate: z.number().min(0).max(1).optional(),
  minimumVolume: z.number().int().positive().optional(),
  effectiveDate: z.date().optional(),
  expiresAt: z.date().optional(),
  terms: z.record(z.any()).optional(),
  notes: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
});

const contractSignSchema = z.object({
  contractId: z.string(),
  merchantSignature: z.string(),
  signedById: z.string().optional(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  defaultType: z.nativeEnum(ContractType),
  defaultMonthlyFee: z.number().positive().optional(),
  defaultCommissionRate: z.number().min(0).max(1).optional(),
  defaultDuration: z.number().int().positive().optional(),
});

const amendmentCreateSchema = z.object({
  contractId: z.string(),
  title: z.string().min(1),
  description: z.string().min(1),
  content: z.string().min(1),
});

const listContractsSchema = z.object({
  merchantId: z.string().optional(),
  status: z.nativeEnum(ContractStatus).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

// ===== NOUVEAUX SCHÉMAS POUR EXTENSIONS MERCHANT =====
const negotiationCreateSchema = z.object({
  contractId: z.string(),
  proposedChanges: z.record(z.any()),
  reason: z.string().min(1),
  notes: z.string().optional(),
});

const negotiationResponseSchema = z.object({
  negotiationId: z.string(),
  status: z.enum(['ACCEPTED', 'REJECTED', 'COUNTER_PROPOSED']),
  response: z.string().min(1),
  counterProposal: z.record(z.any()).optional(),
});

const performanceQuerySchema = z.object({
  contractId: z.string(),
  startDate: z.date(),
  endDate: z.date(),
});

export const contractRouter = router({
  // ===== ENDPOINTS POUR MERCHANTS =====

  /**
   * Récupère les contrats du merchant connecté
   */
  getMerchantContracts: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ContractStatus).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Récupérer le merchant associé à l'utilisateur
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous devez être un commerçant pour accéder à cette ressource',
        });
      }

      return await contractService.getMerchantContracts(merchant.id, {
        status: input.status,
        page: input.page,
        limit: input.limit,
      });
    }),

  /**
   * Récupère le contrat actif du merchant
   */
  getActiveContract: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const merchant = await ctx.db.merchant.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!merchant) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Vous devez être un commerçant pour accéder à cette ressource',
      });
    }

    return await contractService.getActiveMerchantContract(merchant.id);
  }),

  /**
   * Signe un contrat (merchant)
   */
  signContract: protectedProcedure
    .input(contractSignSchema.omit({ signedById: true }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'utilisateur est propriétaire du contrat
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      if (contract.merchant.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez pas signer ce contrat',
        });
      }

      return await contractService.signContract(input);
    }),

  /**
   * Récupère un contrat par ID (merchant propriétaire uniquement)
   */
  getContractById: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: {
          merchant: {
            include: { user: true },
          },
          template: true,
          amendments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      // Vérifier les permissions
      const isOwner = contract.merchant.userId === userId;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé à ce contrat',
        });
      }

      return contract;
    }),

  /**
   * Génère le PDF d'un contrat
   */
  generatePdf: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier les permissions
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      const isOwner = contract.merchant.userId === userId;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      return await contractService.generateContractPdf(input.contractId);
    }),

  // ===== NOUVEAUX ENDPOINTS MERCHANT SPÉCIFIQUES =====

  /**
   * Récupère les statistiques de contrats du merchant
   */
  getMerchantStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const merchant = await ctx.db.merchant.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!merchant) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accès refusé',
      });
    }

    // Calculer les statistiques
    const [total, active, pending, expired] = await Promise.all([
      ctx.db.contract.count({ where: { merchantId: merchant.id } }),
      ctx.db.contract.count({
        where: {
          merchantId: merchant.id,
          status: ContractStatus.ACTIVE,
        },
      }),
      ctx.db.contract.count({
        where: {
          merchantId: merchant.id,
          status: ContractStatus.PENDING_SIGNATURE,
        },
      }),
      ctx.db.contract.count({
        where: {
          merchantId: merchant.id,
          status: ContractStatus.EXPIRED,
        },
      }),
    ]);

    // Calculer les frais totaux et commission moyenne
    const activeContracts = await ctx.db.contract.findMany({
      where: {
        merchantId: merchant.id,
        status: ContractStatus.ACTIVE,
      },
      select: {
        monthlyFee: true,
        commissionRate: true,
      },
    });

    const totalMonthlyFees = activeContracts.reduce(
      (sum, c) => sum + (c.monthlyFee ? parseFloat(c.monthlyFee.toString()) : 0),
      0
    );

    const averageCommissionRate =
      activeContracts.length > 0
        ? activeContracts.reduce(
            (sum, c) => sum + (c.commissionRate ? parseFloat(c.commissionRate.toString()) : 0),
            0
          ) / activeContracts.length
        : 0;

    return {
      totalContracts: total,
      activeContracts: active,
      pendingSignature: pending,
      expiringContracts: expired,
      totalMonthlyFees,
      averageCommissionRate,
    };
  }),

  /**
   * Initie une négociation de contrat
   */
  initiateNegotiation: protectedProcedure
    .input(negotiationCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'utilisateur peut négocier ce contrat
      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      if (contract.merchant.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez pas négocier ce contrat',
        });
      }

      // Pour l'instant, enregistrer la demande de négociation dans les métadonnées
      // En attendant les modèles de négociation
      await ctx.db.contract.update({
        where: { id: input.contractId },
        data: {
          metadata: {
            negotiationRequested: true,
            negotiationData: {
              proposedChanges: input.proposedChanges,
              reason: input.reason,
              notes: input.notes,
              requestedAt: new Date(),
              requestedBy: userId,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Demande de négociation enregistrée',
      };
    }),

  /**
   * Récupère l'historique des négociations d'un contrat
   */
  getNegotiationHistory: protectedProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      const isOwner = contract.merchant.userId === userId;
      const isAdmin = ctx.session.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      // Pour l'instant, retourner les données des métadonnées
      const metadata = contract.metadata as any;
      const negotiations = [];

      if (metadata?.negotiationRequested) {
        negotiations.push({
          id: '1',
          status: 'PENDING',
          reason: metadata.negotiationData?.reason || '',
          proposedChanges: metadata.negotiationData?.proposedChanges || {},
          createdAt: metadata.negotiationData?.requestedAt || contract.createdAt,
        });
      }

      return negotiations;
    }),

  /**
   * Calcule la performance d'un contrat
   */
  getContractPerformance: protectedProcedure
    .input(performanceQuerySchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      if (contract.merchant.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      // Calculer les métriques de performance basiques
      // À adapter selon votre modèle de données
      const deliveryCount = await ctx.db.delivery.count({
        where: {
          // merchantId: contract.merchantId, // À adapter selon votre schéma
          createdAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
      });

      const payments = await ctx.db.payment.findMany({
        where: {
          userId: contract.merchant.userId,
          status: 'COMPLETED',
          createdAt: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        select: { amount: true },
      });

      const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

      const avgOrderValue = deliveryCount > 0 ? totalRevenue / deliveryCount : 0;

      return {
        contractId: input.contractId,
        period: {
          start: input.startDate,
          end: input.endDate,
        },
        metrics: {
          deliveryCount,
          totalRevenue,
          avgOrderValue,
          averageRating: 4.2, // Placeholder
          slaCompliance: 94.5, // Placeholder
        },
        targets: {
          volume: deliveryCount >= 100,
          quality: true, // Placeholder
          time: true, // Placeholder
        },
      };
    }),

  /**
   * Récupère les templates de contrats disponibles
   */
  getAvailableTemplates: protectedProcedure.query(async ({ ctx }) => {
    return await contractService.getActiveTemplates();
  }),

  /**
   * Demande un renouvellement de contrat
   */
  requestRenewal: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        requestedDuration: z.number().int().positive(), // en mois
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const contract = await ctx.db.contract.findUnique({
        where: { id: input.contractId },
        include: { merchant: true },
      });

      if (!contract) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Contrat non trouvé',
        });
      }

      if (contract.merchant.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous ne pouvez pas renouveler ce contrat',
        });
      }

      if (contract.status !== ContractStatus.ACTIVE) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Seuls les contrats actifs peuvent être renouvelés',
        });
      }

      // Enregistrer la demande de renouvellement
      await ctx.db.contract.update({
        where: { id: input.contractId },
        data: {
          metadata: {
            ...contract.metadata,
            renewalRequested: true,
            renewalData: {
              requestedDuration: input.requestedDuration,
              notes: input.notes,
              requestedAt: new Date(),
              requestedBy: userId,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Demande de renouvellement enregistrée',
      };
    }),

  // ===== ENDPOINTS ADMIN =====

  /**
   * Crée un contrat (admin)
   */
  createContract: adminProcedure.input(contractCreateSchema).mutation(async ({ ctx, input }) => {
    return await contractService.createContract(input);
  }),

  /**
   * Met à jour un contrat (admin)
   */
  updateContract: adminProcedure.input(contractUpdateSchema).mutation(async ({ ctx, input }) => {
    const { contractId, ...updateData } = input;
    return await contractService.updateContract(contractId, updateData);
  }),

  /**
   * Signe un contrat côté admin
   */
  adminSignContract: adminProcedure.input(contractSignSchema).mutation(async ({ ctx, input }) => {
    return await contractService.signContract({
      ...input,
      signedById: ctx.session.user.id,
    });
  }),

  /**
   * Liste tous les contrats (admin)
   */
  listAllContracts: adminProcedure.input(listContractsSchema).query(async ({ ctx, input }) => {
    // Utiliser directement Prisma pour plus de flexibilité côté admin
    const where: any = {};

    if (input.merchantId) {
      where.merchantId = input.merchantId;
    }

    if (input.status) {
      where.status = input.status;
    }

    const [contracts, total] = await Promise.all([
      ctx.db.contract.findMany({
        where,
        include: {
          merchant: {
            include: { user: true },
          },
          template: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      ctx.db.contract.count({ where }),
    ]);

    return {
      contracts,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages: Math.ceil(total / input.limit),
      },
    };
  }),

  /**
   * Statistiques globales des contrats (admin)
   */
  getGlobalStats: adminProcedure.query(async ({ ctx }) => {
    return await contractService.getContractStats();
  }),

  /**
   * Crée un template de contrat (admin)
   */
  createTemplate: adminProcedure.input(templateCreateSchema).mutation(async ({ ctx, input }) => {
    return await contractService.createContractTemplate({
      ...input,
      createdById: ctx.session.user.id,
    });
  }),

  /**
   * Crée un amendement (admin)
   */
  createAmendment: adminProcedure.input(amendmentCreateSchema).mutation(async ({ ctx, input }) => {
    return await contractService.createAmendment(
      input.contractId,
      input.title,
      input.description,
      input.content
    );
  }),

  /**
   * Résilie un contrat (admin)
   */
  terminateContract: adminProcedure
    .input(
      z.object({
        contractId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await contractService.terminateContract(input.contractId, input.reason);
    }),
});
