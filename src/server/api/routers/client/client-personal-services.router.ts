import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { PersonalServiceType, ServiceBookingStatus } from "@prisma/client";

/**
 * Router pour les services personnels clients selon le cahier des charges
 * Transport, courses, garde d'animaux, achats internationaux, etc.
 */

// Schémas de validation
const createPersonalServiceRequestSchema = z.object({
  serviceType: z.nativeEnum(PersonalServiceType),
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),

  // Localisation
  location: z.object({
    address: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    postalCode: z.string().min(5).max(10),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }),

  // Dates et horaires
  requestedDate: z.date(),
  requestedTimeSlot: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  estimatedDuration: z.number().min(30).max(480), // minutes (30min à 8h)
  isFlexible: z.boolean().default(false),

  // Détails spécifiques selon le type de service
  serviceDetails: z.record(z.any()).optional(),

  // Prix et paiement
  suggestedPrice: z.number().min(10).max(1000),
  isUrgent: z.boolean().default(false),

  // Options
  requiresBackground: z.boolean().default(false), // Vérification casier judiciaire
  requiresSpecialSkills: z.array(z.string()).max(5).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
  specialInstructions: z.string().max(500).optional(),
  contactPhone: z.string().min(10).max(15).optional(),
});

const updateServiceRequestSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  requestedDate: z.date().optional(),
  requestedTimeSlot: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),
  suggestedPrice: z.number().min(10).max(1000).optional(),
  specialInstructions: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(3).optional(),
});

