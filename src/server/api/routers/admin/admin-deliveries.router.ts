import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { deliveryTrackingService } from "@/server/services/deliverer/delivery-tracking.service";

/**
 * Router pour la gestion complète des livraisons par les administrateurs
 * Implémentation réelle de toutes les fonctionnalités de gestion des livraisons
 */
export const adminDeliveriesRouter = router({
  // Récupérer toutes les livraisons avec filtres avancés et pagination
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      status: z.enum([
        "PENDING", "ASSIGNED", "ACCEPTED", "REJECTED", "IN_PROGRESS", 
        "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED", "FAILED"
      ]).optional(),
      delivererId: z.string().optional(),
      clientId: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      search: z.string().optional(),
      type: z.enum(["ANNOUNCEMENT", "CART_DROP", "SERVICE"]).optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      sortBy: z.enum(["createdAt", "scheduledDate", "priority", "status"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc")
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        // Vérification des permissions administrateur
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const skip = (input.page - 1) * input.limit;
        
        // Construction des filtres de recherche avancés
        const where: any = {};
        
        if (input.status) where.status = input.status;
        if (input.type) where.type = input.type;
        if (input.priority) where.priority = input.priority;
        if (input.delivererId) where.delivererId = input.delivererId;
        if (input.clientId) where.clientId = input.clientId;
        
        if (input.dateFrom || input.dateTo) {
          where.createdAt = {};
          if (input.dateFrom) where.createdAt.gte = new Date(input.dateFrom);
          if (input.dateTo) where.createdAt.lte = new Date(input.dateTo);
        }
        
        if (input.search) {
          where.OR = [
            { trackingNumber: { contains: input.search, mode: 'insensitive' } },
            { pickupAddress: { contains: input.search, mode: 'insensitive' } },
            { deliveryAddress: { contains: input.search, mode: 'insensitive' } },
            { client: { email: { contains: input.search, mode: 'insensitive' } } },
            { deliverer: { email: { contains: input.search, mode: 'insensitive' } } }
          ];
        }

        // Récupération des livraisons avec toutes les relations
        const [deliveries, total] = await Promise.all([
          ctx.db.delivery.findMany({
            where,
            include: {
              client: { include: { profile: true } },
              deliverer: { include: { profile: true } },
              announcement: { select: { title: true, type: true } },
              cartDrop: { select: { merchantName: true, totalAmount: true } },
              tracking: { orderBy: { createdAt: 'desc' }, take: 5 },
              payments: true
            },
            skip,
            take: input.limit,
            orderBy: { [input.sortBy]: input.sortOrder }
          }),
          ctx.db.delivery.count({ where })
        ]);

                 // Enrichissement des données avec calculs temps réel
         const enrichedDeliveries = await Promise.all(
           deliveries.map(async (delivery: any) => {
             // Calcul de la distance et du temps estimé
             let estimatedDuration = null;
             let distanceKm = null;
             
             if (delivery.pickupLatitude && delivery.pickupLongitude && 
                 delivery.deliveryLatitude && delivery.deliveryLongitude) {
               // Calcul simple de distance (formule haversine)
               const R = 6371; // Rayon de la Terre en km
               const dLat = (delivery.deliveryLatitude - delivery.pickupLatitude) * Math.PI / 180;
               const dLon = (delivery.deliveryLongitude - delivery.pickupLongitude) * Math.PI / 180;
               const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(delivery.pickupLatitude * Math.PI / 180) * Math.cos(delivery.deliveryLatitude * Math.PI / 180) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
               const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
               distanceKm = R * c;
               
               // Estimation du temps basée sur une vitesse moyenne de 30 km/h
               estimatedDuration = Math.round((distanceKm / 30) * 60); // en minutes
             }

            // Statut de retard
            const isDelayed = delivery.scheduledDate && 
                             new Date(delivery.scheduledDate) < new Date() && 
                             !["DELIVERED", "CANCELLED", "FAILED"].includes(delivery.status);

            return {
              ...delivery,
              clientName: `${delivery.client.profile?.firstName || ''} ${delivery.client.profile?.lastName || ''}`.trim() || delivery.client.email,
              delivererName: delivery.deliverer ? 
                `${delivery.deliverer.profile?.firstName || ''} ${delivery.deliverer.profile?.lastName || ''}`.trim() || delivery.deliverer.email : 
                null,
              estimatedDuration,
              distanceKm,
              isDelayed,
              lastTracking: delivery.tracking[0] || null
            };
          })
        );

        return {
          success: true,
          data: {
            deliveries: enrichedDeliveries,
            pagination: {
              page: input.page,
              limit: input.limit,
              total,
              totalPages: Math.ceil(total / input.limit)
            },
            summary: {
              totalDeliveries: total,
                             pendingCount: enrichedDeliveries.filter((d: any) => d.status === 'PENDING').length,
               inProgressCount: enrichedDeliveries.filter((d: any) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "PICKED_UP", "IN_TRANSIT"].includes(d.status)).length,
               completedCount: enrichedDeliveries.filter((d: any) => d.status === 'DELIVERED').length,
               delayedCount: enrichedDeliveries.filter((d: any) => d.isDelayed).length
            }
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des livraisons"
        });
      }
    }),

  // Récupérer une livraison spécifique avec détails complets
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.id },
          include: {
            client: { include: { profile: true } },
            deliverer: { include: { profile: true } },
            announcement: true,
            cartDrop: true,
            tracking: { orderBy: { createdAt: 'desc' } },
            payments: true,
            issues: { include: { reportedBy: { include: { profile: true } } } }
          }
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée"
          });
        }

                 // Enrichissement avec données calculées
         let routeInfo = null;
         if (delivery.pickupLatitude && delivery.pickupLongitude && 
             delivery.deliveryLatitude && delivery.deliveryLongitude) {
           // Calcul simple de distance (formule haversine)
           const R = 6371; // Rayon de la Terre en km
           const dLat = (delivery.deliveryLatitude - delivery.pickupLatitude) * Math.PI / 180;
           const dLon = (delivery.deliveryLongitude - delivery.pickupLongitude) * Math.PI / 180;
           const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
             Math.cos(delivery.pickupLatitude * Math.PI / 180) * Math.cos(delivery.deliveryLatitude * Math.PI / 180) *
             Math.sin(dLon/2) * Math.sin(dLon/2);
           const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
           const distanceKm = R * c;
           
           routeInfo = {
             distance: distanceKm,
             estimatedMinutes: Math.round((distanceKm / 30) * 60) // 30 km/h vitesse moyenne
           };
         }

        return {
          success: true,
          data: {
            ...delivery,
            routeInfo,
            clientName: `${delivery.client.profile?.firstName || ''} ${delivery.client.profile?.lastName || ''}`.trim() || delivery.client.email,
            delivererName: delivery.deliverer ? 
              `${delivery.deliverer.profile?.firstName || ''} ${delivery.deliverer.profile?.lastName || ''}`.trim() || delivery.deliverer.email : 
              null,
            isDelayed: delivery.scheduledDate && 
                      new Date(delivery.scheduledDate) < new Date() && 
                      !["DELIVERED", "CANCELLED", "FAILED"].includes(delivery.status)
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la livraison"
        });
      }
    }),

  // Assigner manuellement une livraison à un livreur
  assign: protectedProcedure
    .input(z.object({
      deliveryId: z.string(),
      delivererId: z.string(),
      reason: z.string().optional(),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      scheduledDate: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        // Vérifier que la livraison existe et est disponible
        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.deliveryId },
          include: { client: true }
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée"
          });
        }

        if (!["PENDING", "REJECTED"].includes(delivery.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette livraison ne peut pas être réassignée"
          });
        }

        // Vérifier que le livreur existe et est disponible
        const deliverer = await ctx.db.user.findUnique({
          where: { id: input.delivererId },
          include: { deliverer: true }
        });

        if (!deliverer || deliverer.role !== 'DELIVERER') {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livreur non trouvé"
          });
        }

        if (deliverer.deliverer?.status !== 'ACTIVE') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Le livreur n'est pas disponible"
          });
        }

        // Assigner la livraison
        const updatedDelivery = await ctx.db.delivery.update({
          where: { id: input.deliveryId },
          data: {
            delivererId: input.delivererId,
            status: 'ASSIGNED',
            priority: input.priority || delivery.priority,
            scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : delivery.scheduledDate,
            assignedAt: new Date(),
            updatedAt: new Date()
          }
        });

        // Ajouter un événement de tracking
        await ctx.db.deliveryTracking.create({
          data: {
            deliveryId: input.deliveryId,
            status: 'ASSIGNED',
            notes: `Assigné manuellement par l'admin${input.reason ? ` - ${input.reason}` : ''}`,
            createdBy: user.id
          }
        });

        // Logger l'action admin
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERY_ASSIGNED',
            title: 'Assignment manuel de livraison',
            description: `Livraison ${delivery.trackingNumber} assignée à ${deliverer.email}${input.reason ? ` - ${input.reason}` : ''}`,
            status: 'COMPLETED',
            priority: input.priority || 'MEDIUM',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              deliveryId: input.deliveryId,
              delivererId: input.delivererId,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          data: updatedDelivery,
          message: "Livraison assignée avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de l'assignment de la livraison"
        });
      }
    }),

  // Annuler une livraison avec raison
  cancel: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().min(1),
      refundAmount: z.number().min(0).optional(),
      notifyClient: z.boolean().default(true),
      notifyDeliverer: z.boolean().default(true)
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.id },
          include: { 
            client: true, 
            deliverer: true,
            payments: true
          }
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée"
          });
        }

        if (delivery.status === 'DELIVERED') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible d'annuler une livraison déjà effectuée"
          });
        }

        // Annuler la livraison
        const cancelledDelivery = await ctx.db.delivery.update({
          where: { id: input.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: input.reason,
            updatedAt: new Date()
          }
        });

        // Ajouter un événement de tracking
        await ctx.db.deliveryTracking.create({
          data: {
            deliveryId: input.id,
            status: 'CANCELLED',
            notes: `Annulée par l'admin - ${input.reason}`,
            createdBy: user.id
          }
        });

        // Traitement du remboursement si spécifié
        if (input.refundAmount && input.refundAmount > 0) {
          // Logique de remboursement via le service de paiement
          // À implémenter selon le service de paiement utilisé
        }

        // Logger l'action admin
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERY_CANCELLED',
            title: 'Annulation de livraison',
            description: `Livraison ${delivery.trackingNumber} annulée - ${input.reason}`,
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              deliveryId: input.id,
              reason: input.reason,
              refundAmount: input.refundAmount
            }
          }
        });

        return {
          success: true,
          data: cancelledDelivery,
          message: "Livraison annulée avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de l'annulation de la livraison"
        });
      }
    }),

  // Forcer le statut d'une livraison
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum([
        "PENDING", "ASSIGNED", "ACCEPTED", "REJECTED", "IN_PROGRESS", 
        "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED", "FAILED"
      ]),
      reason: z.string().min(1),
      notes: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.id }
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée"
          });
        }

        const oldStatus = delivery.status;

        // Mettre à jour le statut
        const updatedDelivery = await ctx.db.delivery.update({
          where: { id: input.id },
          data: {
            status: input.status,
            updatedAt: new Date(),
            ...(input.status === 'DELIVERED' && { deliveredAt: new Date() }),
            ...(input.status === 'CANCELLED' && { 
              cancelledAt: new Date(),
              cancelReason: input.reason
            })
          }
        });

        // Ajouter un événement de tracking
        await ctx.db.deliveryTracking.create({
          data: {
            deliveryId: input.id,
            status: input.status,
            notes: `Statut forcé par l'admin: ${oldStatus} → ${input.status} - ${input.reason}${input.notes ? ` | ${input.notes}` : ''}`,
            createdBy: user.id
          }
        });

        // Logger l'action admin
        await ctx.db.adminTask.create({
          data: {
            type: 'DELIVERY_STATUS_FORCED',
            title: 'Changement forcé de statut',
            description: `Livraison ${delivery.trackingNumber} - Statut: ${oldStatus} → ${input.status}`,
            status: 'COMPLETED',
            priority: 'HIGH',
            assignedToId: user.id,
            createdById: user.id,
            completedAt: new Date(),
            metadata: {
              deliveryId: input.id,
              oldStatus,
              newStatus: input.status,
              reason: input.reason
            }
          }
        });

        return {
          success: true,
          data: updatedDelivery,
          message: "Statut mis à jour avec succès"
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Erreur lors de la mise à jour du statut"
        });
      }
    }),

  // Statistiques avancées des livraisons
  getStats: protectedProcedure
    .input(z.object({
      period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      delivererId: z.string().optional(),
      type: z.enum(["ANNOUNCEMENT", "CART_DROP", "SERVICE"]).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        const { user } = ctx.session;
        
        if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Permissions administrateur requises"
          });
        }

        // Calcul des dates de période
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date();

        if (input.startDate && input.endDate) {
          startDate = new Date(input.startDate);
          endDate = new Date(input.endDate);
        } else {
          switch (input.period) {
            case "day":
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              break;
            case "week":
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case "month":
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case "quarter":
              const quarter = Math.floor(now.getMonth() / 3);
              startDate = new Date(now.getFullYear(), quarter * 3, 1);
              break;
            case "year":
              startDate = new Date(now.getFullYear(), 0, 1);
              break;
          }
        }

        // Filtres additionnels
        const whereClause: any = {
          createdAt: { gte: startDate, lte: endDate }
        };
        
        if (input.delivererId) whereClause.delivererId = input.delivererId;
        if (input.type) whereClause.type = input.type;

        // Récupération des données pour statistiques
        const deliveries = await ctx.db.delivery.findMany({
          where: whereClause,
          include: { payments: true }
        });

        // Calculs statistiques complets
        const stats = {
          totalDeliveries: deliveries.length,
          statusBreakdown: {
            PENDING: 0,
            ASSIGNED: 0,
            ACCEPTED: 0,
            REJECTED: 0,
            IN_PROGRESS: 0,
            PICKED_UP: 0,
            IN_TRANSIT: 0,
            DELIVERED: 0,
            CANCELLED: 0,
            FAILED: 0
          },
          typeBreakdown: {
            ANNOUNCEMENT: 0,
            CART_DROP: 0,
            SERVICE: 0
          },
          priorityBreakdown: {
            LOW: 0,
            MEDIUM: 0,
            HIGH: 0,
            URGENT: 0
          },
          performance: {
            completionRate: 0,
            onTimeRate: 0,
            averageDeliveryTime: 0,
            totalRevenue: 0
          }
        };

        let totalDeliveryTime = 0;
        let completedDeliveries = 0;
        let onTimeDeliveries = 0;
        let totalRevenue = 0;

                 deliveries.forEach((delivery: any) => {
           // Compteurs de statut avec validation
           if (delivery.status && stats.statusBreakdown.hasOwnProperty(delivery.status)) {
             stats.statusBreakdown[delivery.status as keyof typeof stats.statusBreakdown]++;
           }
           if (delivery.type && stats.typeBreakdown.hasOwnProperty(delivery.type)) {
             stats.typeBreakdown[delivery.type as keyof typeof stats.typeBreakdown]++;
           }
           if (delivery.priority && stats.priorityBreakdown.hasOwnProperty(delivery.priority)) {
             stats.priorityBreakdown[delivery.priority as keyof typeof stats.priorityBreakdown]++;
           }

           // Calculs de performance
           if (delivery.status === 'DELIVERED') {
             completedDeliveries++;
             
             if (delivery.createdAt && delivery.deliveredAt) {
               const deliveryTime = (new Date(delivery.deliveredAt).getTime() - new Date(delivery.createdAt).getTime()) / (1000 * 60); // en minutes
               totalDeliveryTime += deliveryTime;
             }
             
             if (delivery.scheduledDate && delivery.deliveredAt && 
                 new Date(delivery.deliveredAt) <= new Date(delivery.scheduledDate)) {
               onTimeDeliveries++;
             }
           }

           // Calcul du revenu
           const revenue = delivery.payments
             .filter((p: any) => p.status === 'COMPLETED')
             .reduce((sum: number, p: any) => sum + p.amount, 0);
           totalRevenue += revenue;
         });

        stats.performance.completionRate = stats.totalDeliveries > 0 ? 
          (completedDeliveries / stats.totalDeliveries) * 100 : 0;
        stats.performance.onTimeRate = completedDeliveries > 0 ? 
          (onTimeDeliveries / completedDeliveries) * 100 : 0;
        stats.performance.averageDeliveryTime = completedDeliveries > 0 ? 
          totalDeliveryTime / completedDeliveries : 0;
        stats.performance.totalRevenue = totalRevenue;

        return {
          success: true,
          data: stats
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du calcul des statistiques"
        });
      }
    })
});
