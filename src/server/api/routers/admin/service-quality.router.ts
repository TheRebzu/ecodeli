import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { AdminPermissionService } from "@/server/services/admin/admin-permissions.service";
import { ServiceQualityService } from "@/server/services/admin/service-quality.service";

/**
 * Router pour la qualité des services
 * Remplace les données mockées dans service-quality.tsx
 */
export const serviceQualityRouter = router({
  // Récupérer les métriques de qualité
  getQualityMetrics: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        serviceType: z.string().optional()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["service.quality.view"],
          "Vous devez avoir les permissions pour consulter la qualité des services"
        );

        // Utiliser le service de qualité
        const qualityService = new ServiceQualityService(ctx.db);
        const metrics = await qualityService.getQualityMetrics(input.timeRange, input.serviceType);

        return metrics;
      } catch (error) {
        console.error('Error fetching quality metrics:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des métriques de qualité"
        });
      }
    }),

  // Récupérer les statistiques de qualité
  getQualityStats: protectedProcedure
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
          ["service.quality.view"],
          "Vous devez avoir les permissions pour consulter les statistiques de qualité"
        );

        // Utiliser le service de qualité
        const qualityService = new ServiceQualityService(ctx.db);
        const stats = await qualityService.getQualityStats(input.timeRange);

        return stats;
      } catch (error) {
        console.error('Error fetching quality stats:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques de qualité"
        });
      }
    }),

  // Récupérer les actions de qualité
  getQualityActions: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["service.quality.view"],
          "Vous devez avoir les permissions pour consulter les actions de qualité"
        );

        // Utiliser le service de qualité
        const qualityService = new ServiceQualityService(ctx.db);
        const actions = await qualityService.getQualityActions(input.timeRange, input.status);

        return actions;
      } catch (error) {
        console.error('Error fetching quality actions:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des actions de qualité"
        });
      }
    }),

  // Créer une action de qualité
  createQualityAction: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        actionType: z.enum(["IMPROVEMENT", "CORRECTION", "TRAINING", "SUSPENSION"]),
        title: z.string(),
        description: z.string(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        dueDate: z.date().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["service.quality.manage"],
          "Vous devez avoir les permissions pour créer des actions de qualité"
        );

        // Créer l'action via le service
        const qualityService = new ServiceQualityService(ctx.db);
        const action = await qualityService.createQualityAction({
          ...input,
          assignedTo: user.id
        });

        return action;
      } catch (error) {
        console.error('Error creating quality action:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'action de qualité"
        });
      }
    }),

  // Mettre à jour le statut d'une action
  updateActionStatus: protectedProcedure
    .input(
      z.object({
        actionId: z.string(),
        status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
        comments: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["service.quality.manage"],
          "Vous devez avoir les permissions pour modifier les actions de qualité"
        );

        // Mettre à jour via le service
        const qualityService = new ServiceQualityService(ctx.db);
        const action = await qualityService.updateActionStatus(
          input.actionId,
          input.status,
          user.id,
          input.comments
        );

        return action;
      } catch (error) {
        console.error('Error updating action status:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du statut de l'action"
        });
      }
    }),

  // Exporter les données de qualité
  exportQualityData: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
        format: z.enum(["CSV", "XLSX", "PDF"]).default("CSV"),
        includeMetrics: z.boolean().default(true),
        includeActions: z.boolean().default(true)
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier les permissions admin
        const { user } = ctx.session;
        const permissionService = new AdminPermissionService(ctx.db);
        await permissionService.requireAdminPermissions(
          user.id,
          ["service.quality.export"],
          "Vous devez avoir les permissions d'export pour exporter les données de qualité"
        );

        // Récupérer les données à exporter
        const qualityService = new ServiceQualityService(ctx.db);
        const [metrics, actions] = await Promise.all([
          input.includeMetrics ? qualityService.getQualityMetrics(input.timeRange) : null,
          input.includeActions ? qualityService.getQualityActions(input.timeRange) : null
        ]);

        // Créer le contenu CSV
        const rows = [];
        
        if (metrics) {
          rows.push(['Type', 'Service', 'Note', 'Nombre évaluations', 'Période']);
          metrics.forEach(metric => {
            rows.push([
              'Métrique',
              metric.serviceName,
              metric.averageRating.toString(),
              metric.totalReviews.toString(),
              input.timeRange
            ]);
          });
        }

        if (actions) {
          rows.push(['Type', 'Action', 'Statut', 'Priorité', 'Date création']);
          actions.forEach(action => {
            rows.push([
              'Action',
              action.title,
              action.status,
              action.priority,
              action.createdAt.toISOString().split('T')[0]
            ]);
          });
        }

        const csvContent = rows
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const filename = `quality_data_${input.timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
        
        return {
          downloadUrl: `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
          filename,
          recordCount: rows.length
        };
      } catch (error) {
        console.error('Error exporting quality data:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export des données de qualité"
        });
      }
    }),
}); 