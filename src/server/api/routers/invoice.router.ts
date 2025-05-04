import { router, protectedProcedure } from '@/server/api/trpc';
import { z } from 'zod';

export const invoiceRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Récupération des factures
      return {
        items: [],
        nextCursor: null,
      };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    // Récupération d'une facture par ID
    return {
      id: input.id,
      status: 'PENDING',
      // Autres champs fictifs
    };
  }),

  generateInvoice: protectedProcedure
    .input(
      z.object({
        deliveryId: z.string().optional(),
        serviceId: z.string().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Génération d'une facture
      return {
        id: 'new-invoice-id',
        status: 'PENDING',
        // Autres champs fictifs
      };
    }),

  markAsPaid: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Marquer une facture comme payée
      return {
        id: input.id,
        status: 'PAID',
        // Autres champs fictifs
      };
    }),
});
