/**
 * Types pour les annonces
 */

export enum PackageType {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM", 
  LARGE = "LARGE",
  EXTRA_LARGE = "EXTRA_LARGE",
  CUSTOM = "CUSTOM"
}

export enum AnnouncementStatus {
  DRAFT = "DRAFT",            // Brouillon
  PENDING = "PENDING",        // En attente de validation
  PUBLISHED = "PUBLISHED",    // Publiée et visible
  ASSIGNED = "ASSIGNED",      // Assignée à un livreur
  IN_PROGRESS = "IN_PROGRESS", // En cours de livraison
  DELIVERED = "DELIVERED",    // Livrée
  COMPLETED = "COMPLETED",    // Complétée et confirmée
  CANCELLED = "CANCELLED",    // Annulée
  REJECTED = "REJECTED",      // Rejetée
  EXPIRED = "EXPIRED",        // Expirée
  DELETED = "DELETED"         // Supprimée
}

export enum InsuranceOption {
  NONE = "NONE",
  BASIC = "BASIC",
  PREMIUM = "PREMIUM"
}

export enum BidStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED"
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: Coordinates;
}

export interface PackageDetails {
  packageType: PackageType;
  weight: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  requiresRefrigeration: boolean;
}

// Type simplifié pour éviter une dépendance circulaire
export interface UserBrief {
  id: string;
  name: string;
  image?: string;
  rating?: number;
}

export interface Bid {
  id: string;
  price: number;
  message?: string;
  status: BidStatus;
  announcementId: string;
  courierId: string;
  courier: UserBrief;
  createdAt: Date;
  updatedAt: Date;
}

export interface Announcement {
  id: string;
  
  // Informations générales
  title: string;
  description: string;
  
  // Informations sur le paquet
  packageType: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  requiresRefrigeration: boolean;
  
  // Adresse de ramassage
  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupCoordinates?: Coordinates;
  
  // Adresse de livraison
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryCoordinates?: Coordinates;
  
  // Informations temporelles
  pickupDate: Date;
  deliveryDeadline: Date;
  
  // Informations sur le prix
  price: number;
  isNegotiable: boolean;
  
  // Assurance
  insuranceOption: string;
  insuranceAmount?: number;
  
  // Images du colis
  packageImages?: string[];
  
  // État de l'annonce
  status: AnnouncementStatus;
  
  // Relations
  customerId: string;
  customer?: UserBrief;
  
  deliveryPersonId?: string;
  deliveryPerson?: UserBrief;
  
  bids?: Bid[];
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateAnnouncementParams {
  title: string;
  description: string;
  packageType: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  requiresRefrigeration: boolean;
  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupCoordinates?: Coordinates;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryCoordinates?: Coordinates;
  pickupDate: string | Date;
  deliveryDeadline: string | Date;
  price: number;
  isNegotiable: boolean;
  insuranceOption: string;
  insuranceAmount?: number;
  packageImages?: string[];
}

export interface UpdateAnnouncementParams extends Partial<CreateAnnouncementParams> {
  id: string;
}

export interface CreateBidParams {
  announcementId: string;
  price: number;
  message?: string;
}

export interface UpdateBidParams {
  id: string;
  price?: number;
  message?: string;
  status?: BidStatus;
}

export type AnnouncementType = 
  | 'DELIVERY'        // Livraison standard
  | 'FOREIGN_PURCHASE' // Achat à l'étranger
  | 'SPECIAL_DELIVERY' // Livraison spéciale
  | 'SERVICE';        // Service (non livraison)

export type PackageSize = 
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'EXTRA_LARGE';

export type AnnouncementFilter = {
  status?: AnnouncementStatus | 'ALL';
  type?: AnnouncementType | 'ALL';
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'pickupDate';
  sortDirection?: 'asc' | 'desc';
};

export type AnnouncementFilterParams = {
  status?: AnnouncementStatus;
  search?: string;
  limit?: number;
  offset?: number;
  fromDate?: Date;
  toDate?: Date;
}; 