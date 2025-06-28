/**
 * Types TypeScript pour le dashboard client EcoDeli
 * Alignés avec les schémas Prisma et les exigences Mission 1
 */

import { User, Client, Announcement, Booking, StorageBoxRental, Notification } from '@prisma/client'

export interface ClientDashboardData {
  client: Client & {
    user: User & {
      profile?: {
        firstName?: string
        lastName?: string
        phone?: string
        avatar?: string
        address?: string
        city?: string
        postalCode?: string
        country?: string
      } | null
    }
  }
  stats: ClientStats
  recentActivity: RecentActivity
  tutorial: TutorialStatus
  notifications: DashboardNotification[]
  quickActions: QuickAction[]
}

export interface ClientStats {
  totalAnnouncements: number
  activeDeliveries: number
  completedDeliveries: number
  totalSpent: number
  currentSubscription: SubscriptionPlan
  storageBoxesActive: number
  bookingsThisMonth: number
  averageRating: number | null
  walletBalance: number
  subscriptionSavings: number
}

export interface RecentActivity {
  announcements: AnnouncementSummary[]
  bookings: BookingSummary[]
  storageBoxes: StorageBoxSummary[]
  deliveries: DeliverySummary[]
}

export interface AnnouncementSummary {
  id: string
  title: string
  type: AnnouncementType
  status: AnnouncementStatus
  price: number
  pickupAddress: string
  deliveryAddress: string
  scheduledDate: Date
  createdAt: Date
  deliverer?: {
    id: string
    name: string
    rating: number | null
    phone?: string
  } | null
  trackingCode?: string
  estimatedDelivery?: Date
}

export interface BookingSummary {
  id: string
  serviceType: string
  provider: {
    id: string
    name: string
    rating: number | null
    avatar?: string
  }
  scheduledDate: Date
  duration: number
  totalPrice: number
  status: BookingStatus
  rating: number | null
  canRate: boolean
  address: string
  notes?: string
}

export interface StorageBoxSummary {
  id: string
  boxNumber: string
  size: StorageBoxSize
  warehouse: {
    name: string
    address: string
    city: string
    accessHours: string
  }
  startDate: Date
  endDate: Date
  monthlyPrice: number
  accessCode: string
  itemsCount: number
  lastAccess?: Date
  expiresInDays: number
}

export interface DeliverySummary {
  id: string
  announcementTitle: string
  status: DeliveryStatus
  deliverer: {
    name: string
    phone?: string
    vehicleInfo?: string
  }
  currentLocation?: {
    latitude: number
    longitude: number
    lastUpdate: Date
  }
  estimatedArrival?: Date
  validationCode: string
  trackingHistory: TrackingPoint[]
}

export interface TrackingPoint {
  id: string
  status: string
  location: string
  timestamp: Date
  notes?: string
}

export interface TutorialStatus {
  completed: boolean
  currentStep: number
  stepsCompleted: {
    welcome: boolean
    profile: boolean
    subscription: boolean
    firstAnnouncement: boolean
    completion: boolean
  }
  completedAt?: Date
  timeSpent: number
  skippedSteps: number[]
  isBlocking: boolean // Si le tutoriel bloque l'interface
}

export interface DashboardNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  actionUrl?: string
  createdAt: Date
  priority: 'low' | 'medium' | 'high'
  category: 'delivery' | 'booking' | 'payment' | 'storage' | 'system'
}

export interface QuickAction {
  id: string
  title: string
  description: string
  href: string
  icon: string
  available: boolean
  requiresSubscription?: SubscriptionPlan
  badge?: string
  color: string
}

// Enums alignés avec Prisma
export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PREMIUM'
export type AnnouncementType = 'DELIVERY' | 'TRANSPORT' | 'SERVICE'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type DeliveryStatus = 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
export type StorageBoxSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
export type NotificationType = 'DELIVERY_UPDATE' | 'BOOKING_REMINDER' | 'PAYMENT_SUCCESS' | 'STORAGE_EXPIRY' | 'PROMOTIONAL'

// Filtres et options
export interface DashboardFilters {
  period?: 'week' | 'month' | 'quarter' | 'year'
  status?: AnnouncementStatus[]
  type?: AnnouncementType[]
  showCompleted?: boolean
}

export interface DashboardPreferences {
  defaultView: 'grid' | 'list'
  showTutorialHints: boolean
  notificationSettings: {
    email: boolean
    push: boolean
    sms: boolean
  }
  language: 'fr' | 'en'
  currency: 'EUR'
  timezone: string
}