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
   * R�cup�re les �valuations du prestataire avec filtres
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
          createdAt: evaluation.updatedAt, // Date de l'�valuation
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
        message: "Erreur lors de la r�cup�ration des �valuations",
      });
    }
  }

  /**
   * R�cup�re une �valuation sp�cifique
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
          message: "�valuation non trouv�e",
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
        message: "Erreur lors de la r�cup�ration de l'�valuation",
      });
    }
  }

  /**
   * R�pond � une �valuation
   */
  static async respondToEvaluation(
    providerId: string,
    evaluationId: string,
    responseData: EvaluationResponseData
  ) {
    try {
      // V�rifier que l'�valuation appartient au prestataire
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
          message: "�valuation non trouv�e",
        });
      }

      if (existingEvaluation.providerResponse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous avez d�j� r�pondu � cette �valuation",
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

      // Cr�er une notification pour le client
      if (existingEvaluation.clientId) {
        await prisma.notification.create({
          data: {
            userId: existingEvaluation.clientId,
            type: "EVALUATION_RESPONSE",
            title: "R�ponse � votre �valuation",
            content: "Le prestataire a r�pondu � votre �valuation.",
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
        message: "Erreur lors de la r�ponse � l'�valuation",
      });
    }
  }

  /**
   * R�cup�re les statistiques des �valuations
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
        // Total des �valuations
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
        // �valuations r�centes (30 derniers jours)
        prisma.serviceBooking.count({
          where: {
            service: { providerId },
            rating: { not: null },
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // �valuations ce mois-ci
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

      // Calculer le taux de satisfaction (4-5 �toiles)
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
        message: "Erreur lors de la r�cup�ration des statistiques d'�valuation",
      });
    }
  }

  /**
   * R�cup�re les �valuations r�centes
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
        message: "Erreur lors de la r�cup�ration des �valuations r�centes",
      });
    }
  }

  /**
   * R�cup�re les �valuations n�cessitant une r�ponse
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
        message: "Erreur lors de la r�cup�ration des �valuations en attente",
      });
    }
  }
}