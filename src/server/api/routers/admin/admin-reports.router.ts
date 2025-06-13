import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la g�n�ration de rapports administratifs
 * Rapports complets de performance, financiers et op�rationnels selon le cahier des charges
 */

// Sch�mas de validation
const reportFiltersSchema = z.object({
  type: z.enum([
    "FINANCIAL",
    "OPERATIONAL",
    "USER_ACTIVITY",
    "DELIVERY_PERFORMANCE",
    "PLATFORM_HEALTH",
  ]),
  period: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Filtres sp�cifiques
  userRole: z.nativeEnum(UserRole).optional(),
  city: z.string().optional(),
  serviceCategory: z.string().optional(),

  // Groupement et granularit�
  groupBy: z.enum(["day", "week", "month", "quarter"]).default("day"),
  includeComparison: z.boolean().default(false),
  includeProjections: z.boolean().default(false),

  // Format d'export
  format: z.enum(["JSON", "CSV", "EXCEL", "PDF"]).default("JSON"),
});

const customReportSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),

  // Configuration du rapport
  metrics: z.array(z.string()).min(1),
  dimensions: z.array(z.string()),
  filters: z.record(z.any()),

  // Param�tres de g�n�ration
  schedule: z.enum(["MANUAL", "DAILY", "WEEKLY", "MONTHLY"]).default("MANUAL"),
  recipients: z.array(z.string().email()).optional(),

  // Visualisation
  chartTypes: z.array(z.enum(["LINE", "BAR", "PIE", "TABLE"])),
  includeRawData: z.boolean().default(false),
});

const reportExportSchema = z.object({
  reportId: z.string().cuid(),
  format: z.enum(["CSV", "EXCEL", "PDF"]),
  includeCharts: z.boolean().default(true),
  includeRawData: z.boolean().default(false),
  compression: z.boolean().default(false),
});

