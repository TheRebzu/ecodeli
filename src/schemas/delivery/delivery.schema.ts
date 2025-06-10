import { z } from 'zod';
import { DeliveryStatus } from '@prisma/client';

// Schéma étendu pour les statuts incluant les valeurs personnalisées
export const extendedDeliveryStatusSchema = z.enum([
  // Statuts Prisma
  'PENDING',
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CANCELLED',
  // Statuts étendus
  'EN_ROUTE_TO_PICKUP',
  'AT_PICKUP',
  'EN_ROUTE_TO_DROPOFF',
  'AT_DROPOFF',
]);

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
  status: extendedDeliveryStatusSchema,
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
  status: extendedDeliveryStatusSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  searchTerm: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
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

// Schéma pour l'assignment automatique de livreur
export const autoAssignDelivererSchema = z.object({
  announcementId: z.string().min(1),
  preferences: z
    .object({
      maxDistance: z.number().min(1).max(50).optional(), // km
      minRating: z.number().min(1).max(5).optional(),
      prioritizeSpeed: z.boolean().optional(),
    })
    .optional(),
});

// Schéma pour les critères de recherche de livreur
export const delivererSearchCriteriaSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(50).default(10),
  minRating: z.number().min(1).max(5).optional(),
  availableOnly: z.boolean().default(true),
});

// Schéma pour la mise à jour de disponibilité du livreur
export const delivererAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  workingHours: z
    .object({
      start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),
});

// Schéma pour l'optimisation de route
export const routeOptimizationSchema = z.object({
  delivererId: z.string().min(1),
  deliveryIds: z.array(z.string().min(1)).min(2).max(10),
  startLocation: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

// Schéma pour les preuves de livraison
export const deliveryProofSchema = z.object({
  deliveryId: z.string().min(1),
  type: z.enum(['PHOTO', 'SIGNATURE', 'DOCUMENT']),
  fileUrl: z.string().url(),
  notes: z.string().max(200).optional(),
});

// Schéma pour les notifications de livraison
export const deliveryNotificationSchema = z.object({
  deliveryId: z.string().min(1),
  type: z.enum(['STATUS_UPDATE', 'DELAY_ALERT', 'ARRIVAL_NOTICE', 'COMPLETION']),
  recipientRole: z.enum(['CLIENT', 'DELIVERER', 'BOTH']),
  customMessage: z.string().max(150).optional(),
});

// Schéma pour l'historique de livraison
export const deliveryHistoryFilterSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['CLIENT', 'DELIVERER']),
  status: extendedDeliveryStatusSchema.optional(),
  dateRange: z
    .object({
      from: z.coerce.date(),
      to: z.coerce.date(),
    })
    .optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
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

// Types additionnels pour les nouvelles fonctionnalités
export type AutoAssignDelivererInput = z.infer<typeof autoAssignDelivererSchema>;
export type DelivererSearchCriteriaInput = z.infer<typeof delivererSearchCriteriaSchema>;
export type DelivererAvailabilityInput = z.infer<typeof delivererAvailabilitySchema>;
export type RouteOptimizationInput = z.infer<typeof routeOptimizationSchema>;
export type DeliveryProofInput = z.infer<typeof deliveryProofSchema>;
export type DeliveryNotificationInput = z.infer<typeof deliveryNotificationSchema>;
export type DeliveryHistoryFilterInput = z.infer<typeof deliveryHistoryFilterSchema>;
