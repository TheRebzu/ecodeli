import { z } from "zod";
import { DeliveryStatus } from "@prisma/client";

// Types de base pour la géolocalisation
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type GeoMetadata = {
  accuracy?: number;
  battery?: number;
  network?: string;
  device?: string;
};

// Types pour le suivi de livraison
export interface DeliveryTrackingData {
  id: string;
  deliveryId: string;
  delivererId: string;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date | null;
  lastUpdatedAt: Date;
  batteryLevel?: number | null;
  networkType?: string | null;
}

/**
 * Types pour les données de position GPS
 */
export interface DeliveryTrackingPositionData {
  id?: string;
  deliveryId: string;
  location: GeoPoint;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  altitude?: number | null;
  timestamp: Date;
  metadata?: Record<string, any> | null;
}

/**
 * Types pour l'historique des statuts de livraison
 */
export interface DeliveryStatusHistoryData {
  id?: string;
  deliveryId: string;
  status: DeliveryStatus;
  previousStatus?: DeliveryStatus | null;
  timestamp: Date;
  updatedById: string;
  location?: GeoPoint | null;
  notes?: string | null;
  reason?: string | null;
  customerNotified?: boolean;
  notificationSentAt?: Date | null;
}

/**
 * Types pour les points de passage
 */
export enum CheckpointType {
  DEPARTURE = "DEPARTURE",
  PICKUP = "PICKUP",
  WAYPOINT = "WAYPOINT",
  DELIVERY_ATTEMPT = "DELIVERY_ATTEMPT",
  DELIVERY = "DELIVERY",
  RETURN_POINT = "RETURN_POINT",
  WAREHOUSE = "WAREHOUSE",
  CUSTOMS = "CUSTOMS",
  HANDOFF = "HANDOFF",
  OTHER = "OTHER"}

export interface DeliveryCheckpointData {
  id?: string;
  deliveryId: string;
  type: CheckpointType | string;
  location: GeoPoint;
  address: string;
  name?: string | null;
  plannedTime?: Date | null;
  actualTime?: Date | null;
  completedBy?: string | null;
  notes?: string | null;
  photoProofUrl?: string | null;
  signatureProofUrl?: string | null;
  confirmationCode?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Types pour l'estimation de temps d'arrivée
 */
export enum ETACalculationType {
  REAL_TIME = "REAL_TIME",
  HISTORICAL = "HISTORICAL",
  MANUAL = "MANUAL"}

export enum TrafficCondition {
  LIGHT = "LIGHT",
  MODERATE = "MODERATE",
  HEAVY = "HEAVY"}

export interface DeliveryETAData {
  id?: string;
  deliveryId: string;
  estimatedTime: Date;
  previousEstimate?: Date | null;
  calculatedAt: Date;
  calculationType?: ETACalculationType | string;
  distanceRemaining?: number | null;
  trafficCondition?: TrafficCondition | string | null;
  confidence?: number | null;
  updatedById?: string | null;
  notifiedAt?: Date | null;
  metadata?: Record<string, any> | null;
}

/**
 * Types pour les incidents de livraison
 */
export enum DeliveryIssueType {
  ACCESS_PROBLEM = "ACCESS_PROBLEM",
  ADDRESS_NOT_FOUND = "ADDRESS_NOT_FOUND",
  CUSTOMER_ABSENT = "CUSTOMER_ABSENT",
  DAMAGED_PACKAGE = "DAMAGED_PACKAGE",
  DELIVERY_REFUSED = "DELIVERY_REFUSED",
  VEHICLE_BREAKDOWN = "VEHICLE_BREAKDOWN",
  TRAFFIC_JAM = "TRAFFIC_JAM",
  WEATHER_CONDITION = "WEATHER_CONDITION",
  SECURITY_ISSUE = "SECURITY_ISSUE",
  OTHER = "OTHER"}

export enum IssueSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"}

export enum IssueStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  ESCALATED = "ESCALATED",
  CLOSED = "CLOSED"}

export interface DeliveryIssueData {
  id?: string;
  deliveryId: string;
  type: DeliveryIssueType | string;
  reportedById: string;
  description: string;
  severity?: IssueSeverity | string;
  location?: GeoPoint | null;
  status?: IssueStatus | string;
  resolvedById?: string | null;
  resolution?: string | null;
  photoUrls?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any> | null;
}

/**
 * Type pour la confirmation de livraison
 */
