import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Router pour les évaluations et retours d'expérience des prestataires
 * Système complet de notation, commentaires et amélioration continue selon le cahier des charges
 */

// Schémas de validation
const createReviewSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),

  // Évaluation détaillée par critères
  criteria: z.object({
    punctuality: z.number().int().min(1).max(5), // Ponctualité
    communication: z.number().int().min(1).max(5), // Communication
    professionalism: z.number().int().min(1).max(5), // Professionnalisme
    qualityOfWork: z.number().int().min(1).max(5), // Qualité du travail
    valueForMoney: z.number().int().min(1).max(5), // Rapport qualité-prix
  }),

  // Détails spécifiques
  wouldRecommend: z.boolean(),
  highlights: z.array(z.string()).max(5), // Points forts
  improvements: z.array(z.string()).max(5), // Suggestions d'amélioration

  // Médias
  photos: z.array(z.string().url()).max(5),

  // Confidentialité
  isAnonymous: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

const providerResponseSchema = z.object({
  reviewId: z.string().cuid(),
  response: z.string().min(10).max(500),
  isPublic: z.boolean().default(true),
});

const reviewFiltersSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  serviceId: z.string().cuid().optional(),
  includeResponded: z.boolean().default(true),
  includeUnresponded: z.boolean().default(true),
  isPublic: z.boolean().optional(),
  sortBy: z.enum(["date", "rating", "helpful"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const evaluationAnalysisSchema = z.object({
  period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR"]).default("MONTH"),
  serviceId: z.string().cuid().optional(),
  compareWithPrevious: z.boolean().default(false),
});

export const providerEvaluationsRouter = router({
  /**
   * Créer une évaluation (par un client)
   */
  createReview: protectedProcedure
    .input(createReviewSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent créer des évaluations",
        });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil client non trouvé",
          });
        }

        // Vérifier que la réservation existe et appartient au client
        const booking = await ctx.db.serviceBooking.findFirst({
          where: {
            id: input.bookingId,
            clientId: client.id,
            status: "COMPLETED",
          },
          include: {
            provider: true,
            service: true,
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Réservation non trouvée ou non terminée",
          });
        }

        // Vérifier qu'il n'y a pas déjà une évaluation
        const existingReview = await ctx.db.serviceReview.findFirst({
          where: {
            bookingId: input.bookingId,
          },
        });

        if (existingReview) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Une évaluation existe déjà pour cette réservation",
          });
        }

        // Vérifier la limite de temps (30 jours après la prestation)
        const daysSinceCompletion = Math.floor(
          (new Date().getTime() - booking.completedAt!.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceCompletion > 30) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Délai dépassé pour évaluer cette prestation (30 jours maximum)",
          });
        }

        // Calculer la note globale à partir des critères
        const criteriaValues = Object.values(input.criteria);
        const averageRating =
          criteriaValues.reduce((sum, rating) => sum + rating, 0) /
          criteriaValues.length;

        // Créer l'évaluation
        const review = await ctx.db.serviceReview.create({
          data: {
            bookingId: input.bookingId,
            clientId: client.id,
            providerId: booking.providerId,
            serviceId: booking.serviceId,

            rating: input.rating,
            comment: input.comment,
            criteria: input.criteria,
            wouldRecommend: input.wouldRecommend,
            highlights: input.highlights,
            improvements: input.improvements,
            photos: input.photos,
            isAnonymous: input.isAnonymous,
            isPublic: input.isPublic,

            // Métadonnées calculées
            averageCriteriaRating: averageRating,
            helpfulCount: 0,
            reportCount: 0,
          },
        });

        // Mettre à jour les statistiques du prestataire
        await updateProviderRating(_ctx.db, booking.providerId);

        // Mettre à jour les statistiques du service
        await updateServiceRating(_ctx.db, booking.serviceId);

        return {
          success: true,
          data: review,
          message: "Évaluation créée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'évaluation",
        });
      }
    }),

  /**
   * Répondre à une évaluation (par le prestataire)
   */
  respondToReview: protectedProcedure
    .input(providerResponseSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent répondre aux évaluations",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        // Vérifier que l'évaluation existe et concerne ce prestataire
        const review = await ctx.db.serviceReview.findFirst({
          where: {
            id: input.reviewId,
            providerId: provider.id,
          },
        });

        if (!review) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Évaluation non trouvée",
          });
        }

        // Vérifier qu'il n'y a pas déjà une réponse
        if (review.providerResponse) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Une réponse existe déjà pour cette évaluation",
          });
        }

        // Ajouter la réponse
        const updatedReview = await ctx.db.serviceReview.update({
          where: { id: input.reviewId },
          data: {
            providerResponse: input.response,
            providerResponseDate: new Date(),
            providerResponsePublic: input.isPublic,
          },
        });

        return {
          success: true,
          data: updatedReview,
          message: "Réponse ajoutée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'ajout de la réponse",
        });
      }
    }),

  /**
   * Obtenir les évaluations du prestataire
   */
  getMyReviews: protectedProcedure
    .input(reviewFiltersSchema)
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent consulter leurs évaluations",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        // Construire les filtres
        const where: any = {
          providerId: provider.id,
          ...(input.rating && { rating: input.rating }),
          ...(input.serviceId && { serviceId: input.serviceId }),
          ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo },
            }),
        };

        // Filtres de réponse
        if (!input.includeResponded) {
          where.providerResponse = null;
        }
        if (!input.includeUnresponded) {
          where.providerResponse = { not: null };
        }

        const orderBy: any = {};
        switch (input.sortBy) {
          case "rating":
            orderBy.rating = input.sortOrder;
            break;
          case "helpful":
            orderBy.helpfulCount = input.sortOrder;
            break;
          default:
            orderBy.createdAt = input.sortOrder;
        }

        const [reviews, totalCount] = await Promise.all([
          _ctx.db.serviceReview.findMany({
            where,
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      name: true,
                      profilePicture: true,
                      city: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  name: true,
                  category: true,
                },
              },
              booking: {
                select: {
                  scheduledAt: true,
                  completedAt: true,
                  totalPrice: true,
                },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.serviceReview.count({ where }),
        ]);

        // Formatter les données
        const formattedReviews = reviews.map((review) => ({
          ...review,
          client: review.isAnonymous
            ? null
            : {
                name: review.client.user.name,
                profilePicture: review.client.user.profilePicture,
                city: review.client.user.city,
              },
          service: review.service,
          booking: review.booking,
          hasResponse: !!review.providerResponse,
          canRespond: !review.providerResponse,
          daysSinceReview: Math.floor(
            (new Date().getTime() - review.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        }));

        return {
          success: true,
          data: formattedReviews,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des évaluations",
        });
      }
    }),

  /**
   * Obtenir les évaluations publiques d'un prestataire
   */
  getPublicReviews: publicProcedure
    .input(
      z.object({
        providerId: z.string().cuid(),
        serviceId: z.string().cuid().optional(),
        rating: z.number().int().min(1).max(5).optional(),
        sortBy: z.enum(["date", "rating", "helpful"]).default("date"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      try {
        const where: any = {
          providerId: input.providerId,
          isPublic: true,
          ...(input.serviceId && { serviceId: input.serviceId }),
          ...(input.rating && { rating: input.rating }),
        };

        const orderBy: any = {};
        switch (input.sortBy) {
          case "rating":
            orderBy.rating = input.sortOrder;
            break;
          case "helpful":
            orderBy.helpfulCount = input.sortOrder;
            break;
          default:
            orderBy.createdAt = input.sortOrder;
        }

        const [reviews, totalCount] = await Promise.all([
          _ctx.db.serviceReview.findMany({
            where,
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      name: true,
                      profilePicture: true,
                      city: true,
                    },
                  },
                },
              },
              service: {
                select: {
                  name: true,
                  category: true,
                },
              },
            },
            orderBy,
            skip: input.offset,
            take: input.limit,
          }),
          ctx.db.serviceReview.count({ where }),
        ]);

        // Formatter les données publiques
        const formattedReviews = reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          criteria: review.criteria,
          wouldRecommend: review.wouldRecommend,
          highlights: review.highlights,
          photos: review.photos,
          createdAt: review.createdAt,
          helpfulCount: review.helpfulCount,

          client: review.isAnonymous
            ? {
                name: "Client anonyme",
                profilePicture: null,
                city: null,
              }
            : {
                name: review.client.user.name,
                profilePicture: review.client.user.profilePicture,
                city: review.client.user.city,
              },

          service: review.service,

          providerResponse: review.providerResponsePublic
            ? {
                response: review.providerResponse,
                date: review.providerResponseDate,
              }
            : null,

          daysSinceReview: Math.floor(
            (new Date().getTime() - review.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        }));

        return {
          success: true,
          data: formattedReviews,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (_error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des évaluations",
        });
      }
    }),

  /**
   * Obtenir l'analyse détaillée des évaluations
   */
  getEvaluationAnalysis: protectedProcedure
    .input(evaluationAnalysisSchema)
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "PROVIDER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les prestataires peuvent consulter leur analyse",
        });
      }

      try {
        const provider = await ctx.db.provider.findUnique({
          where: { userId: user.id },
        });

        if (!provider) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil prestataire non trouvé",
          });
        }

        const { startDate, endDate, previousStartDate, previousEndDate } =
          calculateAnalysisPeriod(input.period, input.compareWithPrevious);

        const baseWhere = {
          providerId: provider.id,
          ...(input.serviceId && { serviceId: input.serviceId }),
        };

        // Statistiques période actuelle
        const [
          currentReviews,
          currentStats,
          ratingDistribution,
          criteriaAverages,
          topHighlights,
          commonImprovements,
          responseRate,
        ] = await Promise.all([
          // Reviews de la période
          _ctx.db.serviceReview.findMany({
            where: {
              ...baseWhere,
              createdAt: { gte: startDate, lte: endDate },
            },
            include: {
              service: { select: { name: true } },
            },
          }),

          // Statistiques générales
          ctx.db.serviceReview.aggregate({
            where: {
              ...baseWhere,
              createdAt: { gte: startDate, lte: endDate },
            },
            _avg: {
              rating: true,
              averageCriteriaRating: true,
            },
            _count: true,
          }),

          // Distribution des notes
          ctx.db.serviceReview.groupBy({
            by: ["rating"],
            where: {
              ...baseWhere,
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: true,
          }),

          // Moyennes par critères
          ctx.db.$queryRaw`
            SELECT 
              AVG((criteria->>'punctuality')::float) as punctuality,
              AVG((criteria->>'communication')::float) as communication,
              AVG((criteria->>'professionalism')::float) as professionalism,
              AVG((criteria->>'qualityOfWork')::float) as qualityOfWork,
              AVG((criteria->>'valueForMoney')::float) as valueForMoney
            FROM "ServiceReview" 
            WHERE provider_id = ${provider.id}
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
              ${input.serviceId ? `AND service_id = '${input.serviceId}'` : ""}
          `,

          // Points forts les plus mentionnés
          ctx.db.$queryRaw`
            SELECT highlight, COUNT(*) as count
            FROM "ServiceReview", 
                 unnest(highlights) as highlight
            WHERE provider_id = ${provider.id}
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
              ${input.serviceId ? `AND service_id = '${input.serviceId}'` : ""}
            GROUP BY highlight
            ORDER BY count DESC
            LIMIT 10
          `,

          // Améliorations suggérées
          ctx.db.$queryRaw`
            SELECT improvement, COUNT(*) as count
            FROM "ServiceReview", 
                 unnest(improvements) as improvement
            WHERE provider_id = ${provider.id}
              AND created_at >= ${startDate}
              AND created_at <= ${endDate}
              ${input.serviceId ? `AND service_id = '${input.serviceId}'` : ""}
            GROUP BY improvement
            ORDER BY count DESC
            LIMIT 10
          `,

          // Taux de réponse
          ctx.db.serviceReview.aggregate({
            where: {
              ...baseWhere,
              createdAt: { gte: startDate, lte: endDate },
            },
            _count: {
              _all: true,
              providerResponse: true,
            },
          }),
        ]);

        // Comparaison avec période précédente si demandée
        const comparison = null;
        if (input.compareWithPrevious) {
          const previousStats = await ctx.db.serviceReview.aggregate({
            where: {
              ...baseWhere,
              createdAt: { gte: previousStartDate!, lte: previousEndDate! },
            },
            _avg: {
              rating: true,
              averageCriteriaRating: true,
            },
            _count: true,
          });

          comparison = {
            reviewsCount: calculateGrowthRate(
              currentStats._count,
              previousStats._count,
            ),
            averageRating: calculateGrowthRate(
              currentStats._avg.rating || 0,
              previousStats._avg.rating || 0,
            ),
          };
        }

        // Analyse des tendances temporelles
        const timeline = await ctx.db.$queryRaw`
          SELECT 
            DATE_TRUNC('week', created_at) as period,
            COUNT(*)::int as reviews_count,
            AVG(rating)::float as avg_rating,
            COUNT(CASE WHEN would_recommend = true THEN 1 END)::int as recommendations
          FROM "ServiceReview"
          WHERE provider_id = ${provider.id}
            AND created_at >= ${startDate}
            AND created_at <= ${endDate}
            ${input.serviceId ? `AND service_id = '${input.serviceId}'` : ""}
          GROUP BY DATE_TRUNC('week', created_at)
          ORDER BY period ASC
        `;

        // Calculer le Net Promoter Score (NPS)
        const recommendCount = currentReviews.filter(
          (r) => r.wouldRecommend,
        ).length;
        const totalReviews = currentReviews.length;
        const nps =
          totalReviews > 0 ? (recommendCount / totalReviews) * 100 : 0;

        return {
          success: true,
          data: {
            period: {
              type: input.period,
              startDate,
              endDate,
              serviceId: input.serviceId,
            },
            overview: {
              totalReviews: currentStats._count,
              averageRating: currentStats._avg.rating || 0,
              averageCriteriaRating:
                currentStats._avg.averageCriteriaRating || 0,
              recommendationRate: nps,
              responseRate:
                responseRate._count._all > 0
                  ? (responseRate._count.providerResponse /
                      responseRate._count._all) *
                    100
                  : 0,
            },
            ratingDistribution: ratingDistribution.map((item) => ({
              rating: item.rating,
              count: item._count,
              percentage:
                totalReviews > 0 ? (item._count / totalReviews) * 100 : 0,
            })),
            criteriaAnalysis: criteriaAverages[0] || {},
            insights: {
              topHighlights: topHighlights.slice(0, 5),
              improvementAreas: commonImprovements.slice(0, 5),
              timeline: timeline,
            },
            comparison,
            recommendations: generateImprovementRecommendations(
              criteriaAverages[0],
              commonImprovements,
              currentStats._avg.rating || 0,
            ),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'analyse des évaluations",
        });
      }
    }),

  /**
   * Marquer une évaluation comme utile
   */
  markReviewHelpful: protectedProcedure
    .input(
      z.object({
        reviewId: z.string().cuid(),
        helpful: z.boolean(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      try {
        // Vérifier que l'utilisateur n'a pas déjà marqué cet avis
        const existingVote = await ctx.db.reviewHelpfulVote.findFirst({
          where: {
            reviewId: input.reviewId,
            userId: user.id,
          },
        });

        if (existingVote) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous avez déjà voté pour cet avis",
          });
        }

        // Ajouter le vote
        await ctx.db.$transaction(async (tx) => {
          await tx.reviewHelpfulVote.create({
            data: {
              reviewId: input.reviewId,
              userId: user.id,
              helpful: input.helpful,
            },
          });

          // Mettre à jour le compteur
          await tx.serviceReview.update({
            where: { id: input.reviewId },
            data: {
              helpfulCount: input.helpful ? { increment: 1 } : { increment: 0 },
            },
          });
        });

        return {
          success: true,
          message: "Vote enregistré avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'enregistrement du vote",
        });
      }
    }),
});

