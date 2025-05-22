import { z } from 'zod';
import { AnnouncementPriority, AnnouncementStatus, AnnouncementType } from '../types/announcement';

// Validation des coordonnées GPS
const gpsCoordinateSchema = z.number().min(-180).max(180);

// Validation de la date (pas de dates passées)
const futureDateSchema = z
  .date()
  .refine(date => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "La date doit être dans le futur ou aujourd'hui",
  });

// Schéma pour les photos
const photoSchema = z.string().url('URL de photo invalide');

// Schéma pour la création d'une annonce
export const createAnnouncementSchema = z
  .object({
    title: z
      .string()
      .min(5, 'Le titre doit contenir au moins 5 caractères')
      .max(100, 'Le titre ne doit pas dépasser 100 caractères'),
    description: z
      .string()
      .min(10, 'La description doit contenir au moins 10 caractères')
      .max(1000, 'La description ne doit pas dépasser 1000 caractères'),
    type: z.nativeEnum(AnnouncementType, {
      errorMap: () => ({ message: "Type d'annonce invalide" }),
    }),
    priority: z.nativeEnum(AnnouncementPriority).optional(),

    // Adresses
    pickupAddress: z
      .string()
      .min(5, 'Adresse de ramassage requise')
      .max(200, 'Adresse trop longue'),
    pickupLongitude: gpsCoordinateSchema.optional(),
    pickupLatitude: gpsCoordinateSchema.optional(),
    deliveryAddress: z
      .string()
      .min(5, 'Adresse de livraison requise')
      .max(200, 'Adresse trop longue'),
    deliveryLongitude: gpsCoordinateSchema.optional(),
    deliveryLatitude: gpsCoordinateSchema.optional(),

    // Détails de l'envoi
    weight: z
      .number()
      .positive('Le poids doit être positif')
      .max(1000, 'Poids maximum dépassé')
      .optional(),
    width: z
      .number()
      .positive('La largeur doit être positive')
      .max(300, 'Largeur maximum dépassée')
      .optional(),
    height: z
      .number()
      .positive('La hauteur doit être positive')
      .max(300, 'Hauteur maximum dépassée')
      .optional(),
    length: z
      .number()
      .positive('La longueur doit être positive')
      .max(300, 'Longueur maximum dépassée')
      .optional(),
    isFragile: z.boolean().default(false),
    needsCooling: z.boolean().default(false),

    // Planning
    pickupDate: futureDateSchema.optional(),
    pickupTimeWindow: z.string().optional(),
    deliveryDate: futureDateSchema.optional(),
    deliveryTimeWindow: z.string().optional(),
    isFlexible: z.boolean().default(false),

    // Prix et paiement
    suggestedPrice: z
      .number()
      .positive('Le prix doit être positif')
      .max(10000, 'Prix maximum dépassé')
      .optional(),
    isNegotiable: z.boolean().default(true),

    // Nouveaux champs
    photos: z.array(photoSchema).max(5, 'Maximum 5 photos autorisées').optional().default([]),
    requiresSignature: z.boolean().default(false),
    requiresId: z.boolean().default(false),
    specialInstructions: z.string().max(500, 'Instructions trop longues').optional(),

    // Métadonnées
    tags: z.array(z.string()).max(10, 'Maximum 10 tags autorisés').optional().default([]),
    notes: z.string().max(500, 'Notes trop longues').optional(),
  })
  .refine(
    data => {
      // Vérification de la cohérence des dates (si les deux sont présentes)
      if (data.pickupDate && data.deliveryDate) {
        return data.deliveryDate >= data.pickupDate;
      }
      return true;
    },
    {
      message: 'La date de livraison doit être postérieure ou égale à la date de ramassage',
      path: ['deliveryDate'],
    }
  );

// Schéma pour la mise à jour d'une annonce
export const updateAnnouncementSchema = z.object({
  id: z.string(),
  title: z
    .string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(100, 'Le titre ne doit pas dépasser 100 caractères')
    .optional(),
  description: z
    .string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(1000, 'La description ne doit pas dépasser 1000 caractères')
    .optional(),
  type: z
    .nativeEnum(AnnouncementType, {
      errorMap: () => ({ message: "Type d'annonce invalide" }),
    })
    .optional(),
  status: z.nativeEnum(AnnouncementStatus).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),

  // Adresses
  pickupAddress: z
    .string()
    .min(5, 'Adresse de ramassage requise')
    .max(200, 'Adresse trop longue')
    .optional(),
  pickupLongitude: gpsCoordinateSchema.optional(),
  pickupLatitude: gpsCoordinateSchema.optional(),
  deliveryAddress: z
    .string()
    .min(5, 'Adresse de livraison requise')
    .max(200, 'Adresse trop longue')
    .optional(),
  deliveryLongitude: gpsCoordinateSchema.optional(),
  deliveryLatitude: gpsCoordinateSchema.optional(),

  // Détails de l'envoi
  weight: z
    .number()
    .positive('Le poids doit être positif')
    .max(1000, 'Poids maximum dépassé')
    .optional(),
  width: z
    .number()
    .positive('La largeur doit être positive')
    .max(300, 'Largeur maximum dépassée')
    .optional(),
  height: z
    .number()
    .positive('La hauteur doit être positive')
    .max(300, 'Hauteur maximum dépassée')
    .optional(),
  length: z
    .number()
    .positive('La longueur doit être positive')
    .max(300, 'Longueur maximum dépassée')
    .optional(),
  isFragile: z.boolean().optional(),
  needsCooling: z.boolean().optional(),

  // Planning
  pickupDate: futureDateSchema.optional(),
  pickupTimeWindow: z.string().optional(),
  deliveryDate: futureDateSchema.optional(),
  deliveryTimeWindow: z.string().optional(),
  isFlexible: z.boolean().optional(),

  // Prix et paiement
  suggestedPrice: z
    .number()
    .positive('Le prix doit être positif')
    .max(10000, 'Prix maximum dépassé')
    .optional(),
  finalPrice: z
    .number()
    .positive('Le prix final doit être positif')
    .max(10000, 'Prix maximum dépassé')
    .optional(),
  isNegotiable: z.boolean().optional(),
  paymentStatus: z.string().optional(),

  delivererId: z.string().optional(),

  // Nouveaux champs
  photos: z.array(photoSchema).max(5, 'Maximum 5 photos autorisées').optional(),
  estimatedDistance: z.number().positive('La distance doit être positive').optional(),
  estimatedDuration: z
    .number()
    .int('La durée doit être un nombre entier')
    .positive('La durée doit être positive')
    .optional(),
  requiresSignature: z.boolean().optional(),
  requiresId: z.boolean().optional(),
  specialInstructions: z.string().max(500, 'Instructions trop longues').optional(),
  isFavorite: z.boolean().optional(),

  // Métadonnées
  cancelReason: z.string().max(500, "Raison d'annulation trop longue").optional(),
  notes: z.string().max(500, 'Notes trop longues').optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags autorisés').optional(),
});

