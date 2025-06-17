import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface GeographicZone {
  id: string;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number; // en km
  type: "CITY" | "DISTRICT" | "POSTAL_CODE" | "CUSTOM";
  isActive: boolean;
  deliveryDensity: number; // nombre de livraisons par km�
  averageDeliveryTime: number; // en minutes
  popularTimeSlots: string[];
}

export interface GeoMatchResult {
  zone: GeographicZone;
  distance: number;
  isInZone: boolean;
  proximityScore: number;
  estimatedDeliveryTime: number;
  suggestedPrice: number;
  trafficLevel: "LOW" | "MEDIUM" | "HIGH";
  popularityScore: number;
}

export interface DelivererPosition {
  delivererId: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
  isOnline: boolean;
  currentZone?: string;
  velocity?: number; // km/h
  heading?: number; // degr�s (0-360)
}

export class GeolocationMatchingService {
  /**
   * Trouve la meilleure zone g�ographique pour une annonce
   */
  async findOptimalZone(
    latitude: number,
    longitude: number,
    radius: number = 10
  ): Promise<GeoMatchResult[]> {
    try {
      // R�cup�rer les zones g�ographiques actives
      const zones = await this.getActiveZones(latitude, longitude, radius);
      
      const results: GeoMatchResult[] = [];
      
      for (const zone of zones) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          zone.centerLatitude,
          zone.centerLongitude
        );
        
        const isInZone = distance <= zone.radius;
        const proximityScore = this.calculateProximityScore(distance, zone.radius);
        const trafficLevel = await this.estimateTrafficLevel(zone.id);
        const estimatedDeliveryTime = this.calculateDeliveryTime(distance, trafficLevel);
        const suggestedPrice = this.calculateSuggestedPrice(distance, zone.deliveryDensity);
        const popularityScore = this.calculatePopularityScore(zone.deliveryDensity);
        
        results.push({ zone,
          distance,
          isInZone,
          proximityScore,
          estimatedDeliveryTime,
          suggestedPrice,
          trafficLevel,
          popularityScore
         });
      }
      
