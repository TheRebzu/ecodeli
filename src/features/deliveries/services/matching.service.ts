import { prisma } from "@/lib/db";
import { EmailService } from "@/lib/email";

export interface MatchScore {
  announcementId: string;
  delivererId: string;
  routeId?: string;
  totalScore: number;
  locationScore: number;
  timeScore: number;
  capacityScore: number;
  priceScore: number;
  compatibility: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  distance?: number;
  detour?: number;
  estimatedTime?: number;
}

export interface DelivererOpportunity {
  id: string;
  announcementId: string;
  delivererId: string;
  score: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  expiresAt: Date;
  createdAt: Date;
  announcement?: any;
}

interface GeographicPoint {
  address: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export class MatchingService {
  private static readonly MATCHING_THRESHOLD = {
    HIGH: 80,
    MEDIUM: 60,
    LOW: 40,
  };

  private static readonly WEIGHT_CONFIG = {
    location: 0.4, // 40% - Le plus important
    time: 0.3, // 30% - Très important
    capacity: 0.2, // 20% - Important
    price: 0.1, // 10% - Moins important
  };

  /**
   * Trouve les correspondances pour tous les livreurs actifs
   */
  static async findAllMatches(): Promise<MatchScore[]> {
    // Récupérer les livreurs actifs avec leur profil
    const activeDeliverers = await prisma.user.findMany({
      where: {
        role: "DELIVERER",
        profile: {
          isVerified: true,
        },
      },
      include: {
        profile: true,
        documents: {
          where: {
            status: "APPROVED",
          },
        },
      },
    });

    const availableAnnouncements = await prisma.announcement.findMany({
      where: {
        status: "ACTIVE",
        type: {
          in: [
            "PACKAGE_DELIVERY",
            "SHOPPING",
            "INTERNATIONAL_PURCHASE",
          ],
        },
        deliveries: {
          none: {}, // Pas encore de livraison associée
        },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

    const allMatches: MatchScore[] = [];

    for (const deliverer of activeDeliverers) {
      for (const announcement of availableAnnouncements) {
        const match = await this.calculateDelivererAnnouncementMatch(
          deliverer,
          announcement,
        );
        if (match.totalScore >= this.MATCHING_THRESHOLD.LOW) {
          allMatches.push(match);
        }
      }
    }

    // Trier par score décroissant
    return allMatches.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Trouve les correspondances pour une annonce spécifique
   */
  static async findMatchesForAnnouncement(
    announcementId: string,
  ): Promise<MatchScore[]> {
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new Error("Announcement not found");
    }

    // Récupérer tous les livreurs actifs et vérifiés
    const activeDeliverers = await prisma.user.findMany({
      where: {
        role: "DELIVERER",
        profile: {
          isVerified: true,
        },
      },
      include: {
        profile: true,
        documents: {
          where: {
            status: "APPROVED",
          },
        },
      },
    });

    const matches: MatchScore[] = [];

    for (const deliverer of activeDeliverers) {
      const match = await this.calculateDelivererAnnouncementMatch(
        deliverer,
        announcement,
      );
      if (match.totalScore >= this.MATCHING_THRESHOLD.LOW) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Calcule le score de correspondance entre un livreur et une annonce
   */
  private static async calculateDelivererAnnouncementMatch(
    deliverer: any,
    announcement: any,
  ): Promise<MatchScore> {
    const locationScore = this.calculateLocationScore(
      {
        address:
          deliverer.profile?.address || deliverer.profile?.city || "Paris",
      },
      { address: announcement.pickupAddress },
      { address: announcement.deliveryAddress },
    );

    const timeScore = this.calculateTimeScore(
      new Date(),
      announcement.scheduledAt,
    );

    const capacityScore = this.calculateCapacityScore(
      30, // Capacité par défaut 30kg
      1, // Poids par défaut 1kg
      5, // Volume par défaut 5L
    );

    const priceScore = this.calculatePriceScore(
      parseFloat(announcement.price.toString()),
      { min: 10, max: 200 }, // Fourchette par défaut
    );

    // Calcul du score total pondéré
    const totalScore = Math.round(
      locationScore * this.WEIGHT_CONFIG.location +
        timeScore * this.WEIGHT_CONFIG.time +
        capacityScore * this.WEIGHT_CONFIG.capacity +
        priceScore * this.WEIGHT_CONFIG.price,
    );

    // Déterminer le niveau de compatibilité
    let compatibility: "HIGH" | "MEDIUM" | "LOW";
    if (totalScore >= this.MATCHING_THRESHOLD.HIGH) {
      compatibility = "HIGH";
    } else if (totalScore >= this.MATCHING_THRESHOLD.MEDIUM) {
      compatibility = "MEDIUM";
    } else {
      compatibility = "LOW";
    }

    // Générer les raisons du matching
    const reasons = this.generateMatchingReasons(
      locationScore,
      timeScore,
      capacityScore,
      priceScore,
    );

    return {
      announcementId: announcement.id,
      delivererId: deliverer.id,
      totalScore,
      locationScore,
      timeScore,
      capacityScore,
      priceScore,
      compatibility,
      reasons,
      distance: this.estimateDistance(
        deliverer.profile?.city || "Paris",
        announcement.pickupAddress,
      ),
      estimatedTime: this.estimateDeliveryTime(
        announcement.pickupAddress,
        announcement.deliveryAddress,
      ),
    };
  }

  /**
   * Calcule le score de compatibilité géographique
   */
  private static calculateLocationScore(
    delivererLocation: GeographicPoint,
    pickupLocation: GeographicPoint,
    deliveryLocation: GeographicPoint,
  ): number {
    let score = 0;

    // Extraire les villes des adresses
    const delivererCity = this.extractCityFromAddress(
      delivererLocation.address,
    );
    const pickupCity = this.extractCityFromAddress(pickupLocation.address);
    const deliveryCity = this.extractCityFromAddress(deliveryLocation.address);

    // Score pour la proximité du pickup (60 points max)
    if (delivererCity.toLowerCase() === pickupCity.toLowerCase()) {
      score += 60; // Même ville
    } else if (this.isSameRegion(delivererCity, pickupCity)) {
      score += 35; // Même région
    } else if (this.isNearbyCity(delivererCity, pickupCity)) {
      score += 20; // Ville proche
    } else {
      // Score basé sur la distance estimée
      const distance = this.estimateDistance(
        delivererLocation.address,
        pickupLocation.address,
      );
      if (distance <= 10) score += 45;
      else if (distance <= 25) score += 25;
      else if (distance <= 50) score += 10;
    }

    // Score bonus pour la destination (40 points max)
    const deliveryDistance = this.estimateDistance(
      pickupLocation.address,
      deliveryLocation.address,
    );
    if (deliveryDistance <= 10) score += 40;
    else if (deliveryDistance <= 25) score += 30;
    else if (deliveryDistance <= 50) score += 20;
    else if (deliveryDistance <= 100) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Calcule le score de compatibilité temporelle
   */
  private static calculateTimeScore(
    delivererAvailable: Date,
    announcementDate: Date,
  ): number {
    const availableTime = new Date(delivererAvailable);
    const announcementTime = new Date(announcementDate);

    // Calculer la différence en heures
    const diffHours =
      Math.abs(announcementTime.getTime() - availableTime.getTime()) /
      (1000 * 60 * 60);

    // Score dégressif basé sur la différence temporelle
    if (diffHours <= 2) return 100; // Moins de 2h de différence
    if (diffHours <= 6) return 80; // Moins de 6h
    if (diffHours <= 12) return 60; // Moins de 12h
    if (diffHours <= 24) return 40; // Moins de 24h
    if (diffHours <= 48) return 20; // Moins de 48h

    return 0; // Plus de 48h de différence
  }

  /**
   * Calcule le score de compatibilité de capacité
   */
  private static calculateCapacityScore(
    routeCapacity: number,
    announcementWeight: number,
    announcementVolume: number,
  ): number {
    // Score basé sur le ratio capacité disponible / besoins de l'annonce
    const weightRatio = routeCapacity / Math.max(announcementWeight, 1);
    const volumeRatio = routeCapacity / Math.max(announcementVolume, 1);

    const minRatio = Math.min(weightRatio, volumeRatio);

    if (minRatio >= 2) return 100; // Large capacité disponible
    if (minRatio >= 1.5) return 80; // Capacité confortable
    if (minRatio >= 1) return 60; // Capacité juste suffisante
    if (minRatio >= 0.8) return 40; // Un peu serré
    if (minRatio >= 0.6) return 20; // Très serré

    return 0; // Capacité insuffisante
  }

  /**
   * Calcule le score de compatibilité de prix
   */
  private static calculatePriceScore(
    announcementPrice: number,
    delivererPriceRange: { min: number; max: number },
  ): number {
    if (
      announcementPrice >= delivererPriceRange.min &&
      announcementPrice <= delivererPriceRange.max
    ) {
      return 100; // Prix dans la fourchette souhaitée
    }

    if (announcementPrice > delivererPriceRange.max) {
      // Prix plus élevé que souhaité, c'est plutôt bon
      const excess =
        (announcementPrice - delivererPriceRange.max) / delivererPriceRange.max;
      return Math.max(80 - excess * 20, 60); // Score entre 60 et 80
    }

    if (announcementPrice < delivererPriceRange.min) {
      // Prix plus bas que souhaité
      const deficit =
        (delivererPriceRange.min - announcementPrice) / delivererPriceRange.min;
      return Math.max(60 - deficit * 40, 20); // Score entre 20 et 60
    }

    return 50; // Fallback
  }

  /**
   * Génère les raisons du matching pour expliquer le score
   */
  private static generateMatchingReasons(
    locationScore: number,
    timeScore: number,
    capacityScore: number,
    priceScore: number,
  ): string[] {
    const reasons: string[] = [];

    if (locationScore >= 80) {
      reasons.push("Excellent correspondance géographique");
    } else if (locationScore >= 60) {
      reasons.push("Bonne correspondance géographique");
    } else if (locationScore >= 40) {
      reasons.push("Correspondance géographique acceptable");
    }

    if (timeScore >= 80) {
      reasons.push("Parfaite synchronisation temporelle");
    } else if (timeScore >= 60) {
      reasons.push("Bonne compatibilité horaire");
    } else if (timeScore >= 40) {
      reasons.push("Horaires compatibles avec ajustements");
    }

    if (capacityScore >= 80) {
      reasons.push("Capacité largement suffisante");
    } else if (capacityScore >= 60) {
      reasons.push("Capacité adaptée");
    } else if (capacityScore >= 40) {
      reasons.push("Capacité juste suffisante");
    }

    if (priceScore >= 80) {
      reasons.push("Prix très attractif");
    } else if (priceScore >= 60) {
      reasons.push("Prix acceptable");
    }

    return reasons;
  }

  /**
   * Vérifie si deux villes sont dans la même région
   */
  private static isSameRegion(city1: string, city2: string): boolean {
    // Logique simplifiée - à améliorer avec des données géographiques réelles
    const regions: { [key: string]: string[] } = {
      "ile-de-france": [
        "paris",
        "boulogne",
        "neuilly",
        "levallois",
        "issy",
        "versailles",
      ],
      "rhone-alpes": ["lyon", "grenoble", "chambery", "annecy"],
      paca: ["marseille", "nice", "cannes", "toulon", "aix-en-provence"],
      nord: ["lille", "roubaix", "tourcoing", "valenciennes"],
    };

    for (const region in regions) {
      const cities = regions[region];
      if (
        cities.includes(city1.toLowerCase()) &&
        cities.includes(city2.toLowerCase())
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Vérifie si deux villes sont proches
   */
  private static isNearbyCity(city1: string, city2: string): boolean {
    // Logique simplifiée - distance approximative
    const nearbyCities: { [key: string]: string[] } = {
      paris: [
        "boulogne",
        "neuilly",
        "levallois",
        "issy",
        "versailles",
        "creteil",
      ],
      lyon: ["villeurbanne", "bron", "vaulx-en-velin"],
      marseille: ["aix-en-provence", "aubagne", "martigues"],
      lille: ["roubaix", "tourcoing", "villeneuve-d-ascq"],
    };

    const city1Lower = city1.toLowerCase();
    const city2Lower = city2.toLowerCase();

    return (
      nearbyCities[city1Lower]?.includes(city2Lower) ||
      nearbyCities[city2Lower]?.includes(city1Lower) ||
      false
    );
  }

  /**
   * Extrait la ville d'une adresse
   */
  private static extractCityFromAddress(address: string): string {
    // Logique simplifiée pour extraire la ville
    const words = address.split(",").map((w) => w.trim());
    const cityKeywords = [
      "Paris",
      "Lyon",
      "Marseille",
      "Lille",
      "Toulouse",
      "Nice",
      "Nantes",
      "Montpellier",
      "Strasbourg",
      "Bordeaux",
    ];

    for (const word of words) {
      for (const city of cityKeywords) {
        if (word.toLowerCase().includes(city.toLowerCase())) {
          return city;
        }
      }
    }

    // Par défaut, prendre le dernier élément comme ville
    return words[words.length - 1] || "Paris";
  }

  /**
   * Estime la distance entre deux adresses (simulation)
   */
  private static estimateDistance(address1: string, address2: string): number {
    const city1 = this.extractCityFromAddress(address1);
    const city2 = this.extractCityFromAddress(address2);

    // Distances simplifiées entre grandes villes
    const distances: { [key: string]: { [key: string]: number } } = {
      Paris: {
        Lyon: 465,
        Marseille: 775,
        Lille: 225,
        Toulouse: 679,
        Nice: 933,
      },
      Lyon: {
        Paris: 465,
        Marseille: 315,
        Lille: 690,
        Toulouse: 537,
        Nice: 473,
      },
      Marseille: {
        Paris: 775,
        Lyon: 315,
        Lille: 1000,
        Toulouse: 405,
        Nice: 204,
      },
      Lille: {
        Paris: 225,
        Lyon: 690,
        Marseille: 1000,
        Toulouse: 904,
        Nice: 1158,
      },
      Toulouse: {
        Paris: 679,
        Lyon: 537,
        Marseille: 405,
        Lille: 904,
        Nice: 539,
      },
      Nice: {
        Paris: 933,
        Lyon: 473,
        Marseille: 204,
        Lille: 1158,
        Toulouse: 539,
      },
    };

    if (city1 === city2) return 15; // Distance intra-ville

    const distance = distances[city1]?.[city2] || distances[city2]?.[city1];
    return distance ? distance : 500; // Distance par défaut
  }

  /**
   * Estime le temps de livraison
   */
  private static estimateDeliveryTime(
    pickupAddress: string,
    deliveryAddress: string,
  ): number {
    const distance = this.estimateDistance(pickupAddress, deliveryAddress);

    // Estimation basée sur la distance (en minutes)
    if (distance <= 10) return 30; // 30 min pour courte distance
    if (distance <= 25) return 60; // 1h pour distance moyenne
    if (distance <= 100) return 180; // 3h pour longue distance
    return Math.round((distance / 60) * 60); // 60km/h en moyenne
  }

  /**
   * Trouve les annonces compatibles pour un livreur spécifique
   */
  static async findMatchesForDeliverer(
    delivererId: string,
    limit: number = 10,
  ): Promise<MatchScore[]> {
    const deliverer = await prisma.user.findUnique({
      where: { id: delivererId, role: "DELIVERER" },
      include: {
        profile: true,
        documents: {
          where: { status: "APPROVED" },
        },
      },
    });

    if (!deliverer || !deliverer.profile?.verified) {
      return [];
    }

    const availableAnnouncements = await prisma.announcement.findMany({
      where: {
        status: "ACTIVE",
        type: {
          in: [
            "PACKAGE_DELIVERY",
            "SHOPPING",
            "INTERNATIONAL_PURCHASE",
          ],
        },
        deliveries: { none: {} },
        scheduledAt: { gte: new Date() }, // Uniquement les annonces futures
      },
      include: {
        author: {
          include: { profile: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: limit * 2, // Prendre plus pour filtrer ensuite
    });

    const matches: MatchScore[] = [];

    for (const announcement of availableAnnouncements) {
      const match = await this.calculateDelivererAnnouncementMatch(
        deliverer,
        announcement,
      );
      if (match.totalScore >= this.MATCHING_THRESHOLD.LOW) {
        matches.push(match);
      }
    }

    return matches.sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
  }

  /**
   * Crée une opportunité de livraison pour un livreur
   */
  static async createOpportunity(
    delivererId: string,
    announcementId: string,
    score: number,
  ): Promise<DelivererOpportunity | null> {
    try {
      // Vérifier que l'opportunité n'existe pas déjà
      const existing = await prisma.notification.findFirst({
        where: {
          userId: delivererId,
          type: "DELIVERY_OPPORTUNITY",
          data: {
            path: ["announcementId"],
            equals: announcementId,
          },
        },
      });

      if (existing) {
        return null; // Opportunité déjà créée
      }

      // Créer la notification d'opportunité
      const notification = await prisma.notification.create({
        data: {
          userId: delivererId,
          type: "DELIVERY_OPPORTUNITY",
          title: "Nouvelle opportunité de livraison !",
          message: `Score de compatibilité: ${score}/100`,
          data: {
            announcementId,
            score,
            type: "OPPORTUNITY",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          },
        },
      });

      return {
        id: notification.id,
        announcementId,
        delivererId,
        score,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: notification.createdAt,
      };
    } catch (error) {
      console.error("Erreur création opportunité:", error);
      return null;
    }
  }

  /**
   * Exécute le matching automatique et envoie les notifications
   */
  static async executeAutoMatching(): Promise<{
    processed: number;
    matches: number;
    notifications: number;
  }> {
    console.log("Début du matching automatique...");

    const matches = await this.findAllMatches();
    const highQualityMatches = matches.filter(
      (m) => m.compatibility === "HIGH",
    );

    let notificationsSent = 0;

    for (const match of highQualityMatches) {
      try {
        const opportunity = await this.createOpportunity(
          match.delivererId,
          match.announcementId,
          match.totalScore,
        );

        if (opportunity) {
          notificationsSent++;
          console.log(
            `Opportunité créée: ${match.delivererId} -> ${match.announcementId} (${match.totalScore}/100)`,
          );
        }
      } catch (error) {
        console.error("Erreur traitement match:", error);
      }
    }

    console.log(
      `Matching terminé: ${matches.length} matchs traités, ${highQualityMatches.length} haute qualité, ${notificationsSent} notifications`,
    );

    return {
      processed: matches.length,
      matches: highQualityMatches.length,
      notifications: notificationsSent,
    };
  }

  /**
   * Accepte une opportunité et crée la livraison
   */
  static async acceptOpportunity(
    delivererId: string,
    announcementId: string,
  ): Promise<{ success: boolean; message: string; deliveryId?: string }> {
    try {
      // Vérifier que l'annonce est toujours disponible
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          deliveries: true,
          author: true, // Get the author's email
        },
      });

      if (
        !announcement ||
        announcement.status !== "ACTIVE" ||
        announcement.deliveries.length > 0
      ) {
        return {
          success: false,
          message: "Cette annonce n'est plus disponible",
        };
      }

      // Créer la livraison dans une transaction
      const result = await prisma.$transaction(async (tx) => {
        // Créer la livraison
        const delivery = await tx.delivery.create({
          data: {
            announcementId,
            delivererId,
            clientId: announcement.authorId,
            status: "ACCEPTED",
            validationCode: Math.floor(
              100000 + Math.random() * 900000,
            ).toString(),
            pickupAddress: announcement.pickupAddress,
            deliveryAddress: announcement.deliveryAddress,
            scheduledAt: announcement.scheduledAt,
          },
        });

        // Ajout: Créer l'entrée de tracking initiale
        await tx.trackingUpdate.create({
          data: {
            deliveryId: delivery.id,
            status: "ACCEPTED",
            message: "Livraison acceptée par le livreur",
            isAutomatic: true,
            timestamp: new Date(),
          },
        });

        // Mettre à jour l'annonce
        await tx.announcement.update({
          where: { id: announcementId },
          data: { status: "IN_PROGRESS" },
        });

        // Marquer les notifications comme lues
        await tx.notification.updateMany({
          where: {
            userId: delivererId,
            type: "DELIVERY_OPPORTUNITY",
            data: {
              path: ["announcementId"],
              equals: announcementId,
            },
          },
          data: { isRead: true },
        });

        // Notifier le client
        await tx.notification.create({
          data: {
            userId: announcement.authorId,
            type: "DELIVERY_ACCEPTED",
            title: "Votre livraison a été acceptée !",
            message: `Un livreur a accepté votre annonce "${announcement.title}"`,
            data: {
              deliveryId: delivery.id,
              announcementId,
            },
          },
        });

        // ENVOI EMAIL SIMPLE AU CLIENT POUR PAIEMENT
        if (announcement.author?.email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const paymentLink = `${appUrl}/client/deliveries/${delivery.id}/payment`;
          const subject = "Paiement requis pour votre livraison EcoDeli";
          const html = `
            <p>Bonjour,</p>
            <p>Votre livraison <b>${announcement.title}</b> a été acceptée par un livreur.</p>
            <p>Pour démarrer la livraison, merci de procéder au paiement en cliquant sur le lien ci-dessous :</p>
            <p><a href="${paymentLink}">Payer ma livraison</a></p>
            <p>Ou copiez ce lien dans votre navigateur :<br>${paymentLink}</p>
            <p>Merci pour votre confiance.<br>L'équipe EcoDeli</p>
          `;
          // Envoi email (hors transaction pour éviter blocage si SMTP down)
          setTimeout(() => {
            EmailService.sendGenericEmail(announcement.author.email, subject, html).catch(() => {});
          }, 0);
        }

        return delivery;
      });

      return {
        success: true,
        message: "Livraison acceptée avec succès !",
        deliveryId: result.id,
      };
    } catch (error) {
      console.error("Erreur acceptation opportunité:", error);
      return {
        success: false,
        message: "Erreur lors de l'acceptation",
      };
    }
  }

  /**
   * Récupère les opportunités en cours pour un livreur
   */
  static async getDelivererOpportunities(
    delivererId: string,
  ): Promise<DelivererOpportunity[]> {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: delivererId,
          type: "DELIVERY_OPPORTUNITY",
          isRead: false,
        },
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const opportunities: DelivererOpportunity[] = [];

      for (const notification of notifications) {
        const data = notification.data as any;
        if (data?.announcementId && data?.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          const status = expiresAt < new Date() ? "EXPIRED" : "PENDING";

          // Récupérer les détails de l'annonce
          const announcement = await prisma.announcement.findUnique({
            where: { id: data.announcementId },
            include: {
              author: {
                include: { profile: true },
              },
            },
          });

          opportunities.push({
            id: notification.id,
            announcementId: data.announcementId,
            delivererId,
            score: data.score || 0,
            status,
            expiresAt,
            createdAt: notification.createdAt,
            announcement,
          });
        }
      }

      return opportunities;
    } catch (error) {
      console.error("Erreur récupération opportunités:", error);
      return [];
    }
  }
}
