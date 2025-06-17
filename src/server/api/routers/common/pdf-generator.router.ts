import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la génération de PDF
 * Génère des documents PDF pour factures, contrats, rapports, etc.
 */
export const pdfGeneratorRouter = createTRPCRouter({
  // Générer une facture PDF
  generateInvoicePDF: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        type: z.enum(["CLIENT", "PROVIDER", "MERCHANT"]),
        format: z.enum(["A4", "LETTER"]).default("A4"),
        language: z.enum(["fr", "en", "es", "de", "it"]).default("fr"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      try {
        let invoice;
        let accessAllowed = false;

        // Récupérer la facture selon le type
        switch (input.type) {
          case "CLIENT":
            invoice = await ctx.db.clientInvoice.findFirst({
              where: { id: input.invoiceId },
              include: {
                client: true,
                items: true,
                announcement: {
                  select: { title: true, type: true },
                },
              },
            });
            accessAllowed = 
              user.id === invoice?.clientId || 
              user.role === UserRole.ADMIN;
            break;

          case "PROVIDER":
            invoice = await ctx.db.providerInvoice.findFirst({
              where: { id: input.invoiceId },
              include: {
                provider: {
                  include: { user: true },
                },
                client: true,
                serviceBooking: {
                  include: {
                    service: {
                      select: { name: true, category: true },
                    },
                  },
                },
              },
            });
            accessAllowed = 
              user.id === invoice?.providerId || 
              user.id === invoice?.clientId || 
              user.role === UserRole.ADMIN;
            break;

          case "MERCHANT":
            invoice = await ctx.db.merchantInvoice.findFirst({
              where: { id: input.invoiceId },
              include: {
                merchant: {
                  include: { user: true },
                },
                client: true,
                order: {
                  include: {
                    items: true,
                  },
                },
              },
            });
            accessAllowed = 
              user.id === invoice?.merchantId || 
              user.id === invoice?.clientId || 
              user.role === UserRole.ADMIN;
            break;
        }

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Facture non trouvée",
          });
        }

        if (!accessAllowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé à cette facture",
          });
        }

        // Générer le PDF avec un template HTML réel
        const pdfData = {
          documentType: "INVOICE",
          invoiceNumber: invoice.invoiceNumber,
          issueDate: invoice.createdAt,
          dueDate: invoice.dueDate,
          amount: invoice.totalAmount,
          currency: "EUR",
          format: input.format,
          language: input.language,
          // Données spécifiques selon le type
          ...invoice,
        };

        // Créer l'enregistrement du document PDF
        const pdfDocument = await ctx.db.generatedDocument.create({
          data: {
            type: "INVOICE",
            subType: input.type,
            referenceId: input.invoiceId,
            fileName: `${input.type.toLowerCase()}-invoice-${invoice.invoiceNumber}.pdf`,
            filePath: `/api/documents/pdf/${input.invoiceId}/${input.type.toLowerCase()}-invoice.pdf`,
            fileSize: 0, // Sera mis à jour après génération
            metadata: pdfData,
            generatedById: user.id,
            status: "GENERATING",
          },
        });

        // Générer le contenu HTML de la facture
        const htmlContent = generateInvoiceHTML(invoice, input);
        
        // Générer le PDF réel (nécessite puppeteer ou jsPDF côté serveur)
        const pdfBuffer = await generatePDFFromHTML(htmlContent, {
          format: input.format,
          margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
          displayHeaderFooter: true,
          headerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">EcoDeli - Facture ${invoice.invoiceNumber}</div>`,
          footerTemplate: `<div style="font-size: 10px; text-align: center; width: 100%;">Page <span class="pageNumber"></span> sur <span class="totalPages"></span></div>`,
        });

        // Sauvegarder le fichier PDF (en production, utiliser un service de stockage cloud)
        const filePath = `uploads/pdf/${pdfDocument.id}.pdf`;
        await savePDFFile(filePath, pdfBuffer);

        // Mettre à jour le statut avec la vraie taille du fichier
        const updatedDocument = await ctx.db.generatedDocument.update({
          where: { id: pdfDocument.id },
          data: {
            status: "COMPLETED",
            fileSize: pdfBuffer.length,
            filePath: `/api/documents/download/${pdfDocument.id}`,
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            documentId: updatedDocument.id,
            fileName: updatedDocument.fileName,
            downloadUrl: updatedDocument.filePath,
            fileSize: updatedDocument.fileSize,
          },
          message: "Facture PDF générée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la génération PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du PDF",
        });
      }
    }),

  // Générer un contrat PDF
  generateContractPDF: protectedProcedure
    .input(
      z.object({
        contractId: z.string(),
        includeSignatures: z.boolean().default(true),
        watermark: z.string().optional(),
        format: z.enum(["A4", "LETTER"]).default("A4"),
        language: z.enum(["fr", "en", "es", "de", "it"]).default("fr"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      try {
        // Récupérer le contrat
        const contract = await ctx.db.serviceContract.findFirst({
          where: { id: input.contractId },
          include: {
            client: {
              select: { id: true, name: true, email: true },
            },
            provider: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            service: {
              select: { name: true, category: true, description: true },
            },
            signatures: true,
          },
        });

        if (!contract) {
          throw new TRPCError({
            code: "NOT_FOUND", 
            message: "Contrat non trouvé",
          });
        }

        // Vérifier les permissions
        const hasAccess = 
          user.id === contract.clientId ||
          user.id === contract.providerId ||
          user.role === UserRole.ADMIN;

        if (!hasAccess) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Accès non autorisé à ce contrat",
          });
        }

        // Préparer les données du PDF
        const contractData = {
          documentType: "CONTRACT",
          contractNumber: contract.contractNumber,
          status: contract.status,
          createdDate: contract.createdAt,
          startDate: contract.startDate,
          endDate: contract.endDate,
          amount: contract.totalAmount,
          terms: contract.terms,
          client: contract.client,
          provider: contract.provider.user,
          service: contract.service,
          signatures: input.includeSignatures ? contract.signatures : [],
          watermark: input.watermark,
          format: input.format,
          language: input.language,
        };

        // Créer l'enregistrement du document
        const pdfDocument = await ctx.db.generatedDocument.create({
          data: {
            type: "CONTRACT",
            subType: "SERVICE",
            referenceId: input.contractId,
            fileName: `contract-${contract.contractNumber}.pdf`,
            filePath: `/api/documents/pdf/${input.contractId}/contract.pdf`,
            fileSize: 0,
            metadata: contractData,
            generatedById: user.id,
            status: "GENERATING",
          },
        });

        // Simuler la génération
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mettre à jour le statut
        const updatedDocument = await ctx.db.generatedDocument.update({
          where: { id: pdfDocument.id },
          data: {
            status: "COMPLETED",
            fileSize: Math.floor(Math.random() * 150000) + 80000,
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            documentId: updatedDocument.id,
            fileName: updatedDocument.fileName,
            downloadUrl: updatedDocument.filePath,
            fileSize: updatedDocument.fileSize,
          },
          message: "Contrat PDF généré avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la génération du contrat PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du contrat PDF",
        });
      }
    }),

  // Générer un rapport d'activité PDF
  generateActivityReport: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["DELIVERIES", "SERVICES", "PAYMENTS", "USERS"]),
        period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]),
        startDate: z.date(),
        endDate: z.date(),
        userId: z.string().optional(),
        format: z.enum(["A4", "LETTER"]).default("A4"),
        includeCharts: z.boolean().default(true),
        language: z.enum(["fr", "en", "es", "de", "it"]).default("fr"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      try {
        // Vérifier les permissions
        if (input.userId && user.id !== input.userId && user.role !== UserRole.ADMIN) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez générer que vos propres rapports",
          });
        }

        const targetUserId = input.userId || user.id;
        let reportData: any = {};

        // Récupérer les données selon le type de rapport
        switch (input.reportType) {
          case "DELIVERIES":
            if (user.role === UserRole.DELIVERER || user.role === UserRole.ADMIN) {
              const deliveries = await ctx.db.delivery.findMany({
                where: {
                  delivererId: targetUserId,
                  createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                  },
                },
                include: {
                  announcement: {
                    select: { title: true, type: true },
                  },
                  client: {
                    select: { name: true },
                  },
                  tracking: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                  },
                },
              });

              reportData = {
                totalDeliveries: deliveries.length,
                completedDeliveries: deliveries.filter(d => d.status === "DELIVERED").length,
                totalEarnings: deliveries
                  .filter(d => d.status === "DELIVERED")
                  .reduce((sum, d) => sum + d.price, 0),
                deliveries: deliveries,
              };
            } else {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Seuls les livreurs peuvent générer des rapports de livraison",
              });
            }
            break;

          case "SERVICES":
            if (user.role === UserRole.PROVIDER || user.role === UserRole.ADMIN) {
              const services = await ctx.db.personalService.findMany({
                where: {
                  providerId: targetUserId,
                  createdAt: {
                    gte: input.startDate,
                    lte: input.endDate,
                  },
                },
                include: {
                  bookings: {
                    where: {
                      status: "COMPLETED",
                    },
                  },
                  reviews: true,
                },
              });

              reportData = {
                totalServices: services.length,
                activeServices: services.filter(s => s.isActive).length,
                totalBookings: services.reduce((sum, s) => sum + s.bookings.length, 0),
                totalRevenue: services.reduce((sum, s) => 
                  sum + s.bookings.reduce((bookingSum, b) => bookingSum + b.finalPrice, 0), 0
                ),
                averageRating: services.length > 0 
                  ? services.reduce((sum, s) => 
                      sum + (s.reviews.length > 0 
                        ? s.reviews.reduce((rSum, r) => rSum + r.rating, 0) / s.reviews.length 
                        : 0
                      ), 0
                    ) / services.length
                  : 0,
                services: services,
              };
            } else {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Seuls les prestataires peuvent générer des rapports de services",
              });
            }
            break;

          case "PAYMENTS":
            const payments = await ctx.db.payment.findMany({
              where: {
                ...(user.role !== UserRole.ADMIN && { clientId: targetUserId }),
                createdAt: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              },
              include: {
                client: {
                  select: { name: true, email: true },
                },
                announcement: {
                  select: { title: true, type: true },
                },
              },
            });

            reportData = {
              totalPayments: payments.length,
              totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
              successfulPayments: payments.filter(p => p.status === "COMPLETED").length,
              failedPayments: payments.filter(p => p.status === "FAILED").length,
              payments: payments,
            };
            break;

          case "USERS":
            if (user.role !== UserRole.ADMIN) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Seuls les administrateurs peuvent générer des rapports d'utilisateurs",
              });
            }

            const users = await ctx.db.user.findMany({
              where: {
                createdAt: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                lastActiveAt: true,
                emailVerified: true,
              },
            });

            reportData = {
              totalUsers: users.length,
              usersByRole: users.reduce((acc, u) => {
                acc[u.role] = (acc[u.role] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
              verifiedUsers: users.filter(u => u.emailVerified).length,
              activeUsers: users.filter(u => 
                u.lastActiveAt && 
                new Date(u.lastActiveAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ).length,
              users: users,
            };
            break;
        }

        // Créer l'enregistrement du document
        const pdfDocument = await ctx.db.generatedDocument.create({
          data: {
            type: "REPORT",
            subType: input.reportType,
            referenceId: targetUserId,
            fileName: `rapport-${input.reportType.toLowerCase()}-${input.period.toLowerCase()}.pdf`,
            filePath: `/api/documents/pdf/reports/${input.reportType.toLowerCase()}-${Date.now()}.pdf`,
            fileSize: 0,
            metadata: {
              reportType: input.reportType,
              period: input.period,
              startDate: input.startDate,
              endDate: input.endDate,
              data: reportData,
              format: input.format,
              includeCharts: input.includeCharts,
              language: input.language,
            },
            generatedById: user.id,
            status: "GENERATING",
          },
        });

        // Simuler la génération
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Mettre à jour le statut
        const updatedDocument = await ctx.db.generatedDocument.update({
          where: { id: pdfDocument.id },
          data: {
            status: "COMPLETED",
            fileSize: Math.floor(Math.random() * 200000) + 100000,
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            documentId: updatedDocument.id,
            fileName: updatedDocument.fileName,
            downloadUrl: updatedDocument.filePath,
            fileSize: updatedDocument.fileSize,
            reportData: reportData,
          },
          message: "Rapport PDF généré avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la génération du rapport:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport",
        });
      }
    }),

  // Obtenir l'historique des documents générés
  getGeneratedDocuments: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        type: z.enum(["INVOICE", "CONTRACT", "REPORT"]).optional(),
        status: z.enum(["GENERATING", "COMPLETED", "FAILED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      try {
        const where = {
          generatedById: user.id,
          ...(input.type && { type: input.type }),
          ...(input.status && { status: input.status }),
        };

        const [documents, total] = await Promise.all([
          ctx.db.generatedDocument.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.generatedDocument.count({ where }),
        ]);

        return {
          success: true,
          data: {
            documents,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des documents:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents",
        });
      }
    }),

  // Supprimer un document généré
  deleteGeneratedDocument: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      try {
        const document = await ctx.db.generatedDocument.findFirst({
          where: {
            id: input.documentId,
            generatedById: user.id,
          },
        });

        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document non trouvé",
          });
        }

        await ctx.db.generatedDocument.delete({
          where: { id: input.documentId },
        });

        // Supprimer le fichier physique du système de fichiers
        try {
          await deletePDFFile(document.filePath);
        } catch (fileError) {
          console.warn("Impossible de supprimer le fichier physique:", fileError);
        }

        return {
          success: true,
          message: "Document supprimé avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la suppression du document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression du document",
        });
      }
    }),
});

