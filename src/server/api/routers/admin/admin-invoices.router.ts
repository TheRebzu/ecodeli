import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { invoiceService } from "@/server/services/shared/invoice.service";

/**
 * Router pour la gestion des factures par les administrateurs
 * Implémentation complète de toutes les fonctionnalités
 */
export const adminInvoicesRouter = router({
  // Récupérer toutes les factures avec filtres et pagination
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
      type: z.enum(["DELIVERY", "SERVICE", "SUBSCRIPTION", "COMMISSION"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      search: z.string().optional(),
      userId: z.string().optional(),
      sortBy: z.enum(["createdAt", "dueDate", "amount", "status"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc")
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        // Vérifier les permissions admin
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const skip = (input.page - 1) * input.limit;
        
        // Construire les filtres de recherche
        const where: any = {};
        
        if (input.status) {
          where.status = input.status;
        }
        
        if (input.type) {
          where.type = input.type;
        }
        
        if (input.dateFrom || input.dateTo) {
          where.createdAt = {};
          if (input.dateFrom) {
            where.createdAt.gte = new Date(input.dateFrom);
          }
          if (input.dateTo) {
            where.createdAt.lte = new Date(input.dateTo);
          }
        }
        
        if (input.search) {
          where.OR = [
            { invoiceNumber: { contains: input.search, mode: 'insensitive' } },
            { user: { email: { contains: input.search, mode: 'insensitive' } } },
            { user: { profile: { firstName: { contains: input.search, mode: 'insensitive' } } } },
            { user: { profile: { lastName: { contains: input.search, mode: 'insensitive' } } } }
          ];
        }
        
        if (input.userId) {
          where.userId = input.userId;
        }

        // Récupérer les factures avec relations
        const [invoices, total] = await Promise.all([
          ctx.db.invoice.findMany({
            where,
            include: {
              user: {
                include: {
                  profile: true
                }
              },
              items: true,
              payments: true
            },
            skip,
            take: input.limit,
            orderBy: {
              [input.sortBy]: input.sortOrder
            }
          }),
          ctx.db.invoice.count({ where })
        ]);

        // Enrichir les données avec des calculs
        const enrichedInvoices = invoices.map(invoice => {
          const totalAmount = invoice.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
          const paidAmount = invoice.payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + p.amount, 0);
          
          return {
            ...invoice,
            totalAmount,
            paidAmount,
            remainingAmount: totalAmount - paidAmount,
            isOverdue: invoice.status === 'SENT' && invoice.dueDate && new Date(invoice.dueDate) < new Date(),
            userName: `${invoice.user.profile?.firstName || ''} ${invoice.user.profile?.lastName || ''}`.trim() || invoice.user.email
          };
        });

        return {
          invoices: enrichedInvoices,
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit)
          },
          stats: {
            totalAmount: enrichedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
            paidAmount: enrichedInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
            overdueCount: enrichedInvoices.filter(inv => inv.isOverdue).length
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des factures"
        });
      }
    }),

  // Récupérer une facture spécifique
  getById: protectedProcedure
    .input(z.object({
      id: z.string()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const invoice = await ctx.db.invoice.findUnique({
          where: { id: input.id },
          include: {
            user: {
              include: {
                profile: true
              }
            },
            items: true,
            payments: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée"
          });
        }

        const totalAmount = invoice.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
        const paidAmount = invoice.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          ...invoice,
          totalAmount,
          paidAmount,
          remainingAmount: totalAmount - paidAmount,
          userName: `${invoice.user.profile?.firstName || ''} ${invoice.user.profile?.lastName || ''}`.trim() || invoice.user.email
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la facture"
        });
      }
    }),

  // Créer une nouvelle facture
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      type: z.enum(["DELIVERY", "SERVICE", "SUBSCRIPTION", "COMMISSION"]),
      dueDate: z.string(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.number().min(1),
        amount: z.number().min(0),
        taxRate: z.number().min(0).max(100).default(20)
      })),
      notes: z.string().optional(),
      template: z.enum(["DEFAULT", "SIMPLE", "DETAILED"]).default("DEFAULT")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        // Vérifier que l'utilisateur existe
        const targetUser = await ctx.db.user.findUnique({
          where: { id: input.userId }
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Utilisateur non trouvé"
          });
        }

        // Créer la facture via le service
        const invoice = await invoiceService.createInvoice({
          userId: input.userId,
          type: input.type,
          dueDate: new Date(input.dueDate),
          items: input.items,
          notes: input.notes,
          template: input.template
        });

        // Logger l'action admin
        await ctx.db.adminTask.create({
          data: {
            type: 'INVOICE_CREATED',
            title: 'Création de facture',
            description: `Facture ${invoice.invoiceNumber} créée pour ${targetUser.email}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              invoiceId: invoice.id,
              userId: input.userId,
              type: input.type,
              amount: input.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
            }
          }
        });

        return {
          success: true,
          invoice,
          message: "Facture créée avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la création de la facture"
        });
      }
    }),

  // Mettre à jour le statut d'une facture
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]),
      reason: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const invoice = await ctx.db.invoice.findUnique({
          where: { id: input.id },
          include: { user: true }
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée"
          });
        }

        // Mettre à jour le statut
        const updatedInvoice = await ctx.db.invoice.update({
          where: { id: input.id },
          data: {
            status: input.status,
            updatedAt: new Date()
          }
        });

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'INVOICE_STATUS_UPDATED',
            title: 'Mise à jour statut facture',
            description: `Facture ${invoice.invoiceNumber} - Statut changé vers ${input.status}${input.reason ? ` - Raison: ${input.reason}` : ''}`,
            status: 'COMPLETED',
            priority: 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              invoiceId: input.id,
              oldStatus: invoice.status,
              newStatus: input.status,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          invoice: updatedInvoice,
          message: "Statut de la facture mis à jour avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour du statut"
        });
      }
    }),

  // Supprimer une facture
  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const invoice = await ctx.db.invoice.findUnique({
          where: { id: input.id },
          include: { payments: true }
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée"
          });
        }

        // Vérifier qu'il n'y a pas de paiements associés
        const completedPayments = invoice.payments.filter(p => p.status === 'COMPLETED');
        if (completedPayments.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de supprimer une facture avec des paiements réalisés"
          });
        }

        // Supprimer la facture
        await ctx.db.invoice.delete({
          where: { id: input.id }
        });

        // Logger l'action
        await ctx.db.adminTask.create({
          data: {
            type: 'INVOICE_DELETED',
            title: 'Suppression de facture',
            description: `Facture ${invoice.invoiceNumber} supprimée - Raison: ${input.reason}`,
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              invoiceId: input.id,
              invoiceNumber: invoice.invoiceNumber,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          message: "Facture supprimée avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la suppression de la facture"
        });
      }
    }),

  // Générer et télécharger le PDF d'une facture
  generatePDF: protectedProcedure
    .input(z.object({
      id: z.string(),
      template: z.enum(["DEFAULT", "SIMPLE", "DETAILED"]).default("DEFAULT")
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const invoice = await ctx.db.invoice.findUnique({
          where: { id: input.id }
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée"
          });
        }

        // Générer le PDF via le service
        const pdfInfo = await invoiceService.generateInvoiceWithTemplate(
          input.id,
          input.template
        );

        return {
          success: true,
          downloadUrl: pdfInfo.downloadUrl,
          filename: pdfInfo.filename,
          message: "PDF généré avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF"
        });
      }
    }),

  // Obtenir les statistiques des factures
  getStats: protectedProcedure
    .input(z.object({
      period: z.enum(["week", "month", "quarter", "year"]).default("month"),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        // Calculer les dates selon la période
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();

        if (input.startDate && input.endDate) {
          startDate = new Date(input.startDate);
          endDate = new Date(input.endDate);
        } else {
          switch (input.period) {
            case "week":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "month":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case "quarter":
              const quarter = Math.floor(now.getMonth() / 3);
              startDate = new Date(now.getFullYear(), quarter * 3, 1);
              break;
            case "year":
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
          }
        }

        // Récupérer les statistiques
        const invoices = await ctx.db.invoice.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            items: true,
            payments: true
          }
        });

        // Calculer les statistiques
        const stats = {
          totalInvoices: invoices.length,
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          overdueAmount: 0,
          statusBreakdown: {
            DRAFT: 0,
            SENT: 0,
            PAID: 0,
            OVERDUE: 0,
            CANCELLED: 0
          },
          typeBreakdown: {
            DELIVERY: 0,
            SERVICE: 0,
            SUBSCRIPTION: 0,
            COMMISSION: 0
          }
        };

        invoices.forEach(invoice => {
          const totalAmount = invoice.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
          const paidAmount = invoice.payments
            .filter(p => p.status === 'COMPLETED')
            .reduce((sum, p) => sum + p.amount, 0);

          stats.totalAmount += totalAmount;
          stats.paidAmount += paidAmount;

          if (invoice.status === 'PAID') {
            // Facture payée
          } else if (invoice.status === 'OVERDUE') {
            stats.overdueAmount += (totalAmount - paidAmount);
          } else {
            stats.pendingAmount += (totalAmount - paidAmount);
          }

          stats.statusBreakdown[invoice.status]++;
          stats.typeBreakdown[invoice.type]++;
        });

        return stats;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    })
});
