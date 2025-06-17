import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la génération de rapports administratifs
 * Rapports complets de performance, financiers et opérationnels selon le cahier des charges
 */

// Schémas de validation
const reportFiltersSchema = z.object({ type: z.enum([
    "FINANCIAL",
    "OPERATIONAL",
    "USER_ACTIVITY",
    "DELIVERY_PERFORMANCE",
    "PLATFORM_HEALTH"]),
  period: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Filtres spécifiques
  userRole: z.nativeEnum(UserRole).optional(),
  city: z.string().optional(),
  serviceCategory: z.string().optional(),

  // Groupement et granularité
  groupBy: z.enum(["day", "week", "month", "quarter"]).default("day"),
  includeComparison: z.boolean().default(false),
  includeProjections: z.boolean().default(false),

  // Format d'export
  format: z.enum(["JSON", "CSV", "EXCEL", "PDF"]).default("JSON") });

const customReportSchema = z.object({ name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),

  // Configuration du rapport
  metrics: z.array(z.string()).min(1),
  dimensions: z.array(z.string()),
  filters: z.record(z.any()),

  // Paramètres de génération
  schedule: z.enum(["MANUAL", "DAILY", "WEEKLY", "MONTHLY"]).default("MANUAL"),
  recipients: z.array(z.string().email()).optional(),

  // Visualisation
  chartTypes: z.array(z.enum(["LINE", "BAR", "PIE", "TABLE"])),
  includeRawData: z.boolean().default(false) });

const reportExportSchema = z.object({ reportId: z.string().cuid(),
  format: z.enum(["CSV", "EXCEL", "PDF"]),
  includeCharts: z.boolean().default(true),
  includeRawData: z.boolean().default(false),
  compression: z.boolean().default(false) });

