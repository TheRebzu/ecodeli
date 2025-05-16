import { DeliveryStatusEnum } from '@prisma/client';
import { GeoPoint } from './delivery-tracking';

// Types d'événements de tracking
export type TrackingEventType =
  | 'LOCATION_UPDATE'
  | 'STATUS_UPDATE'
  | 'ETA_UPDATE'
  | 'ISSUE_REPORTED'
  | 'ISSUE_RESOLVED'
  | 'CHECKPOINT_REACHED';

// Événement de mise à jour de position
export interface LocationUpdateEvent {
  type: 'LOCATION_UPDATE';
  deliveryId: string;
  location: GeoPoint;
  accuracy?: number;
  timestamp: Date;
  batteryLevel?: number;
  heading?: number;
  speed?: number;
}

// Événement de mise à jour de statut
export interface StatusUpdateEvent {
  type: 'STATUS_UPDATE';
  deliveryId: string;
  status: DeliveryStatusEnum;
  previousStatus?: DeliveryStatusEnum;
  location?: GeoPoint;
  timestamp: Date;
  notes?: string;
}

// Événement de mise à jour du temps d'arrivée estimé
export interface ETAUpdateEvent {
  type: 'ETA_UPDATE';
  deliveryId: string;
  estimatedTime: Date;
  distanceRemaining?: number;
  delay?: number; // en minutes
}

// Événement de signalement d'un problème
export interface IssueReportedEvent {
  type: 'ISSUE_REPORTED';
  deliveryId: string;
  issueId: string;
  issueType: string;
  description: string;
  severity: string;
  timestamp: Date;
}

// Événement de résolution d'un problème
export interface IssueResolvedEvent {
  type: 'ISSUE_RESOLVED';
  deliveryId: string;
  issueId: string;
  resolution: string;
  timestamp: Date;
}

// Événement d'arrivée à un point de passage
export interface CheckpointReachedEvent {
  type: 'CHECKPOINT_REACHED';
  deliveryId: string;
  checkpointId: string;
  checkpointType: string;
  timestamp: Date;
  notes?: string;
}

// Union de tous les types d'événements
export type TrackingEvent =
  | LocationUpdateEvent
  | StatusUpdateEvent
  | ETAUpdateEvent
  | IssueReportedEvent
  | IssueResolvedEvent
  | CheckpointReachedEvent;

// Types pour les émissions et réceptions socket
export interface ServerToClientEvents {
  'delivery:update': (event: TrackingEvent) => void;
  'tracking:error': (error: { message: string }) => void;
  'tracking:syncComplete': (data: { count: number }) => void;
}

export interface ClientToServerEvents {
  'tracking:updateLocation': (data: {
    deliveryId: string;
    location: GeoPoint;
    accuracy?: number;
    heading?: number;
    speed?: number;
    altitude?: number;
  }) => void;
  'tracking:updateStatus': (data: {
    deliveryId: string;
    status: DeliveryStatusEnum;
    notes?: string;
    location?: GeoPoint;
  }) => void;
  'tracking:sync': () => void;
  'tracking:subscribeToDelivery': (deliveryId: string) => void;
  'tracking:unsubscribeFromDelivery': (deliveryId: string) => void;
}
