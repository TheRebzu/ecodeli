import { prisma } from "@/lib/db";
import { NotificationService } from "@/features/notifications/services/notification.service";

export interface ReviewData {
  rating: number; // 1-5
  comment?: string;
  bookingId?: string;
  providerId?: string;
  clientId: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
  recentReviews: any[];
  improvementAreas?: string[];
}

export interface ReviewFilters {
  rating?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ReviewService {
  /**
   * Créer une nouvelle évaluation
   */
  static async createReview(reviewData: ReviewData): Promise<any> {
    try {
      const { rating, comment, bookingId, providerId, clientId } = reviewData;

      // Validation des données
      if (rating < 1 || rating > 5) {
        throw new Error("La note doit être comprise entre 1 et 5");
      }

      // Vérifier que l'utilisateur peut laisser cette évaluation
      await this.validateReviewPermission(clientId, bookingId);

      // Vérifier qu'une évaluation n'existe pas déjà
      const existingReview = await this.checkExistingReview(
        clientId,
        bookingId,
      );
      if (existingReview) {
        throw new Error("Vous avez déjà évalué cet élément");
      }

      const review = await prisma.$transaction(async (tx) => {
        // Créer l'évaluation
        const newReview = await tx.review.create({
          data: {
            rating,
            comment,
            clientId,
            bookingId,
            providerId,
          },
          include: {
            client: true,
            provider: {
              include: {
                user: true,
              },
            },
            booking: {
              include: {
                provider: true,
              },
            },
          },
        });

        // Mettre à jour les moyennes du prestataire
        if (providerId) {
          await this.updateProviderRating(tx, providerId);
        }

        return newReview;
      });

      // Envoyer une notification au prestataire
      if (providerId && review.provider) {
        await NotificationService.createNotification({
          userId: review.provider.userId,
          type: "NEW_REVIEW",
          title: "⭐ Nouvelle évaluation",
          message: `Vous avez reçu une note de ${rating}/5 ${comment ? "avec commentaire" : ""}`,
          data: {
            reviewId: review.id,
            rating,
          },
          sendPush: true,
          priority: rating >= 4 ? "medium" : "high",
        });
      }

      return review;
    } catch (error) {
      console.error("Erreur lors de la création de l'évaluation:", error);
      throw error;
    }
  }

  /**
   * Récupérer les évaluations d'un prestataire
   */
  static async getProviderReviews(
    providerId: string,
    filters: ReviewFilters = {},
  ): Promise<{ reviews: any[]; stats: any; pagination: any }> {
    try {
      const { rating, startDate, endDate, limit = 20, offset = 0 } = filters;

      const where: any = {
        providerId,
      };

      if (rating) where.rating = rating;
      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      const [reviews, total, ratingDistribution] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            client: {
              include: {
                user: true,
              },
            },
            booking: true,
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.review.count({ where }),
        this.calculateRatingDistribution(providerId),
      ]);

      // Calculer les statistiques
      const totalReviews = reviews.length;
      const averageRating =
        totalReviews > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      const stats = {
        averageRating: Math.round(averageRating * 100) / 100,
        totalReviews: total,
        ratingDistribution,
      };

      return {
        reviews,
        stats,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des évaluations:", error);
      throw error;
    }
  }

  /**
   * Calculer la distribution des notes
   */
  private static async calculateRatingDistribution(
    providerId: string,
  ): Promise<{ [key: number]: number }> {
    const reviews = await prisma.review.findMany({
      where: { providerId },
      select: { rating: true },
    });

    const distribution: { [key: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Analyser les zones d'amélioration
   */
  private static async analyzeImprovementAreas(
    providerId: string,
  ): Promise<string[]> {
    const negativeReviews = await prisma.review.findMany({
      where: {
        providerId,
        rating: { lte: 3 },
        comment: { not: null },
      },
      select: { comment: true, rating: true },
    });

    const keywords = {
      Ponctualité: ["retard", "en retard", "attente", "délai"],
      Communication: ["communication", "contact", "réponse", "info"],
      "Qualité du service": ["qualité", "mal fait", "bâclé", "professionnel"],
      Attitude: ["attitude", "impoli", "désagréable", "sourire"],
      Précaution: ["casse", "abîmé", "prudent", "attention"],
    };

    const areas: string[] = [];
    const comments = negativeReviews
      .map((r) => r.comment?.toLowerCase() || "")
      .join(" ");

    Object.entries(keywords).forEach(([area, words]) => {
      if (words.some((word) => comments.includes(word))) {
        areas.push(area);
      }
    });

    return areas;
  }

  /**
   * Mettre à jour la note moyenne d'un prestataire
   */
  private static async updateProviderRating(
    tx: any,
    providerId: string,
  ): Promise<void> {
    const stats = await tx.review.aggregate({
      where: {
        providerId,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.provider.update({
      where: { id: providerId },
      data: {
        averageRating: stats._avg.rating || 0,
      },
    });
  }

  /**
   * Valider que l'utilisateur peut laisser cette évaluation
   */
  private static async validateReviewPermission(
    clientId: string,
    bookingId?: string,
  ): Promise<void> {
    if (bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          clientId,
          status: "COMPLETED",
        },
      });

      if (!booking) {
        throw new Error("Réservation non trouvée ou non terminée");
      }
    }
  }

  /**
   * Vérifier qu'une évaluation n'existe pas déjà
   */
  private static async checkExistingReview(
    clientId: string,
    bookingId?: string,
  ): Promise<any> {
    const where: any = { clientId };

    if (bookingId) where.bookingId = bookingId;

    return await prisma.review.findFirst({ where });
  }

  /**
   * Répondre à une évaluation
   */
  static async respondToReview(
    reviewId: string,
    responderId: string,
    response: string,
  ): Promise<any> {
    try {
      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
          provider: true,
        },
      });

      if (!review) {
        throw new Error("Évaluation non trouvée");
      }

      // Vérifier que celui qui répond est bien le prestataire concerné
      const canRespond =
        review.provider && review.provider.userId === responderId;

      if (!canRespond) {
        throw new Error(
          "Vous n'êtes pas autorisé à répondre à cette évaluation",
        );
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          response,
          respondedAt: new Date(),
        },
      });

      // Notifier le client de la réponse
      if (review.clientId) {
        await NotificationService.createNotification({
          userId: review.clientId,
          type: "REVIEW_RESPONSE",
          title: "💬 Réponse à votre évaluation",
          message: "Une réponse a été apportée à votre évaluation",
          data: {
            reviewId,
            response,
          },
          sendPush: true,
          priority: "medium",
        });
      }

      return updatedReview;
    } catch (error) {
      console.error("Erreur lors de la réponse à l'évaluation:", error);
      throw error;
    }
  }

  /**
   * Obtenir le classement des meilleurs prestataires
   */
  static async getTopRatedProviders(limit: number = 10): Promise<any[]> {
    return await prisma.provider.findMany({
      where: {
        averageRating: { gt: 0 },
        isActive: true,
      },
      include: {
        user: true,
      },
      orderBy: [{ averageRating: "desc" }],
      take: limit,
    });
  }
}
