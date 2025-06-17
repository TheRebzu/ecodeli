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
    .input(z.object({ deliveryId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
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
          throw new TRPCError({
            code: "NOT_FOUND",
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des informations de tracking",
          cause: error,
        });
      }
    }),

  // Nouvelle méthode pour envoyer un message au client
  sendMessageToClient: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        subject: z.string(),
        message: z.string(),
        preferredContact: z.enum(["app", "phone", "either"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour envoyer un message",
        });
      }

      if (ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent envoyer des messages",
        });
      }

      try {
        // Vérifier que le livreur est bien assigné à cette livraison
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            delivererId: ctx.session.user.id,
          },
          include: {
            client: true,
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée ou non assignée",
          });
        }

        // Créer le message de communication
        const message = await ctx.db.deliveryMessage.create({
          data: {
            deliveryId: input.deliveryId,
            senderId: ctx.session.user.id,
            recipientId: delivery.clientId,
            subject: input.subject,
            message: input.message,
            preferredContact: input.preferredContact,
            timestamp: new Date(),
          },
        });

        // Envoyer une notification si nécessaire
        // (implémentation des notifications à ajouter selon les besoins)

        return {
          success: true,
          messageId: message.id,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'envoi du message",
          cause: error,
        });
      }
    }),

  // Nouvelle méthode pour initier un appel
  initiateCall: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        callType: z.enum(["deliverer_to_client", "client_to_deliverer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour initier un appel",
        });
      }

      try {
        // Vérifier l'accès à la livraison
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            OR: [
              { delivererId: ctx.session.user.id },
              { clientId: ctx.session.user.id },
            ],
          },
          include: {
            client: true,
            deliverer: true,
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée",
          });
        }

        // Enregistrer l'appel dans l'historique
        const callLog = await ctx.db.deliveryCallLog.create({
          data: {
            deliveryId: input.deliveryId,
            callerId: ctx.session.user.id,
            recipientId:
              input.callType === "deliverer_to_client"
                ? delivery.clientId
                : delivery.delivererId!,
            callType: input.callType,
            timestamp: new Date(),
          },
        });

        return {
          success: true,
          callLogId: callLog.id,
          phoneNumber:
            input.callType === "deliverer_to_client"
              ? delivery.client.phoneNumber
              : delivery.deliverer?.phoneNumber,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'initiation de l'appel",
          cause: error,
        });
      }
    }),

  // Nouvelle méthode pour confirmer une livraison
  confirmDelivery: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        confirmationCode: z.string(),
        recipientName: z.string(),
        safeLocation: z.boolean().optional(),
        safeLocationDetails: z.string().optional(),
        notes: z.string().optional(),
        photos: z.array(z.string()).optional(),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        timestamp: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour confirmer une livraison",
        });
      }

      if (ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent confirmer une livraison",
        });
      }

      try {
        // Vérifier que le livreur est bien assigné à cette livraison
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            delivererId: ctx.session.user.id,
            status: "IN_TRANSIT",
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée ou non en transit",
          });
        }

        // Confirmer la livraison
        const confirmedDelivery = await ctx.db.delivery.update({
          where: { id: input.deliveryId },
          data: {
            status: "DELIVERED",
            confirmationCode: input.confirmationCode,
            recipientName: input.recipientName,
            deliveryNotes: input.notes,
            deliveredAt: input.timestamp,
            deliveryLatitude: input.location?.latitude,
            deliveryLongitude: input.location?.longitude,
          },
        });

        // Enregistrer les détails de confirmation
        await ctx.db.deliveryConfirmation.create({
          data: {
            deliveryId: input.deliveryId,
            confirmationCode: input.confirmationCode,
            recipientName: input.recipientName,
            safeLocation: input.safeLocation ?? false,
            safeLocationDetails: input.safeLocationDetails,
            notes: input.notes,
            photos: input.photos,
            confirmedAt: input.timestamp,
            confirmedBy: ctx.session.user.id,
          },
        });

        return {
          success: true,
          deliveryId: confirmedDelivery.id,
          status: confirmedDelivery.status,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la confirmation de livraison",
          cause: error,
        });
      }
    }),

  // Nouvelle méthode pour signaler un incident
  reportIssue: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        issueType: z.string(),
        description: z.string(),
        needsAssistance: z.boolean(),
        contactInfo: z.string().optional(),
        photos: z.array(z.string()).optional(),
        timestamp: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour signaler un incident",
        });
      }

      try {
        // Vérifier l'accès à la livraison
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            OR: [
              { delivererId: ctx.session.user.id },
              { clientId: ctx.session.user.id },
            ],
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Livraison non trouvée",
          });
        }

        // Créer le rapport d'incident
        const issueReport = await ctx.db.deliveryIssue.create({
          data: {
            deliveryId: input.deliveryId,
            reportedBy: ctx.session.user.id,
            issueType: input.issueType,
            description: input.description,
            needsAssistance: input.needsAssistance,
            contactInfo: input.contactInfo,
            photos: input.photos,
            reportedAt: input.timestamp,
            status: "REPORTED",
          },
        });

        // Mettre à jour le statut de la livraison si nécessaire
        if (input.needsAssistance) {
          await ctx.db.delivery.update({
            where: { id: input.deliveryId },
            data: { status: "ISSUE_REPORTED" },
          });
        }

        return {
          success: true,
          issueId: issueReport.id,
          needsAssistance: input.needsAssistance,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du signalement d'incident",
          cause: error,
        });
      }
    }),
});

export default deliveryTrackingRouter;
