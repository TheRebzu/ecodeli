/**
 * Service de tracking géolocalisation en temps réel pour les livraisons
 * Remplace les fonctions mockées par une vraie implémentation
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import { prisma } from "@/server/db";
import { notificationService } from "@/server/services/common/notification.service";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number; // km/h
  heading?: number; // degrés
  altitude?: number; // mètres
}

export interface DeliveryTrackingUpdate {
  deliveryId: string;
  location: LocationData;
  status?: string;
  estimatedTimeOfArrival?: Date;
  distanceToDestination?: number; // mètres
  notes?: string;
}

export interface ProximityAlert {
  type: "APPROACHING" | "NEARBY" | "ARRIVED";
  distance: number; // mètres
  eta: number; // minutes
  message: string;
}

export class RealTimeTrackingService {
  private readonly PROXIMITY_THRESHOLDS = {
    APPROACHING: 2000, // 2km
    NEARBY: 500, // 500m
    ARRIVED: 50, // 50m
  };

  private readonly SPEED_CALCULATION_WINDOW = 5 * 60 * 1000; // 5 minutes en ms

  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Met à jour la position d'un livreur en temps réel
   */
  async updateDelivererLocation(
    delivererId: string,
    location: LocationData,
  ): Promise<{
    success: boolean;
    proximityAlerts?: ProximityAlert[];
    deliveryUpdates?: Array<{ deliveryId: string; alert: ProximityAlert }>;
  }> {
    try {
      // Enregistrer la position dans l'historique de géolocalisation
      await this.saveLocationToHistory(delivererId, location);

      // Trouver les livraisons actives du livreur
      const activeDeliveries = await this.getActiveDeliveriesForDeliverer(delivererId);

      const deliveryUpdates: Array<{ deliveryId: string; alert: ProximityAlert }> = [];
      const proximityAlerts: ProximityAlert[] = [];

      for (const delivery of activeDeliveries) {
        // Calculer la distance à la destination
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          delivery.deliveryLatitude!,
          delivery.deliveryLongitude!,
        );

        // Calculer l'ETA basé sur la vitesse actuelle et la distance
        const eta = await this.calculateETA(delivererId, location, distance);

        // Détecter les alertes de proximité
        const alert = this.checkProximityAlert(distance, eta);
        
        if (alert) {
          proximityAlerts.push(alert);
          deliveryUpdates.push({ deliveryId: delivery.id, alert });

          // Envoyer les notifications aux clients selon le type d'alerte
          await this.sendProximityNotification(delivery.id, alert, distance, eta);
        }

        // Mettre à jour l'ETA et la distance dans la base de données
        await this.updateDeliveryProgress(delivery.id, location, distance, eta);
      }

      // Mettre à jour la position actuelle du livreur
      await this.updateDelivererCurrentPosition(delivererId, location);

      return {
        success: true,
        proximityAlerts,
        deliveryUpdates,
      };
    } catch (error) {
      logger.error("Erreur mise à jour position livreur:", error);
      return { success: false };
    }
  }

  /**
   * Obtient la position actuelle d'un livreur
   */
  async getDelivererCurrentLocation(delivererId: string): Promise<LocationData | null> {
    try {
      const deliverer = await this.prisma.deliverer.findUnique({
        where: { id: delivererId },
        select: {
          currentLatitude: true,
          currentLongitude: true,
          lastLocationUpdate: true,
          metadata: true,
        },
      });

      if (!deliverer?.currentLatitude || !deliverer?.currentLongitude) {
        return null;
      }

      const metadata = deliverer.metadata as any;

      return {
        latitude: deliverer.currentLatitude,
        longitude: deliverer.currentLongitude,
        accuracy: metadata?.location?.accuracy || 10,
        timestamp: deliverer.lastLocationUpdate || new Date(),
        speed: metadata?.location?.speed,
        heading: metadata?.location?.heading,
        altitude: metadata?.location?.altitude,
      };
    } catch (error) {
      logger.error("Erreur récupération position livreur:", error);
      return null;
    }
  }

  /**
   * Obtient l'historique des positions d'une livraison
   */
  async getDeliveryTrackingHistory(
    deliveryId: string,
    limit: number = 50,
  ): Promise<LocationData[]> {
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { delivererId: true },
      });

      if (!delivery?.delivererId) {
        return [];
      }

      const locations = await this.prisma.delivererLocationHistory.findMany({
        where: {
          delivererId: delivery.delivererId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      return locations.map((loc) => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy || 10,
        timestamp: loc.createdAt,
        speed: loc.speed || undefined,
        heading: loc.heading || undefined,
        altitude: loc.altitude || undefined,
      }));
    } catch (error) {
      logger.error("Erreur récupération historique tracking:", error);
      return [];
    }
  }

  /**
   * Calcule l'itinéraire optimisé pour un livreur
   */
  async calculateOptimizedRoute(
    delivererId: string,
    destinations: Array<{ latitude: number; longitude: number; priority?: number }>,
  ): Promise<{
    optimizedOrder: number[];
    totalDistance: number;
    estimatedDuration: number; // minutes
    waypoints: Array<{ latitude: number; longitude: number; order: number }>;
  }> {
    try {
      const currentLocation = await this.getDelivererCurrentLocation(delivererId);
      
      if (!currentLocation) {
        throw new Error("Position actuelle du livreur non disponible");
      }

      // Algorithme simplifié du voyageur de commerce pour optimiser l'ordre
      const optimizedOrder = this.optimizeDeliveryOrder(
        currentLocation,
        destinations,
      );

      // Calculer les distances et durées
      let totalDistance = 0;
      let estimatedDuration = 0;

      const waypoints = optimizedOrder.map((index, order) => ({
        latitude: destinations[index].latitude,
        longitude: destinations[index].longitude,
        order: order + 1,
      }));

      // Calculer distance de la position actuelle au premier point
      if (waypoints.length > 0) {
        totalDistance += this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          waypoints[0].latitude,
          waypoints[0].longitude,
        );
      }

      // Calculer distances entre les points
      for (let i = 0; i < waypoints.length - 1; i++) {
        const distance = this.calculateDistance(
          waypoints[i].latitude,
          waypoints[i].longitude,
          waypoints[i + 1].latitude,
          waypoints[i + 1].longitude,
        );
        totalDistance += distance;
      }

      // Estimer la durée (vitesse moyenne 30km/h en ville + temps d'arrêt)
      estimatedDuration = (totalDistance / 30) * 60 + destinations.length * 5; // 5 min par arrêt

      return {
        optimizedOrder,
        totalDistance: Math.round(totalDistance * 1000) / 1000, // Arrondir à 3 décimales
        estimatedDuration: Math.round(estimatedDuration),
        waypoints,
      };
    } catch (error) {
      logger.error("Erreur calcul itinéraire optimisé:", error);
      throw error;
    }
  }

  /**
   * Démarre le tracking d'une livraison
   */
  async startDeliveryTracking(deliveryId: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: "IN_TRANSIT",
          startedAt: new Date(),
          metadata: {
            ...(await this.getDeliveryMetadata(deliveryId)),
            tracking: {
              started: true,
              startTime: new Date().toISOString(),
            },
          },
        },
      });

      // Notifier le client que le tracking a démarré
      const delivery = await this.getDeliveryWithClient(deliveryId);
      if (delivery?.clientId) {
        await notificationService.sendUserNotification({
          userId: delivery.clientId,
          title: "Suivi de livraison activé",
          message: "Votre livreur a démarré la livraison. Vous pouvez suivre sa progression en temps réel.",
          type: "DELIVERY_STARTED" as any,
          actionUrl: `/client/deliveries/${deliveryId}/tracking`,
        });
      }

      return { success: true };
    } catch (error) {
      logger.error("Erreur démarrage tracking:", error);
      return { success: false };
    }
  }

  /**
   * Arrête le tracking d'une livraison
   */
  async stopDeliveryTracking(
    deliveryId: string,
    finalLocation: LocationData,
    status: "DELIVERED" | "NOT_DELIVERED" | "CANCELLED" = "DELIVERED",
  ): Promise<{ success: boolean }> {
    try {
      await this.prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status,
          completedAt: new Date(),
          deliveryLatitude: finalLocation.latitude,
          deliveryLongitude: finalLocation.longitude,
          metadata: {
            ...(await this.getDeliveryMetadata(deliveryId)),
            tracking: {
              completed: true,
              endTime: new Date().toISOString(),
              finalLocation,
            },
          },
        },
      });

      return { success: true };
    } catch (error) {
      logger.error("Erreur arrêt tracking:", error);
      return { success: false };
    }
  }

  /**
   * Méthodes utilitaires privées
   */
  private async saveLocationToHistory(
    delivererId: string,
    location: LocationData,
  ): Promise<void> {
    await this.prisma.delivererLocationHistory.create({
      data: {
        delivererId,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        altitude: location.altitude,
        createdAt: location.timestamp,
      },
    });
  }

  private async getActiveDeliveriesForDeliverer(delivererId: string) {
    return this.prisma.delivery.findMany({
      where: {
        delivererId,
        status: {
          in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"],
        },
      },
      select: {
        id: true,
        clientId: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        status: true,
      },
    });
  }

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

  private async calculateETA(
    delivererId: string,
    currentLocation: LocationData,
    distanceToDestination: number,
  ): Promise<number> {
    try {
      // Récupérer la vitesse moyenne récente du livreur
      const recentLocations = await this.prisma.delivererLocationHistory.findMany({
        where: {
          delivererId,
          createdAt: {
            gte: new Date(Date.now() - this.SPEED_CALCULATION_WINDOW),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      let avgSpeed = 25; // km/h par défaut

      if (recentLocations.length >= 2) {
        // Calculer la vitesse moyenne sur les derniers points
        const speeds: number[] = [];
        
        for (let i = 0; i < recentLocations.length - 1; i++) {
          const loc1 = recentLocations[i];
          const loc2 = recentLocations[i + 1];
          
          const distance = this.calculateDistance(
            loc1.latitude,
            loc1.longitude,
            loc2.latitude,
            loc2.longitude,
          );
          
          const timeDiff = (loc1.createdAt.getTime() - loc2.createdAt.getTime()) / (1000 * 60 * 60); // heures
          
          if (timeDiff > 0) {
            const speed = distance / timeDiff;
            if (speed > 0 && speed < 100) { // Filtrer les valeurs aberrantes
              speeds.push(speed);
            }
          }
        }

        if (speeds.length > 0) {
          avgSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
        }
      }

      // Calculer l'ETA en minutes
      const etaHours = distanceToDestination / avgSpeed;
      return Math.round(etaHours * 60);
    } catch (error) {
      logger.error("Erreur calcul ETA:", error);
      // Fallback: 25 km/h vitesse moyenne
      return Math.round((distanceToDestination / 25) * 60);
    }
  }

  private checkProximityAlert(distance: number, eta: number): ProximityAlert | null {
    if (distance <= this.PROXIMITY_THRESHOLDS.ARRIVED) {
      return {
        type: "ARRIVED",
        distance,
        eta,
        message: "Le livreur est arrivé à destination",
      };
    } else if (distance <= this.PROXIMITY_THRESHOLDS.NEARBY) {
      return {
        type: "NEARBY",
        distance,
        eta,
        message: `Le livreur est à ${Math.round(distance)}m de votre adresse`,
      };
    } else if (distance <= this.PROXIMITY_THRESHOLDS.APPROACHING) {
      return {
        type: "APPROACHING",
        distance,
        eta,
        message: `Le livreur arrivera dans environ ${eta} minutes`,
      };
    }

    return null;
  }

  private async sendProximityNotification(
    deliveryId: string,
    alert: ProximityAlert,
    distance: number,
    eta: number,
  ): Promise<void> {
    try {
      const delivery = await this.getDeliveryWithClient(deliveryId);
      if (!delivery?.clientId) return;

      let notificationType: any;
      let title: string;

      switch (alert.type) {
        case "APPROACHING":
          notificationType = "DELIVERY_APPROACHING";
          title = "Votre livreur arrive bientôt";
          break;
        case "NEARBY":
          notificationType = "DELIVERY_NEARBY";
          title = "Votre livreur est à proximité";
          break;
        case "ARRIVED":
          notificationType = "DELIVERY_ARRIVED";
          title = "Votre livreur est arrivé";
          break;
      }

      await notificationService.sendUserNotification({
        userId: delivery.clientId,
        title,
        message: alert.message,
        type: notificationType,
        channel: "PUSH" as any,
        actionUrl: `/client/deliveries/${deliveryId}/tracking`,
        priority: alert.type === "ARRIVED" ? "HIGH" : "MEDIUM",
      });
    } catch (error) {
      logger.error("Erreur envoi notification proximité:", error);
    }
  }

  private async updateDeliveryProgress(
    deliveryId: string,
    location: LocationData,
    distance: number,
    eta: number,
  ): Promise<void> {
    const metadata = await this.getDeliveryMetadata(deliveryId);
    
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        metadata: {
          ...metadata,
          tracking: {
            ...metadata.tracking,
            lastUpdate: new Date().toISOString(),
            currentLocation: location,
            distanceToDestination: distance,
            estimatedTimeOfArrival: new Date(Date.now() + eta * 60 * 1000).toISOString(),
          },
        },
      },
    });
  }

  private async updateDelivererCurrentPosition(
    delivererId: string,
    location: LocationData,
  ): Promise<void> {
    await this.prisma.deliverer.update({
      where: { id: delivererId },
      data: {
        currentLatitude: location.latitude,
        currentLongitude: location.longitude,
        lastLocationUpdate: location.timestamp,
        metadata: {
          location: {
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            altitude: location.altitude,
          },
        },
      },
    });
  }

  private optimizeDeliveryOrder(
    startLocation: LocationData,
    destinations: Array<{ latitude: number; longitude: number; priority?: number }>,
  ): number[] {
    if (destinations.length <= 1) {
      return destinations.map((_, index) => index);
    }

    // Algorithme glouton simple pour l'optimisation
    const unvisited = destinations.map((_, index) => index);
    const optimized: number[] = [];
    let currentLat = startLocation.latitude;
    let currentLon = startLocation.longitude;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      unvisited.forEach((destIndex, arrayIndex) => {
        const dest = destinations[destIndex];
        let distance = this.calculateDistance(currentLat, currentLon, dest.latitude, dest.longitude);
        
        // Facteur de priorité (plus la priorité est élevée, plus la "distance" diminue)
        if (dest.priority && dest.priority > 1) {
          distance = distance / dest.priority;
        }

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = arrayIndex;
        }
      });

      const chosenDestIndex = unvisited[nearestIndex];
      optimized.push(chosenDestIndex);
      
      currentLat = destinations[chosenDestIndex].latitude;
      currentLon = destinations[chosenDestIndex].longitude;
      
      unvisited.splice(nearestIndex, 1);
    }

    return optimized;
  }

  private async getDeliveryMetadata(deliveryId: string): Promise<any> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { metadata: true },
    });
    return delivery?.metadata || {};
  }

  private async getDeliveryWithClient(deliveryId: string) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, clientId: true },
    });
  }
}

// Export du service instancié
export const realTimeTrackingService = new RealTimeTrackingService();