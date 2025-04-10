import { z } from 'zod';

export const validateDeliverySchema = z.object({
  deliveryId: z.string().uuid('ID de livraison invalide'),
  validationCode: z.string().length(6, 'Le code de validation doit contenir 6 caractères'),
});