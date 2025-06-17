import { z } from "zod";
import { router as router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { PdfService } from "@/server/services/common/pdf.service";

/**
 * Router pour pdf generator
 * Mission 1 - COMMON
 */
export const pdfGeneratorRouter = router({
  // Générer un PDF de facture
  generateInvoicePdf: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        format: z.enum(["A4", "LETTER"]).default("A4"),
        language: z.enum(["fr", "en", "es", "de", "it"]).default("fr")
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        // Vérifier que la facture existe et appartient à l'utilisateur
        const invoice = await db.invoice.findFirst({
          where: {
            id: input.invoiceId,
            OR: [
              { userId: user.id },
              { user: { role: "ADMIN" } }
            ]
          },
          include: {
            user: {
              include: {
                profile: true
              }
            },
            items: true
          }
        });

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée"
          });
        }

        // Générer le PDF avec les données de la facture
        const pdfBuffer = await PdfService.generateInvoicePdf({
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.createdAt,
          dueDate: invoice.dueDate || new Date(),
          customerName: `${invoice.user.profile?.firstName || ''} ${invoice.user.profile?.lastName || ''}`.trim() || invoice.user.email,
          customerEmail: invoice.user.email,
          items: invoice.items?.map((item: any) => ({
            description: item.description || "Service",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || invoice.totalAmount
          })) || [{
            description: "Service de livraison",
            quantity: 1,
            unitPrice: invoice.totalAmount
          }],
          subtotal: invoice.subtotal || invoice.totalAmount,
          tax: invoice.taxAmount || 0,
          total: invoice.totalAmount,
          currency: "EUR",
          notes: invoice.notes || undefined
        });

        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          invoiceNumber: invoice.invoiceNumber,
          contentType: 'application/pdf'
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de la facture PDF"
        });
      }
    }),

  // Générer un rapport financier
  generateFinancialReportPdf: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
        period: z.object({
          startDate: z.date(),
          endDate: z.date()
        }),
        includeCharts: z.boolean().default(true),
        format: z.enum(["A4", "LETTER"]).default("A4")
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;

        // Vérifier les permissions
        if (user.role !== "ADMIN" && user.role !== "MERCHANT" && user.role !== "PROVIDER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions insuffisantes"
          });
        }

        // Récupérer les données financières pour la période
        const payments = await db.payment.findMany({
          where: {
            createdAt: {
              gte: input.period.startDate,
              lte: input.period.endDate
            },
            ...(user.role !== "ADMIN" && {
              userId: user.id
            })
          },
          include: {
            user: { include: { profile: true } }
          }
        });

        // Calculer les statistiques
        const totalAmount = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const totalPayments = payments.length;
        const successfulPayments = payments.filter((p: any) => p.status === "COMPLETED").length;

        // Générer le rapport PDF
        const pdfBuffer = await PdfService.generateReportPdf({
          title: `Rapport Financier - ${input.reportType}`,
          subtitle: `Période du ${input.period.startDate.toLocaleDateString()} au ${input.period.endDate.toLocaleDateString()}`,
          dateRange: input.period,
          summary: [
            { label: "Nombre total de paiements", value: totalPayments },
            { label: "Paiements réussis", value: successfulPayments },
            { label: "Montant total", value: `${totalAmount.toFixed(2)} €` },
            { label: "Montant moyen", value: totalPayments > 0 ? `${(totalAmount / totalPayments).toFixed(2)} €` : "0 €" }
          ],
          tables: [{
            title: "Détail des paiements",
            headers: ["Date", "Utilisateur", "Montant", "Statut"],
            rows: payments.slice(0, 20).map((p: any) => [
              p.createdAt.toLocaleDateString(),
              `${p.user.profile?.firstName || ''} ${p.user.profile?.lastName || ''}`.trim() || p.user.email,
              `${p.amount.toFixed(2)} €`,
              p.status
            ])
          }],
          notes: "Rapport généré automatiquement par EcoDeli"
        });

        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          reportType: input.reportType,
          period: input.period,
          contentType: 'application/pdf'
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport financier"
        });
      }
    }),

  // Générer un simple PDF de test
  generateTestPdf: protectedProcedure
    .input(
      z.object({
        title: z.string().default("Document de test"),
        content: z.string().default("Ceci est un document PDF de test généré par EcoDeli.")
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Utiliser le générateur de rapport pour créer un PDF simple
        const pdfBuffer = await PdfService.generateReportPdf({
          title: input.title,
          subtitle: "Document généré par EcoDeli",
          dateRange: {
            startDate: new Date(),
            endDate: new Date()
          },
          summary: [
            { label: "Type", value: "Document de test" },
            { label: "Généré par", value: ctx.session.user.email },
            { label: "Date", value: new Date().toLocaleDateString("fr-FR") }
          ],
          notes: input.content
        });

        return {
          success: true,
          pdf: pdfBuffer.toString('base64'),
          contentType: 'application/pdf'
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF de test"
        });
      }
    })
});
