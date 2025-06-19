import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { environmentalMetricsService } from "@/server/services/client/environmental-metrics.service";

export const clientDashboardRouter = createTRPCRouter({
  getStats: protectedProcedure
    .input(z.object({
      timeframe: z.enum(["week", "month", "year"]).default("month")
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "client") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès restreint aux clients"
        });
      }

      const userId = ctx.session.user.id;
      const now = new Date();
      let startDate: Date;

      // Calculer la période selon le timeframe
      switch (input.timeframe) {
        case "week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case "year":
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      try {
        // Récupérer les statistiques réelles depuis la base de données
        const [
          announcements,
          deliveries,
          payments,
          services,
          storageBoxes,
          environmentalMetrics
        ] = await Promise.all([
          // Nombre d'annonces créées
          ctx.prisma.announcement.count({
            where: {
              clientId: userId,
              createdAt: { gte: startDate, lte: now }
            }
          }),
          
          // Livraisons complétées
          ctx.prisma.delivery.count({
            where: {
              clientId: userId,
              createdAt: { gte: startDate, lte: now },
              status: { in: ["DELIVERED", "COMPLETED"] }
            }
          }),

          // Total des paiements
          ctx.prisma.payment.aggregate({
            where: {
              userId: userId,
              createdAt: { gte: startDate, lte: now },
              status: "COMPLETED"
            },
            _sum: { amount: true }
          }),

          // Services réservés
          ctx.prisma.serviceBooking.count({
            where: {
              clientId: userId,
              createdAt: { gte: startDate, lte: now }
            }
          }),

          // Boxes de stockage actives
          ctx.prisma.boxReservation.count({
            where: {
              clientId: userId,
              status: "ACTIVE"
            }
          }),

          // Métriques environnementales
          environmentalMetricsService.calculateClientEnvironmentalMetrics(
            userId,
            startDate,
            now
          )
        ]);

        // Calculer les données de la période précédente pour les comparaisons
        let prevStartDate: Date;
        switch (input.timeframe) {
          case "week":
            prevStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            prevStartDate = new Date(startDate);
            prevStartDate.setFullYear(prevStartDate.getFullYear() - 1);
            break;
          default: // month
            prevStartDate = new Date(startDate);
            prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        }

        const [
          prevAnnouncements,
          prevDeliveries,
          prevPayments,
          prevServices
        ] = await Promise.all([
          ctx.prisma.announcement.count({
            where: {
              clientId: userId,
              createdAt: { gte: prevStartDate, lt: startDate }
            }
          }),
          ctx.prisma.delivery.count({
            where: {
              clientId: userId,
              createdAt: { gte: prevStartDate, lt: startDate },
              status: { in: ["DELIVERED", "COMPLETED"] }
            }
          }),
          ctx.prisma.payment.aggregate({
            where: {
              userId: userId,
              createdAt: { gte: prevStartDate, lt: startDate },
              status: "COMPLETED"
            },
            _sum: { amount: true }
          }),
          ctx.prisma.serviceBooking.count({
            where: {
              clientId: userId,
              createdAt: { gte: prevStartDate, lt: startDate }
            }
          })
        ]);

        // Calculer les pourcentages de changement
        const calculateChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const stats = [
          {
            id: "announcements",
            title: "Mes annonces",
            value: announcements,
            previousValue: prevAnnouncements,
            change: calculateChange(announcements, prevAnnouncements),
            changeType: announcements >= prevAnnouncements ? "increase" as const : "decrease" as const,
            trend: [], // TODO: Implémenter si nécessaire
            icon: "Package",
            color: "text-blue-600",
            bgColor: "bg-blue-100",
            description: `Annonces créées ${input.timeframe === "week" ? "cette semaine" : input.timeframe === "month" ? "ce mois" : "cette année"}`
          },
          {
            id: "deliveries",
            title: "Livraisons",
            value: deliveries,
            previousValue: prevDeliveries,
            change: calculateChange(deliveries, prevDeliveries),
            changeType: deliveries >= prevDeliveries ? "increase" as const : "decrease" as const,
            trend: [],
            icon: "Truck",
            color: "text-green-600",
            bgColor: "bg-green-100",
            description: "Livraisons complétées"
          },
          {
            id: "spending",
            title: "Dépenses",
            value: payments._sum.amount ? Number(payments._sum.amount) / 100 : 0, // Conversion centimes vers euros
            previousValue: prevPayments._sum.amount ? Number(prevPayments._sum.amount) / 100 : 0,
            change: calculateChange(
              payments._sum.amount ? Number(payments._sum.amount) : 0,
              prevPayments._sum.amount ? Number(prevPayments._sum.amount) : 0
            ),
            changeType: (payments._sum.amount || 0) >= (prevPayments._sum.amount || 0) ? "increase" as const : "decrease" as const,
            trend: [],
            unit: "€",
            icon: "Euro",
            color: "text-purple-600",
            bgColor: "bg-purple-100",
            description: "Total dépensé"
          },
          {
            id: "services",
            title: "Services utilisés",
            value: services,
            previousValue: prevServices,
            change: calculateChange(services, prevServices),
            changeType: services >= prevServices ? "increase" as const : "decrease" as const,
            trend: [],
            icon: "Calendar",
            color: "text-orange-600",
            bgColor: "bg-orange-100",
            description: "Services réservés"
          },
          {
            id: "eco_score",
            title: "EcoScore",
            value: environmentalMetrics.ecoScore,
            change: environmentalMetrics.monthlyComparison.ecoScoreDiff,
            changeType: environmentalMetrics.monthlyComparison.ecoScoreDiff >= 0 ? "increase" as const : "decrease" as const,
            trend: [],
            unit: "pts",
            icon: "Leaf",
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
            description: `Niveau: ${environmentalMetrics.ecoLevel}`
          },
          {
            id: "storage",
            title: "Entreposage",
            value: storageBoxes,
            changeType: "neutral" as const,
            trend: [],
            unit: "boxes",
            icon: "Package",
            color: "text-indigo-600",
            bgColor: "bg-indigo-100",
            description: "Boxes actives"
          }
        ];

        return stats;
      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    }),

  getEnvironmentalMetrics: protectedProcedure
    .input(z.object({
      timeframe: z.enum(["week", "month", "year"]).default("month")
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.session.user.role !== "client") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès restreint aux clients"
        });
      }

      const userId = ctx.session.user.id;
      const now = new Date();
      let startDate: Date;

      // Calculer la période selon le timeframe
      switch (input.timeframe) {
        case "week":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case "year":
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      try {
        const environmentalMetrics = await environmentalMetricsService.calculateClientEnvironmentalMetrics(
          userId,
          startDate,
          now
        );

        // Récupérer les réalisations récentes depuis la base de données
        const achievements = await ctx.prisma.userAchievement.findMany({
          where: {
            userId: userId,
            earnedAt: { gte: startDate }
          },
          include: {
            achievement: true
          },
          orderBy: { earnedAt: "desc" },
          take: 5
        });

        // Calculer l'équivalent en énergie et eau économisées
        const energySaved = environmentalMetrics.carbonSaved * 4.5; // Approximation: 1kg CO2 = 4.5 kWh
        const waterSaved = environmentalMetrics.carbonSaved * 60; // Approximation: 1kg CO2 = 60L eau

        const formattedMetrics = {
          co2Saved: {
            current: environmentalMetrics.carbonSaved,
            monthly: environmentalMetrics.carbonSaved,
            yearly: environmentalMetrics.carbonSaved * 12, // Estimation
            goal: input.timeframe === "month" ? 50 : input.timeframe === "week" ? 12 : 600,
            unit: "kg" as const
          },
          ecoScore: {
            current: environmentalMetrics.ecoScore,
            level: environmentalMetrics.ecoLevel,
            nextLevel: getNextEcoLevel(environmentalMetrics.ecoLevel),
            pointsToNext: getPointsToNextLevel(environmentalMetrics.ecoScore, environmentalMetrics.ecoLevel),
            maxPoints: 1000
          },
          recyclingRate: {
            percentage: Math.round(environmentalMetrics.reuseRate),
            itemsCount: environmentalMetrics.packagesReused,
            goal: 90
          },
          energySaved: {
            current: Math.round(energySaved * 10) / 10,
            unit: "kWh" as const,
            equivalent: `Équivalent à ${Math.round(energySaved / 40)} jours d'électricité pour un foyer`
          },
          waterSaved: {
            current: Math.round(waterSaved),
            unit: "L" as const,
            equivalent: `Équivalent à ${Math.round(waterSaved / 150)} douches de 8 minutes`
          },
          achievements: achievements.map(a => ({
            id: a.id,
            title: a.achievement.title,
            description: a.achievement.description,
            icon: a.achievement.icon || "🏆",
            earnedAt: a.earnedAt,
            category: (a.achievement.category || "eco") as "eco" | "delivery" | "service"
          })),
          trends: {
            co2Trend: await getCO2Trend(ctx.prisma, userId, input.timeframe),
            scoreTrend: await getScoreTrend(ctx.prisma, userId, input.timeframe)
          }
        };

        return formattedMetrics;
      } catch (error) {
        console.error("Erreur lors de la récupération des métriques environnementales:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des métriques environnementales"
        });
      }
    })
});

