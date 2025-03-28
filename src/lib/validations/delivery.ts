import { z } from "zod";

// Package size validation
export const PackageSizeEnum = z.enum([
  "XS", // Très petit (< 1kg)
  "S",  // Petit (1-5kg)
  "M",  // Moyen (5-10kg)
  "L",  // Grand (10-20kg)
  "XL", // Très grand (20-30kg)
  "XXL" // Extra large (> 30kg)
]);

export type PackageSize = z.infer<typeof PackageSizeEnum>;

// Delivery types
export const DeliveryTypeEnum = z.enum([
  "STANDARD", // Livraison standard (2-3 jours)
  "EXPRESS",  // Livraison express (24h)
  "SAME_DAY", // Livraison le jour même
  "SCHEDULED" // Livraison programmée
]);

export type DeliveryType = z.infer<typeof DeliveryTypeEnum>;

// Delivery status
export const DeliveryStatusEnum = z.enum([
  "PENDING",   // En attente
  "CONFIRMED", // Confirmée
  "PICKED_UP", // Collectée
  "IN_TRANSIT", // En transit
  "DELIVERED", // Livrée
  "CANCELLED", // Annulée
  "RETURNED"   // Retournée
]);

export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

// Delivery creation validation schema
export const deliveryCreateSchema = z.object({
  pickupAddress: z.string().min(5, { message: "L'adresse de collecte doit contenir au moins 5 caractères" }),
  deliveryAddress: z.string().min(5, { message: "L'adresse de livraison doit contenir au moins 5 caractères" }),
  packageSize: PackageSizeEnum,
  deliveryType: DeliveryTypeEnum.optional().default("STANDARD"),
  scheduledDate: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: "La date de livraison doit être dans le futur" }
  ),
  recipientName: z.string().min(2, { message: "Le nom du destinataire doit contenir au moins 2 caractères" }),
  recipientPhone: z.string().min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres" }),
  recipientEmail: z.string().email({ message: "Email invalide" }).optional(),
  fragile: z.boolean().default(false),
  requireSignature: z.boolean().default(true),
  insuranceRequired: z.boolean().default(false),
  insuranceValue: z.number().optional(),
  notes: z.string().optional(),
});

export type DeliveryCreateData = z.infer<typeof deliveryCreateSchema>;

// Delivery update validation schema
export const deliveryUpdateSchema = z.object({
  id: z.string().uuid({ message: "ID de livraison invalide" }),
  pickupAddress: z.string().min(5, { message: "L'adresse de collecte doit contenir au moins 5 caractères" }).optional(),
  deliveryAddress: z.string().min(5, { message: "L'adresse de livraison doit contenir au moins 5 caractères" }).optional(),
  packageSize: PackageSizeEnum.optional(),
  deliveryType: DeliveryTypeEnum.optional(),
  scheduledDate: z.coerce.date().optional(),
  recipientName: z.string().min(2, { message: "Le nom du destinataire doit contenir au moins 2 caractères" }).optional(),
  recipientPhone: z.string().min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres" }).optional(),
  recipientEmail: z.string().email({ message: "Email invalide" }).optional(),
  status: DeliveryStatusEnum.optional(),
  fragile: z.boolean().optional(),
  requireSignature: z.boolean().optional(),
  insuranceRequired: z.boolean().optional(),
  insuranceValue: z.number().optional(),
  notes: z.string().optional(),
});

export type DeliveryUpdateData = z.infer<typeof deliveryUpdateSchema>;

// Tracking ID validation schema
export const trackingSchema = z.object({
  trackingId: z.string().min(8, { message: "L'identifiant de suivi doit contenir au moins 8 caractères" }),
});

export type TrackingData = z.infer<typeof trackingSchema>;

// Rate calculation validation schema
export const rateCalculationSchema = z.object({
  pickupAddress: z.string().min(5, { message: "L'adresse de collecte doit contenir au moins 5 caractères" }),
  deliveryAddress: z.string().min(5, { message: "L'adresse de livraison doit contenir au moins 5 caractères" }),
  packageSize: PackageSizeEnum,
  deliveryType: DeliveryTypeEnum.optional().default("STANDARD"),
  scheduledDate: z.coerce.date().optional(),
  insuranceRequired: z.boolean().default(false),
  insuranceValue: z.number().optional(),
});

export type RateCalculationData = z.infer<typeof rateCalculationSchema>; 