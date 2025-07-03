import { prisma } from '@/lib/db'

export interface EvaluationFilters {
  providerId: string
  rating?: number
  dateFrom?: Date
  dateTo?: Date
  serviceType?: string
}

export interface EvaluationStats {
  totalReviews: number
  averageRating: number
  ratingDistribution: Record<number, number>
  recentTrend: 'up' | 'down' | 'stable'
  monthlyStats: Array<{
    month: string
    averageRating: number
    totalReviews: number
  }>
}

export class EvaluationsService {
  /**
   * Récupérer les évaluations d'un prestataire
   */
  static async getProviderEvaluations(filters: EvaluationFilters) {
    const where: any = {
      providerId: filters.providerId
    }

    // Filtre par note
    if (filters.rating) {
      where.rating = filters.rating
    }

    // Filtres par date
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo
      }
    }

    // Filtre par type de service
    if (filters.serviceType) {
      where.booking = {
        service: {
          type: filters.serviceType
        }
      }
    }

    return await prisma.review.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Obtenir les statistiques détaillées des évaluations
   */
  static async getEvaluationStats(providerId: string): Promise<EvaluationStats> {
    // Récupérer toutes les évaluations
    const allReviews = await prisma.review.findMany({
      where: { providerId },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const totalReviews = allReviews.length
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0

    // Distribution des notes (1-5 étoiles)
    const ratingDistribution: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    }
    
    allReviews.forEach(review => {
      ratingDistribution[review.rating] = (ratingDistribution[review.rating] || 0) + 1
    })

    // Tendance récente (comparaison 30 derniers jours vs 30 jours précédents)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const recentReviews = allReviews.filter(review => 
      review.createdAt >= thirtyDaysAgo
    )
    const previousReviews = allReviews.filter(review => 
      review.createdAt >= sixtyDaysAgo && review.createdAt < thirtyDaysAgo
    )

    const recentAverage = recentReviews.length > 0
      ? recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length
      : 0

    const previousAverage = previousReviews.length > 0
      ? previousReviews.reduce((sum, review) => sum + review.rating, 0) / previousReviews.length
      : 0

    let recentTrend: 'up' | 'down' | 'stable' = 'stable'
    if (recentAverage > previousAverage + 0.1) {
      recentTrend = 'up'
    } else if (recentAverage < previousAverage - 0.1) {
      recentTrend = 'down'
    }

    // Statistiques mensuelles des 6 derniers mois
    const monthlyStats = await this.getMonthlyEvaluationStats(providerId, 6)

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      recentTrend,
      monthlyStats
    }
  }

  /**
   * Obtenir les statistiques mensuelles
   */
  static async getMonthlyEvaluationStats(providerId: string, monthsCount = 6) {
    const stats = []
    const now = new Date()

    for (let i = 0; i < monthsCount; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthReviews = await prisma.review.findMany({
        where: {
          providerId,
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      })

      const averageRating = monthReviews.length > 0
        ? monthReviews.reduce((sum, review) => sum + review.rating, 0) / monthReviews.length
        : 0

      stats.unshift({
        month: monthStart.toLocaleDateString('fr-FR', { 
          year: 'numeric', 
          month: 'short' 
        }),
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: monthReviews.length
      })
    }

    return stats
  }

  /**
   * Obtenir les évaluations récentes
   */
  static async getRecentEvaluations(providerId: string, limit = 5) {
    return await prisma.review.findMany({
      where: { providerId },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        booking: {
          include: {
            service: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
  }

  /**
   * Obtenir les évaluations par type de service
   */
  static async getEvaluationsByServiceType(providerId: string) {
    const evaluations = await prisma.review.findMany({
      where: { providerId },
      include: {
        booking: {
          include: {
            service: true
          }
        }
      }
    })

    const serviceStats: Record<string, {
      count: number
      averageRating: number
      serviceName: string
    }> = {}

    evaluations.forEach(evaluation => {
      const serviceType = evaluation.booking?.service?.type || 'OTHER'
      const serviceName = evaluation.booking?.service?.name || 'Service inconnu'

      if (!serviceStats[serviceType]) {
        serviceStats[serviceType] = {
          count: 0,
          averageRating: 0,
          serviceName
        }
      }

      serviceStats[serviceType].count++
      serviceStats[serviceType].averageRating = 
        (serviceStats[serviceType].averageRating * (serviceStats[serviceType].count - 1) + evaluation.rating) / 
        serviceStats[serviceType].count
    })

    // Arrondir les moyennes
    Object.keys(serviceStats).forEach(type => {
      serviceStats[type].averageRating = Math.round(serviceStats[type].averageRating * 10) / 10
    })

    return serviceStats
  }

  /**
   * Répondre à une évaluation
   */
  static async respondToEvaluation(reviewId: string, providerId: string, response: string) {
    // Vérifier que l'évaluation appartient au prestataire
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        providerId: providerId
      }
    })

    if (!review) {
      throw new Error('Évaluation non trouvée')
    }

    if (review.response) {
      throw new Error('Vous avez déjà répondu à cette évaluation')
    }

    return await prisma.review.update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date()
      },
      include: {
        client: {
          include: {
            user: {
              include: {
                profile: true
              }
            }
          }
        },
        booking: {
          include: {
            service: true
          }
        }
      }
    })
  }

  /**
   * Obtenir le classement du prestataire
   */
  static async getProviderRanking(providerId: string) {
    // Obtenir la note moyenne du prestataire
    const providerStats = await prisma.review.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { id: true }
    })

    if (!providerStats._count.id) {
      return {
        ranking: null,
        totalProviders: 0,
        percentile: 0,
        averageRating: 0
      }
    }

    const providerRating = providerStats._avg.rating || 0

    // Obtenir le nombre de prestataires avec une note supérieure
    const betterProviders = await prisma.provider.count({
      where: {
        averageRating: {
          gt: providerRating
        }
      }
    })

    // Obtenir le nombre total de prestataires avec des évaluations
    const totalProviders = await prisma.provider.count({
      where: {
        averageRating: {
          not: null
        }
      }
    })

    const ranking = betterProviders + 1
    const percentile = totalProviders > 0 
      ? Math.round(((totalProviders - ranking + 1) / totalProviders) * 100)
      : 0

    return {
      ranking,
      totalProviders,
      percentile,
      averageRating: Math.round(providerRating * 10) / 10
    }
  }
} 