import { router, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';

export const deliveryRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
          .optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupération des livraisons
      return {
        items: [],
        nextCursor: null,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // Récupération d'une livraison par ID
    return {
      id: input.id,
      status: 'PENDING',
      // Autres champs fictifs
    };
  }),

  create: protectedProcedure
    .input(
      z.object({
        announcementId: z.string().optional(),
        pickupAddress: z.string(),
        deliveryAddress: z.string(),
        pickupDate: z.date(),
        weight: z.number().optional(),
        dimensions: z.string().optional(),
        description: z.string().optional(),
        price: z.number(),
        type: z.enum([
          'PACKAGE',
          'SHOPPING_CART',
          'AIRPORT_TRANSFER',
          'GROCERY',
          'FOREIGN_PRODUCT',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Création d'une livraison
      return {
        id: 'new-delivery-id',
        status: 'PENDING',
        // Autres champs fictifs
      };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          'PENDING',
          'ACCEPTED',
          'PICKED_UP',
          'IN_TRANSIT',
          'DELIVERED',
          'CANCELLED',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mise à jour du statut d'une livraison
      return {
        id: input.id,
        status: input.status,
        // Autres champs fictifs
      };
    }),

  confirmCode: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Confirmation du code de livraison
      return {
        success: true,
        delivery: {
          id: input.id,
          status: 'DELIVERED',
          // Autres champs fictifs
        },
      };
    }),
});
