import { db } from "@/lib/db";
import { AnnouncementType, AnnouncementStatus } from "@prisma/client";

interface AnalyticsTimeframe {
  startDate: Date;
  endDate: Date;
  period: "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
}

interface AnnouncementMetrics {
  totalAnnouncements: number;
  byType: Record<AnnouncementType, number>;
  byStatus: Record<AnnouncementStatus, number>;
  averagePrice: number;
  totalRevenue: number;
  completionRate: number;
  matchingRate: number;
  averageDeliveryTime: number; // heures
  urgentPercentage: number;
  repeatCustomerRate: number;
}

interface PerformanceMetrics {
  // Métriques de matching
  averageMatchTime: number; // minutes
  matchSuccessRate: number;
  averageMatchScore: number;

  // Métriques de livraison
  onTimeDeliveryRate: number;
  averageDeliveryRating: number;
  deliverySuccessRate: number;

  // Métriques business
  customerSatisfactionScore: number;
  delivererRetentionRate: number;
  averageOrderValue: number;
  profitMargin: number;
}

interface GeographicMetrics {
  topCities: Array<{
    city: string;
    count: number;
    revenue: number;
  }>;
  averageDistance: number;
  topRoutes: Array<{
    from: string;
    to: string;
    count: number;
    averagePrice: number;
  }>;
  warehouseUtilization: Array<{
    warehouseId: string;
    name: string;
    utilizationRate: number;
    throughput: number;
  }>;
}

interface UserBehaviorMetrics {
  // Acquisition
  newUsersCount: number;
  registrationConversionRate: number;
  sourceBreakdown: Record<string, number>;

  // Engagement
  averageSessionDuration: number;
  averageAnnouncementsPerUser: number;
  userRetentionRate: number;

  // Monétisation
  averageRevenuePerUser: number;
  subscriptionConversionRate: number;
  churnRate: number;
}

interface PredictiveAnalytics {
  demandForecast: Array<{
    date: Date;
    predictedDemand: number;
    confidence: number;
  }>;
  priceOptimization: {
    currentAveragePrice: number;
    optimizedPrice: number;
    expectedRevenueLift: number;
  };
  capacityPlanning: {
    expectedLoad: number;
    recommendedDeliverers: number;
    peakHours: string[];
  };
}

