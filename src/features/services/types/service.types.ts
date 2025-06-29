export interface ServiceRequest {
  id: string
  title: string
  description: string
  serviceType: string
  status: 'DRAFT' | 'ACTIVE' | 'BOOKED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  budget: number
  estimatedDuration: number
  scheduledAt: string
  isRecurring: boolean
  frequency?: string
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  location?: {
    address: string
    city: string
    postalCode: string
    latitude?: number
    longitude?: number
  }
  createdAt: string
  updatedAt: string
  clientId: string
  providerId?: string
  bookingId?: string
  client?: {
    id: string
    profile: {
      firstName: string
      lastName: string
      avatar?: string
    }
  }
  provider?: {
    id: string
    profile: {
      firstName: string
      lastName: string
      avatar?: string
    }
    rating?: number
  }
  _count?: {
    applications: number
    reviews: number
    attachments: number
  }
}

export interface ServiceApplication {
  id: string
  serviceRequestId: string
  providerId: string
  message: string
  proposedPrice: number
  estimatedDuration: number
  availableAt: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  provider: {
    id: string
    profile: {
      firstName: string
      lastName: string
      avatar?: string
    }
    rating?: number
    completedServices: number
  }
}

export interface ServiceReview {
  id: string
  serviceRequestId: string
  clientId: string
  providerId: string
  rating: number
  comment?: string
  createdAt: string
  client: {
    profile: {
      firstName: string
      lastName: string
    }
  }
}

export interface ServiceBooking {
  id: string
  serviceRequestId: string
  clientId: string
  providerId: string
  scheduledAt: string
  estimatedDuration: number
  finalPrice: number
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  createdAt: string
  updatedAt: string
  serviceRequest: ServiceRequest
  client: {
    profile: {
      firstName: string
      lastName: string
      phone?: string
    }
  }
  provider: {
    profile: {
      firstName: string
      lastName: string
      phone?: string
    }
  }
}

export interface ServiceStats {
  totalRequests: number
  activeRequests: number
  completedRequests: number
  totalSpent: number
  averageRating: number
}

export type ServiceType = 
  | 'HOME_CLEANING'
  | 'GARDENING'
  | 'HANDYMAN'
  | 'PET_SITTING'
  | 'PET_WALKING'
  | 'TUTORING'
  | 'BEAUTY_HOME'
  | 'ELDERLY_CARE'

export type ServiceStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'BOOKED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type ServiceUrgency = 
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'