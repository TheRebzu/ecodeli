import { prisma } from "@/lib/db";
import { NotificationService } from "@/features/notifications/services/notification.service";

export interface OrderData {
  clientId: string;
  type: "DELIVERY" | "SERVICE";
  announcementId?: string;
  serviceId?: string;
  scheduledDate: Date;
  notes?: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  estimatedPrice: number;
}

export interface OrderStatus {
  id: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
}

export interface DeliveryOrder {
  id: string;
  announcementId: string;
  clientId: string;
  delivererId?: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageDetails: any;
  price: number;
  status: string;
  scheduledDate: Date;
  estimatedDuration: number;
}

export interface ServiceOrder {
  id: string;
  serviceId: string;
  clientId: string;
  providerId: string;
  scheduledDate: Date;
  duration: number;
  price: number;
  status: string;
  location: string;
  requirements: string[];
}

export class OrderManagementService {
  /**
   * Créer une nouvelle commande de livraison
   */
  static async createDeliveryOrder(orderData: {
    announcementId: string;
    clientId: string;
    notes?: string;
  }): Promise<DeliveryOrder> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: orderData.announcementId },
        include: {
          client: {
            include: {
              user: { include: { profile: true } },
            },
          },
        },
      });

      if (!announcement) {
        throw new Error("Annonce non trouvée");
      }

      if (announcement.status !== "ACTIVE") {
        throw new Error("Cette annonce n'est plus disponible");
      }

      const delivery = await prisma.$transaction(async (tx) => {
        // Créer la livraison
        const newDelivery = await tx.delivery.create({
          data: {
            announcementId: orderData.announcementId,
            clientId: orderData.clientId,
            pickupAddress: announcement.pickupAddress,
            deliveryAddress: announcement.deliveryAddress,
            pickupCoordinates: announcement.pickupCoordinates,
            deliveryCoordinates: announcement.deliveryCoordinates,
            packageDetails: announcement.packageDetails,
            price: announcement.price,
            desiredDate: announcement.desiredDate,
            pickupTimeStart: announcement.pickupTimeStart,
            pickupTimeEnd: announcement.pickupTimeEnd,
            deliveryTimeStart: announcement.deliveryTimeStart,
            deliveryTimeEnd: announcement.deliveryTimeEnd,
            notes: orderData.notes,
            status: "PENDING",
            urgency: announcement.urgency,
            estimatedDuration: announcement.estimatedDuration || 60,
          },
        });

        // Marquer l'annonce comme en cours de traitement
        await tx.announcement.update({
          where: { id: orderData.announcementId },
          data: { status: "PROCESSING" },
        });

        return newDelivery;
      });

      // Notifier le client
      await NotificationService.createNotification({
        userId: orderData.clientId,
        type: "DELIVERY_ORDER_CREATED",
        title: "📦 Commande de livraison créée",
        message:
          "Votre demande de livraison a été enregistrée et recherche un livreur.",
        data: {
          deliveryId: delivery.id,
          announcementId: orderData.announcementId,
        },
        sendPush: true,
        priority: "medium",
      });

      // Déclencher le matching automatique
      await this.triggerDeliveryMatching(delivery.id);

      return {
        id: delivery.id,
        announcementId: delivery.announcementId,
        clientId: delivery.clientId,
        delivererId: delivery.delivererId,
        pickupAddress: delivery.pickupAddress,
        deliveryAddress: delivery.deliveryAddress,
        packageDetails: delivery.packageDetails,
        price: delivery.price,
        status: delivery.status,
        scheduledDate: delivery.desiredDate,
        estimatedDuration: delivery.estimatedDuration,
      };
    } catch (error) {
      console.error("Erreur création commande livraison:", error);
      throw error;
    }
  }

  /**
   * Créer une nouvelle commande de service
   */
  static async createServiceOrder(orderData: {
    serviceId: string;
    clientId: string;
    scheduledDate: Date;
    duration: number;
    location: string;
    notes?: string;
  }): Promise<ServiceOrder> {
    try {
      const service = await prisma.service.findUnique({
        where: { id: orderData.serviceId },
        include: {
          provider: {
            include: {
              user: { include: { profile: true } },
            },
          },
        },
      });

      if (!service) {
        throw new Error("Service non trouvé");
      }

      if (!service.isActive) {
        throw new Error("Ce service n'est plus disponible");
      }

      // Vérifier la disponibilité du prestataire
      const isAvailable = await this.checkProviderAvailability(
        service.providerId,
        orderData.scheduledDate,
        orderData.duration,
      );

      if (!isAvailable) {
        throw new Error("Le prestataire n'est pas disponible à cette date");
      }

      const booking = await prisma.$transaction(async (tx) => {
        // Créer la réservation
        const newBooking = await tx.booking.create({
          data: {
            serviceId: orderData.serviceId,
            clientId: orderData.clientId,
            providerId: service.providerId,
            scheduledDate: orderData.scheduledDate,
            duration: orderData.duration,
            totalPrice: service.basePrice * (orderData.duration / 60), // Prix par heure
            location: orderData.location,
            notes: orderData.notes,
            status: "PENDING",
          },
        });

        // Réserver le créneau
        const { AvailabilityService } = await import(
          "@/features/calendar/services/availability.service"
        );

        const timeSlot = await tx.providerTimeSlot.findFirst({
          where: {
            providerId: service.providerId,
            date: orderData.scheduledDate,
            isAvailable: true,
          },
        });

        if (timeSlot) {
          await AvailabilityService.bookTimeSlot(timeSlot.id, newBooking.id);
        }

        return newBooking;
      });

      // Notifier le prestataire
      await NotificationService.notifyNewBooking(
        service.provider.userId,
        booking.id,
        service.name,
        booking.client?.user.profile?.firstName +
          " " +
          booking.client?.user.profile?.lastName || "Client",
        orderData.scheduledDate.toLocaleDateString("fr-FR"),
        booking.totalPrice,
      );

      // Notifier le client
      await NotificationService.createNotification({
        userId: orderData.clientId,
        type: "SERVICE_ORDER_CREATED",
        title: "📅 Réservation créée",
        message: `Votre réservation "${service.name}" a été envoyée au prestataire.`,
        data: {
          bookingId: booking.id,
          serviceId: orderData.serviceId,
        },
        sendPush: true,
        priority: "medium",
      });

      return {
        id: booking.id,
        serviceId: booking.serviceId,
        clientId: booking.clientId,
        providerId: booking.providerId,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        price: booking.totalPrice,
        status: booking.status,
        location: booking.location,
        requirements: service.requirements,
      };
    } catch (error) {
      console.error("Erreur création commande service:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une commande
   */
  static async updateOrderStatus(
    orderId: string,
    type: "DELIVERY" | "SERVICE",
    newStatus: string,
    updateData?: any,
  ): Promise<void> {
    try {
      if (type === "DELIVERY") {
        await this.updateDeliveryStatus(orderId, newStatus, updateData);
      } else {
        await this.updateServiceStatus(orderId, newStatus, updateData);
      }
    } catch (error) {
      console.error("Erreur mise à jour statut commande:", error);
      throw error;
    }
  }

  /**
   * Mettre à jour le statut d'une livraison
   */
  private static async updateDeliveryStatus(
    deliveryId: string,
    newStatus: string,
    updateData?: any,
  ): Promise<void> {
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        client: {
          include: {
            user: { include: { profile: true } },
          },
        },
        deliverer: {
          include: {
            user: { include: { profile: true } },
          },
        },
      },
    });

    if (!delivery) {
      throw new Error("Livraison non trouvée");
    }

    const updateFields: any = { status: newStatus };

    switch (newStatus) {
      case "ACCEPTED":
        updateFields.acceptedAt = new Date();
        if (updateData?.delivererId) {
          updateFields.delivererId = updateData.delivererId;
        }
        break;
      case "PICKED_UP":
        updateFields.pickedUpAt = new Date();
        break;
      case "DELIVERED":
        updateFields.deliveredAt = new Date();
        updateFields.validatedAt = new Date();
        break;
      case "CANCELLED":
        updateFields.cancelledAt = new Date();
        updateFields.cancelReason = updateData?.reason;
        break;
    }

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: updateFields,
    });

    // Envoyer les notifications appropriées
    if (delivery.client) {
      await NotificationService.notifyDeliveryStatusUpdate(
        delivery.client.userId,
        deliveryId,
        newStatus,
        updateData?.message,
      );
    }
  }

  /**
   * Mettre à jour le statut d'un service
   */
  private static async updateServiceStatus(
    bookingId: string,
    newStatus: string,
    updateData?: any,
  ): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: {
          include: {
            user: { include: { profile: true } },
          },
        },
        provider: {
          include: {
            user: { include: { profile: true } },
          },
        },
        service: true,
      },
    });

    if (!booking) {
      throw new Error("Réservation non trouvée");
    }

    const updateFields: any = { status: newStatus };

    switch (newStatus) {
      case "CONFIRMED":
        updateFields.confirmedAt = new Date();
        break;
      case "IN_PROGRESS":
        updateFields.startedAt = new Date();
        // Créer l'intervention
        await prisma.intervention.create({
          data: {
            bookingId: booking.id,
            providerId: booking.providerId,
            startTime: new Date(),
            status: "IN_PROGRESS",
          },
        });
        break;
      case "COMPLETED":
        updateFields.completedAt = new Date();
        // Finaliser l'intervention
        const intervention = await prisma.intervention.findFirst({
          where: { bookingId: booking.id },
        });
        if (intervention) {
          await prisma.intervention.update({
            where: { id: intervention.id },
            data: {
              endTime: new Date(),
              status: "COMPLETED",
              actualDuration: updateData?.actualDuration || booking.duration,
            },
          });
        }
        break;
      case "CANCELLED":
        updateFields.cancelledAt = new Date();
        updateFields.cancelReason = updateData?.reason;
        // Libérer le créneau
        const { AvailabilityService } = await import(
          "@/features/calendar/services/availability.service"
        );
        const timeSlot = await prisma.providerTimeSlot.findFirst({
          where: { bookingId: booking.id },
        });
        if (timeSlot) {
          await AvailabilityService.releaseTimeSlot(timeSlot.id);
        }
        break;
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: updateFields,
    });

    // Envoyer les notifications appropriées
    const message = this.getServiceStatusMessage(
      newStatus,
      booking.service.name,
    );

    if (booking.client) {
      await NotificationService.createNotification({
        userId: booking.client.userId,
        type: "SERVICE_STATUS_UPDATE",
        title: "📅 Mise à jour de réservation",
        message,
        data: {
          bookingId,
          status: newStatus,
        },
        sendPush: true,
        priority: newStatus === "COMPLETED" ? "high" : "medium",
      });
    }
  }

  /**
   * Déclencher le matching automatique pour une livraison
   */
  private static async triggerDeliveryMatching(
    deliveryId: string,
  ): Promise<void> {
    try {
      // Importer le service de matching
      const { SmartMatchingService } = await import(
        "@/features/matching/services/smart-matching.service"
      );

      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { announcement: true },
      });

      if (delivery?.announcement) {
        // Lancer le matching intelligent
        const matches = await SmartMatchingService.findMatchesForAnnouncement(
          delivery.announcement.id,
        );

        // Notifier les livreurs potentiels
        for (const match of matches.slice(0, 5)) {
          // Top 5 matches
          await NotificationService.notifyDeliveryOpportunity(
            match.deliverer.userId,
            delivery.announcement.id,
            {
              title: delivery.announcement.title,
              pickupLocation: delivery.pickupAddress,
              deliveryLocation: delivery.deliveryAddress,
              price: delivery.price,
              desiredDate: delivery.desiredDate,
            },
          );
        }
      }
    } catch (error) {
      console.error("Erreur matching automatique:", error);
      // Ne pas faire échouer la création de commande
    }
  }

  /**
   * Vérifier la disponibilité d'un prestataire
   */
  private static async checkProviderAvailability(
    providerId: string,
    scheduledDate: Date,
    duration: number,
  ): Promise<boolean> {
    try {
      const { AvailabilityService } = await import(
        "@/features/calendar/services/availability.service"
      );

      const startTime = scheduledDate.toTimeString().substring(0, 5);
      const endDate = new Date(scheduledDate.getTime() + duration * 60000);
      const endTime = endDate.toTimeString().substring(0, 5);

      const hasConflict = await AvailabilityService.checkSlotConflicts(
        providerId,
        scheduledDate,
        startTime,
        endTime,
      );

      return !hasConflict;
    } catch (error) {
      console.error("Erreur vérification disponibilité:", error);
      return false;
    }
  }

  /**
   * Obtenir le message de statut pour un service
   */
  private static getServiceStatusMessage(
    status: string,
    serviceName: string,
  ): string {
    const messages: Record<string, string> = {
      CONFIRMED: `Votre réservation "${serviceName}" a été confirmée`,
      IN_PROGRESS: `Votre service "${serviceName}" a commencé`,
      COMPLETED: `Votre service "${serviceName}" est terminé`,
      CANCELLED: `Votre réservation "${serviceName}" a été annulée`,
    };

    return messages[status] || `Statut mis à jour: ${status}`;
  }

  /**
   * Obtenir les commandes d'un client
   */
  static async getClientOrders(
    clientId: string,
    filters: {
      type?: "DELIVERY" | "SERVICE";
      status?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<any> {
    try {
      const { type, status, limit = 20, offset = 0 } = filters;

      if (!type || type === "DELIVERY") {
        const deliveryWhere: any = { clientId };
        if (status) deliveryWhere.status = status;

        const deliveries = await prisma.delivery.findMany({
          where: deliveryWhere,
          include: {
            announcement: true,
            deliverer: {
              include: {
                user: { include: { profile: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: type === "DELIVERY" ? limit : Math.floor(limit / 2),
          skip: offset,
        });

        if (type === "DELIVERY") {
          return { orders: deliveries, type: "DELIVERY" };
        }
      }

      if (!type || type === "SERVICE") {
        const serviceWhere: any = { clientId };
        if (status) serviceWhere.status = status;

        const services = await prisma.booking.findMany({
          where: serviceWhere,
          include: {
            service: {
              include: {
                provider: {
                  include: {
                    user: { include: { profile: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: type === "SERVICE" ? limit : Math.floor(limit / 2),
          skip: type === "SERVICE" ? offset : 0,
        });

        if (type === "SERVICE") {
          return { orders: services, type: "SERVICE" };
        }
      }

      // Si pas de type spécifié, retourner les deux
      return {
        deliveries: await prisma.delivery.findMany({
          where: { clientId },
          include: {
            announcement: true,
            deliverer: { include: { user: { include: { profile: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take: Math.floor(limit / 2),
        }),
        services: await prisma.booking.findMany({
          where: { clientId },
          include: {
            service: {
              include: {
                provider: { include: { user: { include: { profile: true } } } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: Math.floor(limit / 2),
        }),
      };
    } catch (error) {
      console.error("Erreur récupération commandes client:", error);
      throw error;
    }
  }
}
