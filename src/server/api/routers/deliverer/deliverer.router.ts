import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { DeliveryService } from "@/server/services/deliverer/delivery.service";

/**
 * Router spécialisé pour les fonctionnalités livreurs
 * Refactoring du delivery.router.ts pour une meilleure organisation
 */
export const delivererRouter = router({ // ===== PROFIL ET DOCUMENTS =====

  profile: router({
    // Récupérer le profil complet
    get: protectedProcedure
      .input(z.object({ delivererId: z.string().optional()  }))
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getDelivererProfile(
          delivererId,
          ctx.session.user.id,
        );
      }),

    // Mettre à jour le profil
    update: protectedProcedure
      .input(
        z.object({ delivererId: z.string().optional(),
          profile: z
            .object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              phone: z.string().optional(),
              bio: z.string().optional() })
            .optional(),
          preferences: z
            .object({ preferredTypes: z.array(z.string()).optional(),
              maxDistanceKm: z.number().min(1).max(50).optional(),
              minPricePerKm: z.number().optional(),
              preferWeekends: z.boolean().optional(),
              preferEvenings: z.boolean().optional(),
              acceptUrgent: z.boolean().optional(),
              maxWeight: z.number().optional(),
              hasVehicle: z.boolean().optional(),
              vehicleType: z.string().optional(),
              notifyByEmail: z.boolean().optional(),
              notifyByPush: z.boolean().optional(),
              notifyBySms: z.boolean().optional() })
            .optional()}),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.updateDelivererProfile(
          delivererId,
          input,
          ctx.session.user.id,
        );
      })}),

  // ===== DOCUMENTS =====

  documents: router({ // Lister tous les documents
    getAll: protectedProcedure
      .input(z.object({ delivererId: z.string().optional()  }))
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getDelivererDocuments(
          delivererId,
          ctx.session.user.id,
        );
      }),

    // Upload avec métadonnées avancées
    upload: protectedProcedure
      .input(
        z.object({ delivererId: z.string().optional(),
          type: z.string(),
          url: z.string().url(),
          expiryDate: z.date().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          checksum: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.uploadDelivererDocument(
          delivererId,
          input,
          ctx.session.user.id,
        );
      }),

    // Validation automatique
    autoValidate: protectedProcedure
      .input(z.object({ documentId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        return await DeliveryService.autoValidateDocument(input.documentId);
      }),

    // Validation admin
    validate: adminProcedure
      .input(
        z.object({ documentId: z.string(),
          status: z.enum(["APPROVED", "REJECTED"]),
          rejectionReason: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        return await DeliveryService.validateDelivererDocument(
          input.documentId,
          input,
          ctx.session.user.id,
        );
      })}),

  // ===== ROUTES ET ZONES =====

  routes: router({ // Créer une route avec zones détaillées
    create: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          name: z.string().min(2).max(100),
          description: z.string().optional(),
          priority: z.number().min(1).max(3).optional(),
          estimatedDuration: z.number().optional(),
          maxDeliveries: z.number().min(1).max(20).optional(),
          vehicleType: z.string().optional(),
          trafficFactor: z.number().min(0.5).max(3).optional(),
          weatherSensitive: z.boolean().optional(),
          preferredTimeSlots: z.array(z.string()).optional(),
          dayPreferences: z.array(z.number().min(0).max(6)).optional(),
          zones: z.array(
            z.object({
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
              radius: z.number().min(0.5).max(25),
              cityName: z.string().optional(),
              postalCodes: z.array(z.string()).optional(),
              isPreferred: z.boolean().optional(),
              trafficLevel: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
              parkingDifficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
              accessNotes: z.string().optional(),
              timeRestrictions: z.array(z.string()).optional(),
              vehicleRestrictions: z.array(z.string()).optional(),
              weatherSensitive: z.boolean().optional() }),
          )}),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.createDelivererRoute(
          delivererId,
          input,
          ctx.session.user.id,
        );
      }),

    // Lister les routes
    getAll: protectedProcedure
      .input(
        z.object({ delivererId: z.string().optional(),
          includeInactive: z.boolean().default(false) }),
      )
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        const profile = await DeliveryService.getDelivererProfile(
          delivererId,
          ctx.session.user.id,
        );

        return input.includeInactive
          ? profile.routes
          : profile.routes.filter((route) => route.isActive);
      }),

    // Optimisation intelligente
    optimize: protectedProcedure
      .input(z.object({ delivererId: z.string().optional()  }))
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.optimizeDelivererRoutes(delivererId);
      }),

    // Suggestions basées sur l'historique
    getSuggestions: protectedProcedure
      .input(z.object({ delivererId: z.string().optional()  }))
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getRoutesSuggestions(delivererId);
      }),

    // Mettre à jour les statistiques
    updateStats: protectedProcedure
      .input(z.object({ deliveryId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        return await DeliveryService.updateRouteStatistics(input.deliveryId);
      }),

    // Supprimer une route
    delete: protectedProcedure
      .input(z.object({ routeId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        const route = await ctx.db.delivererRoute.findUnique({
          where: { id: input.routeId }});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route introuvable" });
        }

        if (
          route.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé"  });
        }

        return await ctx.db.delivererRoute.delete({
          where: { id: input.routeId }});
      }),

    // Activer/désactiver
    toggleActive: protectedProcedure
      .input(
        z.object({ routeId: z.string(),
          isActive: z.boolean() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const route = await ctx.db.delivererRoute.findUnique({
          where: { id: input.routeId }});

        if (!route) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Route introuvable" });
        }

        if (
          route.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé"  });
        }

        return await ctx.db.delivererRoute.update({
          where: { id: input.routeId },
          data: { isActive: input.isActive }});
      })}),

  // ===== PLANNING ET DISPONIBILITÉ =====

  schedule: router({ // Mettre à jour planning complet
    update: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          schedules: z.array(
            z.object({
              dayOfWeek: z.number().min(0).max(6),
              startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
              endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
              isAvailable: z.boolean(),
              maxDeliveries: z.number().min(1).max(10).optional(),
              isRecurring: z.boolean().optional(),
              breakStart: z
                .string()
                .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
                .optional(),
              breakEnd: z
                .string()
                .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
                .optional(),
              timeSlots: z.number().min(1).max(10).optional(),
              preferredZones: z.array(z.string()).optional() }),
          )}),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.updateDelivererSchedule(
          delivererId,
          input.schedules,
          ctx.session.user.id,
        );
      }),

    // Récupérer planning
    get: protectedProcedure
      .input(z.object({ delivererId: z.string().optional()  }))
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;

        return await ctx.db.delivererSchedule.findMany({
          where: { delivererId },
          include: { exceptions },
          orderBy: { dayOfWeek: "asc" }});
      }),

    // Planning optimisé avec suggestions
    getOptimized: protectedProcedure
      .input(
        z.object({ delivererId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional() }),
      )
      .query(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        const startDate = input.startDate || new Date();
        const endDate =
          input.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        return await DeliveryService.getOptimizedSchedule(
          delivererId,
          startDate,
          endDate,
        );
      }),

    // Ajouter exception
    addException: protectedProcedure
      .input(
        z.object({ delivererId: z.string().optional(),
          date: z.date(),
          isAvailable: z.boolean(),
          startTime: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(),
          endTime: z
            .string()
            .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .optional(),
          reason: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.addScheduleException(
          delivererId,
          input,
          ctx.session.user.id,
        );
      }),

    // Supprimer exception
    deleteException: protectedProcedure
      .input(z.object({ exceptionId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        const exception = await ctx.db.scheduleException.findUnique({
          where: { id: input.exceptionId },
          include: { schedule }});

        if (!exception) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Exception introuvable" });
        }

        if (
          exception.schedule.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès refusé"  });
        }

        return await ctx.db.scheduleException.delete({
          where: { id: input.exceptionId }});
      })}),

  // ===== DISPONIBILITÉ TEMPS RÉEL =====

  availability: router({ // Mettre à jour disponibilité
    update: protectedProcedure
      .input(
        z.object({
          isAvailable: z.boolean(),
          latitude: z.number().min(-90).max(90).optional(),
          longitude: z.number().min(-180).max(180).optional(),
          reason: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        return await DeliveryService.updateDelivererAvailability(
          ctx.session.user.id,
          input,
          ctx.session.user.id,
        );
      }),

    // Position temps réel
    updateLocation: protectedProcedure
      .input(
        z.object({ latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          accuracy: z.number().optional(),
          speed: z.number().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        return await DeliveryService.updateLiveLocation(ctx.session.user.id, {
          latitude: input.latitude,
          longitude: input.longitude});
      }),

    // Livreurs disponibles dans une zone
    getInArea: protectedProcedure
      .input(
        z.object({ latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radiusKm: z.number().min(1).max(50).default(10) }),
      )
      .query(async ({ ctx, input: input  }) => {
        return await DeliveryService.getAvailableDeliverersInArea(
          input.latitude,
          input.longitude,
          input.radiusKm,
        );
      })}),

  // ===== MOBILE API =====

  mobile: router({ // Dashboard complet
    getDashboard: protectedProcedure.query(async ({ ctx  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }
      return await DeliveryService.getMobileDelivererDashboard(
        ctx.session.user.id,
      );
    }),

    // Statistiques rapides
    getQuickStats: protectedProcedure.query(async ({ ctx  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayDeliveries, weekDeliveries, totalEarnings, activeCount] =
        await Promise.all([
          ctx.db.delivery.count({
            where: {
              delivererId: ctx.session.user.id,
              status: "DELIVERED",
              completionTime: { gte }}}),
          ctx.db.delivery.count({
            where: {
              delivererId: ctx.session.user.id,
              status: "DELIVERED",
              completionTime: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}}}),
          ctx.db.delivery.aggregate({
            where: {
              delivererId: ctx.session.user.id,
              status: "DELIVERED",
              completionTime: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}},
            sum: { price }}),
          ctx.db.delivery.count({
            where: {
              delivererId: ctx.session.user.id,
              status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] }}})]);

      return {
        todayDeliveries,
        weekDeliveries,
        monthlyEarnings: totalEarnings.sum.price || 0,
        activeDeliveries: activeCount};
    }),

    // Livraisons actives optimisées mobile
    getActiveDeliveries: protectedProcedure.query(async ({ ctx  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }

      return await ctx.db.delivery.findMany({
        where: {
          delivererId: ctx.session.user.id,
          status: { in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"] }},
        include: {
          announcement: {
            select: {
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              pickupLatitude: true,
              pickupLongitude: true,
              deliveryLatitude: true,
              deliveryLongitude: true}},
          client: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true, phone: true }}}},
          coordinates: {
            orderBy: { timestamp: "desc" },
            take: 1}},
        orderBy: { createdAt: "asc" }});
    }),

    // Propositions en attente
    getPendingMatches: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(10)  }))
      .query(async ({ ctx, input: input  }) => {
        if (ctx.session.user.role !== "DELIVERER") {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès réservé aux livreurs" });
        }

        return await ctx.db.announcementMatching.findMany({
          where: {
            delivererId: ctx.session.user.id,
            status: { in: ["SUGGESTED", "NOTIFIED"] }},
          include: {
            announcement: {
              include: {
                client: {
                  select: {
                    profile: { select: { firstName: true, lastName: true } }}}}}},
          orderBy: { matchingScore: "desc" },
          take: input.limit});
      }),

    // Répondre à une proposition
    respondToMatch: protectedProcedure
      .input(
        z.object({ matchingId: z.string(),
          response: z.enum(["ACCEPTED", "DECLINED"]),
          rejectionReason: z.string().optional() }),
      )
      .mutation(async ({ ctx, input: input  }) => {
        if (ctx.session.user.role !== "DELIVERER") {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Accès réservé aux livreurs" });
        }
        return await DeliveryService.respondToDeliveryProposal(
          input.matchingId,
          input.response,
          ctx.session.user.id,
        );
      })}),

  // ===== NOTIFICATIONS =====

  notifications: router({ // Notifications non lues
    getUnread: protectedProcedure.query(async ({ ctx  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }

      return await ctx.db.delivererNotification.findMany({
        where: {
          delivererId: ctx.session.user.id,
          readAt: null},
        orderBy: { createdAt: "desc" },
        take: 20});
    }),

    // Marquer comme lue
    markRead: protectedProcedure
      .input(z.object({ notificationId: z.string()  }))
      .mutation(async ({ ctx, input: input  }) => {
        return await ctx.db.delivererNotification.update({
          where: {
            id: input.notificationId,
            delivererId: ctx.session.user.id},
          data: {
            readAt: new Date(),
            status: "read"}});
      }),

    // Marquer toutes comme lues
    markAllRead: protectedProcedure.mutation(async ({ ctx  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }

      return await ctx.db.delivererNotification.updateMany({
        where: {
          delivererId: ctx.session.user.id,
          readAt: null},
        data: {
          readAt: new Date(),
          status: "read"}});
    })}),

  // ===== DASHBOARD MOBILE =====

  getMobileDashboard: protectedProcedure.query(async ({ ctx  }) => {
    if (ctx.session.user.role !== "DELIVERER") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès réservé aux livreurs" });
    }

    const delivererId = ctx.session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Récupérer les livraisons actives
    const activeDeliveries = await ctx.db.delivery.findMany({
      where: {
        delivererId,
        status: {
          in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT"]}},
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            pickupAddress: true,
            deliveryAddress: true,
            pickupCoordinates: true,
            deliveryCoordinates: true}}},
      orderBy: { createdAt: "desc" }});

    // Statistiques du jour
    const todayDeliveries = await ctx.db.delivery.count({
      where: {
        delivererId,
        completedAt: {
          gte: today,
          lt: tomorrow},
        status: "COMPLETED"}});

    const todayEarnings = await ctx.db.payment.aggregate({
      where: {
        userId: delivererId,
        status: "COMPLETED",
        createdAt: {
          gte: today,
          lt: tomorrow}},
      sum: { amount }});

    // Statistiques du mois
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEarnings = await ctx.db.payment.aggregate({
      where: {
        userId: delivererId,
        status: "COMPLETED",
        createdAt: { gte }},
      sum: { amount }});

    // Note moyenne
    const ratings = await ctx.db.deliveryReview.aggregate({
      where: {
        delivery: {
          delivererId}},
      avg: { rating },
      count: { id }});

    // Nouvelles annonces (non vues)
    const newAnnouncements = await ctx.db.announcement.count({
      where: {
        status: "ACTIVE",
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
        },
        deliveries: {
          none: {
            delivererId}}}});

    // Notifications non lues
    const unreadNotifications = await ctx.db.notification.count({
      where: {
        userId: delivererId,
        isRead: false}});

    return {
      stats: {
        todayDeliveries,
        averageRating: ratings.avg.rating || 0,
        totalRatings: ratings.count.id},
      activeDeliveries: activeDeliveries.map((delivery) => ({ id: delivery.id,
        trackingCode: delivery.trackingCode,
        status: delivery.status,
        price: delivery.price,
        createdAt: delivery.createdAt,
        announcement: delivery.announcement })),
      earnings: {
        today: todayEarnings.sum.amount || 0,
        month: monthEarnings.sum.amount || 0},
      newAnnouncements,
      unreadNotifications,
      todayDeliveries};
  }),

  // Récupérer les livraisons planifiées
  getPlannedDeliveries: protectedProcedure
    .input(
      z.object({ date: z.date(),
        limit: z.number().optional().default(10) }),
    )
    .query(async ({ ctx, input  }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès réservé aux livreurs" });
      }

      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      return await ctx.db.plannedRoute.findMany({
        where: {
          delivererId: ctx.session.user.id,
          plannedDate: {
            gte: startOfDay,
            lte: endOfDay},
          status: "SCHEDULED"},
        orderBy: {
          plannedDate: "asc"},
        take: input.limit,
        select: {
          id: true,
          plannedDate: true,
          priority: true,
          pickupAddress: true,
          deliveryAddress: true,
          estimatedDistance: true,
          price: true}});
    })});
