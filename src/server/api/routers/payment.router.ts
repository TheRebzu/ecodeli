import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const paymentRouter = router({
  getPayments: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async () => {
      // Récupération des paiements
      return [];
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async () => {
    // Récupération d'un paiement par ID
    return null;
  }),

  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        currency: z.string().default('eur'),
        deliveryId: z.string().optional(),
        serviceId: z.string().optional(),
      })
    )
    .mutation(async () => {
      // Création d'un intent de paiement Stripe
      return { success: true, clientSecret: 'mock_secret' };
    }),

  confirmPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      })
    )
    .mutation(async () => {
      // Confirmation d'un paiement
      return { success: true };
    }),

  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number(),
        bankAccount: z.string(),
      })
    )
    .mutation(async () => {
      // Demande de retrait
      return { success: true, status: 'pending' };
    }),
});
