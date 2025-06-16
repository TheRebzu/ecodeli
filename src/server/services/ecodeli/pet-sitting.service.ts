import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface PetSittingRequest {
  clientId: string;
  petType: "DOG" | "CAT" | "BIRD" | "RABBIT" | "FISH" | "OTHER";
  petName: string;
  petAge?: number;
  petBreed?: string;
  petWeight?: number;
  petCharacteristics?: string;
  serviceType: "HOME_VISIT" | "OVERNIGHT_SITTING" | "DOG_WALKING" | "FEEDING_ONLY" | "MEDICAL_CARE";
  startDateTime: Date;
  endDateTime: Date;
  location: "CLIENT_HOME" | "SITTER_HOME";
  address: string;
  latitude: number;
  longitude: number;
  specialInstructions?: string;
  emergencyContact: string;
  vetContact?: string;
  medicationNeeded?: boolean;
  medicationDetails?: string;
  keyLocation?: string;
  maxPrice?: number;
  notes?: string;
}

export interface PetSitter {
  providerId: string;
  experienceYears: number;
  petTypesAccepted: string[];
  servicesOffered: string[];
  hasOwnPets: boolean;
  certifications?: string[];
  availableFrom: Date;
  availableTo: Date;
  pricePerHour: number;
  pricePerDay: number;
  location: {
    address: string;
    latitude: number;
    longitude: number;
    radius: number; // rayon de service en km
  };
}

