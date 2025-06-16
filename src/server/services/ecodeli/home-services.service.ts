import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface HomeServiceRequest {
  clientId: string;
  serviceType: "CLEANING" | "GARDENING" | "SMALL_REPAIRS" | "PAINTING" | "PLUMBING" | "ELECTRICAL" | "ASSEMBLY" | "OTHER";
  title: string;
  description: string;
  estimatedDuration: number; // en heures
  scheduledDate: Date;
  preferredTimeSlot: "MORNING" | "AFTERNOON" | "EVENING" | "FLEXIBLE";
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  address: string;
  latitude: number;
  longitude: number;
  materialsProvided: boolean;
  materialsNeeded?: string[];
  specialRequirements?: string;
  photos?: string[]; // URLs des photos du probl�me/zone
  maxPrice?: number;
  notes?: string;
}

export interface HomeServiceProvider {
  providerId: string;
  specialties: string[]; // Types de services propos�s
  experienceYears: number;
  hasOwnTools: boolean;
  hasInsurance: boolean;
  certifications?: string[];
  availableDays: number[]; // Jours de la semaine (0=dimanche)
  workingHours: {
    start: string; // "08:00"
    end: string;   // "18:00"
  };
  pricePerHour: number;
  minimumServiceTime: number; // dur�e minimum en heures
  serviceRadius: number; // rayon en km
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
}

