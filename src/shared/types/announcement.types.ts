import { z } from "zod";
import { User } from "./user.types";

export enum PackageType {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM", 
  LARGE = "LARGE",
  EXTRA_LARGE = "EXTRA_LARGE",
  CUSTOM = "CUSTOM"
}

export enum AnnouncementStatus {
  PENDING = "PENDING",
  PUBLISHED = "PUBLISHED",
  ASSIGNED = "ASSIGNED",
  IN_TRANSIT = "IN_TRANSIT",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED"
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

export interface Bid {
  id: string;
  price: number;
  message?: string;
  status: BidStatus;
  announcementId: string;
  courierId: string;
  courier: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Announcement {
  id: string;
  
  // Informations générales
  title: string;
  description?: string;
  
  // Informations sur le paquet
  packageType: PackageType;
  weight: number;
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
  pickupCoordinates: Coordinates;
  
  // Adresse de livraison
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryCoordinates: Coordinates;
  
  // Informations temporelles
  pickupDate: Date;
  deliveryDeadline: Date;
  
  // Informations sur le prix
  price: number;
  isNegotiable: boolean;
  
  // Assurance
  insuranceOption: InsuranceOption;
  insuranceAmount?: number;
  
  // Images du colis
  packageImages: string[];
  
  // État de l'annonce
  status: AnnouncementStatus;
  
  // Relations
  customerId: string;
  customer?: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  
  deliveryPersonId?: string;
  deliveryPerson?: {
    id: string;
    name: string;
    image?: string;
    rating?: number;
  };
  
  bids?: Bid[];
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CreateAnnouncementParams {
  title: string;
  description?: string;
  
  // Package details
  packageType: PackageType;
  weight: number;
  width?: number;
  height?: number;
  length?: number;
  isFragile: boolean;
  requiresRefrigeration: boolean;
  
  // Pickup location
  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupCoordinates: Coordinates;
  
  // Delivery location
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryCoordinates: Coordinates;
  
  // Times
  pickupDate: Date;
  deliveryDeadline: Date;
  
  // Pricing and options
  price: number;
  isNegotiable: boolean;
  insuranceOption: InsuranceOption;
  insuranceAmount?: number;
  
  // Media
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