export const adminReportsRouter = router({
  /**
   * G�n�rer un rapport financier d�taill�
   */
  generateFinancialReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({
        type: z.literal("FINANCIAL"),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent g�n�rer des rapports",
        });
      }

      try {
        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculateReportPeriod(
            input.period,
            input.startDate,
            input.endDate,
            input.includeComparison,
          );

        // M�triques financi�res principales
        const [
          revenue,
          commissions,
          withdrawals,
          activeSubscriptions,
          transactionVolume,
          averageOrderValue,
          paymentMethods,
          refunds,
        ] = await Promise.all([
          // Revenus totaux
          _ctx.db.payment.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Commissions par r�le
          ctx.db.commission.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Retraits effectu�s
          ctx.db.withdrawal.aggregate({
            where: {
              status: "COMPLETED",
              processedAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Abonnements actifs
          ctx.db.subscription.count({
            where: {
              status: "ACTIVE",
              startDate: { lte: endDate },
              OR: [{ endDate: null }, { endDate: { gte: startDate } }],
            },
          }),

          // Volume de transactions par jour
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, created_at) as period,
              COUNT(*)::int as transaction_count,
              COALESCE(SUM(amount), 0)::float as total_amount,
              AVG(amount)::float as avg_amount
            FROM payments 
            WHERE status = 'COMPLETED'
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, created_at)
            ORDER BY period ASC
          `,

          // Valeur moyenne des commandes
          ctx.db.order.aggregate({
            where: {
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate },
            },
            _avg: { totalAmount: true },
            _sum: { totalAmount: true },
            _count: true,
          }),

          // R�partition par m�thode de paiement
          ctx.db.payment.groupBy({
            by: ["method"],
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),

          // Remboursements
          ctx.db.refund.aggregate({
            where: {
              status: "COMPLETED",
              processedAt: { gte: startDate, lte: endDate },
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        // Comparaison avec la p�riode pr�c�dente si demand�e
        const comparison = null;
        if (input.includeComparison && previousStartDate && previousEndDate) {
          const previousRevenue = await ctx.db.payment.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: { gte: previousStartDate, lte: previousEndDate },
            },
            _sum: { amount: true },
          });

          comparison = {
            revenueGrowth: calculateGrowthRate(
              revenue._sum.amount || 0,
              previousRevenue._sum.amount || 0,
            ),
          };
        }

        // M�triques cl�s
        const netRevenue =
          (revenue._sum.amount || 0) - (refunds._sum.amount || 0);
        const conversionRate =
          revenue._count > 0
            ? (revenue._count / transactionVolume.length) * 100
            : 0;

        return {
          success: true,
          data: {
            period: {
              startDate,
              endDate,
              type: input.period,
            },
            overview: {
              totalRevenue: revenue._sum.amount || 0,
              netRevenue,
              totalCommissions: commissions._sum.amount || 0,
              totalWithdrawals: withdrawals._sum.amount || 0,
              activeSubscriptions,
              transactionCount: revenue._count,
              averageOrderValue: averageOrderValue._avg.totalAmount || 0,
              refundRate:
                revenue._count > 0
                  ? (refunds._count / revenue._count) * 100
                  : 0,
            },
            breakdown: {
              byPaymentMethod: paymentMethods.map((method) => ({
                method: method.method,
                amount: method._sum.amount || 0,
                count: method._count,
                percentage: revenue._sum.amount
                  ? ((method._sum.amount || 0) / (revenue._sum.amount || 1)) *
                    100
                  : 0,
              })),
              timeline: transactionVolume,
            },
            comparison,
            insights: generateFinancialInsights({
              revenue: revenue._sum.amount || 0,
              growth: comparison?.revenueGrowth || 0,
              transactionCount: revenue._count,
              averageOrder: averageOrderValue._avg.totalAmount || 0,
            }),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la g�n�ration du rapport financier",
        });
      }
    }),

  /**
   * G�n�rer un rapport de performance des livraisons
   */
  generateDeliveryPerformanceReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({
        type: z.literal("DELIVERY_PERFORMANCE"),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent g�n�rer des rapports",
        });
      }

      try {
        const { startDate: _startDate, endDate: _endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          deliveryStats,
          delivererPerformance,
          geographicData,
          timeMetrics,
          issueStats,
        ] = await Promise.all([
          // Statistiques g�n�rales des livraisons
          _ctx.db.delivery.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              ...(input.city && {
                pickupAddress: { contains: input.city, mode: "insensitive" },
              }),
            },
            _count: {
              id: true,
              completedAt: true,
            },
            _avg: {
              distance: true,
              actualDeliveryTime: true,
            },
          }),

          // Performance par livreur
          ctx.db.delivery.groupBy({
            by: ["delivererId"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "DELIVERED",
            },
            _count: true,
            _avg: {
              actualDeliveryTime: true,
              customerRating: true,
            },
            orderBy: { _count: { id: "desc" } },
            take: 20,
          }),

          // Donn�es g�ographiques
          ctx.db.delivery.groupBy({
            by: ["pickupCity", "deliveryCity"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
            _avg: { distance: true },
          }),

          // M�triques temporelles
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, created_at) as period,
              COUNT(*)::int as total_deliveries,
              COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int as completed,
              COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as cancelled,
              AVG(actual_delivery_time)::float as avg_delivery_time,
              AVG(customer_rating)::float as avg_rating
            FROM deliveries 
            WHERE created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, created_at)
            ORDER BY period ASC
          `,

          // Statistiques des probl�mes
          ctx.db.deliveryIssue.groupBy({
            by: ["issueType"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
          }),
        ]);

        // Enrichir les donn�es des livreurs
        const enrichedDelivererData = await Promise.all(
          delivererPerformance.map(async (perf) => {
            const deliverer = await ctx.db.deliverer.findUnique({
              where: { id: perf.delivererId },
              include: {
                user: {
                  select: { name: true, city: true },
                },
              },
            });

            return {
              ...perf,
              deliverer: deliverer?.user || null,
              efficiency: calculateDelivererEfficiency(perf),
              rank: 0, // Sera calcul� apr�s tri
            };
          }),
        );

        // Calculer les rangs
        enrichedDelivererData.sort((a, b) => b.efficiency - a.efficiency);
        enrichedDelivererData.forEach((item, index) => {
          item.rank = index + 1;
        });

        const completionRate =
          deliveryStats._count.id > 0
            ? (deliveryStats._count.completedAt / deliveryStats._count.id) * 100
            : 0;

        return {
          success: true,
          data: {
            period: { startDate, endDate, type: input.period },
            overview: {
              totalDeliveries: deliveryStats._count.id,
              completedDeliveries: deliveryStats._count.completedAt,
              completionRate,
              averageDistance: deliveryStats._avg.distance || 0,
              averageDeliveryTime: deliveryStats._avg.actualDeliveryTime || 0,
              totalIssues: issueStats.reduce(
                (sum, issue) => sum + issue._count,
                0,
              ),
            },
            performance: {
              topDeliverers: enrichedDelivererData.slice(0, 10),
              geographicBreakdown: geographicData.map((geo) => ({
                route: `${geo.pickupCity} � ${geo.deliveryCity}`,
                count: geo._count,
                avgDistance: geo._avg.distance,
              })),
              timeline: timeMetrics,
              issueBreakdown: issueStats.map((issue) => ({
                type: issue.issueType,
                count: issue._count,
                percentage:
                  deliveryStats._count.id > 0
                    ? (issue._count / deliveryStats._count.id) * 100
                    : 0,
              })),
            },
            insights: generateDeliveryInsights({
              completionRate,
              avgDeliveryTime: deliveryStats._avg.actualDeliveryTime || 0,
              issueCount: issueStats.reduce(
                (sum, issue) => sum + issue._count,
                0,
              ),
              totalDeliveries: deliveryStats._count.id,
            }),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la g�n�ration du rapport de livraisons",
        });
      }
    }),

  /**
   * G�n�rer un rapport d'activit� utilisateurs
   */
  generateUserActivityReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({
        type: z.literal("USER_ACTIVITY"),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent g�n�rer des rapports",
        });
      }

      try {
        const { startDate: _startDate, endDate: _endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          userRegistrations,
          activeUsers,
          usersByRole,
          verificationStats,
          activityTimeline,
          retentionData,
          engagementMetrics,
        ] = await Promise.all([
          // Nouvelles inscriptions
          _ctx.db.user.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              ...(input.userRole && { role: input.userRole }),
              ...(input.city && { city: input.city }),
            },
          }),

          // Utilisateurs actifs (ayant une activit� dans la p�riode)
          ctx.db.user.count({
            where: {
              lastActiveAt: { gte: startDate, lte: endDate },
              ...(input.userRole && { role: input.userRole }),
            },
          }),

          // R�partition par r�le
          ctx.db.user.groupBy({
            by: ["role"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
          }),

          // Statistiques de v�rification
          ctx.db.verification.groupBy({
            by: ["status"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
          }),

          // Timeline d'activit�
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, created_at) as period,
              COUNT(*)::int as new_users,
              COUNT(CASE WHEN role = 'CLIENT' THEN 1 END)::int as new_clients,
              COUNT(CASE WHEN role = 'DELIVERER' THEN 1 END)::int as new_deliverers,
              COUNT(CASE WHEN role = 'MERCHANT' THEN 1 END)::int as new_merchants,
              COUNT(CASE WHEN role = 'PROVIDER' THEN 1 END)::int as new_providers
            FROM users 
            WHERE created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, created_at)
            ORDER BY period ASC
          `,

          // Donn�es de r�tention (utilisateurs actifs par semaine/mois)
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC('week', last_active_at) as period,
              COUNT(DISTINCT id)::int as active_users,
              COUNT(DISTINCT CASE WHEN created_at >= ${startDate} THEN id END)::int as new_user_retention
            FROM users 
            WHERE last_active_at >= ${startDate}
              AND last_active_at <= ${endDate}
            GROUP BY DATE_TRUNC('week', last_active_at)
            ORDER BY period ASC
          `,

          // M�triques d'engagement par r�le
          Promise.all([
            // Engagement clients (commandes)
            ctx.db.order.count({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            // Engagement livreurs (livraisons)
            ctx.db.delivery.count({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            // Engagement prestataires (services rendus)
            ctx.db.serviceBooking.count({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            // Engagement commer�ants (produits ajout�s/modifi�s)
            ctx.db.product.count({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
          ]),
        ]);

        return {
          success: true,
          data: {
            period: { startDate, endDate, type: input.period },
            overview: {
              newRegistrations: userRegistrations,
              activeUsers,
              totalUsers: await ctx.db.user.count(),
              verifiedUsers: await ctx.db.user.count({
                where: { isVerified: true },
              }),
              activationRate:
                userRegistrations > 0
                  ? (activeUsers / userRegistrations) * 100
                  : 0,
            },
            breakdown: {
              byRole: usersByRole.map((role) => ({
                role: role.role,
                count: role._count,
                percentage:
                  userRegistrations > 0
                    ? (role._count / userRegistrations) * 100
                    : 0,
              })),
              byVerificationStatus: verificationStats.map((status) => ({
                status: status.status,
                count: status._count,
              })),
              timeline: activityTimeline,
              retention: retentionData,
            },
            engagement: {
              clientOrders: engagementMetrics[0],
              delivererDeliveries: engagementMetrics[1],
              providerBookings: engagementMetrics[2],
              merchantProducts: engagementMetrics[3],
            },
            insights: generateUserActivityInsights({
              registrations: userRegistrations,
              activeUsers,
              activationRate:
                userRegistrations > 0
                  ? (activeUsers / userRegistrations) * 100
                  : 0,
              verificationPending:
                verificationStats.find((s) => s.status === "PENDING")?._count ||
                0,
            }),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la g�n�ration du rapport d'activit�",
        });
      }
    }),

  /**
   * G�n�rer un rapport de sant� de la plateforme
   */
  generatePlatformHealthReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({
        type: z.literal("PLATFORM_HEALTH"),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent g�n�rer des rapports",
        });
      }

      try {
        const { startDate: _startDate, endDate: _endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          systemErrors,
          performanceMetrics,
          qualityIndicators,
          securityMetrics,
          capacityMetrics,
        ] = await Promise.all([
          // Erreurs syst�me
          _ctx.db.errorLog.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              level: { in: ["ERROR", "CRITICAL"] },
            },
          }),

          // M�triques de performance (temps de r�ponse moyen, etc.)
          ctx.db.$queryRaw`
            SELECT 
              AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))::float as avg_processing_time,
              COUNT(*)::int as total_operations,
              COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)::int as successful_operations
            FROM system_operations 
            WHERE created_at >= ${startDate}
              AND created_at <= ${endDate}
          `,

          // Indicateurs de qualit�
          Promise.all([
            // Taux de satisfaction moyen
            _ctx.db.serviceReview.aggregate({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
              _avg: { rating: true },
              _count: true,
            }),
            // Taux de r�solution des probl�mes
            ctx.db.supportTicket.aggregate({
              where: {
                createdAt: { gte: startDate, lte: endDate },
              },
              _count: {
                id: true,
                resolvedAt: true,
              },
            }),
          ]),

          // M�triques de s�curit�
          Promise.all([
            // Tentatives de connexion �chou�es
            _ctx.db.securityLog.count({
              where: {
                eventType: "FAILED_LOGIN",
                createdAt: { gte: startDate, lte: endDate },
              },
            }),
            // Comptes suspendus
            ctx.db.user.count({
              where: {
                status: "SUSPENDED",
                updatedAt: { gte: startDate, lte: endDate },
              },
            }),
          ]),

          // M�triques de capacit�
          Promise.all([
            // Stockage utilis�
            _ctx.db.document.aggregate({
              _sum: { fileSize: true },
            }),
            // Pics de charge
            ctx.db.$queryRaw`
              SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*)::int as requests_per_hour
              FROM api_requests 
              WHERE created_at >= ${startDate}
                AND created_at <= ${endDate}
              GROUP BY DATE_TRUNC('hour', created_at)
              ORDER BY requests_per_hour DESC
              LIMIT 10
            `,
          ]),
        ]);

        const [satisfactionData, supportData] = qualityIndicators;
        const [failedLogins, suspendedAccounts] = securityMetrics;
        const [storageData, loadPeaks] = capacityMetrics;

        const healthScore = calculatePlatformHealthScore({
          errorCount: systemErrors,
          successRate:
            (performanceMetrics[0]?.successful_operations /
              (performanceMetrics[0]?.total_operations || 1)) *
            100,
          satisfaction: satisfactionData._avg.rating || 0,
          securityIncidents: failedLogins + suspendedAccounts,
        });

        return {
          success: true,
          data: {
            period: { startDate, endDate, type: input.period },
            healthScore,
            overview: {
              status:
                healthScore >= 90
                  ? "EXCELLENT"
                  : healthScore >= 75
                    ? "GOOD"
                    : healthScore >= 60
                      ? "WARNING"
                      : "CRITICAL",
              uptime: 99.9, // TODO: Calculer le vrai uptime
              totalErrors: systemErrors,
              avgResponseTime: performanceMetrics[0]?.avg_processing_time || 0,
            },
            performance: {
              systemErrors,
              successRate: performanceMetrics[0]
                ? (performanceMetrics[0].successful_operations /
                    performanceMetrics[0].total_operations) *
                  100
                : 100,
              averageProcessingTime:
                performanceMetrics[0]?.avg_processing_time || 0,
              totalOperations: performanceMetrics[0]?.total_operations || 0,
            },
            quality: {
              averageSatisfaction: satisfactionData._avg.rating || 0,
              totalReviews: satisfactionData._count,
              supportTicketsResolved: supportData._count.resolvedAt || 0,
              supportTicketsTotal: supportData._count.id || 0,
              resolutionRate:
                supportData._count.id > 0
                  ? (supportData._count.resolvedAt / supportData._count.id) *
                    100
                  : 0,
            },
            security: {
              failedLoginAttempts: failedLogins,
              suspendedAccounts,
              securityIncidents: failedLogins + suspendedAccounts,
              threatLevel: calculateThreatLevel(
                failedLogins,
                suspendedAccounts,
              ),
            },
            capacity: {
              storageUsed: storageData._sum.fileSize || 0,
              peakLoad: Math.max(
                ...loadPeaks.map((p: any) => p.requests_per_hour),
                0,
              ),
              averageLoad:
                loadPeaks.reduce(
                  (sum: number, p: any) => sum + p.requests_per_hour,
                  0,
                ) / (loadPeaks.length || 1),
            },
            recommendations: generateHealthRecommendations({
              healthScore,
              errorCount: systemErrors,
              satisfaction: satisfactionData._avg.rating || 0,
              securityIncidents: failedLogins + suspendedAccounts,
            }),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la g�n�ration du rapport de sant�",
        });
      }
    }),

  /**
   * Cr�er un rapport personnalis�
   */
  createCustomReport: protectedProcedure
    .input(customReportSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Seuls les administrateurs peuvent cr�er des rapports personnalis�s",
        });
      }

      try {
        const report = await ctx.db.customReport.create({
          data: {
            ...input,
            createdById: user.id,
            status: "ACTIVE",
          },
        });

        return {
          success: true,
          data: report,
          message: "Rapport personnalis� cr�� avec succ�s",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la cr�ation du rapport",
        });
      }
    }),

  /**
   * Exporter un rapport
   */
  exportReport: protectedProcedure
    .input(reportExportSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent exporter des rapports",
        });
      }

      try {
        // TODO: Impl�menter la logique d'export selon le format
        const exportUrl = await generateReportExport(input);

        // Cr�er un log d'export
        await ctx.db.reportExport.create({
          data: {
            reportId: input.reportId,
            format: input.format,
            exportedById: user.id,
            fileUrl: exportUrl,
            status: "COMPLETED",
          },
        });

        return {
          success: true,
          data: {
            downloadUrl: exportUrl,
            format: input.format,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
          message: "Export g�n�r� avec succ�s",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export du rapport",
        });
      }
    }),
});

