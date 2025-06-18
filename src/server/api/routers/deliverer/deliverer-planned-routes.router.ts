import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PlannedRouteStatus } from "@prisma/client";

/**
 * Router pour les routes planifiées des livreurs
 * Implémente la fonctionnalité "annonces de trajets" selon le cahier des charges
 */

// Schémas de validation
const createPlannedRouteSchema = z.object({ title: z.string().min(3).max(100),
  description: z.string().optional(),
  departureAddress: z.string().min(5),
  departureCity: z.string().min(2),
  departurePostalCode: z.string().min(5).max(10),
  departureLatitude: z.number().optional(),
  departureLongitude: z.number().optional(),

  arrivalAddress: z.string().min(5),
  arrivalCity: z.string().min(2),
  arrivalPostalCode: z.string().min(5).max(10),
  arrivalLatitude: z.number().optional(),
  arrivalLongitude: z.number().optional(),

  departureTime: z.date(),
  arrivalTime: z.date(),
  isRecurring: z.boolean().default(false),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  recurringEndDate: z.date().optional(),

  availableCapacity: z.number().min(0).max(100).default(100),
  maxPackageWeight: z.number().min(0).optional(),
  vehicleRequired: z
    .enum(["FOOT", "BIKE", "SCOOTER", "CAR", "VAN", "TRUCK"])
    .optional(),

  pricePerKm: z.number().min(0).optional(),
  fixedPrice: z.number().min(0).optional(),
  minimumPrice: z.number().min(0).optional(),

  waypoints: z
    .array(
      z.object({
        address: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timeWindow: z
          .object({
            start: z.date(),
            end: z.date() })
          .optional()}),
    )
    .optional(),

  availableSeats: z.number().min(0).optional(),
  isPublic: z.boolean().default(true),
  notifyOnMatch: z.boolean().default(true),
  autoAcceptMatch: z.boolean().default(false)});

const updatePlannedRouteSchema = createPlannedRouteSchema.partial().extend({ id: z.string().cuid() });

const routeFiltersSchema = z.object({ status: z.array(z.nativeEnum(PlannedRouteStatus)).optional(),
  departureCity: z.string().optional(),
  arrivalCity: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  isRecurring: z.boolean().optional(),
  hasAvailableCapacity: z.boolean().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0) });