      // Trier par score de proximit� d�croissant
      return results.sort((a, b) => b.proximityScore - a.proximityScore);
    } catch (error) {
      console.error("Erreur lors de la recherche de zone optimale:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la recherche de zone g�ographique"
       });
    }
  }

  /**
   * Trouve les livreurs proches d'une position
   */
  async findNearbyDeliverers(
    latitude: number,
    longitude: number,
    radius: number = 20,
    filters: {
      isOnline?: boolean;
      minRating?: number;
      vehicleTypes?: string[];
      maxResults?: number;
    } = {}
  ): Promise<Array<DelivererPosition & { distance: number; estimatedArrival: number }>> {
    try {
      const {
        isOnline = true,
        minRating = 3.0,
        vehicleTypes = [],
        maxResults = 20
      } = filters;

      // Calculer les bornes g�ographiques pour la requ�te
      const bounds = this.calculateBounds(latitude, longitude, radius);
      
      // R�cup�rer les livreurs dans la zone
      const deliverers = await db.deliverer.findMany({
        where: {
          isActive: true,
          user: {
            isActive: true,
            latitude: {
              gte: bounds.minLat,
              lte: bounds.maxLat
            },
            longitude: {
              gte: bounds.minLng,
              lte: bounds.maxLng
            }
          },
          averageRating: { gte },
          ...(vehicleTypes.length > 0 ? {
            vehicle: {
              type: { in: vehicleTypes }
            }
          } : {}),
          ...(isOnline ? {
            lastSeenAt: {
              gte: new Date(Date.now() - 30 * 60 * 1000) // En ligne dans les 30 derni�res minutes
            }
          } : {})
        },
        include: {
          user: {
            select: {
              latitude: true,
              longitude: true,
              lastSeenAt: true
            }
          },
          vehicle: {
            select: {
              type: true,
              maxSpeed: true
            }
          }
        },
        take: maxResults * 2 // Prendre plus pour filtrer par distance exacte
      });

      // Calculer la distance exacte et filtrer
      const nearbyDeliverers = deliverers
        .map(deliverer => {
          if (!deliverer.user?.latitude || !deliverer.user?.longitude) {
            return null;
          }

          const distance = this.calculateDistance(
            latitude,
            longitude,
            deliverer.user.latitude,
            deliverer.user.longitude
          );

          if (distance > radius) {
            return null;
          }

          const avgSpeed = deliverer.vehicle?.maxSpeed || 40; // km/h par d�faut
          const estimatedArrival = Math.round((distance / avgSpeed) * 60); // en minutes

          return {
            delivererId: deliverer.id,
            latitude: deliverer.user.latitude,
            longitude: deliverer.user.longitude,
            lastUpdate: deliverer.user.lastSeenAt || new Date(),
            isOnline: this.isDelivererOnline(deliverer.user.lastSeenAt),
            distance,
            estimatedArrival
          };
        })
        .filter((result): result is NonNullable<typeof result> => result !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults);

      return nearbyDeliverers;
    } catch (error) {
      console.error("Erreur lors de la recherche de livreurs proches:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la recherche de livreurs proches"
       });
    }
  }

  /**
   * Met � jour la position d'un livreur
   */
  async updateDelivererPosition(
    delivererId: string,
    latitude: number,
    longitude: number,
    heading?: number,
    velocity?: number
  ): Promise<void> {
    try {
      // Mettre � jour la position dans la base de donn�es
      await db.deliverer.update({
        where: { id },
        data: {
          user: {
            update: {
              latitude,
              longitude,
              lastSeenAt: new Date()
            }
          }
        }
      });

      // Mettre � jour dans le cache en temps r�el (Redis/M�moire)
      await this.updatePositionCache({ delivererId,
        latitude,
        longitude,
        lastUpdate: new Date(),
        isOnline: true,
        velocity,
        heading
       });

      // V�rifier si le livreur entre dans une nouvelle zone
      await this.checkZoneTransition(delivererId, latitude, longitude);

    } catch (error) {
      console.error("Erreur lors de la mise � jour de position:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la mise � jour de position"
       });
    }
  }

  /**
   * Analyse la densit� de livraison dans une zone
   */
  async analyzeDeliveryDensity(
    latitude: number,
    longitude: number,
    radius: number = 5,
    timeRange: {
      start: Date;
      end: Date;
    }
  ): Promise<{
    totalDeliveries: number;
    densityPerKm2: number;
    averageDistance: number;
    popularTimeSlots: Array<{ hour: number; count: number }>;
    heatmapData: Array<{ lat: number; lng: number; intensity: number }>;
  }> {
    try {
      // R�cup�rer les livraisons dans la zone et la p�riode
      const bounds = this.calculateBounds(latitude, longitude, radius);
      
      const deliveries = await db.delivery.findMany({
        where: {
          pickupLatitude: {
            gte: bounds.minLat,
            lte: bounds.maxLat
          },
          pickupLongitude: {
            gte: bounds.minLng,
            lte: bounds.maxLng
          },
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end
          },
          status: "COMPLETED"
        },
        select: {
          pickupLatitude: true,
          pickupLongitude: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
          createdAt: true,
          completedAt: true
        }
      });

      // Calculer les m�triques
      const totalDeliveries = deliveries.length;
      const area = Math.PI * radius * radius; // km�
      const densityPerKm2 = totalDeliveries / area;

      // Calculer la distance moyenne
      const totalDistance = deliveries.reduce((sum, delivery) => {
        const distance = this.calculateDistance(
          delivery.pickupLatitude,
          delivery.pickupLongitude,
          delivery.deliveryLatitude,
          delivery.deliveryLongitude
        );
        return sum + distance;
      }, 0);
      const averageDistance = totalDeliveries > 0 ? totalDistance / totalDeliveries : 0;

      // Analyser les cr�neaux horaires populaires
      const hourCounts: { [hour: number]: number } = {};
      deliveries.forEach(delivery => {
        const hour = new Date(delivery.createdAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const popularTimeSlots = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count  }))
        .sort((a, b) => b.count - a.count);

      // G�n�rer les donn�es de heatmap
      const heatmapData = this.generateHeatmapData(deliveries, radius);

      return {
        totalDeliveries,
        densityPerKm2,
        averageDistance,
        popularTimeSlots,
        heatmapData
      };
    } catch (error) {
      console.error("Erreur lors de l'analyse de densit�:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'analyse de densit� de livraison"
       });
    }
  }

  /**
   * Optimise les routes pour plusieurs livraisons
   */
  async optimizeMultiDeliveryRoute(
    startLatitude: number,
    startLongitude: number,
    deliveryPoints: Array<{
      id: string;
      latitude: number;
      longitude: number;
      priority: number; // 1-5
      timeWindow?: {
        start: Date;
        end: Date;
      };
    }>
  ): Promise<{
    optimizedRoute: Array<{
      pointId: string;
      order: number;
      estimatedArrival: Date;
      distanceFromPrevious: number;
    }>;
    totalDistance: number;
    totalDuration: number;
    routeEfficiency: number;
  }> {
    try {
      // Algorithme de routage optimis� (version simplifi�e du TSP)
      const optimizedRoute = await this.solveTravelingSalesmanProblem(
        { latitude: startLatitude, longitude: startLongitude },
        deliveryPoints
      );

      // Calculer les m�triques de la route
      const totalDistance = 0;
      const totalDuration = 0;
      const currentLat = startLatitude;
      const currentLng = startLongitude;
      const currentTime = new Date();

      const routeWithDetails = optimizedRoute.map((point, index) => {
        const distance = this.calculateDistance(currentLat, currentLng, point.latitude, point.longitude);
        const duration = this.estimateTravelTime(distance);
        
        currentTime = new Date(currentTime.getTime() + duration * 60 * 1000);
        totalDistance += distance;
        totalDuration += duration;
        
        const result = {
          pointId: point.id,
          order: index + 1,
          estimatedArrival: new Date(currentTime),
          distanceFromPrevious: distance
        };

        currentLat = point.latitude;
        currentLng = point.longitude;
        
        return result;
      });

      // Calculer l'efficacit� de la route
      const directDistance = deliveryPoints.reduce((sum, point) => {
        return sum + this.calculateDistance(startLatitude, startLongitude, point.latitude, point.longitude);
      }, 0);
      const routeEfficiency = directDistance / totalDistance;

      return {
        optimizedRoute: routeWithDetails,
        totalDistance,
        totalDuration,
        routeEfficiency
      };
    } catch (error) {
      console.error("Erreur lors de l'optimisation de route:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'optimisation de route"
       });
    }
  }

  // M�thodes priv�es utilitaires

  private async getActiveZones(lat: number, lng: number, radius: number): Promise<GeographicZone[]> {
    // Pour l'instant, retourner des zones simul�es
    // � impl�menter avec les vraies donn�es de la base
    return [
      {
        id: "zone-1",
        name: "Centre Ville",
        centerLatitude: lat,
        centerLongitude: lng,
        radius: 5,
        type: "CITY",
        isActive: true,
        deliveryDensity: 8.5,
        averageDeliveryTime: 25,
        popularTimeSlots: ["12:00-14:00", "18:00-20:00"]
      }
    ];
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateBounds(lat: number, lng: number, radius: number): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } {
    const latDelta = radius / 111; // Approximation: 1 degr� H 111 km
    const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
    
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta
    };
  }

  private calculateProximityScore(distance: number, zoneRadius: number): number {
    if (distance <= zoneRadius) {
      return 100 - (distance / zoneRadius) * 50; // Score 50-100 dans la zone
    } else {
      const penalty = Math.min((distance - zoneRadius) / zoneRadius, 1);
      return Math.max(0, 50 - penalty * 50); // Score 0-50 hors zone
    }
  }

  private async estimateTrafficLevel(zoneId: string): Promise<"LOW" | "MEDIUM" | "HIGH"> {
    try {
      // Récupérer les données de trafic historiques depuis la base de données
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
      
      // Récupérer les données de livraison des 30 derniers jours pour cette zone et cette heure
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const historicalData = await this.db.delivery.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
          OR: [
            { pickupLatitude: { not: null } },
            { deliveryLatitude: { not: null } },
          ],
        },
        select: {
          createdAt: true,
          actualDeliveryTime: true,
          estimatedDeliveryTime: true,
        },
      });

      // Filtrer par heure et jour de la semaine
      const relevantDeliveries = historicalData.filter(delivery => {
        const deliveryTime = new Date(delivery.createdAt);
        const deliveryHour = deliveryTime.getHours();
        const deliveryDay = deliveryTime.getDay();
        
        return Math.abs(deliveryHour - hour) <= 1 && deliveryDay === dayOfWeek;
      });

      if (relevantDeliveries.length === 0) {
        // Fallback vers la logique simple si pas assez de données
        if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
          return "HIGH"; // Heures de pointe
        } else if (hour >= 11 && hour <= 14 || hour >= 20 && hour <= 22) {
          return "MEDIUM"; // Heures moyennement chargées
        } else {
          return "LOW"; // Heures creuses
        }
      }

      // Calculer la moyenne des retards
      const delays = relevantDeliveries
        .filter(d => d.actualDeliveryTime && d.estimatedDeliveryTime)
        .map(d => {
          const actual = new Date(d.actualDeliveryTime!).getTime();
          const estimated = new Date(d.estimatedDeliveryTime!).getTime();
          return (actual - estimated) / (1000 * 60); // Retard en minutes
        });

      if (delays.length === 0) {
        return "MEDIUM";
      }

      const averageDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
      const deliveryCount = relevantDeliveries.length;

      // Déterminer le niveau de trafic basé sur le retard moyen et le volume
      if (averageDelay > 15 || deliveryCount > 50) {
        return "HIGH";
      } else if (averageDelay > 5 || deliveryCount > 20) {
        return "MEDIUM";
      } else {
        return "LOW";
      }
    } catch (error) {
      console.error("Erreur lors de l'estimation du trafic:", error);
      // Fallback vers la logique simple
      const hour = new Date().getHours();
      if (hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19) {
        return "HIGH";
      } else if (hour >= 11 && hour <= 14 || hour >= 20 && hour <= 22) {
        return "MEDIUM";
      } else {
        return "LOW";
      }
    }
  }

  private calculateDeliveryTime(distance: number, trafficLevel: "LOW" | "MEDIUM" | "HIGH"): number {
    const baseSpeed = trafficLevel === "HIGH" ? 20 : trafficLevel === "MEDIUM" ? 35 : 50; // km/h
    return Math.round((distance / baseSpeed) * 60); // en minutes
  }

  private calculateSuggestedPrice(distance: number, density: number): number {
    const basePrice = distance * 1.2; // 1.20�/km
    
    // Ajustement selon la densit� (plus de demande = prix plus �lev�)
    const densityMultiplier = Math.min(1.5, 1 + (density / 10) * 0.3);
    basePrice *= densityMultiplier;
    
    return Math.round(basePrice * 100) / 100;
  }

  private calculatePopularityScore(density: number): number {
    // Score de 0 � 100 bas� sur la densit�
    return Math.min(100, density * 10);
  }

  private isDelivererOnline(lastSeenAt: Date | null): boolean {
    if (!lastSeenAt) return false;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return lastSeenAt > thirtyMinutesAgo;
  }

  private async updatePositionCache(position: DelivererPosition): Promise<void> {
    // Mise à jour de la position en base de données
    try {
      await db.deliverer.update({
        where: { id: position.delivererId },
        data: {
          user: {
            update: {
              latitude: position.latitude,
              longitude: position.longitude,
              lastSeenAt: position.lastUpdate,
            }
          }
        }
      });

      // Optionnel: Émettre un événement WebSocket pour les clients connectés
      if (global.io) {
        global.io.to(`deliverer-${position.delivererId}`).emit('position-update', {
          latitude: position.latitude,
          longitude: position.longitude,
          timestamp: position.lastUpdate,
          velocity: position.velocity,
          heading: position.heading,
        });
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de position pour ${position.delivererId}:`, error);
    }
  }

  private async checkZoneTransition(delivererId: string, lat: number, lng: number): Promise<void> {
    try {
      // Récupérer les zones actives dans la région
      const nearbyZones = await this.getActiveZones(lat, lng, 10);
      
      // Récupérer la zone actuelle du livreur
      const deliverer = await db.deliverer.findUnique({
        where: { id: delivererId },
        select: { currentZone: true }
      });

      const currentZone = deliverer?.currentZone;
      
      // Vérifier si le livreur est entré dans une nouvelle zone
      const newZone = nearbyZones.find(zone => {
        const distance = this.calculateDistance(lat, lng, zone.centerLatitude, zone.centerLongitude);
        return distance <= zone.radius;
      });

      if (newZone && newZone.id !== currentZone) {
        // Mettre à jour la zone du livreur
        await db.deliverer.update({
          where: { id: delivererId },
          data: { currentZone: newZone.id }
        });

        // Notifier le livreur du changement de zone
        if (global.io) {
          global.io.to(`deliverer-${delivererId}`).emit('zone-transition', {
            previousZone: currentZone,
            newZone: newZone.id,
            zoneName: newZone.name,
            timestamp: new Date(),
          });
        }

        console.log(`Livreur ${delivererId} est entré dans la zone ${newZone.name}`);
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de transition de zone pour ${delivererId}:`, error);
    }
  }

  private generateHeatmapData(
    deliveries: Array<{ pickupLatitude: number; pickupLongitude: number }>,
    radius: number
  ): Array<{ lat: number; lng: number; intensity: number }> {
    // G�n�rer une grille de points avec leur intensit�
    const gridSize = 20; // Grille 20x20
    const heatmapData: Array<{ lat: number; lng: number; intensity: number }> = [];
    
    // Pour simplifier, compter les livraisons dans chaque cellule de la grille
    const bounds = {
      minLat: Math.min(...deliveries.map(d => d.pickupLatitude)),
      maxLat: Math.max(...deliveries.map(d => d.pickupLatitude)),
      minLng: Math.min(...deliveries.map(d => d.pickupLongitude)),
      maxLng: Math.max(...deliveries.map(d => d.pickupLongitude))
    };
    
    const latStep = (bounds.maxLat - bounds.minLat) / gridSize;
    const lngStep = (bounds.maxLng - bounds.minLng) / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const lat = bounds.minLat + i * latStep;
        const lng = bounds.minLng + j * lngStep;
        
        // Compter les livraisons dans cette cellule
        const intensity = deliveries.filter(delivery => {
          return delivery.pickupLatitude >= lat && delivery.pickupLatitude < lat + latStep &&
                 delivery.pickupLongitude >= lng && delivery.pickupLongitude < lng + lngStep;
        }).length;
        
        if (intensity > 0) {
          heatmapData.push({ lat, lng, intensity  });
        }
      }
    }
    
    return heatmapData;
  }

  private estimateTravelTime(distance: number): number {
    // Estimation simple du temps de trajet (en minutes)
    const avgSpeed = 40; // km/h
    return Math.round((distance / avgSpeed) * 60);
  }

  private async solveTravelingSalesmanProblem(
    start: { latitude: number; longitude: number },
    points: Array<{ id: string; latitude: number; longitude: number; priority: number }>
  ): Promise<Array<{ id: string; latitude: number; longitude: number }>> {
    // Algorithme glouton simple pour r�soudre le TSP
    // Pour une impl�mentation plus complexe, utiliser des algorithmes comme 2-opt, genetic, etc.
    
    const unvisited = [...points];
    const route: Array<{ id: string; latitude: number; longitude: number }> = [];
    const currentPos = start;
    
    // Trier d'abord par priorit�
    unvisited.sort((a, b) => b.priority - a.priority);
    
    while (unvisited.length > 0) {
      // Trouver le point le plus proche parmi ceux de priorit� �lev�e
      const nearestIndex = 0;
      const nearestDistance = Infinity;
      
      const highPriorityPoints = unvisited.filter(p => p.priority >= 4);
      const searchSet = highPriorityPoints.length > 0 ? highPriorityPoints : unvisited;
      
      for (let i = 0; i < searchSet.length; i++) {
        const distance = this.calculateDistance(
          currentPos.latitude,
          currentPos.longitude,
          searchSet[i].latitude,
          searchSet[i].longitude
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = unvisited.indexOf(searchSet[i]);
        }
      }
      
      const nearestPoint = unvisited.splice(nearestIndex, 1)[0];
      route.push(nearestPoint);
      currentPos = nearestPoint;
    }
    
    return route;
  }
}

export const geolocationMatchingService = new GeolocationMatchingService();
