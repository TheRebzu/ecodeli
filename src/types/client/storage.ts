// Types unifiés pour le système de stockage client
export interface StorageBox {
  id: string;
  code: string;
  size: "small" | "medium" | "large" | "xl";
  status: "available" | "reserved" | "occupied" | "maintenance" | "out_of_order";
  pricing: {
    hourlyRate: number;
    dailyRate: number;
    weeklyRate: number;
    monthlyRate: number;
    currency: string;
  };
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: "cm" | "m";
  };
  features: {
    climate_controlled: boolean;
    secured: boolean;
    accessible_24_7: boolean;
    insurance_included: boolean;
    fragile_items_allowed: boolean;
  };
  location: {
    warehouseId: string;
    warehouseName: string;
    floor: number;
    section: string;
    address: string;
    city: string;
    postalCode: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    distance?: number; // Distance from user location in km
  };
  availability: {
    nextAvailable: Date | null;
    isAvailableNow: boolean;
    reservedUntil?: Date;
  };
  reservationCount: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StorageReservation {
  id: string;
  boxId: string;
  box: StorageBox;
  userId: string;
  status: "active" | "expired" | "cancelled" | "pending" | "completed";
  startDate: Date;
  endDate: Date;
  totalCost: number;
  currency: string;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: "card" | "wallet" | "transfer";
  accessCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  usageHistory: StorageUsageRecord[];
}

