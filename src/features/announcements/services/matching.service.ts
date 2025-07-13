import { prisma } from "@/lib/db";
import { AnnouncementType } from "../schemas/announcement.schema";
import { NotificationService } from "@/features/notifications/services/notification.service";

interface MatchingResult {
  routeId: string;
  announcementId: string;
  score: number;
  deliverer: any;
}

class MatchingService {
  /**
   * Lance le matching automatique pour une annonce donnée
   * FONCTIONNALITÉ CRITIQUE selon le cahier des charges
   */
  async triggerRouteMatching(
    announcementId: string,
  ): Promise<MatchingResult[]> {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          matches: true,
        },
      });

      if (!announcement || announcement.status !== "ACTIVE") {
        return [];
      }

      // Rechercher les trajets compatibles dans la fenêtre temporelle
      const timeWindow = 24 * 60 * 60 * 1000; // 24 heures
      const pickupDate = announcement.pickupDate || announcement.deliveryDate;
      if (!pickupDate) return [];

      const compatibleRoutes = await prisma.delivererRoute.findMany({
        where: {
          isActive: true,
          startDate: {
            lte: new Date(pickupDate.getTime() + timeWindow),
          },
          endDate: {
            gte: new Date(pickupDate.getTime() - timeWindow),
          },
        },
        include: {
          deliverer: {
            include: {
              profile: {
                select: { firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
      });

      const newMatches: MatchingResult[] = [];

      for (const route of compatibleRoutes) {
        // Vérifier si le match existe déjà
        const existingMatch = announcement.matches.find(
          (m) => m.routeId === route.id,
        );
        if (existingMatch) continue;

        const scores = this.calculateDetailedMatchScore(announcement, route);

        if (scores.globalScore >= 0.6) {
          // Seuil minimum de 60%
          const matchResult: MatchingResult = {
            routeId: route.id,
            announcementId: announcementId,
            score: scores.globalScore * 100,
            deliverer: route.deliverer,
          };

          newMatches.push(matchResult);

          // Créer le match en base avec scores détaillés
          await prisma.routeMatch.create({
            data: {
              routeId: route.id,
              announcementId: announcementId,
              delivererId: route.delivererId,
              distanceScore: scores.distanceScore,
              timeScore: scores.timeScore,
              capacityScore: scores.capacityScore,
              typeScore: scores.typeScore,
              globalScore: scores.globalScore,
              pickupDetour: scores.pickupDetour,
              deliveryDetour: scores.deliveryDetour,
              estimatedDuration: scores.estimatedDuration,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h pour répondre
            },
          });

          // Envoyer notification OneSignal au livreur
          await this.sendMatchNotification(
            route.deliverer,
            announcement,
            scores.globalScore * 100,
          );
        }
      }

      return newMatches;
    } catch (error) {
      console.error("Error in route matching:", error);
      throw new Error("Erreur lors du matching automatique");
    }
  }

  /**
   * Calcule le score de matching détaillé entre une annonce et un trajet
   */
  private calculateDetailedMatchScore(
    announcement: any,
    route: any,
  ): {
    distanceScore: number;
    timeScore: number;
    capacityScore: number;
    typeScore: number;
    globalScore: number;
    pickupDetour: number;
    deliveryDetour: number;
    estimatedDuration: number;
  } {
    // 1. Distance géographique (40% du score)
    const distanceScore = this.calculateDistanceScore(announcement, route);

    // 2. Compatibilité temporelle (30% du score)
    const timeScore = this.calculateTimeScore(announcement, route);

    // 3. Compatibilité du type de service (20% du score)
    const typeScore = this.calculateServiceCompatibilityScore(
      announcement,
      route,
    );

    // 4. Capacité disponible (10% du score)
    const capacityScore = this.calculateCapacityScore(announcement, route);

    // Calcul des détours
    const pickupDetour = this.calculateDetour(announcement, route, "pickup");
    const deliveryDetour = this.calculateDetour(
      announcement,
      route,
      "delivery",
    );

    // Estimation de la durée ajoutée
    const estimatedDuration = Math.round((pickupDetour + deliveryDetour) * 3); // 3 min par km

    // Score global pondéré
    const globalScore =
      distanceScore * 0.4 +
      timeScore * 0.3 +
      typeScore * 0.2 +
      capacityScore * 0.1;

    return {
      distanceScore: distanceScore / 100,
      timeScore: timeScore / 100,
      capacityScore: capacityScore / 100,
      typeScore: typeScore / 100,
      globalScore: globalScore / 100,
      pickupDetour,
      deliveryDetour,
      estimatedDuration,
    };
  }

  /**
   * Calcule le détour nécessaire pour un point donné
   */
  private calculateDetour(
    announcement: any,
    route: any,
    point: "pickup" | "delivery",
  ): number {
    const announcementLat =
      point === "pickup"
        ? announcement.pickupLatitude
        : announcement.deliveryLatitude;
    const announcementLng =
      point === "pickup"
        ? announcement.pickupLongitude
        : announcement.deliveryLongitude;

    if (!announcementLat || !announcementLng) return 0;

    // Distance entre le point de l'annonce et le début du trajet
    const distanceFromStart = this.calculateDistance(
      { lat: announcementLat, lng: announcementLng },
      { lat: route.startLatitude, lng: route.startLongitude },
    );

    // Distance entre le point de l'annonce et la fin du trajet
    const distanceFromEnd = this.calculateDistance(
      { lat: announcementLat, lng: announcementLng },
      { lat: route.endLatitude, lng: route.endLongitude },
    );

    // Le détour est la distance minimale par rapport au trajet direct
    return Math.min(distanceFromStart, distanceFromEnd);
  }

  /**
   * Score basé sur la distance géographique
   */
  private calculateDistanceScore(announcement: any, route: any): number {
    const pickupDistance = this.calculateDistance(
      { lat: announcement.pickupLatitude, lng: announcement.pickupLongitude },
      { lat: route.startLatitude, lng: route.startLongitude },
    );
    const deliveryDistance = this.calculateDistance(
      {
        lat: announcement.deliveryLatitude,
        lng: announcement.deliveryLongitude,
      },
      { lat: route.endLatitude, lng: route.endLongitude },
    );

    const avgDistance = (pickupDistance + deliveryDistance) / 2;

    if (avgDistance <= 5) return 100; // Distance parfaite
    if (avgDistance <= 10) return 80; // Très proche
    if (avgDistance <= 20) return 60; // Proche
    if (avgDistance <= 50) return 40; // Acceptable
    if (avgDistance <= 100) return 20; // Loin
    return 0; // Trop loin
  }

  /**
   * Score basé sur la compatibilité temporelle
   */
  private calculateTimeScore(announcement: any, route: any): number {
    const announcementDate =
      announcement.pickupDate || announcement.deliveryDate;
    if (!announcementDate) return 0;

    const timeDiff = Math.abs(
      announcementDate.getTime() - route.startDate.getTime(),
    );
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff <= 1) return 100; // Parfait timing
    if (hoursDiff <= 3) return 80; // Très bon timing
    if (hoursDiff <= 6) return 60; // Bon timing
    if (hoursDiff <= 12) return 40; // Acceptable
    if (hoursDiff <= 24) return 20; // Passable
    return 0; // Trop décalé
  }

  /**
   * Score basé sur la compatibilité du type de service
   */
  private calculateServiceCompatibilityScore(
    announcement: any,
    route: any,
  ): number {
    const compatibility = this.isServiceTypeCompatible(
      announcement.type as AnnouncementType,
      route.vehicleType || "CAR",
    );

    return compatibility ? 100 : 0;
  }

  /**
   * Score basé sur la capacité disponible
   */
  private calculateCapacityScore(announcement: any, route: any): number {
    const requiredWeight =
      announcement.weight || this.getRequiredCapacity(announcement);
    const requiredVolume = announcement.volume || 1;
    const maxWeight = route.maxWeight || 100;
    const maxVolume = route.maxVolume || 100;

    // Vérifier à la fois le poids et le volume
    const weightScore = maxWeight >= requiredWeight ? 100 : 0;
    const volumeScore = maxVolume >= requiredVolume ? 100 : 0;

    // Retourner le score minimum (capacité limitante)
    return Math.min(weightScore, volumeScore);
  }

  /**
   * Calcule la distance entre deux points géographiques
   */
  private calculateDistance(point1: any, point2: any): number {
    if (!point1?.lat || !point1?.lng || !point2?.lat || !point2?.lng) {
      return 999; // Distance inconnue = très élevée
    }

    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);
    const lat1 = this.toRad(point1.lat);
    const lat2 = this.toRad(point2.lat);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  /**
   * Vérifie la compatibilité entre type d'annonce et véhicule
   */
  private isServiceTypeCompatible(
    announcementType: AnnouncementType,
    vehicleType: string,
  ): boolean {
    const compatibility: Record<AnnouncementType, string[]> = {
      PACKAGE_DELIVERY: ["CAR", "VAN", "TRUCK", "BIKE", "SCOOTER"],
      PERSON_TRANSPORT: ["CAR", "VAN"],
      AIRPORT_TRANSFER: ["CAR", "VAN", "TAXI"],
      SHOPPING: ["CAR", "VAN", "BIKE", "SCOOTER"],
      INTERNATIONAL_PURCHASE: ["CAR", "VAN", "TRUCK"],
      PET_SITTING: ["CAR", "VAN"],
      HOME_SERVICE: ["CAR", "VAN", "BIKE", "FOOT"],
      CART_DROP: ["CAR", "VAN", "TRUCK"], // Service phare EcoDeli
    };

    return (
      compatibility[announcementType]?.includes(vehicleType.toUpperCase()) ||
      false
    );
  }

  /**
   * Calcule la capacité requise selon le type d'annonce
   */
  private getRequiredCapacity(announcement: any): number {
    switch (announcement.type) {
      case "PACKAGE_DELIVERY":
        if (announcement.packageDetails?.weight) {
          return announcement.packageDetails.weight;
        }
        return announcement.weight || 1;

      case "PERSON_TRANSPORT":
      case "AIRPORT_TRANSFER":
        if (announcement.personDetails?.numberOfPeople) {
          return announcement.personDetails.numberOfPeople;
        }
        return 1;

      case "SHOPPING":
      case "CART_DROP":
        if (announcement.shoppingDetails?.estimatedWeight) {
          return announcement.shoppingDetails.estimatedWeight;
        }
        // Estimation basée sur le prix
        return Math.ceil(
          (announcement.finalPrice || announcement.basePrice) / 50,
        ); // 1 kg par 50€

      case "PET_SITTING":
        if (announcement.petDetails?.weight) {
          return announcement.petDetails.weight;
        }
        return 10; // Poids moyen d'un animal

      default:
        return 1;
    }
  }

  /**
   * Envoie une notification OneSignal au livreur
   */
  private async sendMatchNotification(
    deliverer: any,
    announcement: any,
    score: number,
  ): Promise<void> {
    try {
      const title = "Nouvelle opportunité de livraison";
      const message = `Une annonce correspond à votre trajet (${Math.round(score)}% de compatibilité)`;

      const data = {
        type: "ANNOUNCEMENT_MATCH",
        announcementId: announcement.id,
        announcementTitle: announcement.title,
        score: score,
        price: announcement.price,
        startCity: announcement.startLocation?.city,
        endCity: announcement.endLocation?.city,
        desiredDate: announcement.desiredDate.toISOString(),
      };

      await NotificationService.notifyDeliveryOpportunity(
        deliverer.id,
        announcement.id,
        {
          title: announcement.title,
          pickupLocation: announcement.pickupAddress,
          deliveryLocation: announcement.deliveryAddress,
          price: announcement.finalPrice || announcement.basePrice,
          desiredDate:
            announcement.pickupDate || announcement.deliveryDate || new Date(),
        },
      );

      // Marquer comme notifié
      await prisma.routeAnnouncementMatch.updateMany({
        where: {
          announcementId: announcement.id,
          route: { delivererId: deliverer.id },
        },
        data: {
          isNotified: true,
          notifiedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error sending match notification:", error);
    }
  }

  /**
   * Recherche les annonces compatibles pour un trajet donné
   */
  async findMatchingAnnouncements(routeId: string): Promise<MatchingResult[]> {
    try {
      const route = await prisma.route.findUnique({
        where: { id: routeId },
        include: {
          deliverer: {
            include: { profile: true },
          },
        },
      });

      if (!route || route.status !== "ACTIVE") {
        return [];
      }

      // Rechercher les annonces actives dans la fenêtre temporelle
      const timeWindow = 24 * 60 * 60 * 1000; // 24 heures
      const compatibleAnnouncements = await prisma.announcement.findMany({
        where: {
          status: "ACTIVE",
          desiredDate: {
            gte: new Date(route.departureTime.getTime() - timeWindow),
            lte: new Date(route.departureTime.getTime() + timeWindow),
          },
        },
        include: {
          packageDetails: true,
          serviceDetails: true,
          routeMatches: true,
        },
      });

      const matches: MatchingResult[] = [];

      for (const announcement of compatibleAnnouncements) {
        // Vérifier si le match existe déjà
        const existingMatch = announcement.routeMatches.find(
          (m) => m.routeId === routeId,
        );
        if (existingMatch) continue;

        const score = this.calculateMatchScore(announcement, route);

        if (score >= 60) {
          matches.push({
            routeId: routeId,
            announcementId: announcement.id,
            score: score,
            deliverer: route.deliverer,
          });
        }
      }

      return matches.sort((a, b) => b.score - a.score); // Trier par score décroissant
    } catch (error) {
      console.error("Error finding matching announcements:", error);
      throw new Error("Erreur lors de la recherche d'annonces compatibles");
    }
  }

  /**
   * Obtient toutes les correspondances pour un livreur
   */
  async getMatchesForDeliverer(delivererId: string): Promise<any[]> {
    try {
      const matches = await prisma.routeAnnouncementMatch.findMany({
        where: {
          route: { delivererId: delivererId },
        },
        include: {
          announcement: {
            include: {
              client: {
                include: { profile: true },
              },
              packageDetails: true,
              serviceDetails: true,
            },
          },
          route: true,
        },
        orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
      });

      return matches.map((match) => ({
        id: match.id,
        score: match.matchScore,
        isNotified: match.isNotified,
        notifiedAt: match.notifiedAt,
        createdAt: match.createdAt,
        announcement: {
          id: match.announcement.id,
          title: match.announcement.title,
          description: match.announcement.description,
          type: match.announcement.type,
          price: match.announcement.price,
          startLocation: match.announcement.startLocation,
          endLocation: match.announcement.endLocation,
          desiredDate: match.announcement.desiredDate,
          client: {
            firstName: match.announcement.client?.profile?.firstName,
            lastName: match.announcement.client?.profile?.lastName,
            avatar: match.announcement.client?.profile?.avatar,
          },
          packageDetails: match.announcement.packageDetails,
          serviceDetails: match.announcement.serviceDetails,
        },
        route: {
          id: match.route.id,
          startLocation: match.route.startLocation,
          endLocation: match.route.endLocation,
          departureTime: match.route.departureTime,
        },
      }));
    } catch (error) {
      console.error("Error getting matches for deliverer:", error);
      throw new Error("Erreur lors de la récupération des correspondances");
    }
  }
}

export const matchingService = new MatchingService();
