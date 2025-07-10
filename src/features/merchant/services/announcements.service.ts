import { prisma } from '@/lib/db'
import { z } from 'zod'

export interface MerchantAnnouncementFilters {
  status?: string
  type?: string
  search?: string
  page?: number
  limit?: number
}

export interface AnnouncementStats {
  total: number
  active: number
  completed: number
  cancelled: number
  totalViews: number
  averagePrice: number
}

export interface AnnouncementPerformance {
  id: string
  title: string
  type: string
  status: string
  views: number
  deliveries: number
  conversionRate: number
  revenue: number
  createdAt: Date
}

export class MerchantAnnouncementsService {
  /**
   * Récupère les annonces du merchant avec filtres et pagination
   */
  static async getAnnouncements(
    userId: string, 
    filters: MerchantAnnouncementFilters = {}
  ) {
    const { page = 1, limit = 10, status, type, search } = filters
    const skip = (page - 1) * limit

    const whereClause: any = {
      authorId: userId
    }

    if (status && status !== 'ALL') {
      whereClause.status = status
    }

    if (type && type !== 'ALL') {
      whereClause.type = type
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [announcements, totalCount] = await Promise.all([
      prisma.announcement.findMany({
        where: whereClause,
        include: {
          author: {
            include: {
              profile: true
            }
          },
          delivery: {
            include: {
              payment: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.announcement.count({ where: whereClause })
    ])

    return {
      announcements,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    }
  }

  /**
   * Récupère les statistiques des annonces
   */
  static async getAnnouncementStats(userId: string): Promise<AnnouncementStats> {
    const announcements = await prisma.announcement.findMany({
      where: { authorId: userId },
      include: {
        delivery: {
          include: {
            payment: true
          }
        }
      }
    })

    const total = announcements.length
    const active = announcements.filter(a => a.status === 'ACTIVE').length
    const completed = announcements.filter(a => a.status === 'COMPLETED').length
    const cancelled = announcements.filter(a => a.status === 'CANCELLED').length
    
    // Simulation du nombre de vues (dans la vraie version, ça viendrait d'une table analytics)
    const totalViews = announcements.reduce((sum, a) => sum + (Math.floor(Math.random() * 100) + 10), 0)
    
    const averagePrice = total > 0 
      ? announcements.reduce((sum, a) => sum + a.finalPrice, 0) / total 
      : 0

    return {
      total,
      active,
      completed,
      cancelled,
      totalViews,
      averagePrice
    }
  }

  /**
   * Récupère les performances détaillées des annonces
   */
  static async getAnnouncementPerformance(userId: string): Promise<AnnouncementPerformance[]> {
    const announcements = await prisma.announcement.findMany({
      where: { authorId: userId },
      include: {
        delivery: {
          include: {
            payment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return announcements.map(announcement => {
      const views = Math.floor(Math.random() * 100) + 10 // Simulation
      const deliveries = announcement.delivery ? 1 : 0
      const conversionRate = views > 0 ? (deliveries / views) * 100 : 0
      const revenue = announcement.delivery?.payment?.status === 'COMPLETED' 
        ? announcement.delivery.payment.amount 
        : 0

      return {
        id: announcement.id,
        title: announcement.title,
        type: announcement.type,
        status: announcement.status,
        views,
        deliveries,
        conversionRate,
        revenue,
        createdAt: announcement.createdAt
      }
    })
  }

  /**
   * Crée une nouvelle annonce
   */
  static async createAnnouncement(userId: string, data: any) {
    return await prisma.announcement.create({
      data: {
        ...data,
        authorId: userId
      },
      include: {
        author: {
          include: {
            profile: true
          }
        }
      }
    })
  }

  /**
   * Met à jour une annonce
   */
  static async updateAnnouncement(userId: string, announcementId: string, data: any) {
    // Vérifier que l'annonce appartient au merchant
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        authorId: userId
      }
    })

    if (!announcement) {
      throw new Error('Annonce non trouvée ou accès non autorisé')
    }

    return await prisma.announcement.update({
      where: { id: announcementId },
      data,
      include: {
        author: {
          include: {
            profile: true
          }
        }
      }
    })
  }

  /**
   * Supprime une annonce
   */
  static async deleteAnnouncement(userId: string, announcementId: string) {
    // Vérifier que l'annonce appartient au merchant
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        authorId: userId
      }
    })

    if (!announcement) {
      throw new Error('Annonce non trouvée ou accès non autorisé')
    }

    return await prisma.announcement.delete({
      where: { id: announcementId }
    })
  }
}

// Schémas de validation Zod
export const announcementFiltersSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional()
})

export const createAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
  type: z.string(),
  basePrice: z.number().positive('Le prix doit être positif'),
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  scheduledAt: z.string().datetime('Date invalide').optional()
}) 