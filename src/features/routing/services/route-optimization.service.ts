import { prisma } from "@/lib/db";

export interface RoutePoint {
  id: string;
  type: "pickup" | "delivery" | "waypoint";
  address: string;
  coordinates: { lat: number; lng: number };
  timeWindow?: { start: Date; end: Date };
  priority: number;
  estimatedDuration: number; // minutes
  deliveryId?: string;
  announcementId?: string;
}

export interface OptimizedRoute {
  id: string;
  delivererId: string;
  points: RoutePoint[];
  totalDistance: number; // km
  totalDuration: number; // minutes
  totalEarnings: number;
  efficiency: number; // score 0-100
  fuelCost: number;
  co2Savings: number;
  createdAt: Date;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
}

export interface RouteOptimizationOptions {
  maxDistance?: number;
  maxDuration?: number;
  prioritizeEarnings?: boolean;
  avoidTolls?: boolean;
  vehicleType?: "CAR" | "BIKE" | "SCOOTER" | "WALKING";
  fuelPrice?: number;
}

export interface RouteConstraints {
  workingHours: { start: string; end: string };
  maxDeliveries: number;
  serviceZone: { center: { lat: number; lng: number }; radius: number };
  vehicleCapacity?: { weight: number; volume: number };
}

export class RouteOptimizationService {
  /**
   * Optimiser une route pour un livreur
   */
  static async optimizeRoute(
    delivererId: string,
    targetDate: Date,
    options: RouteOptimizationOptions = {},
  ): Promise<OptimizedRoute> {
    try {
      // 1. Récupérer le profil livreur avec ses contraintes
      const deliverer = await prisma.deliverer.findUnique({
        where: { id: delivererId },
        include: {
          user: { include: { profile: true } },
          routes: {
            where: {
              date: targetDate,
              isActive: true,
            },
          },
          vehicleInfo: true,
        },
      });

      if (!deliverer) {
        throw new Error("Livreur non trouvé");
      }

      // 2. Récupérer les livraisons assignées
      const assignedDeliveries = await prisma.delivery.findMany({
        where: {
          delivererId,
          status: "ACCEPTED",
          pickupDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
        },
        include: {
          announcement: true,
          client: {
            include: {
              user: { include: { profile: true } },
            },
          },
        },
      });

      // 3. Définir les contraintes
      const constraints: RouteConstraints = {
        workingHours: {
          start: deliverer.availableFrom || "08:00",
          end: deliverer.availableTo || "20:00",
        },
        maxDeliveries: 15, // Limite raisonnable
        serviceZone: {
          center: { lat: 45.764043, lng: 4.835659 }, // Lyon par défaut
          radius: deliverer.maxDeliveryDistance || 25,
        },
        vehicleCapacity: {
          weight: deliverer.vehicleInfo?.maxWeight || 50,
          volume: deliverer.vehicleInfo?.maxVolume || 100,
        },
      };

      // 4. Créer les points de route
      const routePoints: RoutePoint[] = [];
      let totalEarnings = 0;

      for (const delivery of assignedDeliveries) {
        // Point de collecte
        routePoints.push({
          id: `pickup-${delivery.id}`,
          type: "pickup",
          address: delivery.pickupAddress,
          coordinates: this.parseCoordinates(delivery.pickupCoordinates),
          timeWindow: {
            start: delivery.pickupTimeStart || new Date(),
            end: delivery.pickupTimeEnd || new Date(),
          },
          priority:
            delivery.urgency === "HIGH"
              ? 3
              : delivery.urgency === "MEDIUM"
                ? 2
                : 1,
          estimatedDuration: 5, // 5 minutes pour collecter
          deliveryId: delivery.id,
          announcementId: delivery.announcementId,
        });

        // Point de livraison
        routePoints.push({
          id: `delivery-${delivery.id}`,
          type: "delivery",
          address: delivery.deliveryAddress,
          coordinates: this.parseCoordinates(delivery.deliveryCoordinates),
          timeWindow: {
            start: delivery.deliveryTimeStart || new Date(),
            end: delivery.deliveryTimeEnd || new Date(),
          },
          priority:
            delivery.urgency === "HIGH"
              ? 3
              : delivery.urgency === "MEDIUM"
                ? 2
                : 1,
          estimatedDuration: 5, // 5 minutes pour livrer
          deliveryId: delivery.id,
          announcementId: delivery.announcementId,
        });

        totalEarnings += delivery.price;
      }

      // 5. Optimiser l'ordre des points avec l'algorithme du voyageur de commerce
      const optimizedPoints = await this.optimizePointsOrder(
        routePoints,
        constraints,
        options,
      );

      // 6. Calculer les métriques de la route
      const routeMetrics = await this.calculateRouteMetrics(
        optimizedPoints,
        options,
      );

      // 7. Créer la route optimisée
      const optimizedRoute: OptimizedRoute = {
        id: `route-${delivererId}-${targetDate.getTime()}`,
        delivererId,
        points: optimizedPoints,
        totalDistance: routeMetrics.distance,
        totalDuration: routeMetrics.duration,
        totalEarnings,
        efficiency: this.calculateEfficiency(routeMetrics, totalEarnings),
        fuelCost: this.calculateFuelCost(
          routeMetrics.distance,
          options.vehicleType,
          options.fuelPrice,
        ),
        co2Savings: this.calculateCO2Savings(
          routeMetrics.distance,
          assignedDeliveries.length,
        ),
        createdAt: new Date(),
        status: "DRAFT",
      };

      // 8. Sauvegarder la route en base
      await this.saveOptimizedRoute(optimizedRoute);

      return optimizedRoute;
    } catch (error) {
      console.error("Erreur optimisation route:", error);
      throw error;
    }
  }

