import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";
import { Decimal } from "@prisma/client/runtime/library";

export interface AnnouncementSearchFilters {
  delivererId: string;
  maxDistance?: number;
  minPrice?: number;
  maxPrice?: number;
  deliveryType?: string[];
  urgency?: "LOW" | "MEDIUM" | "HIGH";
  pickupDateStart?: Date;
  pickupDateEnd?: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DelivererRoute {
  delivererId: string;
  startLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  endLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  plannedDate: Date;
  timeWindow?: {
    start: string;
    end: string;
  };
  vehicleType?: string;
  capacity?: number;
}

/**
 * Service de gestion des annonces pour les livreurs
 */
export const delivererAnnouncementService = {
  /**
   * Recherche des annonces disponibles pour un livreur
   */
  async searchAvailableAnnouncements(filters: AnnouncementSearchFilters) {
    const {
      delivererId,
      maxDistance = 50,
      minPrice,
      maxPrice,
      deliveryType,
      urgency,
      pickupDateStart,
      pickupDateEnd,
      location,
    } = filters;

    // Vérifier que le livreur existe et est actif
    const deliverer = await db.user.findUnique({
      where: { 
        id: delivererId,
        role: "DELIVERER",
        isActive: true 
      }
    });

    if (!deliverer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Livreur non trouvé ou inactif"
      });
    }

    // Construire les filtres de recherche
    const where: any = {
      status: "OPEN",
      delivererId: null, // Annonces non assignées
      isActive: true,
    };

