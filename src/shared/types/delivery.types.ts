import { PackageSize, DeliveryType, DeliveryStatus } from "@/lib/validations/delivery";
import { User } from "./user.types";

export interface Delivery {
  id: string;
  userId: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: PackageSize;
  deliveryType: DeliveryType;
  scheduledDate: Date;
  status: DeliveryStatus;
  trackingNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  fragile: boolean;
  requireSignature: boolean;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  price: number;
  driverId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  driver?: User;
  trackingEvents?: TrackingEvent[];
  insurance?: Insurance;
}

export interface TrackingEvent {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  location?: string;
  description: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRate {
  id: string;
  packageSize: PackageSize;
  deliveryType: DeliveryType;
  basePrice: number;
  distancePrice: number;
  fragilePrice: number;
  expressPrice: number;
  signaturePrice: number;
  totalPrice: number;
  estimatedDeliveryTime: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRequest {
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: PackageSize;
  deliveryType: DeliveryType;
  scheduledDate: Date;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string;
  fragile: boolean;
  requireSignature: boolean;
  notes?: string;
}

export interface DeliveryResponse {
  delivery: Delivery;
  trackingNumber: string;
  price: number;
  estimatedDeliveryDate: Date;
}

export interface DeliveryUpdateRequest {
  id: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  packageSize?: PackageSize;
  deliveryType?: DeliveryType;
  scheduledDate?: Date;
  recipientName?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  status?: DeliveryStatus;
  notes?: string;
}

export interface DeliveryRateRequest {
  pickupAddress: string;
  deliveryAddress: string;
  packageSize: PackageSize;
  deliveryType: DeliveryType;
  scheduledDate?: Date;
  fragile?: boolean;
  requireSignature?: boolean;
}

export interface DeliveryRateResponse {
  rate: DeliveryRate;
  distance: number; // in kilometers
  estimatedDeliveryDate: Date;
}

export interface DeliveryTrackingResponse {
  delivery: Delivery;
  events: TrackingEvent[];
  currentStatus: DeliveryStatus;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  nextExpectedEvent?: {
    status: DeliveryStatus;
    estimatedTime?: Date;
  };
}

export interface Insurance {
  id: string;
  deliveryId: string;
  userId: string;
  type: string;
  coverageAmount: number;
  premium: number;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
} 