// Fonctions utilitaires
function getNextEcoLevel(currentLevel: string): string {
  const levels = ["Débutant", "Eco-Apprenti", "Eco-Conscient", "Eco-Citoyen", "Eco-Expert"];
  const currentIndex = levels.indexOf(currentLevel);
  return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : currentLevel;
}

function getPointsToNextLevel(currentScore: number, currentLevel: string): number {
  const thresholds = {
    "Débutant": 200,
    "Eco-Apprenti": 400,
    "Eco-Conscient": 600,
    "Eco-Citoyen": 800,
    "Eco-Expert": 1000
  };
  
  const nextLevel = getNextEcoLevel(currentLevel);
  const nextThreshold = thresholds[nextLevel as keyof typeof thresholds];
  return Math.max(0, nextThreshold - currentScore);
}

async function getCO2Trend(prisma: any, userId: string, timeframe: string) {
  // Récupérer les données de tendance CO2 des dernières périodes
  const periods = timeframe === "week" ? 4 : timeframe === "month" ? 6 : 12;
  const trend = [];
  
  for (let i = periods - 1; i >= 0; i--) {
    const endDate = new Date();
    const startDate = new Date();
    
    if (timeframe === "week") {
      startDate.setDate(endDate.getDate() - (i + 1) * 7);
      endDate.setDate(endDate.getDate() - i * 7);
    } else if (timeframe === "month") {
      startDate.setMonth(endDate.getMonth() - (i + 1));
      endDate.setMonth(endDate.getMonth() - i);
    } else {
      startDate.setFullYear(endDate.getFullYear() - (i + 1));
      endDate.setFullYear(endDate.getFullYear() - i);
    }

    const metrics = await environmentalMetricsService.calculateClientEnvironmentalMetrics(
      userId,
      startDate,
      endDate
    );

    trend.push({
      period: timeframe === "week" ? `S${periods - i}` : 
              timeframe === "month" ? `M${periods - i}` : 
              `A${periods - i}`,
      value: metrics.carbonSaved
    });
  }

  return trend;
}

