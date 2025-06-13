import { Box, Reservation } from "@prisma/client";

// Type représentant un entrepôt
export type Warehouse = {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  contactPhone?: string;
  contactEmail?: string;
  openingHours?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
};

// Type représentant une box avec son entrepôt
export type BoxWithWarehouse = Box & {
  warehouse: Warehouse;
  features?: string[];
  pricePerDay?: number;
};

// Type représentant une réservation avec sa box et son entrepôt
export type ReservationWithBoxAndWarehouse = Reservation & {
  box: BoxWithWarehouse;
};

// Type pour l'historique d'utilisation des box
export type BoxUsageHistory = {
  id: string;
  boxId: string;
  reservationId?: string | null;
  clientId: string;
  actionType: BoxActionType;
  actionTime: Date;
  details?: string | null;
  ipAddress?: string | null;
  deviceInfo?: string | null;
};

// Type pour les abonnements aux notifications de disponibilité
export type BoxAvailabilitySubscription = {
  id: string;
  clientId: string;
  warehouseId?: string;
  startDate: Date;
  endDate: Date;
  minSize?: number;
  maxSize?: number;
  boxType?: string;
  features?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  location?: string;
  radius?: number;
};

// Type pour les actions sur les box
export enum BoxActionType {
  ACCESS = "ACCESS",
  DEPARTURE = "DEPARTURE",
  MAINTENANCE = "MAINTENANCE",
  OTHER = "OTHER",
}

// Type pour l'historique d'utilisation d'une box
export interface BoxUsageHistoryRecord {
  id: string;
  reservationId: string;
  actionType: BoxActionType;
  timestamp: Date;
  performedBy?: string;
  notes?: string;
}
