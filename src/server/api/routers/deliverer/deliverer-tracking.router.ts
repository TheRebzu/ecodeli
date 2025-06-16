import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { DeliveryService } from "@/server/services/deliverer/delivery.service";
import { UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";

// Schémas simplifiés
const deliveryStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED"]);
const deliveryStatusArraySchema = z.array(deliveryStatusSchema).optional();

export const deliveryTrackingRouter = router({ // Récupération des détails d'une livraison
  getDeliveryById: protectedProcedure
    .input(z.object({ deliveryId: z.string()  }))
    .query(async ({ ctx, input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour accéder à ces données",
         });
      }

      return DeliveryService.getById(
        input.deliveryId,
        ctx.session.user.id,
        ctx.session.user.role,
      );
    }),

  // Obtenir la liste des livraisons avec filtres
  getDeliveries: protectedProcedure
    .input(
      z.object({ status: deliveryStatusArraySchema, // Accepte un tableau de statuts
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
        sortBy: z.string().optional(),
        sortOrder: z.enum(["asc", "desc"]).default("desc") }),
    )
    .query(async ({ ctx, input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour accéder à ces données",
         });
      }

      try {
        // Utiliser la méthode getAll existante avec un seul statut
        const filters = {
          status:
            input.status && input.status.length > 0
              ? (input.status[0] as any)
              : undefined,
          search: undefined,
          startDate: undefined,
          endDate: undefined,
        };

        return DeliveryService.getAll(
          filters,
          ctx.session.user.id,
          ctx.session.user.role,
        );
      } catch (error) {
        console.error("Erreur getDeliveries:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des livraisons",
         });
      }
    }),

  // Récupère les livraisons actives
  getActiveDeliveries: protectedProcedure.query(async ({ ctx  }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED",
        message: "Vous devez être connecté pour accéder à ces données",
       });
    }

    return DeliveryService.getActiveDeliveries(ctx.session.user.id);
  }),

  // Mise à jour des coordonnées GPS
  updateCoordinates: protectedProcedure
    .input(
      z.object({ deliveryId: z.string().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional() }),
    )
    .mutation(async ({ ctx, input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message:
            "Vous devez être connecté pour mettre à jour les coordonnées",
         });
      }

      if (ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent mettre à jour les coordonnées",
         });
      }

      try {
        // Utiliser la méthode updateCoordinates existante
        const coordinatesInput = {
          deliveryId: input.deliveryId,
          latitude: input.latitude,
          longitude: input.longitude,
        };

        const result = await DeliveryService.updateCoordinates(
          coordinatesInput,
          ctx.session.user.id,
        );

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour des coordonnées",
          cause: error,
         });
      }
    }),

  // Nouvelle procedure pour le tracking en temps réel
  getLiveTracking: protectedProcedure
    .input(z.object({ deliveryId: z.string()  }))
    .query(async ({ ctx, input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour accéder à ces données",
         });
      }

      try {
        // Récupérer les informations de base de la livraison
        const delivery = await DeliveryService.getById(
          input.deliveryId,
          ctx.session.user.id,
          ctx.session.user.role,
        );

        if (!delivery) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Livraison non trouvée",
           });
        }

        // Récupérer l'historique des positions
        const locationHistory = await ctx.db.deliveryLocationUpdate.findMany({
          where: { deliveryId: input.deliveryId },
          orderBy: { timestamp: "desc" },
          take: 50,
          select: {
            latitude: true,
            longitude: true,
            timestamp: true,
            accuracy: true,
          },
        });

        // Position actuelle (dernière position enregistrée)
        const currentLocation = locationHistory[0] || null;

        return {
          id: delivery.id,
          status: delivery.status,
          trackingCode: delivery.trackingCode,
          pickupAddress: delivery.pickupAddress,
          deliveryAddress: delivery.deliveryAddress,
          pickupLatitude: delivery.pickupLatitude,
          pickupLongitude: delivery.pickupLongitude,
          deliveryLatitude: delivery.deliveryLatitude,
          deliveryLongitude: delivery.deliveryLongitude,
          currentLocation: currentLocation ? {
            coordinates: [currentLocation.longitude, currentLocation.latitude],
            timestamp: currentLocation.timestamp,
            accuracy: currentLocation.accuracy,
          } : null,
          locationHistory: locationHistory.map(loc => ({ coordinates: [loc.longitude, loc.latitude],
            timestamp: loc.timestamp,
           })),
          deliverer: delivery.deliverer ? {
            id: delivery.deliverer.id,
            name: delivery.deliverer.firstName + " " + delivery.deliverer.lastName,
            phone: delivery.deliverer.phoneNumber,
          } : null,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des données de tracking",
          cause: error,
         });
      }
    }),

  // Procedure pour obtenir les informations de tracking (compatible avec la carte)
  getTrackingInfo: protectedProcedure
    .input(z.object({ deliveryId: z.string()  }))
    .query(async ({ ctx, input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour accéder à ces données",
         });
      }

      try {
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            OR: [
              { clientId: ctx.session.user.id },
              { delivererId: ctx.session.user.id },
              { announcement: { clientId: ctx.session.user.id } },
            ],
          },
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            deliverer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            announcement: {
              select: {
                title: true,
                description: true,
              },
            },
          },
        });

        if (!delivery) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Livraison non trouvée",
           });
        }

        return {
          id: delivery.id,
          status: delivery.status,
          trackingCode: delivery.trackingCode,
          pickupAddress: delivery.pickupAddress,
          deliveryAddress: delivery.deliveryAddress,
          pickupLatitude: delivery.pickupLatitude,
          pickupLongitude: delivery.pickupLongitude,
          deliveryLatitude: delivery.deliveryLatitude,
          deliveryLongitude: delivery.deliveryLongitude,
          client: delivery.client,
          deliverer: delivery.deliverer,
          announcement: delivery.announcement,
          estimatedDeliveryTime: delivery.estimatedDeliveryTime,
          createdAt: delivery.createdAt,
          updatedAt: delivery.updatedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des informations de tracking",
          cause: error,
         });
      }
    }),
});

export default deliveryTrackingRouter;
