import { prisma } from "@/server/db";
import { TRPCError } from "@trpc/server";

export interface EvaluationFilters {
  rating?: number;
  serviceId?: string;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface EvaluationResponseData {
  response: string;
  isPublic?: boolean;
}

export class ProviderEvaluationService {
  /**
   * Récupère les évaluations du prestataire avec filtres
   */
  static async getEvaluations(
    providerId: string,
    filters: EvaluationFilters = {}
  ) {
    try {
      const {
        rating,
        serviceId,
        clientId,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20,
      } = filters;

      const where: any = {
        serviceBooking: {
          service: {
            providerId,
          },
        },
        rating: { not: null },
      };

      if (rating) where.rating = rating;
      if (serviceId) where.serviceBooking.serviceId = serviceId;
      if (clientId) where.serviceBooking.clientId = clientId;
      if (dateFrom) {
        where.createdAt = { gte: dateFrom };
      }
      if (dateTo) {
        where.createdAt = {
          ...where.createdAt,
          lte: dateTo,
        };
      }

      const [evaluations, total] = await Promise.all([
        prisma.serviceBooking.findMany({
          where: {
            service: { providerId },
            rating: { not: null },
          },
          include: {
            client: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            rating: { not: null },
          },
        }),
      ]);

      return {
        evaluations: evaluations.map((evaluation) => ({
          id: evaluation.id,
          rating: evaluation.rating,
          comment: evaluation.clientComment,
          providerResponse: evaluation.providerResponse,
          isProviderResponsePublic: evaluation.isProviderResponsePublic,
          clientName: `${evaluation.client.profile?.firstName} ${evaluation.client.profile?.lastName}`,
          clientAvatar: evaluation.client.profile?.avatar,
          serviceName: evaluation.service.name,
          serviceCategory: evaluation.service.category,
          serviceId: evaluation.service.id,
          clientId: evaluation.client.id,
          createdAt: evaluation.updatedAt, // Date de l'évaluation
          completedAt: evaluation.actualEndTime,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Error fetching evaluations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des évaluations",
      });
    }
  }

  /**
   * Récupère une évaluation spécifique
   */
  static async getEvaluationById(providerId: string, evaluationId: string) {
    try {
      const evaluation = await prisma.serviceBooking.findFirst({
        where: {
          id: evaluationId,
          service: {
            providerId,
          },
          rating: { not: null },
        },
        include: {
          client: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  email: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
            },
          },
        },
      });

      if (!evaluation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Évaluation non trouvée",
        });
      }

