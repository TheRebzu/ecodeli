import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  MatchingAlgorithm,
  MatchingPriority,
  MatchingResultStatus,
  MatchingCriteriaType} from "@prisma/client";
import {
  calculateDistance,
  calculateDistanceScore,
  isWithinRadius} from "@/server/utils/geo-calculations";
import { matchingAlgorithmService } from "@/server/services/matching/matching-algorithm.service";
import { geolocationMatchingService } from "@/server/services/matching/geolocation-matching.service";
import { routePlanningService } from "@/server/services/matching/route-planning.service";

/**
 * Router pour le système de matching automatique
 * Gère le matching entre annonces et livreurs/routes planifiées
 */

// Schémas de validation
const createMatchingCriteriaSchema = z.object({ announcementId: z.string().cuid(),
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
  scoreThreshold: z.number().min(0).max(1).default(0.6) });

const matchingResultsFilterSchema = z.object({ announcementId: z.string().cuid().optional(),
  delivererId: z.string().cuid().optional(),
  status: z.nativeEnum(MatchingResultStatus).optional(),
  minScore: z.number().min(0).max(1).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0) });

const respondToMatchSchema = z.object({ matchingResultId: z.string().cuid(),
  accept: z.boolean(),
  proposedPrice: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
  rejectionReason: z.string().max(200).optional() });

