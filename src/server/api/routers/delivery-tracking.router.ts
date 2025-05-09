import { z } from 'zod';
import { router, protectedProcedure, verifiedDelivererProcedure } from '../trpc';
import deliveryTrackingService from '../../services/delivery-tracking.service';
import {
  createDeliveryTrackingSchema,
  deliveryCoordinatesUpdateSchema,
  deliveryStatusUpdateSchema,
  deliveryConfirmationSchema,
  deliveryRatingSchema,
  deliveryFilterSchema,
  generateConfirmationCodeSchema,
} from '@/schemas/delivery-tracking.schema';

export const deliveryTrackingRouter = router({
  // Création d'une nouvelle livraison
  createDelivery: protectedProcedure
    .input(createDeliveryTrackingSchema)
    .mutation(async ({ input, ctx }) => {
      return deliveryTrackingService.createDelivery({
        ...input,
        clientId: input.clientId || ctx.session.user.id,
      });
    }),

  // Mise à jour du statut d'une livraison (restreint aux livreurs vérifiés)
  updateStatus: verifiedDelivererProcedure
    .input(deliveryStatusUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return deliveryTrackingService.updateDeliveryStatus(input, ctx.session.user.id);
    }),

  // Mise à jour des coordonnées en temps réel (restreint aux livreurs vérifiés)
  updateCoordinates: verifiedDelivererProcedure
    .input(deliveryCoordinatesUpdateSchema)
    .mutation(async ({ input, ctx }) => {
      return deliveryTrackingService.updateDeliveryCoordinates(input, ctx.session.user.id);
    }),

  // Confirmation de réception d'une livraison
  confirmDelivery: protectedProcedure
    .input(deliveryConfirmationSchema)
    .mutation(async ({ input, ctx }) => {
      return deliveryTrackingService.confirmDelivery(input, ctx.session.user.id);
    }),

  // Évaluation d'une livraison
  rateDelivery: protectedProcedure.input(deliveryRatingSchema).mutation(async ({ input, ctx }) => {
    return deliveryTrackingService.rateDelivery(input, ctx.session.user.id);
  }),

  // Obtenir les détails d'une livraison
  getDeliveryById: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(async ({ input, ctx }) => {
      return deliveryTrackingService.getDeliveryById(input.deliveryId, ctx.session.user.id);
    }),

  // Obtenir l'historique des coordonnées d'une livraison
  getDeliveryCoordinatesHistory: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .query(async ({ input, ctx }) => {
      return deliveryTrackingService.getDeliveryCoordinatesHistory(
        input.deliveryId,
        ctx.session.user.id
      );
    }),

  // Obtenir la liste des livraisons avec filtrage
  getDeliveries: protectedProcedure
    .input(deliveryFilterSchema.optional().default({}))
    .query(async ({ input, ctx }) => {
      return deliveryTrackingService.getDeliveries(
        input,
        ctx.session.user.id,
        ctx.session.user.role
      );
    }),

  // Obtenir les livraisons actives d'un livreur (restreint aux livreurs vérifiés)
  getActiveDeliveries: verifiedDelivererProcedure.query(async ({ ctx }) => {
    return deliveryTrackingService.getActiveDeliveries(ctx.session.user.id);
  }),

  // Générer un nouveau code de confirmation (restreint aux livreurs vérifiés)
  generateConfirmationCode: verifiedDelivererProcedure
    .input(generateConfirmationCodeSchema)
    .mutation(async ({ input, ctx }) => {
      return deliveryTrackingService.generateConfirmationCode(
        input.deliveryId,
        ctx.session.user.id
      );
    }),
});
