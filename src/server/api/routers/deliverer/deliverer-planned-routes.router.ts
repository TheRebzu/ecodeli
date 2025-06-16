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

        // TODO: Déclencher le système de matching automatique si la route est publique
        if (input.isPublic) {
          // Implémentation de la logique de matching
          const matchingAnnouncements = await ctx.db.announcement.findMany({
            where: {
              status: "PENDING",
              pickupLatitude: { not: null },
              pickupLongitude: { not: null },
              deliveryLatitude: { not: null },
              deliveryLongitude: { not: null },
            },
            include: {
              client: {
                include: {
                  user: {
                    select: { name: true, phone: true }
                  }
                }
              }
            }
          });

          // Filtrer les annonces qui correspondent à la route
          const compatibleAnnouncements = matchingAnnouncements.filter(announcement => {
            // Vérifier si l'annonce est sur le chemin de la route
            const pickupDistance = calculateDistance(
              input.departureLatitude!,
              input.departureLongitude!,
              announcement.pickupLatitude!,
              announcement.pickupLongitude!
            );
            
            const deliveryDistance = calculateDistance(
              input.arrivalLatitude!,
              input.arrivalLongitude!,
              announcement.deliveryLatitude!,
              announcement.deliveryLongitude!
            );

            // Annonce compatible si pickup et delivery sont dans un rayon raisonnable
            return pickupDistance <= 10 && deliveryDistance <= 10; // 10km de rayon
          });

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

        // TODO: Déclencher ou arrêter le matching automatique
        if (input.isPublic) {
          // Lancer le matching
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
        // TODO: Implémenter la recherche géospatiale avancée
        // Pour l'instant, recherche basique par ville et temps
        const routes = await ctx.db.delivererPlannedRoute.findMany({
          where: {
            isPublic: true,
            status: "PUBLISHED",
            departureTime: {
              gte: new Date(input.departureTime.getTime() - 2 * 60 * 60 * 1000), // -2h
              lte: new Date(input.departureTime.getTime() + 4 * 60 * 60 * 1000), // +4h
            },
            availableCapacity: { gt: 0 }},
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                image: true}}},
          take: input.limit,
          orderBy: { departureTime: "asc" }});

        return { routes };
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
