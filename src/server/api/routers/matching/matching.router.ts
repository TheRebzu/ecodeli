import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  MatchingAlgorithm,
  MatchingPriority,
  MatchingResultStatus,
  MatchingCriteriaType,
} from "@prisma/client";
import {
  calculateDistance,
  calculateDistanceScore,
  isWithinRadius,
} from "@/server/utils/geo-calculations";

/**
 * Router pour le système de matching automatique
 * Gère le matching entre annonces et livreurs/routes planifiées
 */

// Schémas de validation
const createMatchingCriteriaSchema = z.object({
  announcementId: z.string().cuid(),
  algorithm: z.nativeEnum(MatchingAlgorithm).default("HYBRID"),
  priority: z.nativeEnum(MatchingPriority).default("NORMAL"),

  // Critères géographiques
  maxDistance: z.number().min(0).max(100).optional(),
  preferredRadius: z.number().min(0).max(50).optional(),
  allowPartialRoute: z.boolean().default(true),

  // Critères temporels
  timeWindowStart: z.date().optional(),
  timeWindowEnd: z.date().optional(),
  maxDelay: z.number().min(0).max(240).optional(), // minutes

  // Critères de véhicule
  requiredVehicleTypes: z
    .array(z.enum(["FOOT", "BIKE", "SCOOTER", "CAR", "VAN", "TRUCK"]))
    .optional(),
  minVehicleCapacity: z.number().min(0).optional(),

  // Critères de livreur
  minDelivererRating: z.number().min(1).max(5).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  genderPreference: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),

  // Critères de prix
  maxPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  allowNegotiation: z.boolean().default(true),

  // Configuration avancée
  autoAssignAfter: z.number().min(0).max(480).optional(), // minutes
  maxSuggestions: z.number().min(1).max(20).default(5),
  scoreThreshold: z.number().min(0).max(1).default(0.6),
});