      return {
        id: evaluation.id,
        rating: evaluation.rating,
        comment: evaluation.clientComment,
        providerResponse: evaluation.providerResponse,
        isProviderResponsePublic: evaluation.isProviderResponsePublic,
        clientName: `${evaluation.client.profile?.firstName} ${evaluation.client.profile?.lastName}`,
        clientAvatar: evaluation.client.profile?.avatar,
        clientEmail: evaluation.client.profile?.email,
        serviceName: evaluation.service.name,
        serviceDescription: evaluation.service.description,
        serviceCategory: evaluation.service.category,
        serviceId: evaluation.service.id,
        clientId: evaluation.client.id,
        scheduledDate: evaluation.scheduledDate,
        completedDate: evaluation.actualEndTime,
        createdAt: evaluation.updatedAt,
        actualCost: evaluation.actualCost,
        estimatedCost: evaluation.estimatedCost,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error fetching evaluation:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération de l'évaluation",
      });
    }
  }

  /**
   * Répond à une évaluation
   */
  static async respondToEvaluation(
    providerId: string,
    evaluationId: string,
    responseData: EvaluationResponseData
  ) {
    try {
      // Vérifier que l'évaluation appartient au prestataire
      const existingEvaluation = await prisma.serviceBooking.findFirst({
        where: {
          id: evaluationId,
          service: {
            providerId,
          },
          rating: { not: null },
        },
      });

      if (!existingEvaluation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Évaluation non trouvée",
        });
      }

      if (existingEvaluation.providerResponse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous avez déjà répondu à cette évaluation",
        });
      }

      const updatedEvaluation = await prisma.serviceBooking.update({
        where: { id: evaluationId },
        data: {
          providerResponse: responseData.response,
          isProviderResponsePublic: responseData.isPublic ?? true,
          updatedAt: new Date(),
        },
      });

      // Créer une notification pour le client
      if (existingEvaluation.clientId) {
        await prisma.notification.create({
          data: {
            userId: existingEvaluation.clientId,
            type: "EVALUATION_RESPONSE",
            title: "Réponse à votre évaluation",
            content: "Le prestataire a répondu à votre évaluation.",
            data: {
              evaluationId: evaluationId,
              response: responseData.response,
            },
          },
        });
      }

      return {
        id: updatedEvaluation.id,
        providerResponse: updatedEvaluation.providerResponse,
        isProviderResponsePublic: updatedEvaluation.isProviderResponsePublic,
        updatedAt: updatedEvaluation.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      console.error("Error responding to evaluation:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la réponse à l'évaluation",
      });
    }
  }

  /**
   * Récupère les statistiques des évaluations
   */
  static async getEvaluationStats(providerId: string) {
    try {
      const [
        totalEvaluations,
        ratingDistribution,
        avgRating,
        recentEvaluations,
        monthlyEvaluations,
      ] = await Promise.all([
        // Total des évaluations
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            rating: { not: null },
          },
        }),
        // Distribution des notes
        prisma.serviceBooking.groupBy({
          by: ["rating"],
          where: {
            service: { providerId },
            rating: { not: null },
          },
          _count: {
            rating: true,
          },
        }),
        // Moyenne des notes
        prisma.serviceBooking.aggregate({
          where: {
            service: { providerId },
            rating: { not: null },
          },
          _avg: {
            rating: true,
          },
        }),
        // Évaluations récentes (30 derniers jours)
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            rating: { not: null },
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Évaluations ce mois-ci
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            rating: { not: null },
            updatedAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      // Calculer la distribution des notes en pourcentage
      const ratingPercentages = [1, 2, 3, 4, 5].map((rating) => {
        const count = ratingDistribution.find((r) => r.rating === rating)?._count.rating || 0;
        return {
          rating,
          count,
          percentage: totalEvaluations > 0 ? Math.round((count / totalEvaluations) * 100) : 0,
        };
      });

      // Calculer le taux de satisfaction (4-5 étoiles)
      const satisfactionCount = ratingDistribution
        .filter((r) => r.rating && r.rating >= 4)
        .reduce((sum, r) => sum + r._count.rating, 0);
      const satisfactionRate = totalEvaluations > 0 
        ? Math.round((satisfactionCount / totalEvaluations) * 100) 
        : 0;

      return {
        totalEvaluations,
        averageRating: Number((avgRating._avg.rating || 0).toFixed(1)),
        satisfactionRate,
        recentEvaluations,
        monthlyEvaluations,
        ratingDistribution: ratingPercentages,
        trend: {
          monthlyGrowth: monthlyEvaluations,
          recentActivity: recentEvaluations,
        },
      };
    } catch (error) {
      console.error("Error fetching evaluation stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques d'évaluation",
      });
    }
  }

  /**
   * Récupère les évaluations récentes
   */
  static async getRecentEvaluations(providerId: string, limit = 3) {
    try {
      const evaluations = await prisma.serviceBooking.findMany({
        where: {
          service: { providerId },
          rating: { not: null },
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });

      return evaluations.map((evaluation) => ({
        id: evaluation.id,
        rating: evaluation.rating,
        comment: evaluation.clientComment,
        clientName: `${evaluation.client.profile?.firstName} ${evaluation.client.profile?.lastName}`,
        clientAvatar: evaluation.client.profile?.avatar,
        serviceName: evaluation.service.name,
        createdAt: evaluation.updatedAt,
      }));
    } catch (error) {
      console.error("Error fetching recent evaluations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des évaluations récentes",
      });
    }
  }

  /**
   * Récupère les évaluations nécessitant une réponse
   */
  static async getPendingResponseEvaluations(providerId: string) {
    try {
      const evaluations = await prisma.serviceBooking.findMany({
        where: {
          service: { providerId },
          rating: { not: null },
          providerResponse: null,
          clientComment: { not: null },
        },
        include: {
          client: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return evaluations.map((evaluation) => ({
        id: evaluation.id,
        rating: evaluation.rating,
        comment: evaluation.clientComment,
        clientName: `${evaluation.client.profile?.firstName} ${evaluation.client.profile?.lastName}`,
        serviceName: evaluation.service.name,
        createdAt: evaluation.updatedAt,
        daysSinceEvaluation: Math.floor(
          (Date.now() - new Date(evaluation.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }));
    } catch (error) {
      console.error("Error fetching pending response evaluations:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des évaluations en attente",
      });
    }
  }
}