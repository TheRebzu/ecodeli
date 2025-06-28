import { prisma } from '@/lib/db'

export interface ReviewData {
  bookingId: string
  clientId: string
  providerId: string
  rating: number
  comment?: string
  punctuality: number
  quality: number
  communication: number
  wouldRecommend: boolean
}

export interface ProviderStats {
  totalReviews: number
  averageRating: number
  averagePunctuality: number
  averageQuality: number
  averageCommunication: number
  recommendationRate: number
  ratingDistribution: Record<number, number>
  recentReviews: any[]
}

export class ProviderReviewService {
  /**
   * Créer une évaluation pour un prestataire
   */
  static async createReview(reviewData: ReviewData) {
    try {
      // Vérifier que la réservation existe et est terminée
      const booking = await prisma.booking.findFirst({
        where: {
          id: reviewData.bookingId,
          clientId: reviewData.clientId,
          providerId: reviewData.providerId,
          status: 'COMPLETED'
        },
        include: {
          review: true
        }
      })

      if (!booking) {
        throw new Error('Réservation non trouvée ou non terminée')
      }

      if (booking.review) {
        throw new Error('Cette prestation a déjà été évaluée')
      }

      // Créer l'évaluation
      const review = await prisma.$transaction(async (tx) => {
        // 1. Créer l'évaluation
        const newReview = await tx.review.create({
          data: {
            bookingId: reviewData.bookingId,
            clientId: reviewData.clientId,
            providerId: reviewData.providerId,
            rating: reviewData.rating,
            comment: reviewData.comment,
            punctuality: reviewData.punctuality,
            quality: reviewData.quality,
            communication: reviewData.communication,
            wouldRecommend: reviewData.wouldRecommend
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

        // 2. Mettre à jour les statistiques du prestataire
        await this.updateProviderStats(tx, reviewData.providerId)

        return newReview
      })

      // 3. Notifier le prestataire
      await prisma.notification.create({
        data: {
          userId: (await prisma.provider.findUnique({
            where: { id: reviewData.providerId },
            select: { userId: true }
          }))?.userId!,
          type: 'NEW_REVIEW',
          title: 'Nouvelle évaluation reçue',
          message: `Vous avez reçu une évaluation ${reviewData.rating}/5 étoiles`,
          data: {
            reviewId: review.id,
            rating: reviewData.rating,
            serviceName: review.booking.service.name
          }
        }
      })

      return review

    } catch (error) {
      console.error('Error creating review:', error)
      throw error
    }
  }

  /**
   * Mettre à jour les statistiques d'un prestataire
   */
  private static async updateProviderStats(tx: any, providerId: string) {
    // Calculer les nouvelles statistiques
    const stats = await tx.review.aggregate({
      where: { providerId },
      _avg: {
        rating: true,
        punctuality: true,
        quality: true,
        communication: true
      },
      _count: {
        id: true
      }
    })

    const recommendationCount = await tx.review.count({
      where: {
        providerId,
        wouldRecommend: true
      }
    })

    const recommendationRate = stats._count.id > 0 
      ? (recommendationCount / stats._count.id) * 100 
      : 0

    // Mettre à jour le prestataire
    await tx.provider.update({
      where: { id: providerId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalBookings: { increment: 1 }, // Incrémenter le total des réservations
        lastActiveAt: new Date()
      }
    })
  }

  /**
   * Récupérer les statistiques d'évaluation d'un prestataire
   */
  static async getProviderStats(providerId: string): Promise<ProviderStats> {
    try {
      const [
        aggregateStats,
        recommendationCount,
        totalReviews,
        ratingDistribution,
        recentReviews
      ] = await Promise.all([
        // Moyennes
        prisma.review.aggregate({
          where: { providerId },
          _avg: {
            rating: true,
            punctuality: true,
            quality: true,
            communication: true
          }
        }),

        // Taux de recommandation
        prisma.review.count({
          where: {
            providerId,
            wouldRecommend: true
          }
        }),

        // Total des avis
        prisma.review.count({
          where: { providerId }
        }),

        // Distribution des notes
        prisma.review.groupBy({
          by: ['rating'],
          where: { providerId },
          _count: { rating: true }
        }),

        // Avis récents
        prisma.review.findMany({
          where: { providerId },
          include: {
            client: {
              include: {
                user: {
                  include: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        avatar: true
                      }
                    }
                  }
                }
              }
            },
            booking: {
              include: {
                service: {
                  select: {
                    name: true,
                    type: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ])

      // Construire la distribution des notes
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      ratingDistribution.forEach(item => {
        distribution[item.rating] = item._count.rating
      })

      const recommendationRate = totalReviews > 0 
        ? (recommendationCount / totalReviews) * 100 
        : 0

      return {
        totalReviews,
        averageRating: aggregateStats._avg.rating || 0,
        averagePunctuality: aggregateStats._avg.punctuality || 0,
        averageQuality: aggregateStats._avg.quality || 0,
        averageCommunication: aggregateStats._avg.communication || 0,
        recommendationRate,
        ratingDistribution: distribution,
        recentReviews: recentReviews.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          punctuality: review.punctuality,
          quality: review.quality,
          communication: review.communication,
          wouldRecommend: review.wouldRecommend,
          createdAt: review.createdAt,
          client: {
            name: `${review.client.user.profile?.firstName} ${review.client.user.profile?.lastName}`,
            avatar: review.client.user.profile?.avatar
          },
          service: {
            name: review.booking.service.name,
            type: review.booking.service.type
          }
        }))
      }

    } catch (error) {
      console.error('Error fetching provider stats:', error)
      throw error
    }
  }

  /**
   * Récupérer les évaluations d'un prestataire avec pagination
   */
  static async getProviderReviews(
    providerId: string,
    options: {
      page?: number
      limit?: number
      rating?: number
      sortBy?: 'date' | 'rating'
      sortOrder?: 'asc' | 'desc'
    } = {}
  ) {
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = 'date',
      sortOrder = 'desc'
    } = options

    const where: any = { providerId }
    if (rating) where.rating = rating

    const orderBy = sortBy === 'date' 
      ? { createdAt: sortOrder }
      : { rating: sortOrder }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          client: {
            include: {
              user: {
                include: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          },
          booking: {
            include: {
              service: {
                select: {
                  name: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    return {
      reviews: reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        punctuality: review.punctuality,
        quality: review.quality,
        communication: review.communication,
        wouldRecommend: review.wouldRecommend,
        createdAt: review.createdAt,
        client: {
          name: `${review.client.user.profile?.firstName} ${review.client.user.profile?.lastName}`,
          avatar: review.client.user.profile?.avatar
        },
        service: {
          name: review.booking.service.name,
          type: review.booking.service.type
        }
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  /**
   * Répondre à un avis (pour le prestataire)
   */
  static async respondToReview(
    reviewId: string,
    providerId: string,
    response: string
  ) {
    try {
      // Vérifier que l'avis appartient au prestataire
      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          providerId
        }
      })

      if (!review) {
        throw new Error('Avis non trouvé')
      }

      if (review.providerResponse) {
        throw new Error('Vous avez déjà répondu à cet avis')
      }

      // Ajouter la réponse
      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          providerResponse: response,
          providerResponseAt: new Date()
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
          }
        }
      })

      // Notifier le client
      await prisma.notification.create({
        data: {
          userId: updatedReview.client.userId,
          type: 'REVIEW_RESPONSE',
          title: 'Réponse à votre évaluation',
          message: 'Le prestataire a répondu à votre évaluation',
          data: {
            reviewId,
            response
          }
        }
      })

      return updatedReview

    } catch (error) {
      console.error('Error responding to review:', error)
      throw error
    }
  }

  /**
   * Signaler un avis inapproprié
   */
  static async reportReview(
    reviewId: string,
    reporterId: string,
    reason: string
  ) {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId }
      })

      if (!review) {
        throw new Error('Avis non trouvé')
      }

      // Créer le signalement
      await prisma.reviewReport.create({
        data: {
          reviewId,
          reporterId,
          reason,
          status: 'PENDING'
        }
      })

      // Notifier les administrateurs
      await prisma.notification.create({
        data: {
          userId: 'admin', // À adapter selon votre système d'admin
          type: 'REVIEW_REPORTED',
          title: 'Avis signalé',
          message: `Un avis a été signalé pour: ${reason}`,
          data: {
            reviewId,
            reason
          }
        }
      })

      return { success: true, message: 'Avis signalé avec succès' }

    } catch (error) {
      console.error('Error reporting review:', error)
      throw error
    }
  }

  /**
   * Récupérer les top prestataires basé sur leurs évaluations
   */
  static async getTopProviders(limit: number = 10) {
    try {
      const providers = await prisma.provider.findMany({
        where: {
          isActive: true,
          validationStatus: 'APPROVED',
          averageRating: { gt: 0 }
        },
        include: {
          user: {
            include: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true
                }
              }
            }
          },
          services: {
            where: { isActive: true },
            select: {
              name: true,
              type: true,
              basePrice: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy: [
          { averageRating: 'desc' },
          { totalBookings: 'desc' }
        ],
        take: limit
      })

      return providers.map(provider => ({
        id: provider.id,
        name: `${provider.user.profile?.firstName} ${provider.user.profile?.lastName}`,
        avatar: provider.user.profile?.avatar,
        businessName: provider.businessName,
        specialties: provider.specialties,
        averageRating: provider.averageRating,
        totalBookings: provider.totalBookings,
        totalReviews: provider._count.reviews,
        services: provider.services,
        zone: provider.zone
      }))

    } catch (error) {
      console.error('Error fetching top providers:', error)
      throw error
    }
  }
}