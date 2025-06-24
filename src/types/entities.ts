// Types des entités métier EcoDeli basés sur Prisma
import type { User, Profile, ClientProfile, DelivererProfile, MerchantProfile, ProviderProfile, Announcement, Delivery, Payment, Wallet, Document, Notification, Message, Review } from "@prisma/client"

// Types de rôles et statuts
export type UserRole = "CLIENT" | "DELIVERER" | "MERCHANT" | "PROVIDER" | "ADMIN"
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "INACTIVE"
export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"

export type AnnouncementType = "PACKAGE" | "SERVICE_TRANSPORT" | "SERVICE_SHOPPING" | "SERVICE_PET_CARE" | "SERVICE_HOME"
export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "MATCHED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export type DeliveryStatus = "PENDING" | "ACCEPTED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED" | "ISSUE"
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED"
export type BookingStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export type DocumentType = "IDENTITY_CARD" | "DRIVER_LICENSE" | "VEHICLE_REGISTRATION" | "INSURANCE" | "PROOF_OF_ADDRESS" | "CERTIFICATION" | "CONTRACT"
export type SubscriptionPlan = "FREE" | "STARTER" | "PREMIUM"
export type NotificationType = "ANNOUNCEMENT_MATCH" | "DELIVERY_UPDATE" | "PAYMENT_RECEIVED" | "BOOKING_CONFIRMED" | "DOCUMENT_VALIDATED" | "SYSTEM_MESSAGE"

// Utilisateur avec profil complet
export interface UserWithProfile extends User {
  profile?: Profile
  clientProfile?: ClientProfile
  delivererProfile?: DelivererProfile
  merchantProfile?: MerchantProfile
  providerProfile?: ProviderProfile
  wallet?: Wallet
}

// Annonce avec détails complets
export interface AnnouncementWithDetails extends Announcement {
  user: UserWithProfile
  pickupAddress?: {
    id: string
    street: string
    city: string
    postalCode: string
    country: string
    latitude?: number
    longitude?: number
  }
  deliveryAddress?: {
    id: string
    street: string
    city: string
    postalCode: string
    country: string
    latitude?: number
    longitude?: number
  }
  applications?: {
    id: string
    delivererId: string
    proposedPrice?: number
    message?: string
    status: string
    createdAt: Date
    deliverer: UserWithProfile
  }[]
  delivery?: DeliveryWithDetails
}

// Livraison avec détails complets
export interface DeliveryWithDetails extends Delivery {
  announcement: AnnouncementWithDetails
  deliverer: UserWithProfile
  client: UserWithProfile
  trackingEvents: {
    id: string
    event: string
    description?: string
    latitude?: number
    longitude?: number
    createdAt: Date
  }[]
}

// Document avec détails
export interface DocumentWithDetails extends Document {
  user: {
    id: string
    firstName?: string
    lastName?: string
    email: string
    role: UserRole
  }
}

// Réservation avec détails
export interface BookingWithDetails {
  id: string
  clientId: string
  providerId: string
  serviceId?: string
  status: BookingStatus
  scheduledDate: Date
  duration: number
  location?: string
  notes?: string
  hourlyRate: number
  totalAmount: number
  createdAt: Date
  confirmedAt?: Date
  completedAt?: Date
  
  client: UserWithProfile
  provider: UserWithProfile
  service?: {
    id: string
    name: string
    description: string
    category: string
    hourlyRate: number
  }
}

// Box de stockage avec détails
export interface BoxWithDetails {
  id: string
  warehouseId: string
  number: string
  size: string
  pricePerDay: number
  isAvailable: boolean
  
  warehouse: {
    id: string
    name: string
    address: string
    city: string
    latitude: number
    longitude: number
  }
  
  reservations: {
    id: string
    userId: string
    startDate: Date
    endDate: Date
    totalPrice: number
    status: string
    user: {
      id: string
      firstName?: string
      lastName?: string
      email: string
    }
  }[]
}

// Statistiques pour les dashboards
export interface ClientStats {
  totalAnnouncements: number
  activeDeliveries: number
  completedDeliveries: number
  totalSpent: number
  nextBooking?: Date
}

export interface DelivererStats {
  totalDeliveries: number
  activeDeliveries: number
  totalEarnings: number
  averageRating?: number
  availableAnnouncements: number
}

export interface MerchantStats {
  totalOrders: number
  activeOrders: number
  totalRevenue: number
  averageOrderValue: number
  topProducts: {
    name: string
    quantity: number
  }[]
}

export interface ProviderStats {
  totalInterventions: number
  upcomingBookings: number
  totalEarnings: number
  averageRating?: number
  busyDays: Date[]
}

export interface AdminStats {
  totalUsers: number
  activeUsers: number
  pendingVerifications: number
  totalDeliveries: number
  totalRevenue: number
  platformGrowth: {
    period: string
    users: number
    deliveries: number
    revenue: number
  }[]
}

// Types pour les formulaires
export interface CreateAnnouncementForm {
  type: AnnouncementType
  title: string
  description: string
  pickupAddress: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  deliveryAddress: {
    street: string
    city: string
    postalCode: string
    country: string
  }
  proposedPrice?: number
  pickupDate?: Date
  deliveryDate?: Date
  packageWeight?: number
  packageDimensions?: string
  serviceDetails?: any
}

export interface CreateBookingForm {
  providerId: string
  serviceId?: string
  scheduledDate: Date
  duration: number
  location?: string
  notes?: string
}

export interface UpdateProfileForm {
  firstName?: string
  lastName?: string
  phone?: string
  bio?: string
  avatar?: string
  emailNotifications?: boolean
  pushNotifications?: boolean
  smsNotifications?: boolean
}

// Types pour les filtres et recherches
export interface AnnouncementFilters {
  type?: AnnouncementType[]
  status?: AnnouncementStatus[]
  city?: string
  priceMin?: number
  priceMax?: number
  dateFrom?: Date
  dateTo?: Date
}

export interface DeliveryFilters {
  status?: DeliveryStatus[]
  city?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface UserFilters {
  role?: UserRole[]
  status?: UserStatus[]
  verificationStatus?: VerificationStatus[]
  city?: string
  registeredFrom?: Date
  registeredTo?: Date
}

// Types pour les événements temps réel
export interface RealtimeEvent {
  type: "delivery_update" | "new_announcement" | "booking_confirmed" | "payment_received" | "message_received"
  userId: string
  data: any
  timestamp: Date
}

export interface DeliveryLocationUpdate {
  deliveryId: string
  latitude: number
  longitude: number
  timestamp: Date
  speed?: number
  heading?: number
}