export interface DeliveryConfirmationData {
  deliveryId: string;
  confirmationCode?: string | null;
  signatureUrl?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  location?: GeoPoint | null;
}

/**
 * Type pour l'évaluation de la livraison
 */
export interface DeliveryRatingData {
  id?: string;
  deliveryId: string;
  rating: number;
  comment?: string | null;
  createdAt?: Date;
}

/**
 * Type pour le suivi actif des livraisons
 */
export interface ActiveDeliveryTrackingData {
  id?: string;
  deliveryId: string;
  delivererId: string;
  isActive: boolean;
  startedAt: Date;
  lastUpdatedAt?: Date | null;
  endedAt?: Date | null;
  metadata?: Record<string, any> | null;
}

/**
 * Type pour les filtres de requête de suivi
 */
export interface TrackingQueryFilters {
  deliveryId?: string;
  delivererId?: string;
  clientId?: string;
  status?: DeliveryStatus[] | DeliveryStatus;
  startDate?: Date;
  endDate?: Date;
  bounds?: {
    southWest: Coordinates;
    northEast: Coordinates;
  };
  nearLocation?: {
    point: Coordinates;
    radiusInMeters: number;
  };
  hasOpenIssues?: boolean;
  issueTypes?: DeliveryIssueType[] | DeliveryIssueType;
  isLate?: boolean;
  minDelayMinutes?: number;
  page?: number;
  limit?: number;
  sortBy?: "updatedAt" | "createdAt" | "estimatedTime" | "status";
  sortOrder?: "asc" | "desc";
}

/**
 * Type pour les mises à jour WebSocket
 */
export enum TrackingEventType {
  LOCATION_UPDATE = "LOCATION_UPDATE",
  STATUS_UPDATE = "STATUS_UPDATE",
  ETA_UPDATE = "ETA_UPDATE",
  CHECKPOINT_REACHED = "CHECKPOINT_REACHED",
  ISSUE_REPORTED = "ISSUE_REPORTED",
  ISSUE_RESOLVED = "ISSUE_RESOLVED"}

export interface TrackingUpdate {
  type: TrackingEventType | string;
  timestamp: Date;
  deliveryId: string;
  [key: string]: any;
}

/**
 * Type pour la réponse combinée du suivi de livraison
 */
export interface DeliveryTrackingResponse {
  delivery: any;
  positions?: DeliveryTrackingPositionData[];
  statuses?: DeliveryStatusHistoryData[];
  checkpoints?: DeliveryCheckpointData[];
  eta?: DeliveryETAData | null;
  issues?: DeliveryIssueData[];
  currentPosition?: DeliveryTrackingPositionData | null;
}

// Types pour les entrées API
export type DeliveryTrackingCreateInput = Omit<
  DeliveryTrackingData,
  "id" | "startedAt" | "lastUpdatedAt"
>;

export type DeliveryPositionUpdateInput = {
  deliveryId: string;
  location: GeoPoint;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp?: Date;
  metadata?: Record<string, any>;
};

export type DeliveryStatusUpdateInput = {
  deliveryId: string;
  status: DeliveryStatus;
  previousStatus?: DeliveryStatus;
  location?: GeoPoint;
  notes?: string;
  reason?: string;
  notifyCustomer?: boolean;
};

export type DeliveryCheckpointCreateInput = Omit<
  DeliveryCheckpointData,
  "id" | "createdAt" | "updatedAt"
>;

export type DeliveryCheckpointUpdateInput = {
  id: string;
  actualTime?: Date;
  completedBy?: string;
  notes?: string;
  photoProofUrl?: string;
  signatureProofUrl?: string;
  confirmationCode?: string;
};

export type DeliveryETAUpdateInput = {
  deliveryId: string;
  estimatedTime: Date;
  distanceRemaining?: number;
  trafficCondition?: string;
  confidence?: number;
  calculationType?: string;
  metadata?: Record<string, any>;
};

export type DeliveryIssueCreateInput = Omit<
  DeliveryIssueData,
  "id" | "reportedAt" | "status"
>;

export type DeliveryIssueUpdateInput = {
  id: string;
  status?: IssueStatus;
  resolvedById?: string;
  resolution?: string;
  photoUrls?: string[];
};

// Types pour les réponses API
export type DeliveryPositionsResponse = {
  positions: DeliveryTrackingPositionData[];
  bounds?: GeoBounds;
  lastUpdated: Date;
};

export type DeliveryETAResponse = DeliveryETAData & {
  isLate: boolean;
  delayDuration?: number; // en minutes
};

