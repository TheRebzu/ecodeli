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

// Conversion des statuts de livraison de DeliveryStatus à une énumération Zod
// Cela est nécessaire car DeliveryStatusEnum n'existe pas dans Prisma
export const deliveryStatusEnumSchema = z.enum([
  'CREATED',
  'ASSIGNED',
  'PENDING_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'NEARBY',
  'ARRIVED',
  'ATTEMPT_DELIVERY',
  'DELIVERED',
  'NOT_DELIVERED',
  'RESCHEDULED',
  'RETURNED',
  'CANCELLED',
]);

// Schéma pour le changement de statut de livraison
export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  status: deliveryStatusEnumSchema,
  previousStatus: deliveryStatusEnumSchema.optional(),
  location: geoPointSchema.optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  notifyCustomer: z.boolean().default(true),
  timestamp: z.date().default(() => new Date()),
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
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  type: checkpointTypeSchema,
  location: geoPointSchema,
  address: z.string().min(1, { message: "L'adresse est requise" }),
  name: z.string().optional(),
  plannedTime: z.date().optional(),
  actualTime: z.date().optional(),
  completedBy: z.string().optional(),
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
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  estimatedTime: z.date({
    required_error: "Le temps d'arrivée estimé est requis",
    invalid_type_error: 'Format de date invalide',
  }),
  previousEstimate: z.date().optional(),
  distanceRemaining: z.number().min(0).optional(),
  trafficCondition: trafficConditionSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  calculationType: etaCalculationTypeSchema.default('REAL_TIME'),
  notifiedAt: z.date().optional(),
  updatedById: z.string().optional(),
  metadata: z.record(z.any()).optional(),
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
export const createDeliveryIssueSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  type: deliveryIssueTypeSchema,
  reportedById: z.string().min(1, { message: "L'identifiant du rapporteur est requis" }),
  description: z.string().min(5, { message: "Une description détaillée est requise" }),
  severity: issueSeveritySchema.default('MEDIUM'),
  photoUrls: z.array(z.string().url()).default([]),
  location: geoPointSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

// Alias pour la cohérence des noms
export const deliveryIssueCreateSchema = createDeliveryIssueSchema;

// Schéma pour mettre à jour un incident
export const updateDeliveryIssueSchema = z.object({
  id: z.string().min(1, { message: "L'identifiant de l'incident est requis" }),
  status: issueStatusSchema.optional(),
  resolvedById: z.string().optional(),
  resolution: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional(),
});

// Schéma pour la confirmation de livraison
export const deliveryConfirmationSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  confirmationCode: z.string().optional(),
  signatureUrl: z.string().url().optional(),
  photoUrl: z.string().url().optional(),
  notes: z.string().optional(),
  location: geoPointSchema.optional(),
});

// Schéma pour la génération d'un code de confirmation
export const generateConfirmationCodeSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
});

// Schéma pour l'évaluation d'une livraison
export const deliveryRatingSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

// Schéma pour les filtres de requête de suivi
export const trackingQuerySchema = z.object({
  // Filtres de base
  deliveryId: z.string().optional(),
  delivererId: z.string().optional(),
  clientId: z.string().optional(),
  status: z.array(deliveryStatusEnumSchema).optional(),

  // Filtres temporels
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Filtres géographiques
  bounds: geoBoundsSchema.optional(),
  nearLocation: z
    .object({
      point: geoCoordinatesSchema,
      radiusInMeters: z.number().min(1).max(50000), // 50km max
    })
    .optional(),

  // Filtres d'issues
  hasOpenIssues: z.boolean().optional(),
  issueTypes: z.array(deliveryIssueTypeSchema).optional(),

  // Filtres de retard
  isLate: z.boolean().optional(),
  minDelayMinutes: z.number().optional(),

  // Pagination et tri
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
  sortBy: z.enum(['updatedAt', 'createdAt', 'estimatedTime', 'status']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Schéma pour la création d'une nouvelle livraison
export const createDeliveryTrackingSchema = z.object({
  clientId: z.string().optional(), // Si non fourni, utiliser l'ID de l'utilisateur actuel
  delivererId: z.string().optional(),
  pickupAddress: z.string().min(1, { message: "L'adresse de ramassage est requise" }),
  deliveryAddress: z.string().min(1, { message: "L'adresse de livraison est requise" }),
  pickupDate: z.date(),
  estimatedDeliveryDate: z.date().optional(),
  notes: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  isFragile: z.boolean().default(false),
  weight: z.number().optional(),
  dimensions: z
    .object({
      length: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  trackingEnabled: z.boolean().default(true),
});

// Schéma pour les coordonnées de livraison
export const deliveryCoordinatesUpdateSchema = z.object({
  deliveryId: z.string().min(1, { message: "L'identifiant de livraison est requis" }),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  altitude: z.number().optional(),
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
  createDeliveryIssueSchema,
  updateDeliveryIssueSchema,
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