const serviceFiltersSchema = z.object({
  serviceType: z.array(z.nativeEnum(PersonalServiceType)).optional(),
  status: z.array(z.nativeEnum(ServiceBookingStatus)).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

const rateServiceSchema = z.object({
  bookingId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(500).optional(),
  wouldRecommend: z.boolean(),
  serviceQuality: z.number().min(1).max(5),
  punctuality: z.number().min(1).max(5),
  communication: z.number().min(1).max(5),
});

export const clientPersonalServicesRouter = router({
  /**
   * Créer une demande de service personnel
   */
  createServiceRequest: protectedProcedure
    .input(createPersonalServiceRequestSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent demander des services",
        });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Profil client non trouvé",
          });
        }

        // Vérifier les limites (max 5 demandes actives)
        const activeRequests = await ctx.db.personalServiceRequest.count({
          where: {
            clientId: client.id,
            status: { in: ["PENDING", "MATCHED", "CONFIRMED"] },
          },
        });

        if (activeRequests >= 5) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Limite de 5 demandes actives atteinte",
          });
        }

        // Créer la demande de service
        const serviceRequest = await ctx.db.personalServiceRequest.create({
          data: {
            clientId: client.id,
            serviceType: input.serviceType,
            title: input.title,
            description: input.description,

            location: input.location,
            requestedDate: input.requestedDate,
            requestedTimeSlot: input.requestedTimeSlot,
            estimatedDuration: input.estimatedDuration,
            isFlexible: input.isFlexible,

            serviceDetails: input.serviceDetails,
            suggestedPrice: input.suggestedPrice,
            isUrgent: input.isUrgent,

            requiresBackground: input.requiresBackground,
            requiresSpecialSkills: input.requiresSpecialSkills,
            photos: input.photos,
            specialInstructions: input.specialInstructions,
            contactPhone: input.contactPhone,

            status: "PENDING",
          },
        });

        // TODO: Notifier les prestataires correspondants
        // TODO: Calculer le matching automatique

        return {
          success: true,
          data: {
            ...serviceRequest,
            suggestedPrice: serviceRequest.suggestedPrice.toNumber(),
          },
          message: "Demande de service créée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la demande",
        });
      }
    }),

  /**
   * Récupérer toutes les demandes de services du client
   */
  getMyServiceRequests: protectedProcedure
    .input(serviceFiltersSchema.optional())
    .query(async ({ _ctx, input = {} }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent consulter leurs demandes",
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

        // Construire les filtres
        const where: any = {
          clientId: client.id,
          ...(input.serviceType && { serviceType: { in: input.serviceType } }),
          ...(input.status && { status: { in: input.status } }),
          ...(input.dateFrom &&
            input.dateTo && {
              requestedDate: { gte: input.dateFrom, lte: input.dateTo },
            }),
          ...(input.minPrice && { suggestedPrice: { gte: input.minPrice } }),
          ...(input.maxPrice && { suggestedPrice: { lte: input.maxPrice } }),
        };

        // Récupérer les demandes avec pagination
        const serviceRequests = await ctx.db.personalServiceRequest.findMany({
          where,
          include: {
            proposals: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    providerStats: {
                      select: {
                        averageRating: true,
                        totalServices: true,
                        responseTime: true,
                      },
                    },
                  },
                },
              },
              orderBy: { suggestedPrice: "asc" },
            },
            activeBooking: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.personalServiceRequest.count({ where });

        // Formatter les données
        const formattedRequests = serviceRequests.map((request) => ({
          ...request,
          suggestedPrice: request.suggestedPrice.toNumber(),
          proposalCount: request.proposals.length,
          lowestProposal: request.proposals[0]?.suggestedPrice?.toNumber(),
          canEdit: ["PENDING"].includes(request.status),
          canCancel: ["PENDING", "MATCHED"].includes(request.status),
          serviceTypeLabel: getServiceTypeLabel(request.serviceType),
        }));

        return {
          success: true,
          data: formattedRequests,
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
          message: "Erreur lors de la récupération des demandes",
        });
      }
    }),

  /**
   * Obtenir les détails d'une demande spécifique
   */
  getServiceRequestById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
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

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
          include: {
            proposals: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    phoneNumber: true,
                    providerStats: {
                      select: {
                        averageRating: true,
                        totalServices: true,
                        responseTime: true,
                        verificationLevel: true,
                      },
                    },
                    providerSkills: {
                      include: {
                        skill: true,
                      },
                    },
                  },
                },
              },
              orderBy: { suggestedPrice: "asc" },
            },
            activeBooking: {
              include: {
                provider: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true,
                  },
                },
                statusUpdates: {
                  orderBy: { createdAt: "desc" },
                  take: 10,
                },
              },
            },
            reviews: {
              include: {
                provider: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        });

        if (!serviceRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande de service non trouvée",
          });
        }

        return {
          success: true,
          data: {
            ...serviceRequest,
            suggestedPrice: serviceRequest.suggestedPrice.toNumber(),
            canEdit: ["PENDING"].includes(serviceRequest.status),
            canCancel: ["PENDING", "MATCHED"].includes(serviceRequest.status),
            hasActiveBooking: !!serviceRequest.activeBooking,
            serviceTypeLabel: getServiceTypeLabel(serviceRequest.serviceType),
          },
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération de la demande",
        });
      }
    }),

  /**
   * Mettre à jour une demande de service
   */
  updateServiceRequest: protectedProcedure
    .input(updateServiceRequestSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent modifier leurs demandes",
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

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
        });

        if (!serviceRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande non trouvée",
          });
        }

        // Vérifier si la demande peut être modifiée
        if (!["PENDING"].includes(serviceRequest.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette demande ne peut plus être modifiée",
          });
        }

        // Préparer les données de mise à jour
        const { id: _id, ...updateData } = input;

        // Mettre à jour la demande
        const updatedRequest = await ctx.db.personalServiceRequest.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            ...updatedRequest,
            suggestedPrice: updatedRequest.suggestedPrice.toNumber(),
          },
          message: "Demande mise à jour avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour",
        });
      }
    }),

  /**
   * Accepter une proposition de prestataire
   */
  acceptProposal: protectedProcedure
    .input(
      z.object({
        proposalId: z.string().cuid(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent accepter des propositions",
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

        // Récupérer la proposition avec la demande
        const proposal = await ctx.db.personalServiceProposal.findUnique({
          where: { id: input.proposalId },
          include: {
            serviceRequest: true,
            provider: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        });

        if (!proposal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proposition non trouvée",
          });
        }

        // Vérifier que la demande appartient au client
        if (proposal.serviceRequest.clientId !== client.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cette proposition ne vous appartient pas",
          });
        }

        // Vérifier que la proposition peut être acceptée
        if (proposal.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette proposition n'est plus disponible",
          });
        }

        // Transaction pour accepter la proposition
        const result = await ctx.db.$transaction(async (tx) => {
          // Accepter la proposition
          const acceptedProposal = await tx.personalServiceProposal.update({
            where: { id: input.proposalId },
            data: {
              status: "ACCEPTED",
              acceptedAt: new Date(),
              clientNotes: input.notes,
            },
          });

          // Rejeter toutes les autres propositions
          await tx.personalServiceProposal.updateMany({
            where: {
              serviceRequestId: proposal.serviceRequest.id,
              id: { not: input.proposalId },
              status: "PENDING",
            },
            data: {
              status: "REJECTED",
              rejectedAt: new Date(),
            },
          });

          // Créer la réservation de service
          const booking = await tx.personalServiceBooking.create({
            data: {
              serviceRequestId: proposal.serviceRequest.id,
              clientId: client.id,
              providerId: proposal.providerId,
              status: "CONFIRMED",
              confirmedAt: new Date(),
              scheduledAt: proposal.serviceRequest.requestedDate,
              agreedPrice: proposal.suggestedPrice,
              estimatedDuration: proposal.serviceRequest.estimatedDuration,
            },
          });

          // Mettre à jour la demande
          await tx.personalServiceRequest.update({
            where: { id: proposal.serviceRequest.id },
            data: {
              status: "MATCHED",
              matchedAt: new Date(),
            },
          });

          return { acceptedProposal, booking };
        });

        // TODO: Envoyer notifications
        // TODO: Créer le processus de paiement

        return {
          success: true,
          data: result,
          message: "Proposition acceptée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'acceptation de la proposition",
        });
      }
    }),

  /**
   * Annuler une demande de service
   */
  cancelServiceRequest: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().min(10).max(500),
      }),
    )
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent annuler leurs demandes",
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

        const serviceRequest = await ctx.db.personalServiceRequest.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
          include: {
            activeBooking: true,
          },
        });

        if (!serviceRequest) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Demande non trouvée",
          });
        }

        // Vérifier si la demande peut être annulée
        if (!["PENDING", "MATCHED"].includes(serviceRequest.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cette demande ne peut pas être annulée",
          });
        }

        // Vérifier s'il y a un service en cours
        if (
          serviceRequest.activeBooking &&
          ["IN_PROGRESS", "CONFIRMED"].includes(
            serviceRequest.activeBooking.status,
          )
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible d'annuler: un service est en cours",
          });
        }

        // Annuler la demande
        const cancelledRequest = await ctx.db.personalServiceRequest.update({
          where: { id: input.id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: input.reason,
          },
        });

        // Annuler toutes les propositions en attente
        await ctx.db.personalServiceProposal.updateMany({
          where: {
            serviceRequestId: input.id,
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
          },
        });

        return {
          success: true,
          data: cancelledRequest,
          message: "Demande annulée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation",
        });
      }
    }),

  /**
   * Noter et évaluer un service terminé
   */
  rateService: protectedProcedure
    .input(rateServiceSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      const { _user: __user } = ctx.session;

      if (user.role !== "CLIENT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les clients peuvent noter les services",
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

        // Récupérer la réservation
        const booking = await ctx.db.personalServiceBooking.findFirst({
          where: {
            id: input.bookingId,
            clientId: client.id,
            status: "COMPLETED",
          },
          include: {
            serviceRequest: true,
            provider: true,
          },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Réservation non trouvée ou non terminée",
          });
        }

        // Vérifier si déjà noté
        const existingReview = await ctx.db.personalServiceReview.findFirst({
          where: {
            bookingId: input.bookingId,
            clientId: client.id,
          },
        });

        if (existingReview) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce service a déjà été noté",
          });
        }

        // Créer la notation
        const review = await ctx.db.personalServiceReview.create({
          data: {
            bookingId: input.bookingId,
            serviceRequestId: booking.serviceRequest.id,
            clientId: client.id,
            providerId: booking.providerId,
            rating: input.rating,
            comment: input.comment,
            wouldRecommend: input.wouldRecommend,
            serviceQuality: input.serviceQuality,
            punctuality: input.punctuality,
            communication: input.communication,
          },
        });

        // Mettre à jour les statistiques du prestataire
        const allReviews = await ctx.db.personalServiceReview.findMany({
          where: { providerId: booking.providerId },
        });

        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const recommendationRate =
          (allReviews.filter((r) => r.wouldRecommend).length /
            allReviews.length) *
          100;

        await ctx.db.providerStats.upsert({
          where: { providerId: booking.providerId },
          update: {
            averageRating: avgRating,
            totalServices: { increment: 1 },
            recommendationRate,
          },
          create: {
            providerId: booking.providerId,
            averageRating: avgRating,
            totalServices: 1,
            recommendationRate,
          },
        });

        return {
          success: true,
          data: review,
          message: "Évaluation enregistrée avec succès",
        };
      } catch (_error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'enregistrement de l'évaluation",
        });
      }
    }),

  /**
   * Obtenir les types de services disponibles
   */
  getAvailableServiceTypes: protectedProcedure.query(async ({ _ctx }) => {
    const serviceTypes = [
      {
        type: "PERSON_TRANSPORT",
        name: "Transport de personnes",
        description: "Accompagnement et transport de personnes",
        estimatedPrice: { min: 15, max: 50 },
        averageDuration: 60,
      },
      {
        type: "SHOPPING_SERVICE",
        name: "Service de courses",
        description: "Courses et achats pour vous",
        estimatedPrice: { min: 20, max: 80 },
        averageDuration: 90,
      },
      {
        type: "PET_SITTING",
        name: "Garde d'animaux",
        description: "Garde et promenade d'animaux",
        estimatedPrice: { min: 25, max: 60 },
        averageDuration: 120,
      },
      {
        type: "HOME_SERVICE",
        name: "Services à domicile",
        description: "Petits services et réparations",
        estimatedPrice: { min: 30, max: 100 },
        averageDuration: 120,
      },
      {
        type: "INTERNATIONAL_PURCHASE",
        name: "Achats internationaux",
        description: "Achats depuis l'étranger",
        estimatedPrice: { min: 50, max: 200 },
        averageDuration: 1440, // 24h
      },
    ];

    return {
      success: true,
      data: serviceTypes,
    };
  }),
});

// Helper functions
function getServiceTypeLabel(serviceType: PersonalServiceType): string {
  const labels = {
    PERSON_TRANSPORT: "Transport de personnes",
    SHOPPING_SERVICE: "Service de courses",
    PET_SITTING: "Garde d'animaux",
    HOME_SERVICE: "Services à domicile",
    INTERNATIONAL_PURCHASE: "Achats internationaux",
  };

  return labels[serviceType] || serviceType;
}