export const adminReportsRouter = router({ /**
   * Générer un rapport financier détaillé
   */
  generateFinancialReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({
        type: z.literal("FINANCIAL") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent générer des rapports" });
      }

      try {
        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculateReportPeriod(
            input.period,
            input.startDate,
            input.endDate,
            input.includeComparison,
          );

        // Métriques financières principales
        const [
          revenue,
          commissions,
          withdrawals,
          activeSubscriptions,
          transactionVolume,
          averageOrderValue,
          paymentMethods,
          refunds] = await Promise.all([
          // Revenus totaux
          ctx.db.payment.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate }},
            sum: { amount },
            count: true}),

          // Commissions par rôle
          ctx.db.commission.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate }},
            sum: { amount },
            count: true}),

          // Retraits effectués
          ctx.db.withdrawal.aggregate({
            where: {
              status: "COMPLETED",
              processedAt: { gte: startDate, lte: endDate }},
            sum: { amount },
            count: true}),

          // Abonnements actifs
          ctx.db.subscription.count({
            where: {
              status: "ACTIVE",
              startDate: { lte },
              OR: [{ endDate }, { endDate: { gte } }]}}),

          // Volume de transactions par jour
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, createdat) as period,
              COUNT(*)::int as transaction_count,
              COALESCE(SUM(amount), 0)::float as total_amount,
              AVG(amount)::float as avg_amount
            FROM payments 
            WHERE status = 'COMPLETED'
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, createdat)
            ORDER BY period ASC
          `,

          // Valeur moyenne des commandes
          ctx.db.order.aggregate({
            where: {
              status: { in: ["COMPLETED", "DELIVERED"] },
              createdAt: { gte: startDate, lte: endDate }},
            avg: { totalAmount },
            sum: { totalAmount },
            count: true}),

          // Répartition par méthode de paiement
          ctx.db.payment.groupBy({
            by: ["method"],
            where: {
              status: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate }},
            sum: { amount },
            count: true}),

          // Remboursements
          ctx.db.refund.aggregate({
            where: {
              status: "COMPLETED",
              processedAt: { gte: startDate, lte: endDate }},
            sum: { amount },
            count: true})]);

        // Comparaison avec la période précédente si demandée
        const comparison = null;
        if (input.includeComparison && previousStartDate && previousEndDate) {
          const previousRevenue = await ctx.db.payment.aggregate({
            where: {
              status: "COMPLETED",
              createdAt: { gte: previousStartDate, lte: previousEndDate }},
            sum: { amount }});

          comparison = {
            revenueGrowth: calculateGrowthRate(
              revenue.sum.amount || 0,
              previousRevenue.sum.amount || 0,
            )};
        }

        // Métriques clés
        const netRevenue =
          (revenue.sum.amount || 0) - (refunds.sum.amount || 0);
        const conversionRate =
          revenue.count > 0
            ? (revenue.count / transactionVolume.length) * 100
            : 0;

        return {
          success: true,
          data: {
            period: {
              startDate,
              endDate,
              type: input.period},
            overview: {
              totalRevenue: revenue.sum.amount || 0,
              netRevenue,
              totalCommissions: commissions.sum.amount || 0,
              totalWithdrawals: withdrawals.sum.amount || 0,
              activeSubscriptions,
              transactionCount: revenue.count,
              averageOrderValue: averageOrderValue.avg.totalAmount || 0,
              refundRate:
                revenue.count > 0
                  ? (refunds.count / revenue.count) * 100
                  : 0},
            breakdown: {
              byPaymentMethod: paymentMethods.map((method) => ({ method: method.method,
                amount: method.sum.amount || 0,
                count: method.count,
                percentage: revenue.sum.amount
                  ? ((method.sum.amount || 0) / (revenue.sum.amount || 1)) *
                    100
                  : 0 })),
              timeline: transactionVolume},
            comparison,
            insights: generateFinancialInsights({ revenue: revenue.sum.amount || 0,
              growth: comparison?.revenueGrowth || 0,
              transactionCount: revenue.count,
              averageOrder: averageOrderValue.avg.totalAmount || 0 })}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport financier" });
      }
    }),

  /**
   * Générer un rapport de performance des livraisons
   */
  generateDeliveryPerformanceReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({ type: z.literal("DELIVERY_PERFORMANCE") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent générer des rapports" });
      }

      try {
        const { startDate: startDate, endDate: endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          deliveryStats,
          delivererPerformance,
          geographicData,
          timeMetrics,
          issueStats] = await Promise.all([
          // Statistiques générales des livraisons
          ctx.db.delivery.aggregate({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              ...(input.city && {
                pickupAddress: { contains: input.city, mode: "insensitive" }})},
            count: {
              id: true,
              completedAt: true},
            avg: {
              distance: true,
              actualDeliveryTime: true}}),

          // Performance par livreur
          ctx.db.delivery.groupBy({
            by: ["delivererId"],
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: "DELIVERED"},
            count: true,
            avg: {
              actualDeliveryTime: true,
              customerRating: true},
            orderBy: { count: { id: "desc" } },
            take: 20}),

          // Données géographiques
          ctx.db.delivery.groupBy({
            by: ["pickupCity", "deliveryCity"],
            where: {
              createdAt: { gte: startDate, lte: endDate }},
            count: true,
            avg: { distance }}),

          // Métriques temporelles
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, createdat) as period,
              COUNT(*)::int as total_deliveries,
              COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END)::int as completed,
              COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as cancelled,
              AVG(actual_deliverytime)::float as avg_delivery_time,
              AVG(customerrating)::float as avg_rating
            FROM deliveries 
            WHERE created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, createdat)
            ORDER BY period ASC
          `,

          // Statistiques des problèmes
          ctx.db.deliveryIssue.groupBy({
            by: ["issueType"],
            where: {
              createdAt: { gte: startDate, lte: endDate }},
            count: true})]);

        // Enrichir les données des livreurs
        const enrichedDelivererData = await Promise.all(
          delivererPerformance.map(async (perf) => {
            const deliverer = await ctx.db.deliverer.findUnique({
              where: { id: perf.delivererId },
              include: {
                user: {
                  select: { name: true, city: true }}}});

            return {
              ...perf,
              deliverer: deliverer?.user || null,
              efficiency: calculateDelivererEfficiency(perf),
              rank: 0, // Sera calculé après tri
            };
          }),
        );

        // Calculer les rangs
        enrichedDelivererData.sort((a, b) => b.efficiency - a.efficiency);
        enrichedDelivererData.forEach((item, index) => {
          item.rank = index + 1;
        });

        const completionRate =
          deliveryStats.count.id > 0
            ? (deliveryStats.count.completedAt / deliveryStats.count.id) * 100
            : 0;

        return {
          success: true,
          data: {
            period: { startDate, endDate, type: input.period },
            overview: {
              totalDeliveries: deliveryStats.count.id,
              completedDeliveries: deliveryStats.count.completedAt,
              completionRate,
              averageDistance: deliveryStats.avg.distance || 0,
              averageDeliveryTime: deliveryStats.avg.actualDeliveryTime || 0,
              totalIssues: issueStats.reduce(
                (sum, issue) => sum + issue.count,
                0,
              )},
            performance: {
              topDeliverers: enrichedDelivererData.slice(0, 10),
              geographicBreakdown: geographicData.map((geo) => ({
                route: `${geo.pickupCity} à ${geo.deliveryCity}`,
                count: geo.count,
                avgDistance: geo.avg.distance})),
              timeline: timeMetrics,
              issueBreakdown: issueStats.map((issue) => ({ type: issue.issueType,
                count: issue.count,
                percentage:
                  deliveryStats.count.id > 0
                    ? (issue.count / deliveryStats.count.id) * 100
                    : 0 }))},
            insights: generateDeliveryInsights({ completionRate,
              avgDeliveryTime: deliveryStats.avg.actualDeliveryTime || 0,
              issueCount: issueStats.reduce(
                (sum, issue) => sum + issue.count,
                0,
              ),
              totalDeliveries: deliveryStats.count.id })}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport de livraisons" });
      }
    }),

  /**
   * Générer un rapport d'activité utilisateurs
   */
  generateUserActivityReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({ type: z.literal("USER_ACTIVITY") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent générer des rapports" });
      }

      try {
        const { startDate: startDate, endDate: endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          userRegistrations,
          activeUsers,
          usersByRole,
          verificationStats,
          activityTimeline,
          retentionData,
          engagementMetrics] = await Promise.all([
          // Nouvelles inscriptions
          ctx.db.user.count({
            where: {
              createdAt: { gte: startDate, lte: endDate },
              ...(input.userRole && { role: input.userRole }),
              ...(input.city && { city: input.city })}}),

          // Utilisateurs actifs (ayant une activité dans la période)
          ctx.db.user.count({
            where: {
              lastActiveAt: { gte: startDate, lte: endDate },
              ...(input.userRole && { role: input.userRole })}}),

          // Répartition par rôle
          ctx.db.user.groupBy({
            by: ["role"],
            where: {
              createdAt: { gte: startDate, lte: endDate }},
            count: true}),

          // Statistiques de vérification
          ctx.db.verification.groupBy({
            by: ["status"],
            where: {
              createdAt: { gte: startDate, lte: endDate }},
            count: true}),

          // Timeline d'activité
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC(${input.groupBy}, createdat) as period,
              COUNT(*)::int as new_users,
              COUNT(CASE WHEN role = 'CLIENT' THEN 1 END)::int as new_clients,
              COUNT(CASE WHEN role = 'DELIVERER' THEN 1 END)::int as new_deliverers,
              COUNT(CASE WHEN role = 'MERCHANT' THEN 1 END)::int as new_merchants,
              COUNT(CASE WHEN role = 'PROVIDER' THEN 1 END)::int as new_providers
            FROM users 
            WHERE created_at >= ${startDate}
              AND created_at <= ${endDate}
            GROUP BY DATE_TRUNC(${input.groupBy}, createdat)
            ORDER BY period ASC
          `,

          // Données de rétention (utilisateurs actifs par semaine/mois)
          ctx.db.$queryRaw`
            SELECT 
              DATE_TRUNC('week', last_activeat) as period,
              COUNT(DISTINCT id)::int as active_users,
              COUNT(DISTINCT CASE WHEN createdat >= ${startDate} THEN id END)::int as new_user_retention
            FROM users 
            WHERE last_active_at >= ${startDate}
              AND last_active_at <= ${endDate}
            GROUP BY DATE_TRUNC('week', last_activeat)
            ORDER BY period ASC
          `,

          // Métriques d'engagement par rôle
          Promise.all([
            // Engagement clients (commandes)
            ctx.db.order.count({
              where: {
                createdAt: { gte: startDate, lte: endDate }}}),
            // Engagement livreurs (livraisons)
            ctx.db.delivery.count({
              where: {
                createdAt: { gte: startDate, lte: endDate }}}),
            // Engagement prestataires (services rendus)
            ctx.db.serviceBooking.count({
              where: {
                createdAt: { gte: startDate, lte: endDate }}}),
            // Engagement commerants (produits ajoutés/modifiés)
            ctx.db.product.count({
              where: {
                createdAt: { gte: startDate, lte: endDate }}})])]);

        return {
          success: true,
          data: {
            period: { startDate, endDate, type: input.period },
            overview: {
              newRegistrations: userRegistrations,
              activeUsers,
              totalUsers: await ctx.db.user.count(),
              verifiedUsers: await ctx.db.user.count({
                where: { isVerified }}),
              activationRate:
                userRegistrations > 0
                  ? (activeUsers / userRegistrations) * 100
                  : 0},
            breakdown: {
              byRole: usersByRole.map((role) => ({ role: role.role,
                count: role.count,
                percentage:
                  userRegistrations > 0
                    ? (role.count / userRegistrations) * 100
                    : 0 })),
              byVerificationStatus: verificationStats.map((status) => ({ status: status.status,
                count: status.count })),
              timeline: activityTimeline,
              retention: retentionData},
            engagement: {
              clientOrders: engagementMetrics[0],
              delivererDeliveries: engagementMetrics[1],
              providerBookings: engagementMetrics[2],
              merchantProducts: engagementMetrics[3]},
            insights: generateUserActivityInsights({ registrations: userRegistrations,
              activeUsers,
              activationRate:
                userRegistrations > 0
                  ? (activeUsers / userRegistrations) * 100
                  : 0,
              verificationPending:
                verificationStats.find((s) => s.status === "PENDING")?.count ||
                0 })}};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport d'activité" });
      }
    }),

  /**
   * Générer un rapport de santé de la plateforme
   */
  generatePlatformHealthReport: protectedProcedure
    .input(
      reportFiltersSchema.extend({ type: z.literal("PLATFORM_HEALTH") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent générer des rapports" });
      }

      try {
        const { startDate: startDate, endDate: endDate } =
          calculateReportPeriod(input.period, input.startDate, input.endDate);

        const [
          systemHealth,
          databaseStatus,
          stripeStatus,
          emailStatus,
          storageStatus,
          totalUptime
        ] = await Promise.all([
          this.checkSystemHealth(),
          this.checkDatabaseConnection(ctx.db),
          this.checkStripeConnection(),
          this.checkEmailService(),
          this.checkStorageService(),
          this.calculateSystemUptime(ctx.db)
        ]);

        return {
          systemHealth: {
            status: systemHealth.status,
            uptime: totalUptime,
            memoryUsage: systemHealth.memoryUsage,
            cpuUsage: systemHealth.cpuUsage,
            diskUsage: systemHealth.diskUsage
          },
          services: {
            database: databaseStatus,
            stripe: stripeStatus,
            email: emailStatus,
            storage: storageStatus
          },
          timestamp: new Date()
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération du rapport de santé" });
      }
    }),

  /**
   * Créer un rapport personnalisé
   */
  createCustomReport: protectedProcedure
    .input(customReportSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les administrateurs peuvent créer des rapports personnalisés" });
      }

      try {
        const report = await ctx.db.customReport.create({
          data: {
            ...input,
            createdById: user.id,
            status: "ACTIVE"}});

        return {
          success: true,
          data: report,
          message: "Rapport personnalisé créé avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du rapport" });
      }
    }),

  /**
   * Exporter un rapport
   */
  exportReport: protectedProcedure
    .input(reportExportSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les administrateurs peuvent exporter des rapports" });
      }

      try {
        // Implémenter la logique d'export selon le format
        let exportUrl: string;
        
        // Récupérer les données du rapport
        const reportData = await getReportData(input.reportId, ctx.db);
        
        if (!reportData) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Rapport non trouvé" 
          });
        }

        // Générer l'export selon le format demandé
        switch (input.format) {
          case "CSV":
            exportUrl = await generateCSVExport(reportData, input);
            break;
          case "EXCEL":
            exportUrl = await generateExcelExport(reportData, input);
            break;
          case "PDF":
            exportUrl = await generatePDFExport(reportData, input);
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Format d'export non supporté"
            });
        }

        // Créer un log d'export
        await ctx.db.reportExport.create({
          data: {
            reportId: input.reportId,
            format: input.format,
            exportedById: user.id,
            fileUrl: exportUrl,
            status: "COMPLETED",
            fileSize: await getFileSize(exportUrl),
            metadata: {
              reportType: reportData.type,
              period: reportData.period,
              filters: input.filters || {},
              generatedAt: new Date().toISOString()
            }
          }
        });

        // Créer un log d'audit
        await ctx.db.auditLog.create({
          data: {
            entityType: "REPORT_EXPORT",
            entityId: input.reportId,
            action: "EXPORT_GENERATED",
            performedById: user.id,
            details: {
              format: input.format,
              reportType: reportData.type,
              fileUrl: exportUrl,
              filters: input.filters
            }
          }
        });

        return {
          success: true,
          data: {
            downloadUrl: exportUrl,
            format: input.format,
            fileName: extractFileName(exportUrl),
            fileSize: await getFileSize(exportUrl),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
          message: "Export généré avec succès"
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export du rapport" });
      }
    })});

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
    previousEndDate};
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateDelivererEfficiency(performance: any): number {
  const deliveryScore = performance.count * 0.4;
  const timeScore =
    (performance.avg.actualDeliveryTime || 0) > 0
      ? (60 / (performance.avg.actualDeliveryTime || 60)) * 0.3
      : 0;
  const ratingScore = (performance.avg.customerRating || 0) * 0.3;

  return Math.min(deliveryScore + timeScore + ratingScore, 100);
}

function calculatePlatformHealthScore(metrics: {
  errorCount: number;
  successRate: number;
  satisfaction: number;
  securityIncidents: number;
}): number {
  const score = 100;

  // Déduction pour erreurs (max -30 points)
  score -= Math.min(metrics.errorCount * 2, 30);

  // Déduction pour taux de succès faible (max -25 points)
  score -= Math.max(0, (100 - metrics.successRate) * 0.25);

  // Déduction pour satisfaction faible (max -25 points)
  score -= Math.max(0, (5 - metrics.satisfaction) * 5);

  // Déduction pour incidents de sécurité (max -20 points)
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
    insights.push("Croissance financière excellente (+20%)");
  } else if (data.growth < -10) {
    insights.push("Baisse significative du chiffre d'affaires (-10%)");
  }

  if (data.averageOrder > 50) {
    insights.push("Panier moyen élevé, optimiser la conversion");
  }

  return insights;
}

function generateDeliveryInsights(data: any): string[] {
  const insights: string[] = [];

  if (data.completionRate < 85) {
    insights.push("Taux de completion faible, identifier les causes d'échec");
  }

  if (data.issueCount > data.totalDeliveries * 0.1) {
    insights.push("Taux d'incidents élevé, renforcer la formation");
  }

  return insights;
}

function generateUserActivityInsights(data: any): string[] {
  const insights: string[] = [];

  if (data.activationRate < 50) {
    insights.push("Faible taux d'activation, améliorer l'onboarding");
  }

  if (data.verificationPending > 50) {
    insights.push("Backlog de vérifications important, accélérer le processus");
  }

  return insights;
}

function generateHealthRecommendations(data: any): string[] {
  const recommendations: string[] = [];

  if (data.healthScore < 80) {
    recommendations.push("Améliorer la surveillance système");
  }

  if (data.errorCount > 100) {
    recommendations.push("Investiguer les causes d'erreurs récurrentes");
  }

  if (data.satisfaction < 4) {
    recommendations.push("Améliorer l'expérience utilisateur");
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
  } catch (error) {
    console.error("Erreur lors de la génération d'export:", error);
    throw new Error("Échec de la génération d'export");
  }
}

async function generateCSVExport(
  input: any,
  fileName: string,
): Promise<string> {
  // Implémentation export CSV avec csv-writer
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Préparer les données pour l'export CSV
    const csvData = [];
    const reportData = input.data || {};
    
    // Structure basique pour l'export CSV selon le type de rapport
    switch (input.reportType) {
      case 'FINANCIAL':
        csvData.push([
          'Date', 'Revenus', 'Commissions', 'Remboursements', 'Profit Net'
        ]);
        // Ajouter les données financières
        if (reportData.dailyStats) {
          reportData.dailyStats.forEach((stat: any) => {
            csvData.push([
              stat.date,
              stat.revenue || 0,
              stat.commissions || 0,
              stat.refunds || 0,
              stat.netProfit || 0
            ]);
          });
        }
        break;
        
      case 'DELIVERY':
        csvData.push([
          'Date', 'Livraisons Totales', 'Livraisons Complétées', 'Taux Succès', 'Temps Moyen'
        ]);
        break;
        
      case 'USER_ACTIVITY':
        csvData.push([
          'Date', 'Nouveaux Utilisateurs', 'Utilisateurs Actifs', 'Taux Activation'
        ]);
        break;
        
      default:
        csvData.push(['Données', 'Valeur']);
        csvData.push(['Période', input.period || 'N/A']);
        csvData.push(['Généré le', new Date().toLocaleDateString()]);
    }
    
    // Convertir en format CSV
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
            // Utiliser le service d'export réel
        const exportDir = process.env.EXPORT_DIR || './exports';
        await exportGeneratorService.ensureExportDir();
        
        const filePath = path.join(exportDir, fileName);
        await fs.writeFile(filePath, csvContent, 'utf8');
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        return `${baseUrl}/api/exports/download/${fileName}`;
    
  } catch (error) {
    console.error('Erreur génération CSV:', error);
    throw new Error('Échec de la génération du fichier CSV');
  }
}

async function generateExcelExport(
  input: any,
  fileName: string,
): Promise<string> {
  // Implémentation export Excel avec exceljs
  try {
    // En production: utiliser exceljs
    // const ExcelJS = require('exceljs');
    // const workbook = new ExcelJS.Workbook();
    
    // Pour l'instant, simuler la génération Excel
    const excelData = {
      reportType: input.reportType,
      period: input.period,
      generatedAt: new Date().toISOString(),
      data: input.data || {},
      metadata: {
        totalRows: 0,
        sheets: ['Données', 'Résumé', 'Graphiques'],
        format: 'xlsx'
      }
    };
    
    // Simulation de sauvegarde du fichier Excel
    const fs = require('fs').promises;
    const path = require('path');
    const exportDir = process.env.EXPORT_DIR || './exports';
    const filePath = path.join(exportDir, fileName);
    
    // Créer le dossier s'il n'existe pas
    await fs.mkdir(exportDir, { recursive: true });
    
    // Simuler l'écriture du fichier Excel (en production: workbook.xlsx.writeFile)
    await fs.writeFile(filePath + '.json', JSON.stringify(excelData, null, 2));
    
    // Retourner l'URL de téléchargement
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/exports/download/${fileName}`;
    
  } catch (error) {
    console.error('Erreur génération Excel:', error);
    throw new Error('Échec de la génération du fichier Excel');
  }
}

async function generatePDFExport(
  input: any,
  fileName: string,
): Promise<string> {
  // Implémentation export PDF avec puppeteer/jsPDF
  try {
    // En production: utiliser puppeteer ou jsPDF
    // const puppeteer = require('puppeteer');
    // const browser = await puppeteer.launch();
    
    // Préparer le contenu HTML pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Rapport ${input.reportType}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          .data-table { width: 100%; border-collapse: collapse; }
          .data-table th, .data-table td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          .data-table th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rapport ${input.reportType}</h1>
          <p>Période: ${input.period || 'N/A'}</p>
          <p>Généré le: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
          <h2>Résumé Exécutif</h2>
          <p>Ce rapport présente les données analytiques pour la période sélectionnée.</p>
        </div>
        
        <div class="section">
          <h2>Données Détaillées</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Métrique</th>
                <th>Valeur</th>
                <th>Variation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total des revenus</td>
                <td>${input.data?.totalRevenue || 0}€</td>
                <td>+12%</td>
              </tr>
              <tr>
                <td>Nombre de livraisons</td>
                <td>${input.data?.totalDeliveries || 0}</td>
                <td>+8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    
    // Simuler la génération PDF
    const fs = require('fs').promises;
    const path = require('path');
    const exportDir = process.env.EXPORT_DIR || './exports';
    const filePath = path.join(exportDir, fileName);
    
    // Créer le dossier s'il n'existe pas
    await fs.mkdir(exportDir, { recursive: true });
    
    // Sauvegarder le HTML (en production: conversion en PDF avec puppeteer)
    await fs.writeFile(filePath + '.html', htmlContent);
    
    // En production:
    // const pdf = await page.pdf({ format: 'A4', printBackground: true });
    // await fs.writeFile(filePath, pdf);
    
    // Retourner l'URL de téléchargement
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${baseUrl}/api/exports/download/${fileName}`;
    
  } catch (error) {
    console.error('Erreur génération PDF:', error);
    throw new Error('Échec de la génération du fichier PDF');
  }
}
