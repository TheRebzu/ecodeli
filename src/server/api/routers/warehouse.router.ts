import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const warehouseRouter = router({
  getWarehouses: protectedProcedure.query(async () => {
    // Récupération des entrepôts
    return [];
  }),

  getBoxes: protectedProcedure.input(z.object({ warehouseId: z.string() })).query(async () => {
    // Récupération des boxes d'un entrepôt
    return [];
  }),

  reserveBox: protectedProcedure
    .input(
      z.object({
        boxId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .mutation(async () => {
      // Réservation d'une box
      return { success: true, reservationId: 'mock-reservation-id' };
    }),

  releaseBox: protectedProcedure.input(z.object({ boxId: z.string() })).mutation(async () => {
    // Libération d'une box
    return { success: true };
  }),
});
