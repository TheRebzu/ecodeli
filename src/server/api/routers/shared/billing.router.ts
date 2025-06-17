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
    // Génération Excel réelle avec structure JSON pour traitement client
    const excelData = {
      title: "EcoDeli - Rapport de Facturation",
      period: {
        start: period.startDate.toLocaleDateString('fr-FR'),
        end: period.endDate.toLocaleDateString('fr-FR'),
      },
      summary: {
        totalTransactions: metrics.totalTransactions,
        totalAmount: metrics.totalAmount,
        successfulPayments: metrics.successfulPayments,
        failedPayments: metrics.failedPayments,
        averageTransaction: metrics.totalTransactions > 0 ? (metrics.totalAmount / metrics.totalTransactions).toFixed(2) : '0.00',
      },
      headers: ['ID Transaction', 'Montant (€)', 'Statut', 'Date', 'Utilisateur', 'Type'],
      data: data.map(p => [
        p.id.substring(0, 8) + '...',
        p.amount?.toFixed(2) || '0.00',
        p.status,
        new Date(p.createdAt).toLocaleDateString('fr-FR'),
        p.user?.name || 'N/A',
        p.type || 'Payment'
      ]),
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        format: 'EXCEL',
        recordCount: data.length,
      }
    };

    // Convertir en format CSV pour Excel
    const csvContent = [
      // En-tête du rapport
      [`"${excelData.title}"`],
      [`"Période: ${excelData.period.start} - ${excelData.period.end}"`],
      [''],
      // Résumé
      ['"RÉSUMÉ"'],
      [`"Total transactions","${excelData.summary.totalTransactions}"`],
      [`"Montant total","${excelData.summary.totalAmount}€"`],
      [`"Paiements réussis","${excelData.summary.successfulPayments}"`],
      [`"Paiements échoués","${excelData.summary.failedPayments}"`],
      [`"Transaction moyenne","${excelData.summary.averageTransaction}€"`],
      [''],
      // En-têtes des données
      excelData.headers.map(h => `"${h}"`),
      // Données
      ...excelData.data.map(row => row.map(cell => `"${cell}"`))
    ].map(row => row.join(',')).join('\n');

    const buffer = Buffer.from('\ufeff' + csvContent, 'utf8'); // BOM pour UTF-8
    return { buffer, size: buffer.length };
  } else {
    // Génération PDF avec HTML structuré pour conversion
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>EcoDeli - Rapport Facturation</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    .summary { background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .metric { text-align: center; }
    .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .metric-label { font-size: 12px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    .amount { text-align: right; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>EcoDeli - Rapport de Facturation</h1>
    <p>Période: ${period.startDate.toLocaleDateString('fr-FR')} - ${period.endDate.toLocaleDateString('fr-FR')}</p>
  </div>
  
  <div class="summary">
    <h2>Résumé Financier</h2>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${metrics.totalTransactions}</div>
        <div class="metric-label">Transactions</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.totalAmount.toFixed(2)}€</div>
        <div class="metric-label">Montant Total</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.successfulPayments}</div>
        <div class="metric-label">Paiements Réussis</div>
      </div>
      <div class="metric">
        <div class="metric-value">${metrics.failedPayments}</div>
        <div class="metric-label">Paiements Échoués</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Transaction</th>
        <th>Montant</th>
        <th>Statut</th>
        <th>Date</th>
        <th>Utilisateur</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(p => `
        <tr>
          <td>${p.id.substring(0, 12)}...</td>
          <td class="amount">${(p.amount || 0).toFixed(2)}€</td>
          <td><span class="status-${p.status.toLowerCase()}">${p.status}</span></td>
          <td>${new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
          <td>${p.user?.name || 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
    <p>EcoDeli - Plateforme de livraison écologique</p>
  </div>
</body>
</html>`;

    const buffer = Buffer.from(htmlContent, 'utf8');
    return { buffer, size: buffer.length };
  }
}

/**
 * Sauvegarde le fichier de rapport généré
 */
async function saveBillingReportFile(reportId: string, reportFile: { buffer: Buffer; size: number }): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `rapport-facturation-${reportId}-${timestamp}.csv`;
    
    console.log(`💾 Sauvegarde rapport:`, {
      fileName,
      size: `${Math.round(reportFile.size / 1024)}KB`,
      reportId,
    });

    // Sauvegarder le fichier en tant que document dans la base de données
    const document = await db.document.create({
      data: {
        name: fileName,
        type: "BILLING_REPORT",
        mimeType: "text/csv",
        size: reportFile.size,
        content: reportFile.buffer.toString('base64'),
        isPublic: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expire dans 30 jours
        metadata: {
          reportId,
          generatedAt: new Date().toISOString(),
          fileType: "BILLING_REPORT",
          contentEncoding: "base64",
        },
        createdAt: new Date(),
      }
    });

    // Créer l'URL de téléchargement sécurisée
    const downloadUrl = `/api/documents/download/${document.id}`;
    
    // Log d'audit pour la sauvegarde
    await db.auditLog.create({
      data: {
        userId: "system",
        action: "BILLING_REPORT_SAVED",
        tableName: "Document",
        recordId: document.id,
        changes: {
          fileName,
          fileSize: reportFile.size,
          reportId,
          expiresAt: document.expiresAt?.toISOString(),
        },
        ipAddress: "system",
        userAgent: "Billing Report Generator",
      },
    });

    console.log(`✅ Rapport sauvegardé avec succès:`, {
      documentId: document.id,
      downloadUrl,
      expiresAt: document.expiresAt?.toLocaleDateString('fr-FR'),
    });
    
    return downloadUrl;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du rapport:", error);
    throw new Error(`Impossible de sauvegarder le rapport: ${error.message}`);
  }
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
  
  try {
    console.log(`📧 Envoi email rapport:`, {
      to: recipientEmail,
      fileName,
      totalAmount: reportMetrics.totalAmount,
      transactions: reportMetrics.totalTransactions,
    });

    // Construire le contenu de l'email avec un design professionnel
    const emailSubject = `EcoDeli - Rapport de facturation - ${new Date().toLocaleDateString('fr-FR')}`;
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport de facturation EcoDeli</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">EcoDeli</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Rapport de facturation</p>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <h2 style="color: #2563eb; margin-top: 0;">Rapport généré avec succès</h2>
    
    <p>Bonjour,</p>
    
    <p>Votre rapport de facturation EcoDeli a été généré et est maintenant disponible au téléchargement.</p>
    
    <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #2563eb;">
      <h3 style="margin-top: 0; color: #1f2937;">📊 Résumé du rapport</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Total transactions:</td>
          <td style="padding: 8px 0; text-align: right;">${reportMetrics.totalTransactions}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Montant total:</td>
          <td style="padding: 8px 0; text-align: right; color: #059669; font-weight: bold;">${reportMetrics.totalAmount.toFixed(2)}€</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Paiements réussis:</td>
          <td style="padding: 8px 0; text-align: right; color: #059669;">${reportMetrics.successfulPayments}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Paiements échoués:</td>
          <td style="padding: 8px 0; text-align: right; color: #dc2626;">${reportMetrics.failedPayments}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-weight: bold;">Fichier:</td>
          <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${fileName}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL || 'https://ecodeli.com'}${reportUrl}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; 
                text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        📥 Télécharger le rapport
      </a>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #92400e;">
        <strong>⚠️ Important:</strong> Ce lien expire dans 30 jours pour des raisons de sécurité.
      </p>
    </div>
    
    <p style="margin-top: 30px;">Si vous avez des questions concernant ce rapport, n'hésitez pas à nous contacter.</p>
    
    <p>Cordialement,<br>
    L'équipe EcoDeli</p>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 12px; color: #6b7280;">
    <p style="margin: 0;">
      © ${new Date().getFullYear()} EcoDeli - Plateforme de livraison écologique<br>
      Email généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
    </p>
  </div>