// Helper functions
async function updateProviderRating(
  db: any,
  providerId: string,
): Promise<void> {
  const stats = await db.serviceReview.aggregate({
    where: { providerId },
    _avg: { rating: true },
    _count: true,
  });

  await db.provider.update({
    where: { id: providerId },
    data: {
      rating: stats._avg.rating || 0,
      reviewCount: stats._count,
    },
  });
}

async function updateServiceRating(db: any, serviceId: string): Promise<void> {
  const stats = await db.serviceReview.aggregate({
    where: { serviceId },
    _avg: { rating: true },
    _count: true,
  });

  await db.service.update({
    where: { id: serviceId },
    data: {
      rating: stats._avg.rating || 0,
      reviewCount: stats._count,
    },
  });
}

function calculateAnalysisPeriod(period: string, includeComparison: boolean) {
  const now = new Date();
  let startDate: Date, endDate: Date;
  let previousStartDate: Date | undefined, previousEndDate: Date | undefined;

  switch (period) {
    case "WEEK":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      if (includeComparison) {
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(
          startDate.getTime() - 7 * 24 * 60 * 60 * 1000,
        );
      }
      break;
    case "MONTH":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (includeComparison) {
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      }
      break;
    case "QUARTER":
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      if (includeComparison) {
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
      }
      break;
    default: // YEAR
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      if (includeComparison) {
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      }
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function generateImprovementRecommendations(
  criteria: any,
  improvements: any[],
  averageRating: number,
): string[] {
  const recommendations: string[] = [];

  if (averageRating < 4) {
    recommendations.push(
      "Concentrez-vous sur l'amélioration de la qualité globale de vos services",
    );
  }

  if (criteria) {
    const lowestCriteria = Object.entries(criteria)
      .sort(([, a], [, b]) => (a as number) - (b as number))
      .slice(0, 2);

    lowestCriteria.forEach(([key, value]) => {
      if ((value as number) < 4) {
        switch (key) {
          case "punctuality":
            recommendations.push(
              "Améliorez votre ponctualité en arrivant à l'heure convenue",
            );
            break;
          case "communication":
            recommendations.push(
              "Renforcez votre communication avec les clients",
            );
            break;
          case "professionalism":
            recommendations.push(
              "Développez votre professionnalisme et votre présentation",
            );
            break;
          case "qualityOfWork":
            recommendations.push(
              "Focalisez-vous sur l'amélioration de la qualité de votre travail",
            );
            break;
          case "valueForMoney":
            recommendations.push(
              "Ajustez vos tarifs ou améliorez la valeur perçue de vos services",
            );
            break;
        }
      }
    });
  }

  if (improvements.length > 0) {
    const topImprovement = improvements[0];
    recommendations.push(
      `Point d'amélioration prioritaire : ${topImprovement.improvement}`,
    );
  }

  return recommendations.slice(0, 5);
}
