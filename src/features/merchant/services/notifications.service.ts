import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface MerchantNotification {
  id: string
  merchantId: string
  type: NotificationType
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  data?: any
  read: boolean
  actionRequired: boolean
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Date
  createdAt: Date
  readAt?: Date
}

export type NotificationType = 
  | 'NEW_ORDER'
  | 'ORDER_STATUS_UPDATE'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'PROMOTION_STARTED'
  | 'PROMOTION_ENDED'
  | 'CONTRACT_RENEWAL'
  | 'INVOICE_GENERATED'
  | 'SYSTEM_ALERT'
  | 'PERFORMANCE_REPORT'
  | 'CART_DROP_CONFIG'
  | 'DELIVERY_ISSUE'
  | 'CUSTOMER_REVIEW'
  | 'BULK_IMPORT_COMPLETE'

export type NotificationCategory = 
  | 'ORDERS'
  | 'PAYMENTS'
  | 'INVENTORY'
  | 'MARKETING'
  | 'SYSTEM'
  | 'REPORTS'
  | 'ALERTS'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface NotificationPreferences {
  merchantId: string
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  categories: {
    [key in NotificationCategory]: {
      enabled: boolean
      email: boolean
      sms: boolean
      push: boolean
      priority: NotificationPriority
    }
  }
  quietHours: {
    enabled: boolean
    startTime: string
    endTime: string
    timezone: string
  }
  frequency: {
    immediate: NotificationType[]
    daily: NotificationType[]
    weekly: NotificationType[]
  }
}

export interface NotificationStats {
  total: number
  unread: number
  byCategory: {
    [key in NotificationCategory]: {
      total: number
      unread: number
      urgent: number
    }
  }
  byPriority: {
    [key in NotificationPriority]: number
  }
  recentActivity: Array<{
    date: string
    count: number
    categories: { [key: string]: number }
  }>
}

export interface BusinessAlert {
  id: string
  merchantId: string
  type: 'REVENUE_DROP' | 'ORDER_SPIKE' | 'STOCK_CRITICAL' | 'PERFORMANCE_ISSUE' | 'OPPORTUNITY'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  description: string
  metrics: any
  recommendations: string[]
  actionRequired: boolean
  resolved: boolean
  createdAt: Date
  resolvedAt?: Date
}

export class MerchantNotificationsService {
  /**
   * Récupère les notifications d'un commerçant
   */
  static async getNotifications(
    merchantId: string,
    filters?: {
      category?: NotificationCategory
      priority?: NotificationPriority
      unreadOnly?: boolean
      actionRequired?: boolean
      page?: number
      limit?: number
    }
  ): Promise<{
    notifications: MerchantNotification[]
    total: number
    unread: number
    pagination: {
      page: number
      limit: number
      totalPages: number
    }
  }> {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 20
      const skip = (page - 1) * limit

      // Construction des filtres
      const where: any = {
        merchantId
      }

      if (filters?.category) {
        where.category = filters.category
      }

      if (filters?.priority) {
        where.priority = filters.priority
      }

      if (filters?.unreadOnly) {
        where.read = false
      }

      if (filters?.actionRequired !== undefined) {
        where.actionRequired = filters.actionRequired
      }

      // Filtrer les notifications expirées
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]

