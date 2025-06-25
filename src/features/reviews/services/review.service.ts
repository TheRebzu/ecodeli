import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

export interface ReviewData {
  rating: number // 1-5
  comment?: string
  deliveryId?: string
  bookingId?: string
  providerId?: string
  delivererId?: string
  clientId: string
  type: 'DELIVERY' | 'SERVICE' | 'PROVIDER'
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  distribution: { [key: number]: number }
  recentReviews: any[]
  improvementAreas?: string[]
}

export interface ReviewFilters {
  rating?: number
  type?: 'DELIVERY' | 'SERVICE' | 'PROVIDER'
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class ReviewService {
  /**
   * Créer une nouvelle évaluation
   */
  static async createReview(reviewData: ReviewData): Promise<any> {
    try {
      const { rating, comment, deliveryId, bookingId, providerId, delivererId, clientId, type } = reviewData

      // Validation des données
      if (rating < 1 || rating > 5) {
        throw new Error('La note doit être comprise entre 1 et 5')
      }

      // Vérifier que l'utilisateur peut laisser cette évaluation
      await this.validateReviewPermission(clientId, deliveryId, bookingId, type)

      // Vérifier qu'une évaluation n'existe pas déjà
      const existingReview = await this.checkExistingReview(clientId, deliveryId, bookingId, type)
      if (existingReview) {
        throw new Error('Vous avez déjà évalué cet élément')
      }

      const review = await prisma.$transaction(async (tx) => {
        // Créer l'évaluation
        const newReview = await tx.review.create({
          data: {
            rating,
            comment,
            clientId,
            deliveryId,
            bookingId,
            providerId,
            delivererId,
            type
          },
          include: {
            client: {
              include: {
                user: { include: { profile: true } }
              }
            },
            provider: {
              include: {
                user: { include: { profile: true } }
              }
            },
            deliverer: {
              include: {
                user: { include: { profile: true } }
              }
            }
          }
        })

        // Mettre à jour les moyennes
        if (providerId && type === 'SERVICE') {
          await this.updateProviderRating(tx, providerId)
        }
        
        if (delivererId && type === 'DELIVERY') {
          await this.updateDelivererRating(tx, delivererId)
        }

        return newReview
      })

      // Envoyer une notification au prestataire/livreur
      if (providerId && review.provider) {
        await NotificationService.createNotification({
          userId: review.provider.userId,
          type: 'NEW_REVIEW',
          title: '⭐ Nouvelle évaluation',
          message: `Vous avez reçu une note de ${rating}/5 ${comment ? 'avec commentaire' : ''}`,
          data: {
            reviewId: review.id,
            rating,
            type: 'SERVICE'
          },
          sendPush: true,
          priority: rating >= 4 ? 'medium' : 'high'
        })
      }

      if (delivererId && review.deliverer) {
        await NotificationService.createNotification({
          userId: review.deliverer.userId,
          type: 'NEW_REVIEW',
          title: '⭐ Nouvelle évaluation',
          message: `Vous avez reçu une note de ${rating}/5 pour votre livraison`,
          data: {
            reviewId: review.id,
            rating,
            type: 'DELIVERY'
          },
          sendPush: true,
          priority: rating >= 4 ? 'medium' : 'high'
        })
      }

      return review

    } catch (error) {
      console.error('Erreur lors de la création de l\'évaluation:', error)
      throw error
    }
  }

  /**
   * Récupérer les évaluations d'un prestataire
   */
  static async getProviderReviews(
    providerId: string,
    filters: ReviewFilters = {}
  ): Promise<{ reviews: any[]; stats: ReviewStats; pagination: any }> {
    try {
      const { rating, startDate, endDate, limit = 20, offset = 0 } = filters

      const where: any = {
        providerId,
        type: 'SERVICE'
      }

      if (rating) where.rating = rating
      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate
        }
      }

      const [reviews, total, stats] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            client: {
              include: {
                user: { include: { profile: true } }
              }
            },
            booking: {
              include: {
                service: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.review.count({ where }),
        this.calculateProviderStats(providerId)
      ])

      return {
        reviews,
        stats,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des évaluations:', error)
      throw error
    }
  }

