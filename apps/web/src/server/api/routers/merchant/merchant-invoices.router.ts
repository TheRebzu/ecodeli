import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { InvoiceStatus, BillingCycle } from '@prisma/client';
import { addMonths, format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Router pour la facturation automatique des commerçants
 * Système de facturation automatique selon le cahier des charges
 */

// Schémas de validation
const invoiceFiltersSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const manualInvoiceSchema = z.object({
  description: z.string().min(5).max(200),
  amount: z.number().min(0),
  dueDate: z.date(),
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().min(1),
        unitPrice: z.number().min(0),
        total: z.number().min(0),
      })
    )
    .optional(),
  notes: z.string().max(500).optional(),
});

const billingConfigSchema = z.object({
  enableAutoInvoicing: z.boolean(),
  billingCycle: z.nativeEnum(BillingCycle),
  billingDay: z.number().min(1).max(28),
  gracePeriodDays: z.number().min(0).max(30).default(7),
  lateFeePercent: z.number().min(0).max(100).default(0),
  reminderDaysBefore: z.array(z.number().min(1).max(30)).default([7, 3, 1]),
  invoiceTemplate: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export const merchantInvoicesRouter = router({
  /**
   * Récupérer les factures du commerçant
   */
  getMyInvoices: protectedProcedure.input(invoiceFiltersSchema).query(async ({ ctx, input }) => {
    const { user } = ctx.session;

    if (user.role !== 'MERCHANT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les commerçants peuvent consulter leurs factures',
      });
    }

    try {
      const where: any = {
        userId: user.id,
      };

      if (input.status) where.status = input.status;

      if (input.dateFrom || input.dateTo) {
        where.issuedDate = {};
        if (input.dateFrom) where.issuedDate.gte = input.dateFrom;
        if (input.dateTo) where.issuedDate.lte = input.dateTo;
      }

      if (input.month && input.year) {
        const monthStart = startOfMonth(new Date(input.year, input.month - 1));
        const monthEnd = endOfMonth(new Date(input.year, input.month - 1));
        where.issuedDate = {
          gte: monthStart,
          lte: monthEnd,
        };
      }

      const invoices = await ctx.db.invoice.findMany({
        where,
        include: {
          billingCycle: {
            select: {
              cycle: true,
              startDate: true,
              endDate: true,
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true,
              paymentMethod: true,
            },
            orderBy: { paidAt: 'desc' },
          },
        },
        orderBy: { issuedDate: 'desc' },
        skip: input.offset,
        take: input.limit,
      });

      const totalCount = await ctx.db.invoice.count({ where });

      // Calculer les statistiques
      const stats = await calculateInvoiceStats(user.id, ctx.db);

      return {
        invoices,
        stats,
        pagination: {
          total: totalCount,
          offset: input.offset,
          limit: input.limit,
          hasMore: input.offset + input.limit < totalCount,
        },
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des factures',
      });
    }
  }),

  /**
   * Obtenir les détails d'une facture
   */
  getInvoiceById: protectedProcedure
    .input(z.object({ invoiceId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent consulter leurs factures',
        });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id,
          },
          include: {
            billingCycle: true,
            payments: {
              orderBy: { paidAt: 'desc' },
            },
            lineItems: true,
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée',
          });
        }

        return { invoice };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération de la facture',
        });
      }
    }),

  /**
   * Télécharger le PDF d'une facture
   */
  downloadInvoicePdf: protectedProcedure
    .input(z.object({ invoiceId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id,
          },
          include: {
            lineItems: true,
            user: {
              select: {
                name: true,
                email: true,
                merchant: {
                  select: {
                    businessName: true,
                    businessAddress: true,
                    siret: true,
                    vatNumber: true,
                  },
                },
              },
            },
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée',
          });
        }

        // TODO: Générer le PDF avec un service dédié
        const pdfUrl = await generateInvoicePdf(invoice);

        return {
          success: true,
          pdfUrl,
          fileName: `facture-${invoice.invoiceNumber}.pdf`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la génération du PDF',
        });
      }
    }),

  /**
   * Obtenir la configuration de facturation
   */
  getBillingConfig: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;

    if (user.role !== 'MERCHANT') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les commerçants peuvent consulter leur configuration',
      });
    }

    try {
      const config = await ctx.db.merchantBillingConfig.findUnique({
        where: { merchantId: user.id },
      });

      // Configuration par défaut si aucune n'existe
      if (!config) {
        const defaultConfig = await ctx.db.merchantBillingConfig.create({
          data: {
            merchantId: user.id,
            enableAutoInvoicing: true,
            billingCycle: 'MONTHLY',
            billingDay: 1,
            gracePeriodDays: 7,
            lateFeePercent: 0,
            reminderDaysBefore: [7, 3, 1],
          },
        });
        return { config: defaultConfig };
      }

      return { config };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération de la configuration',
      });
    }
  }),

  /**
   * Mettre à jour la configuration de facturation
   */
  updateBillingConfig: protectedProcedure
    .input(billingConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent modifier leur configuration',
        });
      }

      try {
        const config = await ctx.db.merchantBillingConfig.upsert({
          where: { merchantId: user.id },
          update: {
            ...input,
            updatedAt: new Date(),
          },
          create: {
            merchantId: user.id,
            ...input,
          },
        });

        return {
          success: true,
          config,
          message: 'Configuration mise à jour avec succès',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour de la configuration',
        });
      }
    }),

  /**
   * Déclencher la facturation automatique manuellement
   */
  triggerAutoInvoicing: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12).optional(),
        year: z.number().min(2020).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent déclencher la facturation',
        });
      }

      try {
        const month = input.month || new Date().getMonth() + 1;
        const year = input.year || new Date().getFullYear();

        // Vérifier si une facture existe déjà pour cette période
        const existingInvoice = await ctx.db.invoice.findFirst({
          where: {
            userId: user.id,
            issuedDate: {
              gte: startOfMonth(new Date(year, month - 1)),
              lte: endOfMonth(new Date(year, month - 1)),
            },
            type: 'SUBSCRIPTION',
          },
        });

        if (existingInvoice) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Une facture existe déjà pour cette période',
          });
        }

        // Générer la facture automatique
        const invoice = await generateAutomaticInvoice(user.id, month, year, ctx.db);

        return {
          success: true,
          invoice,
          message: 'Facture générée avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la génération de la facture',
        });
      }
    }),

  /**
   * Contester une facture
   */
  disputeInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string().cuid(),
        reason: z.string().min(10).max(1000),
        supportingDocuments: z.array(z.string().url()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les commerçants peuvent contester leurs factures',
        });
      }

      try {
        const invoice = await ctx.db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            userId: user.id,
            status: { in: ['PENDING', 'OVERDUE'] },
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Facture non trouvée ou ne peut pas être contestée',
          });
        }

        // Mettre à jour le statut de la facture
        await ctx.db.invoice.update({
          where: { id: input.invoiceId },
          data: {
            status: 'DISPUTED',
            disputeReason: input.reason,
            disputedAt: new Date(),
            metadata: {
              ...invoice.metadata,
              dispute: {
                reason: input.reason,
                supportingDocuments: input.supportingDocuments,
                disputedAt: new Date().toISOString(),
                disputedBy: user.id,
              },
            },
          },
        });

        // TODO: Notifier l'équipe admin

        return {
          success: true,
          message: 'Contestation enregistrée. Notre équipe va examiner votre demande.',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la contestation',
        });
      }
    }),

  /**
   * Obtenir les statistiques de facturation
   */
  getBillingStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(['month', 'quarter', 'year']).default('year'),
      })
    )
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'MERCHANT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      try {
        const stats = await calculateDetailedBillingStats(user.id, input.period, ctx.db);
        return { stats };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors du calcul des statistiques',
        });
      }
    }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Créer une facture manuelle pour un commerçant (Admin)
   */
  createManualInvoice: adminProcedure
    .input(manualInvoiceSchema.extend({ merchantId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { merchantId, lineItems, ...invoiceData } = input;

        // Vérifier que le commerçant existe
        const merchant = await ctx.db.user.findFirst({
          where: {
            id: merchantId,
            role: 'MERCHANT',
          },
        });

        if (!merchant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Commerçant non trouvé',
          });
        }

        // Générer le numéro de facture
        const invoiceNumber = await generateInvoiceNumber();

        // Créer la facture
        const invoice = await ctx.db.invoice.create({
          data: {
            userId: merchantId,
            invoiceNumber,
            type: 'MANUAL',
            status: 'PENDING',
            totalAmount: invoiceData.amount,
            issuedDate: new Date(),
            dueDate: invoiceData.dueDate,
            description: invoiceData.description,
            notes: invoiceData.notes,
            createdByAdmin: true,
            adminId: ctx.session.user.id,
          },
        });

        // Créer les lignes de facturation si fournies
        if (lineItems && lineItems.length > 0) {
          await ctx.db.invoiceLineItem.createMany({
            data: lineItems.map((item, index) => ({
              invoiceId: invoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
              order: index,
            })),
          });
        }

        return {
          success: true,
          invoice,
          message: 'Facture manuelle créée avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création de la facture',
        });
      }
    }),
});