const matchingResultsFilterSchema = z.object({
  announcementId: z.string().cuid().optional(),
  delivererId: z.string().cuid().optional(),
  status: z.nativeEnum(MatchingResultStatus).optional(),
  minScore: z.number().min(0).max(1).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const respondToMatchSchema = z.object({
  matchingResultId: z.string().cuid(),
  accept: z.boolean(),
  proposedPrice: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
  rejectionReason: z.string().max(200).optional(),
});

export const matchingRouter = router({
  /**
   * Créer des critères de matching pour une annonce
   */
  createCriteria: protectedProcedure
    .input(createMatchingCriteriaSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      try {
        // Vérifier que l'annonce existe et appartient à l'utilisateur
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            clientId: user.id,
            status: { in: ["DRAFT", "PUBLISHED"] },
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée",
          });
        }

        // Créer ou mettre à jour les critères
        const criteria = await ctx.db.matchingCriteria.upsert({
          where: { announcementId: input.announcementId },
          update: {
            ...input,
            updatedAt: new Date(),
          },
          create: {
            ...input,
            packageTypes: ["STANDARD"], // Valeur par défaut
            scoreThreshold: input.scoreThreshold,
          },
        });

        // Si l'annonce est publiée et autoAssign est activé, lancer le matching
        if (announcement.status === "PUBLISHED" && announcement.autoAssign) {
          await triggerMatchingProcess(criteria.id);
        }

        return {
          success: true,
          data: criteria,
          message: "Critères de matching créés avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création des critères",
        });
      }
    }),

  /**
   * Déclencher le processus de matching pour une annonce
   */
  triggerMatching: protectedProcedure
    .input(
      z.object({
        announcementId: z.string().cuid(),
        forceRefresh: z.boolean().default(false),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      try {
        // Vérifier les permissions
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            OR: [
              { clientId: user.id },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) },
            ],
          },
          include: {
            matchingCriteria: true,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée",
          });
        }

        if (!announcement.matchingCriteria) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucun critère de matching défini pour cette annonce",
          });
        }

        // Lancer le processus de matching
        const results = await performMatching(
          announcement,
          announcement.matchingCriteria,
          _ctx.db,
        );

        return {
          success: true,
          data: {
            announcementId: input.announcementId,
            resultsCount: results.length,
            topMatches: results.slice(0, 3),
          },
          message: `Matching terminé: ${results.length} livreurs trouvés`,
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du matching",
        });
      }
    }),

  /**
   * Obtenir les résultats de matching
   */
  getMatchingResults: protectedProcedure
    .input(matchingResultsFilterSchema)
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      try {
        const where: any = {};

        // Filtrer selon le rôle
        if (user.role === "CLIENT") {
          // Les clients ne voient que les matchings de leurs annonces
          const userAnnouncements = await ctx.db.announcement.findMany({
            where: { clientId: user.id },
            select: { id: true },
          });
          where.announcementId = { in: userAnnouncements.map((a) => a.id) };
        } else if (user.role === "DELIVERER") {
          // Les livreurs ne voient que leurs propres matchings
          where.delivererId = user.id;
        }

        // Appliquer les filtres
        if (input.announcementId) where.announcementId = input.announcementId;
        if (input.delivererId && user.role === "ADMIN")
          where.delivererId = input.delivererId;
        if (input.status) where.status = input.status;
        if (input.minScore) where.overallScore = { gte: input.minScore };

        const results = await ctx.db.matchingResult.findMany({
          where,
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                deliverer: {
                  select: {
                    averageRating: true,
                    totalDeliveries: true,
                    completedDeliveries: true,
                  },
                },
              },
            },
            announcement: {
              select: {
                id: true,
                title: true,
                pickupCity: true,
                deliveryCity: true,
                suggestedPrice: true,
                status: true,
              },
            },
            criteria: {
              select: {
                algorithm: true,
                priority: true,
                scoreThreshold: true,
              },
            },
          },
          orderBy: [{ overallScore: "desc" }, { suggestedAt: "desc" }],
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.matchingResult.count({ where });

        return {
          success: true,
          data: results,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des résultats",
        });
      }
    }),

  /**
   * Répondre à une suggestion de matching (livreur)
   */
  respondToMatch: protectedProcedure
    .input(respondToMatchSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent répondre aux matchings",
        });
      }

      try {
        // Vérifier que le matching existe et appartient au livreur
        const matchingResult = await ctx.db.matchingResult.findFirst({
          where: {
            id: input.matchingResultId,
            delivererId: user.id,
            status: { in: ["PENDING", "SUGGESTED"] },
          },
          include: {
            announcement: true,
            criteria: true,
          },
        });

        if (!matchingResult) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Matching non trouvé ou déjà traité",
          });
        }

        // Vérifier que l'annonce est toujours disponible
        if (matchingResult.announcement.status !== "PUBLISHED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette annonce n'est plus disponible",
          });
        }

        // Mettre à jour le résultat
        const updatedResult = await ctx.db.matchingResult.update({
          where: { id: input.matchingResultId },
          data: {
            status: input.accept ? "ACCEPTED" : "REJECTED",
            respondedAt: new Date(),
            rejectionReason: input.rejectionReason,
            ...(input.proposedPrice && {
              suggestedPrice: input.proposedPrice,
            }),
          },
        });

        if (input.accept) {
          // Créer une candidature pour l'annonce
          await ctx.db.deliveryApplication.create({
            data: {
              announcementId: matchingResult.announcementId,
              delivererId: user.id,
              proposedPrice:
                input.proposedPrice || matchingResult.suggestedPrice.toNumber(),
              message: input.message || "Candidature via matching automatique",
              status: "PENDING",
              isFromMatching: true,
            },
          });

          // Si auto-assign est activé et score suffisant, assigner automatiquement
          if (
            matchingResult.criteria.autoAssignAfter &&
            matchingResult.overallScore >=
              matchingResult.criteria.scoreThreshold
          ) {
            await ctx.db.announcement.update({
              where: { id: matchingResult.announcementId },
              data: {
                delivererId: user.id,
                status: "ASSIGNED",
              },
            });
          }
        }

        return {
          success: true,
          data: updatedResult,
          message: input.accept ? "Candidature envoyée" : "Matching refusé",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la réponse",
        });
      }
    }),

  /**
   * Obtenir les préférences de matching du livreur
   */
  getMyPreferences: protectedProcedure.query(async ({ _ctx }) => {
    const { _user: __user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent gérer leurs préférences",
      });
    }

    try {
      const preferences = await ctx.db.delivererMatchingPreferences.findUnique({
        where: { delivererId: user.id },
      });

      // Créer les préférences par défaut si elles n'existent pas
      if (!preferences) {
        preferences = await ctx.db.delivererMatchingPreferences.create({
          data: {
            delivererId: user.id,
            preferredRadius: 10.0,
            maxRadius: 25.0,
            maxWorkingHours: 8,
            acceptedPackageTypes: ["STANDARD", "FRAGILE"],
            maxPackageWeight: 20.0,
            acceptFragile: true,
            acceptRefrigerated: false,
            minPrice: 5.0,
            acceptNegotiation: true,
            instantNotification: true,
            maxSuggestions: 10,
            autoDeclineAfter: 60,
          },
        });
      }

      return {
        success: true,
        data: preferences,
      };
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des préférences",
      });
    }
  }),

  /**
   * Mettre à jour les préférences de matching
   */
  updateMyPreferences: protectedProcedure
    .input(
      z.object({
        preferredRadius: z.number().min(1).max(50).optional(),
        maxRadius: z.number().min(1).max(100).optional(),
        homeLatitude: z.number().optional(),
        homeLongitude: z.number().optional(),
        availableFrom: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .optional(),
        availableTo: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .optional(),
        availableDays: z.array(z.number().min(0).max(6)).optional(),
        maxWorkingHours: z.number().min(1).max(12).optional(),
        acceptedPackageTypes: z
          .array(
            z.enum([
              "STANDARD",
              "FRAGILE",
              "REFRIGERATED",
              "DANGEROUS",
              "OVERSIZED",
            ]),
          )
          .optional(),
        maxPackageWeight: z.number().min(1).max(100).optional(),
        acceptFragile: z.boolean().optional(),
        acceptRefrigerated: z.boolean().optional(),
        minPrice: z.number().min(0).optional(),
        maxPrice: z.number().min(0).optional(),
        acceptNegotiation: z.boolean().optional(),
        instantNotification: z.boolean().optional(),
        maxSuggestions: z.number().min(1).max(50).optional(),
        autoDeclineAfter: z.number().min(0).max(480).optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent modifier leurs préférences",
        });
      }

      try {
        const preferences = await ctx.db.delivererMatchingPreferences.upsert({
          where: { delivererId: user.id },
          update: {
            ...input,
            updatedAt: new Date(),
          },
          create: {
            delivererId: user.id,
            ...input,
            preferredRadius: input.preferredRadius || 10.0,
            maxRadius: input.maxRadius || 25.0,
            maxWorkingHours: input.maxWorkingHours || 8,
            acceptedPackageTypes: input.acceptedPackageTypes || ["STANDARD"],
            maxPackageWeight: input.maxPackageWeight || 20.0,
            acceptFragile: input.acceptFragile ?? true,
            acceptRefrigerated: input.acceptRefrigerated ?? false,
            minPrice: input.minPrice || 5.0,
            acceptNegotiation: input.acceptNegotiation ?? true,
            instantNotification: input.instantNotification ?? true,
            maxSuggestions: input.maxSuggestions || 10,
            autoDeclineAfter: input.autoDeclineAfter || 60,
          },
        });

        return {
          success: true,
          data: preferences,
          message: "Préférences mises à jour avec succès",
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour des préférences",
        });
      }
    }),

  /**
   * Obtenir les statistiques de matching (Admin)
   */
  getMatchingStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["day", "week", "month"]).default("week"),
        algorithm: z.nativeEnum(MatchingAlgorithm).optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs",
        });
      }

      try {
        const startDate = new Date();
        switch (input.period) {
          case "day":
            startDate.setDate(startDate.getDate() - 1);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }

        const where: any = {
          suggestedAt: { gte: startDate },
        };

        if (input.algorithm) {
          where.algorithm = input.algorithm;
        }

        // Statistiques globales
        const [
          totalMatches,
          acceptedMatches,
          rejectedMatches,
          expiredMatches,
          avgResponseTime,
          avgScore,
        ] = await Promise.all([
          _ctx.db.matchingResult.count({ where }),
          ctx.db.matchingResult.count({
            where: { ...where, status: "ACCEPTED" },
          }),
          ctx.db.matchingResult.count({
            where: { ...where, status: "REJECTED" },
          }),
          ctx.db.matchingResult.count({
            where: { ...where, status: "EXPIRED" },
          }),
          ctx.db.matchingResult.aggregate({
            where: { ...where, respondedAt: { not: null } },
            _avg: {
              processingTime: true,
            },
          }),
          ctx.db.matchingResult.aggregate({
            where,
            _avg: {
              overallScore: true,
              distanceScore: true,
              timeScore: true,
              priceScore: true,
              ratingScore: true,
            },
          }),
        ]);

        const acceptanceRate =
          totalMatches > 0 ? (acceptedMatches / totalMatches) * 100 : 0;

        return {
          success: true,
          data: {
            summary: {
              totalMatches,
              acceptedMatches,
              rejectedMatches,
              expiredMatches,
              acceptanceRate: Math.round(acceptanceRate * 100) / 100,
              avgResponseTimeMinutes: Math.round(
                avgResponseTime._avg.processingTime || 0,
              ),
            },
            scores: {
              overall:
                Math.round((avgScore._avg.overallScore || 0) * 100) / 100,
              distance:
                Math.round((avgScore._avg.distanceScore || 0) * 100) / 100,
              time: Math.round((avgScore._avg.timeScore || 0) * 100) / 100,
              price: Math.round((avgScore._avg.priceScore || 0) * 100) / 100,
              rating: Math.round((avgScore._avg.ratingScore || 0) * 100) / 100,
            },
            period: input.period,
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques",
        });
      }
    }),
});

