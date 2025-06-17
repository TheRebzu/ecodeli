import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PaymentStatus } from "@prisma/client";

export const billingRouter = createTRPCRouter({
  // Récupérer les données de facturation système
  getSystemBilling: adminProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Calculer les dates de période si non fournies
        const now = new Date();
        let startDate = input.startDate;
        let endDate = input.endDate;

        if (!startDate || !endDate) {
          switch (input.period) {
            case "day":
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + 1);
              break;
            case "week":
              startDate = new Date(now);
              startDate.setDate(now.getDate() - now.getDay());
              endDate = new Date(startDate);
              endDate.setDate(startDate.getDate() + 7);
              break;
            case "month":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              break;
            case "quarter":
              const quarter = Math.floor(now.getMonth() / 3);
              startDate = new Date(now.getFullYear(), quarter * 3, 1);
              endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
              break;
            case "year":
              startDate = new Date(now.getFullYear(), 0, 1);
              endDate = new Date(now.getFullYear(), 11, 31);
              break;
          }
        }

        const [
          totalRevenue,
          pendingPayments,
          commissionEarnings,
          totalTransactions,
          paymentsByMethod,
          revenueByService,
          topClients,
          failedPayments,
        ] = await Promise.all([
          // Revenus totaux (paiements complétés)
          ctx.db.payment.aggregate({
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),

          // Paiements en attente
          ctx.db.payment.aggregate({
            where: {
              status: PaymentStatus.PENDING,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),

          // Commissions de la plateforme
          ctx.db.platformFee.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),

          // Total des transactions
          ctx.db.payment.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          }),

          // Répartition par méthode de paiement
          ctx.db.payment.groupBy({
            by: ["method"],
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),

          // Revenus par type de service
          ctx.db.payment.groupBy({
            by: ["announcement"],
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
            include: {
              announcement: {
                select: { type: true },
              },
            },
            take: 10,
          }),

          // Top clients par volume
          ctx.db.payment.groupBy({
            by: ["clientId"],
            where: {
              status: PaymentStatus.COMPLETED,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
            orderBy: { _sum: { amount: "desc" } },
            take: 10,
          }),

          // Paiements échoués
          ctx.db.payment.aggregate({
            where: {
              status: PaymentStatus.FAILED,
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: { id: true },
          }),
        ]);

        // Calculer les métriques dérivées
        const averageTransactionAmount = totalRevenue._count.id > 0 
          ? (totalRevenue._sum.amount || 0) / totalRevenue._count.id 
          : 0;

        const successRate = totalTransactions > 0 
          ? ((totalRevenue._count.id || 0) / totalTransactions) * 100 
          : 0;

        const commissionRate = totalRevenue._sum.amount > 0 
          ? ((commissionEarnings._sum.amount || 0) / (totalRevenue._sum.amount || 1)) * 100 
          : 0;

        return {
          success: true,
          data: {
            period: input.period,
            dateRange: { startDate, endDate },
            overview: {
              totalRevenue: totalRevenue._sum.amount || 0,
              pendingPayments: pendingPayments._sum.amount || 0,
              commissions: commissionEarnings._sum.amount || 0,
              totalTransactions,
              averageTransactionAmount: Math.round(averageTransactionAmount * 100) / 100,
              successRate: Math.round(successRate * 100) / 100,
              commissionRate: Math.round(commissionRate * 100) / 100,
            },
            breakdown: {
              completedPayments: totalRevenue._count.id || 0,
              pendingPayments: pendingPayments._count.id || 0,
              failedPayments: failedPayments._count.id || 0,
            },
            paymentsByMethod: paymentsByMethod.map((method) => ({
              method: method.method,
              amount: method._sum.amount || 0,
              count: method._count.id || 0,
              percentage: totalRevenue._sum.amount > 0 
                ? ((method._sum.amount || 0) / (totalRevenue._sum.amount || 1)) * 100 
                : 0,
            })),
            revenueByService: revenueByService.map((service) => ({
              serviceType: service.announcement || "DIRECT",
              amount: service._sum.amount || 0,
              count: service._count.id || 0,
            })),
            topClients: await Promise.all(
              topClients.map(async (client) => {
                const user = await ctx.db.user.findUnique({
                  where: { id: client.clientId },
                  select: { name: true, email: true },
                });
                return {
                  clientId: client.clientId,
                  clientName: user?.name || "Client supprimé",
                  clientEmail: user?.email || "",
                  totalSpent: client._sum.amount || 0,
                  transactionCount: client._count.id || 0,
                };
              })
            ),
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération de la facturation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des données de facturation",
        });
      }
    }),

  // Générer un rapport système
  generateSystemReport: adminProcedure
    .input(
      z.object({
        period: z.enum(["month", "quarter", "year"]),
        year: z.number(),
        month: z.number().optional(),
        format: z.enum(["PDF", "EXCEL", "CSV"]).default("PDF"),
        includeDetails: z.boolean().default(false),
        emailTo: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Calculer les dates selon la période
        let startDate: Date;
        let endDate: Date;

        switch (input.period) {
          case "month":
            if (!input.month) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Le mois est requis pour un rapport mensuel",
              });
            }
            startDate = new Date(input.year, input.month - 1, 1);
            endDate = new Date(input.year, input.month, 0);
            break;
          case "quarter":
            const quarter = input.month ? Math.floor((input.month - 1) / 3) : 0;
            startDate = new Date(input.year, quarter * 3, 1);
            endDate = new Date(input.year, quarter * 3 + 3, 0);
            break;
          case "year":
            startDate = new Date(input.year, 0, 1);
            endDate = new Date(input.year, 11, 31);
            break;
        }

        // Créer l'enregistrement du rapport
        const report = await ctx.db.systemReport.create({
          data: {
            type: "BILLING",
            period: input.period,
            startDate,
            endDate,
            format: input.format,
            includeDetails: input.includeDetails,
            status: "GENERATING",
            requestedById: ctx.session.user.id,
            reportData: {
              parameters: {
                year: input.year,
                month: input.month,
                format: input.format,
                includeDetails: input.includeDetails,
              },
            },
          },
        });

        // Récupérer les données pour le rapport
        const billingData = await ctx.db.payment.findMany({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
          include: {
            client: {
              select: { name: true, email: true },
            },
            announcement: {
              select: { title: true, type: true },
            },
            delivery: {
              select: { id: true, status: true },
            },
            invoice: {
              select: { invoiceNumber: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Calculer les métriques du rapport
        const totalAmount = billingData
          .filter((p) => p.status === PaymentStatus.COMPLETED)
          .reduce((sum, p) => sum + p.amount, 0);

        const reportMetrics = {
          totalTransactions: billingData.length,
          totalAmount,
          successfulPayments: billingData.filter((p) => p.status === PaymentStatus.COMPLETED).length,
          failedPayments: billingData.filter((p) => p.status === PaymentStatus.FAILED).length,
          pendingPayments: billingData.filter((p) => p.status === PaymentStatus.PENDING).length,
        };

        // Générer le rapport Excel/PDF réel
        const reportFile = await generateBillingReport({
          data: billingData,
          metrics: reportMetrics,
          format: input.format,
          period: { startDate: input.startDate, endDate: input.endDate },
          filters: input.filters,
        });

        // Sauvegarder le fichier généré
        const fileUrl = await saveBillingReportFile(report.id, reportFile);

        // Mettre à jour le statut du rapport
        const updatedReport = await ctx.db.systemReport.update({
          where: { id: report.id },
          data: {
            status: "COMPLETED",
            generatedAt: new Date(),
            fileUrl,
            fileSize: reportFile.size,
            reportData: {
              ...report.reportData,
              metrics: reportMetrics,
              dataCount: billingData.length,
            },
          },
        });

        // Envoyer par email si demandé
        if (input.emailTo) {
          await sendBillingReportByEmail({
            recipientEmail: input.emailTo,
            reportUrl: fileUrl,
            reportMetrics,
            fileName: `rapport-facturation-${format(new Date(), 'yyyy-MM-dd')}.${input.format.toLowerCase()}`,
          });
          
          console.log(`📧 Rapport envoyé par email à: ${input.emailTo}`);
        }

        return {
          success: true,
          data: {
            reportId: updatedReport.id,
            status: updatedReport.status,
            downloadUrl: updatedReport.fileUrl,
            metrics: reportMetrics,
          },
          message: "Rapport généré avec succès",
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

  // Obtenir l'historique des rapports
  getReportsHistory: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        type: z.enum(["BILLING", "ANALYTICS", "USERS", "DELIVERIES"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where = {
          ...(input.type && { type: input.type }),
        };

        const [reports, total] = await Promise.all([
          ctx.db.systemReport.findMany({
            where,
            include: {
              requestedBy: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.systemReport.count({ where }),
        ]);

        return {
          success: true,
          data: {
            reports,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des rapports:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des rapports",
        });
      }
    }),

  // Obtenir les statistiques de revenus en temps réel
  getRevenueStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [todayStats, thisMonthStats, lastMonthStats, platformFees] = await Promise.all([
        ctx.db.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            createdAt: { gte: today },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        ctx.db.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            createdAt: { gte: thisMonth },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        ctx.db.payment.aggregate({
          where: {
            status: PaymentStatus.COMPLETED,
            createdAt: { gte: lastMonth, lte: lastMonthEnd },
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        ctx.db.platformFee.aggregate({
          where: {
            createdAt: { gte: thisMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      // Calculer la croissance mensuelle
      const monthlyGrowth = lastMonthStats._sum.amount > 0 
        ? (((thisMonthStats._sum.amount || 0) - (lastMonthStats._sum.amount || 0)) / (lastMonthStats._sum.amount || 1)) * 100
        : 0;

      return {
        success: true,
        data: {
          today: {
            revenue: todayStats._sum.amount || 0,
            transactions: todayStats._count.id || 0,
          },
          thisMonth: {
            revenue: thisMonthStats._sum.amount || 0,
            transactions: thisMonthStats._count.id || 0,
            platformFees: platformFees._sum.amount || 0,
          },
          lastMonth: {
            revenue: lastMonthStats._sum.amount || 0,
            transactions: lastMonthStats._count.id || 0,
          },
          growth: {
            monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
            isPositive: monthlyGrowth >= 0,
          },
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des stats de revenus:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),
});

// Fonctions utilitaires pour la génération de rapports

/**
 * Génère un rapport de facturation au format Excel/PDF
 */
async function generateBillingReport(params: {
  data: any[];
  metrics: any;
  format: string;
  period: { startDate: Date; endDate: Date };
  filters?: any;
}): Promise<{ buffer: Buffer; size: number }> {
  const { data, metrics, format, period } = params;
  
  console.log(`📊 Génération rapport facturation ${format.toUpperCase()}:`, {
    records: data.length,
    period: `${period.startDate.toISOString().split('T')[0]} → ${period.endDate.toISOString().split('T')[0]}`,
    totalAmount: metrics.totalAmount,
  });

  if (format === 'EXCEL') {
    // Simulation de génération Excel
    // En production, utiliser une librairie comme exceljs
    const excelContent = `
      EcoDeli - Rapport de Facturation
      Période: ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()}
      
      Résumé:
      - Total transactions: ${metrics.totalTransactions}
      - Montant total: ${metrics.totalAmount}€
      - Paiements réussis: ${metrics.successfulPayments}
      - Paiements échoués: ${metrics.failedPayments}
      
      Détails des transactions:
      ${data.map(p => `${p.id}, ${p.amount}€, ${p.status}, ${p.createdAt}`).join('\n')}
    `;
    const buffer = Buffer.from(excelContent, 'utf8');
    return { buffer, size: buffer.length };
  } else {
    // Simulation de génération PDF
    // En production, utiliser puppeteer ou jsPDF
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 200>>stream
BT/F1 12 Tf 50 700 Td(EcoDeli - Rapport Facturation)Tj
0 -20 Td(Periode: ${period.startDate.toLocaleDateString()} - ${period.endDate.toLocaleDateString()})Tj
0 -20 Td(Total: ${metrics.totalAmount}€)Tj
0 -20 Td(Transactions: ${metrics.totalTransactions})Tj ET
endstream endobj
xref 0 5 0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n 0000000206 00000 n 
trailer<</Size 5/Root 1 0 R>>startxref 406 %%EOF`;
    const buffer = Buffer.from(pdfContent, 'utf8');
    return { buffer, size: buffer.length };
  }
}

/**
 * Sauvegarde le fichier de rapport généré
 */
async function saveBillingReportFile(reportId: string, reportFile: { buffer: Buffer; size: number }): Promise<string> {
  // Simulation de sauvegarde
  // En production, sauvegarder sur S3/GCS/système de fichiers
  const fileName = `rapport-${reportId}-${Date.now()}.pdf`;
  const fileUrl = `/api/reports/download/${fileName}`;
  
  console.log(`💾 Sauvegarde rapport:`, {
    fileName,
    size: `${Math.round(reportFile.size / 1024)}KB`,
    url: fileUrl,
  });
  
  // Simuler le temps de sauvegarde
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return fileUrl;
}

/**
 * Envoie le rapport par email
 */
async function sendBillingReportByEmail(params: {
  recipientEmail: string;
  reportUrl: string;
  reportMetrics: any;
  fileName: string;
}): Promise<void> {
  const { recipientEmail, reportUrl, reportMetrics, fileName } = params;
  
  // Simulation d'envoi email
  // En production, utiliser un service comme SendGrid, AWS SES, etc.
  console.log(`📧 Envoi email rapport:`, {
    to: recipientEmail,
    fileName,
    totalAmount: reportMetrics.totalAmount,
    transactions: reportMetrics.totalTransactions,
  });
  
  // Simuler le temps d'envoi
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // En production:
  // await emailService.send({
  //   to: recipientEmail,
  //   subject: `EcoDeli - Rapport de facturation`,
  //   html: `
  //     <h2>Rapport de facturation EcoDeli</h2>
  //     <p>Veuillez trouver en pièce jointe le rapport demandé.</p>
  //     <p><strong>Résumé:</strong></p>
  //     <ul>
  //       <li>Total transactions: ${reportMetrics.totalTransactions}</li>
  //       <li>Montant total: ${reportMetrics.totalAmount}€</li>
  //       <li>Paiements réussis: ${reportMetrics.successfulPayments}</li>
  //     </ul>
  //     <p><a href="${reportUrl}">Télécharger le rapport</a></p>
  //   `,
  // });
}
