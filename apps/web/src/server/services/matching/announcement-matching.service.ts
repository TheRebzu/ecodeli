/**
 * Service de matching intelligent pour les annonces et trajets
 * Implémente l'algorithme de correspondance selon le cahier des charges
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/utils/logger';
import { getDistance, getBearing, getDestinationPoint } from '@/server/utils/distance-calculator.util';

export interface MatchingCriteria {
  routeId: string;
  announcementId: string;
  compatibilityScore: number;
  reasons: string[];
  distance: number;
  detourPercentage: number;
  priceEstimate: number;
  estimatedDuration: string;
  matchingPoints: {
    pickup: { latitude: number; longitude: number; address: string };
    delivery: { latitude: number; longitude: number; address: string };
  };
}

export interface RouteData {
  id: string;
  delivererId: string;
  departureAddress: string;
  departureLatitude: number;
  departureLongitude: number;
  arrivalAddress: string;
  arrivalLatitude: number;
  arrivalLongitude: number;
  departureDate?: Date;
  arrivalDate?: Date;
  isRecurring: boolean;
  recurringDays: number[];
  maxWeight: number;
  maxVolume?: number;
  availableSeats: number;
  acceptsFragile: boolean;
  acceptsCooling: boolean;
  acceptsLiveAnimals: boolean;
  acceptsOversized: boolean;
  pricePerKm: number;
  fixedPrice?: number;
  isNegotiable: boolean;
  minMatchDistance: number;
  maxDetour: number;
  intermediatePoints: Array<{
    address: string;
    latitude: number;
    longitude: number;
    radius: number;
  }>;
}

export interface AnnouncementData {
  id: string;
  clientId: string;
  title: string;
  type: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  pickupDate?: Date;
  deliveryDate?: Date;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  needsCooling: boolean;
  suggestedPrice: number;
  isNegotiable: boolean;
  priority: string;
  isFlexible: boolean;
  status: string;
}

export class AnnouncementMatchingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Trouve les correspondances entre annonces et trajets
   */
  async findMatches(
    announcement: AnnouncementData,
    availableRoutes: RouteData[]
  ): Promise<MatchingCriteria[]> {
    try {
      const matches: MatchingCriteria[] = [];

      for (const route of availableRoutes) {
        const match = await this.evaluateMatch(announcement, route);
        if (match && match.compatibilityScore >= 50) { // Seuil minimum
          matches.push(match);
        }
      }

      // Trier par score de compatibilité décroissant
      return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    } catch (error) {
      logger.error('Erreur lors du matching:', error);
      throw new Error('Erreur lors de la recherche de correspondances');
    }
  }

  /**
   * Évalue la compatibilité entre une annonce et un trajet
   */
  private async evaluateMatch(
    announcement: AnnouncementData,
    route: RouteData
  ): Promise<MatchingCriteria | null> {
    try {
      // 1. Vérifier la compatibilité géographique
      const geographicMatch = this.checkGeographicCompatibility(announcement, route);
      if (!geographicMatch.isCompatible) {
        return null;
      }

      // 2. Vérifier la compatibilité temporelle
      const temporalMatch = this.checkTemporalCompatibility(announcement, route);
      if (!temporalMatch.isCompatible) {
        return null;
      }

      // 3. Vérifier la compatibilité des capacités
      const capacityMatch = this.checkCapacityCompatibility(announcement, route);
      if (!capacityMatch.isCompatible) {
        return null;
      }

      // 4. Calculer le score de compatibilité
      const score = this.calculateCompatibilityScore(
        geographicMatch,
        temporalMatch,
        capacityMatch,
        announcement,
        route
      );

      // 5. Calculer les détails du trajet
      const routeDetails = this.calculateRouteDetails(announcement, route, geographicMatch);

      // 6. Générer les raisons du matching
      const reasons = this.generateMatchingReasons(
        geographicMatch,
        temporalMatch,
        capacityMatch,
        announcement,
        route
      );

      return {
        routeId: route.id,
        announcementId: announcement.id,
        compatibilityScore: score,
        reasons,
        distance: geographicMatch.totalDistance,
        detourPercentage: geographicMatch.detourPercentage,
        priceEstimate: this.calculatePriceEstimate(announcement, route, routeDetails),
        estimatedDuration: this.calculateEstimatedDuration(routeDetails.totalDistance),
        matchingPoints: {
          pickup: {
            latitude: announcement.pickupLatitude,
            longitude: announcement.pickupLongitude,
            address: announcement.pickupAddress,
          },
          delivery: {
            latitude: announcement.deliveryLatitude,
            longitude: announcement.deliveryLongitude,
            address: announcement.deliveryAddress,
          },
        },
      };
    } catch (error) {
      logger.error('Erreur lors de l\'évaluation du match:', error);
      return null;
    }
  }

  /**
   * Vérifie la compatibilité géographique
   */
  private checkGeographicCompatibility(
    announcement: AnnouncementData,
    route: RouteData
  ) {
    // Distance originale du trajet
    const originalDistance = getDistance(
      route.departureLatitude,
      route.departureLongitude,
      route.arrivalLatitude,
      route.arrivalLongitude
    );

    // Vérifier si les points de l'annonce sont sur le trajet ou à proximité
    let bestMatch = null;
    let minDetour = Infinity;

    // Vérifier le trajet direct
    const directMatch = this.checkDirectRouteMatch(announcement, route, originalDistance);
    if (directMatch && directMatch.detourPercentage <= route.maxDetour) {
      bestMatch = directMatch;
      minDetour = directMatch.detourPercentage;
    }

    // Vérifier les points intermédiaires
    for (const point of route.intermediatePoints) {
      const intermediateMatch = this.checkIntermediatePointMatch(
        announcement,
        route,
        point,
        originalDistance
      );
      if (intermediateMatch && intermediateMatch.detourPercentage < minDetour) {
        bestMatch = intermediateMatch;
        minDetour = intermediateMatch.detourPercentage;
      }
    }

    return bestMatch || { isCompatible: false };
  }

  /**
   * Vérifie si l'annonce correspond au trajet direct
   */
  private checkDirectRouteMatch(
    announcement: AnnouncementData,
    route: RouteData,
    originalDistance: number
  ) {
    // Distance du point de départ à la collecte
    const distanceToDeparture = getDistance(
      route.departureLatitude,
      route.departureLongitude,
      announcement.pickupLatitude,
      announcement.pickupLongitude
    );

    // Distance de la collecte à la livraison
    const distancePickupToDelivery = getDistance(
      announcement.pickupLatitude,
      announcement.pickupLongitude,
      announcement.deliveryLatitude,
      announcement.deliveryLongitude
    );

    // Distance de la livraison à l'arrivée
    const distanceToArrival = getDistance(
      announcement.deliveryLatitude,
      announcement.deliveryLongitude,
      route.arrivalLatitude,
      route.arrivalLongitude
    );

    // Distance totale avec détour
    const totalWithDetour = distanceToDeparture + distancePickupToDelivery + distanceToArrival;
    
    // Vérifier si c'est dans la distance minimale de matching
    if (distanceToDeparture > route.minMatchDistance || distanceToArrival > route.minMatchDistance) {
      return null;
    }

    const detourPercentage = ((totalWithDetour - originalDistance) / originalDistance) * 100;

    return {
      isCompatible: true,
      totalDistance: distancePickupToDelivery,
      detourPercentage: Math.max(0, detourPercentage),
      matchType: 'DIRECT_ROUTE',
    };
  }

  /**
   * Vérifie la correspondance avec un point intermédiaire
   */
  private checkIntermediatePointMatch(
    announcement: AnnouncementData,
    route: RouteData,
    intermediatePoint: any,
    originalDistance: number
  ) {
    // Distance du point intermédiaire à la collecte
    const distanceToPickup = getDistance(
      intermediatePoint.latitude,
      intermediatePoint.longitude,
      announcement.pickupLatitude,
      announcement.pickupLongitude
    );

    // Distance de la collecte à la livraison
    const distancePickupToDelivery = getDistance(
      announcement.pickupLatitude,
      announcement.pickupLongitude,
      announcement.deliveryLatitude,
      announcement.deliveryLongitude
    );

    // Vérifier si dans le rayon du point intermédiaire
    if (distanceToPickup > intermediatePoint.radius) {
      return null;
    }

    // Calculer le détour approximatif
    const detourDistance = distanceToPickup + distancePickupToDelivery;
    const detourPercentage = (detourDistance / originalDistance) * 100;

    return {
      isCompatible: true,
      totalDistance: distancePickupToDelivery,
      detourPercentage,
      matchType: 'INTERMEDIATE_POINT',
      intermediatePoint: intermediatePoint.address,
    };
  }

  /**
   * Vérifie la compatibilité temporelle
   */
  private checkTemporalCompatibility(
    announcement: AnnouncementData,
    route: RouteData
  ) {
    // Si le trajet est récurrent
    if (route.isRecurring) {
      if (!announcement.pickupDate) {
        return { isCompatible: true, flexibility: 'RECURRING_FLEXIBLE' };
      }

      const dayOfWeek = announcement.pickupDate.getDay();
      const isCompatible = route.recurringDays.includes(dayOfWeek);
      
      return {
        isCompatible,
        flexibility: isCompatible ? 'RECURRING_MATCH' : 'RECURRING_NO_MATCH',
      };
    }

    // Si des dates spécifiques sont définies
    if (route.departureDate && announcement.pickupDate) {
      const timeDiff = Math.abs(
        route.departureDate.getTime() - announcement.pickupDate.getTime()
      );
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Flexibilité de 24h
      const isCompatible = hoursDiff <= 24;
      
      return {
        isCompatible,
        flexibility: isCompatible ? 'TIME_FLEXIBLE' : 'TIME_INCOMPATIBLE',
        hoursDifference: hoursDiff,
      };
    }

    // Si flexible ou pas de contrainte temporelle spécifique
    return { isCompatible: true, flexibility: 'FLEXIBLE' };
  }

  /**
   * Vérifie la compatibilité des capacités
   */
  private checkCapacityCompatibility(
    announcement: AnnouncementData,
    route: RouteData
  ) {
    const reasons = [];
    let isCompatible = true;

    // Vérifier le poids
    if (announcement.weight && announcement.weight > route.maxWeight) {
      isCompatible = false;
      reasons.push('WEIGHT_EXCEEDED');
    } else if (announcement.weight) {
      reasons.push('WEIGHT_COMPATIBLE');
    }

    // Vérifier le volume
    if (announcement.width && announcement.height && announcement.length && route.maxVolume) {
      const volume = (announcement.width * announcement.height * announcement.length) / 1000000; // m³
      if (volume > route.maxVolume) {
        isCompatible = false;
        reasons.push('VOLUME_EXCEEDED');
      } else {
        reasons.push('VOLUME_COMPATIBLE');
      }
    }

    // Vérifier les exigences spéciales
    if (announcement.isFragile && !route.acceptsFragile) {
      isCompatible = false;
      reasons.push('FRAGILE_NOT_ACCEPTED');
    } else if (announcement.isFragile && route.acceptsFragile) {
      reasons.push('ACCEPTS_FRAGILE');
    }

    if (announcement.needsCooling && !route.acceptsCooling) {
      isCompatible = false;
      reasons.push('COOLING_NOT_ACCEPTED');
    } else if (announcement.needsCooling && route.acceptsCooling) {
      reasons.push('ACCEPTS_COOLING');
    }

    return { isCompatible, reasons };
  }

  /**
   * Calcule le score de compatibilité
   */
  private calculateCompatibilityScore(
    geographicMatch: any,
    temporalMatch: any,
    capacityMatch: any,
    announcement: AnnouncementData,
    route: RouteData
  ): number {
    let score = 0;

    // Score géographique (40%)
    const maxDetourPenalty = Math.min(geographicMatch.detourPercentage / route.maxDetour, 1);
    const geographicScore = Math.max(0, 40 * (1 - maxDetourPenalty));
    score += geographicScore;

    // Score temporel (25%)
    let temporalScore = 0;
    switch (temporalMatch.flexibility) {
      case 'RECURRING_MATCH':
      case 'FLEXIBLE':
        temporalScore = 25;
        break;
      case 'TIME_FLEXIBLE':
        temporalScore = 25 * Math.max(0, 1 - (temporalMatch.hoursDifference || 0) / 24);
        break;
      case 'RECURRING_FLEXIBLE':
        temporalScore = 20;
        break;
      default:
        temporalScore = 0;
    }
    score += temporalScore;

    // Score de capacité (20%)
    const capacityScore = capacityMatch.isCompatible ? 20 : 0;
    score += capacityScore;

    // Score de prix (10%)
    let priceScore = 0;
    if (route.isNegotiable || announcement.isNegotiable) {
      priceScore = 10;
    } else if (route.fixedPrice && Math.abs(route.fixedPrice - announcement.suggestedPrice) <= announcement.suggestedPrice * 0.2) {
      priceScore = 10;
    }
    score += priceScore;

    // Score de priorité (5%)
    let priorityScore = 0;
    if (announcement.priority === 'HIGH' || announcement.priority === 'URGENT') {
      priorityScore = 5;
    } else if (announcement.priority === 'MEDIUM') {
      priorityScore = 3;
    }
    score += priorityScore;

    return Math.round(score);
  }

  /**
   * Calcule les détails du trajet
   */
  private calculateRouteDetails(
    announcement: AnnouncementData,
    route: RouteData,
    geographicMatch: any
  ) {
    return {
      totalDistance: geographicMatch.totalDistance,
      detourPercentage: geographicMatch.detourPercentage,
      matchType: geographicMatch.matchType,
    };
  }

  /**
   * Génère les raisons du matching
   */
  private generateMatchingReasons(
    geographicMatch: any,
    temporalMatch: any,
    capacityMatch: any,
    announcement: AnnouncementData,
    route: RouteData
  ): string[] {
    const reasons = [];

    // Raisons géographiques
    if (geographicMatch.matchType === 'DIRECT_ROUTE') {
      reasons.push('SAME_ROUTE');
    } else if (geographicMatch.matchType === 'INTERMEDIATE_POINT') {
      reasons.push('INTERMEDIATE_POINT');
    }

    if (geographicMatch.detourPercentage <= 10) {
      reasons.push('MINIMAL_DETOUR');
    } else if (geographicMatch.detourPercentage <= 20) {
      reasons.push('ACCEPTABLE_DETOUR');
    }

    // Raisons temporelles
    if (temporalMatch.flexibility === 'RECURRING_MATCH') {
      reasons.push('TIMING_COMPATIBLE');
    } else if (temporalMatch.flexibility === 'FLEXIBLE') {
      reasons.push('SCHEDULE_FLEXIBLE');
    }

    // Raisons de capacité
    reasons.push(...capacityMatch.reasons);

    // Raisons de prix
    if (route.isNegotiable && announcement.isNegotiable) {
      reasons.push('PRICE_NEGOTIABLE');
    }

    // Raisons de type
    if (announcement.type === 'PACKAGE_DELIVERY') {
      reasons.push('PACKAGE_COMPATIBLE');
    }

    return reasons;
  }

  /**
   * Calcule l'estimation de prix
   */
  private calculatePriceEstimate(
    announcement: AnnouncementData,
    route: RouteData,
    routeDetails: any
  ): number {
    if (route.fixedPrice) {
      return route.fixedPrice;
    }

    // Calcul basé sur la distance et le prix au km
    let basePrice = routeDetails.totalDistance * route.pricePerKm;

    // Ajustements selon le type d'annonce
    if (announcement.isFragile) {
      basePrice *= 1.2; // +20% pour fragile
    }

    if (announcement.needsCooling) {
      basePrice *= 1.15; // +15% pour réfrigération
    }

    if (announcement.priority === 'HIGH') {
      basePrice *= 1.1; // +10% pour priorité élevée
    } else if (announcement.priority === 'URGENT') {
      basePrice *= 1.25; // +25% pour urgent
    }

    // Ajustement selon le détour
    if (routeDetails.detourPercentage > 15) {
      basePrice *= (1 + routeDetails.detourPercentage / 100);
    }

    return Math.round(basePrice * 100) / 100; // Arrondir au centime
  }

  /**
   * Calcule la durée estimée
   */
  private calculateEstimatedDuration(distance: number): string {
    // Vitesse moyenne de 50 km/h en ville, 80 km/h sur route
    const averageSpeed = distance < 10 ? 30 : distance < 50 ? 50 : 80;
    const hours = distance / averageSpeed;
    
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h > 0) {
      return `${h}h ${m}min`;
    } else {
      return `${m}min`;
    }
  }

  /**
   * Envoie des notifications de matching
   */
  async sendMatchingNotifications(matches: MatchingCriteria[]): Promise<void> {
    try {
      for (const match of matches) {
        // Récupérer les données du livreur et du client
        const route = await this.prisma.delivererRoute.findUnique({
          where: { id: match.routeId },
          include: { deliverer: { include: { user: true } } },
        });

        const announcement = await this.prisma.announcement.findUnique({
          where: { id: match.announcementId },
          include: { client: { include: { user: true } } },
        });

        if (route && announcement) {
          // Notifier le livreur
          await this.notifyDeliverer(route, announcement, match);
          
          // Optionnellement notifier le client
          if (match.compatibilityScore >= 90) {
            await this.notifyClient(route, announcement, match);
          }
        }
      }
    } catch (error) {
      logger.error('Erreur lors de l\'envoi des notifications:', error);
    }
  }

  /**
   * Notifie le livreur d'un nouveau match
   */
  private async notifyDeliverer(route: any, announcement: any, match: MatchingCriteria): Promise<void> {
    // Créer une notification dans la base de données
    await this.prisma.delivererNotification.create({
      data: {
        delivererId: route.delivererId,
        type: 'NEW_MATCH',
        title: 'Nouvelle correspondance trouvée !',
        message: `Une annonce correspond à votre trajet "${route.title}" avec ${match.compatibilityScore}% de compatibilité.`,
        data: {
          matchId: `${match.routeId}-${match.announcementId}`,
          announcementId: match.announcementId,
          routeId: match.routeId,
          compatibilityScore: match.compatibilityScore,
          priceEstimate: match.priceEstimate,
        },
        isRead: false,
      },
    });

    // Envoyer une notification push (via OneSignal)
    // Cette partie serait implémentée avec le service OneSignal
    logger.info(`Notification de matching envoyée au livreur ${route.delivererId}`);
  }

  /**
   * Notifie le client d'un match de haute qualité
   */
  private async notifyClient(route: any, announcement: any, match: MatchingCriteria): Promise<void> {
    // Créer une notification pour le client
    await this.prisma.clientNotification.create({
      data: {
        clientId: announcement.clientId,
        type: 'MATCHING_FOUND',
        title: 'Livreur trouvé pour votre annonce',
        message: `Un livreur qualifié est disponible pour votre livraison "${announcement.title}".`,
        data: {
          matchId: `${match.routeId}-${match.announcementId}`,
          announcementId: match.announcementId,
          routeId: match.routeId,
          compatibilityScore: match.compatibilityScore,
          estimatedDuration: match.estimatedDuration,
        },
        isRead: false,
      },
    });

    logger.info(`Notification de matching envoyée au client ${announcement.clientId}`);
  }
}