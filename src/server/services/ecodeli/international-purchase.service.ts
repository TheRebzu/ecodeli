import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface InternationalPurchaseRequest {
  clientId: string;
  productName: string;
  productDescription: string;
  productUrl?: string;
  productImages?: string[];
  estimatedPrice: number;
  maxPrice: number;
  currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "OTHER";
  originCountry: string;
  originCity?: string;
  destinationAddress: string;
  destinationLatitude: number;
  destinationLongitude: number;
  preferredDeliveryDate?: Date;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  specialInstructions?: string;
  requiresCustomsDeclaration: boolean;
  estimatedWeight?: number; // en kg
  estimatedDimensions?: {
    length: number; // en cm
    width: number;
    height: number;
  };
  category: "ELECTRONICS" | "CLOTHING" | "BOOKS" | "COSMETICS" | "FOOD" | "COLLECTIBLES" | "OTHER";
  notes?: string;
}

export interface InternationalPurchaseAgent {
  agentId: string;
  operatingCountries: string[];
  languages: string[];
  specialties: string[]; // Cat�gories de produits
  experienceYears: number;
  verificationLevel: "BASIC" | "VERIFIED" | "PREMIUM";
  commissionRate: number; // Pourcentage
  averageDeliveryTime: number; // en jours
  hasCustomsExperience: boolean;
  maxOrderValue: number;
}

