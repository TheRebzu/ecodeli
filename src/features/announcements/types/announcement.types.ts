import { 
  AnnouncementType, 
  AnnouncementStatus, 
  Location, 
  PackageDetails, 
  ServiceDetails,
  CartDropDetails 
} from '../schemas/announcement.schema'

// Type de base pour une annonce complète depuis la BDD
export interface Announcement {
  id: string
  clientId?: string
  merchantId?: string
  type: AnnouncementType
  title: string
  description: string
  startLocation: Location
  endLocation: Location
  desiredDate: Date
  flexibleDates: boolean
  dateRangeStart?: Date
  dateRangeEnd?: Date
  price: number
  currency: string
  status: AnnouncementStatus
  viewCount: number
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  urgent: boolean
  specialInstructions?: string

  // Relations optionnelles
  client?: {
    id: string
    profile?: {
      firstName?: string
      lastName?: string
      avatar?: string
    }
  }
  merchant?: {
    id: string
    profile?: {
      firstName?: string
      lastName?: string
      businessName?: string
      avatar?: string
    }
  }
  packageDetails?: PackageDetails & {
    id: string
    announcementId: string
  }
  serviceDetails?: ServiceDetails & {
    id: string
    announcementId: string
  }
  cartDropDetails?: CartDropDetails & {
    id: string
    announcementId: string
  }
  delivery?: {
    id: string
    status: string
    trackingNumber: string
    deliverer?: {
      id: string
      profile?: {
        firstName?: string
        lastName?: string
        avatar?: string
      }
    }
  }
  routeMatches?: RouteMatch[]
}

// Type pour les correspondances de trajets
export interface RouteMatch {
  id: string
  routeId: string
  announcementId: string
  matchScore: number
  isNotified: boolean
  notifiedAt?: Date
  createdAt: Date
  route?: {
    id: string
    delivererId: string
    startLocation: Location
    endLocation: Location
    departureTime: Date
    deliverer?: {
      id: string
      profile?: {
        firstName?: string
        lastName?: string
        avatar?: string
      }
    }
  }
}

// Type pour la réponse API paginée
export interface PaginatedAnnouncementsResponse {
  announcements: Announcement[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters?: {
    type?: AnnouncementType
    status?: AnnouncementStatus
    city?: string
    priceRange?: {
      min: number
      max: number
    }
  }
}

// Type pour les statistiques d'annonces
export interface AnnouncementStats {
  total: number
  byStatus: Record<AnnouncementStatus, number>
  byType: Record<AnnouncementType, number>
  totalValue: number
  averagePrice: number
  todayCount: number
  weekCount: number
  monthCount: number
}

// Type pour les limites d'abonnement
export interface SubscriptionLimits {
  plan: 'FREE' | 'STARTER' | 'PREMIUM'
  monthlyLimit: number | null // null = illimité
  currentCount: number
  remainingCount: number | null
  resetDate: Date
  canCreateAnnouncement: boolean
  upgradeRequired: boolean
}

// Type pour les détails complets d'une annonce avec toutes ses relations
export interface AnnouncementWithDetails extends Announcement {
  // Détails de matching
  matchingRoutes: Array<{
    routeId: string
    delivererId: string
    matchScore: number
    distance: number
    estimatedDuration: number
    deliverer: {
      id: string
      rating: number
      completedDeliveries: number
      profile: {
        firstName: string
        lastName: string
        avatar?: string
      }
    }
  }>
  
  // Historique
  viewHistory: Array<{
    viewedAt: Date
    viewerId: string
    viewerRole: string
  }>
  
  // Interactions
  interestedDeliverers: Array<{
    delivererId: string
    interestedAt: Date
    message?: string
  }>
  
  // Métriques
  metrics: {
    totalViews: number
    uniqueViews: number
    matchingRoutes: number
    interestedCount: number
    averageMatchScore: number
  }
}

// Type pour les notifications de matching
export interface MatchingNotification {
  announcementId: string
  delivererId: string
  matchScore: number
  estimatedDistance: number
  estimatedDuration: number
  notificationSent: boolean
  notificationData: {
    title: string
    message: string
    actionUrl: string
    priority: 'low' | 'medium' | 'high'
  }
}

// Type pour les filtres avancés de recherche
export interface AdvancedSearchFilters {
  // Géographique
  location?: {
    center: {
      lat: number
      lng: number
    }
    radius: number // en km
  }
  
  // Prix
  priceRange?: {
    min: number
    max: number
  }
  
  // Dates
  dateRange?: {
    from: Date
    to: Date
  }
  
  // Critères spécifiques
  urgent?: boolean
  flexibleDates?: boolean
  insurance?: boolean
  recurring?: boolean
  
  // Évaluations
  minClientRating?: number
  
  // Capacités (pour livreurs)
  maxWeight?: number
  maxVolume?: number
  vehicleType?: string[]
}

// Type pour l'algorithme de matching
export interface MatchingCriteria {
  // Poids des critères (total = 100%)
  distanceWeight: number      // 40%
  timingWeight: number        // 30%
  serviceTypeWeight: number   // 20%
  capacityWeight: number      // 10%
  
  // Seuils
  maxDistance: number         // km
  maxTimeDifference: number   // heures
  minMatchScore: number       // 0-100
  
  // Préférences
  preferRecurringRoutes: boolean
  preferHighRatedDeliverers: boolean
  prioritizeUrgent: boolean
}

// Type pour les événements d'annonce
export interface AnnouncementEvent {
  id: string
  announcementId: string
  type: 'CREATED' | 'UPDATED' | 'MATCHED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED'
  actorId: string
  actorRole: 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'
  timestamp: Date
  data?: Record<string, any>
  description: string
}

// Type pour les erreurs de validation spécifiques
export interface AnnouncementValidationError {
  field: string
  code: string
  message: string
  value?: any
  suggestion?: string
}

// Type pour l'API response standard
export interface AnnouncementApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: AnnouncementValidationError[]
  }
  meta?: {
    requestId: string
    timestamp: Date
    executionTime: number
  }
} 