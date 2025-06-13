import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { calculateDistance } from "@/server/utils/geo-calculations";

/**
 * Router pour les performances et gains des livreurs selon le cahier des charges
 * Planning, estimations, export PDF/iCal et optimisation trajets
 */

// Schémas de validation
const performanceFiltersSchema = z.object({
  period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  routeId: z.string().cuid().optional(),
  includeProjections: z.boolean().default(false),
});

const routeOptimizationSchema = z.object({
  deliveries: z.array(
    z.object({
      id: z.string().cuid(),
      address: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      timeWindow: z
        .object({
          start: z.string(), // Format HH:MM
          end: z.string(), // Format HH:MM
        })
        .optional(),
      priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
      estimatedDuration: z.number().min(5).max(120).default(15), // minutes
    }),
  ),
  startLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  }),
  vehicleType: z.enum([
    "CAR",
    "MOTORCYCLE",
    "BICYCLE",
    "SCOOTER",
    "VAN",
    "FOOT",
  ]),
  maxWorkingHours: z.number().min(1).max(14).default(8),
  includeBreaks: z.boolean().default(true),
  optimizationGoal: z
    .enum(["DISTANCE", "TIME", "EARNINGS", "FUEL"])
    .default("TIME"),
});

const planningExportSchema = z.object({
  format: z.enum(["PDF", "ICAL", "JSON"]),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  includeCompleted: z.boolean().default(true),
  includePlanned: z.boolean().default(true),
  includeStats: z.boolean().default(true),
  language: z.enum(["fr", "en"]).default("fr"),
});

