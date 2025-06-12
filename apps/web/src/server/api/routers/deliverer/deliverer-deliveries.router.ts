import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { DeliveryService } from '@/server/services/deliverer/delivery.service';
import {
  deliveryFilterSchema,
  deliveryStatusUpdateSchema,
  deliveryCoordinatesUpdateSchema,
  deliveryConfirmationSchema,
  deliveryRatingSchema,
  autoAssignDelivererSchema,
  delivererAvailabilitySchema,
  routeOptimizationSchema,
  deliveryProofSchema,
} from '@/schemas/delivery/delivery.schema';

export const delivererDeliveriesRouter = router({
  // Livraisons planifiées pour le dashboard
  getPlannedDeliveries: protectedProcedure
    .input(
      z.object({
        date: z.date().optional(),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'utilisateur est un livreur
      const deliverer = await ctx.db.user.findUnique({
        where: { id: userId, role: 'DELIVERER' },
        include: { deliverer: true },
      });

      if (!deliverer?.deliverer) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      const targetDate = input.date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      return await ctx.db.delivery.findMany({
        where: {
          delivererId: deliverer.deliverer.id,
          status: { in: ['ACCEPTED', 'SCHEDULED'] },
          plannedDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          announcement: {
            select: {
              pickupAddress: true,
              deliveryAddress: true,
              price: true,
              priority: true,
            },
          },
        },
        orderBy: { plannedDate: 'asc' },
        take: input.limit,
      });
    }),
});

export const deliveryRouter = router({
  // ===== ENDPOINTS EXISTANTS AMÉLIORÉS =====

  getStats: adminProcedure
    .input(
      z.object({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Utiliser des valeurs par défaut si non fournies
        const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 jours par défaut
        const endDate = input.endDate || new Date();

        return await DeliveryService.getStats(startDate, endDate);
      } catch (error) {
        console.error('Erreur dans delivery.getStats:', error);
        throw error;
      }
    }),

  getAll: protectedProcedure.input(deliveryFilterSchema).query(async ({ ctx, input }) => {
    return await DeliveryService.getAll(input, ctx.session.user.id, ctx.session.user.role);
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return await DeliveryService.getById(input.id, ctx.session.user.id, ctx.session.user.role);
  }),

  updateStatus: protectedProcedure
    .input(deliveryStatusUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return await DeliveryService.updateStatus(input, ctx.session.user.id);
    }),

  confirmCode: protectedProcedure
    .input(deliveryConfirmationSchema)
    .mutation(async ({ ctx, input }) => {
      return await DeliveryService.validateDeliveryCode(input, ctx.session.user.id);
    }),

  // ===== NOUVEAUX ENDPOINTS LIVREURS =====

  // Gestion du profil livreur
  deliverer: router({
    // Profil complet du livreur
    getProfile: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getDelivererProfile(delivererId, ctx.session.user.id);
      }),

    // Mise à jour du profil
    updateProfile: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          profile: z
            .object({
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              phone: z.string().optional(),
              bio: z.string().optional(),
            })
            .optional(),
          preferences: z
            .object({
              preferredTypes: z.array(z.string()).optional(),
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
              notifyBySms: z.boolean().optional(),
            })
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.updateDelivererProfile(
          delivererId,
          input,
          ctx.session.user.id
        );
      }),

    // Upload de document avec métadonnées avancées
    uploadDocument: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          type: z.string(),
          url: z.string().url(),
          expiryDate: z.date().optional(),
          fileSize: z.number().optional(),
          mimeType: z.string().optional(),
          checksum: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.uploadDelivererDocument(
          delivererId,
          input,
          ctx.session.user.id
        );
      }),

    // Récupérer tous les documents d'un livreur
    getDocuments: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getDelivererDocuments(delivererId, ctx.session.user.id);
      }),

    // Validation automatique d'un document
    autoValidateDocument: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.autoValidateDocument(input.documentId);
      }),

    // Dashboard mobile
    getMobileDashboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
      }
      return await DeliveryService.getMobileDelivererDashboard(ctx.session.user.id);
    }),

    // Répondre à une proposition
    respondToProposal: protectedProcedure
      .input(
        z.object({
          matchingId: z.string(),
          response: z.enum(['ACCEPTED', 'DECLINED']),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.session.user.role !== 'DELIVERER') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
        }
        return await DeliveryService.respondToDeliveryProposal(
          input.matchingId,
          input.response,
          ctx.session.user.id
        );
      }),

    // Mise à jour position temps réel
    updateLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.session.user.role !== 'DELIVERER') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
        }
        return await DeliveryService.updateLiveLocation(ctx.session.user.id, input);
      }),
  }),

  // ===== GESTION DES ROUTES =====

  routes: router({
    // Créer une route personnalisée
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
              trafficLevel: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
              parkingDifficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
              accessNotes: z.string().optional(),
              timeRestrictions: z.array(z.string()).optional(),
              vehicleRestrictions: z.array(z.string()).optional(),
              weatherSensitive: z.boolean().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.createDelivererRoute(delivererId, input, ctx.session.user.id);
      }),

    // Lister les routes d'un livreur
    getByDeliverer: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        const profile = await DeliveryService.getDelivererProfile(delivererId, ctx.session.user.id);
        return profile.routes;
      }),

    // Optimiser automatiquement les routes
    optimize: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.optimizeDelivererRoutes(delivererId);
      }),

    // Suggestions de routes intelligentes
    getSuggestions: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.getRoutesSuggestions(delivererId);
      }),

    // Mettre à jour les statistiques d'une route
    updateStatistics: protectedProcedure
      .input(z.object({ deliveryId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.updateRouteStatistics(input.deliveryId);
      }),

    // Supprimer une route
    delete: protectedProcedure
      .input(z.object({ routeId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const route = await ctx.db.delivererRoute.findUnique({
          where: { id: input.routeId },
        });

        if (!route) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Route introuvable' });
        }

        if (route.delivererId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return await ctx.db.delivererRoute.delete({
          where: { id: input.routeId },
        });
      }),

    // Activer/désactiver une route
    toggleActive: protectedProcedure
      .input(
        z.object({
          routeId: z.string(),
          isActive: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const route = await ctx.db.delivererRoute.findUnique({
          where: { id: input.routeId },
        });

        if (!route) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Route introuvable' });
        }

        if (route.delivererId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return await ctx.db.delivererRoute.update({
          where: { id: input.routeId },
          data: { isActive: input.isActive },
        });
      }),
  }),

  // ===== GESTION DU PLANNING =====

  schedule: router({
    // Mettre à jour le planning
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
              preferredZones: z.array(z.string()).optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.updateDelivererSchedule(
          delivererId,
          input.schedules,
          ctx.session.user.id
        );
      }),

    // Ajouter une exception au planning
    addException: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
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
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        return await DeliveryService.addScheduleException(delivererId, input, ctx.session.user.id);
      }),

    // Récupérer le planning optimisé
    getOptimized: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;
        const startDate = input.startDate || new Date();
        const endDate = input.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours par défaut

        return await DeliveryService.getOptimizedSchedule(delivererId, startDate, endDate);
      }),

    // Mettre à jour la disponibilité
    updateAvailability: protectedProcedure
      .input(delivererAvailabilitySchema)
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.updateDelivererAvailability(
          ctx.session.user.id,
          input,
          ctx.session.user.id
        );
      }),

    // Livreurs disponibles dans une zone
    getAvailableInArea: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radiusKm: z.number().min(1).max(50).default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        return await DeliveryService.getAvailableDeliverersInArea(
          input.latitude,
          input.longitude,
          input.radiusKm
        );
      }),

    // Récupérer le planning d'un livreur
    getByDeliverer: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;

        return await ctx.db.delivererSchedule.findMany({
          where: { delivererId },
          include: { exceptions: true },
          orderBy: { dayOfWeek: 'asc' },
        });
      }),

    // Supprimer une exception
    deleteException: protectedProcedure
      .input(z.object({ exceptionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const exception = await ctx.db.scheduleException.findUnique({
          where: { id: input.exceptionId },
          include: { schedule: true },
        });

        if (!exception) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Exception introuvable' });
        }

        if (
          exception.schedule.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== 'ADMIN'
        ) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return await ctx.db.scheduleException.delete({
          where: { id: input.exceptionId },
        });
      }),
  }),

  // ===== SYSTÈME DE MATCHING =====

  matching: router({
    // Calculer le score de matching
    calculateScore: protectedProcedure
      .input(
        z.object({
          announcementId: z.string(),
          delivererId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        return await DeliveryService.calculateMatchingScore(
          input.announcementId,
          input.delivererId
        );
      }),

    // Trouver les meilleurs matchs
    findBest: protectedProcedure
      .input(
        z.object({
          announcementId: z.string(),
          limit: z.number().min(1).max(20).default(5),
        })
      )
      .query(async ({ ctx, input }) => {
        return await DeliveryService.findBestMatches(input.announcementId, input.limit);
      }),

    // Assignment automatique
    autoAssign: protectedProcedure
      .input(autoAssignDelivererSchema)
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.assignDelivery(input.announcementId);
      }),

    // Récupérer les correspondances d'un livreur
    getForDeliverer: protectedProcedure
      .input(
        z.object({
          delivererId: z.string().optional(),
          status: z.enum(['SUGGESTED', 'NOTIFIED', 'ACCEPTED', 'DECLINED']).optional(),
          limit: z.number().min(1).max(50).default(10),
        })
      )
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;

        const whereClause: any = { delivererId };
        if (input.status) {
          whereClause.status = input.status;
        }

        return await ctx.db.announcementMatching.findMany({
          where: whereClause,
          include: {
            announcement: {
              include: {
                client: {
                  select: {
                    id: true,
                    profile: {
                      select: { firstName: true, lastName: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { matchingScore: 'desc' },
          take: input.limit,
        });
      }),

    // Mettre à jour le statut d'un matching
    updateStatus: protectedProcedure
      .input(
        z.object({
          matchingId: z.string(),
          status: z.enum(['ACCEPTED', 'DECLINED']),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const matching = await ctx.db.announcementMatching.findUnique({
          where: { id: input.matchingId },
        });

        if (!matching) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Correspondance introuvable' });
        }

        if (matching.delivererId !== ctx.session.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return await ctx.db.announcementMatching.update({
          where: { id: input.matchingId },
          data: {
            status: input.status,
            respondedAt: new Date(),
            ...(input.status === 'ACCEPTED' && { acceptedAt: new Date() }),
            ...(input.status === 'DECLINED' && {
              rejectedAt: new Date(),
              rejectionReason: input.rejectionReason,
            }),
          },
        });
      }),
  }),

  // ===== ENDPOINTS SPÉCIALISÉS MOBILE =====

  mobile: router({
    // Dashboard complet mobile
    getDashboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
      }
      return await DeliveryService.getMobileDelivererDashboard(ctx.session.user.id);
    }),

    // Livraisons actives pour mobile
    getActiveDeliveries: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
      }

      return await ctx.db.delivery.findMany({
        where: {
          delivererId: ctx.session.user.id,
          status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
        },
        include: {
          announcement: {
            select: {
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              pickupLatitude: true,
              pickupLongitude: true,
              deliveryLatitude: true,
              deliveryLongitude: true,
            },
          },
          client: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true, phone: true } },
            },
          },
          coordinates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      });
    }),

    // Propositions en attente
    getPendingMatches: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(20).default(10) }))
      .query(async ({ ctx, input }) => {
        if (ctx.session.user.role !== 'DELIVERER') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
        }

        return await ctx.db.announcementMatching.findMany({
          where: {
            delivererId: ctx.session.user.id,
            status: { in: ['SUGGESTED', 'NOTIFIED'] },
          },
          include: {
            announcement: {
              include: {
                client: {
                  select: {
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          orderBy: { matchingScore: 'desc' },
          take: input.limit,
        });
      }),

    // Mise à jour position en temps réel
    updatePosition: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          accuracy: z.number().optional(),
          speed: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.session.user.role !== 'DELIVERER') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
        }

        return await DeliveryService.updateLiveLocation(ctx.session.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
        });
      }),

    // Statistiques rapides mobile
    getQuickStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayDeliveries, weekDeliveries, totalEarnings, activeCount] = await Promise.all([
        ctx.db.delivery.count({
          where: {
            delivererId: ctx.session.user.id,
            status: 'DELIVERED',
            completionTime: { gte: today },
          },
        }),
        ctx.db.delivery.count({
          where: {
            delivererId: ctx.session.user.id,
            status: 'DELIVERED',
            completionTime: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        ctx.db.delivery.aggregate({
          where: {
            delivererId: ctx.session.user.id,
            status: 'DELIVERED',
            completionTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
          _sum: { price: true },
        }),
        ctx.db.delivery.count({
          where: {
            delivererId: ctx.session.user.id,
            status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
        }),
      ]);

      return {
        todayDeliveries,
        weekDeliveries,
        monthlyEarnings: totalEarnings._sum.price || 0,
        activeDeliveries: activeCount,
      };
    }),

    // Notifications push pour mobile
    markNotificationRead: protectedProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return await ctx.db.delivererNotification.update({
          where: {
            id: input.notificationId,
            delivererId: ctx.session.user.id,
          },
          data: {
            readAt: new Date(),
            status: 'READ',
          },
        });
      }),

    // Récupérer les notifications non lues
    getUnreadNotifications: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès réservé aux livreurs' });
      }

      return await ctx.db.delivererNotification.findMany({
        where: {
          delivererId: ctx.session.user.id,
          readAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    }),
  }),

  // ===== SUIVI ET COORDONNÉES =====

  tracking: router({
    // Mettre à jour les coordonnées
    updateCoordinates: protectedProcedure
      .input(deliveryCoordinatesUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.updateCoordinates(input, ctx.session.user.id);
      }),

    // Coordonnées récentes des livraisons
    getLatestCoordinates: protectedProcedure
      .input(
        z.object({
          deliveryIds: z.array(z.string()),
        })
      )
      .query(async ({ ctx, input }) => {
        try {
          const coordinates = await ctx.db.deliveryCoordinates.findMany({
            where: {
              deliveryId: { in: input.deliveryIds },
            },
            orderBy: { timestamp: 'desc' },
            distinct: ['deliveryId'],
            select: {
              deliveryId: true,
              latitude: true,
              longitude: true,
              timestamp: true,
            },
          });
          return coordinates;
        } catch (error) {
          console.error('Erreur lors de la récupération des coordonnées:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Impossible de récupérer les coordonnées des livraisons',
          });
        }
      }),

    // Données pour carte thermique
    getHeatmapData: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        try {
          const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const endDate = input.endDate || new Date();

          const heatmapData = await ctx.db.deliveryCoordinates.groupBy({
            by: ['latitude', 'longitude'],
            where: {
              timestamp: {
                gte: startDate,
                lte: endDate,
              },
            },
            _count: {
              id: true,
            },
            having: {
              id: {
                _count: {
                  gt: 1,
                },
              },
            },
          });

          return heatmapData.map(item => ({
            latitude: Number(item.latitude.toFixed(3)),
            longitude: Number(item.longitude.toFixed(3)),
            count: item._count.id,
          }));
        } catch (error) {
          console.error('Erreur lors de la récupération des données de la carte thermique:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Impossible de récupérer les données de la carte thermique',
          });
        }
      }),
  }),

  // ===== ÉVALUATIONS =====

  rating: router({
    // Évaluer une livraison
    create: protectedProcedure.input(deliveryRatingSchema).mutation(async ({ ctx, input }) => {
      return await DeliveryService.rateDelivery(input, ctx.session.user.id);
    }),

    // Statistiques d'évaluation d'un livreur
    getDelivererStats: protectedProcedure
      .input(z.object({ delivererId: z.string() }))
      .query(async ({ ctx, input }) => {
        return await ctx.db.delivererStats.findUnique({
          where: { delivererId: input.delivererId },
        });
      }),
  }),

  // ===== PREUVES DE LIVRAISON =====

  proof: router({
    // Ajouter une preuve
    upload: protectedProcedure.input(deliveryProofSchema).mutation(async ({ ctx, input }) => {
      const delivery = await ctx.db.delivery.findUnique({
        where: { id: input.deliveryId },
      });

      if (!delivery || delivery.delivererId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
      }

      return await ctx.db.deliveryProof.create({
        data: {
          deliveryId: input.deliveryId,
          type: input.type,
          fileUrl: input.fileUrl,
          notes: input.notes,
        },
      });
    }),

    // Lister les preuves d'une livraison
    getByDelivery: protectedProcedure
      .input(z.object({ deliveryId: z.string() }))
      .query(async ({ ctx, input }) => {
        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.deliveryId },
        });

        if (!delivery) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Livraison introuvable' });
        }

        // Vérifier les permissions
        if (
          delivery.clientId !== ctx.session.user.id &&
          delivery.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== 'ADMIN'
        ) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return await ctx.db.deliveryProof.findMany({
          where: { deliveryId: input.deliveryId },
          orderBy: { uploadedAt: 'desc' },
        });
      }),
  }),

  // ===== INTÉGRATION VERIFICATION =====

  verification: router({
    // Valider un document livreur (admin uniquement)
    validateDocument: adminProcedure
      .input(
        z.object({
          documentId: z.string(),
          status: z.enum(['APPROVED', 'REJECTED']),
          rejectionReason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await DeliveryService.validateDelivererDocument(
          input.documentId,
          input,
          ctx.session.user.id
        );
      }),

    // Statut de vérification d'un livreur
    getDelivererStatus: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;

        // Récupérer les documents du livreur avec historique complet
        const applications = await ctx.db.deliveryApplication.findMany({
          where: { delivererId },
          include: {
            requiredDocuments: {
              include: {
                auditLogs: {
                  include: {
                    actor: { select: { profile: { select: { firstName: true, lastName: true } } } },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
                verifier: {
                  select: { profile: { select: { firstName: true, lastName: true } } },
                },
              },
              orderBy: { uploadedAt: 'desc' },
            },
          },
        });

        // Calculer le statut global
        let overallStatus = 'PENDING';
        let verifiedCount = 0;
        let totalCount = 0;

        applications.forEach(app => {
          app.requiredDocuments.forEach(doc => {
            totalCount++;
            if (doc.status === 'APPROVED') {
              verifiedCount++;
            }
          });
        });

        if (totalCount > 0) {
          if (verifiedCount === totalCount) {
            overallStatus = 'VERIFIED';
          } else if (verifiedCount > 0) {
            overallStatus = 'PARTIAL';
          }
        }

        return {
          applications,
          overallStatus,
          progress: totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0,
          verifiedCount,
          totalCount,
        };
      }),

    // Vérification automatique de tous les documents
    autoValidateAll: protectedProcedure
      .input(z.object({ delivererId: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const delivererId = input.delivererId || ctx.session.user.id;

        // Récupérer tous les documents en attente
        const documents = await ctx.db.applicationDocument.findMany({
          where: {
            application: { delivererId },
            status: 'PENDING',
            autoValidated: false,
          },
        });

        // Lancer la validation automatique pour chaque document
        const results = [];
        for (const doc of documents) {
          try {
            const result = await DeliveryService.autoValidateDocument(doc.id);
            results.push(result);
          } catch (error) {
            console.error(`Erreur validation auto document ${doc.id}:`, error);
          }
        }

        return {
          processedCount: results.length,
          autoApprovedCount: results.filter(r => r.status === 'APPROVED').length,
          results,
        };
      }),

    // Historique de validation d'un document
    getDocumentHistory: protectedProcedure
      .input(z.object({ documentId: z.string() }))
      .query(async ({ ctx, input }) => {
        const document = await ctx.db.applicationDocument.findUnique({
          where: { id: input.documentId },
          include: {
            application: true,
            auditLogs: {
              include: {
                actor: { select: { profile: { select: { firstName: true, lastName: true } } } },
              },
              orderBy: { createdAt: 'desc' },
            },
            previousVersion: true,
            nextVersions: true,
          },
        });

        if (!document) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Document introuvable' });
        }

        // Vérifier les permissions
        if (
          document.application.delivererId !== ctx.session.user.id &&
          ctx.session.user.role !== 'ADMIN'
        ) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' });
        }

        return document;
      }),

    // Statistiques de vérification (admin uniquement)
    getVerificationStats: adminProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const startDate = input.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate || new Date();

        const [
          totalDocuments,
          pendingDocuments,
          approvedDocuments,
          rejectedDocuments,
          autoApproved,
        ] = await Promise.all([
          ctx.db.applicationDocument.count({
            where: { uploadedAt: { gte: startDate, lte: endDate } },
          }),
          ctx.db.applicationDocument.count({
            where: {
              status: 'PENDING',
              uploadedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.db.applicationDocument.count({
            where: {
              status: 'APPROVED',
              verifiedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.db.applicationDocument.count({
            where: {
              status: 'REJECTED',
              verifiedAt: { gte: startDate, lte: endDate },
            },
          }),
          ctx.db.applicationDocument.count({
            where: {
              autoValidated: true,
              verifiedAt: { gte: startDate, lte: endDate },
            },
          }),
        ]);

        return {
          totalDocuments,
          pendingDocuments,
          approvedDocuments,
          rejectedDocuments,
          autoApproved,
          manualApproved: approvedDocuments - autoApproved,
          approvalRate: totalDocuments > 0 ? (approvedDocuments / totalDocuments) * 100 : 0,
          autoApprovalRate: totalDocuments > 0 ? (autoApproved / totalDocuments) * 100 : 0,
        };
      }),
  }),

  // ===== ENDPOINTS ADMIN =====

  admin: router({
    // Forcer l'assignment d'une livraison
    forceAssign: adminProcedure
      .input(
        z.object({
          announcementId: z.string(),
          delivererId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Créer directement la livraison
        const announcement = await ctx.db.announcement.findUnique({
          where: { id: input.announcementId },
        });

        if (!announcement) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Annonce introuvable' });
        }

        return await ctx.db.delivery.create({
          data: {
            announcementId: input.announcementId,
            delivererId: input.delivererId,
            clientId: announcement.clientId,
            status: 'PENDING',
            trackingCode: DeliveryService.generateTrackingCode(),
            price: announcement.suggestedPrice || 0,
          },
        });
      }),

    // Statistiques globales des livraisons
    getGlobalStats: adminProcedure.query(async ({ ctx }) => {
      const [totalDeliveries, activeDeliveries, completedToday] = await Promise.all([
        ctx.db.delivery.count(),
        ctx.db.delivery.count({
          where: {
            status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
        }),
        ctx.db.delivery.count({
          where: {
            status: 'DELIVERED',
            completionTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      return {
        totalDeliveries,
        activeDeliveries,
        completedToday,
      };
    }),
  }),
});
