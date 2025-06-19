export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface Provider {
  id: string;
  name: string;
  image?: string | null;
  averageRating?: number;
  totalReviews?: number;
  city?: string;
  address?: string;
  email?: string;
  phone?: string;
  postalCode?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
  categoryId: string;
  providerId: string;
  category: ServiceCategory;
  provider: Provider;
  _count?: {
    bookings: number;
    reviews: number;
  };
}

export interface ServiceSearchFilters {
  query?: string;
  categoryId?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  available?: boolean;
  page?: number;
  limit?: number;
}

export interface ServiceSearchResult {
  services: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingData {
  serviceId: string;
  providerId: string;
  date: string;
  startTime: string;
  notes?: string;
}

export interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  service?: {
    id: string;
    name: string;
    price: number;
  };
  provider?: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface Review {
  id: string;
  clientId: string;
  serviceId: string;
  providerId: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  client?: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface ServiceCardProps {
  service: Service;
  onBook?: (service: Service) => void;
  onViewDetails?: (service: Service) => void;
}

export interface ServiceSearchFormData {
  keywords?: string;
  categoryId?: string;
  location?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  rating?: number;
}

export interface ServiceListProps {
  className?: string;
  maxItems?: number;
}