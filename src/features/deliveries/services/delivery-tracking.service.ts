import { prisma } from "@/lib/db";
import type {
  TrackingUpdateInput,
  UpdateDeliveryStatusInput,
  DeliveryStatus,
  DeliveryType,
} from "../schemas/delivery.schema";
import type { TrackingUpdate, Delivery } from "../types/delivery.types";

/**
 * Service de suivi temps réel des livraisons
 * Fonctionnalité obligatoire du cahier des charges EcoDeli
 */
export class DeliveryTrackingService {
  /**
   * Ajoute une mise à jour de suivi temps réel
   * Utilisé par les livreurs et le système automatique
   */
  static async addTrackingUpdate(
    input: TrackingUpdateInput,
  ): Promise<TrackingUpdate> {
    const {
      deliveryId,
      status,
      message,
      location,
      estimatedArrival,
      delay,
      isAutomatic,
      metadata,
    } = input;

    try {
      // Vérifier que la livraison existe
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: {
          id: true,
          status: true,
          delivererId: true,
          announcement: {
            select: { authorId: true },
          },
        },
      });

      if (!delivery) {
        throw new Error("Livraison introuvable");
      }

      // Créer l'entrée de suivi
      const trackingUpdate = await prisma.trackingUpdate.create({
        data: {
          deliveryId,
          status,
          message,
          location: location ? JSON.stringify(location) : null,
          estimatedArrival: estimatedArrival
            ? new Date(estimatedArrival)
            : null,
          delay: delay || null,
          isAutomatic: isAutomatic || false,
          timestamp: new Date(),
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });

      // Si le statut change, mettre à jour la livraison
      if (delivery.status !== status) {
        await this.updateDeliveryStatus({
          deliveryId,
          status,
          location,
          notes: message,
        });
      }

      return trackingUpdate as TrackingUpdate;
    } catch (error) {
      console.error("Erreur ajout tracking:", error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une livraison
   * Workflow principal selon le cahier des charges
   */
  static async updateDeliveryStatus(
    input: UpdateDeliveryStatusInput,
  ): Promise<Delivery> {
    const { deliveryId, status, location, notes, proofPhotos, timestamp } =
      input;

    try {
      return await prisma.$transaction(async (tx) => {
        // Vérifier la livraison
        const existingDelivery = await tx.delivery.findUnique({
          where: { id: deliveryId },
        });

        if (!existingDelivery) {
          throw new Error("Livraison introuvable");
        }

        // Valider la transition de statut
        this.validateStatusTransition(
          existingDelivery.status as DeliveryStatus,
          status,
        );

        // Mettre à jour la livraison
        const updatedDelivery = await tx.delivery.update({
          where: { id: deliveryId },
          data: {
            status,
            ...(status === "PICKED_UP" && { actualPickupAt: new Date() }),
            ...(status === "DELIVERED" && { actualDeliveryAt: new Date() }),
            updatedAt: new Date(),
          },
          include: {
            announcement: {
              include: {
                author: {
                  include: { profile: true },
                },
              },
            },
            deliverer: {
              include: { profile: true },
            },
            tracking: {
              orderBy: { timestamp: "desc" },
              take: 10,
            },
            payment: true,
          },
        });

        // Ajouter l'entrée de tracking automatique
        await tx.trackingUpdate.create({
          data: {
            deliveryId,
            status,
            message: this.getStatusMessage(status),
            location: location ? JSON.stringify(location) : null,
            isAutomatic: true,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            metadata: notes
              ? JSON.stringify({ notes, photos: proofPhotos })
              : null,
          },
        });

        return updatedDelivery as Delivery;
      });
    } catch (error) {
      console.error("Erreur mise à jour statut:", error);
      throw error;
    }
  }

  /**
   * Récupère l'historique complet de suivi d'une livraison
   */
  static async getTrackingHistory(
    deliveryId: string,
  ): Promise<TrackingUpdate[]> {
    try {
      const trackingUpdates = await prisma.trackingUpdate.findMany({
        where: { deliveryId },
        orderBy: { timestamp: "desc" },
      });

      return trackingUpdates.map((update) => ({
        ...update,
        location: update.location ? JSON.parse(update.location) : null,
        metadata: update.metadata ? JSON.parse(update.metadata) : null,
      })) as TrackingUpdate[];
    } catch (error) {
      console.error("Erreur récupération historique:", error);
      throw error;
    }
  }

  /**
   * Récupère le statut actuel d'une livraison avec dernière position
   */
  static async getCurrentStatus(deliveryId: string) {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          tracking: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      });

      if (!delivery) {
        throw new Error("Livraison introuvable");
      }

      const lastTracking = delivery.tracking[0];

      return {
        deliveryId,
        currentStatus: delivery.status,
        lastUpdate: lastTracking
          ? {
              timestamp: lastTracking.timestamp,
              message: lastTracking.message,
              location: lastTracking.location
                ? JSON.parse(lastTracking.location)
                : null,
            }
          : null,
        estimatedDelivery: delivery.estimatedDeliveryAt,
        isCompleted: ["DELIVERED", "CANCELLED", "RETURNED"].includes(
          delivery.status,
        ),
      };
    } catch (error) {
      console.error("Erreur statut actuel:", error);
      throw error;
    }
  }

  /**
   * Récupère toutes les livraisons en cours pour un livreur
   * Utilisé pour l'interface mobile des livreurs
   */
  static async getActiveDeliveriesForDeliverer(delivererId: string) {
    try {
      const deliveries = await prisma.delivery.findMany({
        where: {
          delivererId,
          status: {
            in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
        include: {
          announcement: {
            include: {
              author: {
                include: { profile: true },
              },
            },
          },
          tracking: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
        orderBy: { scheduledPickupAt: "asc" },
      });

      return deliveries.map((delivery) => ({
        ...delivery,
        lastTracking: delivery.tracking[0] || null,
        timeRemaining: this.calculateTimeRemaining(
          delivery.estimatedDeliveryAt,
        ),
        nextAction: this.getNextActionForDeliverer(
          delivery.status as DeliveryStatus,
        ),
      }));
    } catch (error) {
      console.error("Erreur livraisons actives:", error);
      throw error;
    }
  }

  /**
   * Valide qu'une transition de statut est autorisée
   */
  private static validateStatusTransition(
    currentStatus: DeliveryStatus,
    newStatus: DeliveryStatus,
  ): void {
    const allowedTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      PENDING: ["ACCEPTED", "CANCELLED"],
      ACCEPTED: ["PICKED_UP", "CANCELLED"],
      PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
      IN_TRANSIT: ["OUT_FOR_DELIVERY", "AT_WAREHOUSE", "DELIVERED", "FAILED"],
      AT_WAREHOUSE: ["OUT_FOR_DELIVERY", "IN_TRANSIT"],
      OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
      DELIVERED: [], // État final
      FAILED: ["IN_TRANSIT", "CANCELLED"],
      CANCELLED: [], // État final
      RETURNED: [], // État final
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Transition de statut non autorisée: ${currentStatus} → ${newStatus}`,
      );
    }
  }

  /**
   * Génère un message automatique selon le statut
   */
  private static getStatusMessage(status: DeliveryStatus): string {
    const messages: Record<DeliveryStatus, string> = {
      PENDING: "Livraison en attente d'acceptation",
      ACCEPTED: "Livraison acceptée par le livreur",
      PICKED_UP: "Colis récupéré chez l'expéditeur",
      IN_TRANSIT: "Colis en cours de transport",
      AT_WAREHOUSE: "Colis arrivé dans un entrepôt EcoDeli",
      OUT_FOR_DELIVERY: "Colis en cours de livraison finale",
      DELIVERED: "Colis livré avec succès",
      FAILED: "Échec de livraison",
      CANCELLED: "Livraison annulée",
      RETURNED: "Colis retourné à l'expéditeur",
    };

    return messages[status] || "Statut mis à jour";
  }

  /**
   * Calcule le temps restant estimé pour une livraison
   */
  private static calculateTimeRemaining(estimatedDeliveryAt: Date): number {
    const now = new Date();
    const estimated = new Date(estimatedDeliveryAt);
    return Math.max(0, estimated.getTime() - now.getTime());
  }

  /**
   * Détermine la prochaine action pour un livreur selon le statut
   */
  private static getNextActionForDeliverer(status: DeliveryStatus): string {
    const actions: Record<DeliveryStatus, string> = {
      PENDING: "Accepter ou refuser la livraison",
      ACCEPTED: "Se rendre chez l'expéditeur",
      PICKED_UP: "Commencer le transport",
      IN_TRANSIT: "Continuer vers la destination",
      AT_WAREHOUSE: "Déposer ou récupérer au entrepôt",
      OUT_FOR_DELIVERY: "Livrer chez le destinataire",
      DELIVERED: "Livraison terminée",
      FAILED: "Contacter le support",
      CANCELLED: "Livraison annulée",
      RETURNED: "Retour terminé",
    };

    return actions[status] || "Action à déterminer";
  }

  /**
   * Met à jour la géolocalisation en temps réel (mobile)
   */
  static async updateLocation(
    deliveryId: string,
    delivererId: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    },
  ) {
    try {
      // Vérifier que le livreur est autorisé
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          delivererId,
          status: {
            in: ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
          },
        },
      });

      if (!delivery) {
        throw new Error("Livraison non trouvée ou non autorisée");
      }

      // Mettre à jour la position
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          currentLocation: JSON.stringify({
            ...location,
            timestamp: new Date(),
          }),
        },
      });

      return { success: true, message: "Position mise à jour" };
    } catch (error) {
      console.error("Erreur mise à jour position:", error);
      throw error;
    }
  }

  /**
   * Génère un ETA (temps d'arrivée estimé) basé sur la position actuelle
   */
  static async calculateETA(deliveryId: string) {
    try {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: {
          currentLocation: true,
          deliveryAddress: true,
          estimatedDeliveryAt: true,
        },
      });

      if (!delivery || !delivery.currentLocation) {
        return {
          eta: delivery?.estimatedDeliveryAt || null,
          confidence: "LOW",
        };
      }

      // TODO: Intégrer avec une API de cartographie (Google Maps, Mapbox)
      // Pour l'instant, retourner l'estimation initiale
      return {
        eta: delivery.estimatedDeliveryAt,
        confidence: "MEDIUM",
        distanceRemaining: null, // À calculer avec l'API
        trafficConditions: "UNKNOWN",
      };
    } catch (error) {
      console.error("Erreur calcul ETA:", error);
      throw error;
    }
  }
}

// Export du service
export const deliveryTrackingService = DeliveryTrackingService;
