import { router, adminProcedure } from '@/server/api/trpc';
import { dashboardService } from '@/server/services/dashboard.service';
import { z } from 'zod';

export const adminDashboardRouter = router({
  /**
   * Récupère toutes les données du tableau de bord
   */
  getDashboardData: adminProcedure.input(z.object({}).optional()).query(async () => {
    try {
      return await dashboardService.getDashboardData();
    } catch (error) {
      console.error('Erreur dans le router getDashboardData:', error);
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
    .query(async ({ input }) => {
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
});