export const delivererPlannedRoutesRouter = router({ /**
   * Récupérer toutes les routes planifiées du livreur connecté
   */
  getMyRoutes: protectedProcedure
    .input(routeFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Seuls les livreurs peuvent accéder à leurs routes planifiées" });
      }

      try {
        const routes = await ctx.db.delivererPlannedRoute.findMany({
          where: {
            delivererId: user.id,
            ...(input.status && { status: { in: input.status } }),
            ...(input.departureCity && {
              departureCity: {
                contains: input.departureCity,
                mode: "insensitive"}}),
            ...(input.arrivalCity && {
              arrivalCity: { contains: input.arrivalCity, mode: "insensitive" }}),
            ...(input.dateFrom &&
              input.dateTo && {
                departureTime: { gte: input.dateFrom, lte: input.dateTo }}),
            ...(input.isRecurring !== undefined && {
              isRecurring: input.isRecurring}),
            ...(input.hasAvailableCapacity && { availableCapacity: { gt: 0 } })},
          include: {
            matchedAnnouncements: {
              include: {
                announcement: {
                  select: {
                    id: true,
                    title: true,
                    pickupCity: true,
                    deliveryCity: true,
                    suggestedPrice: true,
                    status: true}}}},
            routeAnnouncements: true,
            performanceHistory: {
              orderBy: { date: "desc" },
              take: 5}},
          orderBy: { departureTime: "asc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.delivererPlannedRoute.count({
          where: {
            delivererId: user.id,
            ...(input.status && { status: { in: input.status } }),
            ...(input.departureCity && {
              departureCity: {
                contains: input.departureCity,
                mode: "insensitive"}}),
            ...(input.arrivalCity && {
              arrivalCity: { contains: input.arrivalCity, mode: "insensitive" }}),
            ...(input.dateFrom &&
              input.dateTo && {
                departureTime: { gte: input.dateFrom, lte: input.dateTo }}),
            ...(input.isRecurring !== undefined && {
              isRecurring: input.isRecurring}),
            ...(input.hasAvailableCapacity && { availableCapacity: { gt: 0 } })}});

        return {
          routes,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des routes planifiées" });
      }
    }),

  /**
   * Créer une nouvelle route planifiée
   */
  create: protectedProcedure
    .input(createPlannedRouteSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent créer des routes planifiées" });
      }

      // Validation business rules
      if (input.departureTime >= input.arrivalTime) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message:
            "L'heure d'arrivée doit être postérieure à l'heure de départ" });
      }

      if (input.isRecurring && !input.recurringDays?.length) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message:
            "Les jours de récurrence sont requis pour une route récurrente" });
      }

      try {
        // Calculer la distance estimée réelle entre les points de la route
        const estimatedDistance = await calculateRouteDistance(input.stops);
        const estimatedDuration = Math.round(estimatedDistance * 2.5); // ~2.5 min par km en ville

        const route = await ctx.db.delivererPlannedRoute.create({
          data: {
            delivererId: user.id,
            title: input.title,
            description: input.description,
            departureAddress: input.departureAddress,
            departureCity: input.departureCity,
            departurePostalCode: input.departurePostalCode,
            departureLatitude: input.departureLatitude,
            departureLongitude: input.departureLongitude,
            arrivalAddress: input.arrivalAddress,
            arrivalCity: input.arrivalCity,
            arrivalPostalCode: input.arrivalPostalCode,
            arrivalLatitude: input.arrivalLatitude,
            arrivalLongitude: input.arrivalLongitude,
            departureTime: input.departureTime,
            arrivalTime: input.arrivalTime,
            isRecurring: input.isRecurring,
            recurringDays: input.recurringDays,
            recurringEndDate: input.recurringEndDate,
            availableCapacity: input.availableCapacity,
            maxPackageWeight: input.maxPackageWeight,
            vehicleRequired: input.vehicleRequired,
            pricePerKm: input.pricePerKm,
            fixedPrice: input.fixedPrice,
            minimumPrice: input.minimumPrice,
            waypoints: input.waypoints,
            availableSeats: input.availableSeats,
            isPublic: input.isPublic,
            estimatedDistance,
            estimatedDuration,
            notifyOnMatch: input.notifyOnMatch,
            autoAcceptMatch: input.autoAcceptMatch,
            status: "DRAFT",
            publishedAt: input.isPublic ? new Date() : null},
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true}}}});

        // Système de matching automatique intelligent pour routes publiques
        if (input.isPublic) {
          await triggerAdvancedRouteMatching(route, ctx.db);
        }

          // Fonction helper pour calculer la distance
          function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
            const R = 6371; // Rayon de la Terre en km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          }
        }

        return {
          success: true,
          route};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la route planifiée" });
      }
    }),

  /**
   * Mettre à jour une route planifiée
   */
  update: protectedProcedure
    .input(updatePlannedRouteSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;
      const { id: id, ...updateData } = input;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent modifier leurs routes" });
      }

      try {
        // Vérifier que la route appartient au livreur
        const existingRoute = await ctx.db.delivererPlannedRoute.findFirst({
          where: { id, delivererId: user.id }});

        if (!existingRoute) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route planifiée non trouvée ou non autorisée" });
        }

        // Validation business rules
        if (
          updateData.departureTime &&
          updateData.arrivalTime &&
          updateData.departureTime >= updateData.arrivalTime
        ) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "L'heure d'arrivée doit être postérieure à l'heure de départ" });
        }

        const updatedRoute = await ctx.db.delivererPlannedRoute.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
            ...(updateData.isPublic &&
              !existingRoute.publishedAt && {
                publishedAt: new Date()})},
          include: {
            matchedAnnouncements: true,
            routeAnnouncements: true}});

        return {
          success: true,
          route: updatedRoute};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la route" });
      }
    }),

  /**
   * Supprimer une route planifiée
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent supprimer leurs routes" });
      }

      try {
        // Vérifier que la route appartient au livreur et qu'elle peut être supprimée
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: { id: input.id, delivererId: user.id },
          include: { matchedAnnouncements }});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route planifiée non trouvée" });
        }

        if (route.status === "IN_PROGRESS") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible de supprimer une route en cours" });
        }

        if (route.matchedAnnouncements.length > 0) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message:
              "Impossible de supprimer une route avec des annonces matchées" });
        }

        await ctx.db.delivererPlannedRoute.delete({
          where: { id: input.id }});

        return { success };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression" });
      }
    }),

  /**
   * Publier/dépublier une route
   */
  togglePublish: protectedProcedure
    .input(
      z.object({ id: z.string().cuid(),
        isPublic: z.boolean() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent publier leurs routes" });
      }

      try {
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: { id: input.id, delivererId: user.id }});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route planifiée non trouvée" });
        }

        const updatedRoute = await ctx.db.delivererPlannedRoute.update({
          where: { id: input.id },
          data: {
            isPublic: input.isPublic,
            status: input.isPublic ? "PUBLISHED" : "DRAFT",
            publishedAt: input.isPublic
              ? route.publishedAt || new Date()
              : null}});

        // Système de matching intelligent selon l'état de publication
        if (input.isPublic) {
          await triggerAdvancedRouteMatching(updatedRoute, ctx.db);
        } else {
          await stopRouteMatching(updatedRoute.id, ctx.db);
        }

        return {
          success: true,
          route: updatedRoute};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la publication" });
      }
    }),

  /**
   * Obtenir les détails d'une route avec ses performances
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      try {
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: {
            id: input.id,
            OR: [
              { delivererId: user.id }, // Le propriétaire
              { isPublic }, // Ou public si autre utilisateur
            ]},
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true}},
            matchedAnnouncements: {
              include: {
                announcement: {
                  include: {
                    client: {
                      select: {
                        id: true,
                        name: true,
                        email: true}}}}}},
            routeAnnouncements: true,
            performanceHistory: {
              orderBy: { date: "desc" },
              take: 10}}});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route planifiée non trouvée" });
        }

        return { route };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la route" });
      }
    }),

  /**
   * Rechercher des routes publiques pour matching
   */
  searchPublicRoutes: protectedProcedure
    .input(
      z.object({ departureLatitude: z.number(),
        departureLongitude: z.number(),
        deliveryLatitude: z.number(),
        deliveryLongitude: z.number(),
        departureTime: z.date(),
        maxDetourKm: z.number().default(15),
        limit: z.number().min(1).max(20).default(10) }),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        // Recherche géospatiale avancée implémentée avec calculs de distance et scoring
        console.log(`🔍 Recherche géospatiale avancée - Départ: ${input.departureLatitude}, ${input.departureLongitude}`);
        
        // Récupérer toutes les routes publiques dans la fenêtre temporelle
        const allRoutes = await ctx.db.delivererPlannedRoute.findMany({
          where: {
            isPublic: true,
            status: "PUBLISHED",
            departureTime: {
              gte: new Date(input.departureTime.getTime() - 2 * 60 * 60 * 1000), // -2h
              lte: new Date(input.departureTime.getTime() + 4 * 60 * 60 * 1000), // +4h
            },
            availableCapacity: { gt: 0 },
            // Filtrage géographique préliminaire (zone étendue)
            departureLatitude: {
              gte: input.departureLatitude - 0.5, // ~55km de rayon
              lte: input.departureLatitude + 0.5
            },
            departureLongitude: {
              gte: input.departureLongitude - 0.5,
              lte: input.departureLongitude + 0.5
            }
          },
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                image: true,
                delivererStats: {
                  select: {
                    averageRating: true,
                    totalDeliveries: true,
                    onTimeRate: true
                  }
                }
              }
            }
          }
        });

        console.log(`📊 ${allRoutes.length} routes trouvées dans la zone temporelle`);

        // Analyser chaque route avec scoring géospatial avancé
        const scoredRoutes = [];
        
        for (const route of allRoutes) {
          // Calcul de la compatibilité géographique
          const compatibility = await calculateAdvancedRouteCompatibility({
            route,
            requestedPickup: {
              lat: input.departureLatitude,
              lng: input.departureLongitude
            },
            requestedDelivery: {
              lat: input.deliveryLatitude,
              lng: input.deliveryLongitude
            },
            maxDetourKm: input.maxDetourKm,
            requestedTime: input.departureTime
          });

          if (compatibility.isCompatible) {
            scoredRoutes.push({
              ...route,
              compatibility: {
                score: compatibility.overallScore,
                detourDistance: compatibility.detourDistance,
                timeCompatibility: compatibility.timeCompatibility,
                priceEstimate: compatibility.estimatedPrice,
                estimatedDuration: compatibility.estimatedDuration,
                carbonSavings: compatibility.carbonSavings
              }
            });
          }
        }

        // Trier par score de compatibilité décroissant
        const sortedRoutes = scoredRoutes
          .sort((a, b) => b.compatibility.score - a.compatibility.score)
          .slice(0, input.limit);

        console.log(`✅ ${sortedRoutes.length} routes compatibles trouvées (score moyen: ${
          sortedRoutes.length > 0 
            ? Math.round(sortedRoutes.reduce((sum, r) => sum + r.compatibility.score, 0) / sortedRoutes.length)
            : 0
        }%)`);

        return { 
          routes: sortedRoutes,
          searchMetadata: {
            totalAnalyzed: allRoutes.length,
            totalCompatible: sortedRoutes.length,
            averageScore: sortedRoutes.length > 0 
              ? Math.round(sortedRoutes.reduce((sum, r) => sum + r.compatibility.score, 0) / sortedRoutes.length)
              : 0,
            searchRadius: '~55km',
            detourLimit: `${input.maxDetourKm}km`
          }
        };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de routes" });
      }
    })});

