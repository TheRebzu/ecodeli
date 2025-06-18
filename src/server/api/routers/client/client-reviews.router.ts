import { z } from "zod";
import { router, protectedProcedure, clientProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { ReviewStatus } from "@prisma/client";

export const clientReviewsRouter = router({
  // Récupérer les avis du client
  getClientReviews: clientProcedure
    .input(
      z.object({
        status: z.string().optional(),
        serviceId: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const where: any = {
        clientId: userId,
      };

      if (input.status && input.status !== "all") {
        where.status = input.status as ReviewStatus;
      }

      if (input.serviceId) {
        where.serviceId = input.serviceId;
      }

      const [reviews, total] = await Promise.all([
        ctx.db.review.findMany({
          where,
          include: {
            service: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
            },
            delivery: {
              select: {
                id: true,
                deliveryAddress: true,
                pickupAddress: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
        }),
        ctx.db.review.count({ where }),
      ]);

      // Calculer la note moyenne
      const averageRating = await ctx.db.review.aggregate({
        where: { clientId: userId },
        _avg: { rating: true },
      });

      return {
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          service: review.service ? {
            id: review.service.id,
            name: review.service.name,
            category: review.service.category,
          } : null,
          provider: review.provider ? {
            id: review.provider.id,
            name: review.provider.user?.name || "Nom non disponible",
            image: review.provider.user?.image,
          } : null,
          delivery: review.delivery,
        })),
        total,
        averageRating: averageRating._avg.rating || 0,
      };
    }),

  // Soumettre un nouvel avis
  submitReview: clientProcedure
    .input(
      z.object({
        serviceId: z.string().optional(),
        deliveryId: z.string().optional(),
        providerId: z.string().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier qu'au moins un ID est fourni
      if (!input.serviceId && !input.deliveryId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Un service ou une livraison doit être spécifié",
        });
      }

      // Vérifier que le client a bien utilisé le service ou reçu la livraison
      if (input.serviceId) {
        const booking = await ctx.db.serviceBooking.findFirst({
          where: {
            serviceId: input.serviceId,
            clientId: userId,
            status: "COMPLETED",
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez évaluer que les services que vous avez utilisés",
          });
        }

        // Vérifier qu'un avis n'existe pas déjà
        const existingReview = await ctx.db.review.findFirst({
          where: {
            serviceId: input.serviceId,
            clientId: userId,
          },
        });

        if (existingReview) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Vous avez déjà évalué ce service",
          });
        }
      }

      if (input.deliveryId) {
        const delivery = await ctx.db.delivery.findFirst({
          where: {
            id: input.deliveryId,
            clientId: userId,
            status: "DELIVERED",
          },
        });

        if (!delivery) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez évaluer que les livraisons reçues",
          });
        }

        // Vérifier qu'un avis n'existe pas déjà
        const existingReview = await ctx.db.review.findFirst({
          where: {
            deliveryId: input.deliveryId,
            clientId: userId,
          },
        });

        if (existingReview) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Vous avez déjà évalué cette livraison",
          });
        }
      }

      // Créer l'avis
      const review = await ctx.db.review.create({
        data: {
          clientId: userId,
          serviceId: input.serviceId,
          deliveryId: input.deliveryId,
          providerId: input.providerId,
          rating: input.rating,
          comment: input.comment,
          status: "PUBLISHED", // Auto-approuvé pour les clients
        },
        include: {
          service: true,
          provider: {
            include: {
              user: true,
            },
          },
        },
      });

      // Mettre à jour la note moyenne du prestataire
      if (input.providerId) {
        const avgRating = await ctx.db.review.aggregate({
          where: { providerId: input.providerId },
          _avg: { rating: true },
        });

        await ctx.db.provider.update({
          where: { id: input.providerId },
          data: { rating: avgRating._avg.rating || 0 },
        });
      }

      return review;
    }),

  // Modifier un avis
  updateReview: clientProcedure
    .input(
      z.object({
        reviewId: z.string(),
        rating: z.number().min(1).max(5).optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'avis appartient au client
      const existingReview = await ctx.db.review.findFirst({
        where: {
          id: input.reviewId,
          clientId: userId,
        },
      });

      if (!existingReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avis non trouvé",
        });
      }

      // Mettre à jour l'avis
      const updatedReview = await ctx.db.review.update({
        where: { id: input.reviewId },
        data: {
          rating: input.rating,
          comment: input.comment,
          updatedAt: new Date(),
        },
        include: {
          service: true,
          provider: {
            include: {
              user: true,
            },
          },
        },
      });

      return updatedReview;
    }),

  // Supprimer un avis
  deleteReview: clientProcedure
    .input(z.object({ reviewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'avis appartient au client
      const existingReview = await ctx.db.review.findFirst({
        where: {
          id: input.reviewId,
          clientId: userId,
        },
      });

      if (!existingReview) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avis non trouvé",
        });
      }

      // Supprimer l'avis
      await ctx.db.review.delete({
        where: { id: input.reviewId },
      });

      return { success: true };
    }),

  // Voter pour l'utilité d'un avis
  voteHelpful: clientProcedure
    .input(
      z.object({
        reviewId: z.string(),
        helpful: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'avis existe
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avis non trouvé",
        });
      }

      // Vérifier qu'on ne vote pas pour son propre avis
      if (review.clientId === userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous ne pouvez pas voter pour votre propre avis",
        });
      }

      // Vérifier si un vote existe déjà
      const existingVote = await ctx.db.reviewVote.findFirst({
        where: {
          reviewId: input.reviewId,
          userId: userId,
        },
      });

      if (existingVote) {
        // Mettre à jour le vote existant
        await ctx.db.reviewVote.update({
          where: { id: existingVote.id },
          data: { helpful: input.helpful },
        });
      } else {
        // Créer un nouveau vote
        await ctx.db.reviewVote.create({
          data: {
            reviewId: input.reviewId,
            userId: userId,
            helpful: input.helpful,
          },
        });
      }

      return { success: true };
    }),

  // Signaler un avis
  reportReview: clientProcedure
    .input(
      z.object({
        reviewId: z.string(),
        reason: z.string(),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que l'avis existe
      const review = await ctx.db.review.findUnique({
        where: { id: input.reviewId },
      });

      if (!review) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avis non trouvé",
        });
      }

      // Créer le signalement
      await ctx.db.reviewReport.create({
        data: {
          reviewId: input.reviewId,
          reporterId: userId,
          reason: input.reason,
          details: input.details,
        },
      });

      return { success: true };
    }),

  // Obtenir les statistiques des avis du client
  getReviewStats: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [totalReviews, avgRating, ratingDistribution] = await Promise.all([
      ctx.db.review.count({
        where: { clientId: userId },
      }),
      ctx.db.review.aggregate({
        where: { clientId: userId },
        _avg: { rating: true },
      }),
      ctx.db.review.groupBy({
        by: ["rating"],
        where: { clientId: userId },
        _count: { rating: true },
      }),
    ]);

    return {
      totalReviews,
      averageRating: avgRating._avg.rating || 0,
      ratingDistribution: ratingDistribution.map((item) => ({
        rating: item.rating,
        count: item._count.rating,
      })),
    };
  }),
});