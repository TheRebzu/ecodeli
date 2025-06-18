import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AdminPermissionService } from "@/server/services/admin/admin-permissions.service";
import { UserActivityService } from "@/server/services/admin/user-activity.service";

/**
 * Router pour les logs d'activité utilisateur
 * Remplace les données mockées dans les composants admin
 */
export const userActivityRouter = router({
  // Récupérer les logs d'activité avec filtres
  getActivityLogs: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        userRole: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER", "ADMIN"]).optional(),
        category: z.enum(["AUTH", "PAYMENT", "DELIVERY", "SERVICE", "ADMIN", "SECURITY"]).optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
        success: z.boolean().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["user_management.view", "audit.view"],
          "Vous devez avoir les permissions d'audit pour consulter les logs d'activité"
        );

        // Utiliser le service d'activité utilisateur
        const activityService = new UserActivityService(ctx.db);
        const result = await activityService.getActivityLogs(input);

        return result;
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des logs d'activité"
        });
      }
    }),

  // Récupérer les statistiques d'activité
  getActivityStats: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["1h", "24h", "7d", "30d"]).default("24h")
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
          "Vous devez avoir les permissions d'audit pour consulter les statistiques"
        );

        // Utiliser le service d'activité utilisateur
        const activityService = new UserActivityService(ctx.db);
        const stats = await activityService.getActivityStats(input.timeRange);

        return stats;
      } catch (error) {
        console.error('Error fetching activity stats:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques d'activité"
        });
      }
    }),

  // Exporter les logs d'activité
  exportActivityLogs: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        userRole: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER", "ADMIN"]).optional(),
        category: z.enum(["AUTH", "PAYMENT", "DELIVERY", "SERVICE", "ADMIN", "SECURITY"]).optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        search: z.string().optional(),
        success: z.boolean().optional(),
        format: z.enum(["CSV", "JSON", "XLSX"]).default("CSV")
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["audit.export"],
          "Vous devez avoir les permissions d'export pour exporter les logs"
        );

        // Utiliser le service d'activité utilisateur
        const activityService = new UserActivityService(ctx.db);
        const exportData = await activityService.exportActivityLogs(
          {
            userId: input.userId,
            userRole: input.userRole,
            category: input.category,
            severity: input.severity,
            dateFrom: input.dateFrom,
            dateTo: input.dateTo,
            search: input.search,
            success: input.success,
          },
          input.format
        );

        // Log de l'export
        await activityService.logActivity({
          userId: user.id,
          action: 'EXPORT_ACTIVITY_LOGS',
          category: 'ADMIN',
          description: `Export des logs d'activité au format ${input.format}`,
          ipAddress: ctx.req?.headers['x-forwarded-for'] as string || ctx.req?.connection?.remoteAddress || 'unknown',
          userAgent: ctx.req?.headers['user-agent'] || 'unknown',
          metadata: {
            format: input.format,
            filters: input
          },
          severity: 'LOW',
          success: true
        });

        return {
          downloadUrl: `data:${exportData.mimeType};base64,${Buffer.from(exportData.data).toString('base64')}`,
          filename: exportData.filename,
          recordCount: exportData.data.split('\n').length - 1 // Approximation pour CSV
        };
      } catch (error) {
        console.error('Error exporting activity logs:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export des logs d'activité"
        });
      }
    }),

  // Enregistrer une activité utilisateur (pour les autres services)
  logActivity: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        action: z.string(),
        category: z.enum(["AUTH", "PAYMENT", "DELIVERY", "SERVICE", "ADMIN", "SECURITY"]),
        description: z.string(),
        ipAddress: z.string(),
        userAgent: z.string(),
        location: z.string().optional(),
        metadata: z.record(z.any()).optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        success: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const activityService = new UserActivityService(ctx.db);
        const activityLog = await activityService.logActivity(input);

        return {
          success: true,
          id: activityLog.id
        };
      } catch (error) {
        console.error('Error logging activity:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'enregistrement de l'activité"
        });
      }
    }),
});