export type DeliveryStatusHistoryResponse = {
  history: DeliveryStatusHistoryData[];
  currentStatus: DeliveryStatus;
};

export type DeliveryIssuesResponse = {
  openIssues: DeliveryIssueData[];
  resolvedIssues: DeliveryIssueData[];
};

// Schémas Zod pour validation
export const geoPointSchema = z.object({ type: z.literal("Point"),
  coordinates: z.tuple([z.number(), z.number()]) });

export const coordinatesSchema = z.object({ latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180) });

export const geoBoundsSchema = z.object({ southWest: coordinatesSchema,
  northEast: coordinatesSchema });

export const deliveryTrackingCreateSchema = z.object({ deliveryId: z.string(),
  delivererId: z.string(),
  isActive: z.boolean().default(true),
  batteryLevel: z.number().min(0).max(100).optional(),
  networkType: z.string().optional() });

export const deliveryPositionUpdateSchema = z.object({ deliveryId: z.string(),
  location: geoPointSchema,
  accuracy: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
  altitude: z.number().optional(),
  metadata: z.record(z.any()).optional() });

export const deliveryStatusUpdateSchema = z.object({ deliveryId: z.string(),
  status: z.nativeEnum(DeliveryStatus),
  previousStatus: z.nativeEnum(DeliveryStatus).optional(),
  location: geoPointSchema.optional(),
  notes: z.string().optional(),
  reason: z.string().optional(),
  notifyCustomer: z.boolean().default(true) });

export const deliveryCheckpointCreateSchema = z.object({ deliveryId: z.string(),
  type: z.nativeEnum(CheckpointType),
  location: geoPointSchema,
  address: z.string(),
  name: z.string().optional(),
  plannedTime: z.date().optional(),
  actualTime: z.date().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
  photoProofUrl: z.string().url().optional(),
  signatureProofUrl: z.string().url().optional(),
  confirmationCode: z.string().optional(),
  metadata: z.record(z.any()).optional() });

export const deliveryETAUpdateSchema = z.object({ deliveryId: z.string(),
  estimatedTime: z.date(),
  distanceRemaining: z.number().min(0).optional(),
  trafficCondition: z.enum(["LIGHT", "MODERATE", "HEAVY"]).optional(),
  confidence: z.number().min(0).max(1).optional(),
  calculationType: z
    .enum(["REAL_TIME", "HISTORICAL", "MANUAL"])
    .default("REAL_TIME"),
  metadata: z.record(z.any()).optional() });

export const deliveryIssueCreateSchema = z.object({ deliveryId: z.string(),
  type: z.nativeEnum(DeliveryIssueType),
  reportedById: z.string(),
  description: z.string(),
  severity: z.nativeEnum(IssueSeverity).default(IssueSeverity.MEDIUM),
  photoUrls: z.array(z.string().url()).default([]),
  location: geoPointSchema.optional(),
  metadata: z.record(z.any()).optional() });

// Utilitaires pour conversion

/**
 * Convertit un GeoPoint (format GeoJSON) en Coordinates
 */
export function geoPointToCoordinates(point: GeoPoint): Coordinates {
  return {
    latitude: point.coordinates[1],
    longitude: point.coordinates[0]};
}

/**
 * Convertit des Coordinates en GeoPoint (format GeoJSON)
 */
export function coordinatesToGeoPoint(coords: Coordinates): GeoPoint {
  return {
    type: "Point",
    coordinates: [coords.longitude, coords.latitude]};
}

/**
 * Calcule des limites géographiques (bounds) à partir d'un ensemble de positions
 */
export function calculateBounds(
  positions: DeliveryTrackingPositionData[],
): GeoBounds | null {
  if (positions.length === 0) return null;

  const latitudes: number[] = [];
  const longitudes: number[] = [];

  positions.forEach((pos) => {
    const coords = geoPointToCoordinates(pos.location);
    latitudes.push(coords.latitude);
    longitudes.push(coords.longitude);
  });

  return {
    southWest: {
      latitude: Math.min(...latitudes),
      longitude: Math.min(...longitudes)},
    northEast: {
      latitude: Math.max(...latitudes),
      longitude: Math.max(...longitudes)}};
}

/**
 * Calcule la distance en mètres entre deux coordonnées (formule de Haversine)
 */
