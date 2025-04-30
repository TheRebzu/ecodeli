import { User } from '@prisma/client';

// Énumérations pour les annonces
export enum AnnouncementStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AnnouncementType {
  PACKAGE = 'PACKAGE',
  GROCERIES = 'GROCERIES',
  DOCUMENTS = 'DOCUMENTS',
  MEAL = 'MEAL',
  FURNITURE = 'FURNITURE',
  OTHER = 'OTHER',
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// Interface pour une annonce complète
export interface Announcement {
  id: string;
  title: string;
  description: string;
  type: AnnouncementType;
  status: AnnouncementStatus;
  priority: AnnouncementPriority;

  // Adresses
  pickupAddress: string;
  pickupLongitude?: number;
  pickupLatitude?: number;
  deliveryAddress: string;
  deliveryLongitude?: number;
  deliveryLatitude?: number;

  // Détails de l'envoi
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  needsCooling: boolean;

  // Planning
  pickupDate?: Date;
  pickupTimeWindow?: string;
  deliveryDate?: Date;
  deliveryTimeWindow?: string;
  isFlexible: boolean;

  // Prix et paiement
  suggestedPrice?: number;
  finalPrice?: number;
  isNegotiable: boolean;
  paymentStatus?: string;

  // Utilisateur et timestamps
  clientId: string;
  client?: User;
  delivererId?: string;
  deliverer?: User;

  createdAt: Date;
  updatedAt: Date;

  // Métadonnées
  viewCount: number;
  applicationsCount: number;
  cancelReason?: string;
  notes?: string;
  tags: string[];

  // Nouveaux champs
  photos: string[];
  estimatedDistance?: number;
  estimatedDuration?: number;
  requiresSignature: boolean;
  requiresId: boolean;
  specialInstructions?: string;
  isFavorite: boolean;

  // Relations
  applications?: DeliveryApplication[];
}

// Interface pour la création d'une annonce
export interface CreateAnnouncementInput {
  title: string;
  description: string;
  type: AnnouncementType;
  priority?: AnnouncementPriority;

  pickupAddress: string;
  pickupLongitude?: number;
  pickupLatitude?: number;
  deliveryAddress: string;
  deliveryLongitude?: number;
  deliveryLatitude?: number;

  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile?: boolean;
  needsCooling?: boolean;

  pickupDate?: Date;
  pickupTimeWindow?: string;
  deliveryDate?: Date;
  deliveryTimeWindow?: string;
  isFlexible?: boolean;

  suggestedPrice?: number;
  isNegotiable?: boolean;

  // Nouveaux champs
  photos?: string[];
  requiresSignature?: boolean;
  requiresId?: boolean;
  specialInstructions?: string;

  tags?: string[];
  notes?: string;
}

// Interface pour la mise à jour d'une annonce
export interface UpdateAnnouncementInput {
  id: string;
  title?: string;
  description?: string;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;

  pickupAddress?: string;
  pickupLongitude?: number;
  pickupLatitude?: number;
  deliveryAddress?: string;
  deliveryLongitude?: number;
  deliveryLatitude?: number;

  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile?: boolean;
  needsCooling?: boolean;

  pickupDate?: Date;
  pickupTimeWindow?: string;
  deliveryDate?: Date;
  deliveryTimeWindow?: string;
  isFlexible?: boolean;

  suggestedPrice?: number;
  finalPrice?: number;
  isNegotiable?: boolean;
  paymentStatus?: string;

  delivererId?: string;

  // Nouveaux champs
  photos?: string[];
  estimatedDistance?: number;
  estimatedDuration?: number;
  requiresSignature?: boolean;
  requiresId?: boolean;
  specialInstructions?: string;
  isFavorite?: boolean;

  cancelReason?: string;
  notes?: string;
  tags?: string[];
}

// Interface pour les filtres de recherche d'annonces
export interface AnnouncementFilters {
  type?: AnnouncementType;
  status?: AnnouncementStatus;
  priority?: AnnouncementPriority;
  clientId?: string;
  delivererId?: string;
  fromDate?: Date;
  toDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  keyword?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // Nouveaux filtres
  maxDistance?: number;
  nearbyAddress?: string;
  nearbyLatitude?: number;
  nearbyLongitude?: number;
  radiusKm?: number;
  requiresSignature?: boolean;
  requiresId?: boolean;
  hasPhotos?: boolean;
  isFavorite?: boolean;
}

// Interface pour une candidature sur une annonce
export interface DeliveryApplication {
  id: string;
  announcementId: string;
  announcement?: Announcement;
  delivererId: string;
  deliverer?: User;
  proposedPrice?: number;
  message?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  // Nouveaux champs
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  isPreferred: boolean;
  notes?: string;
}

// Interface pour la création d'une candidature
export interface CreateDeliveryApplicationInput {
  announcementId: string;
  proposedPrice?: number;
  message?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  notes?: string;
}

// Interface pour la mise à jour d'une candidature
export interface UpdateDeliveryApplicationInput {
  id: string;
  proposedPrice?: number;
  message?: string;
  status?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  isPreferred?: boolean;
  notes?: string;
}

// Interface pour la géolocalisation
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
}

// Interface pour la recherche géographique
export interface GeoSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
  offset?: number;
}
