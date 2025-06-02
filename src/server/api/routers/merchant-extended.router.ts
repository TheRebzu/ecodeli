import { router, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { contractRouter } from './contract.router';
import { billingService } from '@/server/services/billing.service';
import { invoiceService } from '@/server/services/invoice.service';
import { InvoiceStatus, DocumentType } from '@prisma/client';

/**
 * Routeur merchant étendu avec facturation, contrats et documents
 * Réutilise au maximum les services existants (billing, invoice, contract)
 */
export const merchantExtendedRouter = router({
  
  // ===== INTÉGRATION CONTRACTS =====
  /**
   * Sous-routeur pour la gestion des contrats
   * Réutilise directement contract.router.ts avec toutes ses fonctionnalités
   */
  contracts: contractRouter,

  // ===== FACTURATION MERCHANT =====
  billing: router({
    /**
     * Récupère les statistiques de facturation du merchant
     * Utilise billingService.getBillingStats() existant
     */
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

        return await billingService.getBillingStats(input.period);
      }),

    /**
     * Génère une facture pour le merchant
     * Utilise billingService.generateMerchantInvoice() existant (ligne 980)
     */
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

        return await billingService.generateMerchantInvoice(
          merchant.id, 
          input.startDate, 
          input.endDate
        );
      }),

    /**
     * Récupère les cycles de facturation du merchant
     */
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
          where: { 
            merchantId: merchant.id 
          },
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                status: true,
                dueDate: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (input.page - 1) * input.limit,
          take: input.limit
        });
      }),

    /**
     * Calcule les commissions du merchant sur une période
     */
    getCommissions: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date()
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

        // Récupérer les commissions pour les livraisons du merchant
        const commissions = await ctx.db.commission.findMany({
          where: {
            payment: {
              delivery: {
                merchantId: merchant.id
              },
              createdAt: {
                gte: input.startDate,
                lte: input.endDate
              }
            }
          },
          include: {
            payment: {
              include: {
                delivery: true
              }
            }
          }
        });

        const totalCommission = commissions.reduce((sum, comm) => 
          sum + parseFloat(comm.amount.toString()), 0
        );

        return {
          commissions,
          totalCommission,
          count: commissions.length
        };
      })
  }),

  // ===== FACTURES MERCHANT =====
  invoices: router({
    /**
     * Liste les factures du merchant
     * Utilise invoiceService.listInvoices() existant
     */
    list: protectedProcedure
      .input(z.object({
        status: z.nativeEnum(InvoiceStatus).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10),
        startDate: z.date().optional(),
        endDate: z.date().optional()
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;

        return await invoiceService.listInvoices({
          userId,
          status: input.status,
          page: input.page,
          limit: input.limit,
          startDate: input.startDate,
          endDate: input.endDate
        });
      }),

    /**
     * Récupère une facture par ID avec vérification des permissions
     */
    getById: protectedProcedure
      .input(z.object({ invoiceId: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
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
     * Utilise invoiceService.generateInvoice() existant
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

        return await invoiceService.generateInvoice(input.invoiceId);
      }),

    /**
     * Marque une facture comme payée
     * Utilise invoiceService.markInvoiceAsPaid() existant
     */
    markAsPaid: protectedProcedure
      .input(z.object({ 
        invoiceId: z.string(),
        paymentId: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
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

        return await invoiceService.markInvoiceAsPaid(
          input.invoiceId, 
          input.paymentId
        );
      }),

    /**
     * Génère des factures mensuelles pour le merchant
     * Utilise invoiceService.generateMonthlyInvoices() existant
     */
    generateMonthly: protectedProcedure
      .input(z.object({
        month: z.date().optional(),
        simulateOnly: z.boolean().default(false)
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

        return await invoiceService.generateMonthlyInvoices({
          month: input.month,
          userType: 'MERCHANT',
          simulateOnly: input.simulateOnly
        });
      })
  }),

  // ===== DOCUMENTS MERCHANT =====
  documents: router({
    /**
     * Liste les documents du merchant
     */
    list: protectedProcedure
      .input(z.object({
        type: z.nativeEnum(DocumentType).optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(50).default(10)
      }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
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
     * Upload un document - crée l'enregistrement en base
     */
    upload: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        documentType: z.nativeEnum(DocumentType),
        description: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
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
      }),

    /**
     * Récupère un document par ID avec vérification des permissions
     */
    getById: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        
        const document = await ctx.db.document.findFirst({
          where: { 
            id: input.documentId,
            userId 
          }
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document non trouvé'
          });
        }

        return document;
      })
  }),

  // ===== MÉTRIQUES ET ANALYTICS =====
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

        const [deliveriesCount, totalRevenue, averageRating, completionRate] = await Promise.all([
          // Nombre de livraisons
          ctx.db.delivery.count({
            where: {
              merchantId: merchant.id,
              createdAt: { gte: startDate }
            }
          }),
          
          // Chiffre d'affaires total
          ctx.db.payment.aggregate({
            where: {
              userId,
              status: 'COMPLETED',
              createdAt: { gte: startDate }
            },
            _sum: { amount: true }
          }),
          
          // Note moyenne
          ctx.db.rating.aggregate({
            where: {
              delivery: {
                merchantId: merchant.id
              },
              createdAt: { gte: startDate }
            },
            _avg: { rating: true }
          }),
          
          // Taux de complétion des livraisons
          ctx.db.delivery.groupBy({
            by: ['status'],
            where: {
              merchantId: merchant.id,
              createdAt: { gte: startDate }
            },
            _count: { id: true }
          })
        ]);

        const totalDeliveries = completionRate.reduce((sum, item) => sum + item._count.id, 0);
        const completedDeliveries = completionRate
          .filter(item => item.status === 'DELIVERED')
          .reduce((sum, item) => sum + item._count.id, 0);

        return {
          deliveriesCount,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageRating: averageRating._avg.rating || 0,
          completionRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
          period: input.period,
          periodStart: startDate,
          periodEnd: now
        };
      }),

    /**
     * Évolution du chiffre d'affaires sur une période
     */
    getRevenueEvolution: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        groupBy: z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY')
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

        // Récupérer les paiements groupés par période
        const payments = await ctx.db.payment.findMany({
          where: {
            userId,
            status: 'COMPLETED',
            createdAt: {
              gte: input.startDate,
              lte: input.endDate
            }
          },
          select: {
            amount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'asc' }
        });

        // Grouper les données selon la période demandée
        const groupedData = payments.reduce((acc, payment) => {
          let key: string;
          const date = payment.createdAt;

          switch (input.groupBy) {
            case 'DAY':
              key = date.toISOString().split('T')[0];
              break;
            case 'WEEK':
              const startOfWeek = new Date(date);
              startOfWeek.setDate(date.getDate() - date.getDay());
              key = startOfWeek.toISOString().split('T')[0];
              break;
            case 'MONTH':
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              break;
          }

          if (!acc[key]) {
            acc[key] = {
              period: key,
              amount: 0,
              count: 0
            };
          }

          acc[key].amount += parseFloat(payment.amount.toString());
          acc[key].count += 1;

          return acc;
        }, {} as Record<string, { period: string; amount: number; count: number }>);

        return Object.values(groupedData);
      })
  })
}); 