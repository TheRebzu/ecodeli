import { DeliveryStatus } from '@prisma/client';

// Réexporter l'enum DeliveryStatus de Prisma pour une meilleure compatibilité
export { DeliveryStatus };

// Type pour les filtres de livraison
export interface DeliveryFilters {
  status?: DeliveryStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// Type pour les coordonnées de livraison
export interface DeliveryCoordinatesInput {
  latitude: number;
  longitude: number;
  deliveryId: string;
}

// Type pour la mise à jour du statut
export interface DeliveryStatusUpdate {
  deliveryId: string;
  status: DeliveryStatus;
  note?: string;
  latitude?: number;
  longitude?: number;
}

// Type pour la confirmation de livraison
export interface DeliveryConfirmation {
  deliveryId: string;
  confirmationCode: string;
  proofType?: string;
  proofUrl?: string;
}

// Type pour l'évaluation de livraison
export interface DeliveryRatingInput {
  deliveryId: string;
  rating: number;
  comment?: string;
}

// Type pour les informations de suivi en temps réel
export interface DeliveryTrackingInfo {
  deliveryId: string;
  status: DeliveryStatus;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  estimatedArrival?: Date;
  logs: Array<{
    status: DeliveryStatus;
    timestamp: Date;
    note?: string;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
}

// Type pour l'historique des positions
export type DeliveryCoordinatesHistory = Array<{
  latitude: number;
  longitude: number;
  timestamp: Date;
}>;

// Type pour le détail d'une livraison
export interface DeliveryDetail {
  id: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDate: Date;
  deliveryDate?: Date;
  estimatedArrival?: Date;
  client: {
    id: string;
    name: string;
    phone?: string;
  };
  deliverer?: {
    id: string;
    name: string;
    phone?: string;
    rating?: number;
  };
  currentLocation?: {
    latitude: number;
    longitude: number;
    lastUpdate: Date;
  };
  rating?: {
    rating: number;
    comment?: string;
  };
}
