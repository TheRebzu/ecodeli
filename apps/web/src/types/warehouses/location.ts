// Types pour les emplacements d'entrepôts
export interface WarehouseLocation {
  id: string;
  name: string;
  address: Address;
  coordinates: Coordinates;
  type: WarehouseType;
  zones: StorageZone[];
  facilities: Facility[];
  operatingHours: OperatingHours;
  contactInfo: ContactInfo;
  status: LocationStatus;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export type WarehouseType = 
  | 'URBAN'
  | 'SUBURBAN'
  | 'INDUSTRIAL'
  | 'CLIMATE_CONTROLLED'
  | 'SECURE_STORAGE'
  | 'COLD_STORAGE';

export interface StorageZone {
  id: string;
  name: string;
  type: ZoneType;
  capacity: number;
  occupancy: number;
  conditions: StorageCondition[];
  accessLevel: 'PUBLIC' | 'RESTRICTED' | 'SECURE';
}

export type ZoneType = 
  | 'STANDARD'
  | 'CLIMATE_CONTROLLED'
  | 'HIGH_SECURITY'
  | 'OVERSIZE'
  | 'HAZARDOUS'
  | 'QUICK_ACCESS';

export interface Facility {
  type: FacilityType;
  available: boolean;
  description?: string;
}

export type FacilityType = 
  | 'LOADING_DOCK'
  | 'PARKING'
  | 'ELEVATOR'
  | 'SECURITY_SYSTEM'
  | 'FIRE_PROTECTION'
  | 'CLIMATE_CONTROL'
  | 'POWER_BACKUP';

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  holidays: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  breaks?: TimeSlot[];
  closed: boolean;
}

export interface ContactInfo {
  phone: string;
  email: string;
  manager: string;
  emergencyContact: string;
}

export type LocationStatus = 'ACTIVE' | 'MAINTENANCE' | 'CLOSED' | 'FULL';