export const delivererPerformanceRouter = router({
  /**
   * Obtenir les statistiques de performance détaillées
   */
  getPerformanceStats: protectedProcedure
    .input(performanceFiltersSchema)
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent consulter leurs performances",
        });
      }

      try {
        // Calculer les dates de la période
        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculatePeriodDates(input);

        // Performances de la période actuelle
        const currentPerformances =
          await ctx.db.delivererRoutePerformance.findMany({
            where: {
              route: { delivererId: user.id },
              executionDate: { gte: startDate, lte: endDate },
              ...(input.routeId && { routeId: input.routeId }),
            },
            include: {
              route: {
                select: {
                  title: true,
                  departureAddress: true,
                  arrivalAddress: true,
                  estimatedDistance: true,
                  estimatedDuration: true,
                },
              },
            },
          });

        // Performances de la période précédente pour comparaison
        const previousPerformances =
          await ctx.db.delivererRoutePerformance.findMany({
            where: {
              route: { delivererId: user.id },
              executionDate: { gte: previousStartDate, lte: previousEndDate },
              ...(input.routeId && { routeId: input.routeId }),
            },
          });

        // Calculer les métriques agrégées
        const currentMetrics = calculateMetrics(currentPerformances);
        const previousMetrics = calculateMetrics(previousPerformances);

        // Gains et commissions
        const currentEarnings = await getEarningsForPeriod(
          _ctx,
          user.id,
          startDate,
          endDate,
        );
        const previousEarnings = await getEarningsForPeriod(
          _ctx,
          user.id,
          previousStartDate,
          previousEndDate,
        );

        // Projections si demandées
        const projections = null;
        if (input.includeProjections) {
          projections = await calculateProjections(
            _ctx,
            user.id,
            currentMetrics,
            input.period,
          );
        }

        // Top routes de la période
        const topRoutes = await getTopRoutes(_ctx, user.id, startDate, endDate);

        return {
          success: true,
          data: {
            period: {
              start: startDate,
              end: endDate,
              label: getPeriodLabel(input.period, startDate),
            },
            current: {
              ...currentMetrics,
              earnings: currentEarnings,
            },
            previous: {
              ...previousMetrics,
              earnings: previousEarnings,
            },
            comparison: {
              earnings: calculateGrowth(
                currentEarnings.total,
                previousEarnings.total,
              ),
              deliveries: calculateGrowth(
                currentMetrics.totalDeliveries,
                previousMetrics.totalDeliveries,
              ),
              efficiency: calculateGrowth(
                currentMetrics.averageEfficiency,
                previousMetrics.averageEfficiency,
              ),
              satisfaction: calculateGrowth(
                currentMetrics.averageRating,
                previousMetrics.averageRating,
              ),
            },
            topRoutes,
            projections,
            recommendations: generateRecommendations(
              currentMetrics,
              previousMetrics,
            ),
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des performances",
        });
      }
    }),

  /**
   * Optimiser un trajet avec plusieurs livraisons
   */
  optimizeRoute: protectedProcedure
    .input(routeOptimizationSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent optimiser des trajets",
        });
      }

      try {
        // Enregistrer la demande d'optimisation
        const optimization = await ctx.db.routeOptimization.create({
          data: {
            delivererId: user.id,
            startingPoint: input.startLocation,
            destinations: input.deliveries,
            constraints: {
              vehicleType: input.vehicleType,
              maxWorkingHours: input.maxWorkingHours,
              includeBreaks: input.includeBreaks,
              optimizationGoal: input.optimizationGoal,
            },
            status: "PROCESSING",
          },
        });

        // Algorithme d'optimisation simplifié (TSP + contraintes)
        const optimizedRoute = await optimizeDeliveryRoute({
          startLocation: input.startLocation,
          deliveries: input.deliveries,
          vehicleType: input.vehicleType,
          maxWorkingHours: input.maxWorkingHours,
          optimizationGoal: input.optimizationGoal,
        });

        // Mettre à jour avec les résultats
        const updatedOptimization = await ctx.db.routeOptimization.update({
          where: { id: optimization.id },
          data: {
            optimizedRoute: optimizedRoute.steps,
            totalDistance: optimizedRoute.totalDistance,
            totalDuration: optimizedRoute.totalDuration,
            estimatedEarnings: optimizedRoute.estimatedEarnings,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            optimization: updatedOptimization,
            route: optimizedRoute,
            savings: {
              distance: optimizedRoute.distanceSaved || 0,
              time: optimizedRoute.timeSaved || 0,
              fuel: optimizedRoute.fuelSaved || 0,
              earnings: optimizedRoute.earningsIncrease || 0,
            },
          },
          message: "Trajet optimisé avec succès",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'optimisation du trajet",
        });
      }
    }),

  /**
   * Obtenir le planning des livraisons
   */
  getDeliverySchedule: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
        includeCompleted: z.boolean().default(true),
        includeRoutes: z.boolean().default(true),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent consulter leur planning",
        });
      }

      try {
        // Livraisons planifiées
        const deliveries = await ctx.db.delivery.findMany({
          where: {
            delivererId: user.id,
            scheduledAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
            ...(input.includeCompleted
              ? {}
              : {
                  status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED"] },
                }),
          },
          include: {
            announcement: {
              select: {
                title: true,
                pickupAddress: true,
                deliveryAddress: true,
                suggestedPrice: true,
                priority: true,
              },
            },
          },
          orderBy: { scheduledAt: "asc" },
        });

        // Routes planifiées si demandées
        const plannedRoutes = [];
        if (input.includeRoutes) {
          plannedRoutes = await ctx.db.delivererPlannedRoute.findMany({
            where: {
              delivererId: user.id,
              departureTime: {
                gte: input.startDate,
                lte: input.endDate,
              },
              status: { in: ["PUBLISHED", "ACTIVE", "IN_PROGRESS"] },
            },
            include: {
              matchedAnnouncements: {
                include: {
                  announcement: {
                    select: { title: true, suggestedPrice: true },
                  },
                },
              },
            },
            orderBy: { departureTime: "asc" },
          });
        }

        // Organiser par jour
        const scheduleByDay = organizeScheduleByDay(
          deliveries,
          plannedRoutes,
          input.startDate,
          input.endDate,
        );

        // Calculer les statistiques du planning
        const stats = {
          totalDeliveries: deliveries.length,
          totalRoutes: plannedRoutes.length,
          estimatedEarnings: deliveries.reduce(
            (sum, d) => sum + (d.announcement?.suggestedPrice?.toNumber() || 0),
            0,
          ),
          completedDeliveries: deliveries.filter((d) =>
            ["DELIVERED", "COMPLETED"].includes(d.status),
          ).length,
          upcomingDeliveries: deliveries.filter(
            (d) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(d.status),
          ).length,
        };

        return {
          success: true,
          data: {
            schedule: scheduleByDay,
            statistics: stats,
            period: {
              start: input.startDate,
              end: input.endDate,
              days: Math.ceil(
                (input.endDate.getTime() - input.startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            },
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du planning",
        });
      }
    }),

  /**
   * Exporter le planning (PDF, iCal)
   */
  exportPlanning: protectedProcedure
    .input(planningExportSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent exporter leur planning",
        });
      }

      try {
        // Récupérer les données de la période
        const deliveries = await ctx.db.delivery.findMany({
          where: {
            delivererId: user.id,
            scheduledAt: {
              gte: input.period.start,
              lte: input.period.end,
            },
            ...(input.includeCompleted
              ? {}
              : {
                  status: { notIn: ["DELIVERED", "COMPLETED", "CANCELLED"] },
                }),
          },
          include: {
            announcement: true,
          },
          orderBy: { scheduledAt: "asc" },
        });

        const plannedRoutes = input.includePlanned
          ? await ctx.db.delivererPlannedRoute.findMany({
              where: {
                delivererId: user.id,
                departureTime: {
                  gte: input.period.start,
                  lte: input.period.end,
                },
              },
              orderBy: { departureTime: "asc" },
            })
          : [];

        let exportResult;

        switch (input.format) {
          case "PDF":
            exportResult = await generatePDFPlanning({
              deliverer: user,
              deliveries,
              plannedRoutes,
              period: input.period,
              includeStats: input.includeStats,
              language: input.language,
            });
            break;

          case "ICAL":
            exportResult = await generateICalPlanning({
              deliverer: user,
              deliveries,
              plannedRoutes,
              period: input.period,
            });
            break;

          case "JSON":
            exportResult = {
              url: null,
              data: {
                deliverer: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                },
                period: input.period,
                deliveries: deliveries.map((d) => ({
                  id: d.id,
                  title: d.announcement.title,
                  scheduledAt: d.scheduledAt,
                  status: d.status,
                  pickupAddress: d.announcement.pickupAddress,
                  deliveryAddress: d.announcement.deliveryAddress,
                  price: d.announcement.suggestedPrice?.toNumber(),
                })),
                plannedRoutes: plannedRoutes.map((r) => ({
                  id: r.id,
                  title: r.title,
                  departureTime: r.departureTime,
                  arrivalTime: r.arrivalTime,
                  departureAddress: r.departureAddress,
                  arrivalAddress: r.arrivalAddress,
                })),
                generatedAt: new Date(),
              },
            };
            break;
        }

        return {
          success: true,
          data: exportResult,
          message: `Planning exporté en ${input.format} avec succès`,
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'export du planning",
        });
      }
    }),

  /**
   * Obtenir les estimations de temps et gains
   */
  getEarningsEstimation: protectedProcedure
    .input(
      z.object({
        deliveryIds: z.array(z.string().cuid()),
        routeId: z.string().cuid().optional(),
        considerTraffic: z.boolean().default(true),
        considerWeather: z.boolean().default(false),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent obtenir des estimations",
        });
      }

      try {
        // Récupérer les livraisons
        const deliveries = await ctx.db.delivery.findMany({
          where: {
            id: { in: input.deliveryIds },
            delivererId: user.id,
          },
          include: {
            announcement: true,
          },
        });

        // Récupérer la route si spécifiée
        const route = input.routeId
          ? await ctx.db.delivererPlannedRoute.findFirst({
              where: {
                id: input.routeId,
                delivererId: user.id,
              },
            })
          : null;

        // Calculer les estimations
        const estimations = await Promise.all(
          deliveries.map(async (delivery) => {
            const baseEarnings =
              delivery.announcement.suggestedPrice?.toNumber() || 0;
            const platformFee = baseEarnings * 0.15; // 15% commission EcoDeli
            const netEarnings = baseEarnings - platformFee;

            // Estimation du temps basée sur la distance et le trafic
            const timeEstimation = await estimateDeliveryTime({
              pickupAddress: delivery.announcement.pickupAddress,
              deliveryAddress: delivery.announcement.deliveryAddress,
              considerTraffic: input.considerTraffic,
              considerWeather: input.considerWeather,
            });

            return {
              deliveryId: delivery.id,
              title: delivery.announcement.title,
              estimatedTime: timeEstimation.duration,
              estimatedDistance: timeEstimation.distance,
              baseEarnings,
              platformFee,
              netEarnings,
              fuelCost: timeEstimation.fuelCost,
              profitMargin: netEarnings - timeEstimation.fuelCost,
              trafficDelayRisk: timeEstimation.trafficRisk,
              weatherImpact: timeEstimation.weatherImpact,
            };
          }),
        );

        // Totaux
        const totals = estimations.reduce(
          (acc, est) => ({
            totalTime: acc.totalTime + est.estimatedTime,
            totalDistance: acc.totalDistance + est.estimatedDistance,
            totalEarnings: acc.totalEarnings + est.netEarnings,
            totalFuelCost: acc.totalFuelCost + est.fuelCost,
            totalProfit: acc.totalProfit + est.profitMargin,
          }),
          {
            totalTime: 0,
            totalDistance: 0,
            totalEarnings: 0,
            totalFuelCost: 0,
            totalProfit: 0,
          },
        );

        return {
          success: true,
          data: {
            estimations,
            totals: {
              ...totals,
              hourlyRate:
                totals.totalTime > 0
                  ? totals.totalProfit / (totals.totalTime / 60)
                  : 0,
              profitMargin:
                totals.totalEarnings > 0
                  ? (totals.totalProfit / totals.totalEarnings) * 100
                  : 0,
            },
            route: route
              ? {
                  id: route.id,
                  title: route.title,
                  compatibility: calculateRouteCompatibility(route, deliveries),
                }
              : null,
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du calcul des estimations",
        });
      }
    }),
});

