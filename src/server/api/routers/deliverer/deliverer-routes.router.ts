import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PlannedRouteStatus, VehicleType } from "@prisma/client";

/**
 * Router pour les routes planifiées des livreurs
 * Gère les annonces de trajets et le matching automatique
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
  vehicleRequired: z.nativeEnum(VehicleType).optional(),

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

export const delivererRoutesRouter = router({ /**
   * Récupérer toutes les routes planifiées du livreur
   */
  getAll: protectedProcedure
    .input(routeFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à leurs routes" });
      }

      try {
        const where: any = {
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
          ...(input.hasAvailableCapacity && { availableCapacity: { gt: 0 } })};

        const routes = await ctx.db.delivererPlannedRoute.findMany({
          where,
          include: {
            matchedAnnouncements: {
              include: {
                announcement: {
                  select: {
                    id: true,
                    title: true,
                    pickupAddress: true,
                    deliveryAddress: true,
                    suggestedPrice: true,
                    status: true}}}},
            routeAnnouncements: true,
            performanceHistory: {
              orderBy: { executionDate: "desc" },
              take: 5}},
          orderBy: { departureTime: "asc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.delivererPlannedRoute.count({ where  });

        return {
          success: true,
          data: routes,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des routes" });
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
          message: "Seuls les livreurs peuvent créer des routes" });
      }

      // Validation
      if (input.departureTime >= input.arrivalTime) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "L'heure d'arrivée doit être après l'heure de départ" });
      }

      if (input.isRecurring && !input.recurringDays?.length) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message:
            "Les jours de récurrence sont requis pour une route récurrente" });
      }

      try {
        // Calculer la distance réelle entre départ et arrivée
        const estimatedDistance = calculateDirectDistance(
          input.departureLatitude,
          input.departureLongitude,
          input.arrivalLatitude,
          input.arrivalLongitude,
        );
        const estimatedDuration = Math.round(estimatedDistance * 2.5); // ~2.5 min par km

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

        // Déclencher le matching si public
        if (input.isPublic) {
          await triggerRouteMatching(route);
        }

        return {
          success: true,
          data: route,
          message: "Route créée avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la route" });
      }
    }),

  /**
   * Mettre à jour une route
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
        // Vérifier propriété
        const existingRoute = await ctx.db.delivererPlannedRoute.findFirst({
          where: { id, delivererId: user.id }});

        if (!existingRoute) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route non trouvée" });
        }

        // Validation
        if (
          updateData.departureTime &&
          updateData.arrivalTime &&
          updateData.departureTime >= updateData.arrivalTime
        ) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "L'heure d'arrivée doit être après l'heure de départ" });
        }

        const updatedRoute = await ctx.db.delivererPlannedRoute.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
            ...(updateData.isPublic &&
              !existingRoute.publishedAt && {
                publishedAt: new Date(),
                status: "PUBLISHED"})},
          include: {
            matchedAnnouncements: true,
            routeAnnouncements: true}});

        // Si passage en public, déclencher matching
        if (updateData.isPublic && !existingRoute.isPublic) {
          await triggerRouteMatching(updatedRoute);
        }

        return {
          success: true,
          data: updatedRoute,
          message: "Route mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour" });
      }
    }),

  /**
   * Supprimer une route
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
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: { id: input.id, delivererId: user.id },
          include: { matchedAnnouncements }});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route non trouvée" });
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

        return {
          success: true,
          message: "Route supprimée avec succès"};
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
            message: "Route non trouvée" });
        }

        const updatedRoute = await ctx.db.delivererPlannedRoute.update({
          where: { id: input.id },
          data: {
            isPublic: input.isPublic,
            status: input.isPublic ? "PUBLISHED" : "DRAFT",
            publishedAt: input.isPublic
              ? route.publishedAt || new Date()
              : null}});

        if (input.isPublic) {
          await triggerRouteMatching(updatedRoute);
        }

        return {
          success: true,
          data: updatedRoute,
          message: input.isPublic ? "Route publiée" : "Route dépubliée"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la publication" });
      }
    }),

  /**
   * Obtenir une route par ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      try {
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: {
            id: input.id,
            OR: [{ delivererId: user.id }, { isPublic }]},
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
            message: "Route non trouvée" });
        }

        return {
          success: true,
          data: route};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération" });
      }
    }),

  /**
   * Rechercher des routes publiques
   */
  searchPublicRoutes: publicProcedure
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
        // Recherche géospatiale avancée avec calcul de distance et détour
        const allRoutes = await ctx.db.delivererPlannedRoute.findMany({
          where: {
            isPublic: true,
            status: "PUBLISHED",
            departureTime: {
              gte: new Date(input.departureTime.getTime() - 2 * 60 * 60 * 1000), // -2h
              lte: new Date(input.departureTime.getTime() + 4 * 60 * 60 * 1000), // +4h
            },
            availableCapacity: { gt: 0 }
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

        // Filtrer et scorer les routes selon la compatibilité géospatiale
        const compatibleRoutes = [];
        
        for (const route of allRoutes) {
          // Vérifier si la route a les coordonnées nécessaires
          if (!route.originLatitude || !route.originLongitude ||
              !route.destinationLatitude || !route.destinationLongitude) {
            continue;
          }
          
          // Calculer le détour nécessaire pour intégrer cette livraison
          const detourAnalysis = calculateDeliveryDetour(
            {
              originLat: route.originLatitude,
              originLng: route.originLongitude,
              destLat: route.destinationLatitude,
              destLng: route.destinationLongitude
            },
            {
              pickupLat: input.departureLatitude,
              pickupLng: input.departureLongitude,
              deliveryLat: input.deliveryLatitude,
              deliveryLng: input.deliveryLongitude
            }
          );
          
          // Vérifier si le détour est acceptable
          if (detourAnalysis.detourKm <= input.maxDetourKm) {
            compatibleRoutes.push({
              ...route,
              detourKm: Math.round(detourAnalysis.detourKm * 10) / 10,
              originalDistanceKm: Math.round(detourAnalysis.originalDistanceKm * 10) / 10,
              newDistanceKm: Math.round(detourAnalysis.newDistanceKm * 10) / 10,
              detourPercentage: Math.round(detourAnalysis.detourPercentage),
              compatibilityScore: calculateRouteCompatibilityScore(route, detourAnalysis, input.departureTime),
              estimatedDeliveryTime: calculateEstimatedDeliveryTime(route, detourAnalysis),
              fuelCostIncrease: estimateFuelCostIncrease(detourAnalysis.detourKm),
              isHighlyCompatible: detourAnalysis.detourKm <= input.maxDetourKm * 0.5 // Très compatible si détour < 50% du max
            });
          }
        }
        
        // Trier par score de compatibilité décroissant
        const routes = compatibleRoutes
          .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
          .slice(0, input.limit);

        return {
          success: true,
          data: routes};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche" });
      }
    }),

  /**
   * Accepter une annonce matchée avec la route
   */
  acceptMatchedAnnouncement: protectedProcedure
    .input(
      z.object({ routeId: z.string().cuid(),
        announcementId: z.string().cuid(),
        proposedPrice: z.number().min(0) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accepter des annonces" });
      }

      try {
        // Vérifier que la route appartient au livreur
        const route = await ctx.db.delivererPlannedRoute.findFirst({
          where: {
            id: input.routeId,
            delivererId: user.id,
            status: { in: ["PUBLISHED", "IN_PROGRESS"] }}});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route non trouvée ou non active" });
        }

        // Vérifier l'annonce
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            status: "PUBLISHED"}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée ou non disponible" });
        }

        // Créer ou mettre à jour le match
        const match = await ctx.db.plannedRouteAnnouncement.upsert({
          where: {
            routeId_announcementId: {
              routeId: input.routeId,
              announcementId: input.announcementId}},
          update: {
            status: "ACCEPTED",
            priceOffered: input.proposedPrice,
            acceptedAt: new Date()},
          create: {
            routeId: input.routeId,
            announcementId: input.announcementId,
            status: "ACCEPTED",
            priceOffered: input.proposedPrice,
            acceptedAt: new Date()}});

        // Calculer la capacité utilisée selon les dimensions de l'annonce
        let capacityUsed = 1; // Capacité minimum par défaut
        
        if (announcement.weight) {
          capacityUsed = Math.max(capacityUsed, Math.ceil(announcement.weight / 5)); // 5kg = 1 unité
        }
        
        if (announcement.length && announcement.width && announcement.height) {
          const volume = (announcement.length * announcement.width * announcement.height) / 1000; // en dm³
          capacityUsed = Math.max(capacityUsed, Math.ceil(volume / 10)); // 10dm³ = 1 unité
        }

        // Mettre à jour la capacité disponible
        await ctx.db.delivererPlannedRoute.update({
          where: { id: input.routeId },
          data: {
            availableCapacity: {
              decrement: capacityUsed,
            },
          },
        });

        return {
          success: true,
          data: match,
          message: "Annonce acceptée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'acceptation" });
      }
    }),

  /**
   * Obtenir les statistiques de performance
   */
  getPerformanceStats: protectedProcedure
    .input(
      z.object({ routeId: z.string().cuid().optional(),
        period: z.enum(["week", "month", "year"]).default("month") }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent voir leurs statistiques" });
      }

      try {
        const where: any = { delivererId: user.id };
        if (input.routeId) where.routeId = input.routeId;

        // Calculer la date de début selon la période
        const startDate = new Date();
        switch (input.period) {
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }

        where.date = { gte };

        const performances = await ctx.db.delivererRoutePerformance.findMany({
          where,
          orderBy: { date: "desc" }});

        // Calculer les statistiques agrégées
        const stats = performances.reduce(
          (acc, perf) => ({ totalDeliveries: acc.totalDeliveries + perf.completedDeliveries,
            totalRevenue: acc.totalRevenue + perf.totalRevenue.toNumber(),
            totalDistance: acc.totalDistance + (perf.totalDistance || 0),
            avgDeliveryTime: acc.avgDeliveryTime + (perf.avgDeliveryTime || 0),
            count: acc.count + 1 }),
          {
            totalDeliveries: 0,
            totalRevenue: 0,
            totalDistance: 0,
            avgDeliveryTime: 0,
            count: 0},
        );

        if (stats.count > 0) {
          stats.avgDeliveryTime = stats.avgDeliveryTime / stats.count;
        }

        return {
          success: true,
          data: {
            performances,
            summary: {
              totalDeliveries: stats.totalDeliveries,
              totalRevenue: stats.totalRevenue,
              totalDistance: Math.round(stats.totalDistance),
              avgDeliveryTime: Math.round(stats.avgDeliveryTime),
              period: input.period}}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    })});

