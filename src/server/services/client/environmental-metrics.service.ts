/**
 * Service de calcul des métriques environnementales pour les clients
 * Calcule l'impact carbone, les emballages réutilisés, et l'EcoScore
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import { prisma } from "@/server/db";

export interface EnvironmentalMetrics {
  carbonSaved: number; // kg de CO2 économisé
  packagesReused: number; // nombre d'emballages réutilisés
  reuseRate: number; // pourcentage de réutilisation
  ecoScore: number; // score environnemental
  ecoLevel: string; // niveau de certification
  monthlyComparison: {
    carbonSavedDiff: number; // différence en %
    packagesReusedDiff: number;
    ecoScoreDiff: number;
  };
  breakdown: {
    deliveriesOptimized: number;
    sharedRoutes: number;
    ecoPackaging: number;
    carbonNeutralDeliveries: number;
  };
}

export interface CarbonFootprintCalculation {
  totalKmSaved: number;
  avgFuelConsumption: number; // L/100km
  carbonFactor: number; // kg CO2/L essence
  carbonSaved: number;
}

export class EnvironmentalMetricsService {
  private readonly CARBON_FACTOR = 2.31; // kg CO2 par litre d'essence
  private readonly AVG_FUEL_CONSUMPTION = 7.5; // L/100km pour véhicule moyen
  private readonly ECO_DELIVERY_BONUS = 0.5; // facteur bonus pour livraisons éco

  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Calcule les métriques environnementales complètes pour un client
   */
  async calculateClientEnvironmentalMetrics(
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EnvironmentalMetrics> {
    try {
      const now = new Date();
      const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      const defaultEndDate = endDate || now;

      // Période précédente pour comparaison
      const prevPeriodStart = new Date(defaultStartDate);
      prevPeriodStart.setMonth(prevPeriodStart.getMonth() - 1);
      const prevPeriodEnd = new Date(defaultEndDate);
      prevPeriodEnd.setMonth(prevPeriodEnd.getMonth() - 1);

      // Exécuter tous les calculs en parallèle
      const [
        currentMetrics,
        previousMetrics,
        packagingMetrics,
        ecoScore,
      ] = await Promise.all([
        this.calculateCarbonFootprint(clientId, defaultStartDate, defaultEndDate),
        this.calculateCarbonFootprint(clientId, prevPeriodStart, prevPeriodEnd),
        this.calculatePackagingMetrics(clientId, defaultStartDate, defaultEndDate),
        this.calculateEcoScore(clientId, defaultStartDate, defaultEndDate),
      ]);

      // Calculer les comparaisons mensuelles
      const carbonSavedDiff = previousMetrics.carbonSaved > 0 
        ? ((currentMetrics.carbonSaved - previousMetrics.carbonSaved) / previousMetrics.carbonSaved) * 100
        : 0;

      const packagesReusedDiff = packagingMetrics.previousMonthCount > 0
        ? ((packagingMetrics.packagesReused - packagingMetrics.previousMonthCount) / packagingMetrics.previousMonthCount) * 100
        : 0;

      // Calculer les détails de répartition
      const breakdown = await this.calculateEnvironmentalBreakdown(
        clientId,
        defaultStartDate,
        defaultEndDate,
      );

      return {
        carbonSaved: currentMetrics.carbonSaved,
        packagesReused: packagingMetrics.packagesReused,
        reuseRate: packagingMetrics.reuseRate,
        ecoScore: ecoScore.score,
        ecoLevel: ecoScore.level,
        monthlyComparison: {
          carbonSavedDiff,
          packagesReusedDiff,
          ecoScoreDiff: ecoScore.monthlyDiff || 0,
        },
        breakdown,
      };
    } catch (error) {
      logger.error("Erreur calcul métriques environnementales:", error);
      throw error;
    }
  }

  /**
   * Calcule l'empreinte carbone économisée grâce aux livraisons optimisées
   */
  private async calculateCarbonFootprint(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CarbonFootprintCalculation> {
    try {
      // Récupérer toutes les livraisons du client dans la période
      const deliveries = await this.prisma.delivery.findMany({
        where: {
          clientId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["DELIVERED", "COMPLETED"],
          },
        },
        include: {
          announcement: {
            select: {
              pickupLatitude: true,
              pickupLongitude: true,
              deliveryLatitude: true,
              deliveryLongitude: true,
              type: true,
            },
          },
          deliverer: {
            select: {
              vehicleType: true,
              isEcoFriendly: true,
            },
          },
        },
      });

      let totalKmSaved = 0;
      let ecoDeliveries = 0;

      for (const delivery of deliveries) {
        if (
          delivery.announcement.pickupLatitude &&
          delivery.announcement.pickupLongitude &&
          delivery.announcement.deliveryLatitude &&
          delivery.announcement.deliveryLongitude
        ) {
          // Calculer la distance directe
          const directDistance = this.calculateDistance(
            delivery.announcement.pickupLatitude,
            delivery.announcement.pickupLongitude,
            delivery.announcement.deliveryLatitude,
            delivery.announcement.deliveryLongitude,
          );

          // Estimer les km économisés par rapport à un transport individuel
          // Facteur d'optimisation basé sur le type de livraison et le véhicule
          let optimizationFactor = 0.3; // 30% d'économie par défaut

          if (delivery.announcement.type === "GROUPED") {
            optimizationFactor = 0.6; // 60% pour livraisons groupées
          } else if (delivery.announcement.type === "SHARED_ROUTE") {
            optimizationFactor = 0.45; // 45% pour itinéraires partagés
          }

          // Bonus pour véhicules éco-friendly
          if (delivery.deliverer?.isEcoFriendly) {
            optimizationFactor += 0.1;
            ecoDeliveries++;
          }

          totalKmSaved += directDistance * optimizationFactor;
        }
      }

      // Calculer l'économie de CO2
      const fuelSaved = (totalKmSaved * this.AVG_FUEL_CONSUMPTION) / 100;
      const carbonSaved = fuelSaved * this.CARBON_FACTOR;

      return {
        totalKmSaved,
        avgFuelConsumption: this.AVG_FUEL_CONSUMPTION,
        carbonFactor: this.CARBON_FACTOR,
        carbonSaved: Math.round(carbonSaved * 10) / 10, // Arrondir à 1 décimale
      };
    } catch (error) {
      logger.error("Erreur calcul empreinte carbone:", error);
      return {
        totalKmSaved: 0,
        avgFuelConsumption: this.AVG_FUEL_CONSUMPTION,
        carbonFactor: this.CARBON_FACTOR,
        carbonSaved: 0,
      };
    }
  }

  /**
   * Calcule les métriques d'emballage et de réutilisation
   */
  private async calculatePackagingMetrics(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    packagesReused: number;
    totalPackages: number;
    reuseRate: number;
    previousMonthCount: number;
  }> {
    try {
      // Récupérer les données d'emballage pour la période actuelle
      const packagingData = await this.prisma.delivery.findMany({
        where: {
          clientId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["DELIVERED", "COMPLETED"],
          },
        },
        select: {
          id: true,
          metadata: true,
          announcement: {
            select: {
              metadata: true,
            },
          },
        },
      });

      let packagesReused = 0;
      let totalPackages = packagingData.length;

      // Analyser les métadonnées pour détecter la réutilisation d'emballages
      for (const delivery of packagingData) {
        const deliveryMeta = delivery.metadata as any;
        const announcementMeta = delivery.announcement.metadata as any;

        // Vérifier si l'emballage a été réutilisé
        if (
          deliveryMeta?.packaging?.reused === true ||
          announcementMeta?.packaging?.type === "REUSABLE" ||
          deliveryMeta?.ecoPackaging === true
        ) {
          packagesReused++;
        }
      }

      // Récupérer les données du mois précédent pour comparaison
      const prevMonthStart = new Date(startDate);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const prevMonthEnd = new Date(endDate);
      prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1);

      const prevMonthData = await this.prisma.delivery.count({
        where: {
          clientId,
          createdAt: {
            gte: prevMonthStart,
            lte: prevMonthEnd,
          },
          status: {
            in: ["DELIVERED", "COMPLETED"],
          },
          metadata: {
            path: ["packaging", "reused"],
            equals: true,
          },
        },
      });

      const reuseRate = totalPackages > 0 ? (packagesReused / totalPackages) * 100 : 0;

      return {
        packagesReused,
        totalPackages,
        reuseRate: Math.round(reuseRate),
        previousMonthCount: prevMonthData,
      };
    } catch (error) {
      logger.error("Erreur calcul métriques emballage:", error);
      return {
        packagesReused: 0,
        totalPackages: 0,
        reuseRate: 0,
        previousMonthCount: 0,
      };
    }
  }

  /**
   * Calcule l'EcoScore du client basé sur ses habitudes de livraison
   */
  private async calculateEcoScore(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    score: number;
    level: string;
    monthlyDiff?: number;
  }> {
    try {
      // Récupérer les données de scoring
      const [deliveryStats, userPreferences, pastScore] = await Promise.all([
        this.getDeliveryEcoStats(clientId, startDate, endDate),
        this.getUserEcoPreferences(clientId),
        this.getPreviousEcoScore(clientId, startDate),
      ]);

      let score = 0;

      // Points pour les livraisons éco (max 400 points)
      score += deliveryStats.ecoDeliveries * 20;
      score += deliveryStats.groupedDeliveries * 15;
      score += deliveryStats.offPeakDeliveries * 10;

      // Points pour les préférences éco (max 200 points)
      if (userPreferences.prefersEcoPackaging) score += 50;
      if (userPreferences.prefersGroupedDeliveries) score += 50;
      if (userPreferences.flexibleTimeSlots) score += 50;
      if (userPreferences.acceptsEcoAlternatives) score += 50;

      // Points pour la régularité (max 200 points)
      const regularityBonus = Math.min(deliveryStats.consecutiveEcoMonths * 25, 200);
      score += regularityBonus;

      // Points pour l'engagement communautaire (max 200 points)
      score += userPreferences.communityEngagement * 10;

      // Limiter le score à 1000 maximum
      score = Math.min(score, 1000);

      // Déterminer le niveau
      let level = "Débutant";
      if (score >= 800) level = "Eco-Expert";
      else if (score >= 600) level = "Eco-Citoyen";
      else if (score >= 400) level = "Eco-Conscient";
      else if (score >= 200) level = "Eco-Apprenti";

      // Calculer la différence avec le mois précédent
      const monthlyDiff = pastScore > 0 ? ((score - pastScore) / pastScore) * 100 : 0;

      return {
        score: Math.round(score),
        level,
        monthlyDiff: Math.round(monthlyDiff),
      };
    } catch (error) {
      logger.error("Erreur calcul EcoScore:", error);
      return {
        score: 0,
        level: "Débutant",
        monthlyDiff: 0,
      };
    }
  }

  /**
   * Calcule la répartition détaillée de l'impact environnemental
   */
  private async calculateEnvironmentalBreakdown(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<EnvironmentalMetrics["breakdown"]> {
    try {
      const deliveries = await this.prisma.delivery.findMany({
        where: {
          clientId,
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ["DELIVERED", "COMPLETED"] },
        },
        include: {
          announcement: {
            select: { type: true, metadata: true },
          },
          deliverer: {
            select: { isEcoFriendly: true, vehicleType: true },
          },
        },
      });

      const breakdown = {
        deliveriesOptimized: 0,
        sharedRoutes: 0,
        ecoPackaging: 0,
        carbonNeutralDeliveries: 0,
      };

      for (const delivery of deliveries) {
        // Livraisons optimisées (groupées ou routes partagées)
        if (["GROUPED", "SHARED_ROUTE"].includes(delivery.announcement.type)) {
          breakdown.deliveriesOptimized++;
        }

        // Routes partagées spécifiquement
        if (delivery.announcement.type === "SHARED_ROUTE") {
          breakdown.sharedRoutes++;
        }

        // Emballages éco
        const metadata = delivery.announcement.metadata as any;
        if (metadata?.packaging?.type === "ECO" || metadata?.ecoPackaging === true) {
          breakdown.ecoPackaging++;
        }

        // Livraisons neutres en carbone
        if (
          delivery.deliverer?.isEcoFriendly ||
          delivery.deliverer?.vehicleType === "ELECTRIC" ||
          delivery.deliverer?.vehicleType === "BIKE"
        ) {
          breakdown.carbonNeutralDeliveries++;
        }
      }

      return breakdown;
    } catch (error) {
      logger.error("Erreur calcul breakdown environnemental:", error);
      return {
        deliveriesOptimized: 0,
        sharedRoutes: 0,
        ecoPackaging: 0,
        carbonNeutralDeliveries: 0,
      };
    }
  }

  /**
   * Méthodes utilitaires privées
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getDeliveryEcoStats(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    ecoDeliveries: number;
    groupedDeliveries: number;
    offPeakDeliveries: number;
    consecutiveEcoMonths: number;
  }> {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        clientId,
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ["DELIVERED", "COMPLETED"] },
      },
      include: {
        announcement: { select: { type: true, createdAt: true } },
        deliverer: { select: { isEcoFriendly: true } },
      },
    });

    let ecoDeliveries = 0;
    let groupedDeliveries = 0;
    let offPeakDeliveries = 0;

    for (const delivery of deliveries) {
      if (delivery.deliverer?.isEcoFriendly) ecoDeliveries++;
      if (delivery.announcement.type === "GROUPED") groupedDeliveries++;

      // Considérer comme off-peak les créations entre 10h-16h ou après 19h
      const hour = delivery.announcement.createdAt.getHours();
      if ((hour >= 10 && hour <= 16) || hour >= 19) {
        offPeakDeliveries++;
      }
    }

    // Calculer les mois consécutifs éco (simplifié)
    const consecutiveEcoMonths = Math.min(Math.floor(ecoDeliveries / 5), 12);

    return {
      ecoDeliveries,
      groupedDeliveries,
      offPeakDeliveries,
      consecutiveEcoMonths,
    };
  }

  private async getUserEcoPreferences(clientId: string): Promise<{
    prefersEcoPackaging: boolean;
    prefersGroupedDeliveries: boolean;
    flexibleTimeSlots: boolean;
    acceptsEcoAlternatives: boolean;
    communityEngagement: number;
  }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { 
          preferences: true,
          notificationPreferences: true,
        },
      });

      const prefs = user?.preferences as any || {};
      
      return {
        prefersEcoPackaging: prefs.ecoPackaging === true,
        prefersGroupedDeliveries: prefs.groupedDeliveries === true,
        flexibleTimeSlots: prefs.flexibleTiming === true,
        acceptsEcoAlternatives: prefs.ecoAlternatives === true,
        communityEngagement: prefs.communityScore || 0,
      };
    } catch (error) {
      return {
        prefersEcoPackaging: false,
        prefersGroupedDeliveries: false,
        flexibleTimeSlots: false,
        acceptsEcoAlternatives: false,
        communityEngagement: 0,
      };
    }
  }

  private async getPreviousEcoScore(clientId: string, currentDate: Date): Promise<number> {
    try {
      // Chercher un score enregistré du mois précédent
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);

      const scoreRecord = await this.prisma.userMetrics.findFirst({
        where: {
          userId: clientId,
          type: "ECO_SCORE",
          createdAt: {
            gte: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1),
            lt: new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1),
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return scoreRecord?.value || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Sauvegarde le score calculé pour référence future
   */
  async saveEcoScore(clientId: string, score: number): Promise<void> {
    try {
      await this.prisma.userMetrics.create({
        data: {
          userId: clientId,
          type: "ECO_SCORE",
          value: score,
          metadata: {
            calculatedAt: new Date().toISOString(),
            version: "1.0",
          },
        },
      });
    } catch (error) {
      logger.error("Erreur sauvegarde EcoScore:", error);
    }
  }
}

// Export du service instancié
export const environmentalMetricsService = new EnvironmentalMetricsService();