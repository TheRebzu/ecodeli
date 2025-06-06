import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { addDays, parseISO, format } from 'date-fns';

/**
 * Service de planification de trajets EcoDeli
 * Fonctionnalité unique: les livreurs déclarent leurs trajets à l'avance
 * et reçoivent automatiquement des propositions d'annonces compatibles
 */
export const routePlanningService = {
  /**
   * Crée un nouveau trajet planifié avec matching automatique
   */
  async createPlannedRoute(delivererId: string, routeData: {
    name: string;
    description?: string;
    startAddress: string;
    endAddress: string;
    waypoints?: Array<{ lat: number; lng: number; name: string }>;
    departureTime: Date;
    arrivalTime: Date;
    isRecurring: boolean;
    recurringDays?: string[];
    availableWeight: number;
    availableVolume: number;
  }) {
    // Vérifier que l'utilisateur est un livreur vérifié
    const user = await db.user.findUnique({
      where: { id: delivererId },
      include: { deliverer: true }
    });
    
    if (!user || user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accès réservé aux livreurs'
      });
    }
    
    if (!user.isVerified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Livreur non vérifié'
      });
    }
    
    // Géocoder les adresses (simulation - en production utiliser Google Maps API)
    const startCoords = await this.geocodeAddress(routeData.startAddress);
    const endCoords = await this.geocodeAddress(routeData.endAddress);
    
    return await db.$transaction(async (tx) => {
      // Créer le trajet planifié (stockage temporaire en JSON)
      const routeRecord = await tx.user.update({
        where: { id: delivererId },
        data: {
          // Stocker les trajets dans les notes en attendant le nouveau schéma
          notes: JSON.stringify({
            plannedRoutes: [
              ...(user.notes ? JSON.parse(user.notes).plannedRoutes || [] : []),
              {
                id: `route_${Date.now()}`,
                name: routeData.name,
                description: routeData.description,
                startAddress: routeData.startAddress,
                startCoords,
                endAddress: routeData.endAddress,
                endCoords,
                waypoints: routeData.waypoints || [],
                departureTime: routeData.departureTime.toISOString(),
                arrivalTime: routeData.arrivalTime.toISOString(),
                isRecurring: routeData.isRecurring,
                recurringDays: routeData.recurringDays || [],
                availableWeight: routeData.availableWeight,
                availableVolume: routeData.availableVolume,
                createdAt: new Date().toISOString(),
                isActive: true,
                totalMatches: 0,
                acceptedMatches: 0
              }
            ]
          })
        }
      });
      
      // Lancer la recherche d'annonces compatibles
      const newRouteId = `route_${Date.now()}`;
      const matches = await this.findMatchingAnnouncements(delivererId, newRouteId, {
        startCoords,
        endCoords,
        departureTime: routeData.departureTime,
        arrivalTime: routeData.arrivalTime,
        availableWeight: routeData.availableWeight,
        availableVolume: routeData.availableVolume
      });
      
      return {
        routeId: newRouteId,
        route: routeData,
        matches: matches.length,
        coordinates: { start: startCoords, end: endCoords }
      };
    });
  },

  /**
   * Trouve les annonces compatibles avec un trajet donné
   */
  async findMatchingAnnouncements(delivererId: string, routeId: string, routeData: {
    startCoords: { lat: number; lng: number };
    endCoords: { lat: number; lng: number };
    departureTime: Date;
    arrivalTime: Date;
    availableWeight: number;
    availableVolume: number;
  }) {
    // Rechercher des annonces dans la plage horaire du trajet
    const announcements = await db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        delivererId: null, // Pas encore assignée
        pickupDate: {
          gte: routeData.departureTime,
          lte: routeData.arrivalTime
        }
      },
      include: { 
        client: {
          select: { name: true, image: true }
        }
      }
    });
    
    const matches = [];
    
    for (const announcement of announcements) {
      if (!announcement.pickupLatitude || !announcement.pickupLongitude || 
          !announcement.deliveryLatitude || !announcement.deliveryLongitude) {
        continue; // Skip annonces sans coordonnées
      }
      
      // Calculer la distance du pickup par rapport au trajet
      const pickupDistance = this.calculateDistanceToRoute(
        routeData.startCoords,
        routeData.endCoords,
        { lat: announcement.pickupLatitude, lng: announcement.pickupLongitude }
      );
      
      // Calculer la distance de delivery par rapport au trajet
      const deliveryDistance = this.calculateDistanceToRoute(
        routeData.startCoords,
        routeData.endCoords,
        { lat: announcement.deliveryLatitude, lng: announcement.deliveryLongitude }
      );
      
      // Critères de compatibilité EcoDeli
      const maxDetour = 8; // 8km de détour max (configurable)
      const isPickupCompatible = pickupDistance <= maxDetour;
      const isDeliveryCompatible = deliveryDistance <= maxDetour;
      
      if (isPickupCompatible && isDeliveryCompatible) {
        const matchScore = this.calculateMatchScore(
          routeData, 
          announcement, 
          pickupDistance, 
          deliveryDistance
        );
        
        const estimatedProfit = this.calculateEstimatedProfit(
          announcement, 
          pickupDistance + deliveryDistance
        );
        
        // Enregistrer le match dans les notifications
        const match = {
          id: `match_${Date.now()}_${announcement.id}`,
          routeId,
          announcementId: announcement.id,
          announcement,
          matchScore,
          estimatedProfit,
          pickupDistance,
          deliveryDistance,
          totalDetour: pickupDistance + deliveryDistance,
          fuelCost: (pickupDistance + deliveryDistance) * 0.08, // 8c/km
          platformFee: (announcement.suggestedPrice || 0) * 0.15, // 15%
          createdAt: new Date().toISOString(),
          expiresAt: addDays(new Date(), 2).toISOString(), // Expire dans 2 jours
          isAccepted: false,
          isRejected: false
        };
        
        matches.push(match);
        
        // Créer une notification pour le livreur
        await db.notification.create({
          data: {
            userId: delivererId,
            title: 'Nouvelle correspondance trouvée !',
            message: `Une livraison compatible avec votre trajet "${routeId}" : ${announcement.title}`,
            type: 'ROUTE_MATCH',
            data: JSON.stringify({
              matchId: match.id,
              routeId,
              announcementId: announcement.id,
              estimatedProfit,
              matchScore
            }),
            read: false
          }
        });
      }
    }
    
    // Stocker les matches dans les notes utilisateur
    await this.storeRouteMatches(delivererId, routeId, matches);
    
    return matches;
  },

  /**
   * Calcule la distance d'un point par rapport à une ligne (trajet)
   */
  calculateDistanceToRoute(
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    point: { lat: number; lng: number }
  ): number {
    // Algorithme simplifié : distance du point à la ligne droite start-end
    const A = point.lat - start.lat;
    const B = point.lng - start.lng;
    const C = end.lat - start.lat;
    const D = end.lng - start.lng;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // start et end sont identiques
      return this.calculateDistance(start.lat, start.lng, point.lat, point.lng);
    }
    
    const param = dot / lenSq;
    let xx, yy;
    
    if (param < 0) {
      xx = start.lat;
      yy = start.lng;
    } else if (param > 1) {
      xx = end.lat;
      yy = end.lng;
    } else {
      xx = start.lat + param * C;
      yy = start.lng + param * D;
    }
    
    return this.calculateDistance(point.lat, point.lng, xx, yy);
  },

  /**
   * Calcule le score de compatibilité entre un trajet et une annonce (0-100)
   */
  calculateMatchScore(
    route: any, 
    announcement: any, 
    pickupDistance: number, 
    deliveryDistance: number
  ): number {
    let score = 100;
    
    // Pénalité pour la distance de détour (plus c'est loin, moins c'est bien)
    const totalDetour = pickupDistance + deliveryDistance;
    const distancePenalty = Math.min(25, totalDetour * 3); // Max -25 points
    score -= distancePenalty;
    
    // Bonus pour la compatibilité horaire
    const timeDiff = Math.abs(
      announcement.pickupDate.getTime() - route.departureTime.getTime()
    );
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff <= 1) score += 15;      // Très bon timing
    else if (hoursDiff <= 2) score += 10; // Bon timing
    else if (hoursDiff <= 4) score += 5;  // Timing acceptable
    
    // Bonus pour le prix attractif
    const price = announcement.suggestedPrice || 0;
    if (price >= 20) score += 15;      // Prix élevé
    else if (price >= 15) score += 10; // Prix correct
    else if (price >= 10) score += 5;  // Prix minimum
    
    // Bonus pour la compatibilité géographique (même ville)
    if (announcement.pickupCity === announcement.deliveryCity) {
      score += 5; // Livraison dans la même ville
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Calcule le profit estimé pour une livraison
   */
  calculateEstimatedProfit(announcement: any, totalDistance: number): number {
    const basePrice = announcement.suggestedPrice || 0;
    const fuelCost = totalDistance * 0.08; // 8 centimes par km
    const timeCost = 1.5 * 12; // 1.5h estimée à 12€/h
    const platformFee = basePrice * 0.15; // 15% commission EcoDeli
    const vehicleCost = totalDistance * 0.05; // Usure véhicule
    
    const totalCosts = fuelCost + timeCost + platformFee + vehicleCost;
    const profit = basePrice - totalCosts;
    
    return Math.max(0, Math.round(profit * 100) / 100);
  },

  /**
   * Géocode une adresse (simulation - utiliser Google Maps API en production)
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
    // Simulation basée sur quelques villes françaises
    const cityCoords = {
      'paris': { lat: 48.8566, lng: 2.3522 },
      'lyon': { lat: 45.7640, lng: 4.8357 },
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'toulouse': { lat: 43.6047, lng: 1.4442 },
      'nice': { lat: 43.7102, lng: 7.2620 }
    };
    
    const lowerAddress = address.toLowerCase();
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (lowerAddress.includes(city)) {
        return {
          lat: coords.lat + (Math.random() - 0.5) * 0.1, // Variation aléatoire
          lng: coords.lng + (Math.random() - 0.5) * 0.1
        };
      }
    }
    
    // Coordonnées par défaut (Paris) avec variation aléatoire
    return {
      lat: 48.8566 + (Math.random() - 0.5) * 0.2,
      lng: 2.3522 + (Math.random() - 0.5) * 0.2
    };
  },

  /**
   * Calcule la distance entre deux points (formule haversine)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arrondir à 2 décimales
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  /**
   * Stocke les correspondances trouvées pour un trajet
   */
  async storeRouteMatches(delivererId: string, routeId: string, matches: any[]) {
    const user = await db.user.findUnique({
      where: { id: delivererId },
      select: { notes: true }
    });
    
    const currentData = user?.notes ? JSON.parse(user.notes) : {};
    const routeMatches = currentData.routeMatches || {};
    
    routeMatches[routeId] = matches;
    
    await db.user.update({
      where: { id: delivererId },
      data: {
        notes: JSON.stringify({
          ...currentData,
          routeMatches
        })
      }
    });
  },

  /**
   * Récupère les correspondances pour un trajet
   */
  async getRouteMatches(delivererId: string, routeId: string) {
    const user = await db.user.findUnique({
      where: { id: delivererId },
      select: { notes: true }
    });
    
    if (!user?.notes) return [];
    
    const data = JSON.parse(user.notes);
    return data.routeMatches?.[routeId] || [];
  },

  /**
   * Accepte une correspondance trajet/annonce
   */
  async acceptRouteMatch(delivererId: string, matchId: string) {
    const user = await db.user.findUnique({
      where: { id: delivererId },
      select: { notes: true }
    });
    
    if (!user?.notes) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Correspondance non trouvée'
      });
    }
    
    const data = JSON.parse(user.notes);
    const routeMatches = data.routeMatches || {};
    
    // Trouver et mettre à jour la correspondance
    let matchFound = false;
    for (const routeId in routeMatches) {
      const matches = routeMatches[routeId];
      const matchIndex = matches.findIndex((m: any) => m.id === matchId);
      
      if (matchIndex !== -1) {
        matches[matchIndex].isAccepted = true;
        matches[matchIndex].acceptedAt = new Date().toISOString();
        matchFound = true;
        
        // Créer une candidature automatique
        await db.deliveryApplication.create({
          data: {
            delivererId,
            announcementId: matches[matchIndex].announcementId,
            message: `Candidature automatique via trajet planifié. Profit estimé: ${matches[matchIndex].estimatedProfit}€`,
            proposedPrice: matches[matchIndex].announcement.suggestedPrice,
            status: 'PENDING'
          }
        });
        
        break;
      }
    }
    
    if (!matchFound) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Correspondance non trouvée'
      });
    }
    
    // Sauvegarder les changements
    await db.user.update({
      where: { id: delivererId },
      data: {
        notes: JSON.stringify({
          ...data,
          routeMatches
        })
      }
    });
    
    return { success: true, matchId };
  }
};