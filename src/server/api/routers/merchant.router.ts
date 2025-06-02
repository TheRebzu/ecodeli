import { router, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { contractRouter } from './contract.router';
import { billingService } from '@/server/services/billing.service';
import { invoiceService } from '@/server/services/invoice.service';

// Définir l'interface pour les données de livraison
interface DeliveryWithClient {
  id: string;
  merchantId: string;
  status: string;
  destinationAddress: string;
  createdAt: Date;
  estimatedDelivery: Date | null;
  client?: {
    user?: {
      name?: string | null;
    } | null;
  } | null;
}

export const merchantRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: {
        merchant: true,
      },
    });

    if (!user || !user.merchant) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Profil commerçant non trouvé',
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      businessName: user.merchant.businessName,
      businessAddress: user.merchant.businessAddress,
      businessCity: user.merchant.businessCity,
      businessState: user.merchant.businessState,
      businessPostal: user.merchant.businessPostal,
      businessCountry: user.merchant.businessCountry,
      taxId: user.merchant.taxId,
      websiteUrl: user.merchant.websiteUrl,
      isVerified: user.merchant.isVerified,
      createdAt: user.createdAt,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        businessName: z.string().optional(),
        businessAddress: z.string().optional(),
        businessCity: z.string().optional(),
        businessState: z.string().optional(),
        businessPostal: z.string().optional(),
        businessCountry: z.string().optional(),
        taxId: z.string().optional(),
        websiteUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier si l'utilisateur est un commerçant
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });

      if (!user || !user.merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à mettre à jour ce profil",
        });
      }

      // Extraire les données à mettre à jour
      const { name, phoneNumber, ...merchantData } = input;

      // Mise à jour des données utilisateur
      if (name || phoneNumber) {
        await ctx.db.user.update({
          where: { id: userId },
          data: {
            name: name || undefined,
            phoneNumber: phoneNumber || undefined,
          },
        });
      }

      // Mise à jour des données commerçant
      if (Object.keys(merchantData).length > 0) {
        await ctx.db.merchant.update({
          where: { userId },
          data: merchantData,
        });
      }

      // Récupération des données mises à jour
      const updatedUser = await ctx.db.user.findUnique({
        where: { id: userId },
        include: { merchant: true },
      });

      return {
        id: updatedUser?.id,
        name: updatedUser?.name,
        email: updatedUser?.email,
        phoneNumber: updatedUser?.phoneNumber,
        businessName: updatedUser?.merchant?.businessName,
        businessAddress: updatedUser?.merchant?.businessAddress,
        updated: true,
      };
    }),

  getDeliveries: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Vérifier si l'utilisateur est un commerçant
    const user = await ctx.db.user.findUnique({
      where: { id: userId },
      include: { merchant: true },
    });

    if (!user || !user.merchant) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à accéder à ces données",
      });
    }

    // Récupérer les livraisons
    const deliveries = await ctx.db.delivery.findMany({
      where: {
        merchantId: user.merchant.id,
      },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return deliveries.map((delivery: DeliveryWithClient) => ({
      id: delivery.id,
      merchantId: delivery.merchantId,
      status: delivery.status,
      clientName: delivery.client?.user?.name || 'Client inconnu',
      address: delivery.destinationAddress,
      createdAt: delivery.createdAt.toISOString(),
      estimatedDelivery: delivery.estimatedDelivery?.toISOString(),
    }));
  }),

  // ===== NOUVEAU: TABLEAU DE BORD =====
  dashboard: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id: true }
      });
      
      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès refusé'
        });
      }

      // Statistiques basiques (à adapter selon votre modèle de données)
      const [totalDeliveries, activeDeliveries, pendingPayments] = await Promise.all([
        ctx.db.delivery.count({
          where: { merchantId: merchant.id }
        }),
        ctx.db.delivery.count({
          where: { 
            merchantId: merchant.id,
            status: 'IN_PROGRESS'
          }
        }),
        ctx.db.invoice.count({
          where: { 
            userId,
            status: 'ISSUED'
          }
        })
      ]);

      return {
        totalDeliveries,
        activeDeliveries,
        pendingPayments,
        // Autres stats...
      };
    }),

    getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      // Récupérer les activités récentes (à adapter)
      const activities = await ctx.db.delivery.findMany({
        where: {
          merchant: { userId }
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          createdAt: true,
          // autres champs nécessaires
        }
      });

      return activities;
    })
  }),

  // ===== NOUVEAU: CONTRATS =====
  contracts: contractRouter,

  // ===== NOUVEAU: FACTURATION =====
  billing: router({
    getInvoices: protectedProcedure
      .input(z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
        status: z.string().optional()
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        return await invoiceService.listInvoices({
          userId,
          status: input.status as any,
          page: input.page,
          limit: input.limit
        });
      }),

    getBillingStats: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id: true }
      });
      
      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès refusé'
        });
      }

      // Utiliser le service de facturation pour les stats
      return await billingService.getMerchantBillingStats?.(merchant.id, 'MONTH') || {
        totalAmount: 0,
        invoiceCount: 0,
        paidAmount: 0
      };
    }),

    generateInvoice: protectedProcedure
      .input(z.object({
        items: z.array(z.object({
          description: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
          taxRate: z.number().optional()
        })),
        dueDate: z.date().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        return await invoiceService.createInvoice({
          userId,
          items: input.items,
          dueDate: input.dueDate,
          notes: input.notes,
          invoiceType: 'MERCHANT_SERVICE'
        });
      }),

    getStats: protectedProcedure
      .input(z.object({
        period: z.enum(['MONTH', 'QUARTER', 'YEAR']).default('MONTH')
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (!merchant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accès refusé'
          });
        }

        // Utilise billingService.getBillingStats() existant
        return await billingService.getBillingStats(input.period);
      }),

    generateInvoice: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (!merchant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accès refusé'
          });
        }

        // Utilise billingService.generateMerchantInvoice() existant
        return await billingService.generateMerchantInvoice(
          merchant.id, 
          input.startDate, 
          input.endDate
        );
      }),

    getBillingCycles: protectedProcedure
      .input(z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10)
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (!merchant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accès refusé'
          });
        }

        return await ctx.db.billingCycle.findMany({
          where: { merchantId: merchant.id },
          include: {
            invoice: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit
        });
      })
  }),

  // ===== FACTURES MERCHANT =====
  invoices: router({
    /**
     * Liste les factures du merchant
     */
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional()
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;

        // Utilise invoiceService.listInvoices() existant
        return await invoiceService.listInvoices({
          userId,
          status: input.status as any,
          page: input.page,
          limit: input.limit,
          startDate: input.startDate,
          endDate: input.endDate
        });
      }),

    /**
     * Récupère une facture par ID
     */
    getById: protectedProcedure
      .input(z.object({ invoiceId: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: { 
            id: input.invoiceId,
            userId 
          },
          include: {
            items: true
          }
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée'
          });
        }

        return invoice;
      }),

    /**
     * Génère le PDF d'une facture
     */
    generatePdf: protectedProcedure
      .input(z.object({ invoiceId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: { 
            id: input.invoiceId,
            userId 
          }
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée'
          });
        }

        // Utilise invoiceService.generateInvoice() existant
        return await invoiceService.generateInvoice(input.invoiceId);
      }),

    /**
     * Marque une facture comme payée
     */
    markAsPaid: protectedProcedure
      .input(z.object({ 
        invoiceId: z.string(),
        paymentId: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        // Vérifier que la facture appartient au merchant
        const invoice = await ctx.db.invoice.findFirst({
          where: { 
            id: input.invoiceId,
            userId 
          }
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée'
          });
        }

        // Utilise invoiceService.markInvoiceAsPaid() existant
        return await invoiceService.markInvoiceAsPaid(
          input.invoiceId, 
          input.paymentId
        );
      })
  }),

  // ===== DOCUMENTS MERCHANT =====
  documents: router({
    /**
     * Liste les documents du merchant
     */
    list: protectedProcedure
      .input(z.object({
        type: z.enum(['CONTRACT', 'INVOICE', 'TAX', 'VERIFICATION', 'OTHER']).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10)
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (!merchant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accès refusé'
          });
        }

        return await ctx.db.document.findMany({
          where: { 
            userId,
            ...(input.type && { type: input.type })
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit
        });
      }),

    /**
     * Upload un document
     */
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        documentType: z.enum(['CONTRACT', 'INVOICE', 'TAX', 'VERIFICATION', 'OTHER']),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        // Créer l'enregistrement du document
        return await ctx.db.document.create({
          data: {
            userId,
            fileName: input.fileName,
            fileType: input.fileType,
            type: input.documentType,
            description: input.description,
            status: 'PENDING',
            uploadedAt: new Date()
          }
        });
      })
  }),

  // ===== MÉTRIQUES AVANCÉES =====
  analytics: router({
    /**
     * Métriques de performance du merchant
     */
    getPerformanceMetrics: protectedProcedure
      .input(z.object({
        period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH')
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const merchant = await ctx.db.merchant.findUnique({
          where: { userId },
          select: { id: true }
        });
        
        if (!merchant) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Accès refusé'
          });
        }

        // Calculer les métriques de performance
        const now = new Date();
        const startDate = input.period === 'WEEK' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
                         input.period === 'MONTH' ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) :
                         input.period === 'QUARTER' ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) :
                         new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        const [deliveriesCount, totalRevenue, averageRating] = await Promise.all([
          ctx.db.delivery.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: startDate }
            }
          }),
          ctx.db.payment.aggregate({
            where: {
              userId,
              status: 'COMPLETED',
              createdAt: { gte: startDate }
            },
            _sum: { amount: true }
          }),
          ctx.db.rating.aggregate({
            where: {
              delivery: {
                merchantId: merchant.id
              },
              createdAt: { gte: startDate }
            },
            _avg: { rating: true }
          })
        ]);

        return {
          deliveriesCount,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageRating: averageRating._avg.rating || 0,
          period: input.period
        };
      })
    })
});