      // Récupération des notifications
      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ]
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: {
            merchantId,
            read: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          }
        })
      ])

      return {
        notifications: notifications.map(this.formatNotification),
        total,
        unread: unreadCount,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur récupération notifications:', error)
      throw error
    }
  }

  /**
   * Marque une notification comme lue
   */
  static async markAsRead(notificationId: string, merchantId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          merchantId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
    } catch (error) {
      console.error('Erreur marquage notification lue:', error)
      throw error
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  static async markAllAsRead(merchantId: string, category?: NotificationCategory): Promise<void> {
    try {
      const where: any = {
        merchantId,
        read: false
      }

      if (category) {
        where.category = category
      }

      await prisma.notification.updateMany({
        where,
        data: {
          read: true,
          readAt: new Date()
        }
      })
    } catch (error) {
      console.error('Erreur marquage toutes notifications lues:', error)
      throw error
    }
  }

  /**
   * Supprime une notification
   */
  static async deleteNotification(notificationId: string, merchantId: string): Promise<void> {
    try {
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          merchantId
        }
      })
    } catch (error) {
      console.error('Erreur suppression notification:', error)
      throw error
    }
  }

  /**
   * Crée une nouvelle notification
   */
  static async createNotification(
    merchantId: string,
    notificationData: Omit<MerchantNotification, 'id' | 'merchantId' | 'read' | 'createdAt' | 'readAt'>
  ): Promise<MerchantNotification> {
    try {
      // Vérifier les préférences du commerçant
      const preferences = await this.getNotificationPreferences(merchantId)
      
      if (!preferences.categories[notificationData.category]?.enabled) {
        // Ne pas créer la notification si la catégorie est désactivée
        return null
      }

      const notification = await prisma.notification.create({
        data: {
          ...notificationData,
          merchantId,
          read: false,
          data: notificationData.data ? JSON.stringify(notificationData.data) : null
        }
      })

      const formattedNotification = this.formatNotification(notification)

      // Envoyer les notifications externes (email, SMS, push)
      await this.sendExternalNotifications(merchantId, formattedNotification, preferences)

      return formattedNotification

    } catch (error) {
      console.error('Erreur création notification:', error)
      throw error
    }
  }

  /**
   * Récupère les statistiques des notifications
   */
  static async getNotificationStats(merchantId: string): Promise<NotificationStats> {
    try {
      const [
        total,
        unread,
        categoryStats,
        priorityStats,
        recentActivity
      ] = await Promise.all([
        // Total notifications
        prisma.notification.count({
          where: { merchantId }
        }),

        // Non lues
        prisma.notification.count({
          where: {
            merchantId,
            read: false,
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } }
            ]
          }
        }),

        // Par catégorie
        prisma.notification.groupBy({
          by: ['category'],
          where: { merchantId },
          _count: true
        }),

        // Par priorité
        prisma.notification.groupBy({
          by: ['priority'],
          where: { merchantId },
          _count: true
        }),

        // Activité récente (7 derniers jours)
        this.getRecentActivity(merchantId)
      ])

      // Construire les stats par catégorie
      const byCategory = {} as NotificationStats['byCategory']
      for (const category of Object.values(NotificationCategory)) {
        const categoryData = categoryStats.find(s => s.category === category)
        const unreadCount = await prisma.notification.count({
          where: {
            merchantId,
            category,
            read: false
          }
        })
        const urgentCount = await prisma.notification.count({
          where: {
            merchantId,
            category,
            priority: 'URGENT'
          }
        })

        byCategory[category] = {
          total: categoryData?._count || 0,
          unread: unreadCount,
          urgent: urgentCount
        }
      }

      // Construire les stats par priorité
      const byPriority = {} as NotificationStats['byPriority']
      for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as NotificationPriority[]) {
        const priorityData = priorityStats.find(s => s.priority === priority)
        byPriority[priority] = priorityData?._count || 0
      }

      return {
        total,
        unread,
        byCategory,
        byPriority,
        recentActivity
      }

    } catch (error) {
      console.error('Erreur statistiques notifications:', error)
      throw error
    }
  }

  /**
   * Récupère les préférences de notification
   */
  static async getNotificationPreferences(merchantId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { merchantId }
      })

      if (!preferences) {
        // Créer les préférences par défaut
        return await this.createDefaultPreferences(merchantId)
      }

      return this.formatPreferences(preferences)

    } catch (error) {
      console.error('Erreur récupération préférences notifications:', error)
      throw error
    }
  }

  /**
   * Met à jour les préférences de notification
   */
  static async updateNotificationPreferences(
    merchantId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const updatedPreferences = await prisma.notificationPreferences.upsert({
        where: { merchantId },
        update: {
          ...preferences,
          categories: preferences.categories ? JSON.stringify(preferences.categories) : undefined,
          quietHours: preferences.quietHours ? JSON.stringify(preferences.quietHours) : undefined,
          frequency: preferences.frequency ? JSON.stringify(preferences.frequency) : undefined
        },
        create: {
          merchantId,
          ...preferences,
          categories: JSON.stringify(preferences.categories || this.getDefaultCategories()),
          quietHours: JSON.stringify(preferences.quietHours || this.getDefaultQuietHours()),
          frequency: JSON.stringify(preferences.frequency || this.getDefaultFrequency())
        }
      })

      return this.formatPreferences(updatedPreferences)

    } catch (error) {
      console.error('Erreur mise à jour préférences notifications:', error)
      throw error
    }
  }

  /**
   * Récupère les alertes métier
   */
  static async getBusinessAlerts(
    merchantId: string,
    filters?: {
      type?: BusinessAlert['type']
      severity?: BusinessAlert['severity']
      resolved?: boolean
      page?: number
      limit?: number
    }
  ): Promise<{
    alerts: BusinessAlert[]
    total: number
    pagination: {
      page: number
      limit: number
      totalPages: number
    }
  }> {
    try {
      const page = filters?.page || 1
      const limit = filters?.limit || 10
      const skip = (page - 1) * limit

      const where: any = {
        merchantId
      }

      if (filters?.type) {
        where.type = filters.type
      }

      if (filters?.severity) {
        where.severity = filters.severity
      }

      if (filters?.resolved !== undefined) {
        where.resolved = filters.resolved
      }

      const [alerts, total] = await Promise.all([
        prisma.businessAlert.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { severity: 'desc' },
            { createdAt: 'desc' }
          ]
        }),
        prisma.businessAlert.count({ where })
      ])

      return {
        alerts: alerts.map(this.formatBusinessAlert),
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur récupération alertes métier:', error)
      throw error
    }
  }

  /**
   * Crée une alerte métier
   */
  static async createBusinessAlert(
    merchantId: string,
    alertData: Omit<BusinessAlert, 'id' | 'merchantId' | 'resolved' | 'createdAt' | 'resolvedAt'>
  ): Promise<BusinessAlert> {
    try {
      const alert = await prisma.businessAlert.create({
        data: {
          ...alertData,
          merchantId,
          resolved: false,
          metrics: JSON.stringify(alertData.metrics),
          recommendations: JSON.stringify(alertData.recommendations)
        }
      })

      // Créer une notification associée
      await this.createNotification(merchantId, {
        type: 'SYSTEM_ALERT',
        category: 'ALERTS',
        priority: alertData.severity === 'CRITICAL' ? 'URGENT' : 'HIGH',
        title: alertData.title,
        message: alertData.description,
        actionRequired: alertData.actionRequired,
        actionUrl: `/merchant/alerts/${alert.id}`,
        actionLabel: 'Voir l\'alerte'
      })

      return this.formatBusinessAlert(alert)

    } catch (error) {
      console.error('Erreur création alerte métier:', error)
      throw error
    }
  }

  /**
   * Résout une alerte métier
   */
  static async resolveBusinessAlert(alertId: string, merchantId: string): Promise<void> {
    try {
      await prisma.businessAlert.updateMany({
        where: {
          id: alertId,
          merchantId,
          resolved: false
        },
        data: {
          resolved: true,
          resolvedAt: new Date()
        }
      })
    } catch (error) {
      console.error('Erreur résolution alerte métier:', error)
      throw error
    }
  }

  // Méthodes utilitaires privées
  private static formatNotification(notification: any): MerchantNotification {
    return {
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : undefined
    }
  }

  private static formatBusinessAlert(alert: any): BusinessAlert {
    return {
      ...alert,
      metrics: JSON.parse(alert.metrics),
      recommendations: JSON.parse(alert.recommendations)
    }
  }

  private static formatPreferences(preferences: any): NotificationPreferences {
    return {
      ...preferences,
      categories: JSON.parse(preferences.categories),
      quietHours: JSON.parse(preferences.quietHours),
      frequency: JSON.parse(preferences.frequency)
    }
  }

  private static async createDefaultPreferences(merchantId: string): Promise<NotificationPreferences> {
    const defaultPreferences = {
      merchantId,
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      categories: this.getDefaultCategories(),
      quietHours: this.getDefaultQuietHours(),
      frequency: this.getDefaultFrequency()
    }

    return await this.updateNotificationPreferences(merchantId, defaultPreferences)
  }

  private static getDefaultCategories() {
    const categories = {} as NotificationPreferences['categories']
    
    for (const category of Object.values(NotificationCategory)) {
      categories[category] = {
        enabled: true,
        email: category === 'ORDERS' || category === 'PAYMENTS',
        sms: category === 'ALERTS',
        push: true,
        priority: 'MEDIUM'
      }
    }

    return categories
  }

  private static getDefaultQuietHours() {
    return {
      enabled: true,
      startTime: '22:00',
      endTime: '08:00',
      timezone: 'Europe/Paris'
    }
  }

  private static getDefaultFrequency() {
    return {
      immediate: ['NEW_ORDER', 'PAYMENT_FAILED', 'SYSTEM_ALERT'] as NotificationType[],
      daily: ['PERFORMANCE_REPORT', 'LOW_STOCK'] as NotificationType[],
      weekly: ['INVOICE_GENERATED'] as NotificationType[]
    }
  }

  private static async sendExternalNotifications(
    merchantId: string,
    notification: MerchantNotification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const categoryPrefs = preferences.categories[notification.category]
    
    if (!categoryPrefs?.enabled) return

    // Vérifier les heures silencieuses
    if (this.isQuietHours(preferences.quietHours) && notification.priority !== 'URGENT') {
      return
    }

    try {
      // Email
      if (categoryPrefs.email && preferences.emailEnabled) {
        await this.sendEmailNotification(merchantId, notification)
      }

      // SMS
      if (categoryPrefs.sms && preferences.smsEnabled) {
        await this.sendSMSNotification(merchantId, notification)
      }

      // Push
      if (categoryPrefs.push && preferences.pushEnabled) {
        await this.sendPushNotification(merchantId, notification)
      }

    } catch (error) {
      console.error('Erreur envoi notifications externes:', error)
    }
  }

  private static isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours.enabled) return false

    const now = new Date()
    const currentTime = now.toLocaleTimeString('fr-FR', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: quietHours.timezone 
    })

    return currentTime >= quietHours.startTime || currentTime <= quietHours.endTime
  }

  private static async sendEmailNotification(merchantId: string, notification: MerchantNotification): Promise<void> {
    // Implémentation email (à connecter avec service email)
    console.log(`Email notification sent to merchant ${merchantId}:`, notification.title)
  }

  private static async sendSMSNotification(merchantId: string, notification: MerchantNotification): Promise<void> {
    // Implémentation SMS (à connecter avec service SMS)
    console.log(`SMS notification sent to merchant ${merchantId}:`, notification.title)
  }

  private static async sendPushNotification(merchantId: string, notification: MerchantNotification): Promise<void> {
    // Implémentation push (à connecter avec OneSignal)
    console.log(`Push notification sent to merchant ${merchantId}:`, notification.title)
  }

  private static async getRecentActivity(merchantId: string) {
    // Simuler l'activité récente pour les 7 derniers jours
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const count = await prisma.notification.count({
        where: {
          merchantId,
          createdAt: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999))
          }
        }
      })

      days.push({
        date: date.toISOString().split('T')[0],
        count,
        categories: {} // À implémenter si besoin
      })
    }

    return days
  }
}

// Schémas de validation
export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  categories: z.record(z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  })),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    timezone: z.string()
  }),
  frequency: z.object({
    immediate: z.array(z.string()),
    daily: z.array(z.string()),
    weekly: z.array(z.string())
  })
}) 