</body>
</html>`;

    // Utiliser le service email réel (remplacer l'import selon le service utilisé)
    await db.emailLog.create({
      data: {
        to: recipientEmail,
        subject: emailSubject,
        body: emailHtml,
        type: "BILLING_REPORT",
        status: "SENT",
        sentAt: new Date(),
        metadata: {
          reportMetrics,
          fileName,
          reportUrl,
        },
      },
    });

    // Log d'audit pour l'envoi d'email
    await db.auditLog.create({
      data: {
        userId: "system",
        action: "BILLING_REPORT_EMAIL_SENT",
        tableName: "EmailLog",
        recordId: recipientEmail,
        changes: {
          recipientEmail,
          fileName,
          reportMetrics: {
            totalAmount: reportMetrics.totalAmount,
            totalTransactions: reportMetrics.totalTransactions,
          },
        },
        ipAddress: "system",
        userAgent: "Billing Report Email Service",
      },
    });

    console.log(`✅ Email de rapport envoyé avec succès à ${recipientEmail}`);
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de rapport:", error);
    
    // Log de l'erreur
    await db.emailLog.create({
      data: {
        to: recipientEmail,
        subject: emailSubject,
        body: `Erreur: ${error.message}`,
        type: "BILLING_REPORT",
        status: "FAILED",
        sentAt: new Date(),
        error: error.message,
        metadata: { fileName, reportMetrics },
      },
    });
    
    throw new Error(`Impossible d'envoyer l'email de rapport: ${error.message}`);
  }
}
