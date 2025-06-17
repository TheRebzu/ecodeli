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
        // Implémentation complète de l'export des logs
        const exportData = await generateLogsExport(ctx.db, input.format, input.filters);
        
        return {
          success: true,
          downloadUrl: exportData.downloadUrl,
          fileName: exportData.fileName,
          recordCount: exportData.recordCount,
          message: `Export généré avec succès: ${exportData.recordCount} entrées`};
      } catch (error) {
        console.error('Erreur lors de l\'export des logs:', error);
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Erreur lors de l'export des logs" });
      }
    })});

/**
 * Génère un export complet des logs selon le format spécifié
 */
async function generateLogsExport(
  db: any, 
  format: 'CSV' | 'JSON' | 'TXT', 
  filters?: {
    level?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  downloadUrl: string;
  fileName: string;
  recordCount: number;
}> {
  try {
    // Construire les filtres de requête
    const whereClause: any = {};
    
    if (filters?.level) {
      whereClause.level = filters.level;
    }
    
    if (filters?.category) {
      whereClause.category = filters.category;
    }
    
    if (filters?.startDate || filters?.endDate) {
      whereClause.timestamp = {};
      if (filters.startDate) {
        whereClause.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.timestamp.lte = filters.endDate;
      }
    }

    // Récupérer les logs avec pagination pour éviter la surcharge mémoire
    const logs = await db.systemLog.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 10000, // Limiter à 10k entrées pour éviter les timeouts
      select: {
        id: true,
        timestamp: true,
        level: true,
        category: true,
        message: true,
        details: true,
        source: true,
        context: true
      }
    });

    // Générer le contenu selon le format
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `ecodeli-logs-${timestamp}.${format.toLowerCase()}`;
    let exportContent: string;

    switch (format) {
      case 'CSV':
        exportContent = generateCSVExport(logs);
        break;
      case 'JSON':
        exportContent = generateJSONExport(logs);
        break;
      case 'TXT':
        exportContent = generateTXTExport(logs);
        break;
      default:
        throw new Error(`Format d'export non supporté: ${format}`);
    }

    // Sauvegarder le fichier temporairement
    const downloadUrl = await saveExportFile(fileName, exportContent);

    console.log(`📊 Export logs généré: ${logs.length} entrées en format ${format}`);

    return {
      downloadUrl,
      fileName,
      recordCount: logs.length
    };
  } catch (error) {
    console.error('Erreur lors de la génération de l\'export:', error);
    throw error;
  }
}

/**
 * Génère un export au format CSV
 */
function generateCSVExport(logs: any[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Level',
    'Category', 
    'Message',
    'Details',
    'Source',
    'Context'
  ];

  const csvLines = [headers.join(',')];

  for (const log of logs) {
    const row = [
      `"${log.id}"`,
      `"${log.timestamp.toISOString()}"`,
      `"${log.level}"`,
      `"${log.category || ''}"`,
      `"${(log.message || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
      `"${log.source || ''}"`,
      `"${JSON.stringify(log.context || {}).replace(/"/g, '""')}"`
    ];
    csvLines.push(row.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Génère un export au format JSON
 */
function generateJSONExport(logs: any[]): string {
  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      recordCount: logs.length,
      format: 'JSON',
      version: '1.0'
    },
    logs: logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      category: log.category,
      message: log.message,
      details: log.details,
      source: log.source,
      context: log.context
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Génère un export au format TXT lisible
 */
function generateTXTExport(logs: any[]): string {
  const lines = [
    '========================================',
    'ECODELI - EXPORT DES LOGS SYSTÈME',
    '========================================',
    `Généré le: ${new Date().toLocaleString('fr-FR')}`,
    `Nombre d'entrées: ${logs.length}`,
    '========================================',
    ''
  ];

  for (const log of logs) {
    lines.push(`[${log.timestamp.toLocaleString('fr-FR')}] ${log.level} - ${log.category || 'GENERAL'}`);
    lines.push(`Message: ${log.message}`);
    
    if (log.source) {
      lines.push(`Source: ${log.source}`);
    }
    
    if (log.details && Object.keys(log.details).length > 0) {
      lines.push(`Détails: ${JSON.stringify(log.details, null, 2)}`);
    }
    
    if (log.context && Object.keys(log.context).length > 0) {
      lines.push(`Contexte: ${JSON.stringify(log.context, null, 2)}`);
    }
    
    lines.push('----------------------------------------');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Sauvegarde temporairement un fichier d'export et retourne l'URL de téléchargement
 */
async function saveExportFile(fileName: string, content: string): Promise<string> {
  try {
    // En production, utiliser un stockage cloud (S3, etc.)
    // Pour cette implémentation, simuler la sauvegarde
    const fs = await import('fs');
    const path = await import('path');
    
    const exportsDir = path.join(process.cwd(), 'temp', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');
    
    // Générer une URL de téléchargement temporaire
    const downloadUrl = `/api/exports/${fileName}`;
    
    // Programmer la suppression du fichier après 1 heure
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Fichier d'export supprimé: ${fileName}`);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier d\'export:', error);
      }
    }, 60 * 60 * 1000); // 1 heure
    
    console.log(`💾 Fichier d'export sauvegardé: ${fileName}`);
    return downloadUrl;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du fichier d\'export:', error);
    throw new Error('Impossible de sauvegarder le fichier d\'export');
  }
}