class AdvancedAnalyticsService {
  /**
   * Obtenir les métriques complètes des annonces
   */
  async getAnnouncementMetrics(
    timeframe: AnalyticsTimeframe,
  ): Promise<AnnouncementMetrics> {
    try {
      const { startDate, endDate } = timeframe;

      // Requête principale pour les annonces
      const announcements = await db.announcement.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          delivery: true,
          payment: true,
          matches: true,
          reviews: true,
        },
      });

      const totalAnnouncements = announcements.length;

      // Métriques par type
      const byType = announcements.reduce(
        (acc, ann) => {
          acc[ann.type] = (acc[ann.type] || 0) + 1;
          return acc;
        },
        {} as Record<AnnouncementType, number>,
      );

      // Métriques par statut
      const byStatus = announcements.reduce(
        (acc, ann) => {
          acc[ann.status] = (acc[ann.status] || 0) + 1;
          return acc;
        },
        {} as Record<AnnouncementStatus, number>,
      );

      // Prix moyen et revenus
      const totalRevenue = announcements.reduce(
        (sum, ann) => sum + (ann.finalPrice || ann.basePrice),
        0,
      );
      const averagePrice = totalRevenue / totalAnnouncements;

      // Taux de complétion
      const completedCount = announcements.filter(
        (ann) => ann.status === "COMPLETED",
      ).length;
      const completionRate = (completedCount / totalAnnouncements) * 100;

      // Taux de matching
      const matchedCount = announcements.filter(
        (ann) => ann.matches.length > 0,
      ).length;
      const matchingRate = (matchedCount / totalAnnouncements) * 100;

      // Temps de livraison moyen
      const deliveredAnnouncements = announcements.filter(
        (ann) => ann.delivery?.deliveredAt,
      );
      const averageDeliveryTime =
        deliveredAnnouncements.length > 0
          ? deliveredAnnouncements.reduce((sum, ann) => {
              const startTime = ann.delivery!.pickedUpAt || ann.createdAt;
              const endTime = ann.delivery!.deliveredAt!;
              return (
                sum +
                (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
              );
            }, 0) / deliveredAnnouncements.length
          : 0;

      // Pourcentage d'urgence
      const urgentCount = announcements.filter((ann) => ann.isUrgent).length;
      const urgentPercentage = (urgentCount / totalAnnouncements) * 100;

      // Taux de clients récurrents
      const uniqueAuthors = new Set(announcements.map((ann) => ann.authorId));
      const repeatCustomers = await db.user.count({
        where: {
          id: { in: Array.from(uniqueAuthors) },
          announcements: {
            some: {
              createdAt: { lt: startDate },
            },
          },
        },
      });
      const repeatCustomerRate = (repeatCustomers / uniqueAuthors.size) * 100;

      return {
        totalAnnouncements,
        byType,
        byStatus,
        averagePrice: Math.round(averagePrice * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        matchingRate: Math.round(matchingRate * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
        urgentPercentage: Math.round(urgentPercentage * 100) / 100,
        repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error calculating announcement metrics:", error);
      throw new Error("Erreur lors du calcul des métriques d'annonces");
    }
  }

  /**
   * Analyser les performances opérationnelles
   */
  async getPerformanceMetrics(
    timeframe: AnalyticsTimeframe,
  ): Promise<PerformanceMetrics> {
    try {
      const { startDate, endDate } = timeframe;

      // Métriques de matching
      const matches = await db.routeMatch.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          announcement: true,
        },
      });

      const averageMatchTime =
        matches.length > 0
          ? matches.reduce((sum, match) => {
              const timeDiff =
                match.createdAt.getTime() -
                match.announcement.createdAt.getTime();
              return sum + timeDiff / (1000 * 60); // en minutes
            }, 0) / matches.length
          : 0;

      const acceptedMatches = matches.filter((m) => m.status === "ACCEPTED");
      const matchSuccessRate = (acceptedMatches.length / matches.length) * 100;

      const averageMatchScore =
        matches.length > 0
          ? (matches.reduce((sum, m) => sum + m.globalScore, 0) /
              matches.length) *
            100
          : 0;

      // Métriques de livraison
      const deliveries = await db.delivery.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: "DELIVERED",
        },
        include: {
          announcement: true,
          reviews: true,
        },
      });

      const onTimeDeliveries = deliveries.filter(
        (d) =>
          d.deliveredAt &&
          d.announcement.deliveryDate &&
          d.deliveredAt <= d.announcement.deliveryDate,
      );
      const onTimeDeliveryRate =
        (onTimeDeliveries.length / deliveries.length) * 100;

      const allReviews = deliveries.flatMap((d) => d.reviews);
      const averageDeliveryRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
          : 0;

      const deliverySuccessRate =
        (deliveries.length /
          matches.filter((m) => m.status === "ACCEPTED").length) *
        100;

      // Métriques business
      const customerSatisfactionScore = averageDeliveryRating * 20; // Conversion sur 100

      const activeDeliverers = await db.user.count({
        where: {
          role: "DELIVERER",
          lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 jours
        },
      });

      const totalDeliverers = await db.user.count({
        where: { role: "DELIVERER" },
      });

      const delivererRetentionRate = (activeDeliverers / totalDeliverers) * 100;

      const payments = await db.payment.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
      });

      const averageOrderValue =
        payments.length > 0
          ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
          : 0;

      // Estimation marge bénéficiaire (15% commission)
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const platformRevenue = totalRevenue * 0.15;
      const profitMargin = 0.15 * 100; // 15%

      return {
        averageMatchTime: Math.round(averageMatchTime * 100) / 100,
        matchSuccessRate: Math.round(matchSuccessRate * 100) / 100,
        averageMatchScore: Math.round(averageMatchScore * 100) / 100,
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100,
        averageDeliveryRating: Math.round(averageDeliveryRating * 100) / 100,
        deliverySuccessRate: Math.round(deliverySuccessRate * 100) / 100,
        customerSatisfactionScore:
          Math.round(customerSatisfactionScore * 100) / 100,
        delivererRetentionRate: Math.round(delivererRetentionRate * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
      };
    } catch (error) {
      console.error("Error calculating performance metrics:", error);
      throw new Error("Erreur lors du calcul des métriques de performance");
    }
  }

  /**
   * Analyser les données géographiques
   */
  async getGeographicMetrics(
    timeframe: AnalyticsTimeframe,
  ): Promise<GeographicMetrics> {
    try {
      const { startDate, endDate } = timeframe;

      // Top villes par nombre d'annonces
      const cityStats = await db.$queryRaw<
        Array<{ city: string; count: bigint; revenue: number }>
      >`
        SELECT 
          SUBSTRING(pickup_address FROM '\\d{5}\\s+([^,]+)') as city,
          COUNT(*) as count,
          SUM(COALESCE(final_price, base_price)) as revenue
        FROM announcements 
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          AND pickup_address IS NOT NULL
        GROUP BY city
        ORDER BY count DESC
        LIMIT 10
      `;

      const topCities = cityStats.map((stat) => ({
        city: stat.city || "Inconnu",
        count: Number(stat.count),
        revenue: Number(stat.revenue) || 0,
      }));

      // Distance moyenne
      const announcements = await db.announcement.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          distance: { not: null },
        },
        select: { distance: true },
      });

      const averageDistance =
        announcements.length > 0
          ? announcements.reduce((sum, ann) => sum + (ann.distance || 0), 0) /
            announcements.length
          : 0;

      // Top routes
      const routeStats = await db.$queryRaw<
        Array<{
          pickup_city: string;
          delivery_city: string;
          count: bigint;
          avg_price: number;
        }>
      >`
        SELECT 
          SUBSTRING(pickup_address FROM '\\d{5}\\s+([^,]+)') as pickup_city,
          SUBSTRING(delivery_address FROM '\\d{5}\\s+([^,]+)') as delivery_city,
          COUNT(*) as count,
          AVG(COALESCE(final_price, base_price)) as avg_price
        FROM announcements 
        WHERE created_at >= ${startDate} AND created_at <= ${endDate}
          AND pickup_address IS NOT NULL AND delivery_address IS NOT NULL
        GROUP BY pickup_city, delivery_city
        HAVING COUNT(*) >= 5
        ORDER BY count DESC
        LIMIT 10
      `;

      const topRoutes = routeStats.map((stat) => ({
        from: stat.pickup_city || "Inconnu",
        to: stat.delivery_city || "Inconnu",
        count: Number(stat.count),
        averagePrice: Math.round(Number(stat.avg_price) * 100) / 100,
      }));

      // Utilisation des entrepôts
      const warehouses = await db.warehouse.findMany({
        include: {
          packages: {
            where: {
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      });

      const warehouseUtilization = warehouses.map((warehouse) => ({
        warehouseId: warehouse.id,
        name: warehouse.name,
        utilizationRate: Math.round(
          (warehouse.packages.length / (warehouse.totalSlots || 1000)) * 100,
        ),
        throughput: warehouse.packages.length,
      }));

      return {
        topCities,
        averageDistance: Math.round(averageDistance * 100) / 100,
        topRoutes,
        warehouseUtilization,
      };
    } catch (error) {
      console.error("Error calculating geographic metrics:", error);
      throw new Error("Erreur lors du calcul des métriques géographiques");
    }
  }

  /**
   * Analyser le comportement des utilisateurs
   */
  async getUserBehaviorMetrics(
    timeframe: AnalyticsTimeframe,
  ): Promise<UserBehaviorMetrics> {
    try {
      const { startDate, endDate } = timeframe;

      // Nouveaux utilisateurs
      const newUsers = await db.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      });

      // Taux de conversion inscription → première annonce
      const newUsersWithAnnouncements = await db.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          announcements: { some: {} },
        },
      });

      const registrationConversionRate =
        (newUsersWithAnnouncements / newUsers) * 100;

      // Sources d'acquisition (simulées - à adapter selon votre tracking)
      const sourceBreakdown = {
        organic: Math.floor(newUsers * 0.4),
        google_ads: Math.floor(newUsers * 0.25),
        facebook: Math.floor(newUsers * 0.15),
        referral: Math.floor(newUsers * 0.12),
        email: Math.floor(newUsers * 0.08),
      };

      // Durée moyenne de session (estimée)
      const avgSessionDuration = 12.5; // minutes - à calculer avec des données réelles

      // Annonces par utilisateur
      const totalAnnouncements = await db.announcement.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      });
      const activeUsers = await db.user.count({
        where: {
          announcements: {
            some: {
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
      });

      const averageAnnouncementsPerUser =
        activeUsers > 0 ? totalAnnouncements / activeUsers : 0;

      // Taux de rétention (utilisateurs actifs cette période qui étaient aussi actifs la période précédente)
      const periodLength = endDate.getTime() - startDate.getTime();
      const previousPeriodStart = new Date(startDate.getTime() - periodLength);
      const previousPeriodEnd = startDate;

      const currentPeriodUsers = await db.user.findMany({
        where: {
          announcements: {
            some: {
              createdAt: { gte: startDate, lte: endDate },
            },
          },
        },
        select: { id: true },
      });

      const retainedUsers = await db.user.count({
        where: {
          id: { in: currentPeriodUsers.map((u) => u.id) },
          announcements: {
            some: {
              createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd },
            },
          },
        },
      });

      const userRetentionRate =
        currentPeriodUsers.length > 0
          ? (retainedUsers / currentPeriodUsers.length) * 100
          : 0;

      // ARPU (Average Revenue Per User)
      const totalRevenue = await db.payment.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        _sum: { amount: true },
      });

      const averageRevenuePerUser =
        activeUsers > 0 ? (totalRevenue._sum.amount || 0) / activeUsers : 0;

      // Taux de conversion abonnement (estimé)
      const subscriptionUsers = await db.subscription.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          plan: { not: "FREE" },
        },
      });

      const subscriptionConversionRate =
        newUsers > 0 ? (subscriptionUsers / newUsers) * 100 : 0;

      // Taux de churn (estimé)
      const churnRate = 100 - userRetentionRate;

      return {
        newUsersCount: newUsers,
        registrationConversionRate:
          Math.round(registrationConversionRate * 100) / 100,
        sourceBreakdown,
        averageSessionDuration: avgSessionDuration,
        averageAnnouncementsPerUser:
          Math.round(averageAnnouncementsPerUser * 100) / 100,
        userRetentionRate: Math.round(userRetentionRate * 100) / 100,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
        subscriptionConversionRate:
          Math.round(subscriptionConversionRate * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100,
      };
    } catch (error) {
      console.error("Error calculating user behavior metrics:", error);
      throw new Error(
        "Erreur lors du calcul des métriques de comportement utilisateur",
      );
    }
  }

  /**
   * Générer des prédictions basées sur l'IA/ML
   */
  async getPredictiveAnalytics(
    timeframe: AnalyticsTimeframe,
  ): Promise<PredictiveAnalytics> {
    try {
      // Prévision de demande (modèle simplifié)
      const historicalData = await db.announcement.groupBy({
        by: ["createdAt"],
        _count: true,
        where: {
          createdAt: { gte: timeframe.startDate, lte: timeframe.endDate },
        },
      });

      // Générer des prévisions pour les 7 prochains jours
      const demandForecast = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i + 1);

        // Simulation d'un modèle de prédiction
        const baseLoad =
          historicalData.length > 0
            ? historicalData.reduce((sum, d) => sum + d._count, 0) /
              historicalData.length
            : 10;

        const weekdayMultiplier = [0.8, 1.2, 1.1, 1.0, 1.3, 0.9, 0.7][
          date.getDay()
        ];
        const predictedDemand = Math.round(baseLoad * weekdayMultiplier);

        return {
          date,
          predictedDemand,
          confidence: Math.random() * 0.3 + 0.7, // 70-100% de confiance
        };
      });

      // Optimisation de prix
      const avgCurrentPrice = await db.announcement.aggregate({
        where: {
          createdAt: { gte: timeframe.startDate, lte: timeframe.endDate },
        },
        _avg: { basePrice: true },
      });

      const currentAveragePrice = avgCurrentPrice._avg.basePrice || 25;
      const optimizedPrice = currentAveragePrice * 1.08; // +8% optimisé
      const expectedRevenueLift = 8.0;

      // Planification de capacité
      const avgDailyLoad =
        historicalData.length > 0
          ? historicalData.reduce((sum, d) => sum + d._count, 0) / 7
          : 10;

      const activeDeliverers = await db.user.count({
        where: {
          role: "DELIVERER",
          lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      return {
        demandForecast,
        priceOptimization: {
          currentAveragePrice: Math.round(currentAveragePrice * 100) / 100,
          optimizedPrice: Math.round(optimizedPrice * 100) / 100,
          expectedRevenueLift: expectedRevenueLift,
        },
        capacityPlanning: {
          expectedLoad: Math.round(avgDailyLoad),
          recommendedDeliverers: Math.ceil(avgDailyLoad * 1.2), // 20% de marge
          peakHours: ["09:00-11:00", "12:00-14:00", "17:00-19:00"],
        },
      };
    } catch (error) {
      console.error("Error generating predictive analytics:", error);
      throw new Error("Erreur lors de la génération des analyses prédictives");
    }
  }

  /**
   * Exporter toutes les métriques en un seul appel
   */
  async getComprehensiveDashboard(timeframe: AnalyticsTimeframe): Promise<{
    announcements: AnnouncementMetrics;
    performance: PerformanceMetrics;
    geographic: GeographicMetrics;
    userBehavior: UserBehaviorMetrics;
    predictive: PredictiveAnalytics;
    generatedAt: Date;
  }> {
    try {
      const [announcements, performance, geographic, userBehavior, predictive] =
        await Promise.all([
          this.getAnnouncementMetrics(timeframe),
          this.getPerformanceMetrics(timeframe),
          this.getGeographicMetrics(timeframe),
          this.getUserBehaviorMetrics(timeframe),
          this.getPredictiveAnalytics(timeframe),
        ]);

      return {
        announcements,
        performance,
        geographic,
        userBehavior,
        predictive,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error("Error generating comprehensive dashboard:", error);
      throw new Error(
        "Erreur lors de la génération du tableau de bord complet",
      );
    }
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
