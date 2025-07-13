import { z } from "zod";

export const deliveryValidationSchema = z.object({
  deliveryId: z.string(),
  validationCode: z.string().length(6, "Le code doit contenir 6 caractères"),
  recipientSignature: z.string().optional(),
  photos: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const partialDeliverySchema = z.object({
  deliveryId: z.string(),
  handoverPoint: z.object({
    locationId: z.string(),
    expectedDate: z.date(),
  }),
  nextDelivererId: z.string().optional(),
});

export type DeliveryValidationInput = z.infer<typeof deliveryValidationSchema>;
export type PartialDeliveryInput = z.infer<typeof partialDeliverySchema>;
