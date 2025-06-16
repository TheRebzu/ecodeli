import { db } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface MatchingScore {
  totalScore: number;
  geographicScore: number;
  temporalScore: number;
  capacityScore: number;
  priceScore: number;
  reputationScore: number;
  preferenceScore: number;
}

export interface DelivererMatch {
  delivererId: string;
  announcementId: string;
  matchingScore: MatchingScore;
  estimatedPrice: number;
  estimatedDuration: number;
  distanceKm: number;
  detourPercentage: number;
  availabilityWindow: {
    start: Date;
    end: Date;
  };
  compatibilityReasons: string[];
  riskFactors: string[];
  recommendationLevel: "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR";
}

export interface MatchingCriteria {
  maxDistance: number;
  maxDetourPercentage: number;
  timeFlexibilityHours: number;
  minDelivererRating: number;
  priceFlexibilityPercentage: number;
  prioritizeExperience: boolean;
  prioritizeSpeed: boolean;
  prioritizePrice: boolean;
}

export class MatchingAlgorithmService {
  /**
   * Algorithme principal de matching entre annonces et livreurs
   */
  async findBestMatches(
    announcementId: string, 
    criteria: Partial<MatchingCriteria> = {},
    maxResults: number = 10
  ): Promise<DelivererMatch[]> {
    try {
      // R�cup�rer l'annonce avec tous les d�tails
      const announcement = await db.announcement.findUnique({
        where: { id },
        include: {
          client: {
            include: { user }
          }
        }
      });

      if (!announcement) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Annonce non trouv�e"
         });
      }

      // D�finir les crit�res par d�faut
      const defaultCriteria: MatchingCriteria = {
        maxDistance: 50,
        maxDetourPercentage: 30,
        timeFlexibilityHours: 24,
        minDelivererRating: 3.0,
        priceFlexibilityPercentage: 20,
        prioritizeExperience: false,
        prioritizeSpeed: false,
        prioritizePrice: false,
        ...criteria
      };

      // Trouver les livreurs potentiels
      const potentialDeliverers = await this.findPotentialDeliverers(announcement, defaultCriteria);

      // �valuer chaque livreur
      const matches: DelivererMatch[] = [];
      for (const deliverer of potentialDeliverers) {
        const match = await this.evaluateDelivererMatch(announcement, deliverer, defaultCriteria);
        if (match && match.matchingScore.totalScore >= 50) { // Seuil minimum de 50%
          matches.push(match);
        }
      }

      // Trier par score et appliquer les priorit�s
      const sortedMatches = this.sortMatchesByPriority(matches, defaultCriteria);

      // Retourner les meilleurs r�sultats
      return sortedMatches.slice(0, maxResults);
    } catch (error) {
      console.error("Erreur lors du matching:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la recherche de correspondances"
       });
    }
  }

  /**
   * Trouve les livreurs potentiels selon des crit�res de base
   */
  private async findPotentialDeliverers(announcement: any, criteria: MatchingCriteria): Promise<any[]> {
    return await db.deliverer.findMany({
      where: {
        isActive: true,
        user: {
          isActive: true,
          verificationStatus: "VERIFIED"
        },
        averageRating: {
          gte: criteria.minDelivererRating
        },
        // Filtrage g�ographique approximatif
        ...(announcement.pickupLatitude && announcement.pickupLongitude ? {
          OR: [
            {
              user: {
                latitude: {
                  gte: announcement.pickupLatitude - (criteria.maxDistance / 111), // ~111km par degr�
                  lte: announcement.pickupLatitude + (criteria.maxDistance / 111)
                },
                longitude: {
                  gte: announcement.pickupLongitude - (criteria.maxDistance / 111),
                  lte: announcement.pickupLongitude + (criteria.maxDistance / 111)
                }
              }
            },
            {
              routes: {
                some: {
                  isActive: true,
                  departureLatitude: {
                    gte: announcement.pickupLatitude - (criteria.maxDistance / 111),
                    lte: announcement.pickupLatitude + (criteria.maxDistance / 111)
                  },
                  departureLongitude: {
                    gte: announcement.pickupLongitude - (criteria.maxDistance / 111),
                    lte: announcement.pickupLongitude + (criteria.maxDistance / 111)
                  }
                }
              }
            }
          ]
        } : {})
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            latitude: true,
            longitude: true,
            address: true
          }
        },
        vehicle: true,
        routes: {
          where: { isActive },
          orderBy: {
            createdAt: 'desc'
          }
        },
        reviews: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        completedDeliveries: {
          where: {
            status: "COMPLETED"
          },
          take: 5,
          orderBy: {
            completedAt: 'desc'
          }
        }
      }
    });
  }

  /**
   * �value la compatibilit� entre une annonce et un livreur
   */
  private async evaluateDelivererMatch(
    announcement: any, 
    deliverer: any, 
    criteria: MatchingCriteria
  ): Promise<DelivererMatch | null> {
    try {
      // 1. �valuation g�ographique
      const geographicEval = await this.evaluateGeographicCompatibility(announcement, deliverer, criteria);
      if (!geographicEval.isCompatible) return null;

      // 2. �valuation temporelle
      const temporalEval = await this.evaluateTemporalCompatibility(announcement, deliverer, criteria);
      if (!temporalEval.isCompatible) return null;

      // 3. �valuation des capacit�s
      const capacityEval = await this.evaluateCapacityCompatibility(announcement, deliverer);
      if (!capacityEval.isCompatible) return null;

      // 4. �valuation du prix
      const priceEval = await this.evaluatePriceCompatibility(announcement, deliverer, criteria);

      // 5. �valuation de la r�putation
      const reputationEval = await this.evaluateReputationScore(deliverer);

      // 6. �valuation des pr�f�rences
      const preferenceEval = await this.evaluatePreferenceScore(announcement, deliverer);

      // Calculer le score global
      const matchingScore: MatchingScore = {
        geographicScore: geographicEval.score,
        temporalScore: temporalEval.score,
        capacityScore: capacityEval.score,
        priceScore: priceEval.score,
        reputationScore: reputationEval.score,
        preferenceScore: preferenceEval.score,
        totalScore: this.calculateTotalScore({ geographicScore: geographicEval.score,
          temporalScore: temporalEval.score,
          capacityScore: capacityEval.score,
          priceScore: priceEval.score,
          reputationScore: reputationEval.score,
          preferenceScore: preferenceEval.score,
          totalScore: 0
         })
      };

      // Compiler les raisons de compatibilit� et les facteurs de risque
      const compatibilityReasons = [
        ...geographicEval.reasons,
        ...temporalEval.reasons,
        ...capacityEval.reasons,
        ...priceEval.reasons,
        ...reputationEval.reasons,
        ...preferenceEval.reasons
      ];

      const riskFactors = [
        ...geographicEval.risks || [],
        ...temporalEval.risks || [],
        ...capacityEval.risks || [],
        ...priceEval.risks || [],
        ...reputationEval.risks || [],
        ...preferenceEval.risks || []
      ];

      // D�terminer le niveau de recommandation
      const recommendationLevel = this.determineRecommendationLevel(matchingScore.totalScore);

      return {
        delivererId: deliverer.id,
        announcementId: announcement.id,
        matchingScore,
        estimatedPrice: priceEval.estimatedPrice,
        estimatedDuration: geographicEval.estimatedDuration,
        distanceKm: geographicEval.distance,
        detourPercentage: geographicEval.detourPercentage,
        availabilityWindow: temporalEval.availabilityWindow,
        compatibilityReasons,
        riskFactors,
        recommendationLevel
      };
    } catch (error) {
      console.error("Erreur lors de l'�valuation du match:", error);
      return null;
    }
  }

  /**
   * �value la compatibilit� g�ographique
   */
  private async evaluateGeographicCompatibility(
    announcement: any, 
    deliverer: any, 
    criteria: MatchingCriteria
  ): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 0;
    const isCompatible = false;
    const distance = 0;
    const detourPercentage = 0;
    const estimatedDuration = 0;

    // V�rifier si le livreur a des routes actives
    if (deliverer.routes && deliverer.routes.length > 0) {
      const bestRouteMatch = null;
      const bestScore = 0;

      for (const route of deliverer.routes) {
        const routeEval = this.evaluateRouteCompatibility(announcement, route, criteria);
        if (routeEval.score > bestScore) {
          bestScore = routeEval.score;
          bestRouteMatch = routeEval;
        }
      }

      if (bestRouteMatch) {
        score = bestScore;
        distance = bestRouteMatch.distance;
        detourPercentage = bestRouteMatch.detourPercentage;
        estimatedDuration = bestRouteMatch.estimatedDuration;
        isCompatible = score >= 30; // Score minimum pour la g�ographie
        
        if (isCompatible) {
          reasons.push("ROUTE_COMPATIBLE");
          if (detourPercentage <= 10) reasons.push("MINIMAL_DETOUR");
          if (distance <= 20) reasons.push("SHORT_DISTANCE");
        } else {
          risks.push("SIGNIFICANT_DETOUR");
        }
      }
    } else {
      // �valuer la proximit� avec l'adresse du livreur
      if (deliverer.user?.latitude && deliverer.user?.longitude) {
        distance = this.calculateDistance(
          announcement.pickupLatitude,
          announcement.pickupLongitude,
          deliverer.user.latitude,
          deliverer.user.longitude
        );

        if (distance <= criteria.maxDistance) {
          isCompatible = true;
          score = Math.max(0, 50 - (distance / criteria.maxDistance) * 50);
          estimatedDuration = this.estimateDeliveryTime(distance);
          reasons.push("PROXIMITY_COMPATIBLE");
          
          if (distance <= 10) reasons.push("VERY_CLOSE");
        } else {
          risks.push("DISTANCE_TOO_FAR");
        }
      }
    }

    return {
      isCompatible,
      score,
      distance,
      detourPercentage,
      estimatedDuration,
      reasons,
      risks
    };
  }

  /**
   * �value la compatibilit� d'une route sp�cifique
   */
  private evaluateRouteCompatibility(announcement: any, route: any, criteria: MatchingCriteria): any {
    // Calculer la distance originale de la route
    const originalDistance = this.calculateDistance(
      route.departureLatitude,
      route.departureLongitude,
      route.arrivalLatitude,
      route.arrivalLongitude
    );

    // Calculer la distance avec d�tour pour inclure pickup et delivery
    const detourDistance = 
      this.calculateDistance(route.departureLatitude, route.departureLongitude, announcement.pickupLatitude, announcement.pickupLongitude) +
      this.calculateDistance(announcement.pickupLatitude, announcement.pickupLongitude, announcement.deliveryLatitude, announcement.deliveryLongitude) +
      this.calculateDistance(announcement.deliveryLatitude, announcement.deliveryLongitude, route.arrivalLatitude, route.arrivalLongitude);

    const detourPercentage = ((detourDistance - originalDistance) / originalDistance) * 100;

    if (detourPercentage > criteria.maxDetourPercentage) {
      return { score: 0, distance: detourDistance, detourPercentage, estimatedDuration: 0 };
    }

    // Score bas� sur le d�tour (moins de d�tour = meilleur score)
    const score = Math.max(0, 50 - (detourPercentage / criteria.maxDetourPercentage) * 50);
    const estimatedDuration = this.estimateDeliveryTime(detourDistance);

    return {
      score,
      distance: this.calculateDistance(announcement.pickupLatitude, announcement.pickupLongitude, announcement.deliveryLatitude, announcement.deliveryLongitude),
      detourPercentage,
      estimatedDuration
    };
  }

  /**
   * �value la compatibilit� temporelle
   */
  private async evaluateTemporalCompatibility(
    announcement: any, 
    deliverer: any, 
    criteria: MatchingCriteria
  ): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 50; // Score de base
    const isCompatible = true;
    const availabilityWindow = {
      start: new Date(),
      end: new Date(Date.now() + criteria.timeFlexibilityHours * 60 * 60 * 1000)
    };

    // V�rifier la disponibilit� selon la date de pickup souhait�e
    if (announcement.pickupDate) {
      const pickupDate = new Date(announcement.pickupDate);
      const now = new Date();
      const timeDiff = pickupDate.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      if (hoursDiff < 0) {
        // Date pass�e
        isCompatible = false;
        risks.push("PICKUP_DATE_PAST");
      } else if (hoursDiff <= criteria.timeFlexibilityHours) {
        // Dans la fen�tre de flexibilit�
        score += 20;
        reasons.push("TIMING_FLEXIBLE");
        availabilityWindow.start = pickupDate;
        availabilityWindow.end = new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000);
      } else if (hoursDiff <= criteria.timeFlexibilityHours * 2) {
        // Un peu au-del� mais acceptable
        score += 10;
        reasons.push("TIMING_ACCEPTABLE");
      } else {
        // Trop loin dans le futur
        score -= 10;
        risks.push("PICKUP_DATE_FAR");
      }
    } else {
      // Date flexible
      score += 15;
      reasons.push("FLEXIBLE_TIMING");
    }

    // V�rifier l'urgence
    if (announcement.priority === "URGENT") {
      score += 10;
      reasons.push("URGENT_PRIORITY");
      availabilityWindow.end = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h max pour urgent
    } else if (announcement.priority === "HIGH") {
      score += 5;
      reasons.push("HIGH_PRIORITY");
      availabilityWindow.end = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h max pour high
    }

    return {
      isCompatible,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      risks,
      availabilityWindow
    };
  }

  /**
   * �value la compatibilit� des capacit�s
   */
  private async evaluateCapacityCompatibility(announcement: any, deliverer: any): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 50; // Score de base
    const isCompatible = true;

    // V�rifier le poids
    if (announcement.weight && deliverer.vehicle?.maxWeight) {
      if (announcement.weight > deliverer.vehicle.maxWeight) {
        isCompatible = false;
        risks.push("WEIGHT_EXCEEDED");
        score = 0;
      } else {
        const weightRatio = announcement.weight / deliverer.vehicle.maxWeight;
        if (weightRatio <= 0.5) {
          score += 20;
          reasons.push("WEIGHT_COMFORTABLE");
        } else if (weightRatio <= 0.8) {
          score += 10;
          reasons.push("WEIGHT_ACCEPTABLE");
        } else {
          reasons.push("WEIGHT_LIMIT_CLOSE");
        }
      }
    }

    // V�rifier les dimensions
    if (announcement.length && announcement.width && announcement.height && deliverer.vehicle) {
      const volume = (announcement.length * announcement.width * announcement.height) / 1000000; // m�
      if (deliverer.vehicle.maxVolume && volume > deliverer.vehicle.maxVolume) {
        isCompatible = false;
        risks.push("VOLUME_EXCEEDED");
        score = 0;
      } else {
        score += 15;
        reasons.push("VOLUME_COMPATIBLE");
      }
    }

    // V�rifier les exigences sp�ciales
    if (announcement.isFragile) {
      if (deliverer.vehicle?.hasCarefulHandling) {
        score += 10;
        reasons.push("FRAGILE_HANDLING_AVAILABLE");
      } else {
        score -= 15;
        risks.push("NO_FRAGILE_HANDLING");
      }
    }

    if (announcement.needsCooling) {
      if (deliverer.vehicle?.hasRefrigeration) {
        score += 15;
        reasons.push("REFRIGERATION_AVAILABLE");
      } else {
        isCompatible = false;
        risks.push("NO_REFRIGERATION");
        score = 0;
      }
    }

    return {
      isCompatible,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      risks
    };
  }

  /**
   * �value la compatibilit� du prix
   */
  private async evaluatePriceCompatibility(announcement: any, deliverer: any, criteria: MatchingCriteria): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 50;
    const estimatedPrice = 0;

    // Calculer le prix estim� bas� sur le profil du livreur
    const basePrice = this.calculateBasePrice(announcement, deliverer);
    estimatedPrice = basePrice;

    // Comparer avec le budget sugg�r�
    if (announcement.suggestedPrice) {
      const priceDiff = Math.abs(estimatedPrice - announcement.suggestedPrice);
      const priceFlexibility = announcement.suggestedPrice * (criteria.priceFlexibilityPercentage / 100);

      if (priceDiff <= priceFlexibility) {
        if (estimatedPrice <= announcement.suggestedPrice) {
          score += 25;
          reasons.push("PRICE_UNDER_BUDGET");
        } else {
          score += 15;
          reasons.push("PRICE_WITHIN_FLEXIBILITY");
        }
      } else if (estimatedPrice > announcement.suggestedPrice) {
        score -= 20;
        risks.push("PRICE_OVER_BUDGET");
      }
    }

    // V�rifier si le prix est n�gociable
    if (announcement.isNegotiable || deliverer.acceptsNegotiation) {
      score += 10;
      reasons.push("PRICE_NEGOTIABLE");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      estimatedPrice,
      reasons,
      risks
    };
  }

  /**
   * �value le score de r�putation
   */
  private async evaluateReputationScore(deliverer: any): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 0;

    // Score bas� sur la note moyenne
    if (deliverer.averageRating) {
      score = (deliverer.averageRating / 5) * 40; // Max 40 points pour la note
      
      if (deliverer.averageRating >= 4.5) {
        reasons.push("EXCELLENT_RATING");
      } else if (deliverer.averageRating >= 4.0) {
        reasons.push("GOOD_RATING");
      } else if (deliverer.averageRating >= 3.5) {
        reasons.push("AVERAGE_RATING");
      } else {
        risks.push("LOW_RATING");
      }
    }

    // Score bas� sur l'exp�rience (nombre de livraisons)
    const completedCount = deliverer.completedDeliveries?.length || 0;
    if (completedCount >= 100) {
      score += 30;
      reasons.push("VERY_EXPERIENCED");
    } else if (completedCount >= 50) {
      score += 20;
      reasons.push("EXPERIENCED");
    } else if (completedCount >= 20) {
      score += 10;
      reasons.push("MODERATE_EXPERIENCE");
    } else if (completedCount >= 5) {
      score += 5;
      reasons.push("SOME_EXPERIENCE");
    } else {
      risks.push("LIMITED_EXPERIENCE");
    }

    // Score bas� sur les avis r�cents
    if (deliverer.reviews && deliverer.reviews.length > 0) {
      const recentReviews = deliverer.reviews.slice(0, 5);
      const avgRecentRating = recentReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / recentReviews.length;
      
      if (avgRecentRating >= 4.5) {
        score += 15;
        reasons.push("EXCELLENT_RECENT_REVIEWS");
      } else if (avgRecentRating >= 4.0) {
        score += 10;
        reasons.push("GOOD_RECENT_REVIEWS");
      }
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      reasons,
      risks
    };
  }

  /**
   * �value le score de pr�f�rences
   */
  private async evaluatePreferenceScore(announcement: any, deliverer: any): Promise<any> {
    const reasons = [];
    const risks = [];
    const score = 50; // Score neutre

    // Pr�f�rences du client bas�es sur l'historique
    const clientPreferences = await this.getClientPreferences(announcement.clientId);
    
    if (clientPreferences.preferredDeliverers?.includes(deliverer.id)) {
      score += 20;
      reasons.push("PREFERRED_DELIVERER");
    }

    if (clientPreferences.blacklistedDeliverers?.includes(deliverer.id)) {
      score = 0;
      risks.push("BLACKLISTED_DELIVERER");
    }

    // Pr�f�rences du livreur
    const delivererPreferences = await this.getDelivererPreferences(deliverer.id);
    
    if (delivererPreferences.preferredClients?.includes(announcement.clientId)) {
      score += 15;
      reasons.push("PREFERRED_CLIENT");
    }

    // Type de livraison pr�f�r�
    if (delivererPreferences.preferredDeliveryTypes?.includes(announcement.type)) {
      score += 10;
      reasons.push("PREFERRED_DELIVERY_TYPE");
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      reasons,
      risks
    };
  }

  /**
   * Calcule le score total pond�r�
   */
  private calculateTotalScore(scores: Omit<MatchingScore, 'totalScore'>): number {
    const weights = {
      geographic: 0.25,    // 25% - Tr�s important
      temporal: 0.20,      // 20% - Important
      capacity: 0.20,      // 20% - Important
      price: 0.15,         // 15% - Mod�r�ment important
      reputation: 0.15,    // 15% - Mod�r�ment important
      preference: 0.05     // 5% - Bonus
    };

    return Math.round(
      scores.geographicScore * weights.geographic +
      scores.temporalScore * weights.temporal +
      scores.capacityScore * weights.capacity +
      scores.priceScore * weights.price +
      scores.reputationScore * weights.reputation +
      scores.preferenceScore * weights.preference
    );
  }

  /**
   * Trie les matches selon les priorit�s
   */
  private sortMatchesByPriority(matches: DelivererMatch[], criteria: MatchingCriteria): DelivererMatch[] {
    return matches.sort((a, b) => {
      // Priorit� 1: Score total
      if (criteria.prioritizeExperience) {
        const aReputation = a.matchingScore.reputationScore;
        const bReputation = b.matchingScore.reputationScore;
        if (aReputation !== bReputation) return bReputation - aReputation;
      }

      if (criteria.prioritizeSpeed) {
        if (a.estimatedDuration !== b.estimatedDuration) {
          return a.estimatedDuration - b.estimatedDuration;
        }
      }

      if (criteria.prioritizePrice) {
        if (a.estimatedPrice !== b.estimatedPrice) {
          return a.estimatedPrice - b.estimatedPrice;
        }
      }

      // Score total par d�faut
      return b.matchingScore.totalScore - a.matchingScore.totalScore;
    });
  }

  /**
   * D�termine le niveau de recommandation
   */
  private determineRecommendationLevel(score: number): "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR" {
    if (score >= 85) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "ACCEPTABLE";
    return "POOR";
  }

  // M�thodes utilitaires
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

  private estimateDeliveryTime(distanceKm: number): number {
    // Vitesse moyenne selon la distance (en minutes)
    const avgSpeed = distanceKm < 10 ? 25 : distanceKm < 50 ? 45 : 70; // km/h
    return Math.round((distanceKm / avgSpeed) * 60);
  }

  private calculateBasePrice(announcement: any, deliverer: any): number {
    // Prix de base selon la distance
    const distance = this.calculateDistance(
      announcement.pickupLatitude,
      announcement.pickupLongitude,
      announcement.deliveryLatitude,
      announcement.deliveryLongitude
    );

    const basePrice = distance * 1.2; // 1.20�/km de base

    // Ajustements
    if (announcement.weight > 10) basePrice *= 1.2;
    if (announcement.isFragile) basePrice *= 1.15;
    if (announcement.needsCooling) basePrice *= 1.25;
    if (announcement.priority === "URGENT") basePrice *= 1.5;
    if (announcement.priority === "HIGH") basePrice *= 1.2;

    // Ajustement selon l'exp�rience du livreur
    const experienceMultiplier = (deliverer.averageRating || 3) / 5;
    basePrice *= (0.8 + 0.4 * experienceMultiplier);

    return Math.round(basePrice * 100) / 100;
  }

  private async getClientPreferences(clientId: string): Promise<any> {
    // Simuler les pr�f�rences client - � impl�menter avec la vraie logique
    return {
      preferredDeliverers: [],
      blacklistedDeliverers: [],
      preferredVehicleTypes: []
    };
  }

  private async getDelivererPreferences(delivererId: string): Promise<any> {
    // Simuler les pr�f�rences livreur - � impl�menter avec la vraie logique
    return {
      preferredClients: [],
      preferredDeliveryTypes: ["PACKAGE_DELIVERY", "DOCUMENT_DELIVERY"],
      blacklistedAreas: []
    };
  }
}

export const matchingAlgorithmService = new MatchingAlgorithmService();