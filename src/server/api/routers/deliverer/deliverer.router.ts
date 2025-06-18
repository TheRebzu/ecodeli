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
      }),

    // Earnings endpoints
    getEarnings: protectedProcedure
      .input(z.object({
        period: z.enum(["week", "month", "year"]).default("month")
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.session.user.role !== "DELIVERER") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux livreurs" });
        }

        const delivererId = ctx.session.user.id;
        const now = new Date();
        
        let startDate: Date;
        let previousStartDate: Date;
        
        switch (input.period) {
          case "week":
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            previousStartDate = new Date(startDate);
            previousStartDate.setDate(startDate.getDate() - 7);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
            break;
          default: // month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }

        const endDate = now;

        // Calculs des gains actuels
        const [currentEarnings, previousEarnings, todayEarnings, pendingPayments] = await Promise.all([
          ctx.db.delivery.aggregate({
            where: {
              delivererId,
              status: "DELIVERED",
              completedAt: { gte: startDate, lte: endDate }
            },
            _sum: { price: true },
            _count: true
          }),
          ctx.db.delivery.aggregate({
            where: {
              delivererId,
              status: "DELIVERED",
              completedAt: { gte: previousStartDate, lt: startDate }
            },
            _sum: { price: true }
          }),
          ctx.db.delivery.aggregate({
            where: {
              delivererId,
              status: "DELIVERED",
              completedAt: {
                gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                lte: endDate
              }
            },
            _sum: { price: true }
          }),
          ctx.db.payment.aggregate({
            where: {
              userId: delivererId,
              status: "PENDING"
            },
            _sum: { amount: true }
          })
        ]);

        const total = currentEarnings._sum.price?.toNumber() || 0;
        const previous = previousEarnings._sum.price?.toNumber() || 0;
        const today = todayEarnings._sum.price?.toNumber() || 0;
        const pending = pendingPayments._sum.amount?.toNumber() || 0;
        const deliveryCount = currentEarnings._count || 1;
        const averagePerDelivery = total / deliveryCount;

        const calculateTrend = (current: number, prev: number) => {
          if (prev === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - prev) / prev) * 100);
        };

        // Objectif mensuel (pourrait être configuré par utilisateur)
        const goal = 1000;
        const goalProgress = Math.min(100, (total / goal) * 100);
        const remainingDays = input.period === "month" 
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
          : 0;

        return {
          total,
          pending,
          today,
          averagePerDelivery,
          totalTrend: calculateTrend(total, previous),
          pendingTrend: 0, // À calculer si nécessaire
          todayTrend: 0, // À calculer si nécessaire
          averageTrend: 0, // À calculer si nécessaire
          goal,
          goalProgress,
          remainingDays
        };
      }),

    getRecentPayouts: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(10).default(5) }))
      .query(async ({ ctx, input }) => {
        if (ctx.session.user.role !== "DELIVERER") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux livreurs" });
        }

        return await ctx.db.payment.findMany({
          where: { userId: ctx.session.user.id },
          orderBy: { createdAt: "desc" },
          take: input.limit,
          select: {
            id: true,
            amount: true,
            status: true,
            method: true,
            createdAt: true
          }
        });
      }),

    getMonthlyBreakdown: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== "DELIVERER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux livreurs" });
      }

      const delivererId = ctx.session.user.id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Récupérer les livraisons du mois par type de service
      const deliveries = await ctx.db.delivery.findMany({
        where: {
          delivererId,
          status: "DELIVERED",
          completedAt: { gte: startOfMonth }
        },
        include: {
          announcement: {
            select: { packageType: true }
          }
        }
      });

      // Grouper par catégorie
      const categories = {
        documents: 0,
        packages: 0,
        food: 0,
        fragile: 0,
        other: 0
      };

      deliveries.forEach(delivery => {
        const price = delivery.price?.toNumber() || 0;
        const type = delivery.announcement?.packageType?.toLowerCase() || "other";
        
        switch (type) {
          case "document":
            categories.documents += price;
            break;
          case "package":
            categories.packages += price;
            break;
          case "food":
            categories.food += price;
            break;
          case "fragile":
            categories.fragile += price;
            break;
          default:
            categories.other += price;
        }
      });

      const total = Object.values(categories).reduce((sum, amount) => sum + amount, 0);

      return {
        categories,
        total
      };
    })
  })
});
