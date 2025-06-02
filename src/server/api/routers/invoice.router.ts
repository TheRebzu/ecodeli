import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { invoiceService } from '@/server/services/invoice.service';
import { billingService } from '@/server/services/billing.service';
import { 
  createInvoiceSchema, 
  invoiceBaseSchema,
  monthlyMerchantBillingSchema,
  monthlyProviderBillingSchema,
  billingCycleSchema,
  billingStatsSchema
} from '@/schemas/invoice.schema';
import { 
  UserRole, 
  InvoiceStatus 
} from '@prisma/client';
import { isRoleAllowed } from '@/lib/auth-helpers';
import { Prisma } from '@prisma/client';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Router tRPC pour la gestion des factures
 * Fournit des endpoints pour générer, consulter et télécharger les factures
 */
export const invoiceRouter = router({
  /**
   * Récupère toutes les factures de l'utilisateur connecté
   */
  getMyInvoices: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      status: z.nativeEnum(InvoiceStatus).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { page, limit, status, startDate, endDate, sortOrder } = input;
        
        // Construire le filtre
        const where: Prisma.InvoiceWhereInput = {
          userId
        };
        
        if (status) {
          where.status = status;
        }
        
        if (startDate || endDate) {
          where.issueDate = {};
          if (startDate) where.issueDate.gte = startDate;
          if (endDate) where.issueDate.lte = endDate;
        }
        
        // Récupérer les factures
        const [invoices, total] = await Promise.all([
          ctx.db.invoice.findMany({
            where,
            orderBy: { issueDate: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              payments: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  createdAt: true
                }
              }
            }
          }),
          ctx.db.invoice.count({ where })
        ]);
        
        return {
          invoices,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          },
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des factures",
          cause: error,
        });
      }
    }),

  /**
   * Récupère une facture par son ID
   */
  getInvoiceById: protectedProcedure
    .input(z.object({
      invoiceId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { invoiceId } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            payments: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            items: true
          }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier l'accès
        if (invoice.userId !== userId && !isRoleAllowed(ctx.session.user.role, [UserRole.ADMIN])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas accès à cette facture"
          });
        }
        
        return {
          invoice,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les détails d'une facture (alias pour getInvoiceById)
   */
  getInvoiceDetails: protectedProcedure
    .input(z.object({
      invoiceId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { invoiceId } = input;
        
        // Récupérer la facture avec tous les détails
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            payments: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            },
            items: true
          }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier l'accès
        if (invoice.userId !== userId && !isRoleAllowed(ctx.session.user.role, [UserRole.ADMIN])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas accès à cette facture"
          });
        }
        
        return {
          invoice,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des détails de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les statistiques de factures de l'utilisateur connecté
   */
  getMyInvoiceStats: protectedProcedure
    .input(z.object({
      period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
      compareWithPrevious: z.boolean().default(true),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { period, compareWithPrevious, startDate, endDate } = input;
        
        // Calculer les dates de la période actuelle et précédente
        const now = new Date();
        let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;
        
        if (startDate && endDate) {
          currentStart = startDate;
          currentEnd = endDate;
        } else {
          // Définir la période basée sur le paramètre
          switch (period) {
            case 'day':
              currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
              break;
            case 'week':
              const dayOfWeek = now.getDay();
              currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
              currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
              break;
            case 'month':
              currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
              currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              break;
            case 'quarter':
              const quarter = Math.floor(now.getMonth() / 3);
              currentStart = new Date(now.getFullYear(), quarter * 3, 1);
              currentEnd = new Date(now.getFullYear(), quarter * 3 + 3, 1);
              break;
            case 'year':
              currentStart = new Date(now.getFullYear(), 0, 1);
              currentEnd = new Date(now.getFullYear() + 1, 0, 1);
              break;
          }
        }
        
        // Calculer la période précédente pour comparaison
        const periodDiff = currentEnd.getTime() - currentStart.getTime();
        previousEnd = new Date(currentStart.getTime());
        previousStart = new Date(currentStart.getTime() - periodDiff);
        
        // Récupérer les statistiques pour la période actuelle
        const [currentInvoices, currentPaidInvoices, previousInvoices, previousPaidInvoices] = await Promise.all([
          ctx.db.invoice.findMany({
            where: {
              userId,
              issueDate: {
                gte: currentStart,
                lt: currentEnd
              }
            }
          }),
          ctx.db.invoice.findMany({
            where: {
              userId,
              status: InvoiceStatus.PAID,
              paidDate: {
                gte: currentStart,
                lt: currentEnd
              }
            }
          }),
          compareWithPrevious ? ctx.db.invoice.findMany({
            where: {
              userId,
              issueDate: {
                gte: previousStart,
                lt: previousEnd
              }
            }
          }) : [],
          compareWithPrevious ? ctx.db.invoice.findMany({
            where: {
              userId,
              status: InvoiceStatus.PAID,
              paidDate: {
                gte: previousStart,
                lt: previousEnd
              }
            }
          }) : []
        ]);
        
        // Calculer les statistiques
        const currentTotal = currentInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        const currentPaidTotal = currentPaidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        const previousTotal = previousInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        const previousPaidTotal = previousPaidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
        
        // Calculer les changements en pourcentage
        const totalChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
        const paidChange = previousPaidTotal > 0 ? ((currentPaidTotal - previousPaidTotal) / previousPaidTotal) * 100 : 0;
        
        const stats = {
          totalInvoices: currentInvoices.length,
          totalAmount: currentTotal,
          paidInvoices: currentPaidInvoices.length,
          paidAmount: currentPaidTotal,
          pendingInvoices: currentInvoices.filter(inv => inv.status === InvoiceStatus.PENDING).length,
          overdueInvoices: currentInvoices.filter(inv => 
            inv.status === InvoiceStatus.PENDING && 
            inv.dueDate && 
            inv.dueDate < now
          ).length,
          averageInvoiceAmount: currentInvoices.length > 0 ? currentTotal / currentInvoices.length : 0,
          paymentRate: currentInvoices.length > 0 ? (currentPaidInvoices.length / currentInvoices.length) * 100 : 0,
          period: {
            start: currentStart,
            end: currentEnd,
            type: period
          },
          comparison: compareWithPrevious ? {
            previousTotal,
            previousPaidTotal,
            totalChange,
            paidChange,
            invoiceCountChange: previousInvoices.length > 0 ? 
              ((currentInvoices.length - previousInvoices.length) / previousInvoices.length) * 100 : 0
          } : null
        };
        
        return {
          stats,
          isDemoMode: process.env.DEMO_MODE === 'true'
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
   * Télécharge une facture au format PDF
   */
  downloadInvoice: protectedProcedure
    .input(z.object({
      invoiceId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { invoiceId } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId },
          include: {
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
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier l'accès
        if (invoice.userId !== userId && !isRoleAllowed(ctx.session.user.role, [UserRole.ADMIN])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas accès à cette facture"
          });
        }
        
        // Générer ou récupérer le PDF
        const pdfResult = await invoiceService.generateInvoicePdf(invoiceId);
        
        // Enregistrer le téléchargement
        await ctx.db.userAction.create({
          data: {
            userId,
            action: 'DOWNLOAD_INVOICE',
            entityType: 'INVOICE',
            entityId: invoiceId
          }
        });
        
        return {
          success: true,
          pdfUrl: pdfResult.url,
          pdfData: pdfResult.data,
          invoice,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors du téléchargement de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Envoie une facture par email
   */
  sendInvoiceByEmail: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      recipientEmail: z.string().email().optional(),
      message: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { invoiceId, recipientEmail, message } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier l'accès
        if (invoice.userId !== userId && !isRoleAllowed(ctx.session.user.role, [UserRole.ADMIN])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas accès à cette facture"
          });
        }
        
        // Déterminer l'email du destinataire
        const emailTo = recipientEmail || invoice.user.email;
        
        // Envoyer la facture par email
        const emailResult = await invoiceService.sendInvoiceByEmail({
          invoiceId,
          to: emailTo,
          message: message || undefined
        });
        
        // Enregistrer l'envoi
        await ctx.db.userAction.create({
          data: {
            userId,
            action: 'EMAIL_INVOICE',
            entityType: 'INVOICE',
            entityId: invoiceId,
            details: {
              recipientEmail: emailTo
            }
          }
        });
        
        return {
          success: true,
          emailResult,
          message: `Facture envoyée avec succès à ${emailTo}`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'envoi de la facture par email",
          cause: error,
        });
      }
    }),

  /**
   * Marque une facture comme payée
   */
  markInvoiceAsPaid: protectedProcedure
    .input(z.object({
      invoiceId: z.string(),
      paymentMethod: z.string().optional(),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { invoiceId, paymentMethod, notes } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier que c'est une facture de l'utilisateur ou un admin
        if (invoice.userId !== userId && !isRoleAllowed(ctx.session.user.role, [UserRole.ADMIN])) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'avez pas l'autorisation de modifier cette facture"
          });
        }
        
        // Vérifier que la facture peut être marquée comme payée
        if (invoice.status !== 'PENDING' && invoice.status !== 'DRAFT') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible de marquer une facture ${invoice.status} comme payée`
          });
        }
        
        // En mode démonstration, créer un paiement simulé
        if (process.env.DEMO_MODE === 'true') {
          // Créer un paiement simulé
          await ctx.db.payment.create({
            data: {
              userId,
              invoiceId,
              amount: invoice.amount,
              currency: invoice.currency,
              paymentMethod: paymentMethod || 'DEMO_PAYMENT',
              status: 'COMPLETED',
              metadata: {
                demo: true,
                notes: notes || 'Paiement simulé en mode démonstration'
              }
            }
          });
        }
        
        // Mettre à jour la facture
        const updatedInvoice = await ctx.db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            notes: notes 
              ? (invoice.notes ? `${invoice.notes}\n\n${notes}` : notes) 
              : invoice.notes
          }
        });
        
        // Enregistrer l'action
        await ctx.db.userAction.create({
          data: {
            userId,
            action: 'MARK_INVOICE_PAID',
            entityType: 'INVOICE',
            entityId: invoiceId,
            details: {
              paymentMethod: paymentMethod || 'MANUAL',
              isDemo: process.env.DEMO_MODE === 'true'
            }
          }
        });
        
        return {
          success: true,
          invoice: updatedInvoice,
          message: "Facture marquée comme payée avec succès",
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la mise à jour de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Obtient un résumé des factures récentes
   */
  getInvoiceSummary: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const userId = ctx.session.user.id;
        
        // Récupérer les factures des 3 derniers mois
        const threeMonthsAgo = subMonths(new Date(), 3);
        
        const [recentInvoices, paidAmount, pendingAmount, invoicesByStatus] = await Promise.all([
          // Factures récentes
          ctx.db.invoice.findMany({
            where: {
              userId,
              issuedDate: {
                gte: threeMonthsAgo
              }
            },
            orderBy: { issuedDate: 'desc' },
            take: 5
          }),
          
          // Montant payé
          ctx.db.invoice.aggregate({
            where: {
              userId,
              status: 'PAID',
              issuedDate: {
                gte: threeMonthsAgo
              }
            },
            _sum: {
              amount: true
            }
          }),
          
          // Montant en attente
          ctx.db.invoice.aggregate({
            where: {
              userId,
              status: 'PENDING',
              issuedDate: {
                gte: threeMonthsAgo
              }
            },
            _sum: {
              amount: true
            }
          }),
          
          // Factures par statut
          ctx.db.invoice.groupBy({
            by: ['status'],
            where: {
              userId,
              issuedDate: {
                gte: threeMonthsAgo
              }
            },
            _count: true
          })
        ]);
        
        // Formater le résumé par statut
        const statusSummary = invoicesByStatus.reduce((acc: Record<string, number>, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {
          PAID: 0,
          PENDING: 0,
          DRAFT: 0,
          CANCELLED: 0,
          REFUNDED: 0
        });
        
        return {
          recentInvoices,
          paidAmount: paidAmount._sum.amount ? Number(paidAmount._sum.amount) : 0,
          pendingAmount: pendingAmount._sum.amount ? Number(pendingAmount._sum.amount) : 0,
          invoicesByStatus: statusSummary,
          period: {
            start: format(threeMonthsAgo, 'PPP', { locale: fr }),
            end: format(new Date(), 'PPP', { locale: fr })
          },
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération du résumé des factures",
          cause: error,
        });
      }
    }),

  // ==== ADMIN PROCEDURES ====

  /**
   * Récupère toutes les factures (admin uniquement)
   */
  getAllInvoices: adminProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      status: z.enum(['ALL', 'DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED']).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      userId: z.string().optional(),
      invoiceType: z.enum(['ALL', 'SUBSCRIPTION', 'SERVICE', 'COMMISSION']).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { page, limit, status, startDate, endDate, sortOrder, userId, invoiceType } = input;
        
        // Construire le filtre
        const where: Prisma.InvoiceWhereInput = {};
        
        if (status && status !== 'ALL') {
          where.status = status;
        }
        
        if (startDate || endDate) {
          where.issuedDate = {};
          if (startDate) where.issuedDate.gte = startDate;
          if (endDate) where.issuedDate.lte = endDate;
        }
        
        if (userId) {
          where.userId = userId;
        }
        
        if (invoiceType && invoiceType !== 'ALL') {
          where.type = invoiceType;
        }
        
        // Récupérer les factures
        const [invoices, total] = await Promise.all([
          ctx.db.invoice.findMany({
            where,
            orderBy: { issuedDate: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              },
              payments: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  createdAt: true
                }
              }
            }
          }),
          ctx.db.invoice.count({ where })
        ]);
        
        // Statistiques par statut
        const statsByStatus = await ctx.db.invoice.groupBy({
          by: ['status'],
          where,
          _count: true,
          _sum: {
            amount: true
          }
        });
        
        // Formater les statistiques
        const stats = {
          byStatus: statsByStatus.reduce((acc: Record<string, any>, stat) => {
            acc[stat.status] = {
              count: stat._count,
              amount: stat._sum.amount ? Number(stat._sum.amount) : 0
            };
            return acc;
          }, {
            PAID: { count: 0, amount: 0 },
            PENDING: { count: 0, amount: 0 },
            DRAFT: { count: 0, amount: 0 },
            CANCELLED: { count: 0, amount: 0 },
            REFUNDED: { count: 0, amount: 0 }
          }),
          total: {
            count: total,
            amount: statsByStatus.reduce((sum, stat) => {
              return sum + (stat._sum.amount ? Number(stat._sum.amount) : 0);
            }, 0)
          }
        };
        
      return {
          invoices,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          },
          stats,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la récupération des factures",
          cause: error,
        });
      }
    }),

  /**
   * Crée une facture manuelle (admin uniquement)
   */
  createInvoice: adminProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        
        // Vérifier que l'utilisateur existe
        const user = await ctx.db.user.findUnique({
          where: { id: input.userId }
        });
        
        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Utilisateur non trouvé"
          });
        }
        
        // Créer la facture
        const invoice = await invoiceService.createInvoice({
          ...input,
          createdById: adminId
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'INVOICE',
            entityId: invoice.id,
            performedById: adminId,
            action: 'CREATE_INVOICE',
            changes: {
              userId: input.userId,
              amount: String(input.amount),
              type: input.type,
              status: input.status || 'DRAFT'
            }
          }
        });
        
        // Envoyer la facture par email si demandé
        if (input.sendEmail && input.status === 'PENDING') {
          await invoiceService.sendInvoiceByEmail({
            invoiceId: invoice.id,
            to: user.email
          });
        }
        
    return {
          success: true,
          invoice,
          message: "Facture créée avec succès",
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la création de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Met à jour une facture (admin uniquement)
   */
  updateInvoice: adminProcedure
    .input(z.object({
      invoiceId: z.string(),
      status: z.enum(['DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED']).optional(),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
      items: z.array(
      z.object({
          id: z.string().optional(),
          description: z.string(),
          quantity: z.number().positive(),
          unitPrice: z.number().nonnegative(),
          taxRate: z.number().min(0).max(100).default(0),
          discount: z.number().min(0).max(100).default(0)
        })
      ).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { invoiceId, ...updateData } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            items: true
          }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier que la facture peut être modifiée
        if (invoice.status === 'PAID' && !updateData.status) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Impossible de modifier une facture déjà payée"
          });
        }
        
        // Mettre à jour les données de la facture
        const updatedInvoice = await invoiceService.updateInvoice({
          invoiceId,
          ...updateData,
          updatedById: adminId
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'INVOICE',
            entityId: invoiceId,
            performedById: adminId,
            action: 'UPDATE_INVOICE',
            changes: {
              status: updateData.status || invoice.status,
              dueDate: updateData.dueDate ? updateData.dueDate.toISOString() : undefined,
              itemsUpdated: updateData.items ? 'true' : 'false'
            }
          }
        });
        
      return {
          success: true,
          invoice: updatedInvoice,
          message: "Facture mise à jour avec succès",
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la mise à jour de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Annule une facture (admin uniquement)
   */
  cancelInvoice: adminProcedure
    .input(z.object({
      invoiceId: z.string(),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { invoiceId, reason } = input;
        
        // Récupérer la facture
        const invoice = await ctx.db.invoice.findUnique({
          where: { id: invoiceId }
        });
        
        if (!invoice) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: "Facture non trouvée"
          });
        }
        
        // Vérifier que la facture peut être annulée
        if (invoice.status === 'PAID' || invoice.status === 'REFUNDED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Impossible d'annuler une facture ${invoice.status}`
          });
        }
        
        // Annuler la facture
        const cancelledInvoice = await ctx.db.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledById: adminId,
            notes: reason 
              ? (invoice.notes ? `${invoice.notes}\n\nAnnulation: ${reason}` : `Annulation: ${reason}`) 
              : invoice.notes
          }
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'INVOICE',
            entityId: invoiceId,
            performedById: adminId,
            action: 'CANCEL_INVOICE',
            changes: {
              previousStatus: invoice.status,
              reason: reason || 'Non spécifié'
            }
          }
        });
        
        return {
          success: true,
          invoice: cancelledInvoice,
          message: "Facture annulée avec succès",
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'annulation de la facture",
          cause: error,
        });
      }
    }),

  /**
   * Génère des statistiques de facturation
   */
  getInvoiceStats: adminProcedure
    .input(z.object({
      period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
      compareWithPrevious: z.boolean().default(true),
      startDate: z.date().optional(),
      endDate: z.date().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { period, compareWithPrevious, startDate, endDate } = input;
        
        // Obtenir les statistiques
        const stats = await invoiceService.generateInvoiceStats({
          period,
          compareWithPrevious,
          startDate,
          endDate
        });
        
      return {
          success: true,
          stats,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la génération des statistiques",
          cause: error,
        });
      }
    }),
    
  /**
   * Génère un rapport de facturation (admin uniquement)
   */
  generateInvoiceReport: adminProcedure
    .input(z.object({
      reportType: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM']),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      format: z.enum(['PDF', 'CSV', 'EXCEL']).default('PDF')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        
        // Générer le rapport
        const report = await invoiceService.generateInvoiceReport({
          ...input,
          generatedById: adminId
        });
        
        // Enregistrer dans les logs d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'REPORT',
            entityId: report.reportId,
            performedById: adminId,
            action: 'GENERATE_INVOICE_REPORT',
            changes: {
              reportType: input.reportType,
              format: input.format,
              startDate: input.startDate?.toISOString() || 'auto',
              endDate: input.endDate?.toISOString() || 'auto'
            }
          }
        });
        
        return {
          success: true,
          report,
          message: `Rapport de facturation généré avec succès au format ${input.format}`,
          isDemoMode: process.env.DEMO_MODE === 'true'
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la génération du rapport",
          cause: error,
        });
      }
    }),

  // ==== NOUVEAUX ENDPOINTS POUR LA FACTURATION AUTOMATIQUE ====

  /**
   * Génère les factures mensuelles pour les marchands (admin uniquement)
   */
  generateMonthlyMerchantBilling: adminProcedure
    .input(monthlyMerchantBillingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Si un merchantId spécifique est fourni, traiter seulement ce marchand
        if (input.merchantId) {
          const result = await billingService.generateMerchantInvoice(
            input.merchantId,
            input.periodStart || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            input.periodEnd || new Date(new Date().getFullYear(), new Date().getMonth(), 0)
          );

          // Log d'audit
          await ctx.db.auditLog.create({
            data: {
              entityType: 'INVOICE',
              entityId: result.invoice.id,
              performedById: adminId,
              action: 'GENERATE_MERCHANT_INVOICE',
              changes: {
                merchantId: input.merchantId,
                amount: String(result.totalAmount),
                period: `${input.periodStart?.toISOString()} - ${input.periodEnd?.toISOString()}`
              }
            }
          });

          return {
            success: true,
            invoice: result.invoice,
            totalAmount: result.totalAmount,
            serviceFees: result.serviceFees,
            commissionFees: result.commissionFees,
            message: "Facture marchande générée avec succès"
          };
        }

        // Sinon, générer pour tous les marchands
        const result = await billingService.generateMonthlyProviderInvoices(
          input.periodEnd || new Date()
        );

        return {
          success: true,
          results: result.results,
          period: result.period,
          message: "Facturation mensuelle des marchands terminée"
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la génération des factures marchandes",
          cause: error,
        });
      }
    }),

  /**
   * Génère les factures mensuelles pour les prestataires (admin uniquement)
   */
  generateMonthlyProviderBilling: adminProcedure
    .input(monthlyProviderBillingSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        // Si un providerId spécifique est fourni, traiter seulement ce prestataire
        if (input.providerId) {
          const result = await billingService.generateProviderInvoice(
            input.providerId,
            input.periodStart || new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            input.periodEnd || new Date(new Date().getFullYear(), new Date().getMonth(), 0)
          );

          // Log d'audit
          await ctx.db.auditLog.create({
            data: {
              entityType: 'INVOICE',
              entityId: result.invoice.id,
              performedById: adminId,
              action: 'GENERATE_PROVIDER_INVOICE',
              changes: {
                providerId: input.providerId,
                amount: String(result.totalAmount),
                period: `${input.periodStart?.toISOString()} - ${input.periodEnd?.toISOString()}`
              }
            }
          });

          return {
            success: true,
            invoice: result.invoice,
            totalAmount: result.totalAmount,
            serviceFees: result.serviceFees,
            commissionFees: result.commissionFees,
            message: "Facture prestataire générée avec succès"
          };
        }

        // Sinon, générer pour tous les prestataires
        const result = await billingService.generateMonthlyProviderInvoices(
          input.periodEnd || new Date()
        );

        return {
          success: true,
          results: result.results,
          period: result.period,
          message: "Facturation mensuelle des prestataires terminée"
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la génération des factures prestataires",
          cause: error,
        });
      }
    }),

  /**
   * Crée un cycle de facturation programmé (admin uniquement)
   */
  createBillingCycle: adminProcedure
    .input(billingCycleSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        const cycle = await billingService.createBillingCycle({
          merchantId: input.merchantId,
          providerId: input.providerId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          scheduledRunDate: input.scheduledRunDate
        });

        // Si l'exécution automatique est demandée et que la date est aujourd'hui
        if (input.autoExecute && new Date().toDateString() === input.scheduledRunDate.toDateString()) {
          await billingService.executeBillingCycle(cycle.id);
        }

        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_CYCLE',
            entityId: cycle.id,
            performedById: adminId,
            action: 'CREATE_BILLING_CYCLE',
            changes: {
              merchantId: input.merchantId,
              providerId: input.providerId,
              scheduledRunDate: input.scheduledRunDate.toISOString(),
              autoExecute: input.autoExecute
            }
          }
        });

        return {
          success: true,
          cycle,
          message: "Cycle de facturation créé avec succès"
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la création du cycle de facturation",
          cause: error,
        });
      }
    }),

  /**
   * Exécute un cycle de facturation spécifique (admin uniquement)
   */
  executeBillingCycle: adminProcedure
    .input(z.object({
      billingCycleId: z.string().cuid('ID cycle invalide')
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;
        const { billingCycleId } = input;

        const result = await billingService.executeBillingCycle(billingCycleId);

        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'BILLING_CYCLE',
            entityId: billingCycleId,
            performedById: adminId,
            action: 'EXECUTE_BILLING_CYCLE',
            changes: {
              invoiceId: result.invoice?.id,
              status: 'COMPLETED'
            }
          }
        });

        return {
          success: true,
          result,
          message: "Cycle de facturation exécuté avec succès"
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'exécution du cycle de facturation",
          cause: error,
        });
      }
    }),

  /**
   * Exécute la facturation mensuelle automatique (admin uniquement)
   */
  runMonthlyBilling: adminProcedure
    .input(z.object({
      forceRun: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        const result = await billingService.runMonthlyBilling();

        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SYSTEM',
            entityId: 'monthly-billing',
            performedById: adminId,
            action: 'RUN_MONTHLY_BILLING',
            changes: {
              forceRun: input.forceRun,
              success: result.success,
              date: result.date
            }
          }
        });

        return {
          success: true,
          result,
          message: result.success ? "Facturation mensuelle exécutée avec succès" : "Facturation mensuelle non exécutée"
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'exécution de la facturation mensuelle",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les statistiques de facturation (admin uniquement)
   */
  getBillingStats: adminProcedure
    .input(billingStatsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const stats = await billingService.getBillingStats(input.period);

        return {
          success: true,
          stats,
          period: input.period,
          isDemoMode: process.env.DEMO_MODE === 'true'
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
   * Programme les cycles de facturation mensuelle (admin uniquement)
   */
  scheduleMonthlyCycles: adminProcedure
    .input(z.object({
      scheduledDate: z.date().default(() => new Date())
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const adminId = ctx.session.user.id;

        const result = await billingService.scheduleMonthlyCycles(input.scheduledDate);

        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SYSTEM',
            entityId: 'schedule-monthly-cycles',
            performedById: adminId,
            action: 'SCHEDULE_MONTHLY_CYCLES',
            changes: {
              scheduledDate: input.scheduledDate.toISOString(),
              merchantsScheduled: result.merchantsScheduled,
              providersScheduled: result.providersScheduled,
              cyclesCreated: result.cyclesCreated
            }
          }
        });

        return {
          success: true,
          result,
          message: `${result.cyclesCreated} cycles de facturation programmés pour le ${input.scheduledDate.toLocaleDateString()}`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la programmation des cycles",
          cause: error,
        });
      }
    }),

  /**
   * Exécute les cycles de facturation programmés pour aujourd'hui (admin uniquement)
   */
  executeScheduledCycles: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const adminId = ctx.session.user.id;

        const result = await billingService.executeScheduledCycles();

        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SYSTEM',
            entityId: 'execute-scheduled-cycles',
            performedById: adminId,
            action: 'EXECUTE_SCHEDULED_CYCLES',
            changes: {
              cyclesFound: result.cyclesFound,
              merchantsProcessed: result.report.merchantsProcessed,
              providersProcessed: result.report.providersProcessed,
              invoicesGenerated: result.report.invoicesGenerated,
              totalAmount: result.report.totalAmount
            }
          }
        });

        return {
          success: true,
          result,
          message: `${result.report.invoicesGenerated} factures générées lors de l'exécution des cycles programmés`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de l'exécution des cycles programmés",
          cause: error,
        });
      }
    }),

  // ===== NOUVEAUX ENDPOINTS POUR FACTURATION AUTOMATIQUE MERCHANTS =====

  /**
   * Lance la facturation automatique mensuelle pour tous les merchants (admin)
   */
  runMonthlyMerchantBilling: adminProcedure
    .input(z.object({
      date: z.date().optional(),
      forceRun: z.boolean().default(false)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { merchantBillingService } = await import('@/server/services/billing-merchant.service');
        const result = await merchantBillingService.runMonthlyMerchantBilling(input.date);
        
        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SYSTEM',
            entityId: 'monthly-merchant-billing',
            performedById: ctx.session.user.id,
            action: 'RUN_MONTHLY_MERCHANT_BILLING',
            changes: {
              merchantsProcessed: result.merchantsProcessed,
              invoicesGenerated: result.invoicesGenerated,
              totalAmount: result.totalAmount,
              errors: result.errors
            }
          }
        });

        return {
          success: true,
          result,
          message: `Facturation merchants: ${result.invoicesGenerated} factures générées pour ${result.merchantsProcessed} merchants`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors de la facturation merchants",
          cause: error,
        });
      }
    }),

  /**
   * Traite les paiements automatiques programmés (admin)
   */
  processScheduledMerchantPayments: adminProcedure
    .mutation(async ({ ctx }) => {
      try {
        const { merchantBillingService } = await import('@/server/services/billing-merchant.service');
        const result = await merchantBillingService.processScheduledMerchantPayments();
        
        // Log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: 'SYSTEM',
            entityId: 'scheduled-merchant-payments',
            performedById: ctx.session.user.id,
            action: 'PROCESS_SCHEDULED_MERCHANT_PAYMENTS',
            changes: result
          }
        });

        return {
          success: true,
          result,
          message: `${result.successfulPayments}/${result.paymentsProcessed} paiements traités avec succès`
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || "Erreur lors du traitement des paiements automatiques",
          cause: error,
        });
      }
    }),

  /**
   * Récupère les factures du merchant connecté avec filtres étendus
   */
  getMerchantInvoices: protectedProcedure
    .input(z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().max(100).default(10),
      status: z.enum(['ALL', 'DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED']).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      invoiceType: z.enum(['MERCHANT_FEE', 'SERVICE', 'OTHER']).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc')
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Vérifier que l'utilisateur est un merchant
      const merchant = await ctx.db.merchant.findUnique({
        where: { userId },
        select: { id: true }
      });
      
      if (!merchant) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous devez être un commerçant pour accéder à cette ressource'
        });
      }
      
      const where: any = {
        userId,
        invoiceType: input.invoiceType || 'MERCHANT_FEE'
      };
      
      if (input.status && input.status !== 'ALL') {
        where.status = input.status;
      }
      
      if (input.startDate || input.endDate) {
        where.issuedDate = {};
        if (input.startDate) where.issuedDate.gte = input.startDate;
        if (input.endDate) where.issuedDate.lte = input.endDate;
      }
      
      const [invoices, total] = await Promise.all([
        ctx.db.invoice.findMany({
          where,
          orderBy: { issuedDate: input.sortOrder },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          include: {
            items: true,
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true
              }
            }
          }
        }),
        ctx.db.invoice.count({ where })
      ]);
      
      return {
        invoices,
        pagination: {
          total,
          page: input.page,
          limit: input.limit,
          pages: Math.ceil(total / input.limit)
        }
      };
    }),

  /**
   * Récupère les statistiques de facturation pour un merchant
   */
  getMerchantBillingStats: protectedProcedure
    .input(z.object({
      period: z.enum(['MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
      startDate: z.date().optional(),
      endDate: z.date().optional()
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
          message: 'Vous devez être un commerçant pour accéder à cette ressource'
        });
      }
      
      let startDate: Date;
      let endDate: Date = new Date();
      
      if (input.startDate && input.endDate) {
        startDate = input.startDate;
        endDate = input.endDate;
      } else {
        const now = new Date();
        switch (input.period) {
          case 'MONTH':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
          case 'QUARTER':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case 'YEAR':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
            break;
        }
      }
      
      // Statistiques des factures du merchant
      const [totalInvoices, totalAmount, paidInvoices, paidAmount, pendingInvoices] = await Promise.all([
        ctx.db.invoice.count({
          where: {
            userId,
            invoiceType: 'MERCHANT_FEE',
            issuedDate: { gte: startDate, lte: endDate }
          }
        }),
        ctx.db.invoice.aggregate({
          where: {
            userId,
            invoiceType: 'MERCHANT_FEE',
            issuedDate: { gte: startDate, lte: endDate }
          },
          _sum: { totalAmount: true }
        }),
        ctx.db.invoice.count({
          where: {
            userId,
            invoiceType: 'MERCHANT_FEE',
            status: 'PAID',
            issuedDate: { gte: startDate, lte: endDate }
          }
        }),
        ctx.db.invoice.aggregate({
          where: {
            userId,
            invoiceType: 'MERCHANT_FEE',
            status: 'PAID',
            issuedDate: { gte: startDate, lte: endDate }
          },
          _sum: { totalAmount: true }
        }),
        ctx.db.invoice.count({
          where: {
            userId,
            invoiceType: 'MERCHANT_FEE',
            status: 'PENDING',
            issuedDate: { gte: startDate, lte: endDate }
          }
        })
      ]);
      
      return {
        period: input.period,
        dateRange: { startDate, endDate },
        totalInvoices,
        totalAmount: parseFloat(totalAmount._sum.totalAmount?.toString() || '0'),
        paidInvoices,
        paidAmount: parseFloat(paidAmount._sum.totalAmount?.toString() || '0'),
        pendingInvoices,
        paymentRate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0
      };
    })
});

export default invoiceRouter;
