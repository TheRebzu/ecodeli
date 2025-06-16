import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";

/**
 * Router pour les livraisons partielles
 * Gère les livraisons en plusieurs segments avec points de relais
 */

// Schémas de validation
const planPartialDeliverySchema = z.object({ announcementId: z.string().cuid(),
  maxSegmentDistance: z.number().min(10).max(200).default(100),
  preferredRelayTypes: z
    .array(z.enum(["WAREHOUSE", "PARTNER_SHOP", "LOCKER", "PICKUP_POINT"]))
    .default(["WAREHOUSE", "PARTNER_SHOP"]) });

const assignDeliverersSchema = z.object({ planId: z.string().cuid(),
  prioritizeSpeed: z.boolean().default(false),
  prioritizeRating: z.boolean().default(true) });

const findRelayPointsSchema = z.object({ centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radius: z.number().min(1).max(50).default(20),
  minCapacity: z.number().min(1).max(100).default(5),
  timeSlot: z
    .object({
      start: z.date(),
      end: z.date() })
    .optional()});

const updateSegmentStatusSchema = z.object({ segmentId: z.string().cuid(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED"]),
  notes: z.string().max(500).optional(),
  actualDuration: z.number().min(0).optional(),
  actualPrice: z.number().min(0).optional() });

export const partialDeliveryRouter = router({ /**
   * Planifie une livraison partielle
   */
  planPartialDelivery: protectedProcedure
    .input(planPartialDeliverySchema)
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier que l'annonce existe et appartient à l'utilisateur
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            OR: [
              { clientId: user.id },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: { client }});

        if (!announcement) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Annonce non trouvée ou non autorisée" });
        }

        // Importer et utiliser le service de livraison partielle
        const { PartialDeliveryService } = await import(
          "@/server/services/matching/partial-delivery.service"
        );
        const partialDeliveryService = new PartialDeliveryService(ctx.db);

        const plan = await partialDeliveryService.planPartialDelivery(
          input.announcementId,
          input.maxSegmentDistance,
          input.preferredRelayTypes,
        );

        if (!plan) {
          return {
            success: false,
            message:
              "Aucun plan de livraison partielle possible pour cette annonce",
            data: null};
        }

        // Sauvegarder le plan en base de données
        const savedPlan = await ctx.db.partialDeliveryPlan.create({ data: {
            announcementId: input.announcementId,
            totalSegments: plan.totalSegments,
            totalDistance: plan.totalDistance,
            totalDuration: plan.totalDuration,
            totalPrice: plan.totalPrice,
            estimatedDeliveryTime: plan.estimatedDeliveryTime,
            status: "PLANNING",
            segments: {
              create: plan.segments.map((segment) => ({
                segmentNumber: segment.segmentNumber,
                pickupAddress: segment.pickupAddress,
                pickupLatitude: segment.pickupLatitude,
                pickupLongitude: segment.pickupLongitude,
                deliveryAddress: segment.deliveryAddress,
                deliveryLatitude: segment.deliveryLatitude,
                deliveryLongitude: segment.deliveryLongitude,
                estimatedDuration: segment.estimatedDuration,
                estimatedPrice: segment.estimatedPrice,
                status: "PENDING",
                relayPointId: segment.relayPointId,
                specialInstructions: segment.specialInstructions,
                requiredCapabilities: segment.requiredCapabilities }))}},
          include: {
            segments: true,
            announcement: true}});

        return {
          success: true,
          data: {
            plan: savedPlan,
            fallbackPlan: plan.fallbackPlan},
          message: `Plan de livraison partielle créé avec ${plan.totalSegments} segments`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la planification de livraison partielle" });
      }
    }),

  /**
   * Assigne des livreurs aux segments
   */
  assignDeliverers: protectedProcedure
    .input(assignDeliverersSchema)
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN" && user.role !== "CLIENT") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        // Récupérer le plan de livraison
        const plan = await ctx.db.partialDeliveryPlan.findFirst({
          where: {
            id: input.planId,
            OR: [
              { announcement: { clientId: user.id } },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: {
            segments: true,
            announcement: true}});

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Plan de livraison non trouvé" });
        }

        // Importer et utiliser le service
        const { PartialDeliveryService } = await import(
          "@/server/services/matching/partial-delivery.service"
        );
        const partialDeliveryService = new PartialDeliveryService(ctx.db);

        // Convertir le plan en format attendu par le service
        const planForService = {
          announcementId: plan.announcementId,
          totalSegments: plan.totalSegments,
          segments: plan.segments.map((segment) => ({ id: segment.id,
            delivererId: segment.delivererId || "",
            segmentNumber: segment.segmentNumber,
            pickupAddress: segment.pickupAddress,
            pickupLatitude: segment.pickupLatitude,
            pickupLongitude: segment.pickupLongitude,
            deliveryAddress: segment.deliveryAddress,
            deliveryLatitude: segment.deliveryLatitude,
            deliveryLongitude: segment.deliveryLongitude,
            estimatedDuration: segment.estimatedDuration,
            estimatedPrice: segment.estimatedPrice,
            status: segment.status as any,
            relayPointId: segment.relayPointId,
            specialInstructions: segment.specialInstructions,
            requiredCapabilities: segment.requiredCapabilities || [] })),
          relayPoints: [], // Sera rempli si nécessaire
          totalDistance: plan.totalDistance,
          totalDuration: plan.totalDuration,
          totalPrice: plan.totalPrice,
          estimatedDeliveryTime: plan.estimatedDeliveryTime};

        const success = await partialDeliveryService.assignDeliverersToSegments(
          planForService,
        );

        if (!success) {
          return {
            success: false,
            message: "Impossible d'assigner tous les livreurs nécessaires"};
        }

        // Mettre à jour le statut du plan
        await ctx.db.partialDeliveryPlan.update({
          where: { id: input.planId },
          data: { status: "ASSIGNED" }});

        // Mettre à jour les segments avec les livreurs assignés
        for (const segment of planForService.segments) {
          if (segment.delivererId) {
            await ctx.db.partialDeliverySegment.update({
              where: { id: segment.id },
              data: {
                delivererId: segment.delivererId,
                status: "ASSIGNED"}});
          }
        }

        return {
          success: true,
          message: "Livreurs assignés avec succès"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'assignation des livreurs" });
      }
    }),

  /**
   * Trouve des points de relais disponibles
   */
  findAvailableRelayPoints: protectedProcedure
    .input(findRelayPointsSchema)
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        // Importer et utiliser le service
        const { PartialDeliveryService } = await import(
          "@/server/services/matching/partial-delivery.service"
        );
        const partialDeliveryService = new PartialDeliveryService(ctx.db);

        const relayPoints = await partialDeliveryService.findAvailableRelayPoints(
          {
            centerLat: input.centerLat,
            centerLng: input.centerLng,
            radius: input.radius,
            minCapacity: input.minCapacity,
            timeSlot: input.timeSlot},
        );

        return {
          success: true,
          data: relayPoints,
          message: `${relayPoints.length} points de relais trouvés`};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de points de relais" });
      }
    }),

  /**
   * Met à jour le statut d'un segment
   */
  updateSegmentStatus: protectedProcedure
    .input(updateSegmentStatusSchema)
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier que le segment existe et que l'utilisateur a le droit de le modifier
        const segment = await ctx.db.partialDeliverySegment.findFirst({
          where: {
            id: input.segmentId,
            OR: [
              { delivererId: user.id },
              { plan: { announcement: { clientId: user.id } } },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: {
            plan: {
              include: {
                announcement: true,
                segments: true}}}});

        if (!segment) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Segment non trouvé ou non autorisé" });
        }

        // Mettre à jour le segment
        const updatedSegment = await ctx.db.partialDeliverySegment.update({
          where: { id: input.segmentId },
          data: {
            status: input.status,
            notes: input.notes,
            actualDuration: input.actualDuration,
            actualPrice: input.actualPrice,
            updatedAt: new Date(),
            ...(input.status === "COMPLETED" && {
              completedAt: new Date()})}});

        // Si le segment est terminé, coordonner avec les autres segments
        if (input.status === "COMPLETED") {
          const { PartialDeliveryService } = await import(
            "@/server/services/matching/partial-delivery.service"
          );
          const partialDeliveryService = new PartialDeliveryService(ctx.db);
          await partialDeliveryService.coordinateSegments(segment.planId);
        }

        return {
          success: true,
          data: updatedSegment,
          message: "Statut du segment mis à jour"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du segment" });
      }
    }),

  /**
   * Obtient les plans de livraison partielle
   */
  getPartialDeliveryPlans: protectedProcedure
    .input(
      z.object({ status: z
          .enum(["PLANNING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED"])
          .optional(),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0) }),
    )
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        const where: any = {};

        // Filtrer selon le rôle
        if (user.role === "CLIENT") {
          where.announcement = { clientId: user.id };
        } else if (user.role === "DELIVERER") {
          where.segments = {
            some: { delivererId: user.id }};
        }

        if (input.status) {
          where.status = input.status;
        }

        const plans = await ctx.db.partialDeliveryPlan.findMany({
          where,
          include: {
            announcement: {
              select: {
                id: true,
                title: true,
                pickupCity: true,
                deliveryCity: true,
                client: {
                  select: {
                    user: {
                      select: {
                        name: true,
                        email: true}}}}}},
            segments: {
              include: {
                deliverer: {
                  select: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                        image: true}}}},
                relayPoint: {
                  select: {
                    name: true,
                    address: true,
                    type: true}}},
              orderBy: { segmentNumber: "asc" }}},
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit});

        const totalCount = await ctx.db.partialDeliveryPlan.count({ where  });

        return {
          success: true,
          data: plans,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount}};
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des plans" });
      }
    }),

  /**
   * Obtient les détails d'un plan de livraison partielle
   */
  getPartialDeliveryPlan: protectedProcedure
    .input(z.object({ planId: z.string().cuid()  }))
    .query(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        const plan = await ctx.db.partialDeliveryPlan.findFirst({
          where: {
            id: input.planId,
            OR: [
              { announcement: { clientId: user.id } },
              { segments: { some: { delivererId: user.id } } },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: {
            announcement: {
              include: {
                client: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                        phone: true,
                        image: true}}}}}},
            segments: {
              include: {
                deliverer: {
                  include: {
                    user: {
                      select: {
                        name: true,
                        email: true,
                        phone: true,
                        image: true}},
                    vehicle: {
                      select: {
                        type: true,
                        licensePlate: true,
                        model: true}}}},
                relayPoint: true},
              orderBy: { segmentNumber: "asc" }}}});

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Plan de livraison non trouvé" });
        }

        return {
          success: true,
          data: plan};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du plan" });
      }
    }),

  /**
   * Coordonne les segments d'un plan
   */
  coordinateSegments: protectedProcedure
    .input(z.object({ planId: z.string().cuid()  }))
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      if (user.role !== "ADMIN" && user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès non autorisé" });
      }

      try {
        const { PartialDeliveryService } = await import(
          "@/server/services/matching/partial-delivery.service"
        );
        const partialDeliveryService = new PartialDeliveryService(ctx.db);

        await partialDeliveryService.coordinateSegments(input.planId);

        return {
          success: true,
          message: "Coordination des segments effectuée"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la coordination" });
      }
    }),

  /**
   * Annule un plan de livraison partielle
   */
  cancelPartialDeliveryPlan: protectedProcedure
    .input(
      z.object({ planId: z.string().cuid(),
        reason: z.string().max(500) }),
    )
    .mutation(async ({ ctx, input  }) => {
      const { user } = ctx.session;

      try {
        // Vérifier les permissions
        const plan = await ctx.db.partialDeliveryPlan.findFirst({
          where: {
            id: input.planId,
            OR: [
              { announcement: { clientId: user.id } },
              { ...(user.role === "ADMIN" ? {} : { id: "impossible" }) }]},
          include: { segments }});

        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Plan de livraison non trouvé" });
        }

        if (plan.status === "COMPLETED") {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Impossible d'annuler un plan déjà terminé" });
        }

        // Annuler tous les segments
        await ctx.db.partialDeliverySegment.updateMany({
          where: { planId: input.planId },
          data: {
            status: "FAILED",
            notes: `Annulé: ${input.reason}`,
            updatedAt: new Date()}});

        // Mettre à jour le plan
        const updatedPlan = await ctx.db.partialDeliveryPlan.update({
          where: { id: input.planId },
          data: {
            status: "FAILED",
            cancelReason: input.reason,
            cancelledAt: new Date()}});

        return {
          success: true,
          data: updatedPlan,
          message: "Plan de livraison partielle annulé"};
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation" });
      }
    })});