// Schéma pour les filtres de recherche
export const announcementFiltersSchema = z
  .object({
    type: z.nativeEnum(AnnouncementType).optional(),
    status: z.nativeEnum(AnnouncementStatus).optional(),
    priority: z.nativeEnum(AnnouncementPriority).optional(),
    clientId: z.string().optional(),
    delivererId: z.string().optional(),
    fromDate: z.date().optional(),
    toDate: z.date().optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    keyword: z.string().optional(),
    tags: z.array(z.string()).optional(),
    limit: z.number().min(1).max(100).default(10),
    offset: z.number().min(0).default(0),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

    // Nouveaux filtres
    maxDistance: z.number().positive().optional(),
    nearbyAddress: z.string().optional(),
    nearbyLatitude: gpsCoordinateSchema.optional(),
    nearbyLongitude: gpsCoordinateSchema.optional(),
    radiusKm: z.number().positive().max(50, 'Rayon maximum de 50 km').optional(),
    requiresSignature: z.boolean().optional(),
    requiresId: z.boolean().optional(),
    hasPhotos: z.boolean().optional(),
    isFavorite: z.boolean().optional(),
  })
  .refine(
    data => {
      // Vérifier que si nearbyLatitude ou nearbyLongitude est fourni, les deux sont fournis
      if (
        (data.nearbyLatitude && !data.nearbyLongitude) ||
        (!data.nearbyLatitude && data.nearbyLongitude)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Les coordonnées de latitude et longitude doivent être fournies ensemble',
      path: ['nearbyLatitude', 'nearbyLongitude'],
    }
  );

// Schéma pour la recherche géographique
export const geoSearchSchema = z.object({
  latitude: gpsCoordinateSchema,
  longitude: gpsCoordinateSchema,
  radiusKm: z.number().positive().max(50, 'Rayon maximum de 50 km'),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

// Schéma pour la création d'une candidature
export const createDeliveryApplicationSchema = z
  .object({
    announcementId: z.string(),
    proposedPrice: z
      .number()
      .positive('Le prix proposé doit être positif')
      .max(10000, 'Prix maximum dépassé')
      .optional(),
    message: z.string().max(500, 'Message trop long').optional(),
    estimatedPickupTime: z.date().optional(),
    estimatedDeliveryTime: z.date().optional(),
    notes: z.string().max(500, 'Notes trop longues').optional(),
  })
  .refine(
    data => {
      // Vérification de la cohérence des dates (si les deux sont présentes)
      if (data.estimatedPickupTime && data.estimatedDeliveryTime) {
        return data.estimatedDeliveryTime > data.estimatedPickupTime;
      }
      return true;
    },
    {
      message: "L'heure estimée de livraison doit être postérieure à l'heure estimée de ramassage",
      path: ['estimatedDeliveryTime'],
    }
  );

// Schéma pour la mise à jour d'une candidature
export const updateDeliveryApplicationSchema = z
  .object({
    id: z.string(),
    proposedPrice: z
      .number()
      .positive('Le prix proposé doit être positif')
      .max(10000, 'Prix maximum dépassé')
      .optional(),
    message: z.string().max(500, 'Message trop long').optional(),
    status: z.string().optional(),
    estimatedPickupTime: z.date().optional(),
    estimatedDeliveryTime: z.date().optional(),
    isPreferred: z.boolean().optional(),
    notes: z.string().max(500, 'Notes trop longues').optional(),
  })
  .refine(
    data => {
      // Vérification de la cohérence des dates (si les deux sont présentes)
      if (data.estimatedPickupTime && data.estimatedDeliveryTime) {
        return data.estimatedDeliveryTime > data.estimatedPickupTime;
      }
      return true;
    },
    {
      message: "L'heure estimée de livraison doit être postérieure à l'heure estimée de ramassage",
      path: ['estimatedDeliveryTime'],
    }
  );

// Types inférés
export type CreateAnnouncementSchemaType = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementSchemaType = z.infer<typeof updateAnnouncementSchema>;
export type AnnouncementFiltersSchemaType = z.infer<typeof announcementFiltersSchema>;
export type CreateDeliveryApplicationSchemaType = z.infer<typeof createDeliveryApplicationSchema>;
export type UpdateDeliveryApplicationSchemaType = z.infer<typeof updateDeliveryApplicationSchema>;
export type GeoSearchSchemaType = z.infer<typeof geoSearchSchema>;