// Helper functions
async function calculateInvoiceStats(userId: string, db: any) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [thisMonth, thisYear, pending, overdue] = await Promise.all([
    db.invoice.aggregate({
      where: {
        userId,
        issuedDate: {
          gte: startOfMonth(new Date()),
          lte: endOfMonth(new Date()),
        },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.invoice.aggregate({
      where: {
        userId,
        issuedDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31),
        },
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.invoice.aggregate({
      where: {
        userId,
        status: 'PENDING',
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
    db.invoice.aggregate({
      where: {
        userId,
        status: 'OVERDUE',
      },
      _sum: { totalAmount: true },
      _count: true,
    }),
  ]);

  return {
    thisMonth: {
      total: thisMonth._sum.totalAmount || 0,
      count: thisMonth._count,
    },
    thisYear: {
      total: thisYear._sum.totalAmount || 0,
      count: thisYear._count,
    },
    pending: {
      total: pending._sum.totalAmount || 0,
      count: pending._count,
    },
    overdue: {
      total: overdue._sum.totalAmount || 0,
      count: overdue._count,
    },
  };
}

async function generateAutomaticInvoice(merchantId: string, month: number, year: number, db: any) {
  // Récupérer la configuration de facturation
  const config = await db.merchantBillingConfig.findUnique({
    where: { merchantId },
  });

  if (!config || !config.enableAutoInvoicing) {
    throw new Error('Facturation automatique désactivée');
  }

  // Calculer les frais selon le contrat et l'usage
  const contract = await db.contract.findFirst({
    where: {
      merchantId,
      status: 'ACTIVE',
    },
  });

  if (!contract) {
    throw new Error('Aucun contrat actif trouvé');
  }

  // Calculer les frais mensuels et commissions
  const monthlyFee = contract.monthlyFee || 0;

  // TODO: Calculer les commissions sur les ventes
  const commissions = 0; // Placeholder

  const totalAmount = monthlyFee + commissions;

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await db.invoice.create({
    data: {
      userId: merchantId,
      invoiceNumber,
      type: 'SUBSCRIPTION',
      status: 'PENDING',
      totalAmount,
      issuedDate: new Date(),
      dueDate: addMonths(new Date(), 1),
      description: `Facturation automatique - ${format(new Date(year, month - 1), 'MMMM yyyy', { locale: fr })}`,
      metadata: {
        period: { month, year },
        breakdown: {
          monthlyFee,
          commissions,
        },
        autoGenerated: true,
      },
    },
  });

  // Créer les lignes de détail
  const lineItems = [];
  if (monthlyFee > 0) {
    lineItems.push({
      description: "Frais d'abonnement mensuel",
      quantity: 1,
      unitPrice: monthlyFee,
      total: monthlyFee,
    });
  }

  if (commissions > 0) {
    lineItems.push({
      description: 'Commissions sur ventes',
      quantity: 1,
      unitPrice: commissions,
      total: commissions,
    });
  }

  if (lineItems.length > 0) {
    await db.invoiceLineItem.createMany({
      data: lineItems.map((item, index) => ({
        invoiceId: invoice.id,
        ...item,
        order: index,
      })),
    });
  }

  return invoice;
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now();
  return `INV-${year}${month}-${timestamp.toString().slice(-6)}`;
}

async function generateInvoicePdf(invoice: any): Promise<string> {
  // TODO: Implémenter la génération PDF avec jsPDF ou Puppeteer
  // Pour l'instant, retourner une URL placeholder
  return `/api/pdf/invoice/${invoice.id}`;
}

async function calculateDetailedBillingStats(userId: string, period: string, db: any) {
  // TODO: Implémenter le calcul détaillé des statistiques
  return {
    totalRevenue: 0,
    averageInvoiceAmount: 0,
    paymentRate: 100,
    trends: [],
  };
}