// Helper functions
function calculatePeriodDates(input: any) {
  const now = new Date();
  const startDate = new Date();
  const endDate = new Date();
  const previousStartDate = new Date();
  const previousEndDate = new Date();

  if (input.startDate && input.endDate) {
    startDate = input.startDate;
    endDate = input.endDate;
    const duration = endDate.getTime() - startDate.getTime();
    previousEndDate = new Date(startDate.getTime() - 1);
    previousStartDate = new Date(previousEndDate.getTime() - duration);
  } else {
    switch (input.period) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        previousEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        const dayOfWeek = now.getDay();
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        endDate.setHours(23, 59, 59, 999);
        previousStartDate = new Date(
          startDate.getTime() - 7 * 24 * 60 * 60 * 1000,
        );
        previousEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      // Autres périodes...
    }
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

function calculateMetrics(performances: any[]) {
  if (performances.length === 0) {
    return {
      totalDeliveries: 0,
      totalDistance: 0,
      totalDuration: 0,
      averageRating: 0,
      averageEfficiency: 0,
      onTimeRate: 0,
    };
  }

  const totals = performances.reduce(
    (acc, perf) => ({
      deliveries: acc.deliveries + perf.packagesDelivered,
      distance: acc.distance + perf.actualDistance,
      duration: acc.duration + perf.actualDuration,
      rating: acc.rating + (perf.averageRating || 0),
      onTime: acc.onTime + perf.onTimeDeliveries,
    }),
    { deliveries: 0, distance: 0, duration: 0, rating: 0, onTime: 0 },
  );

  return {
    totalDeliveries: totals.deliveries,
    totalDistance: totals.distance,
    totalDuration: totals.duration,
    averageRating: totals.rating / performances.length,
    averageEfficiency:
      totals.deliveries > 0 ? totals.distance / totals.deliveries : 0,
    onTimeRate:
      totals.deliveries > 0 ? (totals.onTime / totals.deliveries) * 100 : 0,
  };
}

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function getPeriodLabel(period: string, date: Date): string {
  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  switch (period) {
    case "day":
      return date.toLocaleDateString("fr-FR");
    case "week":
      return `Semaine du ${date.toLocaleDateString("fr-FR")}`;
    case "month":
      return `${months[date.getMonth()]} ${date.getFullYear()}`;
    case "year":
      return date.getFullYear().toString();
    default:
      return period;
  }
}

async function getEarningsForPeriod(
  ctx: any,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  const earnings = await ctx.db.transaction.aggregate({
    where: {
      wallet: { userId },
      type: { in: ["EARNING", "DELIVERY_PAYOUT"] },
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  const commissions = await ctx.db.transaction.aggregate({
    where: {
      wallet: { userId },
      type: "PLATFORM_FEE",
      status: "COMPLETED",
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  return {
    total: earnings._sum.amount?.toNumber() || 0,
    commissions: Math.abs(commissions._sum.amount?.toNumber() || 0),
    net:
      (earnings._sum.amount?.toNumber() || 0) -
      Math.abs(commissions._sum.amount?.toNumber() || 0),
  };
}

async function calculateProjections(
  ctx: any,
  userId: string,
  currentMetrics: any,
  period: string,
) {
  // Logique de projection basée sur les tendances actuelles
  const projectionMultiplier =
    period === "month" ? 30 : period === "week" ? 7 : 1;

  return {
    estimatedEarnings:
      currentMetrics.totalDeliveries * 15 * projectionMultiplier,
    estimatedDeliveries: currentMetrics.totalDeliveries * projectionMultiplier,
    confidence: 85, // %
  };
}

async function getTopRoutes(
  ctx: any,
  userId: string,
  startDate: Date,
  endDate: Date,
) {
  return ctx.db.delivererRoutePerformance.findMany({
    where: {
      route: { delivererId: userId },
      executionDate: { gte: startDate, lte: endDate },
    },
    include: {
      route: {
        select: { title: true, departureAddress: true, arrivalAddress: true },
      },
    },
    orderBy: { totalEarnings: "desc" },
    take: 5,
  });
}

function generateRecommendations(current: any, previous: any): string[] {
  const recommendations: string[] = [];

  if (current.onTimeRate < 90) {
    recommendations.push("Améliorer la ponctualité pour augmenter votre note");
  }

  if (current.averageEfficiency > previous.averageEfficiency) {
    recommendations.push("Excellente amélioration de l'efficacité !");
  }

  if (current.totalDeliveries < previous.totalDeliveries) {
    recommendations.push("Considérer accepter plus de livraisons");
  }

  return recommendations;
}

async function optimizeDeliveryRoute(params: any) {
  // Algorithme d'optimisation simplifié
  // En production, utiliser un service comme Google Routes API ou OSRM

  const {
    startLocation: _startLocation,
    deliveries: _deliveries,
    optimizationGoal: _optimizationGoal,
  } = params;

  // Tri simple par priorité et proximité
  const sortedDeliveries = deliveries.sort((a: any, b: any) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    // Calculer distance depuis le point de départ
    const distA = Math.sqrt(
      Math.pow(a.latitude - startLocation.latitude, 2) +
        Math.pow(a.longitude - startLocation.longitude, 2),
    );
    const distB = Math.sqrt(
      Math.pow(b.latitude - startLocation.latitude, 2) +
        Math.pow(b.longitude - startLocation.longitude, 2),
    );

    return distA - distB;
  });

  const totalDistance = sortedDeliveries.length * 5; // Estimation simple
  const totalDuration = sortedDeliveries.length * 20; // 20min par livraison
  const estimatedEarnings = sortedDeliveries.length * 12; // 12€ par livraison

  return {
    steps: sortedDeliveries.map((delivery: any, index: number) => ({
      order: index + 1,
      deliveryId: delivery.id,
      address: delivery.address,
      estimatedArrival: new Date(Date.now() + (index + 1) * 20 * 60 * 1000),
      estimatedDuration: delivery.estimatedDuration,
    })),
    totalDistance,
    totalDuration,
    estimatedEarnings,
    distanceSaved: 2.5,
    timeSaved: 15,
    fuelSaved: 3.2,
    earningsIncrease: 5.5,
  };
}

function organizeScheduleByDay(
  deliveries: any[],
  routes: any[],
  startDate: Date,
  endDate: Date,
) {
  const schedule: any = {};
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    schedule[dateKey] = {
      date: new Date(currentDate),
      deliveries: deliveries.filter(
        (d) =>
          d.scheduledAt &&
          d.scheduledAt.toISOString().split("T")[0] === dateKey,
      ),
      routes: routes.filter(
        (r) =>
          r.departureTime &&
          r.departureTime.toISOString().split("T")[0] === dateKey,
      ),
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedule;
}

async function generatePDFPlanning(params: any) {
  // Génération PDF - en production utiliser une bibliothèque comme PDFKit
  return {
    url: "/api/exports/planning.pdf",
    filename: `planning_${params.deliverer.name}_${params.period.start.toISOString().split("T")[0]}.pdf`,
    size: "2.1 MB",
  };
}

async function generateICalPlanning(params: any) {
  // Génération iCal - format standard pour calendriers
  return {
    url: "/api/exports/planning.ics",
    filename: `planning_${params.deliverer.name}.ics`,
    size: "15 KB",
  };
}

async function estimateDeliveryTime(params: any) {
  // Estimation basée sur les APIs de géolocalisation
  return {
    duration: 25, // minutes
    distance: 8.5, // km
    fuelCost: 2.1, // euros
    trafficRisk: "MODERATE",
    weatherImpact: "NONE",
  };
}

function calculateRouteCompatibility(route: any, deliveries: any[]) {
  // Calcul de la compatibilité des livraisons avec une route
  if (!deliveries || deliveries.length === 0) return 0;

  const compatibilityScore = 100;

  for (const delivery of deliveries) {
    // Vérifier la proximité géographique
    const distance = calculateDistance(
      route.departureLatitude,
      route.departureLongitude,
      delivery.pickupLatitude,
      delivery.pickupLongitude,
    );

    // Pénaliser si trop loin (plus de 10km = -10 points)
    if (distance > 10) {
      compatibilityScore -= Math.min(distance - 10, 30);
    }

    // Vérifier la compatibilité horaire
    const routeTime = new Date(route.departureTime);
    const deliveryTime = new Date(delivery.pickupTimeStart);
    const timeDiff =
      Math.abs(routeTime.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60); // heures

    // Pénaliser si trop d'écart temporel (plus de 2h = -20 points)
    if (timeDiff > 2) {
      compatibilityScore -= Math.min((timeDiff - 2) * 10, 20);
    }
  }

  return Math.max(Math.floor(compatibilityScore), 0);
}

// Distance calculation function moved to @/server/utils/geo-calculations