// Helper functions
async function triggerMatchingProcess(criteriaId: string) {
  // TODO: Implémenter le processus de matching asynchrone
  console.log("Matching process triggered for criteria:", criteriaId);
}

async function performMatching(announcement: any, criteria: any, db: any) {
  // Implémentation complète avec algorithme de matching réel
  // Calcul basé sur distance, disponibilité, évaluations et préférences

  // Placeholder implementation
  const deliverers = await db.user.findMany({
    where: {
      role: "DELIVERER",
      status: "ACTIVE",
      deliverer: {
        isAvailable: true,
      },
    },
    include: {
      deliverer: true,
      matchingPreferences: true,
    },
    take: criteria.maxSuggestions,
  });

  const results = [];
  const announcementLocation = {
    lat: announcement.pickupLatitude,
    lng: announcement.pickupLongitude,
  };

  for (const deliverer of deliverers) {
    // Calculer la distance réelle entre le livreur et l'annonce
    const delivererLocation = {
      lat: deliverer.latitude || 0,
      lng: deliverer.longitude || 0,
    };

    const calculatedDistance = calculateDistance(
      announcementLocation.lat,
      announcementLocation.lng,
      delivererLocation.lat,
      delivererLocation.lng,
    );

    // Score de distance (plus proche = meilleur score)
    const maxDistance = criteria.maxDistance || 50; // km
    const distanceScore = Math.max(0, 1 - calculatedDistance / maxDistance);

    // Score de temps basé sur la disponibilité du livreur
    const timeScore = await calculateTimeScore(
      db,
      deliverer.id,
      announcement.pickupTimeStart,
    );

    // Score de prix basé sur la différence avec le prix souhaité
    const priceScore = calculatePriceScore(
      announcement.suggestedPrice || 0,
      deliverer.deliverer?.pricePerKm || 1,
      calculatedDistance,
    );

    // Score de notation du livreur
    const ratingScore = deliverer.deliverer?.averageRating
      ? Math.min(deliverer.deliverer.averageRating / 5, 1)
      : 0.5;

    // Calculer le score global avec pondération
    const overallScore =
      distanceScore * 0.3 +
      timeScore * 0.3 +
      priceScore * 0.2 +
      ratingScore * 0.2;

    // Estimation du temps de trajet
    const estimatedDuration = Math.max(
      15,
      Math.round(calculatedDistance * 2.5),
    ); // ~2.5 min par km en ville

    // Prix suggéré basé sur la distance et le tarif du livreur
    const suggestedPrice = Math.max(
      announcement.suggestedPrice || 0,
      calculatedDistance * (deliverer.deliverer?.pricePerKm || 1.5),
    );

    if (
      overallScore >= criteria.scoreThreshold &&
      calculatedDistance <= maxDistance
    ) {
      const startTime = performance.now();

      const result = await db.matchingResult.create({
        data: {
          criteriaId: criteria.id,
          delivererId: deliverer.id,
          announcementId: announcement.id,
          overallScore: Math.round(overallScore * 100) / 100,
          distanceScore: Math.round(distanceScore * 100) / 100,
          timeScore: Math.round(timeScore * 100) / 100,
          priceScore: Math.round(priceScore * 100) / 100,
          ratingScore: Math.round(ratingScore * 100) / 100,
          calculatedDistance: Math.round(calculatedDistance * 100) / 100,
          estimatedDuration,
          suggestedPrice: Math.round(suggestedPrice * 100) / 100,
          algorithm: criteria.algorithm,
          processingTime: Math.round(performance.now() - startTime),
          confidenceLevel: Math.round(overallScore * 100) / 100,
          status: "SUGGESTED",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      results.push(result);
    }
  }

  return results;
}

// Helper functions pour l'algorithme de matching

/**
 * Calcule la distance entre deux points géographiques en utilisant la formule de Haversine
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule le score de temps basé sur la disponibilité du livreur
 */
async function calculateTimeScore(
  db: any,
  delivererId: string,
  requestedTime: Date,
): Promise<number> {
  try {
    // Vérifier la disponibilité du livreur à l'heure demandée
    const requestedDate = new Date(requestedTime);
    const dayOfWeek = requestedDate.getDay();
    const timeOfDay = requestedDate.toTimeString().substring(0, 5);

    // Chercher les disponibilités récurrentes
    const availability = await db.providerAvailability.findFirst({
      where: {
        providerId: delivererId,
        dayOfWeek,
        startTime: { lte: timeOfDay },
        endTime: { gte: timeOfDay },
        isActive: true,
      },
    });

    if (availability) {
      // Le livreur est disponible : score élevé
      return 1.0;
    }

    // Chercher des créneaux proches
    const availabilities = await db.providerAvailability.findMany({
      where: {
        providerId: delivererId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (availabilities.length === 0) {
      return 0.1; // Pas de disponibilité ce jour-là
    }

    // Calculer la proximité avec les créneaux disponibles
    const bestScore = 0;
    for (const avail of availabilities) {
      const timeScore = calculateTimeProximity(
        timeOfDay,
        avail.startTime,
        avail.endTime,
      );
      bestScore = Math.max(bestScore, timeScore);
    }

    return bestScore;
  } catch (_error) {
    console.error("Error calculating time score:", error);
    return 0.5; // Score neutre en cas d'erreur
  }
}

/**
 * Calcule la proximité temporelle entre l'heure demandée et un créneau disponible
 */
function calculateTimeProximity(
  requestedTime: string,
  startTime: string,
  endTime: string,
): number {
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const requested = timeToMinutes(requestedTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  // Si dans le créneau, score parfait
  if (requested >= start && requested <= end) {
    return 1.0;
  }

  // Calculer la distance minimale au créneau
  const distanceToSlot = Math.min(
    Math.abs(requested - start),
    Math.abs(requested - end),
  );

  // Score inversement proportionnel à la distance (max 4h = 240 min)
  return Math.max(0, 1 - distanceToSlot / 240);
}

/**
 * Calcule le score de prix
 */
function calculatePriceScore(
  suggestedPrice: number,
  delivererRate: number,
  distance: number,
): number {
  if (suggestedPrice <= 0) return 0.5; // Prix non spécifié

  const delivererPrice = distance * delivererRate;
  const priceDifference = Math.abs(suggestedPrice - delivererPrice);
  const pricePercentage =
    priceDifference / Math.max(suggestedPrice, delivererPrice);

  // Score élevé si les prix sont proches
  return Math.max(0, 1 - pricePercentage);
}
