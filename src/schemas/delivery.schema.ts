import { z } from 'zod';
import { DeliveryStatus } from '../types/delivery';

export const deliverySchema = z.object({
  pickupAddress: z.string().min(5, "L'adresse de ramassage est requise"),
  deliveryAddress: z.string().min(5, "L'adresse de livraison est requise"),
  pickupDate: z.date(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(1, 'Le prix doit être supérieur à 0'),
  type: z.enum(['PACKAGE', 'SHOPPING_CART', 'AIRPORT_TRANSFER', 'GROCERY', 'FOREIGN_PRODUCT']),
});

export type DeliverySchemaType = z.infer<typeof deliverySchema>;

// Schéma pour les coordonnées GPS
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Schéma pour la mise à jour des coordonnées de livraison
export const deliveryCoordinatesUpdateSchema = z.object({
  deliveryId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Schéma pour la mise à jour du statut de livraison
export const deliveryStatusUpdateSchema = z.object({
  deliveryId: z.string().min(1),
  status: z.nativeEnum(DeliveryStatus),
  note: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Schéma pour la confirmation de livraison
export const deliveryConfirmationSchema = z.object({
  deliveryId: z.string().min(1),
  confirmationCode: z.string().min(4).max(10),
  proofType: z.enum(['PHOTO', 'SIGNATURE', 'CODE']).optional(),
  proofUrl: z.string().url().optional(),
});

// Schéma pour l'évaluation d'une livraison
export const deliveryRatingSchema = z.object({
  deliveryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// Schéma pour le filtrage des livraisons
export const deliveryFilterSchema = z.object({
  status: z.nativeEnum(DeliveryStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
});

// Schéma pour la création d'une livraison dans le système de suivi
export const createDeliveryTrackingSchema = z.object({
  pickupAddress: z.string().min(5),
  deliveryAddress: z.string().min(5),
  pickupDate: z.coerce.date(),
  clientId: z.string().min(1),
  estimatedArrival: z.coerce.date().optional(),
});

// Schéma pour la génération d'un code de confirmation
export const generateConfirmationCodeSchema = z.object({
  deliveryId: z.string().min(1),
});

// Schéma pour le signalement d'un problème
export const deliveryIssueReportSchema = z.object({
  deliveryId: z.string().min(1),
  issueType: z.enum(['DELAY', 'DAMAGE', 'LOSS', 'OTHER']),
  description: z.string().min(10).max(500),
  attachmentUrl: z.string().url().optional(),
});

// Type pour les entrées de création de livraison
export type CreateDeliveryTrackingInput = z.infer<typeof createDeliveryTrackingSchema>;

// Type pour les entrées de mise à jour de statut
export type DeliveryStatusUpdateInput = z.infer<typeof deliveryStatusUpdateSchema>;

// Type pour les entrées de mise à jour de coordonnées
export type DeliveryCoordinatesUpdateInput = z.infer<typeof deliveryCoordinatesUpdateSchema>;

// Type pour les entrées de confirmation
export type DeliveryConfirmationInput = z.infer<typeof deliveryConfirmationSchema>;

// Type pour les entrées d'évaluation
export type DeliveryRatingInput = z.infer<typeof deliveryRatingSchema>;

// Type pour les entrées de filtrage
export type DeliveryFilterInput = z.infer<typeof deliveryFilterSchema>;

// Type pour les entrées de signalement de problème
export type DeliveryIssueReportInput = z.infer<typeof deliveryIssueReportSchema>;
