// Types de base pour les services
export interface BaseService {
  id: string;
  title: string;
  description: string;
  category: ServiceCategory;
  subcategory?: string;
  providerId: string;
  price: number;
  currency: string;
  duration?: number;
  availability: ServiceAvailability;
  location: ServiceLocation;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceCategory = 
  | 'DELIVERY'
  | 'HOME_SERVICES'
  | 'TRANSPORT'
  | 'PERSONAL_SERVICES'
  | 'PROFESSIONAL'
  | 'HEALTH'
  | 'EDUCATION';

export type ServiceStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'DRAFT';

export interface ServiceAvailability {
  schedule: WeeklySchedule;
  timeZone: string;
  advanceBooking: number; // heures minimum avant réservation
  maxAdvanceBooking?: number; // heures maximum avant réservation
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  available: boolean;
  timeSlots: TimeSlot[];
}

export interface ServiceLocation {
  type: 'FIXED' | 'MOBILE' | 'ONLINE';
  address?: string;
  radius?: number; // km de déplacement pour services mobiles
  coordinates?: {
    lat: number;
    lng: number;
  };
}