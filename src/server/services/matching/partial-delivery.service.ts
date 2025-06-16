/**
 * Service de gestion des livraisons partielles
 * Coordination de plusieurs livreurs pour une même livraison
 */

import { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/utils/logger";
import { getDistance } from "@/server/utils/distance-calculator.util";

export interface PartialDeliverySegment {
  id: string;
  delivererId: string;
  segmentNumber: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  estimatedDuration: string;
  estimatedPrice: number;
  status: "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  relayPointId?: string;
  specialInstructions?: string;
  requiredCapabilities: string[];
}

export interface RelayPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: "WAREHOUSE" | "PARTNER_SHOP" | "LOCKER" | "PICKUP_POINT";
  openingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  capacity: number;
  availableSlots: number;
  specialFeatures: string[];
  isActive: boolean;
}

export interface PartialDeliveryPlan {
  announcementId: string;
  totalSegments: number;
  segments: PartialDeliverySegment[];
  relayPoints: RelayPoint[];
  totalDistance: number;
  totalDuration: string;
  totalPrice: number;
  estimatedDeliveryTime: Date;
  fallbackPlan?: PartialDeliveryPlan;
}

export class PartialDeliveryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Planifie une livraison partielle en plusieurs segments
   */
  async planPartialDelivery(
    announcementId: string,
    maxSegmentDistance: number = 100,
    preferredRelayTypes: string[] = ["WAREHOUSE", "PARTNER_SHOP"],
  ): Promise<PartialDeliveryPlan | null> {
    try {
      // Récupérer les données de l'annonce
      const announcement = await this.prisma.announcement.findUnique({
        where: { id },
        include: { client }});

      if (!announcement) {
        throw new Error("Annonce non trouvée");
      }

      // Calculer la distance totale
      const totalDistance = getDistance(
        announcement.pickupLatitude,
        announcement.pickupLongitude,
        announcement.deliveryLatitude,
        announcement.deliveryLongitude,
      );

      // Si la distance est inférieure au maximum, pas besoin de livraison partielle
      if (totalDistance <= maxSegmentDistance) {
        return null;
      }

      // Trouver les points de relais appropriés
      const relayPoints = await this.findOptimalRelayPoints(
        announcement,
        maxSegmentDistance,
        preferredRelayTypes,
      );

      if (relayPoints.length === 0) {
        logger.warn("Aucun point de relais trouvé pour la livraison partielle");
        return null;
      }

      // Créer les segments de livraison
      const segments = await this.createDeliverySegments(
        announcement,
        relayPoints,
        maxSegmentDistance,
      );

      // Calculer les prix et durées
      const plan = await this.calculateDeliveryPlan(
        announcementId,
        segments,
        relayPoints,
      );

      // Créer un plan de secours si possible
      const fallbackPlan = await this.createFallbackPlan(
        announcement,
        maxSegmentDistance * 1.5,
      );

      return {
        ...plan,
        fallbackPlan};
    } catch (error) {
      logger.error(
        "Erreur lors de la planification de livraison partielle:",
        error,
      );
      throw new Error("Erreur lors de la planification de livraison partielle");
    }
  }

  /**
   * Trouve les points de relais optimaux pour la livraison
   */
  private async findOptimalRelayPoints(
    announcement: any,
    maxSegmentDistance: number,
    preferredTypes: string[],
  ): Promise<RelayPoint[]> {
    // Récupérer les points de relais depuis la base de données
    const relayPointsFromDb = await this.prisma.relayPoint.findMany({
      where: {
        isActive: true,
        type: {
          in: preferredTypes as any[]}},
      include: { openingHours }});

    // Convertir au format attendu
    const relayPoints: RelayPoint[] = relayPointsFromDb.map((point) => ({
      id: point.id,
      name: point.name,
      address: point.address,
      latitude: point.latitude,
      longitude: point.longitude,
      type: point.type as any,
      openingHours: point.openingHours.reduce((acc, hours) => {
        acc[hours.dayOfWeek.toLowerCase()] = {
          open: hours.openTime || "",
          close: hours.closeTime || "",
          closed: !hours.isOpen};
        return acc;
      }, {} as any),
      capacity: point.capacity || 0,
      availableSlots: point.availableSlots || 0,
      specialFeatures: point.specialFeatures || [],
      isActive: point.isActive}));

    // Filtrer par distance
    const filteredPoints = relayPoints.filter((point) => {
      const distanceFromPickup = getDistance(
        announcement.pickupLatitude,
        announcement.pickupLongitude,
        point.latitude,
        point.longitude,
      );

      const distanceToDelivery = getDistance(
        point.latitude,
        point.longitude,
        announcement.deliveryLatitude,
        announcement.deliveryLongitude,
      );

      return (
        preferredTypes.includes(point.type) &&
        point.isActive &&
        point.availableSlots > 0 &&
        distanceFromPickup <= maxSegmentDistance &&
        distanceToDelivery <= maxSegmentDistance
      );
    });

    // Trier par proximité optimale
    return filteredPoints.sort((a, b) => {
      const totalDistanceA =
        getDistance(
          announcement.pickupLatitude,
          announcement.pickupLongitude,
          a.latitude,
          a.longitude,
        ) +
        getDistance(
          a.latitude,
          a.longitude,
          announcement.deliveryLatitude,
          announcement.deliveryLongitude,
        );

      const totalDistanceB =
        getDistance(
          announcement.pickupLatitude,
          announcement.pickupLongitude,
          b.latitude,
          b.longitude,
        ) +
        getDistance(
          b.latitude,
          b.longitude,
          announcement.deliveryLatitude,
          announcement.deliveryLongitude,
        );

      return totalDistanceA - totalDistanceB;
    });
  }

  /**
   * Crée les segments de livraison
   */
  private async createDeliverySegments(
    announcement: any,
    relayPoints: RelayPoint[],
    maxSegmentDistance: number,
  ): Promise<PartialDeliverySegment[]> {
    const segments: PartialDeliverySegment[] = [];
    const segmentNumber = 1;

    // Premier segment : du pickup au premier relais
    if (relayPoints.length > 0) {
      const firstRelay = relayPoints[0];
      segments.push({
        id: `segment-${segmentNumber}`,
        delivererId: "", // À assigner plus tard
        segmentNumber,
        pickupAddress: announcement.pickupAddress,
        pickupLatitude: announcement.pickupLatitude,
        pickupLongitude: announcement.pickupLongitude,
        deliveryAddress: firstRelay.address,
        deliveryLatitude: firstRelay.latitude,
        deliveryLongitude: firstRelay.longitude,
        estimatedDuration: this.calculateSegmentDuration(
          getDistance(
            announcement.pickupLatitude,
            announcement.pickupLongitude,
            firstRelay.latitude,
            firstRelay.longitude,
          ),
        ),
        estimatedPrice: 0, // Calculé plus tard
        status: "PENDING",
        relayPointId: firstRelay.id,
        requiredCapabilities: this.getRequiredCapabilities(announcement)});

      segmentNumber++;

      // Segments intermédiaires (si plusieurs relais)
      for (const i = 0; i < relayPoints.length - 1; i++) {
        const currentRelay = relayPoints[i];
        const nextRelay = relayPoints[i + 1];

        segments.push({
          id: `segment-${segmentNumber}`,
          delivererId: "",
          segmentNumber,
          pickupAddress: currentRelay.address,
          pickupLatitude: currentRelay.latitude,
          pickupLongitude: currentRelay.longitude,
          deliveryAddress: nextRelay.address,
          deliveryLatitude: nextRelay.latitude,
          deliveryLongitude: nextRelay.longitude,
          estimatedDuration: this.calculateSegmentDuration(
            getDistance(
              currentRelay.latitude,
              currentRelay.longitude,
              nextRelay.latitude,
              nextRelay.longitude,
            ),
          ),
          estimatedPrice: 0,
          status: "PENDING",
          relayPointId: nextRelay.id,
          requiredCapabilities: this.getRequiredCapabilities(announcement)});

        segmentNumber++;
      }

      // Dernier segment : du dernier relais à la destination finale
      const lastRelay = relayPoints[relayPoints.length - 1];
      segments.push({
        id: `segment-${segmentNumber}`,
        delivererId: "",
        segmentNumber,
        pickupAddress: lastRelay.address,
        pickupLatitude: lastRelay.latitude,
        pickupLongitude: lastRelay.longitude,
        deliveryAddress: announcement.deliveryAddress,
        deliveryLatitude: announcement.deliveryLatitude,
        deliveryLongitude: announcement.deliveryLongitude,
        estimatedDuration: this.calculateSegmentDuration(
          getDistance(
            lastRelay.latitude,
            lastRelay.longitude,
            announcement.deliveryLatitude,
            announcement.deliveryLongitude,
          ),
        ),
        estimatedPrice: 0,
        status: "PENDING",
        requiredCapabilities: this.getRequiredCapabilities(announcement)});
    }

    return segments;
  }

  /**
   * Calcule le plan de livraison complet
   */
  private async calculateDeliveryPlan(
    announcementId: string,
    segments: PartialDeliverySegment[],
    relayPoints: RelayPoint[],
  ): Promise<PartialDeliveryPlan> {
    const totalDistance = 0;
    const totalDurationMinutes = 0;
    const totalPrice = 0;

    // Calculer pour chaque segment
    for (const segment of segments) {
      const distance = getDistance(
        segment.pickupLatitude,
        segment.pickupLongitude,
        segment.deliveryLatitude,
        segment.deliveryLongitude,
      );

      totalDistance += distance;
      totalDurationMinutes += this.parseDuration(segment.estimatedDuration);

      // Calcul du prix basé sur la distance et la complexité
      const basePrice = distance * 0.8; // 0.80€/km
      const complexityMultiplier =
        segment.requiredCapabilities.length > 2 ? 1.3 : 1.1;
      segment.estimatedPrice =
        Math.round(basePrice * complexityMultiplier * 100) / 100;
      totalPrice += segment.estimatedPrice;
    }

    // Ajouter une marge pour la coordination
    totalPrice *= 1.15; // +15% pour la gestion multi-livreurs

    const estimatedDeliveryTime = new Date(
      Date.now() + totalDurationMinutes * 60 * 1000,
    );

    return {
      announcementId,
      totalSegments: segments.length,
      segments,
      relayPoints,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration: this.formatDuration(totalDurationMinutes),
      totalPrice: Math.round(totalPrice * 100) / 100,
      estimatedDeliveryTime};
  }

  /**
   * Assigne les livreurs aux segments
   */
  async assignDeliverersToSegments(
    plan: PartialDeliveryPlan,
  ): Promise<boolean> {
    try {
      for (const segment of plan.segments) {
        // Rechercher les livreurs disponibles pour ce segment
        const availableDeliverers = await this.findAvailableDeliverers(segment);

        if (availableDeliverers.length === 0) {
          logger.warn(
            `Aucun livreur disponible pour le segment ${segment.segmentNumber}`,
          );
          return false;
        }

        // Assigner le meilleur livreur
        const bestDeliverer = this.selectBestDeliverer(
          segment,
          availableDeliverers,
        );
        segment.delivererId = bestDeliverer.id;
        segment.status = "ASSIGNED";

        // Créer la notification pour le livreur
        await this.notifyDelivererAssignment(bestDeliverer.id, segment);
      }

      return true;
    } catch (error) {
      logger.error("Erreur lors de l'assignation des livreurs:", error);
      return false;
    }
  }

  /**
   * Gère la coordination entre les segments
   */
  async coordinateSegments(planId: string): Promise<void> {
    try {
      // Récupérer le plan de livraison
      const plan = await this.getDeliveryPlan(planId);
      if (!plan) return;

      // Vérifier le statut de chaque segment
      for (const i = 0; i < plan.segments.length; i++) {
        const segment = plan.segments[i];
        const nextSegment = plan.segments[i + 1];

        // Si le segment est terminé et qu'il y a un segment suivant
        if (
          segment.status === "COMPLETED" &&
          nextSegment &&
          nextSegment.status === "ASSIGNED"
        ) {
          // Notifier le prochain livreur que son segment peut commencer
          await this.notifySegmentReady(nextSegment.delivererId, nextSegment);

          // Mettre à jour le statut
          nextSegment.status = "IN_PROGRESS";
          await this.updateSegmentStatus(nextSegment.id, "IN_PROGRESS");
        }
      }

      // Vérifier si tous les segments sont terminés
      const allCompleted = plan.segments.every((s) => s.status === "COMPLETED");
      if (allCompleted) {
        await this.completePartialDelivery(planId);
      }
    } catch (error) {
      logger.error("Erreur lors de la coordination des segments:", error);
    }
  }

  /**
   * Crée un plan de secours
   */
  private async createFallbackPlan(
    announcement: any,
    fallbackMaxDistance: number,
  ): Promise<PartialDeliveryPlan | undefined> {
    try {
      // Essayer avec des critères moins stricts
      const fallbackRelayPoints = await this.findOptimalRelayPoints(
        announcement,
        fallbackMaxDistance,
        ["WAREHOUSE", "PARTNER_SHOP", "PICKUP_POINT"], // Plus de types acceptés
      );

      if (fallbackRelayPoints.length === 0) {
        return undefined;
      }

      const fallbackSegments = await this.createDeliverySegments(
        announcement,
        fallbackRelayPoints,
        fallbackMaxDistance,
      );

      return await this.calculateDeliveryPlan(
        announcement.id,
        fallbackSegments,
        fallbackRelayPoints,
      );
    } catch (error) {
      logger.error("Erreur lors de la création du plan de secours:", error);
      return undefined;
    }
  }

  // Méthodes utilitaires
  private getRequiredCapabilities(announcement: any): string[] {
    const capabilities = [];

    if (announcement.isFragile) capabilities.push("FRAGILE_HANDLING");
    if (announcement.needsCooling) capabilities.push("TEMPERATURE_CONTROL");
    if (announcement.weight && announcement.weight > 20)
      capabilities.push("HEAVY_PACKAGES");
    if (announcement.priority === "URGENT")
      capabilities.push("EXPRESS_DELIVERY");

    return capabilities;
  }

  private calculateSegmentDuration(distance: number): string {
    // Vitesse moyenne selon la distance
    const speed = distance < 10 ? 25 : distance < 50 ? 45 : 70;
    const hours = distance / speed;

    // Ajouter du temps pour la manutention (30 min par segment)
    const totalMinutes = Math.round(hours * 60) + 30;

    return this.formatDuration(totalMinutes);
  }

  private formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  }

  private parseDuration(duration: string): number {
    const hourMatch = duration.match(/(\d+)h/);
    const minMatch = duration.match(/(\d+)min/);

    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;

    return hours * 60 + minutes;
  }

  private async findAvailableDeliverers(
    segment: PartialDeliverySegment,
  ): Promise<any[]> {
    
    return [
      { id: "deliverer-1", rating: 4.8, experience: 150 },
      { id: "deliverer-2", rating: 4.6, experience: 89 }];
  }

  private selectBestDeliverer(
    segment: PartialDeliverySegment,
    deliverers: any[],
  ): any {
    // Sélectionner le livreur avec le meilleur ratio rating/expérience
    return deliverers.sort(
      (a, b) => b.rating * b.experience - a.rating * a.experience,
    )[0];
  }

  private async notifyDelivererAssignment(
    delivererId: string,
    segment: PartialDeliverySegment,
  ): Promise<void> {
    
    logger.info(
      `Notification envoyée au livreur ${delivererId} pour le segment ${segment.segmentNumber}`,
    );
  }

  private async notifySegmentReady(
    delivererId: string,
    segment: PartialDeliverySegment,
  ): Promise<void> {
    
    logger.info(
      `Notification de segment prêt envoyée au livreur ${delivererId}`,
    );
  }

  private async getDeliveryPlan(
    planId: string,
  ): Promise<PartialDeliveryPlan | null> {
    
    return null;
  }

  private async updateSegmentStatus(
    segmentId: string,
    status: string,
  ): Promise<void> {
    
    logger.info(`Statut du segment ${segmentId} mis à jour: ${status}`);
  }

  private async completePartialDelivery(planId: string): Promise<void> {
    
    logger.info(`Livraison partielle ${planId} terminée avec succès`);
  }

  /**
   * Trouve les points relais disponibles selon les critères
   */
  async findAvailableRelayPoints(criteria: {
    centerLat: number;
    centerLng: number;
    radius: number;
    minCapacity?: number;
    timeSlot?: { start: Date; end: Date };
  }): Promise<RelayPoint[]> {
    const {
      centerLat,
      centerLng,
      radius,
      minCapacity = 5,
      timeSlot} = criteria;

    // Récupérer les points relais depuis la base de données
    const relayPoints = await this.prisma.relayPoint.findMany({
      where: {
        isActive: true,
        capacity: { gte },
        // Filtrer par géolocalisation si possible
        latitude: {
          gte: centerLat - radius / 111, // Approximation 1 degré = 111km
          lte: centerLat + radius / 111},
        longitude: {
          gte: centerLng - radius / 111,
          lte: centerLng + radius / 111}},
      include: {
        location: true,
        availability: {
          where: timeSlot
            ? {
                startTime: { lte: timeSlot.start },
                endTime: { gte: timeSlot.end }}
            : undefined}}});

    // Filtrer par distance exacte
    const filteredPoints = relayPoints.filter((point) => {
      const distance = this.calculateDistance(
        centerLat,
        centerLng,
        point.latitude,
        point.longitude,
      );
      return distance <= radius;
    });

    return filteredPoints.map((point) => ({ id: point.id,
      name: point.name,
      address: point.address,
      lat: point.latitude,
      lng: point.longitude,
      capacity: point.capacity,
      currentUsage: point.currentUsage || 0,
      operatingHours: point.operatingHours as any,
      contactInfo: point.contactInfo as any,
      distance: this.calculateDistance(
        centerLat,
        centerLng,
        point.latitude,
        point.longitude,
      ) }));
  }
}