export interface StorageUsageRecord {
  id: string;
  reservationId: string;
  action: "access" | "lock" | "extend" | "modify" | "view";
  timestamp: Date;
  details?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface StorageSearchFilters {
  size?: StorageBox["size"][];
  maxPrice?: number;
  priceType?: "hourly" | "daily" | "weekly" | "monthly";
  location?: {
    city?: string;
    maxDistance?: number;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  features?: {
    climate_controlled?: boolean;
    secured?: boolean;
    accessible_24_7?: boolean;
    insurance_included?: boolean;
    fragile_items_allowed?: boolean;
  };
  availability?: {
    startDate?: Date;
    endDate?: Date;
    immediateOnly?: boolean;
  };
  sortBy?: "price" | "distance" | "size" | "rating" | "availability";
  sortOrder?: "asc" | "desc";
}

export interface StorageSearchResult {
  boxes: StorageBox[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  filters: {
    availableSizes: StorageBox["size"][];
    priceRange: {
      min: number;
      max: number;
    };
    availableFeatures: Array<keyof StorageBox["features"]>;
    cities: string[];
  };
}

export interface CreateReservationData {
  boxId: string;
  startDate: Date;
  endDate: Date;
  paymentMethod: "card" | "wallet" | "transfer";
  notes?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}

export interface ExtendReservationData {
  reservationId: string;
  newEndDate: Date;
  paymentMethod?: "card" | "wallet" | "transfer";
}

export interface StorageStats {
  activeReservations: number;
  totalSpentThisMonth: number;
  totalUsageHours: number;
  favoriteWarehouse?: string;
  recentActivity: StorageUsageRecord[];
}

export interface WarehouseInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  contact: {
    phone: string;
    email: string;
  };
  operatingHours: {
    monday: { open: string; close: string; is24h: boolean };
    tuesday: { open: string; close: string; is24h: boolean };
    wednesday: { open: string; close: string; is24h: boolean };
    thursday: { open: string; close: string; is24h: boolean };
    friday: { open: string; close: string; is24h: boolean };
    saturday: { open: string; close: string; is24h: boolean };
    sunday: { open: string; close: string; is24h: boolean };
  };
  features: {
    security_cameras: boolean;
    security_guard: boolean;
    climate_control: boolean;
    elevator_access: boolean;
    parking_available: boolean;
    loading_dock: boolean;
  };
  totalBoxes: number;
  availableBoxes: number;
  rating: number;
  reviewCount: number;
}

// Helpers pour le formatage
export function formatStoragePrice(
  price: number,
  currency: string,
  priceType: "hourly" | "daily" | "weekly" | "monthly"
): string {
  const formattedPrice = price.toLocaleString("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  });

  const typeLabels = {
    hourly: "/h",
    daily: "/jour",
    weekly: "/semaine",
    monthly: "/mois",
  };

  return `${formattedPrice}${typeLabels[priceType]}`;
}

export function getBoxSizeLabel(size: StorageBox["size"]): string {
  const sizeLabels = {
    small: "Petit",
    medium: "Moyen",
    large: "Grand", 
    xl: "Très grand",
  };
  return sizeLabels[size];
}

export function getReservationStatusLabel(status: StorageReservation["status"]): string {
  const statusLabels = {
    active: "Active",
    expired: "Expirée",
    cancelled: "Annulée",
    pending: "En attente",
    completed: "Terminée",
  };
  return statusLabels[status];
}

export function getReservationStatusColor(status: StorageReservation["status"]): string {
  const statusColors = {
    active: "text-green-600 bg-green-100",
    expired: "text-red-600 bg-red-100",
    cancelled: "text-gray-600 bg-gray-100",
    pending: "text-yellow-600 bg-yellow-100",
    completed: "text-blue-600 bg-blue-100",
  };
  return statusColors[status];
}

export function getBoxStatusLabel(status: StorageBox["status"]): string {
  const statusLabels = {
    available: "Disponible",
    reserved: "Réservé",
    occupied: "Occupé",
    maintenance: "Maintenance",
    out_of_order: "Hors service",
  };
  return statusLabels[status];
}

export function getBoxStatusColor(status: StorageBox["status"]): string {
  const statusColors = {
    available: "text-green-600 bg-green-100",
    reserved: "text-yellow-600 bg-yellow-100",
    occupied: "text-blue-600 bg-blue-100",
    maintenance: "text-orange-600 bg-orange-100",
    out_of_order: "text-red-600 bg-red-100",
  };
  return statusColors[status];
}

export function calculateBoxVolume(dimensions: StorageBox["dimensions"]): number {
  const { width, height, depth, unit } = dimensions;
  const volume = width * height * depth;
  
  // Convert to cubic meters if needed
  if (unit === "cm") {
    return volume / 1000000; // cm³ to m³
  }
  return volume; // Already in m³
}

export function formatBoxDimensions(dimensions: StorageBox["dimensions"]): string {
  const { width, height, depth, unit } = dimensions;
  return `${width} × ${height} × ${depth} ${unit}`;
}

export function isBoxAvailable(box: StorageBox): boolean {
  return box.status === "available" && box.availability.isAvailableNow;
}

export function calculateDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (to.lat - from.lat) * Math.PI / 180;
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export function getOptimalPricing(
  box: StorageBox,
  duration: { start: Date; end: Date }
): {
  priceType: "hourly" | "daily" | "weekly" | "monthly";
  totalCost: number;
  savings?: number;
} {
  const diffInMs = duration.end.getTime() - duration.start.getTime();
  const hours = diffInMs / (1000 * 60 * 60);
  const days = hours / 24;
  const weeks = days / 7;
  const months = days / 30;

  const options = [
    { type: "hourly" as const, cost: hours * box.pricing.hourlyRate, duration: hours },
    { type: "daily" as const, cost: Math.ceil(days) * box.pricing.dailyRate, duration: days },
    { type: "weekly" as const, cost: Math.ceil(weeks) * box.pricing.weeklyRate, duration: weeks },
    { type: "monthly" as const, cost: Math.ceil(months) * box.pricing.monthlyRate, duration: months },
  ].filter(option => option.duration >= 1);

  const optimal = options.reduce((min, option) => 
    option.cost < min.cost ? option : min
  );

  const hourlyCost = hours * box.pricing.hourlyRate;
  const savings = optimal.type !== "hourly" ? hourlyCost - optimal.cost : undefined;

  return {
    priceType: optimal.type,
    totalCost: optimal.cost,
    savings: savings && savings > 0 ? savings : undefined,
  };
}