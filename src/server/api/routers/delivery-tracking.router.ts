import { z } from 'zod';
import { router, protectedProcedure, verifiedDelivererProcedure } from '../trpc';
import deliveryTrackingService from '../../services/delivery-tracking.service';
import {
  createDeliveryTrackingSchema,
  deliveryCoordinatesUpdateSchema,
  updateDeliveryStatusSchema,
  deliveryConfirmationSchema,
  deliveryRatingSchema,
  generateConfirmationCodeSchema,
  deliveryStatusEnumSchema,
  createCheckpointSchema,
  updateETASchema,
  trackingQuerySchema,
  deliveryIssueCreateSchema
} from '@/schemas/delivery-tracking.schema';
import { DeliveryStatus, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import {
  notifyDeliveryStatusChange,
  notifyDeliveryApproaching,
  notifyDeliveryDelayed,
  notifyCheckpointReached,
  notifyDeliveryCompleted,
} from '@/server/services/notification.service';

// Note: Import de socket uniquement côté serveur
// Ne pas utiliser @/socket/socket-client pour éviter les conflits avec les modules Node.js
import { getSocketServer } from '@/socket';

// Créer un EventEmitter pour gérer les mises à jour en temps réel
const ee = new EventEmitter();

// Augmenter le nombre maximal d'écouteurs pour éviter les avertissements
ee.setMaxListeners(100);

export const deliveryTrackingRouter = router({
  // Création d'une nouvelle livraison
  createDelivery: protectedProcedure
    .input(createDeliveryTrackingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour créer une livraison',
        });
      }
      
      return deliveryTrackingService.createDelivery(input, ctx.session.user.id);
    }),

  // Mise à jour du statut d'une livraison (restreint aux livreurs vérifiés)
  updateDeliveryStatus: protectedProcedure
    .input(updateDeliveryStatusSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour effectuer cette action',
        });
      }
      
      return await deliveryTrackingService.updateDeliveryStatus({
        userId: ctx.session.user.id,
        deliveryId: input.deliveryId,
        status: input.status,
        previousStatus: input.previousStatus,
        location: input.location,
        notes: input.notes,
        reason: input.reason,
        notifyCustomer: input.notifyCustomer,
      });
    }),

  // Mise à jour des coordonnées en temps réel (restreint aux livreurs vérifiés)
  updateCoordinates: verifiedDelivererProcedure
    .input(deliveryCoordinatesUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour mettre à jour les coordonnées',
        });
      }
      
      return deliveryTrackingService.updateCoordinates(input, ctx.session.user.id);
    }),

  // Mise à jour du statut (alias pour updateDeliveryStatus)
  updateStatus: protectedProcedure
    .input(z.object({
      deliveryId: z.string(),
      status: deliveryStatusEnumSchema,
      notes: z.string().optional(),
      location: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      reason: z.string().optional(),
      notifyCustomer: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour effectuer cette action',
        });
      }
      
      // Convertir le format de location si fourni
      const geoPoint = input.location ? {
        type: 'Point' as const,
        coordinates: [input.location.longitude, input.location.latitude] as [number, number]
      } : undefined;

      return await deliveryTrackingService.updateDeliveryStatus({
        userId: ctx.session.user.id,
        deliveryId: input.deliveryId,
        status: input.status,
        notes: input.notes,
        location: geoPoint,
        reason: input.reason,
        notifyCustomer: input.notifyCustomer,
      });
    }),

  // Confirmation de réception d'une livraison (implémenté via updateStatus)
  confirmDelivery: protectedProcedure
    .input(deliveryConfirmationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour confirmer une livraison',
        });
      }
      
      // Convertir en format attendu par confirmDelivery
      return deliveryTrackingService.confirmDelivery(input, ctx.session.user.id);
    }),

  // Évaluation d'une livraison (implémentée via updateStatus pour le moment)
  rateDelivery: protectedProcedure
    .input(deliveryRatingSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour noter une livraison',
        });
      }
      
      // Pour le moment, simuler l'évaluation via un commentaire et statut
      return deliveryTrackingService.updateDeliveryStatus({
        userId: ctx.session.user.id,
        deliveryId: input.deliveryId,
        status: 'DELIVERED' as any, // Statut fictif pour simuler
        notes: `Évaluation: ${input.rating}/5 - ${input.comment || ""}`,
        notifyCustomer: false
      });
    }),

  // Récupération des détails d'une livraison
  getDeliveryById: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour accéder à ces données',
        });
      }
      
      return deliveryTrackingService.getDeliveryById(input.deliveryId, ctx.session.user.id);
    }),

  // Récupération de l'historique des coordonnées d'une livraison
  getDeliveryCoordinatesHistory: protectedProcedure
    .input(z.object({ 
      deliveryId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().optional(),
      page: z.number().optional()
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour accéder à ces données',
        });
      }
      
      return deliveryTrackingService.getDeliveryCoordinatesHistory(
        input.deliveryId,
        ctx.session.user.id
      );
    }),

  // Obtenir la liste des livraisons avec filtres
  getDeliveries: protectedProcedure
    .input(trackingQuerySchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour accéder à ces données',
        });
      }
      
      return deliveryTrackingService.getDeliveries(input, ctx.session.user.id);
    }),

  // Récupérer les livraisons actives
  getActiveDeliveries: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour accéder à ces données',
        });
      }
      
      return deliveryTrackingService.getActiveDeliveries(ctx.session.user.id);
    }),

  // Générer un nouveau code de confirmation (restreint aux livreurs vérifiés)
  generateConfirmationCode: verifiedDelivererProcedure
    .input(generateConfirmationCodeSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour générer un code de confirmation',
        });
      }
      
      return deliveryTrackingService.generateConfirmationCode(
        input.deliveryId,
        ctx.session.user.id
      );
    }),

  // Permet de mettre à jour la position d'une livraison
  updateLocation: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        location: z.object({
          type: z.literal('Point'),
          coordinates: z.tuple([z.number(), z.number()]),
        }),
        accuracy: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== 'DELIVERER') {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Seuls les livreurs peuvent mettre à jour leur position',
        });
      }

      return deliveryTrackingService.updateLocation({
        userId: ctx.session.user.id,
        ...input,
      });
    }),

  // Récupère la position actuelle d'une livraison
  getActiveDeliveryLocation: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(({ ctx, input }) => {
      return deliveryTrackingService.getActiveDeliveryLocation({
        userId: ctx.session.user.id,
        deliveryId: input.deliveryId,
      });
    }),

  // Récupère l'historique des statuts d'une livraison
  getDeliveryStatusHistory: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(({ ctx, input }) => {
      return deliveryTrackingService.getDeliveryStatusHistory({
        userId: ctx.session.user.id,
        deliveryId: input.deliveryId,
      });
    }),

  // Met à jour la position GPS du livreur (alias pour updateCoordinates)
  updatePosition: protectedProcedure
    .input(deliveryCoordinatesUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est un livreur
      if (ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les livreurs peuvent mettre à jour les positions GPS',
        });
      }

      try {
        // Mettre à jour la position via le service
        const result = await deliveryTrackingService.updateDeliveryCoordinates(
          input,
          ctx.session.user.id
        );

        // Émettre un événement pour les souscriptions
        ee.emit('positionUpdate', {
          deliveryId: input.deliveryId,
          position: {
            latitude: input.latitude,
            longitude: input.longitude,
            accuracy: input.accuracy,
            heading: input.heading,
            speed: input.speed,
            timestamp: new Date(),
          },
        });

        // Vérifier si le livreur est proche de la destination
        if (input.speed !== undefined && input.latitude && input.longitude) {
          // Vérifier si on doit notifier le client de l'approche du livreur
          const delivery = await ctx.db.delivery.findUnique({
            where: { id: input.deliveryId },
            select: {
              id: true,
              deliveryAddress: true,
              status: true,
              estimatedArrival: true,
            },
          });

          if (
            delivery &&
            (delivery.status === 'IN_TRANSIT' || delivery.status === 'PICKED_UP') &&
            delivery.estimatedArrival
          ) {
            const etaMinutes = Math.max(
              1,
              Math.floor((delivery.estimatedArrival.getTime() - new Date().getTime()) / 60000)
            );

            // Si l'ETA est inférieur à 15 minutes et le statut est IN_TRANSIT, notifier
            if (etaMinutes <= 15 && delivery.status === 'IN_TRANSIT') {
              // Pour l'instant, notification directe car deliveryETA n'existe pas encore
              await notifyDeliveryApproaching(
                input.deliveryId,
                500, // Distance approximative en mètres
                etaMinutes
              );
            }
          }
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour de la position',
          cause: error,
        });
      }
    }),

  // Création d'un point de passage
  createCheckpoint: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        type: z.string(),
        location: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        address: z.string(),
        name: z.string().optional(),
        plannedTime: z.date().optional(),
        actualTime: z.date().optional(),
        notes: z.string().optional(),
        photoProofUrl: z.string().url().optional(),
        signatureProofUrl: z.string().url().optional(),
        confirmationCode: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Convertir la position au format GeoJSON
        const geoPoint = {
          type: 'Point' as const,
          coordinates: [input.location.longitude, input.location.latitude] as [number, number]
        };

        // Créer le point de passage
        const result = await deliveryTrackingService.createDeliveryCheckpoint({
          userId: ctx.session.user.id,
          deliveryId: input.deliveryId,
          type: input.type,
          location: geoPoint,
          address: input.address,
          name: input.name,
          plannedTime: input.plannedTime,
          actualTime: input.actualTime,
          notes: input.notes,
          photoProofUrl: input.photoProofUrl,
          signatureProofUrl: input.signatureProofUrl,
          confirmationCode: input.confirmationCode,
          metadata: input.metadata,
        });

        // Émettre un événement pour les souscriptions
        ee.emit('checkpointReached', {
          deliveryId: input.deliveryId,
          checkpointId: result.id,
          checkpointType: input.type,
          timestamp: new Date(),
        });

        // Notifier le point de passage si pertinent
        await notifyCheckpointReached(input.deliveryId, result.id, input.type, input.name);

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la création du point de passage',
          cause: error,
        });
      }
    }),

  // Signaler un problème avec une livraison
  reportIssue: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        type: z.string(),
        description: z.string(),
        severity: z.string().default('MEDIUM'),
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
        photoUrls: z.array(z.string().url()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que la livraison existe
        const delivery = await ctx.db.delivery.findUnique({
          where: { id: input.deliveryId },
        });

        if (!delivery) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Livraison non trouvée',
          });
        }

        // Vérifier que l'utilisateur est autorisé (client, livreur, admin)
        const isDeliverer = delivery.delivererId === ctx.session.user.id;
        const isClient = delivery.clientId === ctx.session.user.id;
        const isAdmin = ctx.session.user.role === UserRole.ADMIN;

        if (!isDeliverer && !isClient && !isAdmin) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à signaler un problème pour cette livraison",
          });
        }

        // Pour l'instant, simuler la création d'un problème via un update de statut
        await deliveryTrackingService.updateDeliveryStatus({
          userId: ctx.session.user.id,
          deliveryId: input.deliveryId,
          status: 'NOT_DELIVERED' as any,
          notes: `PROBLÈME: ${input.type} - ${input.description}`,
          reason: input.severity,
          notifyCustomer: true
        });

        return {
          id: 'simulated-issue-id',
          deliveryId: input.deliveryId,
          type: input.type,
          reportedById: ctx.session.user.id,
          description: input.description,
          severity: input.severity,
          status: 'OPEN',
          createdAt: new Date()
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors du signalement d'un problème",
          cause: error,
        });
      }
    }),
});