  /**
   * Récupérer les évaluations d'un livreur
   */
  static async getDelivererReviews(
    delivererId: string,
    filters: ReviewFilters = {}
  ): Promise<{ reviews: any[]; stats: ReviewStats; pagination: any }> {
    try {
      const { rating, startDate, endDate, limit = 20, offset = 0 } = filters

      const where: any = {
        delivererId,
        type: 'DELIVERY'
      }

      if (rating) where.rating = rating
      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate
        }
      }

      const [reviews, total, stats] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            client: {
              include: {
                user: { include: { profile: true } }
              }
            },
            delivery: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.review.count({ where }),
        this.calculateDelivererStats(delivererId)
      ])

      return {
        reviews,
        stats,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des évaluations livreur:', error)
      throw error
    }
  }

  /**
   * Calculer les statistiques d'un prestataire
   */
  private static async calculateProviderStats(providerId: string): Promise<ReviewStats> {
    const reviews = await prisma.review.findMany({
      where: {
        providerId,
        type: 'SERVICE'
      },
      include: {
        client: {
          include: {
            user: { include: { profile: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const allRatings = await prisma.review.findMany({
      where: {
        providerId,
        type: 'SERVICE'
      },
      select: { rating: true }
    })

    const totalReviews = allRatings.length
    const averageRating = totalReviews > 0 
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0

    // Distribution des notes
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    allRatings.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1
    })

    // Zones d'amélioration basées sur les commentaires négatifs
    const improvementAreas = await this.analyzeImprovementAreas(providerId, 'SERVICE')

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      distribution,
      recentReviews: reviews,
      improvementAreas
    }
  }

  /**
   * Calculer les statistiques d'un livreur
   */
  private static async calculateDelivererStats(delivererId: string): Promise<ReviewStats> {
    const reviews = await prisma.review.findMany({
      where: {
        delivererId,
        type: 'DELIVERY'
      },
      include: {
        client: {
          include: {
            user: { include: { profile: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const allRatings = await prisma.review.findMany({
      where: {
        delivererId,
        type: 'DELIVERY'
      },
      select: { rating: true }
    })

    const totalReviews = allRatings.length
    const averageRating = totalReviews > 0 
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    allRatings.forEach(r => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1
    })

    const improvementAreas = await this.analyzeImprovementAreas(delivererId, 'DELIVERY')

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews,
      distribution,
      recentReviews: reviews,
      improvementAreas
    }
  }

  /**
   * Analyser les zones d'amélioration
   */
  private static async analyzeImprovementAreas(
    targetId: string,
    type: 'SERVICE' | 'DELIVERY'
  ): Promise<string[]> {
    const negativeReviews = await prisma.review.findMany({
      where: {
        [type === 'SERVICE' ? 'providerId' : 'delivererId']: targetId,
        type,
        rating: { lte: 3 },
        comment: { not: null }
      },
      select: { comment: true, rating: true }
    })

    const keywords = {
      'Ponctualité': ['retard', 'en retard', 'attente', 'délai'],
      'Communication': ['communication', 'contact', 'réponse', 'info'],
      'Qualité du service': ['qualité', 'mal fait', 'bâclé', 'professionnel'],
      'Attitude': ['attitude', 'impoli', 'désagréable', 'sourire'],
      'Précaution': ['casse', 'abîmé', 'prudent', 'attention']
    }

    const areas: string[] = []
    const comments = negativeReviews.map(r => r.comment?.toLowerCase() || '').join(' ')

    Object.entries(keywords).forEach(([area, words]) => {
      if (words.some(word => comments.includes(word))) {
        areas.push(area)
      }
    })

    return areas
  }

  /**
   * Mettre à jour la note moyenne d'un prestataire
   */
  private static async updateProviderRating(tx: any, providerId: string): Promise<void> {
    const stats = await tx.review.aggregate({
      where: {
        providerId,
        type: 'SERVICE'
      },
      _avg: { rating: true },
      _count: { rating: true }
    })

    await tx.provider.update({
      where: { id: providerId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalBookings: stats._count.rating || 0
      }
    })
  }

  /**
   * Mettre à jour la note moyenne d'un livreur
   */
  private static async updateDelivererRating(tx: any, delivererId: string): Promise<void> {
    const stats = await tx.review.aggregate({
      where: {
        delivererId,
        type: 'DELIVERY'
      },
      _avg: { rating: true },
      _count: { rating: true }
    })

    await tx.deliverer.update({
      where: { id: delivererId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalDeliveries: stats._count.rating || 0
      }
    })
  }

  /**
   * Valider que l'utilisateur peut laisser cette évaluation
   */
  private static async validateReviewPermission(
    clientId: string,
    deliveryId?: string,
    bookingId?: string,
    type?: string
  ): Promise<void> {
    if (type === 'DELIVERY' && deliveryId) {
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          clientId,
          status: 'DELIVERED'
        }
      })

      if (!delivery) {
        throw new Error('Livraison non trouvée ou non terminée')
      }
    }

    if (type === 'SERVICE' && bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          clientId,
          status: 'COMPLETED'
        }
      })

      if (!booking) {
        throw new Error('Réservation non trouvée ou non terminée')
      }
    }
  }

  /**
   * Vérifier qu'une évaluation n'existe pas déjà
   */
  private static async checkExistingReview(
    clientId: string,
    deliveryId?: string,
    bookingId?: string,
    type?: string
  ): Promise<any> {
    const where: any = { clientId, type }

    if (deliveryId) where.deliveryId = deliveryId
    if (bookingId) where.bookingId = bookingId

    return await prisma.review.findFirst({ where })
  }

  /**
   * Répondre à une évaluation
   */
  static async respondToReview(
    reviewId: string,
    responderId: string,
    response: string
  ): Promise<any> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          provider: true,
          deliverer: true
        }
      })

      if (!review) {
        throw new Error('Évaluation non trouvée')
      }

      // Vérifier que celui qui répond est bien le prestataire/livreur concerné
      const canRespond = 
        (review.provider && review.provider.userId === responderId) ||
        (review.deliverer && review.deliverer.userId === responderId)

      if (!canRespond) {
        throw new Error('Vous n\'êtes pas autorisé à répondre à cette évaluation')
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          response,
          responseDate: new Date()
        }
      })

      // Notifier le client de la réponse
      await NotificationService.createNotification({
        userId: review.clientId,
        type: 'REVIEW_RESPONSE',
        title: '💬 Réponse à votre évaluation',
        message: 'Une réponse a été apportée à votre évaluation',
        data: {
          reviewId,
          response
        },
        sendPush: true,
        priority: 'medium'
      })

      return updatedReview

    } catch (error) {
      console.error('Erreur lors de la réponse à l\'évaluation:', error)
      throw error
    }
  }

  /**
   * Signaler une évaluation inappropriée
   */
  static async reportReview(
    reviewId: string,
    reporterId: string,
    reason: string
  ): Promise<void> {
    try {
      await prisma.reviewReport.create({
        data: {
          reviewId,
          reporterId,
          reason,
          status: 'PENDING'
        }
      })

      // Notifier les admins
      await NotificationService.createNotification({
        userId: 'admin', // Système admin
        type: 'REVIEW_REPORTED',
        title: '⚠️ Évaluation signalée',
        message: `Une évaluation a été signalée pour: ${reason}`,
        data: {
          reviewId,
          reason
        },
        sendPush: false,
        priority: 'medium'
      })

    } catch (error) {
      console.error('Erreur lors du signalement:', error)
      throw error
    }
  }

  /**
   * Obtenir le classement des meilleurs prestataires/livreurs
   */
  static async getTopRatedProviders(limit: number = 10): Promise<any[]> {
    return await prisma.provider.findMany({
      where: {
        averageRating: { gt: 0 },
        totalBookings: { gte: 5 },
        isActive: true
      },
      include: {
        user: { include: { profile: true } },
        services: true
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalBookings: 'desc' }
      ],
      take: limit
    })
  }

  static async getTopRatedDeliverers(limit: number = 10): Promise<any[]> {
    return await prisma.deliverer.findMany({
      where: {
        averageRating: { gt: 0 },
        totalDeliveries: { gte: 5 },
        isActive: true
      },
      include: {
        user: { include: { profile: true } }
      },
      orderBy: [
        { averageRating: 'desc' },
        { totalDeliveries: 'desc' }
      ],
      take: limit
    })
  }
}