export const matchingRouter = router({ /**
   * Créer des critères de matching pour une annonce
   */
  createCriteria: protectedProcedure
    .input(createMatchingCriteriaSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier que l'annonce existe et appartient à l'utilisateur
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            clientId: user.id,
            status: { in: ["DRAFT", "PUBLISHED"] }}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée" });
        }

        // Créer ou mettre à jour les critères
        const criteria = await ctx.db.matchingCriteria.upsert({
          where: { announcementId: input.announcementId },
          update: {
            ...input,
            updatedAt: new Date()},
          create: {
            ...input,
            packageTypes: ["STANDARD"], // Valeur par défaut
            scoreThreshold: input.scoreThreshold}});

        // Si l'annonce est publiée et autoAssign est activé, lancer le matching
        if (announcement.status === "PUBLISHED" && announcement.autoAssign) {
          await triggerMatchingProcess(criteria.id);
        }

        return {
          success: true,
          data: criteria,
          message: "Critères de matching créés avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création des critères" });
      }
    }),

  /**
   * Déclencher le processus de matching pour une annonce
   */
  triggerMatching: protectedProcedure
    .input(
      z.object({ announcementId: z.string().cuid(),
        forceRefresh: z.boolean().default(false) }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier les permissions
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            OR: [
              { clientId: user.id },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: { matchingCriteria }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée" });
        }

        if (!announcement.matchingCriteria) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Aucun critère de matching défini pour cette annonce" });
        }

        // Lancer le processus de matching
        const results = await performMatching(
          announcement,
          announcement.matchingCriteria,
          ctx.db,
        );

        return {
          success: true,
          data: {
            announcementId: input.announcementId,
            resultsCount: results.length,
            topMatches: results.slice(0, 3)},
          message: `Matching terminé: ${results.length} livreurs trouvés`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du matching" });
      }
    }),

  /**
   * Obtenir les résultats de matching
   */
  getMatchingResults: protectedProcedure
    .input(matchingResultsFilterSchema)
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      try {
        const where: any = {};

        // Filtrer selon le rôle
        if (user.role === "CLIENT") {
          // Les clients ne voient que les matchings de leurs annonces
          const userAnnouncements = await ctx.db.announcement.findMany({
            where: { clientId: user.id },
            select: { id }});
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
                    completedDeliveries: true}}}},
            announcement: {
              select: {
                id: true,
                title: true,
                pickupCity: true,
                deliveryCity: true,
                suggestedPrice: true,
                status: true}},
            criteria: {
              select: {
                algorithm: true,
                priority: true,
                scoreThreshold: true}}},
          orderBy: [{ overallScore: "desc" }, { suggestedAt: "desc" }],
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.matchingResult.count({ where  });

        return {
          success: true,
          data: results,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des résultats" });
      }
    }),

  /**
   * Répondre à une suggestion de matching (livreur)
   */
  respondToMatch: protectedProcedure
    .input(respondToMatchSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent répondre aux matchings" });
      }

      try {
        // Vérifier que le matching existe et appartient au livreur
        const matchingResult = await ctx.db.matchingResult.findFirst({
          where: {
            id: input.matchingResultId,
            delivererId: user.id,
            status: { in: ["PENDING", "SUGGESTED"] }},
          include: {
            announcement: true,
            criteria: true}});

        if (!matchingResult) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Matching non trouvé ou déjà traité" });
        }

        // Vérifier que l'annonce est toujours disponible
        if (matchingResult.announcement.status !== "PUBLISHED") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Cette annonce n'est plus disponible" });
        }

        // Mettre à jour le résultat
        const updatedResult = await ctx.db.matchingResult.update({
          where: { id: input.matchingResultId },
          data: {
            status: input.accept ? "ACCEPTED" : "REJECTED",
            respondedAt: new Date(),
            rejectionReason: input.rejectionReason,
            ...(input.proposedPrice && {
              suggestedPrice: input.proposedPrice})}});

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
              isFromMatching: true}});

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
                status: "ASSIGNED"}});
          }
        }

        return {
          success: true,
          data: updatedResult,
          message: input.accept ? "Candidature envoyée" : "Matching refusé"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la réponse" });
      }
    }),

  /**
   * Obtenir les préférences de matching du livreur
   */
  getMyPreferences: protectedProcedure.query(async ({ ctx  }) => {
    const { user } = ctx.session;

    if (user.role !== "DELIVERER") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Seuls les livreurs peuvent gérer leurs préférences" });
    }

    try {
      const preferences = await ctx.db.delivererMatchingPreferences.findUnique({
        where: { delivererId: user.id }});

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
            autoDeclineAfter: 60}});
      }

      return {
        success: true,
        data: preferences};
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des préférences" });
    }
  }),

  /**
   * Mettre à jour les préférences de matching
   */
  updateMyPreferences: protectedProcedure
    .input(
      z.object({ preferredRadius: z.number().min(1).max(50).optional(),
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
              "OVERSIZED"]),
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
        autoDeclineAfter: z.number().min(0).max(480).optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent modifier leurs préférences" });
      }

      try {
        const preferences = await ctx.db.delivererMatchingPreferences.upsert({
          where: { delivererId: user.id },
          update: {
            ...input,
            updatedAt: new Date()},
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
            autoDeclineAfter: input.autoDeclineAfter || 60}});

        return {
          success: true,
          data: preferences,
          message: "Préférences mises à jour avec succès"};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour des préférences" });
      }
    }),

  /**
   * Obtenir les statistiques de matching (Admin)
   */
  getMatchingStats: protectedProcedure
    .input(
      z.object({ period: z.enum(["day", "week", "month"]).default("week"),
        algorithm: z.nativeEnum(MatchingAlgorithm).optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs" });
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
          suggestedAt: { gte }};

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
          avgScore] = await Promise.all([
          ctx.db.matchingResult.count({ where  }),
          ctx.db.matchingResult.count({
            where: { ...where, status: "ACCEPTED" }}),
          ctx.db.matchingResult.count({
            where: { ...where, status: "REJECTED" }}),
          ctx.db.matchingResult.count({
            where: { ...where, status: "EXPIRED" }}),
          ctx.db.matchingResult.aggregate({
            where: { ...where, respondedAt: { not } },
            avg: { processingTime }}),
          ctx.db.matchingResult.aggregate({
            where,
            avg: {
              overallScore: true,
              distanceScore: true,
              timeScore: true,
              priceScore: true,
              ratingScore: true}})]);

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
                avgResponseTime.avg.processingTime || 0,
              )},
            scores: {
              overall:
                Math.round((avgScore.avg.overallScore || 0) * 100) / 100,
              distance:
                Math.round((avgScore.avg.distanceScore || 0) * 100) / 100,
              time: Math.round((avgScore.avg.timeScore || 0) * 100) / 100,
              price: Math.round((avgScore.avg.priceScore || 0) * 100) / 100,
              rating: Math.round((avgScore.avg.ratingScore || 0) * 100) / 100},
            period: input.period}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques" });
      }
    }),

  /**
   * Recherche avancée de correspondances avec algorithme amélioré
   */
  findAdvancedMatches: protectedProcedure
    .input(
      z.object({ announcementId: z.string().cuid(),
        maxDistance: z.number().min(1).max(100).default(50),
        maxDetourPercentage: z.number().min(0).max(50).default(30),
        timeFlexibilityHours: z.number().min(0).max(48).default(24),
        minDelivererRating: z.number().min(1).max(5).default(3.0),
        priceFlexibilityPercentage: z.number().min(0).max(50).default(20),
        prioritizeExperience: z.boolean().default(false),
        prioritizeSpeed: z.boolean().default(false),
        prioritizePrice: z.boolean().default(false),
        maxResults: z.number().min(1).max(20).default(10) }),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier que l'annonce existe et appartient à l'utilisateur
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            OR: [
              { clientId: user.id },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]}});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée" });
        }

        // Utiliser notre service de matching avancé
        const matches = await matchingAlgorithmService.findBestMatches(
          input.announcementId,
          {
            maxDistance: input.maxDistance,
            maxDetourPercentage: input.maxDetourPercentage,
            timeFlexibilityHours: input.timeFlexibilityHours,
            minDelivererRating: input.minDelivererRating,
            priceFlexibilityPercentage: input.priceFlexibilityPercentage,
            prioritizeExperience: input.prioritizeExperience,
            prioritizeSpeed: input.prioritizeSpeed,
            prioritizePrice: input.prioritizePrice},
          input.maxResults,
        );

        return {
          success: true,
          data: matches,
          message: `${matches.length} correspondances trouvées`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de correspondances" });
      }
    }),

  /**
   * Trouve les livreurs proches avec géolocalisation avancée
   */
  findNearbyDeliverers: protectedProcedure
    .input(
      z.object({ latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(1).max(100).default(20),
        isOnline: z.boolean().default(true),
        minRating: z.number().min(1).max(5).default(3.0),
        vehicleTypes: z.array(z.string()).optional(),
        maxResults: z.number().min(1).max(50).default(20) }),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN" && user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const nearbyDeliverers = await geolocationMatchingService.findNearbyDeliverers(
          input.latitude,
          input.longitude,
          input.radius,
          {
            isOnline: input.isOnline,
            minRating: input.minRating,
            vehicleTypes: input.vehicleTypes,
            maxResults: input.maxResults},
        );

        return {
          success: true,
          data: nearbyDeliverers,
          message: `${nearbyDeliverers.length} livreurs trouvés`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de livreurs" });
      }
    }),

  /**
   * Met à jour la position d'un livreur
   */
  updateDelivererPosition: protectedProcedure
    .input(
      z.object({ latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        heading: z.number().min(0).max(360).optional(),
        velocity: z.number().min(0).max(200).optional() }),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent mettre à jour leur position" });
      }

      try {
        await geolocationMatchingService.updateDelivererPosition(
          user.id,
          input.latitude,
          input.longitude,
          input.heading,
          input.velocity,
        );

        return {
          success: true,
          message: "Position mise à jour avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de position" });
      }
    }),

  /**
   * Analyse la densité de livraison dans une zone
   */
  analyzeDeliveryDensity: protectedProcedure
    .input(
      z.object({ latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(1).max(50).default(5),
        timeRangeStart: z.date(),
        timeRangeEnd: z.date() }),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN" && user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const densityAnalysis = await geolocationMatchingService.analyzeDeliveryDensity(
          input.latitude,
          input.longitude,
          input.radius,
          {
            start: input.timeRangeStart,
            end: input.timeRangeEnd},
        );

        return {
          success: true,
          data: densityAnalysis};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'analyse de densité" });
      }
    }),

  /**
   * Planifie une route optimisée pour un livreur
   */
  planOptimalRoute: protectedProcedure
    .input(
      z.object({ deliveryPoints: z.array(
          z.object({
            id: z.string(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            type: z.enum(["PICKUP", "DELIVERY", "WAYPOINT", "DEPOT"]),
            timeWindow: z
              .object({
                start: z.date(),
                end: z.date() })
              .optional(),
            serviceTime: z.number().min(0).optional(),
            priority: z.number().min(1).max(5),
            requirements: z.array(z.string()).optional()}),
        ),
        constraints: z
          .object({ maxDistance: z.number().min(0).optional(),
            maxDuration: z.number().min(0).optional(),
            startTime: z.date().optional(),
            endTime: z.date().optional(),
            mustReturnToStart: z.boolean().optional(),
            vehicleCapacity: z.number().min(0).optional() })
          .optional()}),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent planifier des routes" });
      }

      try {
        const optimizedRoute = await routePlanningService.planOptimalRoute(
          user.id,
          input.deliveryPoints,
          input.constraints || {},
        );

        return {
          success: true,
          data: optimizedRoute,
          message: "Route optimisée avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la planification de route" });
      }
    }),

  /**
   * Identifie les clusters de livraisons
   */
  identifyDeliveryClusters: protectedProcedure
    .input(
      z.object({ announcements: z.array(
          z.object({
            id: z.string(),
            pickupLatitude: z.number().min(-90).max(90),
            pickupLongitude: z.number().min(-180).max(180),
            deliveryLatitude: z.number().min(-90).max(90),
            deliveryLongitude: z.number().min(-180).max(180),
            priority: z.string(),
            scheduledDate: z.date().optional() }),
        ),
        maxClusterRadius: z.number().min(1).max(20).default(5)}),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN" && user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const clusters = await routePlanningService.identifyDeliveryClusters(
          input.announcements,
          input.maxClusterRadius,
        );

        return {
          success: true,
          data: clusters,
          message: `${clusters.length} clusters identifiés`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'identification des clusters" });
      }
    }),

  /**
   * Génère des routes alternatives
   */
  generateAlternativeRoutes: protectedProcedure
    .input(
      z.object({ deliveryPoints: z.array(
          z.object({
            id: z.string(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            type: z.enum(["PICKUP", "DELIVERY", "WAYPOINT", "DEPOT"]),
            timeWindow: z
              .object({
                start: z.date(),
                end: z.date() })
              .optional(),
            serviceTime: z.number().min(0).optional(),
            priority: z.number().min(1).max(5),
            requirements: z.array(z.string()).optional()}),
        ),
        alternativeCount: z.number().min(1).max(5).default(3)}),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent générer des routes alternatives" });
      }

      try {
        const alternatives = await routePlanningService.generateAlternativeRoutes(
          user.id,
          input.deliveryPoints,
          input.alternativeCount,
        );

        return {
          success: true,
          data: alternatives,
          message: `${alternatives.length} routes alternatives générées`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la génération de routes alternatives" });
      }
    }),

  /**
   * Ajuste une route en temps réel
   */
  adjustRouteRealTime: protectedProcedure
    .input(
      z.object({ routeId: z.string(),
        currentLatitude: z.number().min(-90).max(90),
        currentLongitude: z.number().min(-180).max(180),
        adjustments: z.object({
          newUrgentDelivery: z
            .object({
              id: z.string(),
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
              type: z.enum(["PICKUP", "DELIVERY", "WAYPOINT", "DEPOT"]),
              timeWindow: z
                .object({
                  start: z.date(),
                  end: z.date() })
                .optional(),
              serviceTime: z.number().min(0).optional(),
              priority: z.number().min(1).max(5),
              requirements: z.array(z.string()).optional()})
            .optional(),
          trafficDelays: z
            .array(
              z.object({ pointId: z.string(),
                delayMinutes: z.number().min(0) }),
            )
            .optional(),
          cancelledDeliveries: z.array(z.string()).optional(),
          roadBlocks: z
            .array(
              z.object({ latitude: z.number().min(-90).max(90),
                longitude: z.number().min(-180).max(180),
                radius: z.number().min(0) }),
            )
            .optional()})}),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent ajuster leurs routes" });
      }

      try {
        const adjustedRoute = await routePlanningService.adjustRouteRealTime(
          input.routeId,
          {
            latitude: input.currentLatitude,
            longitude: input.currentLongitude},
          input.adjustments,
        );

        return {
          success: true,
          data: adjustedRoute,
          message: "Route ajustée en temps réel"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajustement de route" });
      }
    }),

  /**
   * Trouve les zones géographiques optimales
   */
  findOptimalZones: protectedProcedure
    .input(
      z.object({ latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(1).max(50).default(10) }),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        const optimalZones = await geolocationMatchingService.findOptimalZone(
          input.latitude,
          input.longitude,
          input.radius,
        );

        return {
          success: true,
          data: optimalZones,
          message: `${optimalZones.length} zones trouvées`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de zones" });
      }
    }),

  /**
   * Optimise une route multi-livraisons
   */
  optimizeMultiDeliveryRoute: protectedProcedure
    .input(
      z.object({ startLatitude: z.number().min(-90).max(90),
        startLongitude: z.number().min(-180).max(180),
        deliveryPoints: z.array(
          z.object({
            id: z.string(),
            latitude: z.number().min(-90).max(90),
            longitude: z.number().min(-180).max(180),
            priority: z.number().min(1).max(5),
            timeWindow: z
              .object({
                start: z.date(),
                end: z.date() })
              .optional()}),
        )}),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER" && user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const optimizedRoute = await geolocationMatchingService.optimizeMultiDeliveryRoute(
          input.startLatitude,
          input.startLongitude,
          input.deliveryPoints,
        );

        return {
          success: true,
          data: optimizedRoute,
          message: "Route multi-livraisons optimisée"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'optimisation de route" });
      }
    })});

