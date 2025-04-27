import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const announcementRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        type: z.enum(['DELIVERY_REQUEST', 'DELIVERY_OFFER', 'MERCHANT_OFFER']).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupération des annonces
    }),

  getById: publicProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // Récupération d'une annonce par ID
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        type: z.enum(['DELIVERY_REQUEST', 'DELIVERY_OFFER', 'MERCHANT_OFFER']),
        fromAddress: z.string().optional(),
        toAddress: z.string().optional(),
        date: z.date().optional(),
        price: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Création d'une annonce
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        // Autres champs
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Mise à jour d'une annonce
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Suppression d'une annonce
    }),
});