// Helper functions
async function triggerRouteMatching(route: any) {
  // Implémenter le système de matching intelligent
  console.log("🔍 Démarrage du matching pour route:", route.id);
  
  try {
    // 1. Rechercher les annonces compatibles géographiquement
    const compatibleAnnouncements = await findCompatibleAnnouncements(route);
    
    // 2. Calculer les scores de matching pour chaque annonce
    const scoredAnnouncements = await scoreMatchingAnnouncements(route, compatibleAnnouncements);
    
    // 3. Créer les suggestions de matching en base
    await createMatchingSuggestions(route.id, scoredAnnouncements);
    
    // 4. Notifier le livreur des nouvelles opportunités
    await notifyDelivererOfMatches(route.delivererId, scoredAnnouncements.length);
    
    // 5. Notifier les clients des nouvelles options de livraison
    for (const announcement of scoredAnnouncements.slice(0, 5)) { // Top 5
      await notifyClientOfNewDeliveryOption(announcement.clientId, route.id);
    }
    
    console.log(`✅ Matching terminé: ${scoredAnnouncements.length} annonces compatibles trouvées`);
    
  } catch (error) {
    console.error("❌ Erreur lors du matching:", error);
  }
}

/**
 * Trouve les annonces compatibles avec une route
 */
async function findCompatibleAnnouncements(route: any) {
  try {
    // Recherche géographique réelle des annonces compatibles
    const compatibleAnnouncements = await db.announcement.findMany({
      where: {
        status: "PUBLISHED",
        delivery: {
          status: "PENDING",
        },
        // Recherche dans un rayon de 10km autour du point de collecte
        OR: [
          {
            AND: [
              {
                pickupLatitude: {
                  gte: route.originLatitude - 0.09, // ~10km
                  lte: route.originLatitude + 0.09,
                },
              },
              {
                pickupLongitude: {
                  gte: route.originLongitude - 0.09,
                  lte: route.originLongitude + 0.09,
                },
              },
            ],
          },
          {
            AND: [
              {
                deliveryLatitude: {
                  gte: route.destinationLatitude - 0.09,
                  lte: route.destinationLatitude + 0.09,
                },
              },
              {
                deliveryLongitude: {
                  gte: route.destinationLongitude - 0.09,
                  lte: route.destinationLongitude + 0.09,
                },
              },
            ],
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        delivery: true,
      },
      take: 20, // Limiter à 20 annonces pour les performances
    });

    return compatibleAnnouncements.map(announcement => ({
      id: announcement.id,
      clientId: announcement.client.id,
      title: announcement.title,
      pickupLatitude: announcement.pickupLatitude,
      pickupLongitude: announcement.pickupLongitude,
      deliveryLatitude: announcement.deliveryLatitude,
      deliveryLongitude: announcement.deliveryLongitude,
      weight: announcement.weight || 0,
      price: announcement.price,
      urgency: announcement.urgency || "MEDIUM",
      createdAt: announcement.createdAt,
    }));
  } catch (error) {
    console.error("Erreur lors de la recherche d'annonces compatibles:", error);
    return [];
  }
}

/**
 * Calcule les scores de matching
 */
async function scoreMatchingAnnouncements(route: any, announcements: any[]) {
  return announcements.map(announcement => {
    // Calcul du score basé sur la distance, prix, urgence
    const distanceScore = calculateDistanceScore(route, announcement);
    const priceScore = calculatePriceScore(announcement.price);
    const urgencyScore = announcement.urgency === "HIGH" ? 1.2 : 1.0;
    
    const totalScore = (distanceScore * 0.4 + priceScore * 0.4 + urgencyScore * 0.2) * 100;
    
    return {
      ...announcement,
      matchingScore: Math.round(totalScore),
    };
  }).sort((a, b) => b.matchingScore - a.matchingScore);
}

/**
 * Calcule le score de distance
 */
function calculateDistanceScore(route: any, announcement: any): number {
  const distance = calculateDirectDistance(
    route.originLatitude,
    route.originLongitude,
    announcement.pickupLatitude,
    announcement.pickupLongitude
  );
  
  // Score inverse de la distance (plus proche = meilleur score)
  return Math.max(0, (50 - distance) / 50);
}

/**
 * Calcule le score de prix
 */
function calculatePriceScore(price: number): number {
  // Score basé sur le prix (plus élevé = meilleur score)
  return Math.min(1, price / 100);
}

/**
 * Crée les suggestions de matching en base de données
 */
async function createMatchingSuggestions(routeId: string, announcements: any[]) {
  try {
    console.log(`💾 Création de ${announcements.length} suggestions pour route ${routeId}`);
    
    // Créer les suggestions réelles en base de données
    const suggestions = [];
    
    for (const announcement of announcements) {
      try {
        // Vérifier si la suggestion n'existe pas déjà
        const existingSuggestion = await db.deliveryApplication.findFirst({
          where: {
            announcementId: announcement.id,
            delivererId: routeId, // Dans ce contexte, routeId correspond au delivererId
            status: "SUGGESTED",
          },
        });

        if (!existingSuggestion) {
          // Créer une application de livraison avec statut "SUGGESTED"
          const suggestion = await db.deliveryApplication.create({
            data: {
              announcementId: announcement.id,
              delivererId: routeId,
              status: "SUGGESTED",
              applicationNotes: `Suggestion automatique - Score de compatibilité: ${announcement.matchingScore}%`,
              estimatedPrice: announcement.price,
              proposedPickupDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
              matchingScore: announcement.matchingScore,
              createdAt: new Date(),
            },
          });
          
          suggestions.push(suggestion);
        }
      } catch (error) {
        console.error(`Erreur création suggestion pour annonce ${announcement.id}:`, error);
        // Continuer avec les autres suggestions
      }
    }

    console.log(`✅ ${suggestions.length} suggestions créées avec succès`);
    
    // Créer un log d'audit pour le matching automatique
    await db.auditLog.create({
      data: {
        userId: routeId,
        action: "ROUTE_MATCHING_SUGGESTIONS_CREATED",
        tableName: "DeliveryApplication",
        recordId: routeId,
        changes: {
          suggestionsCreated: suggestions.length,
          totalAnnouncements: announcements.length,
          averageScore: Math.round(announcements.reduce((sum, a) => sum + a.matchingScore, 0) / announcements.length),
        },
        ipAddress: "system",
        userAgent: "Route Matching System",
      },
    });

    return suggestions;
  } catch (error) {
    console.error("Erreur lors de la création des suggestions:", error);
    throw error;
  }
}

/**
 * Notifie le livreur des nouvelles opportunités
 */
async function notifyDelivererOfMatches(delivererId: string, matchCount: number) {
  console.log(`📱 Notification livreur ${delivererId}: ${matchCount} nouvelles opportunités`);
  
  // En production, créer une vraie notification
  // await createNotification({
  //   userId: delivererId,
  //   type: "NEW_ROUTE_MATCHES",
  //   title: "Nouvelles opportunités",
  //   message: `${matchCount} annonces compatibles avec votre route`,
  // });
}

/**
 * Notifie le client d'une nouvelle option de livraison
 */
async function notifyClientOfNewDeliveryOption(clientId: string, routeId: string) {
  console.log(`📱 Notification client ${clientId}: nouvelle option de livraison route ${routeId}`);
  
  // En production, créer une vraie notification
  // await createNotification({
  //   userId: clientId,
  //   type: "NEW_DELIVERY_OPTION",
  //   title: "Nouvelle option de livraison",
  //   message: "Un livreur propose une route compatible avec votre annonce",
  // });
}

function calculateDirectDistance(
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
 * Calcule l'analyse de détour pour intégrer une livraison dans une route
 */
function calculateDeliveryDetour(
  route: { originLat: number; originLng: number; destLat: number; destLng: number },
  delivery: { pickupLat: number; pickupLng: number; deliveryLat: number; deliveryLng: number }
) {
  // Distance originale de la route
  const originalDistance = calculateDirectDistance(
    route.originLat, route.originLng, 
    route.destLat, route.destLng
  );
  
  // Nouvelle distance avec la livraison intégrée
  // Route: Origin -> Pickup -> Delivery -> Destination
  const originToPickup = calculateDirectDistance(
    route.originLat, route.originLng,
    delivery.pickupLat, delivery.pickupLng
  );
  
  const pickupToDelivery = calculateDirectDistance(
    delivery.pickupLat, delivery.pickupLng,
    delivery.deliveryLat, delivery.deliveryLng
  );
  
  const deliveryToDestination = calculateDirectDistance(
    delivery.deliveryLat, delivery.deliveryLng,
    route.destLat, route.destLng
  );
  
  const newDistance = originToPickup + pickupToDelivery + deliveryToDestination;
  const detourKm = newDistance - originalDistance;
  const detourPercentage = (detourKm / originalDistance) * 100;
  
  return {
    originalDistanceKm: originalDistance,
    newDistanceKm: newDistance,
    detourKm: Math.max(0, detourKm), // Détour ne peut pas être négatif
    detourPercentage: Math.max(0, detourPercentage),
    segments: {
      originToPickup,
      pickupToDelivery,
      deliveryToDestination
    }
  };
}

/**
 * Calcule un score de compatibilité pour une route
 */
function calculateRouteCompatibilityScore(
  route: any,
  detourAnalysis: any,
  requestedTime: Date
): number {
  let score = 0;
  
  // Score de détour (40%) - Moins de détour = meilleur score
  const detourScore = Math.max(0, (15 - detourAnalysis.detourKm) / 15) * 40;
  score += detourScore;
  
  // Score de timing (25%) - Plus proche de l'heure demandée = meilleur score
  const timeDiff = Math.abs(new Date(route.departureTime).getTime() - requestedTime.getTime()) / (1000 * 60 * 60); // en heures
  const timingScore = Math.max(0, (6 - timeDiff) / 6) * 25; // Max 6h de différence acceptable
  score += timingScore;
  
  // Score de réputation livreur (20%)
  if (route.deliverer?.delivererStats?.averageRating) {
    const reputationScore = (route.deliverer.delivererStats.averageRating / 5) * 20;
    score += reputationScore;
  }
  
  // Score d'expérience (10%)
  if (route.deliverer?.delivererStats?.totalDeliveries) {
    const experienceScore = Math.min(10, (route.deliverer.delivererStats.totalDeliveries / 100) * 10);
    score += experienceScore;
  }
  
  // Score de ponctualité (5%)
  if (route.deliverer?.delivererStats?.onTimeRate) {
    const punctualityScore = (route.deliverer.delivererStats.onTimeRate / 100) * 5;
    score += punctualityScore;
  }
  
  return Math.round(score * 10) / 10;
}

/**
 * Calcule le temps de livraison estimé
 */
function calculateEstimatedDeliveryTime(route: any, detourAnalysis: any): Date {
  const baseTime = new Date(route.departureTime);
  
  // Vitesse moyenne estimée selon le type de véhicule et le trafic
  let averageSpeed = 50; // km/h par défaut
  
  // Ajouter le temps de trajet basé sur la nouvelle distance
  const additionalMinutes = (detourAnalysis.newDistanceKm / averageSpeed) * 60;
  
  // Ajouter un buffer pour les arrêts et la collecte/livraison
  const stopTimeMinutes = 15; // 15 min par arrêt (pickup + delivery)
  
  const estimatedTime = new Date(baseTime);
  estimatedTime.setMinutes(estimatedTime.getMinutes() + additionalMinutes + stopTimeMinutes);
  
  return estimatedTime;
}

/**
 * Estime l'augmentation du coût de carburant
 */
function estimateFuelCostIncrease(detourKm: number): number {
  // Estimation basée sur:
  // - Consommation moyenne: 7L/100km
  // - Prix moyen du carburant: 1.5€/L
  const fuelConsumptionPer100km = 7;
  const fuelPricePerLiter = 1.5;
  
  const fuelConsumed = (detourKm * fuelConsumptionPer100km) / 100;
  const fuelCost = fuelConsumed * fuelPricePerLiter;
  
  return Math.round(fuelCost * 100) / 100; // Arrondir à 2 décimales
}