export class HomeServicesService {
  /**
   * Cr�e une demande de service � domicile
   */
  async createHomeServiceRequest(data: HomeServiceRequest): Promise<any> {
    try {
      // V�rifier que le client existe
      const client = await db.client.findFirst({
        where: { userId: data.clientId }
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Client non trouv�"
         });
      }

      // Calculer le prix estim�
      const estimatedPrice = this.calculateEstimatedPrice(data.serviceType, data.estimatedDuration, data.urgency);

      // Cr�er la demande de service
      const serviceRequest = await db.serviceBooking.create({
        data: {
          clientId: client.id,
          type: "HOME_SERVICE",
          title: data.title,
          description: data.description,
          scheduledAt: data.scheduledDate,
          estimatedDuration: data.estimatedDuration * 60, // en minutes
          estimatedPrice,
          maxPrice: data.maxPrice,
          status: "PENDING",
          metadata: {
            serviceType: data.serviceType,
            preferredTimeSlot: data.preferredTimeSlot,
            urgency: data.urgency,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            materialsProvided: data.materialsProvided,
            materialsNeeded: data.materialsNeeded || [],
            specialRequirements: data.specialRequirements,
            photos: data.photos || [],
            estimatedHours: data.estimatedDuration
          },
          notes: data.notes,
          specialInstructions: data.specialRequirements
        }
      });

      // Chercher des prestataires disponibles
      await this.findAvailableHomeServiceProviders(serviceRequest.id, data);

      return serviceRequest;
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la demande de service:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la cr�ation de la demande de service"
       });
    }
  }

  /**
   * Trouve les prestataires de services � domicile disponibles
   */
  private async findAvailableHomeServiceProviders(
    requestId: string,
    data: HomeServiceRequest
  ): Promise<void> {
    try {
      // Rechercher les prestataires de services � domicile
      const providers = await db.provider.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              category: "HOME_SERVICE",
              isActive: true
            }
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              address: true,
              latitude: true,
              longitude: true
            }
          },
          services: {
            where: {
              category: "HOME_SERVICE",
              isActive: true
            }
          }
        }
      });

      // Filtrer selon les crit�res sp�cifiques
      const suitableProviders = providers.filter(provider => {
        const homeService = provider.services[0];
        if (!homeService) return false;

        const metadata = homeService.metadata as any || {};
        
        // V�rifier les sp�cialit�s
        if (metadata.specialties && !metadata.specialties.includes(data.serviceType)) {
          return false;
        }

        // V�rifier la proximit� g�ographique
        if (provider.user?.latitude && provider.user?.longitude) {
          const distance = this.calculateDistance(
            data.latitude,
            data.longitude,
            provider.user.latitude,
            provider.user.longitude
          );
          const serviceRadius = metadata.serviceRadius || 15;
          if (distance > serviceRadius) return false;
        }

        // V�rifier la disponibilit� selon le jour demand�
        const requestDay = data.scheduledDate.getDay();
        if (metadata.availableDays && !metadata.availableDays.includes(requestDay)) {
          return false;
        }

        // V�rifier les cr�neaux horaires
        if (data.preferredTimeSlot !== "FLEXIBLE" && metadata.workingHours) {
          const isTimeSlotAvailable = this.checkTimeSlotAvailability(
            data.preferredTimeSlot,
            metadata.workingHours
          );
          if (!isTimeSlotAvailable) return false;
        }

        return true;
      });

      // Trier par distance et noter
      const sortedProviders = suitableProviders
        .map(provider => ({ ...provider,
          distance: provider.user?.latitude && provider.user?.longitude 
            ? this.calculateDistance(data.latitude, data.longitude, provider.user.latitude, provider.user.longitude)
            : 999
         }))
        .sort((a, b) => a.distance - b.distance);

      // Notifier les prestataires appropri�s (maximum 10 pour �viter le spam)
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      for (const provider of sortedProviders.slice(0, 10)) {
        await notificationService.sendUserNotification({
          userId: provider.userId,
          title: "Nouvelle demande de service � domicile",
          message: `${data.title} - ${this.getServiceTypeLabel(data.serviceType)} pr�vu le ${data.scheduledDate.toLocaleDateString()}`,
          type: "NEW_HOME_SERVICE_REQUEST" as any,
          actionUrl: `/provider/home-services/requests/${requestId}`,
          priority: data.urgency === "URGENT" ? "HIGH" : "MEDIUM"
        });
      }

    } catch (error) {
      console.error("Erreur lors de la recherche de prestataires:", error);
    }
  }

  /**
   * Accepte une demande de service � domicile
   */
  async acceptHomeServiceRequest(requestId: string, providerId: string, proposedPrice?: number, proposedSchedule?: Date): Promise<any> {
    try {
      const provider = await db.provider.findFirst({
        where: { userId }
      });

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouv�"
         });
      }

      const request = await db.serviceBooking.findUnique({
        where: { id },
        include: {
          client: {
            include: {
              user: { select: { name: true, email: true } }
            }
          }
        }
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Demande de service non trouv�e"
         });
      }

      if (request.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Cette demande n'est plus disponible"
         });
      }

      // Mettre � jour la demande
      const updatedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          providerId: provider.id,
          status: "CONFIRMED",
          finalPrice: proposedPrice || request.estimatedPrice,
          scheduledAt: proposedSchedule || request.scheduledAt,
          confirmedAt: new Date()
        }
      });

      // Cr�er une conversation entre le client et le prestataire
      await this.createConversationForHomeService(request.clientId, provider.id, requestId);

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Service � domicile confirm�",
          message: `Votre demande "${request.title}" a �t� accept�e`,
          type: "HOME_SERVICE_CONFIRMED" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: "HIGH"
        });
      }

      return updatedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'acceptation de la demande"
       });
    }
  }

  /**
   * D�marre un service � domicile
   */
  async startHomeService(requestId: string, providerId: string, arrivalNotes?: string): Promise<any> {
    try {
      const provider = await db.provider.findFirst({
        where: { userId }
      });

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: provider.id,
          status: "CONFIRMED"
        },
        include: {
          client: {
            include: {
              user: { select: { name } }
            }
          }
        }
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Demande de service non trouv�e"
         });
      }

      // Marquer comme en cours
      const startedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          notes: arrivalNotes || request.notes
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Service d�marr�",
          message: `Le prestataire a commenc� "${request.title}"`,
          type: "HOME_SERVICE_STARTED" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: "MEDIUM"
        });
      }

      return startedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du d�marrage du service"
       });
    }
  }

  /**
   * Envoie une mise � jour du service en cours
   */
  async sendServiceUpdate(
    requestId: string,
    providerId: string,
    updateType: "PROGRESS" | "ISSUE" | "MATERIAL_NEEDED" | "COMPLETION_ESTIMATE" | "PHOTO",
    message: string,
    photos?: string[]
  ): Promise<any> {
    try {
      const provider = await db.provider.findFirst({
        where: { userId }
      });

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: provider.id,
          status: "IN_PROGRESS"
        },
        include: {
          client: {
            include: {
              user: { select: { name } }
            }
          }
        }
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Service en cours non trouv�"
         });
      }

      // Cr�er une mise � jour
      const update = await db.serviceUpdate.create({
        data: {
          serviceBookingId: requestId,
          providerId: provider.id,
          updateType,
          message,
          photos: photos || [],
          timestamp: new Date()
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        const priority = updateType === "ISSUE" ? "HIGH" : "LOW";
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: `Mise � jour - ${request.title}`,
          message: message,
          type: "HOME_SERVICE_UPDATE" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority
        });
      }

      return update;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi de la mise � jour"
       });
    }
  }

  /**
   * Termine un service � domicile
   */
  async completeHomeService(requestId: string, providerId: string, completionReport: string, beforeAfterPhotos?: string[]): Promise<any> {
    try {
      const provider = await db.provider.findFirst({
        where: { userId }
      });

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: provider.id,
          status: "IN_PROGRESS"
        },
        include: {
          client: {
            include: {
              user: { select: { name } }
            }
          }
        }
      });

      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Service en cours non trouv�"
         });
      }

      // Marquer comme termin�
      const completedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalReport: completionReport,
          metadata: {
            ...request.metadata,
            beforeAfterPhotos: beforeAfterPhotos || []
          }
        }
      });

      // Cr�er un rapport final si des photos sont fournies
      if (beforeAfterPhotos && beforeAfterPhotos.length > 0) {
        await db.serviceUpdate.create({
          data: {
            serviceBookingId: requestId,
            providerId: provider.id,
            updateType: "PHOTO",
            message: "Photos avant/apr�s du service termin�",
            photos: beforeAfterPhotos,
            timestamp: new Date()
          }
        });
      }

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Service termin�",
          message: `"${request.title}" a �t� termin� avec succ�s`,
          type: "HOME_SERVICE_COMPLETED" as any,
          actionUrl: `/client/services/bookings/${requestId}/review`,
          priority: "MEDIUM"
        });
      }

      return completedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la finalisation du service"
       });
    }
  }

  /**
   * Calcule le prix estim� selon le type de service
   */
  private calculateEstimatedPrice(serviceType: HomeServiceRequest['serviceType'], duration: number, urgency: HomeServiceRequest['urgency']): number {
    const baseRates = {
      CLEANING: 20,        // �/heure m�nage
      GARDENING: 25,       // �/heure jardinage
      _SMALL_REPAIRS: 35,   // �/heure petites r�parations
      PAINTING: 30,        // �/heure peinture
      PLUMBING: 45,        // �/heure plomberie
      ELECTRICAL: 50,      // �/heure �lectricit�
      ASSEMBLY: 25,        // �/heure montage
      OTHER: 30            // �/heure autre
    };

    const urgencyMultipliers = {
      LOW: 1.0,
      MEDIUM: 1.1,
      HIGH: 1.3,
      URGENT: 1.5
    };

    const ratePerHour = baseRates[serviceType] || 30;
    const urgencyMultiplier = urgencyMultipliers[urgency] || 1.0;
    const basePrice = duration * ratePerHour * urgencyMultiplier;
    
    // Ajout d'un co�t de d�placement minimum
    const travelCost = 15;
    
    return Math.round(basePrice + travelCost);
  }

  /**
   * Calcule la distance entre deux points (en km)
   */
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

  /**
   * V�rifie la disponibilit� selon le cr�neau horaire
   */
  private checkTimeSlotAvailability(
    preferredSlot: HomeServiceRequest['preferredTimeSlot'],
    workingHours: { start: string; end: string }
  ): boolean {
    if (preferredSlot === "FLEXIBLE") return true;

    const startHour = parseInt(workingHours.start.split(':')[0]);
    const endHour = parseInt(workingHours.end.split(':')[0]);

    switch (preferredSlot) {
      case "MORNING":
        return startHour <= 9 && endHour >= 12;
      case "AFTERNOON":
        return startHour <= 14 && endHour >= 17;
      case "EVENING":
        return endHour >= 18;
      default:
        return true;
    }
  }

  /**
   * Cr�e une conversation pour le service � domicile
   */
  private async createConversationForHomeService(clientId: string, providerId: string, requestId: string): Promise<void> {
    try {
      await db.conversation.create({
        data: {
          participants: [clientId, providerId],
          type: "HOME_SERVICE",
          relatedBookingId: requestId,
          title: "Service � domicile",
          isActive: true
        }
      });
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la conversation:", error);
    }
  }

  /**
   * Retourne le libell� du type de service
   */
  private getServiceTypeLabel(type: HomeServiceRequest['serviceType']): string {
    const labels = {
      CLEANING: "M�nage",
      GARDENING: "Jardinage", SMALL_REPAIRS: "Petites r�parations",
      PAINTING: "Peinture",
      PLUMBING: "Plomberie",
      ELECTRICAL: "�lectricit�",
      ASSEMBLY: "Montage",
      OTHER: "Autre service"
    };
    return labels[type] || "Service � domicile";
  }

  /**
   * R�cup�re les demandes de service pour un client
   */
  async getClientHomeServiceRequests(clientId: string): Promise<any[]> {
    try {
      const client = await db.client.findFirst({
        where: { userId }
      });

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Client non trouv�"
         });
      }

      return await db.serviceBooking.findMany({
        where: {
          clientId: client.id,
          type: "HOME_SERVICE"
        },
        include: {
          provider: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                  image: true
                }
              }
            }
          },
          updates: {
            orderBy: { timestamp: "desc" },
            take: 5
          }
        },
        orderBy: {
          scheduledAt: "desc"
        }
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la r�cup�ration des demandes"
       });
    }
  }

  /**
   * R�cup�re les demandes de service pour un prestataire
   */
  async getProviderHomeServiceRequests(providerId: string, status?: string): Promise<any[]> {
    try {
      const provider = await db.provider.findFirst({
        where: { userId }
      });

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Prestataire non trouv�"
         });
      }

      const whereClause: any = {
        type: "HOME_SERVICE"
      };

      if (status === "available") {
        whereClause.status = "PENDING";
        whereClause.providerId = null;
      } else if (status) {
        whereClause.status = status;
        whereClause.providerId = provider.id;
      } else {
        whereClause.providerId = provider.id;
      }

      return await db.serviceBooking.findMany({
        where: whereClause,
        include: {
          client: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                  address: true
                }
              }
            }
          },
          updates: {
            orderBy: { timestamp: "desc" },
            take: 3
          }
        },
        orderBy: {
          scheduledAt: "asc"
        }
      });
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la r�cup�ration des demandes"
       });
    }
  }
}

export const homeServicesService = new HomeServicesService();