async function getScoreTrend(prisma: any, userId: string, timeframe: string) {
  // Récupérer l'historique des scores EcoScore
  const periods = timeframe === "week" ? 4 : timeframe === "month" ? 6 : 12;
  const trend = [];

  for (let i = periods - 1; i >= 0; i--) {
    const endDate = new Date();
    const startDate = new Date();
    
    if (timeframe === "week") {
      startDate.setDate(endDate.getDate() - (i + 1) * 7);
      endDate.setDate(endDate.getDate() - i * 7);
    } else if (timeframe === "month") {
      startDate.setMonth(endDate.getMonth() - (i + 1));
      endDate.setMonth(endDate.getMonth() - i);
    } else {
      startDate.setFullYear(endDate.getFullYear() - (i + 1));
      endDate.setFullYear(endDate.getFullYear() - i);
    }

    const scoreRecord = await prisma.userMetrics.findFirst({
      where: {
        userId: userId,
        type: "ECO_SCORE",
        createdAt: { gte: startDate, lt: endDate }
      },
      orderBy: { createdAt: "desc" }
    });

    trend.push({
      period: timeframe === "week" ? `S${periods - i}` : 
              timeframe === "month" ? `M${periods - i}` : 
              `A${periods - i}`,
      value: scoreRecord?.value || 0
    });
  }

  return trend;
}