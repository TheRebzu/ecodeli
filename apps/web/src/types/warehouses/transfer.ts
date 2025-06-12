// Types pour les transferts entre entrepôts
export interface WarehouseTransfer {
  id: string;
  clientId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: TransferItem[];
  type: TransferType;
  scheduledDate: Date;
  status: TransferStatus;
  cost: TransferCost;
  logistics: TransferLogistics;
  tracking: TransferTracking;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferItem {
  inventoryItemId: string;
  quantity: number;
  condition: ItemCondition;
  specialHandling?: string[];
  notes?: string;
}

export type ItemCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED';

export type TransferType = 
  | 'CLIENT_REQUESTED'
  | 'WAREHOUSE_CONSOLIDATION'
  | 'MAINTENANCE_MOVE'
  | 'CAPACITY_BALANCING'
  | 'EMERGENCY_RELOCATION';

export type TransferStatus = 
  | 'REQUESTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export interface TransferCost {
  transport: number;
  handling: number;
  insurance?: number;
  urgencyFee?: number;
  total: number;
  currency: string;
  billingTo: 'CLIENT' | 'WAREHOUSE' | 'SYSTEM';
}

export interface TransferLogistics {
  carrier: string;
  vehicle: string;
  driver: DriverInfo;
  route: TransferRoute;
  estimatedDuration: number; // minutes
  specialRequirements: string[];
}

export interface DriverInfo {
  name: string;
  phone: string;
  vehicleRegistration: string;
  certifications: string[];
}

export interface TransferRoute {
  origin: LocationPoint;
  destination: LocationPoint;
  waypoints: LocationPoint[];
  distance: number; // km
  estimatedTime: number; // minutes
}

export interface LocationPoint {
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  instructions?: string;
}

export interface TransferTracking {
  currentLocation?: LocationPoint;
  progress: number; // pourcentage
  milestones: TransferMilestone[];
  estimatedArrival: Date;
  updates: TrackingUpdate[];
}

export interface TransferMilestone {
  type: 'PICKUP' | 'CHECKPOINT' | 'DELIVERY';
  location: string;
  scheduledTime: Date;
  actualTime?: Date;
  status: 'PENDING' | 'COMPLETED' | 'DELAYED';
}

export interface TrackingUpdate {
  timestamp: Date;
  location: LocationPoint;
  message: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
}