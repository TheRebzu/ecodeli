import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { DeliveryService } from '@/server/services/delivery.service';
import { UserRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

// Schémas simplifiés
const deliveryStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
]);
const deliveryStatusArraySchema = z.array(deliveryStatusSchema).optional();

export const deliveryTrackingRouter = router({
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

      return DeliveryService.getById(input.deliveryId, ctx.session.user.id, ctx.session.user.role);
    }),

  // Obtenir la liste des livraisons avec filtres
  getDeliveries: protectedProcedure
    .input(
      z.object({
        status: deliveryStatusArraySchema, // Accepte un tableau de statuts
        limit: z.number().min(1).max(100).default(20),
        page: z.number().min(1).default(1),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour accéder à ces données',
        });
      }

      try {
        // Utiliser la méthode getAll existante avec un seul statut
        const filters = {
          status: input.status && input.status.length > 0 ? (input.status[0] as any) : undefined,
          search: undefined,
          startDate: undefined,
          endDate: undefined,
        };

        return DeliveryService.getAll(filters, ctx.session.user.id, ctx.session.user.role);
      } catch (error) {
        console.error('Erreur getDeliveries:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des livraisons',
        });
      }
    }),

  // Récupère les livraisons actives
  getActiveDeliveries: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour accéder à ces données',
      });
    }

    return DeliveryService.getActiveDeliveries(ctx.session.user.id);
  }),

  // Mise à jour des coordonnées GPS
  updateCoordinates: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string().min(1),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Vous devez être connecté pour mettre à jour les coordonnées',
        });
      }

      if (ctx.session.user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les livreurs peuvent mettre à jour les coordonnées',
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
          ctx.session.user.id
        );

        return result;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour des coordonnées',
          cause: error,
        });
      }
    }),
});

export default deliveryTrackingRouter;
