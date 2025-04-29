import { z } from 'zod';
import { AnnouncementPriority, AnnouncementStatus, AnnouncementType } from '../types/announcement';

// Schéma pour la création d'une annonce
export const createAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  type: z.nativeEnum(AnnouncementType, {
    errorMap: () => ({ message: "Type d'annonce invalide" }),
  }),
  priority: z.nativeEnum(AnnouncementPriority).optional(),

  // Adresses
  pickupAddress: z.string().min(5, 'Adresse de ramassage requise'),
  pickupLongitude: z.number().optional(),
  pickupLatitude: z.number().optional(),
  deliveryAddress: z.string().min(5, 'Adresse de livraison requise'),
  deliveryLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),

  // Détails de l'envoi
  weight: z.number().positive('Le poids doit être positif').optional(),
  width: z.number().positive('La largeur doit être positive').optional(),
  height: z.number().positive('La hauteur doit être positive').optional(),
  length: z.number().positive('La longueur doit être positive').optional(),
  isFragile: z.boolean().default(false),
  needsCooling: z.boolean().default(false),

  // Planning
  pickupDate: z.date().optional(),
  pickupTimeWindow: z.string().optional(),
  deliveryDate: z.date().optional(),
  deliveryTimeWindow: z.string().optional(),
  isFlexible: z.boolean().default(false),

  // Prix et paiement
  suggestedPrice: z.number().positive('Le prix doit être positif').optional(),
  isNegotiable: z.boolean().default(true),

  // Métadonnées
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Schéma pour la mise à jour d'une annonce
export const updateAnnouncementSchema = z.object({
  id: z.string(),
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères').optional(),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').optional(),
  type: z
    .nativeEnum(AnnouncementType, {
      errorMap: () => ({ message: "Type d'annonce invalide" }),
    })
    .optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),

  // Adresses
  pickupAddress: z.string().min(5, 'Adresse de ramassage requise').optional(),
  pickupLongitude: z.number().optional(),
  pickupLatitude: z.number().optional(),
  deliveryAddress: z.string().min(5, 'Adresse de livraison requise').optional(),
  deliveryLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),

  // Détails de l'envoi
  weight: z.number().positive('Le poids doit être positif').optional(),
  width: z.number().positive('La largeur doit être positive').optional(),
  height: z.number().positive('La hauteur doit être positive').optional(),
  length: z.number().positive('La longueur doit être positive').optional(),
  isFragile: z.boolean().optional(),
  needsCooling: z.boolean().optional(),

  // Planning
  pickupDate: z.date().optional(),
  pickupTimeWindow: z.string().optional(),
  deliveryDate: z.date().optional(),
  deliveryTimeWindow: z.string().optional(),
  isFlexible: z.boolean().optional(),

  // Prix et paiement
  suggestedPrice: z.number().positive('Le prix doit être positif').optional(),
  finalPrice: z.number().positive('Le prix final doit être positif').optional(),
  isNegotiable: z.boolean().optional(),
  paymentStatus: z.string().optional(),

  delivererId: z.string().optional(),

  // Métadonnées
  cancelReason: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Schéma pour les filtres de recherche
export const announcementFiltersSchema = z.object({
  type: z.nativeEnum(AnnouncementType).optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  clientId: z.string().optional(),
  delivererId: z.string().optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  keyword: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Schéma pour la création d'une candidature
export const createDeliveryApplicationSchema = z.object({
  announcementId: z.string(),
  proposedPrice: z.number().positive('Le prix proposé doit être positif').optional(),
  message: z.string().optional(),
});

// Types inférés
export type CreateAnnouncementSchemaType = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementSchemaType = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementFiltersSchemaType = z.infer<typeof announcementFiltersSchema>;
export type CreateDeliveryApplicationSchemaType = z.infer<typeof createDeliveryApplicationSchema>;