// Helper functions
async function triggerMatchingProcess(criteriaId: string, db: any) {
  // Processus de matching asynchrone complet
  try {
    console.log("🔄 Démarrage du processus de matching pour:", criteriaId);

    // Récupérer les critères de matching
    const criteria = await db.matchingCriteria.findUnique({
      where: { id: criteriaId },
      include: {
        announcement: {
          include: {
            client: { select: { name: true, id: true } },
          },
        },
      },
    });

    if (!criteria) {
      console.error("❌ Critères de matching non trouvés:", criteriaId);
      return;
    }

    // Mettre à jour le statut à "en cours"
    await db.matchingCriteria.update({
      where: { id: criteriaId },
      data: { 
        status: "PROCESSING",
        processingStartedAt: new Date(),
      },
    });

    // Exécuter le processus de matching
    const matchingResults = await performMatching(
      criteria.announcement,
      criteria,
      db
    );

    console.log(`✅ Matching terminé: ${matchingResults.length} résultats trouvés`);

    // Mettre à jour le statut final
    await db.matchingCriteria.update({
      where: { id: criteriaId },
      data: {
        status: matchingResults.length > 0 ? "COMPLETED" : "NO_RESULTS",
        processingCompletedAt: new Date(),
        resultsCount: matchingResults.length,
      },
    });

    // Notifier le client si des résultats ont été trouvés
    if (matchingResults.length > 0 && criteria.announcement.clientId) {
      await db.notification.create({
        data: {
          userId: criteria.announcement.clientId,
          type: "MATCHING_RESULTS_AVAILABLE",
          title: "Livreurs trouvés !",
          message: `Nous avons trouvé ${matchingResults.length} livreur(s) disponible(s) pour votre annonce "${criteria.announcement.title}"`,
          data: {
            announcementId: criteria.announcement.id,
            matchingCriteriaId: criteriaId,
            resultsCount: matchingResults.length,
            bestScore: Math.max(...matchingResults.map(r => r.overallScore)),
          },
        },
      });
    }

    // Planifier l'expiration automatique des résultats
    setTimeout(async () => {
      await db.matchingResult.updateMany({
        where: {
          criteriaId,
          status: "SUGGESTED",
          expiresAt: { lte: new Date() },
        },
        data: { status: "EXPIRED" },
      });
    }, 24 * 60 * 60 * 1000); // 24 heures

    console.log(`🎯 Processus de matching complété pour l'annonce: ${criteria.announcement.title}`);

  } catch (error) {
    console.error("❌ Erreur lors du processus de matching:", error);
    
    // Marquer comme échoué
    await db.matchingCriteria.update({
      where: { id: criteriaId },
      data: {
        status: "FAILED",
        processingCompletedAt: new Date(),
        errorDetails: error instanceof Error ? error.message : "Erreur inconnue",
      },
    });
  }
}

async function performMatching(announcement: any, criteria: any, db: any) {
  // Implémentation complète avec algorithme de matching réel
  // Calcul basé sur distance, disponibilité, évaluations et préférences

  const deliverers = await db.user.findMany({
    where: {
      role: "DELIVERER",
      status: "ACTIVE",
      deliverer: { isAvailable }},
    include: {
      deliverer: true,
      matchingPreferences: true},
    take: criteria.maxSuggestions});

  const results = [];
  const announcementLocation = {
    lat: announcement.pickupLatitude,
    lng: announcement.pickupLongitude};

  for (const deliverer of deliverers) {
    // Calculer la distance réelle entre le livreur et l'annonce
    const delivererLocation = {
      lat: deliverer.latitude || 0,
      lng: deliverer.longitude || 0};

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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)}});

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
        startTime: { lte },
        endTime: { gte },
        isActive: true}});

    if (availability) {
      // Le livreur est disponible : score élevé
      return 1.0;
    }

    // Chercher des créneaux proches
    const availabilities = await db.providerAvailability.findMany({
      where: {
        providerId: delivererId,
        dayOfWeek,
        isActive: true}});

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
  } catch (error) {
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
