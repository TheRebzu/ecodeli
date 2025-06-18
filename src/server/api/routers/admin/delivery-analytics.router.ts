import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AdminPermissionService } from "@/server/services/admin/admin-permissions.service";
import { DeliveryAnalyticsService } from "@/server/services/admin/delivery-analytics.service";

/**
 * Router pour les analytics de livraison
 * Remplace les données mockées dans delivery-analytics.tsx
 */
export const deliveryAnalyticsRouter = router({
  // Récupérer les métriques de livraison
  getDeliveryMetrics: protectedProcedure
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
          ["audit.view"],
          "Vous devez avoir les permissions pour consulter les analytics de livraison"
        );

        // Utiliser le service d'analytics
        const analyticsService = new DeliveryAnalyticsService(ctx.db);
        const metrics = await analyticsService.getDeliveryMetrics(input.timeRange);

        return metrics;
      } catch (error) {
        console.error('Error fetching delivery metrics:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des métriques de livraison"
        });
      }
    }),

  // Récupérer les performances des livreurs
  getDelivererPerformance: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        limit: z.number().min(1).max(50).default(10)
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["audit.view"],
          "Vous devez avoir les permissions pour consulter les performances des livreurs"
        );

        // Utiliser le service d'analytics
        const analyticsService = new DeliveryAnalyticsService(ctx.db);
        const performance = await analyticsService.getDelivererPerformance(input.timeRange, input.limit);

        return performance;
      } catch (error) {
        console.error('Error fetching deliverer performance:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des performances des livreurs"
        });
      }
    }),

  // Récupérer les statistiques par zone
  getZoneStatistics: protectedProcedure
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
          ["audit.view"],
          "Vous devez avoir les permissions pour consulter les statistiques par zone"
        );

        // Utiliser le service d'analytics
        const analyticsService = new DeliveryAnalyticsService(ctx.db);
        const stats = await analyticsService.getZoneStatistics(input.timeRange);

        return stats;
      } catch (error) {
        console.error('Error fetching zone statistics:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques par zone"
        });
      }
    }),

  // Exporter les données d'analytics
  exportAnalyticsData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        format: z.enum(["CSV", "XLSX", "PDF"]).default("CSV"),
        includeMetrics: z.boolean().default(true),
        includePerformance: z.boolean().default(true),
        includeZones: z.boolean().default(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["audit.view"],
          "Vous devez avoir les permissions d'export pour exporter les analytics de livraison"
        );

        // Récupérer toutes les données
        const analyticsService = new DeliveryAnalyticsService(ctx.db);
        const [metrics, performance, zones] = await Promise.all([
          input.includeMetrics ? analyticsService.getDeliveryMetrics(input.timeRange) : null,
          input.includePerformance ? analyticsService.getDelivererPerformance(input.timeRange, 50) : null,
          input.includeZones ? analyticsService.getZoneStatistics(input.timeRange) : null
        ]);

        // Créer le contenu d'export
        const rows = [];

        if (metrics) {
          rows.push(['Type', 'Métrique', 'Valeur', 'Période']);
          rows.push(['Métriques', 'Total livraisons', metrics.totalDeliveries.toString(), input.timeRange]);
          rows.push(['Métriques', 'Livraisons complétées', metrics.completedDeliveries.toString(), input.timeRange]);
          rows.push(['Métriques', 'Livraisons en attente', metrics.pendingDeliveries.toString(), input.timeRange]);
          rows.push(['Métriques', 'Livraisons annulées', metrics.cancelledDeliveries.toString(), input.timeRange]);
          rows.push(['Métriques', 'Temps moyen (min)', metrics.averageDeliveryTime.toString(), input.timeRange]);
          rows.push(['Métriques', 'Taux ponctualité (%)', metrics.onTimeDeliveryRate.toString(), input.timeRange]);
          rows.push(['Métriques', 'Note moyenne', metrics.averageRating.toString(), input.timeRange]);
          rows.push(['Métriques', 'Livreurs actifs', metrics.activeDeliverers.toString(), input.timeRange]);
          rows.push(['Métriques', 'Distance totale (km)', metrics.totalDistance.toString(), input.timeRange]);
          rows.push(['Métriques', 'Revenus totaux (€)', metrics.totalRevenue.toString(), input.timeRange]);
        }

        if (performance) {
          rows.push(['Type', 'Livreur', 'Livraisons', 'Note', 'Taux ponctualité (%)', 'Gains (€)']);
          performance.forEach(perf => {
            rows.push([
              'Performance',
              perf.delivererName,
              perf.completedDeliveries.toString(),
              perf.averageRating.toString(),
              perf.onTimeRate.toString(),
              perf.totalEarnings.toString()
            ]);
          });
        }

        if (zones) {
          rows.push(['Type', 'Zone', 'Livraisons', 'Temps moyen (min)', 'Note', 'Revenus (€)']);
          zones.forEach(zone => {
            rows.push([
              'Zone',
              zone.zoneName,
              zone.totalDeliveries.toString(),
              zone.averageTime.toString(),
              zone.averageRating.toString(),
              zone.totalRevenue.toString()
            ]);
          });
        }

        const csvContent = rows
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const filename = `delivery_analytics_${input.timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        
        return {
          downloadUrl: `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
          filename,
          recordCount: rows.length
        };
      } catch (error) {
        console.error('Error exporting analytics data:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export des données d'analytics"
        });
      }
    }),
}); 