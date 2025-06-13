import { router, adminProcedure } from "@/server/api/trpc";
import { dashboardService } from "@/server/services/admin/dashboard.service";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const adminDashboardRouter = router({
  /**
   * Récupère les statistiques générales du dashboard
   */
  getOverviewStats: adminProcedure
    .input(
      z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }),
    )
    .query(async ({ input: _input }) => {
      try {
        // Utilise getDashboardData comme source pour les statistiques overview
        const dashboardData = await dashboardService.getDashboardData();
        return {
          userStats: dashboardData.userStats,
          deliveryStats: dashboardData.deliveryStats,
          transactionStats: dashboardData.transactionStats,
          warehouseStats: dashboardData.warehouseStats,
          documentStats: dashboardData.documentStats,
          timeRange: {
            startDate: input.startDate,
            endDate: input.endDate,
          },
        };
      } catch (_error) {
        console.error("Erreur dans getOverviewStats:", error);
        throw error;
      }
    }),

  /**
   * Récupère toutes les données du tableau de bord
   */
  getDashboardData: adminProcedure
    .input(z.object({}).optional())
    .query(async () => {
      try {
        return await dashboardService.getDashboardData();
      } catch (_error) {
        console.error("Erreur dans le router getDashboardData:", error);
        throw error;
      }
    }),

  /**
   * Récupère les statistiques utilisateurs uniquement
   */
  getUserStats: adminProcedure.query(async () => {
    return await dashboardService.getUserStats();
  }),

  /**
   * Récupère les statistiques documents uniquement
   */
  getDocumentStats: adminProcedure.query(async () => {
    return await dashboardService.getDocumentStats();
  }),

  /**
   * Récupère les statistiques transactions uniquement
   */
  getTransactionStats: adminProcedure.query(async () => {
    return await dashboardService.getTransactionStats();
  }),

  /**
   * Récupère les statistiques entrepôts uniquement
   */
  getWarehouseStats: adminProcedure.query(async () => {
    return await dashboardService.getWarehouseStats();
  }),

  /**
   * Récupère les statistiques livraisons uniquement
   */
  getDeliveryStats: adminProcedure.query(async () => {
    return await dashboardService.getDeliveryStats();
  }),

  /**
   * Récupère les activités récentes
   */
  getRecentActivities: adminProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ input: _input }) => {
      const limit = input?.limit || 10;
      return await dashboardService.getRecentActivities(limit);
    }),

  /**
   * Récupère les données du graphique d'activité
   */
  getActivityChartData: adminProcedure.query(async () => {
    return await dashboardService.getActivityChartData();
  }),

  /**
   * Récupère les éléments nécessitant une action
   */
  getActionItems: adminProcedure.query(async () => {
    return await dashboardService.getActionItems();
  }),

  /**
   * Récupère les rapports de ventes
   */
  getSalesReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        granularity: z.enum(["day", "week", "month", "quarter", "year"]),
        comparison: z.boolean().optional(),
        categoryFilter: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        // Vérifier que les dates sont valides
        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début",
          });
        }

        return await dashboardService.getSalesReport({
          startDate: input.startDate,
          endDate: input.endDate,
          granularity: input.granularity,
          comparison: input.comparison || false,
          categoryFilter: input.categoryFilter,
        });
      } catch (_error) {
        console.error("Erreur dans le rapport de ventes:", error);
        throw error;
      }
    }),

  /**
   * Récupère les rapports d'activité utilisateur
   */
  getUserActivityReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        granularity: z.enum(["day", "week", "month", "quarter", "year"]),
        comparison: z.boolean().optional(),
        userRoleFilter: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        // Vérifier que les dates sont valides
        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début",
          });
        }

        return await dashboardService.getUserActivityReport({
          startDate: input.startDate,
          endDate: input.endDate,
          granularity: input.granularity,
          comparison: input.comparison || false,
          userRoleFilter: input.userRoleFilter,
        });
      } catch (_error) {
        console.error("Erreur dans le rapport d'activité utilisateur:", error);
        throw error;
      }
    }),

  /**
   * Récupère les rapports de performance de livraison
   */
  getDeliveryPerformanceReport: adminProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        granularity: z.enum(["day", "week", "month", "quarter", "year"]),
        comparison: z.boolean().optional(),
        zoneFilter: z.string().optional(),
        delivererFilter: z.string().optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        // Vérifier que les dates sont valides
        if (input.endDate < input.startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début",
          });
        }

        return await dashboardService.getDeliveryPerformanceReport({
          startDate: input.startDate,
          endDate: input.endDate,
          granularity: input.granularity,
          comparison: input.comparison || false,
          zoneFilter: input.zoneFilter,
          delivererFilter: input.delivererFilter,
        });
      } catch (_error) {
        console.error(
          "Erreur dans le rapport de performance de livraison:",
          error,
        );
        throw error;
      }
    }),
});
