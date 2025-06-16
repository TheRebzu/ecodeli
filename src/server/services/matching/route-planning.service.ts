import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  type: "PICKUP" | "DELIVERY" | "WAYPOINT" | "DEPOT";
  timeWindow?: {
    start: Date;
    end: Date;
  };
  serviceTime?: number; // minutes
  priority: number; // 1-5
  requirements?: string[];
}

export interface OptimizedRoute {
  id: string;
  delivererId: string;
  points: Array<RoutePoint & {
    order: number;
    estimatedArrival: Date;
    estimatedDeparture: Date;
    distanceFromPrevious: number;
    durationFromPrevious: number;
  }>;
  totalDistance: number;
  totalDuration: number;
  totalServiceTime: number;
  efficiency: number;
  feasibilityScore: number;
  constraints: {
    maxDistance?: number;
    maxDuration?: number;
    vehicleCapacity?: number;
    timeWindows: boolean;
  };
}

export interface DeliveryCluster {
  id: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number;
  deliveryCount: number;
  density: number;
  averageDistance: number;
  suggestedRoutes: string[];
  optimalTimeSlots: string[];
}

export class RoutePlanningService {
  /**
   * Planifie une route optimisé pour un livreur
   */
  async planOptimalRoute(
    delivererId: string,
    deliveryPoints: RoutePoint[],
    constraints: {
      maxDistance?: number;
      maxDuration?: number; // minutes
      startTime?: Date;
      endTime?: Date;
      mustReturnToStart?: boolean;
      vehicleCapacity?: number;
    } = {}
  ): Promise<OptimizedRoute> {
    try {
      // Récuprer les informations du livreur et de son véhicule
      const deliverer = await db.deliverer.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              latitude: true,
              longitude: true,
              address: true
            }
          },
          vehicle: {
            select: {
              type: true,
              maxWeight: true,
              maxVolume: true,
              maxSpeed: true,
              fuelConsumption: true
            }
          }
        }
      });

      if (!deliverer) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Livreur non trouvé"
         });
      }

      // Point de départ (position du livreur)
      const startPoint: RoutePoint = {
        id: "start",
        latitude: deliverer.user?.latitude || 0,
        longitude: deliverer.user?.longitude || 0,
        type: "DEPOT",
        priority: 5,
        serviceTime: 0
      };

      // Vérifier la faisabilité initiale
      const feasibilityCheck = await this.checkRouteFeasibility(
        deliveryPoints,
        constraints,
        deliverer.vehicle
      );

      if (!feasibilityCheck.isFeasible) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Route non réalisable: ${feasibilityCheck.issues.join(", ")}`
        });
      }

      // Optimiser la route
      const optimizedPoints = await this.optimizeRoute(
        startPoint,
        deliveryPoints,
        constraints,
        deliverer.vehicle
      );

      // Calculer les métriques de la route
      const routeMetrics = this.calculateRouteMetrics(optimizedPoints);

      // Calculer le score d'efficacité
      const efficiency = this.calculateEfficiencyScore(
        optimizedPoints,
        deliveryPoints,
        routeMetrics
      );

      return {
        id: `route-${delivererId}-${Date.now()}`,
        delivererId,
        points: optimizedPoints,
        totalDistance: routeMetrics.totalDistance,
        totalDuration: routeMetrics.totalDuration,
        totalServiceTime: routeMetrics.totalServiceTime,
        efficiency,
        feasibilityScore: feasibilityCheck.score,
        constraints: {
          maxDistance: constraints.maxDistance,
          maxDuration: constraints.maxDuration,
          vehicleCapacity: constraints.vehicleCapacity,
          timeWindows: deliveryPoints.some(p => p.timeWindow)
        }
      };
    } catch (error) {
      console.error("Erreur lors de la planification de route:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la planification de route"
       });
    }
  }

  /**
   * Identifie les clusters de livraisons pour optimiser le groupage
   */
  async identifyDeliveryClusters(
    announcements: Array<{
      id: string;
      pickupLatitude: number;
      pickupLongitude: number;
      deliveryLatitude: number;
      deliveryLongitude: number;
      priority: string;
      scheduledDate?: Date;
    }>,
    maxClusterRadius: number = 5
  ): Promise<DeliveryCluster[]> {
    try {
      const clusters: DeliveryCluster[] = [];
      const unprocessed = [...announcements];

      while (unprocessed.length > 0) {
        const seed = unprocessed.shift()!;
        const cluster: DeliveryCluster = {
          id: `cluster-${clusters.length + 1}`,
          centerLatitude: seed.pickupLatitude,
          centerLongitude: seed.pickupLongitude,
          radius: 0,
          deliveryCount: 1,
          density: 0,
          averageDistance: 0,
          suggestedRoutes: [],
          optimalTimeSlots: []
        };

        const clusterDeliveries = [seed];

        // Trouver les livraisons proches
        for (let i = unprocessed.length - 1; i >= 0; i--) {
          const delivery = unprocessed[i];
          const distance = this.calculateDistance(
            seed.pickupLatitude,
            seed.pickupLongitude,
            delivery.pickupLatitude,
            delivery.pickupLongitude
          );

          if (distance <= maxClusterRadius) {
            clusterDeliveries.push(delivery);
            unprocessed.splice(i, 1);
          }
        }

        // Calculer les métriques du cluster
        if (clusterDeliveries.length >= 2) {
          const metrics = this.calculateClusterMetrics(clusterDeliveries);
          
          cluster.centerLatitude = metrics.centerLat;
          cluster.centerLongitude = metrics.centerLng;
          cluster.radius = metrics.radius;
          cluster.deliveryCount = clusterDeliveries.length;
          cluster.density = clusterDeliveries.length / (Math.PI * metrics.radius * metrics.radius);
          cluster.averageDistance = metrics.averageDistance;
          cluster.optimalTimeSlots = this.calculateOptimalTimeSlots(clusterDeliveries);

          clusters.push(cluster);
        }
      }

      // Trier par densité décroissante
      return clusters.sort((a, b) => b.density - a.density);
    } catch (error) {
      console.error("Erreur lors de l'identification des clusters:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'identification des clusters"
       });
    }
  }

  /**
   * Génére des routes alternatives pour une liste de livraisons
   */
  async generateAlternativeRoutes(
    delivererId: string,
    deliveryPoints: RoutePoint[],
    alternativeCount: number = 3
  ): Promise<OptimizedRoute[]> {
    try {
      const alternatives: OptimizedRoute[] = [];

      // Stratégie 1: Optimisation par distance
      const distanceOptimized = await this.planOptimalRoute(delivererId, deliveryPoints, {
        maxDistance: 200
      });
      alternatives.push(distanceOptimized);

      // Stratégie 2: Optimisation par temps
      const timeOptimized = await this.planOptimalRoute(delivererId, deliveryPoints, {
        maxDuration: 480 // 8 heures
      });
      alternatives.push(timeOptimized);

      // Stratégie 3: Optimisation par priorité
      const priorityOptimized = await this.optimizeByPriority(delivererId, deliveryPoints);
      alternatives.push(priorityOptimized);

      // Supprimer les doublons et trier par efficacité
      const uniqueAlternatives = this.removeDuplicateRoutes(alternatives);
      return uniqueAlternatives
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, alternativeCount);
    } catch (error) {
      console.error("Erreur lors de la génération d'alternatives:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la génération de routes alternatives"
       });
    }
  }

  /**
   * Ajuste une route en temps réel (traffic, urgences, etc.)
   */
  async adjustRouteRealTime(
    routeId: string,
    currentPosition: { latitude: number; longitude: number },
    adjustments: {
      newUrgentDelivery?: RoutePoint;
      trafficDelays?: Array<{ pointId: string; delayMinutes: number }>;
      cancelledDeliveries?: string[];
      roadBlocks?: Array<{ latitude: number; longitude: number; radius: number }>;
    }
  ): Promise<OptimizedRoute> {
    try {
      // Récuprer la route existante
      const existingRoute = await this.getRouteById(routeId);
      if (!existingRoute) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Route non trouvée"
         });
      }

      // Appliquer les ajustements
      const adjustedPoints = [...existingRoute.points];

      // Ajouter une livraison urgente
      if (adjustments.newUrgentDelivery) {
        adjustedPoints = await this.insertUrgentDelivery(
          adjustedPoints,
          adjustments.newUrgentDelivery,
          currentPosition
        );
      }

      // Supprimer les livraisons annulées
      if (adjustments.cancelledDeliveries?.length) {
        adjustedPoints = adjustedPoints.filter(
          point => !adjustments.cancelledDeliveries!.includes(point.id)
        );
      }

      // Tenir compte des blocages routiers
      if (adjustments.roadBlocks?.length) {
        adjustedPoints = await this.avoidRoadBlocks(
          adjustedPoints,
          adjustments.roadBlocks
        );
      }

      // Recalculer la route optimisée
      const reoptimizedRoute = await this.reoptimizeFromCurrentPosition(
        existingRoute.delivererId,
        currentPosition,
        adjustedPoints
      );

      // Appliquer les retards de trafic
      if (adjustments.trafficDelays?.length) {
        this.applyTrafficDelays(reoptimizedRoute, adjustments.trafficDelays);
      }

      return reoptimizedRoute;
    } catch (error) {
      console.error("Erreur lors de l'ajustement temps réel:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'ajustement de route"
       });
    }
  }

  // Méthodes privées

  private async checkRouteFeasibility(
    deliveryPoints: RoutePoint[],
    constraints: any,
    vehicle: any
  ): Promise<{ isFeasible: boolean; score: number; issues: string[] }> {
    const issues: string[] = [];
    const score = 100;

    // Vérifier la capacité du véhicule
    const totalWeight = deliveryPoints.reduce((sum, point) => {
      return sum + (point.requirements?.includes("HEAVY") ? 20 : 5);
    }, 0);

    if (vehicle?.maxWeight && totalWeight > vehicle.maxWeight) {
      issues.push("Dépassement de capacité de poids");
      score -= 30;
    }

    // Vérifier les contraintes de distance
    if (constraints.maxDistance) {
      const estimatedDistance = this.estimateTotalDistance(deliveryPoints);
      if (estimatedDistance > constraints.maxDistance) {
        issues.push("Distance totale trop importante");
        score -= 25;
      }
    }

    // Vérifier les fenêtres temporelles
    const timeWindowConflicts = this.checkTimeWindowConflicts(deliveryPoints);
    if (timeWindowConflicts > 0) {
      issues.push(`${timeWindowConflicts} conflits de créneaux horaires`);
      score -= timeWindowConflicts * 10;
    }

    return {
      isFeasible: issues.length === 0 || score >= 40,
      score: Math.max(0, score),
      issues
    };
  }

  private async optimizeRoute(
    startPoint: RoutePoint,
    deliveryPoints: RoutePoint[],
    constraints: any,
    vehicle: any
  ): Promise<Array<RoutePoint & {
    order: number;
    estimatedArrival: Date;
    estimatedDeparture: Date;
    distanceFromPrevious: number;
    durationFromPrevious: number;
  }>> {
    // Algorithme d'optimisation de route (version simplifiée)
    // En production, utiliser des algorithmes plus sophistiqués comme OR-Tools

    const allPoints = [startPoint, ...deliveryPoints];
    const optimizedOrder = await this.geneticAlgorithmOptimization(allPoints, constraints);

    // Calculer les temps et distances
    const currentTime = constraints.startTime || new Date();
    const currentPosition = startPoint;

    const result = optimizedOrder.map((point, index) => {
      const distance = index === 0 ? 0 : this.calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        point.latitude,
        point.longitude
      );

      const duration = index === 0 ? 0 : this.estimateTravelTime(distance, vehicle);
      const serviceTime = point.serviceTime || 10; // 10 minutes par défaut

      currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
      const arrivalTime = new Date(currentTime);
      
      currentTime = new Date(currentTime.getTime() + serviceTime * 60 * 1000);
      const departureTime = new Date(currentTime);

      currentPosition = point;

      return {
        ...point,
        order: index,
        estimatedArrival: arrivalTime,
        estimatedDeparture: departureTime,
        distanceFromPrevious: distance,
        durationFromPrevious: duration
      };
    });

    return result.slice(1); // Exclure le point de départ
  }

  private async geneticAlgorithmOptimization(
    points: RoutePoint[],
    constraints: any
  ): Promise<RoutePoint[]> {
    // Implémentation simplifiée d'un algorithme génétique
    // Pour une version plus robuste, utiliser des librairies spécialisées

    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;

    // Générer la population initiale
    const population = this.generateInitialPopulation(points, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      // Évaluer la fitness de chaque individu
      const evaluatedPopulation = population.map(individual => ({ route: individual,
        fitness: this.calculateRouteFitness(individual, constraints)
       }));

      // Sélection des meilleurs
      evaluatedPopulation.sort((a, b) => b.fitness - a.fitness);
      const survivors = evaluatedPopulation.slice(0, populationSize / 2);

      // Crossover et mutation
      const newPopulation = [...survivors.map(s => s.route)];
      
      while (newPopulation.length < populationSize) {
        const parent1 = survivors[Math.floor(Math.random() * survivors.length)].route;
        const parent2 = survivors[Math.floor(Math.random() * survivors.length)].route;
        
        const child = this.crossover(parent1, parent2);
        
        if (Math.random() < mutationRate) {
          child = this.mutate(child);
        }
        
        newPopulation.push(child);
      }

      population = newPopulation;
    }

    // Retourner la meilleure solution
    const bestRoute = population.reduce((best, current) => {
      const currentFitness = this.calculateRouteFitness(current, constraints);
      const bestFitness = this.calculateRouteFitness(best, constraints);
      return currentFitness > bestFitness ? current : best;
    });

    return bestRoute;
  }

  private calculateRouteMetrics(points: Array<RoutePoint & { distanceFromPrevious: number; durationFromPrevious: number; serviceTime?: number }>) {
    return {
      totalDistance: points.reduce((sum, point) => sum + point.distanceFromPrevious, 0),
      totalDuration: points.reduce((sum, point) => sum + point.durationFromPrevious, 0),
      totalServiceTime: points.reduce((sum, point) => sum + (point.serviceTime || 10), 0)
    };
  }

  private calculateEfficiencyScore(
    optimizedPoints: any[],
    originalPoints: RoutePoint[],
    metrics: any
  ): number {
    // Score basé sur plusieurs facteurs
    const score = 100;

    // Pénalité pour la distance totale
    const avgDistance = metrics.totalDistance / Math.max(optimizedPoints.length, 1);
    if (avgDistance > 20) score -= 20;

    // Bonus pour le respect des priorités
    const priorityScore = this.calculatePriorityScore(optimizedPoints);
    score += priorityScore * 0.2;

    // Pénalité pour les violations de fenêtres temporelles
    const timeViolations = this.countTimeWindowViolations(optimizedPoints);
    score -= timeViolations * 15;

    return Math.max(0, Math.min(100, score));
  }

  // Méthodes utilitaires simplifiées

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private estimateTravelTime(distance: number, vehicle: any): number {
    const avgSpeed = vehicle?.maxSpeed ? Math.min(vehicle.maxSpeed, 50) : 40;
    return Math.round((distance / avgSpeed) * 60);
  }

  private estimateTotalDistance(points: RoutePoint[]): number {
    // Estimation approximative basée sur la distance moyenne entre points
    if (points.length <= 1) return 0;
    
    const avgDistance = 10; // km en moyenne entre points
    return points.length * avgDistance;
  }

  private checkTimeWindowConflicts(points: RoutePoint[]): number {
    
    return points.filter(p => p.timeWindow).length > 5 ? 2 : 0;
  }

  private generateInitialPopulation(points: RoutePoint[], size: number): RoutePoint[][] {
    const population: RoutePoint[][] = [];
    const startPoint = points[0];
    const deliveryPoints = points.slice(1);

    for (let i = 0; i < size; i++) {
      const shuffled = [...deliveryPoints];
      // Mélanger en préservant partiellement les priorités
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
      population.push([startPoint, ...shuffled]);
    }

    return population;
  }

  private calculateRouteFitness(route: RoutePoint[], constraints: any): number {
    const fitness = 1000; // Score de base

    // Calculer la distance totale
    const totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      totalDistance += this.calculateDistance(
        route[i-1].latitude,
        route[i-1].longitude,
        route[i].latitude,
        route[i].longitude
      );
    }

    // Pénaliser les longues distances
    fitness -= totalDistance * 2;

    // Bonus pour les points prioritaires traités tôt
    route.forEach((point, index) => {
      if (point.priority >= 4 && index <= route.length / 3) {
        fitness += 50;
      }
    });

    return Math.max(0, fitness);
  }

  private crossover(parent1: RoutePoint[], parent2: RoutePoint[]): RoutePoint[] {
    // Crossover ordonné simple
    const start = 1; // Préserver le point de départ
    const crossoverPoint = Math.floor(Math.random() * (parent1.length - start)) + start;
    
    const child = [...parent1.slice(0, crossoverPoint)];
    const remaining = parent2.filter(point => !child.includes(point));
    
    return [...child, ...remaining];
  }

  private mutate(route: RoutePoint[]): RoutePoint[] {
    const mutated = [...route];
    if (mutated.length <= 2) return mutated;

    // Échanger deux points aléatoires (sauf le point de départ)
    const idx1 = Math.floor(Math.random() * (mutated.length - 1)) + 1;
    const idx2 = Math.floor(Math.random() * (mutated.length - 1)) + 1;
    
    [mutated[idx1], mutated[idx2]] = [mutated[idx2], mutated[idx1]];
    
    return mutated;
  }

  private calculateClusterMetrics(deliveries: any[]) {
    const lats = deliveries.map(d => d.pickupLatitude);
    const lngs = deliveries.map(d => d.pickupLongitude);
    
    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length;
    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length;
    
    const maxDistance = Math.max(...deliveries.map(d => 
      this.calculateDistance(centerLat, centerLng, d.pickupLatitude, d.pickupLongitude)
    ));

    const totalDistance = deliveries.reduce((sum, d) => {
      return sum + this.calculateDistance(
        d.pickupLatitude, d.pickupLongitude,
        d.deliveryLatitude, d.deliveryLongitude
      );
    }, 0);

    return {
      centerLat,
      centerLng,
      radius: maxDistance,
      averageDistance: totalDistance / deliveries.length
    };
  }

  private calculateOptimalTimeSlots(deliveries: any[]): string[] {
    // Analyser les créneaux horaires préférés
    const timeSlots = ["09:00-12:00", "12:00-14:00", "14:00-17:00", "17:00-19:00"];
    return timeSlots.slice(0, 2); // Retourner les 2 premiers créneaux pour simplifier
  }

  private async optimizeByPriority(delivererId: string, points: RoutePoint[]): Promise<OptimizedRoute> {
    // Trier par priorité décroissante
    const sortedPoints = [...points].sort((a, b) => b.priority - a.priority);
    return this.planOptimalRoute(delivererId, sortedPoints);
  }

  private removeDuplicateRoutes(routes: OptimizedRoute[]): OptimizedRoute[] {
    // Simplification: supprimer les routes avec le même ordre de points
    const seen = new Set<string>();
    return routes.filter(route => {
      const signature = route.points.map(p => p.id).join(',');
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }

  private calculatePriorityScore(points: any[]): number {
    // Score basé sur l'ordre des priorités
    const score = 0;
    points.forEach((point, index) => {
      if (point.priority >= 4 && index < points.length / 2) {
        score += 10;
      }
    });
    return score;
  }

  private countTimeWindowViolations(points: any[]): number {
    
    return 0; // Pour simplifier
  }

  // Méthodes implémentées
  private async getRouteById(routeId: string): Promise<OptimizedRoute | null> {
    try {
      const route = await this.db.delivererPlannedRoute.findUnique({
        where: { id: routeId },
        include: {
          deliverer: true,
          announcements: {
            include: {
              announcement: true,
            },
          },
        },
      });

      if (!route) return null;

      // Convertir la route en format OptimizedRoute
      const points: Array<RoutePoint & {
        order: number;
        estimatedArrival: Date;
        estimatedDeparture: Date;
        distanceFromPrevious: number;
        durationFromPrevious: number;
      }> = route.announcements.map((item, index) => ({
        id: item.announcement.id,
        latitude: item.announcement.pickupLatitude || 0,
        longitude: item.announcement.pickupLongitude || 0,
        type: "PICKUP" as const,
        priority: item.announcement.priority === "HIGH" ? 5 : 3,
        order: index + 1,
        estimatedArrival: new Date(Date.now() + index * 30 * 60 * 1000),
        estimatedDeparture: new Date(Date.now() + (index * 30 + 15) * 60 * 1000),
        distanceFromPrevious: index === 0 ? 0 : 5,
        durationFromPrevious: index === 0 ? 0 : 15,
      }));

      return {
        id: route.id,
        delivererId: route.delivererId,
        points,
        totalDistance: route.totalDistance || 0,
        totalDuration: route.estimatedDuration || 0,
        totalServiceTime: points.length * 15,
        efficiency: 0.8,
        feasibilityScore: 0.9,
        constraints: {
          maxDistance: route.maxDistance,
          maxDuration: route.maxDuration,
          timeWindows: true,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération de la route:", error);
      return null;
    }
  }

  private async insertUrgentDelivery(points: any[], urgentDelivery: RoutePoint, currentPos: any): Promise<any[]> {
    // Trouver la meilleure position pour insérer la livraison urgente
    let bestIndex = 1; // Après le point de départ
    let minAdditionalDistance = Infinity;

    for (let i = 1; i <= points.length; i++) {
      const prevPoint = i === 0 ? currentPos : points[i - 1];
      const nextPoint = i < points.length ? points[i] : null;

      let additionalDistance = 0;
      
      // Distance du point précédent vers la livraison urgente
      additionalDistance += this.calculateDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        urgentDelivery.latitude,
        urgentDelivery.longitude
      );

      // Distance de la livraison urgente vers le point suivant
      if (nextPoint) {
        additionalDistance += this.calculateDistance(
          urgentDelivery.latitude,
          urgentDelivery.longitude,
          nextPoint.latitude,
          nextPoint.longitude
        );
        
        // Soustraire la distance originale entre prev et next
        additionalDistance -= this.calculateDistance(
          prevPoint.latitude,
          prevPoint.longitude,
          nextPoint.latitude,
          nextPoint.longitude
        );
      }

      if (additionalDistance < minAdditionalDistance) {
        minAdditionalDistance = additionalDistance;
        bestIndex = i;
      }
    }

    // Insérer la livraison urgente à la meilleure position
    const result = [...points];
    result.splice(bestIndex, 0, urgentDelivery);
    return result;
  }

  private async avoidRoadBlocks(points: any[], roadBlocks: any[]): Promise<any[]> {
    if (!roadBlocks || roadBlocks.length === 0) return points;

    const adjustedPoints = [...points];

    for (const block of roadBlocks) {
      for (let i = 0; i < adjustedPoints.length; i++) {
        const point = adjustedPoints[i];
        
        // Vérifier si le point est dans la zone de blocage
        const distanceToBlock = this.calculateDistance(
          point.latitude,
          point.longitude,
          block.latitude,
          block.longitude
        );

        if (distanceToBlock <= (block.radius / 1000)) { // Convertir en km
          // Déplacer le point en dehors de la zone de blocage
          const angle = Math.random() * 2 * Math.PI;
          const offsetDistance = (block.radius / 1000) + 0.5; // Ajouter 500m de marge
          
          adjustedPoints[i] = {
            ...point,
            latitude: point.latitude + (offsetDistance / 111) * Math.cos(angle),
            longitude: point.longitude + (offsetDistance / (111 * Math.cos(point.latitude * Math.PI / 180))) * Math.sin(angle),
          };
        }
      }
    }

    return adjustedPoints;
  }

  private async reoptimizeFromCurrentPosition(delivererId: string, currentPos: any, points: any[]): Promise<OptimizedRoute> {
    // Recalculer la route optimale depuis la position actuelle
    const newStartPoint: RoutePoint = {
      id: "current-position",
      latitude: currentPos.latitude,
      longitude: currentPos.longitude,
      type: "WAYPOINT",
      priority: 5,
    };

    // Filtrer les points non encore visités
    const remainingPoints = points.filter(p => !p.completed);

    // Planifier une nouvelle route optimale
    return this.planOptimalRoute(delivererId, [newStartPoint, ...remainingPoints]);
  }

  private applyTrafficDelays(route: OptimizedRoute, delays: any[]): void {
    // Appliquer les retards de trafic
    delays.forEach(delay => {
      const point = route.points.find(p => p.id === delay.pointId);
      if (point) {
        point.estimatedArrival = new Date(point.estimatedArrival.getTime() + delay.delayMinutes * 60 * 1000);
      }
    });
  }
}

export const routePlanningService = new RoutePlanningService();