// Helper function pour calculer la distance d'une route
async function calculateRouteDistance(stops: any[]): Promise<number> {
  if (stops.length < 2) return 0;

  const totalDistance = 0;

  for (const i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];

    // Utiliser la formule de Haversine pour calculer la distance entre deux points
    const distance = calculateHaversineDistance(
      start.latitude,
      start.longitude,
      end.latitude,
      end.longitude,
    );

    totalDistance += distance;
  }

  return totalDistance;
}

function calculateHaversineDistance(
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
 * Système de matching avancé pour routes planifiées
 * Analyse les annonces compatibles et crée des suggestions intelligentes
 */
async function triggerAdvancedRouteMatching(route: any, db: any): Promise<void> {
  try {
    console.log(`🎯 Démarrage du matching avancé pour route planifiée: ${route.id}`);
    
    const MATCHING_RADIUS_KM = 15; // Rayon de recherche étendu
    const MAX_SUGGESTIONS = 10; // Nombre maximum de suggestions
    
    // Récupérer les annonces publiées dans la zone géographique
    const potentialAnnouncements = await db.announcement.findMany({
      where: {
        status: "PUBLISHED",
        delivery: {
          status: "PENDING"
        },
        pickupLatitude: { not: null },
        pickupLongitude: { not: null },
        deliveryLatitude: { not: null },
        deliveryLongitude: { not: null }
      },
      include: {
        client: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        delivery: true
      },
      take: 50 // Limiter pour les performances
    });

    console.log(`📍 ${potentialAnnouncements.length} annonces potentielles trouvées`);

    // Analyser la compatibilité de chaque annonce
    const compatibleAnnouncements = [];
    
    for (const announcement of potentialAnnouncements) {
      // Calculer la distance entre route et points de collecte/livraison
      const pickupDistance = calculateDistance(
        route.departureLatitude,
        route.departureLongitude,
        announcement.pickupLatitude,
        announcement.pickupLongitude
      );
      
      const deliveryDistance = calculateDistance(
        route.arrivalLatitude,
        route.arrivalLongitude,
        announcement.deliveryLatitude,
        announcement.deliveryLongitude
      );
      
      // Vérifier si l'annonce est compatible géographiquement
      if (pickupDistance <= MATCHING_RADIUS_KM || deliveryDistance <= MATCHING_RADIUS_KM) {
        // Calcul du score de compatibilité avancé
        const temporalScore = calculateTemporalCompatibility(route, announcement);
        const geographicScore = calculateGeographicScore(pickupDistance, deliveryDistance);
        const urgencyScore = announcement.urgency === 'HIGH' ? 1.5 : 1.0;
        const priceScore = Math.min(1.0, (announcement.price || 0) / 50);
        
        const totalScore = (
          geographicScore * 0.4 +
          temporalScore * 0.3 +
          priceScore * 0.2 +
          urgencyScore * 0.1
        ) * 100;
        
        if (totalScore >= 60) { // Seuil minimum de compatibilité
          compatibleAnnouncements.push({
            ...announcement,
            pickupDistance,
            deliveryDistance,
            compatibilityScore: Math.round(totalScore)
          });
        }
      }
    }
    
    // Trier par score de compatibilité
    compatibleAnnouncements.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    const topSuggestions = compatibleAnnouncements.slice(0, MAX_SUGGESTIONS);
    
    console.log(`🎯 ${topSuggestions.length} suggestions de haute qualité générées`);
    
    // Créer les suggestions de matching en base
    if (topSuggestions.length > 0) {
      await createRouteSuggestions(route.id, topSuggestions, db);
      
      // Notifier le livreur des nouvelles opportunités
      await notifyDelivererOfRouteMatches(route.delivererId, topSuggestions.length, db);
      
      // Notifier les clients des nouvelles options de livraison
      for (const suggestion of topSuggestions.slice(0, 5)) {
        await notifyClientOfNewDeliveryOption(
          suggestion.client.id,
          route.id,
          suggestion.compatibilityScore,
          db
        );
      }
    }
    
    // Log de l'activité pour audit
    await db.auditLog.create({
      data: {
        userId: route.delivererId,
        action: 'ROUTE_MATCHING_TRIGGERED',
        tableName: 'DelivererPlannedRoute',
        recordId: route.id,
        changes: {
          announcementsAnalyzed: potentialAnnouncements.length,
          suggestionsCreated: topSuggestions.length,
          topScore: topSuggestions[0]?.compatibilityScore || 0
        },
        ipAddress: 'system',
        userAgent: 'Route Matching System'
      }
    });
    
    console.log(`✅ Matching avancé terminé avec succès pour route ${route.id}`);
    
  } catch (error) {
    console.error('❌ Erreur lors du matching avancé:', error);
    
    // Log d'erreur pour débogage
    await db.systemLog.create({
      data: {
        type: 'ROUTE_MATCHING_ERROR',
        message: `Erreur matching route ${route.id}`,
        level: 'ERROR',
        metadata: {
          routeId: route.id,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      }
    });
  }
}

/**
 * Arrête le matching automatique pour une route
 */
async function stopRouteMatching(routeId: string, db: any): Promise<void> {
  try {
    console.log(`🛑 Arrêt du matching pour route: ${routeId}`);
    
    // Supprimer les suggestions non acceptées
    const deletedSuggestions = await db.deliveryApplication.deleteMany({
      where: {
        routeId,
        status: 'SUGGESTED'
      }
    });
    
    // Annuler les notifications en attente
    await db.notification.updateMany({
      where: {
        data: {
          path: ['routeId'],
          equals: routeId
        },
        read: false
      },
      data: {
        cancelled: true,
        cancelledAt: new Date()
      }
    });
    
    console.log(`✅ Matching arrêté: ${deletedSuggestions.count} suggestions supprimées`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt du matching:', error);
  }
}

/**
 * Calcule la compatibilité temporelle entre route et annonce
 */
function calculateTemporalCompatibility(route: any, announcement: any): number {
  try {
    const routeDate = new Date(route.departureTime || route.createdAt);
    const requestedDate = new Date(announcement.requestedPickupDate || announcement.createdAt);
    
    // Différence en jours
    const daysDifference = Math.abs((routeDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Score inversé (plus proche = meilleur score)
    if (daysDifference <= 1) return 1.0; // Même jour ou lendemain
    if (daysDifference <= 3) return 0.8; // Dans les 3 jours
    if (daysDifference <= 7) return 0.6; // Dans la semaine
    return 0.3; // Plus éloigné
    
  } catch (error) {
    return 0.5; // Score neutre en cas d'erreur
  }
}

/**
 * Calcule le score géographique basé sur les distances
 */
function calculateGeographicScore(pickupDistance: number, deliveryDistance: number): number {
  const avgDistance = (pickupDistance + deliveryDistance) / 2;
  
  if (avgDistance <= 5) return 1.0;   // Très proche
  if (avgDistance <= 10) return 0.8;  // Proche
  if (avgDistance <= 15) return 0.6;  // Acceptable
  return 0.4; // Loin mais faisable
}

/**
 * Crée les suggestions de matching en base de données
 */
async function createRouteSuggestions(routeId: string, suggestions: any[], db: any): Promise<void> {
  try {
    const routeSuggestions = suggestions.map(suggestion => ({
      routeId,
      announcementId: suggestion.id,
      compatibilityScore: suggestion.compatibilityScore,
      pickupDistance: suggestion.pickupDistance,
      deliveryDistance: suggestion.deliveryDistance,
      status: 'SUGGESTED',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h d'expiration
    }));
    
    // Éviter les doublons
    for (const routeSuggestion of routeSuggestions) {
      await db.routeMatching.upsert({
        where: {
          routeId_announcementId: {
            routeId: routeSuggestion.routeId,
            announcementId: routeSuggestion.announcementId
          }
        },
        update: {
          compatibilityScore: routeSuggestion.compatibilityScore,
          updatedAt: new Date()
        },
        create: routeSuggestion
      });
    }
    
    console.log(`💾 ${routeSuggestions.length} suggestions de route sauvegardées`);
    
  } catch (error) {
    console.error('Erreur lors de la création des suggestions:', error);
  }
}

/**
 * Notifie le livreur des nouvelles opportunités de matching
 */
async function notifyDelivererOfRouteMatches(delivererId: string, matchCount: number, db: any): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: delivererId,
        type: 'ROUTE_MATCHING_RESULTS',
        title: 'Nouvelles opportunités de livraison',
        message: `${matchCount} nouvelle(s) annonce(s) compatible(s) avec votre route planifiée`,
        data: {
          matchCount,
          actionUrl: '/deliverer/routes/planned'
        },
        priority: 'MEDIUM'
      }
    });
    
    console.log(`📲 Livreur ${delivererId} notifié de ${matchCount} nouvelles opportunités`);
    
  } catch (error) {
    console.error('Erreur lors de la notification du livreur:', error);
  }
}

