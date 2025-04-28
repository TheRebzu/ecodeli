import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const serviceRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        type: z
          .enum(['TRANSPORT', 'AIRPORT_TRANSFER', 'PET_SITTING', 'HOUSEKEEPING', 'GARDENING'])
          .optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async () => {
      // Récupération des services
      return [];
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    // Récupération d'un service par ID
    return null;
  }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['TRANSPORT', 'AIRPORT_TRANSFER', 'PET_SITTING', 'HOUSEKEEPING', 'GARDENING']),
        description: z.string(),
        date: z.date(),
        duration: z.number(), // en minutes
        address: z.string(),
        price: z.number(),
      })
    )
    .mutation(async () => {
      // Création d'un service
      return { id: 'mock-service-id', success: true };
    }),

  book: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        date: z.date(),
      })
    )
    .mutation(async () => {
      // Réservation d'un service
      return { success: true, bookingId: 'mock-booking-id' };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED']),
      })
    )
    .mutation(async () => {
      // Mise à jour du statut d'un service
      return { success: true };
    }),

  addRating: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async () => {
      // Ajout d'une évaluation
      return { success: true };
    }),
});
