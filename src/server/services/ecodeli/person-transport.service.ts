import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface PersonTransportRequest {
  clientId: string;
  startAddress: string;
  endAddress: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  scheduledDateTime: Date;
  passengerCount: number;
  specialRequirements?: string;
  transportType: "MEDICAL_APPOINTMENT" | "WORK_COMMUTE" | "AIRPORT_TRANSFER" | "TRAIN_STATION" | "SOCIAL_VISIT" | "SHOPPING" | "OTHER";
  wheelchairAccessible?: boolean;
  childSeatsNeeded?: number;
  estimatedDuration?: number;
  maxPrice?: number;
  notes?: string;
}

export interface TransportProvider {
  providerId: string;
  vehicleType: "CAR" | "VAN" | "ADAPTED_VEHICLE";
  capacity: number;
  hasWheelchairAccess: boolean;
  hasChildSeats: boolean;
  availableFrom: Date;
  availableTo: Date;
  pricePerKm: number;
  minimumPrice: number;
}

export class PersonTransportService {
  /**
   * Cr�e une demande de transport de personne
   */
  async createTransportRequest(data: PersonTransportRequest): Promise<any> {
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

      // Calculer la distance estim�e
      const distance = this.calculateDistance(
        data.startLatitude,
        data.startLongitude,
        data.endLatitude,
        data.endLongitude
      );

      // Estimer le prix de base
      const estimatedPrice = this.calculateEstimatedPrice(distance, data.transportType);

      // Cr�er la demande de transport
      const transportRequest = await db.serviceBooking.create({
        data: {
          clientId: client.id,
          type: "PERSON_TRANSPORT",
          title: `Transport ${this.getTransportTypeLabel(data.transportType)}`,
          description: `Transport de ${data.startAddress} � ${data.endAddress}`,
          scheduledAt: data.scheduledDateTime,
          estimatedDuration: data.estimatedDuration || this.estimateDuration(distance),
          estimatedPrice,
          maxPrice: data.maxPrice,
          status: "PENDING",
          metadata: {
            startAddress: data.startAddress,
            endAddress: data.endAddress,
            startLatitude: data.startLatitude,
            startLongitude: data.startLongitude,
            endLatitude: data.endLongitude,
            endLongitude: data.endLongitude,
            passengerCount: data.passengerCount,
            transportType: data.transportType,
            wheelchairAccessible: data.wheelchairAccessible,
            childSeatsNeeded: data.childSeatsNeeded,
            specialRequirements: data.specialRequirements,
            distance: Math.round(distance * 100) / 100
          },
          notes: data.notes
        }
      });

      // Chercher des transporteurs disponibles
      await this.findAvailableTransportProviders(transportRequest.id, data);

      return transportRequest;
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la demande de transport:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la cr�ation de la demande de transport"
       });
    }
  }

  /**
   * Trouve les transporteurs disponibles pour une demande
   */
  private async findAvailableTransportProviders(
    requestId: string,
    data: PersonTransportRequest
  ): Promise<void> {
    try {
      // Rechercher les prestataires de transport disponibles
      const providers = await db.provider.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              category: "TRANSPORT",
              isActive: true,
              availability: {
                some: {
                  dayOfWeek: new Date(data.scheduledDateTime).getDay(),
                  startTime: {
                    lte: data.scheduledDateTime.toISOString().split('T')[1].slice(0, 5)
                  },
                  endTime: {
                    gte: data.scheduledDateTime.toISOString().split('T')[1].slice(0, 5)
                  }
                }
              }
            }
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          services: {
            where: {
              category: "TRANSPORT",
              isActive: true
            }
          }
        }
      });

      // Filtrer selon les crit�res sp�cifiques
      const suitableProviders = providers.filter(provider => {
        const transportService = provider.services[0];
        if (!transportService) return false;

        const metadata = transportService.metadata as any || {};
        
        // V�rifier la capacit�
        if (metadata.vehicleCapacity && metadata.vehicleCapacity < data.passengerCount) {
          return false;
        }

        // V�rifier l'accessibilit� fauteuil roulant
        if (data.wheelchairAccessible && !metadata.wheelchairAccessible) {
          return false;
        }

        // V�rifier les si�ges enfants
        if (data.childSeatsNeeded && (!metadata.childSeats || metadata.childSeats < data.childSeatsNeeded)) {
          return false;
        }

        return true;
      });

      // Notifier les transporteurs appropri�s
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      for (const provider of suitableProviders) {
        await notificationService.sendUserNotification({
          userId: provider.userId,
          title: "Nouvelle demande de transport",
          message: `Demande de transport de ${data.startAddress} � ${data.endAddress} le ${data.scheduledDateTime.toLocaleDateString()}`,
          type: "NEW_TRANSPORT_REQUEST" as any,
          actionUrl: `/provider/transport/requests/${requestId}`,
          priority: "MEDIUM"
        });
      }

    } catch (error) {
      console.error("Erreur lors de la recherche de transporteurs:", error);
    }
  }

  /**
   * Accepte une demande de transport
   */
  async acceptTransportRequest(requestId: string, providerId: string, proposedPrice?: number): Promise<any> {
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
          message: "Demande de transport non trouv�e"
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

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Transport confirm�",
          message: `Votre demande de transport a �t� accept�e`,
          type: "TRANSPORT_CONFIRMED" as any,
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
   * Calcule la distance entre deux points (en km)
   */
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

  /**
   * Calcule le prix estim� selon le type de transport
   */
  private calculateEstimatedPrice(distance: number, transportType: PersonTransportRequest['transportType']): number {
    const baseRates = { MEDICAL_APPOINTMENT: 1.2, // Tarif m�dical
      _WORK_COMMUTE: 0.8,        // Tarif trajet domicile-travail
      _AIRPORT_TRANSFER: 1.5,     // Tarif a�roport
      _TRAIN_STATION: 1.3,       // Tarif gare
      _SOCIAL_VISIT: 1.0,        // Tarif standard
      SHOPPING: 1.0,            // Tarif standard
      OTHER: 1.0                // Tarif standard
    };

    const ratePerKm = baseRates[transportType] || 1.0;
    const basePrice = distance * ratePerKm;
    const minimumPrice = 8; // Prix minimum

    return Math.max(basePrice, minimumPrice);
  }

  /**
   * Estime la dur�e du transport
   */
  private estimateDuration(distance: number): number {
    // Vitesse moyenne estim�e en ville: 25 km/h
    const averageSpeed = 25;
    return Math.ceil((distance / averageSpeed) * 60); // en minutes
  }

  /**
   * Retourne le libell� du type de transport
   */
  private getTransportTypeLabel(type: PersonTransportRequest['transportType']): string {
    const labels = { MEDICAL_APPOINTMENT: "rendez-vous m�dical", WORK_COMMUTE: "trajet domicile-travail", AIRPORT_TRANSFER: "transfert a�roport", TRAIN_STATION: "transfert gare", SOCIAL_VISIT: "visite sociale",
      SHOPPING: "courses",
      OTHER: "autre"
    };

    return labels[type] || "transport";
  }

  /**
   * R�cup�re les demandes de transport pour un client
   */
  async getClientTransportRequests(clientId: string): Promise<any[]> {
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
          type: "PERSON_TRANSPORT"
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
   * R�cup�re les demandes de transport pour un prestataire
   */
  async getProviderTransportRequests(providerId: string, status?: string): Promise<any[]> {
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
        type: "PERSON_TRANSPORT"
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
                  phone: true
                }
              }
            }
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

  /**
   * Marque un transport comme termin�
   */
  async completeTransport(requestId: string, providerId: string, notes?: string): Promise<any> {
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
          message: "Demande de transport non trouv�e"
         });
      }

      // Marquer comme termin�
      const completedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          notes: notes || request.notes
        }
      });

      // Notifier le client pour demander un avis
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Transport termin�",
          message: `Votre transport a �t� termin� avec succ�s`,
          type: "TRANSPORT_COMPLETED" as any,
          actionUrl: `/client/services/bookings/${requestId}/review`,
          priority: "MEDIUM"
        });
      }

      return completedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la finalisation du transport"
       });
    }
  }
}

export const personTransportService = new PersonTransportService();