/**
 * Notifie un client d'une nouvelle option de livraison
 */
async function notifyClientOfNewDeliveryOption(
  clientId: string, 
  routeId: string, 
  compatibilityScore: number, 
  db: any
): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: clientId,
        type: 'NEW_DELIVERY_OPTION',
        title: 'Nouvelle option de livraison disponible',
        message: `Un livreur avec une route compatible (${compatibilityScore}% de compatibilité) est disponible pour votre annonce`,
        data: {
          routeId,
          compatibilityScore,
          actionUrl: '/client/announcements'
        },
        priority: compatibilityScore >= 80 ? 'HIGH' : 'MEDIUM'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la notification du client:', error);
  }
}

/**
 * Calcule la compatibilité avancée entre une route et une demande de livraison
 * Analyse géospatiale, temporelle et économique complète
 */
async function calculateAdvancedRouteCompatibility(params: {
  route: any;
  requestedPickup: { lat: number; lng: number };
  requestedDelivery: { lat: number; lng: number };
  maxDetourKm: number;
  requestedTime: Date;
}): Promise<{
  isCompatible: boolean;
  overallScore: number;
  detourDistance: number;
  timeCompatibility: number;
  estimatedPrice: number;
  estimatedDuration: number;
  carbonSavings: number;
}> {
  try {
    const { route, requestedPickup, requestedDelivery, maxDetourKm, requestedTime } = params;
    
    // 1. Analyse géospatiale - Calcul du détour nécessaire
    const originalDistance = calculateDistance(
      route.departureLatitude,
      route.departureLongitude,
      route.arrivalLatitude,
      route.arrivalLongitude
    );
    
    // Distance avec détour
    const detourDistance1 = calculateDistance(
      route.departureLatitude,
      route.departureLongitude,
      requestedPickup.lat,
      requestedPickup.lng
    );
    
    const detourDistance2 = calculateDistance(
      requestedPickup.lat,
      requestedPickup.lng,
      requestedDelivery.lat,
      requestedDelivery.lng
    );
    
    const detourDistance3 = calculateDistance(
      requestedDelivery.lat,
      requestedDelivery.lng,
      route.arrivalLatitude,
      route.arrivalLongitude
    );
    
    const totalDetourDistance = detourDistance1 + detourDistance2 + detourDistance3;
    const detourAmount = totalDetourDistance - originalDistance;
    
    // Vérification du détour maximum
    if (detourAmount > maxDetourKm) {
      return {
        isCompatible: false,
        overallScore: 0,
        detourDistance: detourAmount,
        timeCompatibility: 0,
        estimatedPrice: 0,
        estimatedDuration: 0,
        carbonSavings: 0
      };
    }
    
    // 2. Score géographique (plus le détour est faible, meilleur est le score)
    const geographicScore = Math.max(0, (maxDetourKm - detourAmount) / maxDetourKm * 100);
    
    // 3. Analyse temporelle
    const routeTime = new Date(route.departureTime);
    const timeDifferenceMs = Math.abs(routeTime.getTime() - requestedTime.getTime());
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
    
    // Score temporel (max 6h de différence acceptable)
    const timeCompatibility = Math.max(0, (6 - timeDifferenceHours) / 6 * 100);
    
    // 4. Calcul du prix estimé basé sur la distance et le détour
    const basePrice = 3.50; // Prix de base
    const pricePerKm = 1.20; // Prix par km
    const detourSurcharge = detourAmount * 0.80; // Surcharge détour
    const estimatedPrice = basePrice + (detourDistance2 * pricePerKm) + detourSurcharge;
    
    // 5. Estimation de la durée (vitesse moyenne 50 km/h)
    const estimatedDuration = Math.round((totalDetourDistance / 50) * 60); // en minutes
    
    // 6. Calcul des économies carbone (vs 2 trajets séparés)
    const separateTripsDistance = detourDistance1 + detourDistance2 + detourDistance3;
    const carbonSavingsKm = Math.max(0, separateTripsDistance - totalDetourDistance);
    const carbonSavings = carbonSavingsKm * 0.12; // 120g CO2/km économisés
    
    // 7. Score de fiabilité du livreur
    const delivererStats = route.deliverer.delivererStats;
    const reliabilityScore = delivererStats ? (
      (delivererStats.averageRating || 3) / 5 * 30 +
      Math.min(30, (delivererStats.totalDeliveries || 0) / 10) +
      (delivererStats.onTimeRate || 0.8) * 40
    ) : 50; // Score neutre si pas de stats
    
    // 8. Score global pondéré
    const overallScore = Math.round(
      geographicScore * 0.35 +      // 35% - Proximité géographique
      timeCompatibility * 0.25 +    // 25% - Compatibilité temporelle
      reliabilityScore * 0.20 +     // 20% - Fiabilité du livreur
      Math.min(100, carbonSavings * 10) * 0.10 + // 10% - Impact écologique
      (route.availableCapacity / (route.maxCapacity || 5)) * 100 * 0.10 // 10% - Capacité disponible
    );
    
    console.log(`📊 Compatibilité calculée - Score: ${overallScore}%, Détour: ${detourAmount.toFixed(1)}km, Prix: ${estimatedPrice.toFixed(2)}€`);
    
    return {
      isCompatible: overallScore >= 40, // Seuil minimum de 40%
      overallScore,
      detourDistance: Math.round(detourAmount * 100) / 100,
      timeCompatibility: Math.round(timeCompatibility),
      estimatedPrice: Math.round(estimatedPrice * 100) / 100,
      estimatedDuration,
      carbonSavings: Math.round(carbonSavings * 100) / 100
    };
    
  } catch (error) {
    console.error('❌ Erreur lors du calcul de compatibilité:', error);
    return {
      isCompatible: false,
      overallScore: 0,
      detourDistance: 0,
      timeCompatibility: 0,
      estimatedPrice: 0,
      estimatedDuration: 0,
      carbonSavings: 0
    };
  }
}
