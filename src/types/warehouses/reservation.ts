// Types pour les réservations d'entrepôts
export interface BoxReservation {
  id: string;
  clientId: string;
  warehouseId: string;
  boxId: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  price: ReservationPrice;
  services: AdditionalService[];
  accessCodes: AccessCode[];
  terms: ReservationTerms;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "COMPLETED";

export interface ReservationPrice {
  basePrice: number;
  additionalServices: number;
  taxes: number;
  discount?: number;
  total: number;
  currency: string;
  billingPeriod: "DAILY" | "WEEKLY" | "MONTHLY";
}

export interface AdditionalService {
  type: ServiceType;
  price: number;
  description: string;
  required: boolean;
}

export type ServiceType =
  | "INSURANCE"
  | "CLIMATE_CONTROL"
  | "SECURITY_MONITORING"
  | "PICKUP_DELIVERY"
  | "INVENTORY_MANAGEMENT"
  | "PHOTOGRAPHY";

export interface AccessCode {
  type: "ENTRY" | "BOX" | "ZONE";
  code: string;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usageCount: number;
}

export interface ReservationTerms {
  minimumPeriod: number; // jours
  maximumPeriod: number; // jours
  cancellationPolicy: CancellationPolicy;
  extensionPolicy: ExtensionPolicy;
  accessRules: AccessRule[];
}

export interface CancellationPolicy {
  allowed: boolean;
  freeUntil: number; // heures avant début
  penaltyRate: number; // pourcentage
  refundableAmount: number; // pourcentage
}

export interface ExtensionPolicy {
  allowed: boolean;
  maxExtensions: number;
  priceIncrease: number; // pourcentage
  approvalRequired: boolean;
}

export interface AccessRule {
  description: string;
  type: "RESTRICTION" | "REQUIREMENT" | "PERMISSION";
  value: string;
}
