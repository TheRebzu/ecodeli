import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AdminPermissionService } from "@/server/services/admin/admin-permissions.service";
import { FinancialMetricsService } from "@/server/services/admin/financial-metrics.service";

/**
 * Router pour les métriques financières
 * Remplace les données mockées dans financial-reports.tsx
 */
export const financialMetricsRouter = router({
  // Récupérer les métriques financières complètes
  getFinancialMetrics: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["financial.view"],
          "Vous devez avoir les permissions financières pour consulter les métriques"
        );

        // Utiliser le service de métriques financières
        const financialService = new FinancialMetricsService(ctx.db);
        const metrics = await financialService.getFinancialMetrics(input.timeRange);

        return metrics;
      } catch (error) {
        console.error('Error fetching financial metrics:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des métriques financières"
        });
      }
    }),

  // Récupérer la répartition des revenus
  getRevenueBreakdown: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["financial.view"],
          "Vous devez avoir les permissions financières pour consulter la répartition des revenus"
        );

        // Utiliser le service de métriques financières
        const financialService = new FinancialMetricsService(ctx.db);
        const breakdown = await financialService.getRevenueBreakdown(input.timeRange);

        return breakdown;
      } catch (error) {
        console.error('Error fetching revenue breakdown:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la répartition des revenus"
        });
      }
    }),

  // Récupérer les statistiques de paiement
  getPaymentStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d")
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["financial.view"],
          "Vous devez avoir les permissions financières pour consulter les statistiques de paiement"
        );

        // Utiliser le service de métriques financières
        const financialService = new FinancialMetricsService(ctx.db);
        const stats = await financialService.getPaymentStats(input.timeRange);

        return stats;
      } catch (error) {
        console.error('Error fetching payment stats:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques de paiement"
        });
      }
    }),

  // Exporter les données financières
  exportFinancialData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        format: z.enum(["CSV", "XLSX", "PDF"]).default("CSV"),
        includeBreakdown: z.boolean().default(true),
        includePaymentStats: z.boolean().default(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["financial.export"],
          "Vous devez avoir les permissions d'export pour exporter les données financières"
        );

        // Récupérer toutes les données
        const financialService = new FinancialMetricsService(ctx.db);
        const [metrics, breakdown, paymentStats] = await Promise.all([
          financialService.getFinancialMetrics(input.timeRange),
          input.includeBreakdown ? financialService.getRevenueBreakdown(input.timeRange) : null,
          input.includePaymentStats ? financialService.getPaymentStats(input.timeRange) : null
        ]);

        // Créer le contenu d'export (simplifié pour CSV)
        const headers = [
          'Métrique',
          'Valeur',
          'Période'
        ];

        const rows = [
          ['Revenus totaux', metrics.totalRevenue.toString(), input.timeRange],
          ['Profit net', metrics.netProfit.toString(), input.timeRange],
          ['Paiements en attente', metrics.pendingPayments.toString(), input.timeRange],
          ['Valeur moyenne transaction', metrics.averageTransactionValue.toString(), input.timeRange],
          ['Nombre de transactions', metrics.transactionCount.toString(), input.timeRange],
          ['Croissance mensuelle (%)', metrics.monthlyGrowth.toString(), input.timeRange],
          ['Commissions totales', metrics.totalCommissions.toString(), input.timeRange],
          ['Retraits totaux', metrics.totalPayouts.toString(), input.timeRange],
          ['Remboursements', metrics.refunds.toString(), input.timeRange],
        ];

        // Ajouter les données de répartition si demandées
        if (breakdown) {
          rows.push(
            ['Frais de livraison', breakdown.deliveryFees.toString(), input.timeRange],
            ['Frais de service', breakdown.serviceFees.toString(), input.timeRange],
            ['Abonnements', breakdown.subscriptions.toString(), input.timeRange],
            ['Commissions (breakdown)', breakdown.commissions.toString(), input.timeRange],
            ['Autres revenus', breakdown.other.toString(), input.timeRange],
          );
        }

        const csvContent = [headers, ...rows]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const filename = `financial_metrics_${input.timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        
        return {
          downloadUrl: `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
          filename,
          recordCount: rows.length
        };
      } catch (error) {
        console.error('Error exporting financial data:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export des données financières"
        });
      }
    }),
}); 