  /**
   * Optimiser l'ordre des points avec TSP (Traveling Salesman Problem)
   */
  private static async optimizePointsOrder(
    points: RoutePoint[],
    constraints: RouteConstraints,
    options: RouteOptimizationOptions,
  ): Promise<RoutePoint[]> {
    // Algorithme simplifié : tri par priorité puis par proximité géographique

    // 1. Séparer les points de collecte et de livraison
    const pickupPoints = points.filter((p) => p.type === "pickup");
    const deliveryPoints = points.filter((p) => p.type === "delivery");

    // 2. Trier par priorité puis par fenêtre temporelle
    pickupPoints.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.timeWindow && b.timeWindow) {
        return a.timeWindow.start.getTime() - b.timeWindow.start.getTime();
      }
      return 0;
    });

    // 3. Pour chaque collecte, placer immédiatement sa livraison correspondante
    const optimizedPoints: RoutePoint[] = [];

    for (const pickup of pickupPoints) {
      optimizedPoints.push(pickup);

      const correspondingDelivery = deliveryPoints.find(
        (d) => d.deliveryId === pickup.deliveryId,
      );

      if (correspondingDelivery) {
        optimizedPoints.push(correspondingDelivery);
      }
    }

    // 4. Appliquer des optimisations locales (2-opt algorithm simplifié)
    return this.apply2OptOptimization(optimizedPoints);
  }

  /**
   * Appliquer l'optimisation 2-opt pour améliorer la route
   */
  private static apply2OptOptimization(points: RoutePoint[]): RoutePoint[] {
    let improved = true;
    let route = [...points];

    while (improved) {
      improved = false;

      for (let i = 1; i < route.length - 2; i++) {
        for (let j = i + 1; j < route.length; j++) {
          // Vérifier si l'échange améliore la distance totale
          const currentDistance =
            this.calculateDistance(
              route[i - 1].coordinates,
              route[i].coordinates,
            ) +
            this.calculateDistance(
              route[j].coordinates,
              route[j + 1]?.coordinates || route[0].coordinates,
            );

          const newDistance =
            this.calculateDistance(
              route[i - 1].coordinates,
              route[j].coordinates,
            ) +
            this.calculateDistance(
              route[i].coordinates,
              route[j + 1]?.coordinates || route[0].coordinates,
            );

          if (newDistance < currentDistance) {
            // Inverser le segment entre i et j
            route = [
              ...route.slice(0, i),
              ...route.slice(i, j + 1).reverse(),
              ...route.slice(j + 1),
            ];
            improved = true;
          }
        }
      }
    }

    return route;
  }

  /**
   * Calculer les métriques de la route
   */
  private static async calculateRouteMetrics(
    points: RoutePoint[],
    options: RouteOptimizationOptions,
  ): Promise<{ distance: number; duration: number }> {
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];

      const distance = this.calculateDistance(from.coordinates, to.coordinates);
      const duration = this.estimateTravelTime(distance, options.vehicleType);

      totalDistance += distance;
      totalDuration += duration + from.estimatedDuration;
    }

    return { distance: totalDistance, duration: totalDuration };
  }

  /**
   * Calculer la distance entre deux points (formule haversine)
   */
  private static calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    if (!point2) return 0;

    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) *
        Math.cos(this.toRadians(point2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimer le temps de trajet selon le véhicule
   */
  private static estimateTravelTime(
    distance: number,
    vehicleType?: string,
  ): number {
    const speeds = {
      CAR: 30, // km/h en ville
      SCOOTER: 25,
      BIKE: 15,
      WALKING: 5,
    };

    const speed = speeds[vehicleType as keyof typeof speeds] || speeds.CAR;
    return (distance / speed) * 60; // Convertir en minutes
  }

  /**
   * Calculer l'efficacité de la route
   */
  private static calculateEfficiency(
    metrics: { distance: number; duration: number },
    earnings: number,
  ): number {
    // Score basé sur le ratio gains/temps et gains/distance
    const timeEfficiency = earnings / (metrics.duration / 60); // €/heure
    const distanceEfficiency = earnings / metrics.distance; // €/km

    // Normaliser sur 100
    return Math.min(100, (timeEfficiency + distanceEfficiency * 10) / 2);
  }

  /**
   * Calculer le coût de carburant
   */
  private static calculateFuelCost(
    distance: number,
    vehicleType?: string,
    fuelPrice: number = 1.8,
  ): number {
    const consumptions = {
      CAR: 7, // L/100km
      SCOOTER: 3,
      BIKE: 0,
      WALKING: 0,
    };

    const consumption =
      consumptions[vehicleType as keyof typeof consumptions] ||
      consumptions.CAR;
    return ((distance * consumption) / 100) * fuelPrice;
  }

  /**
   * Calculer les économies de CO2
   */
  private static calculateCO2Savings(
    distance: number,
    deliveryCount: number,
  ): number {
    // Estimation : chaque livraison évite un trajet individuel de 10km
    const savedDistance = deliveryCount * 10 - distance;
    const co2PerKm = 0.12; // kg CO2/km pour une voiture moyenne

    return Math.max(0, savedDistance * co2PerKm);
  }

  /**
   * Parser les coordonnées depuis le format JSON
   */
  private static parseCoordinates(coordinates: any): {
    lat: number;
    lng: number;
  } {
    if (typeof coordinates === "string") {
      const parsed = JSON.parse(coordinates);
      return {
        lat: parsed.lat || parsed.latitude,
        lng: parsed.lng || parsed.longitude,
      };
    }
    return coordinates || { lat: 0, lng: 0 };
  }

  /**
   * Convertir en radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Sauvegarder la route optimisée
   */
  private static async saveOptimizedRoute(
    route: OptimizedRoute,
  ): Promise<void> {
    await prisma.delivererRoute.create({
      data: {
        id: route.id,
        delivererId: route.delivererId,
        date: new Date(),
        startTime: new Date().toISOString().substring(11, 16), // Format HH:MM
        endTime: new Date(Date.now() + route.totalDuration * 60000)
          .toISOString()
          .substring(11, 16),
        totalDistance: route.totalDistance,
        estimatedDuration: route.totalDuration,
        estimatedEarnings: route.totalEarnings,
        isOptimized: true,
        isActive: false,
        waypoints: route.points,
        metadata: {
          efficiency: route.efficiency,
          fuelCost: route.fuelCost,
          co2Savings: route.co2Savings,
          optimizedAt: route.createdAt.toISOString(),
        },
      },
    });
  }

  /**
   * Obtenir les suggestions d'optimisation
   */
  static async getOptimizationSuggestions(delivererId: string): Promise<any> {
    const recentRoutes = await prisma.delivererRoute.findMany({
      where: {
        delivererId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Analyser les patterns et suggérer des améliorations
    const avgEfficiency =
      recentRoutes.reduce(
        (sum, route) => sum + (route.metadata?.efficiency || 0),
        0,
      ) / recentRoutes.length;

    const suggestions = [];

    if (avgEfficiency < 70) {
      suggestions.push({
        type: "EFFICIENCY",
        title: "Améliorer l'efficacité des routes",
        description:
          "Votre efficacité moyenne est de " +
          Math.round(avgEfficiency) +
          "%. Essayez de grouper les livraisons par zone.",
        priority: "HIGH",
      });
    }

    if (recentRoutes.some((route) => (route.metadata?.fuelCost || 0) > 20)) {
      suggestions.push({
        type: "FUEL_COST",
        title: "Réduire les coûts de carburant",
        description:
          "Certaines routes ont des coûts de carburant élevés. Optimisez les trajets.",
        priority: "MEDIUM",
      });
    }

    return suggestions;
  }
}
