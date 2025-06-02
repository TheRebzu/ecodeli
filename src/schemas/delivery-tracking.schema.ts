import { z } from 'zod';
import { DeliveryStatus } from '@prisma/client';
import { AnnouncementStatusEnum } from './announcement.schema';

// Schéma pour les coordonnées géographiques
export const geoCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Schéma pour les points géographiques (format GeoJSON)
export const geoPointSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]), // [longitude, latitude] en format GeoJSON
});

// Schéma pour les limites géographiques (bounds)
export const geoBoundsSchema = z.object({
  southWest: geoCoordinatesSchema,
  northEast: geoCoordinatesSchema,
});

// Schéma pour les métadonnées de position
export const positionMetadataSchema = z
  .object({
    batteryLevel: z.number().min(0).max(100).optional(),
    networkType: z.string().optional(),
    deviceModel: z.string().optional(),
    appVersion: z.string().optional(),
    weatherCondition: z.string().optional(),
  })
  .optional();

// Schéma pour la mise à jour de position GPS
export const updateLocationSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  location: geoPointSchema,
  accuracy: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  altitude: z.number().optional(),
  timestamp: z.date().default(() => new Date()),
  isSynced: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

// Schéma étendu pour les statuts incluant les valeurs personnalisées
export const deliveryStatusEnumSchema = z.enum([
  // Statuts Prisma
  'PENDING',
  'ASSIGNED',
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

// Schéma pour la création d'une livraison dans le système de suivi
export const createDeliveryTrackingSchema = z.object({
  pickupAddress: z.string().min(5),
  deliveryAddress: z.string().min(5),
  pickupDate: z.coerce.date(),
  clientId: z.string().min(1),
  estimatedArrival: z.coerce.date().optional(),
  weight: z.number().optional(),
  dimensions: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(1, 'Le prix doit être supérieur à 0'),
  type: z.enum(['PACKAGE', 'SHOPPING_CART', 'AIRPORT_TRANSFER', 'GROCERY', 'FOREIGN_PRODUCT']),
});

// Schéma pour la mise à jour des coordonnées de livraison
export const deliveryCoordinatesUpdateSchema = z.object({
  deliveryId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  timestamp: z.date().optional(),
});

// Schéma pour la mise à jour du statut de livraison
export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().min(1),
  status: deliveryStatusEnumSchema,
  previousStatus: deliveryStatusEnumSchema.optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  notifyCustomer: z.boolean().default(true),
});

// Énumération pour les types de points de passage
export const checkpointTypeSchema = z.enum([
  'DEPARTURE',
  'PICKUP',
  'WAYPOINT',
  'DELIVERY_ATTEMPT',
  'DELIVERY',
  'RETURN_POINT',
  'WAREHOUSE',
  'CUSTOMS',
  'HANDOFF',
  'OTHER',
]);

// Schéma pour la création de point de passage
export const createCheckpointSchema = z.object({
  deliveryId: z.string().min(1),
  type: z.enum(['PICKUP', 'WAYPOINT', 'DELIVERY', 'CUSTOMS', 'DEPOT']),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  address: z.string().min(5),
  name: z.string().optional(),
  plannedTime: z.coerce.date().optional(),
  actualTime: z.coerce.date().optional(),
  notes: z.string().optional(),
  photoProofUrl: z.string().url().optional(),
  signatureProofUrl: z.string().url().optional(),
  confirmationCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Schéma pour la mise à jour d'un point de passage existant
export const updateCheckpointSchema = z.object({
  id: z.string().min(1, { message: "L'identifiant du point de passage est requis" }),
  actualTime: z.date().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
  photoProofUrl: z.string().url().optional(),
  signatureProofUrl: z.string().url().optional(),
  confirmationCode: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Types de calcul d'ETA
export const etaCalculationTypeSchema = z.enum(['REAL_TIME', 'HISTORICAL', 'MANUAL']);

// Conditions de trafic
export const trafficConditionSchema = z.enum(['LIGHT', 'MODERATE', 'HEAVY']);

// Schéma pour la mise à jour d'ETA
export const updateETASchema = z.object({
  deliveryId: z.string().min(1),
  estimatedArrival: z.coerce.date(),
  reason: z.string().optional(),
  delayInMinutes: z.number().optional(),
});

// Types d'incidents de livraison
export const deliveryIssueTypeSchema = z.enum([
  'ACCESS_PROBLEM',
  'ADDRESS_NOT_FOUND',
  'CUSTOMER_ABSENT',
  'DAMAGED_PACKAGE',
  'DELIVERY_REFUSED',
  'VEHICLE_BREAKDOWN',
  'TRAFFIC_JAM',
  'WEATHER_CONDITION',
  'SECURITY_ISSUE',
  'OTHER',
]);

// Niveaux de sévérité des incidents
export const issueSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Statuts des incidents
export const issueStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED']);

// Schéma pour signaler un incident de livraison
export const deliveryIssueCreateSchema = z.object({
  deliveryId: z.string().min(1),
  type: z.enum(['DELAY', 'DAMAGE', 'LOSS', 'ACCIDENT', 'WEATHER', 'VEHICLE_ISSUE', 'OTHER']),
  description: z.string().min(10).max(500),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }).optional(),
  photoUrls: z.array(z.string().url()).optional(),
  expectedResolutionTime: z.coerce.date().optional(),
});

// Schéma pour la confirmation de livraison
export const deliveryConfirmationSchema = z.object({
  deliveryId: z.string().min(1),
  confirmationCode: z.string().min(4).max(10),
  proofType: z.enum(['PHOTO', 'SIGNATURE', 'CODE']).optional(),
  proofUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

// Schéma pour l'évaluation d'une livraison
export const deliveryRatingSchema = z.object({
  deliveryId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  tips: z.number().min(0).optional(),
});

// Schéma pour la génération d'un code de confirmation
export const generateConfirmationCodeSchema = z.object({
  deliveryId: z.string().min(1),
  codeLength: z.number().min(4).max(10).default(6),
});

// Schéma pour les filtres de requête de suivi
export const trackingQuerySchema = z.object({
  status: deliveryStatusEnumSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  page: z.number().min(1).default(1),
  sortBy: z.enum(['createdAt', 'updatedAt', 'pickupDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schéma pour le filtrage des positions de livraison
export const deliveryPositionFilterSchema = trackingQuerySchema.pick({
  deliveryId: true,
  startDate: true,
  endDate: true,
  limit: true,
  page: true
});

// Alias pour la cohérence des noms
export const deliveryFilterSchema = trackingQuerySchema;

// Export des schémas comme un objet unique pour une utilisation plus facile
export const deliveryTrackingSchemas = {
  geoCoordinatesSchema,
  geoPointSchema,
  geoBoundsSchema,
  updateLocationSchema,
  deliveryStatusEnumSchema,
  updateDeliveryStatusSchema,
  checkpointTypeSchema,
  createCheckpointSchema,
  updateCheckpointSchema,
  etaCalculationTypeSchema,
  trafficConditionSchema,
  updateETASchema,
  deliveryIssueTypeSchema,
  issueSeveritySchema,
  issueStatusSchema,
  deliveryIssueCreateSchema,
  deliveryConfirmationSchema,
  generateConfirmationCodeSchema,
  deliveryRatingSchema,
  trackingQuerySchema,
  createDeliveryTrackingSchema,
  deliveryCoordinatesUpdateSchema,
  deliveryPositionFilterSchema,
  deliveryFilterSchema,
};

export default deliveryTrackingSchemas;