export class PetSittingService {
  /**
   * Cr�e une demande de garde d'animaux
   */
  async createPetSittingRequest(data: PetSittingRequest): Promise<any> {
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

      // Calculer la dur�e en heures
      const durationMs = data.endDateTime.getTime() - data.startDateTime.getTime();
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

      // Estimer le prix de base
      const estimatedPrice = this.calculateEstimatedPrice(data.serviceType, durationHours);

      // Cr�er la demande de garde
      const petSittingRequest = await db.serviceBooking.create({
        data: {
          clientId: client.id,
          type: "PET_SITTING",
          title: `Garde ${this.getPetTypeLabel(data.petType)} - ${data.petName}`,
          description: `${this.getServiceTypeLabel(data.serviceType)} pour ${data.petName} (${data.petType})`,
          scheduledAt: data.startDateTime,
          estimatedDuration: durationHours * 60, // en minutes
          estimatedPrice,
          maxPrice: data.maxPrice,
          status: "PENDING",
          metadata: {
            petType: data.petType,
            petName: data.petName,
            petAge: data.petAge,
            petBreed: data.petBreed,
            petWeight: data.petWeight,
            petCharacteristics: data.petCharacteristics,
            serviceType: data.serviceType,
            endDateTime: data.endDateTime.toISOString(),
            location: data.location,
            address: data.address,
            latitude: data.latitude,
            longitude: data.longitude,
            emergencyContact: data.emergencyContact,
            vetContact: data.vetContact,
            medicationNeeded: data.medicationNeeded,
            medicationDetails: data.medicationDetails,
            keyLocation: data.keyLocation,
            durationHours
          },
          notes: data.notes,
          specialInstructions: data.specialInstructions
        }
      });

      // Chercher des gardiens disponibles
      await this.findAvailablePetSitters(petSittingRequest.id, data);

      return petSittingRequest;
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la demande de garde:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la cr�ation de la demande de garde"
       });
    }
  }

  /**
   * Trouve les gardiens d'animaux disponibles
   */
  private async findAvailablePetSitters(
    requestId: string,
    data: PetSittingRequest
  ): Promise<void> {
    try {
      // Rechercher les prestataires de garde d'animaux
      const providers = await db.provider.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              category: "PET_CARE",
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
              category: "PET_CARE",
              isActive: true
            }
          }
        }
      });

      // Filtrer selon les crit�res sp�cifiques
      const suitableSitters = providers.filter(provider => {
        const petService = provider.services[0];
        if (!petService) return false;

        const metadata = petService.metadata as any || {};
        
        // V�rifier les types d'animaux accept�s
        if (metadata.petTypesAccepted && !metadata.petTypesAccepted.includes(data.petType)) {
          return false;
        }

        // V�rifier les services offerts
        if (metadata.servicesOffered && !metadata.servicesOffered.includes(data.serviceType)) {
          return false;
        }

        // V�rifier la proximit� g�ographique (rayon de 20km)
        if (provider.user?.latitude && provider.user?.longitude) {
          const distance = this.calculateDistance(
            data.latitude,
            data.longitude,
            provider.user.latitude,
            provider.user.longitude
          );
          if (distance > 20) return false; // 20km max
        }

        // V�rifier la disponibilit� temporelle
        const serviceRadius = metadata.serviceRadius || 10;
        const isAvailable = this.checkTimeAvailability(
          data.startDateTime,
          data.endDateTime,
          metadata.availability || []
        );

        return isAvailable;
      });

      // Notifier les gardiens appropri�s
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      for (const sitter of suitableSitters) {
        await notificationService.sendUserNotification({
          userId: sitter.userId,
          title: "Nouvelle demande de garde d'animaux",
          message: `Demande de garde pour ${data.petName} (${data.petType}) du ${data.startDateTime.toLocaleDateString()} au ${data.endDateTime.toLocaleDateString()}`,
          type: "NEW_PET_SITTING_REQUEST" as any,
          actionUrl: `/provider/pet-sitting/requests/${requestId}`,
          priority: "MEDIUM"
        });
      }

    } catch (error) {
      console.error("Erreur lors de la recherche de gardiens:", error);
    }
  }

  /**
   * Accepte une demande de garde d'animaux
   */
  async acceptPetSittingRequest(requestId: string, providerId: string, proposedPrice?: number): Promise<any> {
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
          message: "Demande de garde non trouv�e"
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
          confirmedAt: new Date()
        }
      });

      // Cr�er une conversation entre le client et le gardien
      await this.createConversationForPetSitting(request.clientId, provider.id, requestId);

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Garde d'animaux confirm�e",
          message: `Votre demande de garde pour ${request.metadata?.petName} a �t� accept�e`,
          type: "PET_SITTING_CONFIRMED" as any,
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
   * D�marre une session de garde
   */
  async startPetSitting(requestId: string, providerId: string, notes?: string): Promise<any> {
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
          message: "Demande de garde non trouv�e"
         });
      }

      // Marquer comme en cours
      const startedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          notes: notes || request.notes
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Garde d�marr�e",
          message: `La garde de ${request.metadata?.petName} a commenc�`,
          type: "PET_SITTING_STARTED" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: "MEDIUM"
        });
      }

      return startedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du d�marrage de la garde"
       });
    }
  }

  /**
   * Envoie une mise � jour sur l'animal
   */
  async sendPetUpdate(
    requestId: string,
    providerId: string,
    updateType: "FEEDING" | "WALK" | "PLAY" | "NAP" | "MEDICATION" | "OTHER",
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
          message: "Session de garde non trouv�e"
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
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: `Nouvelle de ${request.metadata?.petName}`,
          message: message,
          type: "PET_UPDATE" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: "LOW"
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
   * Termine une session de garde
   */
  async completePetSitting(requestId: string, providerId: string, finalReport: string): Promise<any> {
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
          message: "Session de garde non trouv�e"
         });
      }

      // Marquer comme termin�
      const completedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalReport
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Garde termin�e",
          message: `La garde de ${request.metadata?.petName} est termin�e`,
          type: "PET_SITTING_COMPLETED" as any,
          actionUrl: `/client/services/bookings/${requestId}/review`,
          priority: "MEDIUM"
        });
      }

      return completedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la finalisation de la garde"
       });
    }
  }

  /**
   * Calcule le prix estim� selon le type de service
   */
  private calculateEstimatedPrice(serviceType: PetSittingRequest['serviceType'], durationHours: number): number {
    const baseRates = { HOME_VISIT: 15,        // �/heure visite � domicile
      _OVERNIGHT_SITTING: 40, // �/nuit garde de nuit
      _DOG_WALKING: 20,       // �/heure promenade
      _FEEDING_ONLY: 10,      // �/visite alimentation
      _MEDICAL_CARE: 25       // �/heure soins m�dicaux
    };

    const ratePerHour = baseRates[serviceType] || 15;
    
    if (serviceType === "OVERNIGHT_SITTING") {
      const nights = Math.ceil(durationHours / 24);
      return nights * ratePerHour;
    } else if (serviceType === "FEEDING_ONLY") {
      const visits = Math.ceil(durationHours / 8); // 3 visites par jour max
      return visits * ratePerHour;
    } else {
      return durationHours * ratePerHour;
    }
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
   * V�rifie la disponibilit� temporelle
   */
  private checkTimeAvailability(startDate: Date, endDate: Date, availability: any[]): boolean {
    // Logique simplifi�e - � am�liorer selon le mod�le de disponibilit�
    return true; // Pour l'instant, on consid�re que tous les prestataires sont disponibles
  }

  /**
   * Cr�e une conversation pour la garde d'animaux
   */
  private async createConversationForPetSitting(clientId: string, providerId: string, requestId: string): Promise<void> {
    try {
      await db.conversation.create({
        data: {
          participants: [clientId, providerId],
          type: "PET_SITTING",
          relatedBookingId: requestId,
          title: "Garde d'animaux",
          isActive: true
        }
      });
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la conversation:", error);
    }
  }

  /**
   * Retourne le libell� du type d'animal
   */
  private getPetTypeLabel(type: PetSittingRequest['petType']): string {
    const labels = {
      DOG: "chien",
      CAT: "chat", 
      BIRD: "oiseau",
      RABBIT: "lapin",
      FISH: "poisson",
      OTHER: "animal"
    };
    return labels[type] || "animal";
  }

  /**
   * Retourne le libell� du type de service
   */
  private getServiceTypeLabel(type: PetSittingRequest['serviceType']): string {
    const labels = { HOME_VISIT: "Visite � domicile", OVERNIGHT_SITTING: "Garde de nuit", DOG_WALKING: "Promenade", FEEDING_ONLY: "Alimentation uniquement", MEDICAL_CARE: "Soins m�dicaux"
    };
    return labels[type] || "Garde d'animaux";
  }

  /**
   * R�cup�re les demandes de garde pour un client
   */
  async getClientPetSittingRequests(clientId: string): Promise<any[]> {
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
          type: "PET_SITTING"
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
            orderBy: { timestamp: "desc" }
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
   * R�cup�re les demandes de garde pour un prestataire
   */
  async getProviderPetSittingRequests(providerId: string, status?: string): Promise<any[]> {
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
        type: "PET_SITTING"
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
            orderBy: { timestamp: "desc" }
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

export const petSittingService = new PetSittingService();