// Helper functions
function calculateReportPeriod(
  period: string,
  startDate?: Date,
  endDate?: Date,
  includeComparison = false,
) {
  if (startDate && endDate) {
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousEndDate = includeComparison
      ? new Date(startDate.getTime() - 1)
      : undefined;
    const previousStartDate = includeComparison
      ? new Date(previousEndDate!.getTime() - periodLength)
      : undefined;

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  const now = new Date();
  let calculatedStartDate: Date, calculatedEndDate: Date;
  let previousStartDate: Date | undefined, previousEndDate: Date | undefined;

  switch (period) {
    case "DAY":
      calculatedStartDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      calculatedEndDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      if (includeComparison) {
        previousEndDate = new Date(calculatedStartDate);
        previousStartDate = new Date(
          calculatedStartDate.getTime() - 24 * 60 * 60 * 1000,
        );
      }
      break;
    case "WEEK":
      calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      calculatedEndDate = now;
      if (includeComparison) {
        previousEndDate = new Date(calculatedStartDate);
        previousStartDate = new Date(
          calculatedStartDate.getTime() - 7 * 24 * 60 * 60 * 1000,
        );
      }
      break;
    case "MONTH":
      calculatedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      calculatedEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (includeComparison) {
        previousEndDate = new Date(calculatedStartDate);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      break;
    case "QUARTER":
      const quarter = Math.floor(now.getMonth() / 3);
      calculatedStartDate = new Date(now.getFullYear(), quarter * 3, 1);
      calculatedEndDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      if (includeComparison) {
        previousEndDate = new Date(calculatedStartDate);
        previousStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      }
      break;
    default: // YEAR
      calculatedStartDate = new Date(now.getFullYear(), 0, 1);
      calculatedEndDate = new Date(now.getFullYear(), 11, 31);
      if (includeComparison) {
        previousEndDate = new Date(calculatedStartDate);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      }
  }

  return {
    startDate: calculatedStartDate,
    endDate: calculatedEndDate,
    previousStartDate,
    previousEndDate,
  };
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateDelivererEfficiency(performance: any): number {
  const deliveryScore = performance._count * 0.4;
  const timeScore =
    (performance._avg.actualDeliveryTime || 0) > 0
      ? (60 / (performance._avg.actualDeliveryTime || 60)) * 0.3
      : 0;
  const ratingScore = (performance._avg.customerRating || 0) * 0.3;

  return Math.min(deliveryScore + timeScore + ratingScore, 100);
}

function calculatePlatformHealthScore(metrics: {
  errorCount: number;
  successRate: number;
  satisfaction: number;
  securityIncidents: number;
}): number {
  const score = 100;

  // D�duction pour erreurs (max -30 points)
  score -= Math.min(metrics.errorCount * 2, 30);

  // D�duction pour taux de succ�s faible (max -25 points)
  score -= Math.max(0, (100 - metrics.successRate) * 0.25);

  // D�duction pour satisfaction faible (max -25 points)
  score -= Math.max(0, (5 - metrics.satisfaction) * 5);

  // D�duction pour incidents de s�curit� (max -20 points)
  score -= Math.min(metrics.securityIncidents * 5, 20);

  return Math.max(score, 0);
}

function calculateThreatLevel(
  failedLogins: number,
  suspendedAccounts: number,
): string {
  const total = failedLogins + suspendedAccounts;
  if (total > 100) return "HIGH";
  if (total > 50) return "MEDIUM";
  if (total > 10) return "LOW";
  return "MINIMAL";
}

function generateFinancialInsights(data: any): string[] {
  const insights: string[] = [];

  if (data.growth > 20) {
    insights.push("Croissance financi�re excellente (+20%)");
  } else if (data.growth < -10) {
    insights.push("Baisse significative du chiffre d'affaires (-10%)");
  }

  if (data.averageOrder > 50) {
    insights.push("Panier moyen �lev�, optimiser la conversion");
  }

  return insights;
}

function generateDeliveryInsights(data: any): string[] {
  const insights: string[] = [];

  if (data.completionRate < 85) {
    insights.push("Taux de completion faible, identifier les causes d'�chec");
  }

  if (data.issueCount > data.totalDeliveries * 0.1) {
    insights.push("Taux d'incidents �lev�, renforcer la formation");
  }

  return insights;
}

function generateUserActivityInsights(data: any): string[] {
  const insights: string[] = [];

  if (data.activationRate < 50) {
    insights.push("Faible taux d'activation, am�liorer l'onboarding");
  }

  if (data.verificationPending > 50) {
    insights.push("Backlog de v�rifications important, acc�l�rer le processus");
  }

  return insights;
}

function generateHealthRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  if (data.healthScore < 80) {
    recommendations.push("Am�liorer la surveillance syst�me");
  }

  if (data.errorCount > 100) {
    recommendations.push("Investiguer les causes d'erreurs r�currentes");
  }

  if (data.satisfaction < 4) {
    recommendations.push("Am�liorer l'exp�rience utilisateur");
  }

  return recommendations;
}

async function generateReportExport(input: any): Promise<string> {
  try {
    // Générer un nom de fichier unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `report-${input.reportId}-${timestamp}.${input.format.toLowerCase()}`;

    // En fonction du format, générer le fichier approprié
    switch (input.format) {
      case "CSV":
        return await generateCSVExport(input, fileName);
      case "EXCEL":
        return await generateExcelExport(input, fileName);
      case "PDF":
        return await generatePDFExport(input, fileName);
      default:
        throw new Error(`Format d'export non supporté: ${input.format}`);
    }
  } catch (_error) {
    console.error("Erreur lors de la génération d'export:", error);
    throw new Error("Échec de la génération d'export");
  }
}

async function generateCSVExport(
  input: any,
  fileName: string,
): Promise<string> {
  // TODO: Implémenter l'export CSV avec une vraie librairie comme 'csv-writer'
  // Pour l'instant, retourner une URL temporaire
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/exports/csv/${fileName}`;
}

async function generateExcelExport(
  input: any,
  fileName: string,
): Promise<string> {
  // TODO: Implémenter l'export Excel avec une vraie librairie comme 'exceljs'
  // Pour l'instant, retourner une URL temporaire
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/exports/excel/${fileName}`;
}

async function generatePDFExport(
  input: any,
  fileName: string,
): Promise<string> {
  // TODO: Implémenter l'export PDF avec une vraie librairie comme 'puppeteer' ou 'jspdf'
  // Pour l'instant, retourner une URL temporaire
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/exports/pdf/${fileName}`;
}