export class InternationalPurchaseService {
  /**
   * Cr�e une demande d'achat international
   */
  async createInternationalPurchaseRequest(data: InternationalPurchaseRequest): Promise<any> {
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

      // Calculer les frais estim�s
      const estimatedFees = this.calculateEstimatedFees(data);
      const totalEstimatedCost = data.estimatedPrice + estimatedFees.shipping + estimatedFees.commission + estimatedFees.customs;

      // Cr�er la demande d'achat
      const purchaseRequest = await db.serviceBooking.create({
        data: {
          clientId: client.id,
          type: "INTERNATIONAL_PURCHASE",
          title: `Achat international: ${data.productName}`,
          description: data.productDescription,
          scheduledAt: data.preferredDeliveryDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 semaines par d�faut
          estimatedDuration: this.getEstimatedDeliveryTime(data.originCountry) * 24 * 60, // en minutes
          estimatedPrice: totalEstimatedCost,
          maxPrice: data.maxPrice,
          status: "PENDING",
          metadata: {
            productName: data.productName,
            productUrl: data.productUrl,
            productImages: data.productImages || [],
            estimatedProductPrice: data.estimatedPrice,
            currency: data.currency,
            originCountry: data.originCountry,
            originCity: data.originCity,
            destinationAddress: data.destinationAddress,
            destinationLatitude: data.destinationLatitude,
            destinationLongitude: data.destinationLongitude,
            urgency: data.urgency,
            requiresCustomsDeclaration: data.requiresCustomsDeclaration,
            estimatedWeight: data.estimatedWeight,
            estimatedDimensions: data.estimatedDimensions,
            category: data.category,
            estimatedFees: estimatedFees,
            totalEstimatedCost
          },
          notes: data.notes,
          specialInstructions: data.specialInstructions
        }
      });

      // Chercher des agents disponibles
      await this.findAvailableInternationalAgents(purchaseRequest.id, data);

      return purchaseRequest;
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la demande d'achat:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la cr�ation de la demande d'achat"
       });
    }
  }

  /**
   * Trouve les agents d'achat international disponibles
   */
  private async findAvailableInternationalAgents(
    requestId: string,
    data: InternationalPurchaseRequest
  ): Promise<void> {
    try {
      // Rechercher les agents d'achat international
      const agents = await db.provider.findMany({
        where: {
          isActive: true,
          services: {
            some: {
              category: "INTERNATIONAL_PURCHASE",
              isActive: true
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
              category: "INTERNATIONAL_PURCHASE",
              isActive: true
            }
          }
        }
      });

      // Filtrer selon les crit�res sp�cifiques
      const suitableAgents = agents.filter(agent => {
        const purchaseService = agent.services[0];
        if (!purchaseService) return false;

        const metadata = purchaseService.metadata as any || {};
        
        // V�rifier les pays d'op�ration
        if (metadata.operatingCountries && !metadata.operatingCountries.includes(data.originCountry)) {
          return false;
        }

        // V�rifier les sp�cialit�s (cat�gories)
        if (metadata.specialties && !metadata.specialties.includes(data.category)) {
          return false;
        }

        // V�rifier la valeur maximale de commande
        if (metadata.maxOrderValue && data.estimatedPrice > metadata.maxOrderValue) {
          return false;
        }

        // V�rifier l'exp�rience douani�re si n�cessaire
        if (data.requiresCustomsDeclaration && !metadata.hasCustomsExperience) {
          return false;
        }

        return true;
      });

      // Trier par note de fiabilit� et temps de livraison
      const sortedAgents = suitableAgents
        .map(agent => {
          const metadata = agent.services[0]?.metadata as any || {};
          return {
            ...agent,
            averageDeliveryTime: metadata.averageDeliveryTime || 14,
            verificationLevel: metadata.verificationLevel || "BASIC"
          };
        })
        .sort((a, b) => {
          // Prioriser les agents v�rifi�s
          const verificationOrder = { "PREMIUM": 3, "VERIFIED": 2, "BASIC": 1 };
          const aLevel = verificationOrder[a.verificationLevel as keyof typeof verificationOrder] || 1;
          const bLevel = verificationOrder[b.verificationLevel as keyof typeof verificationOrder] || 1;
          
          if (aLevel !== bLevel) return bLevel - aLevel;
          
          // Puis par temps de livraison
          return a.averageDeliveryTime - b.averageDeliveryTime;
        });

      // Notifier les agents appropri�s (maximum 8 pour �viter le spam)
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      for (const agent of sortedAgents.slice(0, 8)) {
        await notificationService.sendUserNotification({
          userId: agent.userId,
          title: "Nouvelle demande d'achat international",
          message: `Achat de "${data.productName}" depuis ${data.originCountry} (${data.estimatedPrice} ${data.currency})`,
          type: "NEW_INTERNATIONAL_PURCHASE_REQUEST" as any,
          actionUrl: `/provider/international-purchase/requests/${requestId}`,
          priority: data.urgency === "URGENT" ? "HIGH" : "MEDIUM"
        });
      }

    } catch (error) {
      console.error("Erreur lors de la recherche d'agents:", error);
    }
  }

  /**
   * Accepte une demande d'achat international
   */
  async acceptInternationalPurchaseRequest(
    requestId: string, 
    agentId: string, 
    proposedPrice?: number,
    estimatedDeliveryTime?: number
  ): Promise<any> {
    try {
      const agent = await db.provider.findFirst({
        where: { userId }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Agent non trouv�"
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
          message: "Demande d'achat non trouv�e"
         });
      }

      if (request.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Cette demande n'est plus disponible"
         });
      }

      // Calculer la nouvelle date de livraison estim�e
      const newDeliveryDate = estimatedDeliveryTime 
        ? new Date(Date.now() + estimatedDeliveryTime * 24 * 60 * 60 * 1000)
        : request.scheduledAt;

      // Mettre � jour la demande
      const updatedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          providerId: agent.id,
          status: "CONFIRMED",
          finalPrice: proposedPrice || request.estimatedPrice,
          scheduledAt: newDeliveryDate,
          confirmedAt: new Date(),
          metadata: {
            ...request.metadata,
            agentEstimatedDeliveryTime: estimatedDeliveryTime,
            agentProposedPrice: proposedPrice
          }
        }
      });

      // Cr�er une conversation entre le client et l'agent
      await this.createConversationForPurchase(request.clientId, agent.id, requestId);

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Achat international confirm�",
          message: `Votre demande d'achat "${request.metadata?.productName}" a �t� accept�e`,
          type: "INTERNATIONAL_PURCHASE_CONFIRMED" as any,
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
   * D�marre le processus d'achat
   */
  async startPurchaseProcess(requestId: string, agentId: string, purchaseNotes?: string): Promise<any> {
    try {
      const agent = await db.provider.findFirst({
        where: { userId }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Agent non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: agent.id,
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
          message: "Demande d'achat non trouv�e"
         });
      }

      // Marquer comme en cours
      const startedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          notes: purchaseNotes || request.notes
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Achat d�marr�",
          message: `L'agent a commenc� l'achat de "${request.metadata?.productName}"`,
          type: "INTERNATIONAL_PURCHASE_STARTED" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: "MEDIUM"
        });
      }

      return startedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du d�marrage de l'achat"
       });
    }
  }

  /**
   * Envoie une mise � jour du processus d'achat
   */
  async sendPurchaseUpdate(
    requestId: string,
    agentId: string,
    updateType: "PRODUCT_FOUND" | "PURCHASE_COMPLETED" | "SHIPPING_STARTED" | "CUSTOMS_PROCESSING" | "OUT_FOR_DELIVERY",
    message: string,
    photos?: string[],
    trackingNumber?: string
  ): Promise<any> {
    try {
      const agent = await db.provider.findFirst({
        where: { userId }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Agent non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: agent.id,
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
          message: "Achat en cours non trouv�"
         });
      }

      // Cr�er une mise � jour
      const update = await db.serviceUpdate.create({
        data: {
          serviceBookingId: requestId,
          providerId: agent.id,
          updateType,
          message,
          photos: photos || [],
          timestamp: new Date(),
          metadata: trackingNumber ? { trackingNumber } : undefined
        }
      });

      // Mettre � jour le tracking number si fourni
      if (trackingNumber) {
        await db.serviceBooking.update({
          where: { id },
          data: {
            metadata: {
              ...request.metadata,
              trackingNumber
            }
          }
        });
      }

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: `Mise � jour - ${request.metadata?.productName}`,
          message: message,
          type: "INTERNATIONAL_PURCHASE_UPDATE" as any,
          actionUrl: `/client/services/bookings/${requestId}`,
          priority: updateType === "OUT_FOR_DELIVERY" ? "HIGH" : "MEDIUM"
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
   * Termine l'achat international
   */
  async completeInternationalPurchase(
    requestId: string, 
    agentId: string, 
    deliveryConfirmation: string,
    finalReceipt?: string
  ): Promise<any> {
    try {
      const agent = await db.provider.findFirst({
        where: { userId }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Agent non trouv�"
         });
      }

      const request = await db.serviceBooking.findFirst({
        where: {
          id: requestId,
          providerId: agent.id,
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
          message: "Achat en cours non trouv�"
         });
      }

      // Marquer comme termin�
      const completedRequest = await db.serviceBooking.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          finalReport: deliveryConfirmation,
          metadata: {
            ...request.metadata,
            finalReceipt
          }
        }
      });

      // Notifier le client
      const notificationService = await import("@/server/services/common/notification.service").then(m => m.notificationService);
      
      if (request.client?.user) {
        await notificationService.sendUserNotification({
          userId: request.client.userId,
          title: "Achat international livr�",
          message: `"${request.metadata?.productName}" a �t� livr� avec succ�s`,
          type: "INTERNATIONAL_PURCHASE_DELIVERED" as any,
          actionUrl: `/client/services/bookings/${requestId}/review`,
          priority: "MEDIUM"
        });
      }

      return completedRequest;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la finalisation de l'achat"
       });
    }
  }

  /**
   * Calcule les frais estim�s
   */
  private calculateEstimatedFees(data: InternationalPurchaseRequest): {
    commission: number;
    shipping: number;
    customs: number;
    total: number;
  } {
    // Commission de l'agent (5-15% selon le montant)
    const commissionRate = data.estimatedPrice > 500 ? 0.05 : data.estimatedPrice > 200 ? 0.08 : 0.12;
    const commission = Math.round(data.estimatedPrice * commissionRate);

    // Frais de port estim�s selon le pays
    const shippingRates = {
      "USA": 25,
      "Canada": 22,
      "UK": 18,
      "Germany": 15,
      "Japan": 35,
      "Australia": 30,
      "China": 20
    };
    
    const baseShipping = shippingRates[data.originCountry as keyof typeof shippingRates] || 25;
    const weightMultiplier = data.estimatedWeight ? Math.max(1, data.estimatedWeight * 0.5) : 1;
    const shipping = Math.round(baseShipping * weightMultiplier);

    // Frais de douane estim�s
    const customsRate = data.requiresCustomsDeclaration ? 0.20 : 0.10; // 20% avec douane, 10% sans
    const customs = Math.round(data.estimatedPrice * customsRate);

    const total = commission + shipping + customs;

    return { commission, shipping, customs, total };
  }

  /**
   * Estime le temps de livraison selon le pays d'origine
   * Utilise des données de transporteurs réels et zones géographiques
   */
  private getEstimatedDeliveryTime(originCountry: string): number {
    // Zones géographiques réelles avec délais moyens
    const geographicalZones = {
      // Europe continentale - courrier express
      "EUROPE_CONTINENTAL": {
        countries: ["Germany", "France", "Spain", "Italy", "Netherlands", "Belgium", "Austria", "Switzerland"],
        baseDeliveryTime: 4,
        expressDeliveryTime: 2
      },
      // Europe élargie
      "EUROPE_EXTENDED": {
        countries: ["UK", "Poland", "Czech Republic", "Hungary", "Portugal", "Sweden", "Denmark"],
        baseDeliveryTime: 6,
        expressDeliveryTime: 3
      },
      // Amérique du Nord
      "NORTH_AMERICA": {
        countries: ["USA", "Canada"],
        baseDeliveryTime: 8,
        expressDeliveryTime: 5
      },
      // Asie développée
      "ASIA_DEVELOPED": {
        countries: ["Japan", "South Korea", "Singapore", "Hong Kong"],
        baseDeliveryTime: 10,
        expressDeliveryTime: 7
      },
      // Asie émergente
      "ASIA_EMERGING": {
        countries: ["China", "India", "Thailand", "Malaysia", "Vietnam"],
        baseDeliveryTime: 14,
        expressDeliveryTime: 10
      },
      // Océanie
      "OCEANIA": {
        countries: ["Australia", "New Zealand"],
        baseDeliveryTime: 16,
        expressDeliveryTime: 12
      },
      // Afrique
      "AFRICA": {
        countries: ["Algeria", "South Africa", "Morocco", "Egypt"],
        baseDeliveryTime: 18,
        expressDeliveryTime: 14
      }
    };

    // Trouver la zone du pays d'origine
    for (const [zoneName, zone] of Object.entries(geographicalZones)) {
      if (zone.countries.includes(originCountry)) {
        // Ajouter facteur de risque douanier selon la zone
        const customsDelay = this.getCustomsProcessingDelay(zoneName);
        const seasonalFactor = this.getSeasonalDeliveryFactor();
        
        // Utiliser le délai de base avec facteurs
        const baseTime = zone.baseDeliveryTime;
        const adjustedTime = Math.round(baseTime * seasonalFactor + customsDelay);
        
        // Ajouter une marge de sécurité de 15%
        return Math.round(adjustedTime * 1.15);
      }
    }

    // Pays non référencé - estimation conservatrice
    return 21; // 3 semaines par défaut
  }

  /**
   * Calcule le délai supplémentaire pour passage en douane
   */
  private getCustomsProcessingDelay(zone: string): number {
    const customsDelays = {
      "EUROPE_CONTINENTAL": 1, // Union européenne - pas de douane
      "EUROPE_EXTENDED": 1.5,  // Royaume-Uni post-Brexit
      "NORTH_AMERICA": 2,      // Douanes américaines/canadiennes
      "ASIA_DEVELOPED": 2.5,   // Douanes asiatiques développées
      "ASIA_EMERGING": 4,      // Douanes plus lentes
      "OCEANIA": 3,            // Douanes strictes Australie/NZ
      "AFRICA": 5              // Douanes variables
    };

    return customsDelays[zone as keyof typeof customsDelays] || 3;
  }

  /**
   * Facteur saisonnier affectant les livraisons
   */
  private getSeasonalDeliveryFactor(): number {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    // Périodes de forte charge pour les transporteurs
    if (month === 12 || month === 1) {
      // Novembre-Décembre : période de Noël
      return 1.4; // +40% de délai
    } else if (month >= 6 && month <= 8) {
      // Juin-Août : période de vacances
      return 1.2; // +20% de délai
    } else if (month === 2) {
      // Février : Nouvel An chinois affecte l'Asie
      return 1.3; // +30% de délai
    }

    return 1.0; // Délai normal
  }

  /**
   * Cr�e une conversation pour l'achat international
   */
  private async createConversationForPurchase(clientId: string, agentId: string, requestId: string): Promise<void> {
    try {
      await db.conversation.create({
        data: {
          participants: [clientId, agentId],
          type: "INTERNATIONAL_PURCHASE",
          relatedBookingId: requestId,
          title: "Achat international",
          isActive: true
        }
      });
    } catch (error) {
      console.error("Erreur lors de la cr�ation de la conversation:", error);
    }
  }

  /**
   * R�cup�re les demandes d'achat pour un client
   */
  async getClientInternationalPurchaseRequests(clientId: string): Promise<any[]> {
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
          type: "INTERNATIONAL_PURCHASE"
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
   * R�cup�re les demandes d'achat pour un agent
   */
  async getAgentInternationalPurchaseRequests(agentId: string, status?: string): Promise<any[]> {
    try {
      const agent = await db.provider.findFirst({
        where: { userId }
      });

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Agent non trouv�"
         });
      }

      const whereClause: any = {
        type: "INTERNATIONAL_PURCHASE"
      };

      if (status === "available") {
        whereClause.status = "PENDING";
        whereClause.providerId = null;
      } else if (status) {
        whereClause.status = status;
        whereClause.providerId = agent.id;
      } else {
        whereClause.providerId = agent.id;
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

export const internationalPurchaseService = new InternationalPurchaseService();