    // Filtres par prix
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.totalPrice = {};
      if (minPrice !== undefined) where.totalPrice.gte = new Decimal(minPrice);
      if (maxPrice !== undefined) where.totalPrice.lte = new Decimal(maxPrice);
    }

    // Filtres par type de livraison
    if (deliveryType && deliveryType.length > 0) {
      where.deliveryType = { in: deliveryType };
    }

    // Filtres par urgence
    if (urgency) {
      where.priority = urgency;
    }

    // Filtres par date
    if (pickupDateStart || pickupDateEnd) {
      where.preferredPickupDate = {};
      if (pickupDateStart) where.preferredPickupDate.gte = pickupDateStart;
      if (pickupDateEnd) where.preferredPickupDate.lte = pickupDateEnd;
    }

    // Récupérer les annonces
    const announcements = await db.announcement.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
          }
        },
        addresses: true,
        photos: true,
      },
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" }
      ],
      take: 50 // Limiter pour les performances
    });

    // Calculer les distances si la position du livreur est fournie
    if (location) {
      const announcementsWithDistance = await Promise.all(
        announcements.map(async (announcement) => {
          const pickupAddress = announcement.addresses.find(
            addr => addr.type === "PICKUP"
          );

          if (!pickupAddress?.latitude || !pickupAddress?.longitude) {
            return { ...announcement, distance: null };
          }

          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(pickupAddress.latitude),
            parseFloat(pickupAddress.longitude)
          );

          return {
            ...announcement,
            distance,
            isInRange: distance <= maxDistance
          };
        })
      );

      // Filtrer par distance et trier
      return announcementsWithDistance
        .filter(ann => ann.isInRange !== false)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return announcements;
  },

  /**
   * Permet à un livreur de postuler à une annonce
   */
  async applyToAnnouncement(
    delivererId: string,
    announcementId: string,
    options: {
      proposedPrice?: number;
      estimatedPickupTime?: Date;
      estimatedDeliveryTime?: Date;
      message?: string;
      vehicleType?: string;
    } = {}
  ) {
    // Vérifier que l'annonce existe et est disponible
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      include: { client: true }
    });

    if (!announcement) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Annonce non trouvée"
      });
    }

    if (announcement.status !== "OPEN") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cette annonce n'est plus disponible"
      });
    }

    // Vérifier que le livreur n'a pas déjà postulé
    const existingApplication = await db.deliveryApplication.findFirst({
      where: {
        announcementId,
        delivererId,
      }
    });

    if (existingApplication) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Vous avez déjà postulé à cette annonce"
      });
    }

    // Créer la candidature
    const application = await db.deliveryApplication.create({
      data: {
        announcementId,
        delivererId,
        proposedPrice: options.proposedPrice ? new Decimal(options.proposedPrice) : null,
        estimatedPickupTime: options.estimatedPickupTime,
        estimatedDeliveryTime: options.estimatedDeliveryTime,
        message: options.message,
        vehicleType: options.vehicleType,
        status: "PENDING",
        appliedAt: new Date(),
      },
      include: {
        deliverer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
          }
        }
      }
    });

    // Envoyer une notification au client
    try {
      const { notificationService } = await import("@/server/services/common/notification.service");
      await notificationService.sendNotification({
        userId: announcement.clientId,
        title: "Nouvelle candidature de livreur",
        message: `${application.deliverer.firstName} ${application.deliverer.lastName} a postulé pour votre livraison`,
        type: "ANNOUNCEMENT_APPLIED",
        data: {
          announcementId,
          applicationId: application.id,
          delivererId
        }
      });
    } catch (error) {
      console.error("Erreur envoi notification:", error);
    }

    return application;
  },

  /**
   * Récupère les candidatures d'un livreur
   */
  async getDelivererApplications(
    delivererId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const { status, limit = 20, offset = 0 } = options;

    const where: any = { delivererId };
    if (status) {
      where.status = status;
    }

    const applications = await db.deliveryApplication.findMany({
      where,
      include: {
        announcement: {
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              }
            },
            addresses: true,
          }
        }
      },
      orderBy: { appliedAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await db.deliveryApplication.count({ where });

    return {
      applications,
      total,
      hasMore: (offset + limit) < total
    };
  },

  /**
   * Crée un trajet planifié pour optimiser les livraisons
   */
  async createDelivererRoute(routeData: DelivererRoute) {
    const {
      delivererId,
      startLocation,
      endLocation,
      plannedDate,
      timeWindow,
      vehicleType,
      capacity
    } = routeData;

    // Vérifier que le livreur existe
    const deliverer = await db.user.findUnique({
      where: { 
        id: delivererId,
        role: "DELIVERER" 
      }
    });

    if (!deliverer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Livreur non trouvé"
      });
    }

    // Créer le trajet planifié
    const route = await db.plannedRoute.create({
      data: {
        delivererId,
        startLatitude: startLocation.latitude.toString(),
        startLongitude: startLocation.longitude.toString(),
        startAddress: startLocation.address,
        endLatitude: endLocation.latitude.toString(),
        endLongitude: endLocation.longitude.toString(),
        endAddress: endLocation.address,
        plannedDate,
        timeWindowStart: timeWindow?.start,
        timeWindowEnd: timeWindow?.end,
        vehicleType,
        capacity,
        isActive: true,
        status: "PLANNED"
      }
    });

    // Rechercher des annonces correspondantes
    const matchingAnnouncements = await this.findMatchingAnnouncements(route.id);

    // Envoyer des notifications pour les correspondances
    if (matchingAnnouncements.length > 0) {
      try {
        const { notificationService } = await import("@/server/services/common/notification.service");
        await notificationService.sendNotification({
          userId: delivererId,
          title: "Annonces correspondantes trouvées",
          message: `${matchingAnnouncements.length} annonce(s) correspondent à votre trajet`,
          type: "ANNOUNCEMENT_MATCH",
          data: {
            routeId: route.id,
            matchCount: matchingAnnouncements.length
          }
        });
      } catch (error) {
        console.error("Erreur envoi notification correspondances:", error);
      }
    }

    return {
      route,
      matchingAnnouncements
    };
  },

  /**
   * Trouve des annonces correspondant à un trajet planifié
   */
  async findMatchingAnnouncements(routeId: string) {
    const route = await db.plannedRoute.findUnique({
      where: { id: routeId }
    });

    if (!route) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Trajet non trouvé"
      });
    }

    // Rechercher des annonces dans un rayon autour du trajet
    const announcements = await db.announcement.findMany({
      where: {
        status: "OPEN",
        delivererId: null,
        preferredPickupDate: {
          gte: new Date(route.plannedDate.getTime() - 24 * 60 * 60 * 1000), // -1 jour
          lte: new Date(route.plannedDate.getTime() + 24 * 60 * 60 * 1000), // +1 jour
        }
      },
      include: {
        addresses: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // Filtrer par proximité géographique
    const matchingAnnouncements = announcements.filter(announcement => {
      const pickupAddress = announcement.addresses.find(addr => addr.type === "PICKUP");
      const deliveryAddress = announcement.addresses.find(addr => addr.type === "DELIVERY");

      if (!pickupAddress?.latitude || !deliveryAddress?.latitude) {
        return false;
      }

      // Vérifier si le pickup est proche du début du trajet
      const pickupDistance = this.calculateDistance(
        parseFloat(route.startLatitude),
        parseFloat(route.startLongitude),
        parseFloat(pickupAddress.latitude),
        parseFloat(pickupAddress.longitude)
      );

      // Vérifier si la livraison est proche de la fin du trajet
      const deliveryDistance = this.calculateDistance(
        parseFloat(route.endLatitude),
        parseFloat(route.endLongitude),
        parseFloat(deliveryAddress.latitude),
        parseFloat(deliveryAddress.longitude)
      );

      // Considérer comme correspondance si dans un rayon de 10km
      return pickupDistance <= 10 && deliveryDistance <= 10;
    });

    return matchingAnnouncements;
  },

  /**
   * Calcule la distance entre deux points géographiques
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  /**
   * Convertit des degrés en radians
   */
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Met à jour le statut d'une candidature
   */
  async updateApplicationStatus(
    applicationId: string,
    status: "PENDING" | "ACCEPTED" | "REJECTED",
    adminId?: string
  ) {
    const application = await db.deliveryApplication.findUnique({
      where: { id: applicationId },
      include: {
        announcement: true,
        deliverer: true
      }
    });

    if (!application) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Candidature non trouvée"
      });
    }

    const updatedApplication = await db.deliveryApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminId
      }
    });

    // Si acceptée, créer la livraison et mettre à jour l'annonce
    if (status === "ACCEPTED") {
      await db.$transaction(async (tx) => {
        // Marquer l'annonce comme assignée
        await tx.announcement.update({
          where: { id: application.announcementId },
          data: {
            status: "ASSIGNED",
            delivererId: application.delivererId,
            assignedAt: new Date()
          }
        });

        // Créer la livraison
        await tx.delivery.create({
          data: {
            announcementId: application.announcementId,
            clientId: application.announcement.clientId,
            delivererId: application.delivererId,
            totalPrice: application.proposedPrice || application.announcement.totalPrice,
            estimatedPickupTime: application.estimatedPickupTime,
            estimatedDeliveryTime: application.estimatedDeliveryTime,
            currentStatus: "PENDING_PICKUP",
            trackingNumber: this.generateTrackingNumber(),
            paymentStatus: "PENDING"
          }
        });

        // Rejeter les autres candidatures
        await tx.deliveryApplication.updateMany({
          where: {
            announcementId: application.announcementId,
            id: { not: applicationId }
          },
          data: {
            status: "REJECTED",
            reviewedAt: new Date()
          }
        });
      });

      // Envoyer notifications
      try {
        const { notificationService } = await import("@/server/services/common/notification.service");
        
        // Notification au livreur
        await notificationService.sendNotification({
          userId: application.delivererId,
          title: "Candidature acceptée",
          message: "Votre candidature a été acceptée ! Préparez-vous pour la livraison.",
          type: "ANNOUNCEMENT_ACCEPTED",
          data: {
            announcementId: application.announcementId,
            applicationId: applicationId
          }
        });
      } catch (error) {
        console.error("Erreur envoi notification:", error);
      }
    }

    return updatedApplication;
  },

  /**
   * Génère un numéro de tracking unique
   */
  generateTrackingNumber(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `ED${timestamp}${random}`.toUpperCase();
  }
};