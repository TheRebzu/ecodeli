import { prisma } from "@/lib/db";

export interface AnalyticsTimeframe {
  start: Date;
  end: Date;
  period: "daily" | "weekly" | "monthly" | "yearly";
}

export interface DashboardStats {
  totalUsers: number;
  activeDeliverers: number;
  totalDeliveries: number;
  totalRevenue: number;
  averageRating: number;
  growthMetrics: {
    usersGrowth: number;
    deliveriesGrowth: number;
    revenueGrowth: number;
  };
}

export interface PerformanceMetrics {
  deliverySuccessRate: number;
  averageDeliveryTime: number;
  averageResponseTime: number;
  customerSatisfaction: number;
  repeatCustomerRate: number;
}

export interface RevenueBreakdown {
  deliveries: number;
  services: number;
  subscriptions: number;
  storage: number;
  commissions: number;
}

export interface GeographicStats {
  zone: string;
  deliveries: number;
  revenue: number;
  activeUsers: number;
  averageRating: number;
}

export class AnalyticsService {
  /**
   * Obtenir les statistiques du dashboard principal
   */
  static async getDashboardStats(
    timeframe: AnalyticsTimeframe,
  ): Promise<DashboardStats> {
    const [
      totalUsers,
      activeDeliverers,
      deliveriesStats,
      revenueStats,
      ratingStats,
      previousPeriodStats,
    ] = await Promise.all([
      // Total utilisateurs
      prisma.user.count({
        where: {
          createdAt: { lte: timeframe.end },
        },
      }),

      // Livreurs actifs
      prisma.deliverer.count({
        where: {
          validationStatus: "APPROVED",
          isActive: true,
          lastActiveAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
          },
        },
      }),

      // Statistiques livraisons
      prisma.delivery.aggregate({
        where: {
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        },
        _count: { id: true },
        _sum: { price: true },
      }),

      // Revenus totaux (tous types)
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        },
        _sum: { amount: true },
      }),

      // Notes moyennes
      prisma.review.aggregate({
        where: {
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        },
        _avg: { rating: true },
      }),

      // Période précédente pour calcul de croissance
      this.getPreviousPeriodStats(timeframe),
    ]);

    // Calculer les métriques de croissance
    const growthMetrics = {
      usersGrowth: this.calculateGrowth(totalUsers, previousPeriodStats.users),
      deliveriesGrowth: this.calculateGrowth(
        deliveriesStats._count.id,
        previousPeriodStats.deliveries,
      ),
      revenueGrowth: this.calculateGrowth(
        revenueStats._sum.amount || 0,
        previousPeriodStats.revenue,
      ),
    };

    return {
      totalUsers,
      activeDeliverers,
      totalDeliveries: deliveriesStats._count.id,
      totalRevenue: revenueStats._sum.amount || 0,
      averageRating: ratingStats._avg.rating || 0,
      growthMetrics,
    };
  }

  /**
   * Obtenir les métriques de performance
   */
  static async getPerformanceMetrics(
    timeframe: AnalyticsTimeframe,
  ): Promise<PerformanceMetrics> {
    const [
      deliveryStats,
      avgDeliveryTime,
      avgResponseTime,
      customerSatisfaction,
      repeatCustomers,
    ] = await Promise.all([
      // Taux de succès des livraisons
      prisma.delivery.groupBy({
        by: ["status"],
        where: {
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        },
        _count: { id: true },
      }),

      // Temps moyen de livraison
      prisma.delivery.aggregate({
        where: {
          status: "DELIVERED",
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
          pickedUpAt: { not: null },
          deliveredAt: { not: null },
        },
        _avg: {
          deliveredAt: true, // PostgreSQL calcule automatiquement la différence
        },
      }),

      // Temps de réponse moyen (acceptation d'une annonce)
      prisma.delivery.aggregate({
        where: {
          status: { not: "PENDING" },
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
          acceptedAt: { not: null },
        },
      }),

      // Satisfaction client
      prisma.review.aggregate({
        where: {
          type: "DELIVERY",
          createdAt: {
            gte: timeframe.start,
            lte: timeframe.end,
          },
        },
        _avg: { rating: true },
      }),

      // Taux de clients récurrents
      this.getRepeatCustomerRate(timeframe),
    ]);

    const totalDeliveries = deliveryStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0,
    );
    const successfulDeliveries =
      deliveryStats.find((stat) => stat.status === "DELIVERED")?._count.id || 0;

    return {
      deliverySuccessRate:
        totalDeliveries > 0
          ? (successfulDeliveries / totalDeliveries) * 100
          : 0,
      averageDeliveryTime: 0, // À calculer avec une requête SQL personnalisée
      averageResponseTime: 0, // À calculer avec une requête SQL personnalisée
      customerSatisfaction: customerSatisfaction._avg.rating || 0,
      repeatCustomerRate: repeatCustomers,
    };
  }

  /**
   * Obtenir la répartition des revenus
   */
  static async getRevenueBreakdown(
    timeframe: AnalyticsTimeframe,
  ): Promise<RevenueBreakdown> {
    const payments = await prisma.payment.groupBy({
      by: ["type"],
      where: {
        status: "COMPLETED",
        paidAt: {
          gte: timeframe.start,
          lte: timeframe.end,
        },
      },
      _sum: { amount: true },
    });

    const breakdown: RevenueBreakdown = {
      deliveries: 0,
      services: 0,
      subscriptions: 0,
      storage: 0,
      commissions: 0,
    };

    payments.forEach((payment) => {
      switch (payment.type) {
        case "DELIVERY":
          breakdown.deliveries = payment._sum.amount || 0;
          break;
        case "SERVICE":
          breakdown.services = payment._sum.amount || 0;
          break;
        case "SUBSCRIPTION":
          breakdown.subscriptions = payment._sum.amount || 0;
          break;
        case "STORAGE":
          breakdown.storage = payment._sum.amount || 0;
          break;
        default:
          breakdown.commissions += payment._sum.amount || 0;
      }
    });

    return breakdown;
  }

  /**
   * Obtenir les statistiques géographiques
   */
  static async getGeographicStats(
    timeframe: AnalyticsTimeframe,
  ): Promise<GeographicStats[]> {
    // Cette requête nécessiterait une extension PostGIS pour être optimale
    // Pour l'instant, on groupe par ville extraite de l'adresse
    const stats = (await prisma.$queryRaw`
      SELECT 
        SPLIT_PART(pickup_address, ',', -2) as zone,
        COUNT(d.id) as deliveries,
        SUM(d.price) as revenue,
        COUNT(DISTINCT d."clientId") as active_users,
        AVG(r.rating) as average_rating
      FROM "Delivery" d
      LEFT JOIN "Review" r ON r."deliveryId" = d.id
      WHERE d."createdAt" >= ${timeframe.start}
        AND d."createdAt" <= ${timeframe.end}
      GROUP BY zone
      ORDER BY deliveries DESC
      LIMIT 10
    `) as any[];

    return stats.map((stat) => ({
      zone: stat.zone?.trim() || "Zone inconnue",
      deliveries: parseInt(stat.deliveries),
      revenue: parseFloat(stat.revenue) || 0,
      activeUsers: parseInt(stat.active_users),
      averageRating: parseFloat(stat.average_rating) || 0,
    }));
  }

  /**
   * Exporter les données analytiques
   */
  static async exportAnalytics(
    timeframe: AnalyticsTimeframe,
    format: "csv" | "json" | "pdf",
  ): Promise<{ url: string; filename: string }> {
    const [
      dashboardStats,
      performanceMetrics,
      revenueBreakdown,
      geographicStats,
    ] = await Promise.all([
      this.getDashboardStats(timeframe),
      this.getPerformanceMetrics(timeframe),
      this.getRevenueBreakdown(timeframe),
      this.getGeographicStats(timeframe),
    ]);

    const data = {
      period: `${timeframe.start.toISOString().split("T")[0]} au ${timeframe.end.toISOString().split("T")[0]}`,
      dashboard: dashboardStats,
      performance: performanceMetrics,
      revenue: revenueBreakdown,
      geographic: geographicStats,
      generatedAt: new Date().toISOString(),
    };

    const filename = `analytics-${timeframe.period}-${Date.now()}.${format}`;

    switch (format) {
      case "json":
        // Sauvegarder en JSON et retourner l'URL
        return { url: `/exports/${filename}`, filename };

      case "csv":
        // Convertir en CSV et sauvegarder
        const csv = this.convertToCSV(data);
        return { url: `/exports/${filename}`, filename };

      case "pdf":
        // Générer un PDF avec les graphiques
        const pdfUrl = await this.generateAnalyticsPDF(data, filename);
        return { url: pdfUrl, filename };
    }
  }

  /**
   * Calculer le taux de croissance
   */
  private static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Obtenir les stats de la période précédente
   */
  private static async getPreviousPeriodStats(
    timeframe: AnalyticsTimeframe,
  ): Promise<any> {
    const periodDuration = timeframe.end.getTime() - timeframe.start.getTime();
    const previousStart = new Date(timeframe.start.getTime() - periodDuration);
    const previousEnd = new Date(timeframe.end.getTime() - periodDuration);

    const [users, deliveries, revenue] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
      }),
      prisma.delivery.count({
        where: {
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          paidAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      users,
      deliveries,
      revenue: revenue._sum.amount || 0,
    };
  }

  /**
   * Calculer le taux de clients récurrents
   */
  private static async getRepeatCustomerRate(
    timeframe: AnalyticsTimeframe,
  ): Promise<number> {
    const [totalCustomers, repeatCustomers] = await Promise.all([
      prisma.client.count({
        where: {
          deliveries: {
            some: {
              createdAt: {
                gte: timeframe.start,
                lte: timeframe.end,
              },
            },
          },
        },
      }),
      prisma.client.count({
        where: {
          deliveries: {
            some: {
              createdAt: {
                gte: timeframe.start,
                lte: timeframe.end,
              },
            },
          },
          _count: {
            deliveries: {
              gt: 1,
            },
          },
        },
      }),
    ]);

    return totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
  }

  /**
   * Convertir les données en CSV
   */
  private static convertToCSV(data: any): string {
    // Implémentation de conversion CSV
    return JSON.stringify(data); // Placeholder
  }

  /**
   * Générer un PDF des analytics
   */
  private static async generateAnalyticsPDF(
    data: any,
    filename: string,
  ): Promise<string> {
    // Implémentation génération PDF avec graphiques
    return `/exports/${filename}`; // Placeholder
  }
}