export function calculateDistance(
  start: Coordinates,
  end: Coordinates,
): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (start.latitude * Math.PI) / 180;
  const φ2 = (end.latitude * Math.PI) / 180;
  const Δφ = ((end.latitude - start.latitude) * Math.PI) / 180;
  const Δλ = ((end.longitude - start.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Estime le temps d'arrivée en fonction de la distance et de la vitesse moyenne
 * @param distance Distance en mètres
 * @param averageSpeed Vitesse moyenne en km/h
 * @returns Estimation du temps d'arrivée en minutes
 */
export function calculateETA(
  distance: number,
  averageSpeed: number = 30,
): number {
  // Convertir la distance de mètres en kilomètres
  const distanceKm = distance / 1000;
  // Calculer le temps en heures
  const timeHours = distanceKm / averageSpeed;
  // Convertir en minutes
  return Math.round(timeHours * 60);
}

/**
 * Type pour des coordonnées géographiques simples
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Type pour un point GeoJSON
 */
export interface GeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Type pour un polygone GeoJSON
 */
export interface GeoPolygon {
  type: "Polygon";
  coordinates: [number, number][][]; // [[long, lat], [long, lat], ...]
}

/**
 * Type pour les limites géographiques (bounds)
 */
export interface GeoBounds {
  southWest: Coordinates;
  northEast: Coordinates;
}

/**
 * Type pour les paramètres de recherche de livraison à proximité
 */
export interface NearbyDeliverySearch {
  point: Coordinates;
  radiusInMeters: number;
}

/**
 * Type pour un ETA (temps d'arrivée estimé)
 */
export interface DeliveryETA {
  estimatedArrival: Date | string | null;
  distance: number | null;
  trafficCondition?: string | null;
  confidence?: number;
}

/**
 * Type pour l'historique des positions
 */
export interface PositionHistory {
  positions: DeliveryPosition[];
  count: number;
}

/**
 * Type pour une position de livraison
 */
export interface DeliveryPosition {
  id: string;
  deliveryId: string;
  location: GeoPoint;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Type pour l'état de suivi d'une livraison
 */
export interface DeliveryTracking {
  isActive: boolean;
  deliveryId: string;
  delivererId: string;
  startedAt: Date;
  lastUpdatedAt: Date;
  pausedAt?: Date;
  pauseReason?: string;
}

/**
 * Type pour un point de passage
 */
export interface DeliveryCheckpoint {
  id: string;
  deliveryId: string;
  type: string;
  name?: string;
  location: GeoPoint;
  address: string;
  plannedTime?: Date;
  actualTime?: Date;
  completedBy?: string;
  notes?: string;
  photoProofUrl?: string;
  signatureProofUrl?: string;
  confirmationCode?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Type pour un incident de livraison
 */
export interface DeliveryIssue {
  id: string;
  deliveryId: string;
  type: string;
  reportedById: string;
  description: string;
  severity: string;
  status: string;
  resolvedById?: string;
  resolution?: string;
  photoUrls: string[];
  location?: GeoPoint;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type pour une note de livraison
 */
export interface DeliveryRating {
  deliveryId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

/**
 * Type pour un message de livraison
 */
export interface DeliveryMessage {
  id: string;
  deliveryId: string;
  senderId: string;
  recipientId: string;
  content: string;
  method: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

/**
 * Type pour un historique de statut
 */
export interface DeliveryStatusHistory {
  id: string;
  deliveryId: string;
  previousStatus: DeliveryStatus;
  newStatus: DeliveryStatus;
  notes?: string;
  changedById: string;
  timestamp: Date;
}

/**
 * Type pour un événement de livraison
 */
export type DeliveryEvent =
  | {
      type: "LOCATION_UPDATE";
      deliveryId: string;
      location: GeoPoint;
      timestamp: Date;
    }
  | {
      type: "STATUS_UPDATE";
      deliveryId: string;
      status: DeliveryStatus;
      timestamp: Date;
    }
  | {
      type: "ETA_UPDATE";
      deliveryId: string;
      eta: Date | string;
      distance: number;
      timestamp: Date;
    }
  | {
      type: "CHECKPOINT_REACHED";
      deliveryId: string;
      checkpointId: string;
      timestamp: Date;
    }
  | {
      type: "ISSUE_REPORTED";
      deliveryId: string;
      issueId: string;
      timestamp: Date;
    }
  | { type: "DELIVERY_CONFIRMED"; deliveryId: string; timestamp: Date }
  | {
      type: "CLIENT_MESSAGE";
      deliveryId: string;
      messageId: string;
      timestamp: Date;
    };
