import { Role, Status, DeliveryStatus } from "@prisma/client";

/**
 * Types pour les données chargées sur le dashboard
 */

export interface DashboardUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  status: Status;
}

export interface DashboardShipment {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: DeliveryStatus;
  price: number;
  origin: string;
  destination: string;
  estimatedDeliveryDate: Date | null;
  deliveredAt: Date | null;
  clientId: string;
  courierId: string | null;
  packageDetails?: {
    weight: number;
    dimensions: string;
  };
}

export interface DashboardNotification {
  id: string;
  createdAt: Date;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  actionLink?: string;
  actionText?: string;
}

export interface DashboardClient {
  id: string;
  userId: string;
  address: string;
  phone: string;
  shipments?: DashboardShipment[];
}

export interface DashboardMerchant {
  id: string;
  userId: string;
  storeName: string;
  storeAddress: string;
  phone: string;
  products?: {
    id: string;
    name: string;
    price: number;
    stock: number;
  }[];
}

export interface DashboardCourier {
  id: string;
  userId: string;
  vehicle: string;
  licenseNumber: string;
  availability: boolean;
  currentDeliveries?: DashboardShipment[];
  completedDeliveries?: DashboardShipment[];
}

export interface DashboardProvider {
  id: string;
  userId: string;
  companyName: string;
  services: string[];
  availability: boolean;
}

export interface DashboardData {
  user: DashboardUser | null;
  notifications: DashboardNotification[];
  shipments?: DashboardShipment[];
  clientData?: DashboardClient;
  merchantData?: DashboardMerchant;
  courierData?: DashboardCourier;
  providerData?: DashboardProvider;
}

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} 