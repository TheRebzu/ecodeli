import { z } from 'zod'

/**
 * Schémas de validation pour le dashboard client EcoDeli
 * Conforme aux exigences Mission 1 - Partie dédiée aux clients
 */

export const ClientDashboardStatsSchema = z.object({
  totalAnnouncements: z.number().min(0),
  activeDeliveries: z.number().min(0),
  completedDeliveries: z.number().min(0),
  totalSpent: z.number().min(0),
  currentSubscription: z.enum(['FREE', 'STARTER', 'PREMIUM']),
  storageBoxesActive: z.number().min(0),
  bookingsThisMonth: z.number().min(0),
  averageRating: z.number().min(0).max(5).nullable(),
  walletBalance: z.number().min(0),
  subscriptionSavings: z.number().min(0)
})

export const ClientAnnouncementSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(), // Allow any string for type
  status: z.string(), // Allow any string for status
  price: z.number().min(0), // Allow 0 for free services
  pickupAddress: z.string(),
  deliveryAddress: z.string(),
  scheduledDate: z.date(),
  createdAt: z.date(),
  deliverer: z.object({
    id: z.string(),
    name: z.string(),
    rating: z.number().min(0).max(5),
    phone: z.string().nullable()
  }).nullable(),
  trackingCode: z.string(),
  estimatedDelivery: z.date()
})

export const ClientBookingSummarySchema = z.object({
  id: z.string(),
  serviceType: z.string(),
  provider: z.object({
    id: z.string(),
    name: z.string(),
    rating: z.number().min(0).max(5).nullable(),
    avatar: z.string().nullable()
  }),
  scheduledDate: z.date(),
  duration: z.number().positive(),
  totalPrice: z.number().positive(),
  status: z.string(), // Allow any string for status
  rating: z.number().min(0).max(5).nullable(),
  canRate: z.boolean(),
  address: z.any(), // JSON field
  notes: z.string().nullable()
})

export const ClientStorageBoxSummarySchema = z.object({
  id: z.string(),
  boxNumber: z.string(),
  size: z.string(), // Allow any string for size
  warehouse: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    accessHours: z.any().nullable()
  }),
  startDate: z.date(),
  endDate: z.date().nullable(),
  monthlyPrice: z.number().positive(),
  accessCode: z.string(),
  itemsCount: z.number().min(0),
  lastAccess: z.date().nullable(),
  expiresInDays: z.number()
})

export const ClientNotificationSchema = z.object({
  id: z.string(),
  type: z.string(), // Allow any string for type
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  actionUrl: z.string().optional(),
  createdAt: z.date(),
  priority: z.string(),
  category: z.enum(['delivery', 'booking', 'payment', 'storage', 'system'])
})

export const ClientTutorialProgressSchema = z.object({
  completed: z.boolean(),
  currentStep: z.number().min(1).max(5),
  stepsCompleted: z.object({
    welcome: z.boolean(),
    profile: z.boolean(), 
    subscription: z.boolean(),
    firstAnnouncement: z.boolean(),
    completion: z.boolean()
  }),
  completedAt: z.date().nullable(),
  timeSpent: z.number().min(0), // en secondes
  skippedSteps: z.array(z.number()).default([]),
  isBlocking: z.boolean()
})

export const ClientDashboardResponseSchema = z.object({
  client: z.object({
    id: z.string(), // CUID au lieu d'UUID
    subscriptionPlan: z.enum(['FREE', 'STARTER', 'PREMIUM']),
    subscriptionExpiry: z.date().nullable(),
    tutorialCompleted: z.boolean(),
    emailVerified: z.boolean(),
    profileComplete: z.boolean(),
    user: z.object({
      id: z.string(), // CUID au lieu d'UUID
      name: z.string().nullable(),
      email: z.string().email(),
      phone: z.string().nullable(),
      avatar: z.string().nullable()
    })
  }),
  stats: ClientDashboardStatsSchema,
  recentAnnouncements: z.array(ClientAnnouncementSummarySchema).max(5),
  recentBookings: z.array(ClientBookingSummarySchema).max(5),
  activeStorageBoxes: z.array(ClientStorageBoxSummarySchema).max(3),
  notifications: z.array(ClientNotificationSchema).max(10),
  tutorial: ClientTutorialProgressSchema,
  quickActions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    href: z.string(),
    icon: z.string(),
    available: z.boolean(),
    requiresSubscription: z.enum(['FREE', 'STARTER', 'PREMIUM']).optional(),
    badge: z.string().optional(),
    color: z.string()
  }))
})

export type ClientDashboardStats = z.infer<typeof ClientDashboardStatsSchema>
export type ClientAnnouncementSummary = z.infer<typeof ClientAnnouncementSummarySchema>
export type ClientBookingSummary = z.infer<typeof ClientBookingSummarySchema>
export type ClientStorageBoxSummary = z.infer<typeof ClientStorageBoxSummarySchema>
export type ClientNotification = z.infer<typeof ClientNotificationSchema>
export type ClientTutorialProgress = z.infer<typeof ClientTutorialProgressSchema>
export type ClientDashboardResponse = z.infer<typeof ClientDashboardResponseSchema>