import { router, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";

export const adminSystemRouter = router({
  /**
   * Récupère les alertes système
   */
  getAlerts: adminProcedure
    .input(
      z
        .object({
          severity: z.enum(["low", "medium", "high", "critical"]).optional(),
          isResolved: z.boolean().optional(),
          limit: z.number().default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const alerts = [];

      // Vérifications en attente
      const pendingVerifications = await prisma.verification.count({
        where: { status: "PENDING" },
      });

      if (pendingVerifications > 5) {
        alerts.push({
          id: "pending-verifications",
          type: "verification",
          severity: "high" as const,
          title: "Vérifications en attente",
          description: `${pendingVerifications} vérifications nécessitent votre attention`,
          timestamp: new Date().toISOString(),
          isResolved: false,
        });
      }

      // Livraisons en retard
      const delayedDeliveries = await prisma.delivery.count({
        where: {
          status: "IN_PROGRESS",
          estimatedDeliveryTime: {
            lt: new Date(),
          },
        },
      });

      if (delayedDeliveries > 0) {
        alerts.push({
          id: "delayed-deliveries",
          type: "delivery",
          severity: "medium" as const,
          title: "Livraisons en retard",
          description: `${delayedDeliveries} livraisons ont dépassé leur heure estimée`,
          timestamp: new Date().toISOString(),
          isResolved: false,
        });
      }

      // Utilisateurs bloqués
      const blockedUsers = await prisma.user.count({
        where: { status: "SUSPENDED" },
      });

      if (blockedUsers > 0) {
        alerts.push({
          id: "blocked-users",
          type: "user",
          severity: "low" as const,
          title: "Utilisateurs suspendus",
          description: `${blockedUsers} utilisateurs sont actuellement suspendus`,
          timestamp: new Date().toISOString(),
          isResolved: false,
        });
      }

      // Paiements en échec
      const failedPayments = await prisma.payment.count({
        where: {
          status: "FAILED",
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
          },
        },
      });

      if (failedPayments > 10) {
        alerts.push({
          id: "failed-payments",
          type: "payment",
          severity: "critical" as const,
          title: "Paiements en échec",
          description: `${failedPayments} paiements ont échoué dans les dernières 24h`,
          timestamp: new Date().toISOString(),
          isResolved: false,
        });
      }

      // Filtrer par sévérité si demandé
      let filteredAlerts = alerts;
      if (input?.severity) {
        filteredAlerts = alerts.filter(
          (alert) => alert.severity === input.severity,
        );
      }

      // Filtrer par statut résolu si demandé
      if (input?.isResolved !== undefined) {
        filteredAlerts = filteredAlerts.filter(
          (alert) => alert.isResolved === input.isResolved,
        );
      }

      // Limiter le nombre de résultats
      return {
        alerts: filteredAlerts.slice(0, input?.limit || 50),
        total: filteredAlerts.length,
      };
    }),

  /**
   * Résoudre une alerte
   */
  resolveAlert: adminProcedure
    .input(
      z.object({
        alertId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // Dans une vraie application, on stockerait les alertes en base de données
      // Pour cet exemple, on retourne simplement un succès
      return {
        success: true,
        alertId: input.alertId,
        resolvedAt: new Date().toISOString(),
      };
    }),

  /**
   * Récupère les métriques système
   */
  getSystemMetrics: adminProcedure.query(async () => {
    const [
      totalUsers,
      activeUsers,
      totalDeliveries,
      activeDeliveries,
      totalAnnouncements,
      activeAnnouncements,
      totalPayments,
      successfulPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          status: "ACTIVE",
          lastActivityAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Actif dans les 30 derniers jours
          },
        },
      }),
      prisma.delivery.count(),
      prisma.delivery.count({
        where: {
          status: {
            in: ["PENDING", "ASSIGNED", "IN_PROGRESS"],
          },
        },
      }),
      prisma.announcement.count(),
      prisma.announcement.count({
        where: {
          status: "ACTIVE",
        },
      }),
      prisma.payment.count(),
      prisma.payment.count({
        where: {
          status: "COMPLETED",
        },
      }),
    ]);

    // Calcul de la santé de la plateforme
    const platformHealth = calculatePlatformHealth({
      activeUsersRatio: activeUsers / totalUsers,
      activeDeliveriesRatio: activeDeliveries / (totalDeliveries || 1),
      paymentSuccessRate: successfulPayments / (totalPayments || 1),
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        ratio: activeUsers / totalUsers,
      },
      deliveries: {
        total: totalDeliveries,
        active: activeDeliveries,
        ratio: activeDeliveries / (totalDeliveries || 1),
      },
      announcements: {
        total: totalAnnouncements,
        active: activeAnnouncements,
        ratio: activeAnnouncements / (totalAnnouncements || 1),
      },
      payments: {
        total: totalPayments,
        successful: successfulPayments,
        successRate: successfulPayments / (totalPayments || 1),
      },
      platformHealth,
    };
  }),

  /**
   * Récupère les logs système
   */
  getSystemLogs: adminProcedure
    .input(
      z.object({
        level: z.enum(["info", "warning", "error", "critical"]).optional(),
        source: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().default(100),
      }),
    )
    .query(async ({ input }) => {
      // Dans une vraie application, on récupérerait les logs depuis un système de logging
      // Pour cet exemple, on utilise les logs d'audit
      const where: any = {};

      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = input.startDate;
        if (input.endDate) where.createdAt.lte = input.endDate;
      }

      const auditLogs = await prisma.auditLog.findMany({
        where,
        take: input.limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return {
        logs: auditLogs.map((log) => ({
          id: log.id,
          level: "info" as const, // Adapter selon le type d'action
          message: `${log.action} on ${log.entityType}`,
          source: log.entityType,
          userId: log.userId,
          userEmail: log.user?.email,
          userName: log.user?.profile
            ? `${log.user.profile.firstName} ${log.user.profile.lastName}`
            : log.user?.email,
          metadata: log.changes,
          timestamp: log.createdAt,
        })),
        total: auditLogs.length,
      };
    }),

  /**
   * Exporte les données système
   */
  exportSystemData: adminProcedure
    .input(
      z.object({
        dataType: z.enum(["alerts", "metrics", "logs"]),
        format: z.enum(["csv", "json"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Dans une vraie application, on générerait un fichier d'export
      // Pour cet exemple, on retourne juste une URL fictive
      const exportId = Math.random().toString(36).substring(7);

      return {
        exportId,
        downloadUrl: `/api/admin/exports/${exportId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expire dans 24h
      };
    }),
});

// Fonction utilitaire pour calculer la santé de la plateforme
function calculatePlatformHealth(metrics: {
  activeUsersRatio: number;
  activeDeliveriesRatio: number;
  paymentSuccessRate: number;
}): number {
  // Pondération des différentes métriques
  const weights = {
    activeUsers: 0.3,
    activeDeliveries: 0.3,
    paymentSuccess: 0.4,
  };

  const score =
    metrics.activeUsersRatio * weights.activeUsers +
    metrics.activeDeliveriesRatio * weights.activeDeliveries +
    metrics.paymentSuccessRate * weights.paymentSuccess;

  // Convertir en pourcentage
  return Math.round(score * 100);
}
