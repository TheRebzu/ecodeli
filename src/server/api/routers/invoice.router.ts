import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { invoiceService } from '@/server/services/invoice.service';
import { 
  createInvoiceSchema, 
  invoiceBaseSchema 
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
      status: z.enum(['ALL', 'DRAFT', 'PENDING', 'PAID', 'CANCELLED', 'REFUNDED']).optional(),
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
        
        if (status && status !== 'ALL') {
          where.status = status;
        }
        
        if (startDate || endDate) {
          where.issuedDate = {};
          if (startDate) where.issuedDate.gte = startDate;
          if (endDate) where.issuedDate.lte = endDate;
        }
        
        // Récupérer les factures
        const [invoices, total] = await Promise.all([
          ctx.db.invoice.findMany({
            where,
            orderBy: { issuedDate: sortOrder },
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
            subscription: {
              select: {
                id: true,
                planType: true,
                planName: true
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
    })
});

export default invoiceRouter;