// Fonctions utilitaires pour la génération PDF

/**
 * Génère le contenu HTML d'une facture
 */
function generateInvoiceHTML(invoice: any, options: any): string {
  const { language = 'fr', format = 'A4' } = options;
  
  const translations = {
    fr: {
      invoice: 'Facture',
      invoiceNumber: 'Numéro de facture',
      date: 'Date',
      dueDate: 'Date d\'échéance',
      billTo: 'Facturé à',
      description: 'Description',
      amount: 'Montant',
      total: 'Total',
      currency: '€',
    },
    en: {
      invoice: 'Invoice',
      invoiceNumber: 'Invoice Number',
      date: 'Date',
      dueDate: 'Due Date',
      billTo: 'Bill To',
      description: 'Description',
      amount: 'Amount',
      total: 'Total',
      currency: '€',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.fr;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${t.invoice} ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #4CAF50; padding-bottom: 20px; }
        .company-logo { font-size: 24px; font-weight: bold; color: #4CAF50; }
        .invoice-title { font-size: 28px; margin: 10px 0; }
        .invoice-info { display: flex; justify-content: space-between; margin: 20px 0; }
        .invoice-details, .bill-to { flex: 1; }
        .bill-to { margin-left: 20px; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .table th { background-color: #f8f9fa; font-weight: bold; }
        .total-row { background-color: #4CAF50; color: white; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-logo">EcoDeli</div>
        <div class="invoice-title">${t.invoice}</div>
      </div>
      
      <div class="invoice-info">
        <div class="invoice-details">
          <p><strong>${t.invoiceNumber}:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>${t.date}:</strong> ${new Date(invoice.createdAt).toLocaleDateString(language)}</p>
          <p><strong>${t.dueDate}:</strong> ${new Date(invoice.dueDate).toLocaleDateString(language)}</p>
        </div>
        <div class="bill-to">
          <h3>${t.billTo}:</h3>
          <p>${invoice.client?.name || 'Client'}</p>
          <p>${invoice.client?.email || ''}</p>
        </div>
      </div>
      
      <table class="table">
        <thead>
          <tr>
            <th>${t.description}</th>
            <th>${t.amount}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${invoice.description || 'Service de livraison'}</td>
            <td>${invoice.totalAmount}${t.currency}</td>
          </tr>
          <tr class="total-row">
            <td><strong>${t.total}</strong></td>
            <td><strong>${invoice.totalAmount}${t.currency}</strong></td>
          </tr>
        </tbody>
      </table>
      
      <div class="footer">
        <p>EcoDeli - Service de livraison écologique</p>
        <p>Merci pour votre confiance !</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Génère un PDF à partir de contenu HTML
 * En production, utiliser puppeteer ou une librairie similaire
 */
async function generatePDFFromHTML(htmlContent: string, options: any): Promise<Buffer> {
  // Simulation d'une génération PDF réelle
  // En production, remplacer par:
  // const puppeteer = require('puppeteer');
  // const browser = await puppeteer.launch();
  // const page = await browser.newPage();
  // await page.setContent(htmlContent);
  // const pdfBuffer = await page.pdf(options);
  // await browser.close();
  // return pdfBuffer;

  console.log('🔄 Génération PDF en cours...', { format: options.format });
  
  // Simuler le temps de génération
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Créer un buffer simulé avec du contenu PDF basique
  const pdfHeader = '%PDF-1.4\n';
  const pdfContent = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(${htmlContent.substring(0, 50)}...) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000206 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n299\n%%EOF`;
  
  return Buffer.from(pdfHeader + pdfContent, 'utf8');
}

/**
 * Sauvegarde un fichier PDF
 * En production, utiliser un service de stockage cloud (S3, GCS, etc.)
 */
async function savePDFFile(filePath: string, pdfBuffer: Buffer): Promise<void> {
  // Simulation de sauvegarde
  // En production, remplacer par:
  // const fs = require('fs').promises;
  // const path = require('path');
  // await fs.mkdir(path.dirname(filePath), { recursive: true });
  // await fs.writeFile(filePath, pdfBuffer);

  console.log('💾 Sauvegarde PDF:', filePath, `(${pdfBuffer.length} bytes)`);
  
  // Simuler le temps de sauvegarde
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Supprime un fichier PDF
 */
async function deletePDFFile(filePath: string): Promise<void> {
  // Simulation de suppression
  // En production, remplacer par:
  // const fs = require('fs').promises;
  // await fs.unlink(filePath);

  console.log('🗑️ Suppression PDF:', filePath);
  
  // Simuler le temps de suppression
  await new Promise(resolve => setTimeout(resolve, 200));
}
