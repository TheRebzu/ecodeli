import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour les logs système admin
 * Mission 1 - ADMIN
 */
export const adminLogsRouter = router({ // Récupérer tous les logs avec filtres
  getAll: protectedProcedure
    .input(
      z.object({
        level: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).optional(),
        category: z
          .enum([
            "AUTH",
            "API",
            "DATABASE",
            "PAYMENT",
            "DELIVERY",
            "SYSTEM",
            "USER"])
          .optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        // TODO: Vérifier les permissions admin
        const { user } = ctx.session;

        // Récupérer les logs depuis la base de données
        const whereClause: any = {};

        if (input.level) {
          whereClause.level = input.level;
        }

        if (input.category) {
          whereClause.category = input.category;
        }

        if (input.search) {
          whereClause.OR = [
            { message: { contains: input.search, mode: "insensitive" } },
            { source: { contains: input.search, mode: "insensitive" } }];
        }

        if (input.startDate || input.endDate) {
          whereClause.timestamp = {};
          if (input.startDate) {
            whereClause.timestamp.gte = input.startDate;
          }
          if (input.endDate) {
            whereClause.timestamp.lte = input.endDate;
          }
        }

        // Compter le total pour la pagination
        const total = await ctx.db.systemLog.count({ where  });

        // Récupérer les logs avec pagination
        const logs = await ctx.db.systemLog.findMany({
          where: whereClause,
          orderBy: { timestamp: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          select: {
            id: true,
            timestamp: true,
            level: true,
            category: true,
            message: true,
            details: true,
            source: true}});

        return {
          logs,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit)};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des logs" });
      }
    }),

  // Récupérer un log par ID avec détails complets
  getById: protectedProcedure
    .input(
      z.object({ id: z.string() }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        // Récupérer le log depuis la base de données
        const log = await ctx.db.systemLog.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            timestamp: true,
            level: true,
            category: true,
            message: true,
            details: true,
            source: true,
            context: true}});

        if (!log) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Log non trouvé" });
        }

        return log;
      } catch (error) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Log non trouvé" });
      }
    }),

  // Obtenir les statistiques des logs
  getStats: protectedProcedure
    .input(
      z.object({ period: z.enum(["1h", "24h", "7d", "30d"]).default("24h") }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        // Calculer la période de temps
        const now = new Date();
        let startDate: Date;

        switch (input.period) {
          case "1h":
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case "24h":
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        // Compter le total des logs
        const totalLogs = await ctx.db.systemLog.count({
          where: {
            timestamp: { gte }}});

        // Statistiques par niveau
        const byLevel = await ctx.db.systemLog.groupBy({
          by: ["level"],
          where: {
            timestamp: { gte }},
          count: { id }});

        // Statistiques par catégorie
        const byCategory = await ctx.db.systemLog.groupBy({
          by: ["category"],
          where: {
            timestamp: { gte }},
          count: { id }});

        // Erreurs récentes
        const recentErrors = await ctx.db.systemLog.findMany({
          where: {
            level: "ERROR",
            timestamp: { gte }},
          orderBy: {
            timestamp: "desc"},
          take: 5,
          select: {
            timestamp: true,
            message: true}});

        // Tendances horaires (simplifié)
        const hourlyTrends = await ctx.db.systemLog.groupBy({
          by: ["timestamp"],
          where: {
            timestamp: { gte }},
          count: { id }});

        const stats = {
          totalLogs,
          byLevel: byLevel.reduce(
            (acc, item) => {
              acc[item.level] = item.count.id;
              return acc;
            },
            {} as Record<string, number>,
          ),
          byCategory: byCategory.reduce(
            (acc, item) => {
              acc[item.category] = item.count.id;
              return acc;
            },
            {} as Record<string, number>,
          ),
          recentErrors: recentErrors.map((error) => ({ timestamp: error.timestamp,
            message: error.message,
            count: 1, // Simplifié pour l'instant
           })),
          trends: {
            hourly: hourlyTrends.map((trend, index) => ({ hour: index,
              count: trend.count.id }))}};

        return stats;
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    }),

  // Nettoyer les anciens logs
  cleanup: protectedProcedure
    .input(
      z.object({ olderThan: z.date(),
        level: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // TODO: Vérifier les permissions super admin
        // TODO: Implémenter le nettoyage en base

        // Supprimer les logs selon les critères
        const whereClause: any = {
          createdAt: {
            lt: input.olderThan}};

        if (input.level) {
          whereClause.level = input.level;
        }

        const deletedCount = await ctx.db.systemLog.deleteMany({ where  });

        return {
          success: true,
          deletedCount: deletedCount.count,
          message: `${deletedCount.count} logs supprimés avec succès`};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors du nettoyage des logs" });
      }
    }),

  // Exporter les logs
  export: protectedProcedure
    .input(
      z.object({ format: z.enum(["CSV", "JSON", "TXT"]).default("CSV"),
        filters: z
          .object({
            level: z.enum(["ERROR", "WARN", "INFO", "DEBUG"]).optional(),
            category: z
              .enum([
                "AUTH",
                "API",
                "DATABASE",
                "PAYMENT",
                "DELIVERY",
                "SYSTEM",
                "USER"])
              .optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional() })
          .optional()}),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // TODO: Implémenter l'export réel

        const exportUrl = `/api/admin/logs/export/${Math.random().toString(36).substr(2, 9)}.${input.format.toLowerCase()}`;

        return {
          success: true,
          downloadUrl: exportUrl,
          message: "Export généré avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de l'export des logs" });
      }
    })});
