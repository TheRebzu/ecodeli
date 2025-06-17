import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, InvoiceStatus } from "@prisma/client";

/**
 * Router pour les factures des prestataires
 * Gestion complète des factures, devis et paiements
 */
export const providerInvoicesRouter = createTRPCRouter({
  // Récupérer les factures du prestataire
  getMyInvoices: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(InvoiceStatus).optional(),
        clientId: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent accéder à ces factures",
        });
      }

      try {
        const where = {
          providerId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.clientId && { clientId: input.clientId }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
          ...(input.search && {
            OR: [
              { invoiceNumber: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { client: { name: { contains: input.search, mode: "insensitive" } } },
            ],
          }),
        };

        const [invoices, total] = await Promise.all([
          ctx.db.providerInvoice.findMany({
            where,
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
              serviceBooking: {
                select: {
                  id: true,
                  scheduledAt: true,
                  service: {
                    select: {
                      name: true,
                      category: true,
                    },
                  },
                },
              },
              payment: {
                select: {
                  id: true,
                  amount: true,
                  status: true,
                  paidAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.providerInvoice.count({ where }),
        ]);

        return {
          success: true,
          data: {
            invoices,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des factures:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des factures",
        });
      }
    }),

  // Créer une facture
  createInvoice: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        serviceBookingId: z.string().optional(),
        description: z.string().min(1, "Description requise"),
        items: z.array(
          z.object({
            description: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
            taxRate: z.number().min(0).max(100).default(20), // TVA en %
          })
        ),
        notes: z.string().optional(),
        dueDate: z.date().optional(),
        discountPercentage: z.number().min(0).max(100).default(0),
        taxIncluded: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent créer des factures",
        });
      }

      try {
        // Vérifier que le client existe
        const client = await ctx.db.user.findFirst({
          where: {
            id: input.clientId,
            role: UserRole.CLIENT,
          },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client non trouvé",
          });
        }

        // Vérifier la réservation de service si fournie
        if (input.serviceBookingId) {
          const booking = await ctx.db.serviceBooking.findFirst({
            where: {
              id: input.serviceBookingId,
              providerId: user.id,
              clientId: input.clientId,
            },
          });

          if (!booking) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Réservation de service non trouvée",
            });
          }
        }

        // Calculer les totaux
        const subtotal = input.items.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0
        );

        const discountAmount = (subtotal * input.discountPercentage) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;

        // Calculer la TVA moyenne
        const averageTaxRate = input.items.length > 0 
          ? input.items.reduce((sum, item) => sum + item.taxRate, 0) / input.items.length
          : 20;

        const taxAmount = input.taxIncluded 
          ? 0 
          : (subtotalAfterDiscount * averageTaxRate) / 100;

        const totalAmount = subtotalAfterDiscount + taxAmount;

        // Générer un numéro de facture unique
        const invoiceCount = await ctx.db.providerInvoice.count({
          where: { providerId: user.id },
        });
        const invoiceNumber = `PROV-${user.id.slice(-6)}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

        // Créer la facture
        const invoice = await ctx.db.providerInvoice.create({
          data: {
            providerId: user.id,
            clientId: input.clientId,
            serviceBookingId: input.serviceBookingId,
            invoiceNumber,
            description: input.description,
            items: input.items,
            subtotal,
            discountPercentage: input.discountPercentage,
            discountAmount,
            taxRate: averageTaxRate,
            taxAmount,
            totalAmount,
            taxIncluded: input.taxIncluded,
            notes: input.notes,
            dueDate: input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
            status: InvoiceStatus.DRAFT,
          },
          include: {
            client: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        console.log(`📋 Facture créée: ${invoiceNumber} pour ${invoice.client.name}`);

        return {
          success: true,
          data: invoice,
          message: "Facture créée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création de la facture:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la facture",
        });
      }
    }),

  // Envoyer une facture au client
  sendInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        message: z.string().optional(),
        reminderDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const invoice = await ctx.db.providerInvoice.findFirst({
          where: {
            id: input.invoiceId,
            providerId: user.id,
          },
          include: {
            client: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée",
          });
        }

        if (invoice.status !== InvoiceStatus.DRAFT) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Seules les factures en brouillon peuvent être envoyées",
          });
        }

        // Mettre à jour le statut de la facture
        const updatedInvoice = await ctx.db.providerInvoice.update({
          where: { id: input.invoiceId },
          data: {
            status: InvoiceStatus.SENT,
            sentAt: new Date(),
            reminderDate: input.reminderDate,
          },
        });

        // Envoyer l'email au client avec la facture
        await sendInvoiceByEmail({
          clientEmail: invoice.client.email,
          clientName: invoice.client.name,
          invoice: {
            id: invoice.id,
            number: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            dueDate: invoice.dueDate,
          },
          provider: {
            name: user.name,
            companyName: invoice.provider?.user?.name || user.name,
          },
          customMessage: input.message,
        });

        console.log(`📧 Facture ${invoice.invoiceNumber} envoyée par email à ${invoice.client.email}`);

        // Créer une notification pour le client
        await ctx.db.notification.create({
          data: {
            userId: invoice.clientId,
            type: "INVOICE_RECEIVED",
            title: "Nouvelle facture reçue",
            message: `Vous avez reçu une nouvelle facture (${invoice.invoiceNumber}) d'un montant de ${invoice.totalAmount}€`,
            data: {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.totalAmount,
              providerId: user.id,
              sentByEmail: true,
            },
          },
        });

        return {
          success: true,
          data: updatedInvoice,
          message: "Facture envoyée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de l'envoi de la facture:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi de la facture",
        });
      }
    }),

  // Marquer une facture comme payée
  markAsPaid: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        paidAmount: z.number().positive().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const invoice = await ctx.db.providerInvoice.findFirst({
          where: {
            id: input.invoiceId,
            providerId: user.id,
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée",
          });
        }

        if (invoice.status === InvoiceStatus.PAID) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette facture est déjà payée",
          });
        }

        const paidAmount = input.paidAmount || invoice.totalAmount;

        // Mettre à jour la facture
        const updatedInvoice = await ctx.db.providerInvoice.update({
          where: { id: input.invoiceId },
          data: {
            status: paidAmount >= invoice.totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
            paidAmount,
            paidAt: new Date(),
            paymentMethod: input.paymentMethod,
            paymentReference: input.paymentReference,
            paymentNotes: input.notes,
          },
        });

        // Créer un enregistrement de paiement
        await ctx.db.providerPayment.create({
          data: {
            providerId: user.id,
            invoiceId: input.invoiceId,
            amount: paidAmount,
            method: input.paymentMethod || "MANUAL",
            reference: input.paymentReference,
            status: "COMPLETED",
          },
        });

        return {
          success: true,
          data: updatedInvoice,
          message: "Facture marquée comme payée",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du marquage de paiement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du marquage de paiement",
        });
      }
    }),

  // Obtenir les statistiques de facturation
  getInvoiceStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.PROVIDER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalStats, pendingStats, overdueStats, monthlyStats] = await Promise.all([
        ctx.db.providerInvoice.aggregate({
          where: { providerId: user.id },
          _sum: { totalAmount: true, paidAmount: true },
          _count: { id: true },
        }),
        ctx.db.providerInvoice.aggregate({
          where: {
            providerId: user.id,
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        ctx.db.providerInvoice.aggregate({
          where: {
            providerId: user.id,
            status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
            dueDate: { lt: new Date() },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        }),
        ctx.db.providerInvoice.aggregate({
          where: {
            providerId: user.id,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
          _sum: { totalAmount: true, paidAmount: true },
          _count: { id: true },
        }),
      ]);

      return {
        success: true,
        data: {
          total: {
            invoices: totalStats._count.id || 0,
            amount: totalStats._sum.totalAmount || 0,
            paid: totalStats._sum.paidAmount || 0,
            outstanding: (totalStats._sum.totalAmount || 0) - (totalStats._sum.paidAmount || 0),
          },
          pending: {
            invoices: pendingStats._count.id || 0,
            amount: pendingStats._sum.totalAmount || 0,
          },
          overdue: {
            invoices: overdueStats._count.id || 0,
            amount: overdueStats._sum.totalAmount || 0,
          },
          thisMonth: {
            invoices: monthlyStats._count.id || 0,
            amount: monthlyStats._sum.totalAmount || 0,
            paid: monthlyStats._sum.paidAmount || 0,
          },
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),

  // Générer un PDF de facture
  generateInvoicePDF: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.PROVIDER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const invoice = await ctx.db.providerInvoice.findFirst({
          where: {
            id: input.invoiceId,
            providerId: user.id,
          },
          include: {
            client: true,
            provider: {
              include: {
                user: true,
              },
            },
          },
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée",
          });
        }

        // Générer le PDF réel avec le service dédié
        const pdfResult = await ctx.procedures.pdfGenerator.generateInvoicePdf({
          invoiceId: invoice.id,
          type: "PROVIDER_INVOICE",
          language: "fr",
          format: "A4",
        });

        if (!pdfResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erreur lors de la génération du PDF",
          });
        }

        // Enregistrer la génération PDF dans la facture
        await ctx.db.providerInvoice.update({
          where: { id: input.invoiceId },
          data: {
            pdfUrl: pdfResult.data.downloadUrl,
            pdfGeneratedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            pdfUrl: pdfResult.data.downloadUrl,
            documentId: pdfResult.data.documentId,
            fileName: pdfResult.data.fileName,
            invoice,
          },
          message: "PDF généré avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la génération du PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF",
        });
      }
    }),
});
