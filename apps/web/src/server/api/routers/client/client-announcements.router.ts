import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import { AnnouncementStatus, AnnouncementPriority, DeliveryType } from '@prisma/client';

/**
 * Router pour les annonces clients selon le cahier des charges EcoDeli
 * Système de soumission d'annonces avec upload de photos et géolocalisation
 */

// Schémas de validation
const createAnnouncementSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  deliveryType: z.nativeEnum(DeliveryType),

  // Adresses et géolocalisation
  pickupAddress: z.string().min(5).max(200),
  pickupCity: z.string().min(2).max(100),
  pickupPostalCode: z.string().min(5).max(10),
  pickupLatitude: z.number().min(-90).max(90).optional(),
  pickupLongitude: z.number().min(-180).max(180).optional(),

  deliveryAddress: z.string().min(5).max(200),
  deliveryCity: z.string().min(2).max(100),
  deliveryPostalCode: z.string().min(5).max(10),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),

  // Dates et horaires
  pickupDate: z.date(),
  deliveryDate: z.date().optional(),
  pickupTimeSlot: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),
  deliveryTimeSlot: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),

  // Détails de l'envoi
  packageType: z.enum(['SMALL_PACKAGE', 'MEDIUM_PACKAGE', 'LARGE_PACKAGE', 'FRAGILE', 'DOCUMENTS']),
  estimatedWeight: z.number().min(0.1).max(50), // kg
  estimatedDimensions: z
    .object({
      length: z.number().min(1).max(200), // cm
      width: z.number().min(1).max(200), // cm
      height: z.number().min(1).max(200), // cm
    })
    .optional(),

  // Prix et options
  suggestedPrice: z.number().min(5).max(500),
  priority: z.nativeEnum(AnnouncementPriority).default('NORMAL'),
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  insuranceValue: z.number().min(0).max(10000).optional(),

  // Photos et instructions
  photos: z.array(z.string().url()).max(5),
  specialInstructions: z.string().max(500).optional(),
  contactPhone: z.string().min(10).max(15).optional(),

  // Options avancées
  allowPartialDelivery: z.boolean().default(false),
  requiresSignature: z.boolean().default(true),
  accessCode: z.string().max(20).optional(),
});

const updateAnnouncementSchema = z.object({
  id: z.string().cuid(),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(10).max(1000).optional(),
  suggestedPrice: z.number().min(5).max(500).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  specialInstructions: z.string().max(500).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
});

const filtersSchema = z.object({
  status: z.array(z.nativeEnum(AnnouncementStatus)).optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional(),
  priority: z.nativeEnum(AnnouncementPriority).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export const clientAnnouncementsRouter = router({
  /**
   * Récupérer toutes les annonces du client
   */
  getMyAnnouncements: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent consulter leurs annonces',
        });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        // Construire les filtres
        const where: any = {
          clientId: client.id,
          ...(input.status && { status: { in: input.status } }),
          ...(input.deliveryType && { deliveryType: input.deliveryType }),
          ...(input.priority && { priority: input.priority }),
          ...(input.dateFrom &&
            input.dateTo && {
              createdAt: { gte: input.dateFrom, lte: input.dateTo },
            }),
          ...(input.minPrice && { suggestedPrice: { gte: input.minPrice } }),
          ...(input.maxPrice && { suggestedPrice: { lte: input.maxPrice } }),
        };

        // Récupérer les annonces avec pagination
        const announcements = await ctx.db.announcement.findMany({
          where,
          include: {
            deliveries: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true,
                  },
                },
              },
            },
            proposals: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: { suggestedPrice: 'asc' },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: input.offset,
          take: input.limit,
        });

        const totalCount = await ctx.db.announcement.count({ where });

        // Formatter les données
        const formattedAnnouncements = announcements.map(announcement => ({
          ...announcement,
          suggestedPrice: announcement.suggestedPrice.toNumber(),
          estimatedDistance: announcement.estimatedDistance?.toNumber(),
          proposalCount: announcement.proposals.length,
          activeDelivery: announcement.deliveries.find(d =>
            ['ACCEPTED', 'IN_PROGRESS', 'DELIVERED'].includes(d.status)
          ),
          lowestProposal: announcement.proposals[0]?.suggestedPrice?.toNumber(),
          canEdit: ['DRAFT', 'PUBLISHED'].includes(announcement.status),
          canCancel: ['PUBLISHED', 'MATCHED'].includes(announcement.status),
        }));

        return {
          success: true,
          data: formattedAnnouncements,
          pagination: {
            total: totalCount,
            offset: input.offset,
            limit: input.limit,
            hasMore: input.offset + input.limit < totalCount,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des annonces',
        });
      }
    }),

  /**
   * Créer une nouvelle annonce
   */
  createAnnouncement: protectedProcedure
    .input(createAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent créer des annonces',
        });
      }

      try {
        // Récupérer le profil client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        // Vérifier les limites (max 10 annonces actives)
        const activeAnnouncements = await ctx.db.announcement.count({
          where: {
            clientId: client.id,
            status: { in: ['DRAFT', 'PUBLISHED', 'MATCHED'] },
          },
        });

        if (activeAnnouncements >= 10) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Limite de 10 annonces actives atteinte',
          });
        }

        // Calculer la distance estimée si coordonnées disponibles
        let estimatedDistance = null;
        if (
          input.pickupLatitude &&
          input.pickupLongitude &&
          input.deliveryLatitude &&
          input.deliveryLongitude
        ) {
          estimatedDistance = calculateDistance(
            input.pickupLatitude,
            input.pickupLongitude,
            input.deliveryLatitude,
            input.deliveryLongitude
          );
        }

        // Créer l'annonce
        const announcement = await ctx.db.announcement.create({
          data: {
            clientId: client.id,
            title: input.title,
            description: input.description,
            deliveryType: input.deliveryType,

            pickupAddress: input.pickupAddress,
            pickupCity: input.pickupCity,
            pickupPostalCode: input.pickupPostalCode,
            pickupLatitude: input.pickupLatitude,
            pickupLongitude: input.pickupLongitude,

            deliveryAddress: input.deliveryAddress,
            deliveryCity: input.deliveryCity,
            deliveryPostalCode: input.deliveryPostalCode,
            deliveryLatitude: input.deliveryLatitude,
            deliveryLongitude: input.deliveryLongitude,

            pickupDate: input.pickupDate,
            deliveryDate: input.deliveryDate,
            pickupTimeSlot: input.pickupTimeSlot,
            deliveryTimeSlot: input.deliveryTimeSlot,

            packageType: input.packageType,
            estimatedWeight: input.estimatedWeight,
            estimatedDimensions: input.estimatedDimensions,
            estimatedDistance,

            suggestedPrice: input.suggestedPrice,
            priority: input.priority,
            isUrgent: input.isUrgent,
            requiresInsurance: input.requiresInsurance,
            insuranceValue: input.insuranceValue,

            photos: input.photos,
            specialInstructions: input.specialInstructions,
            contactPhone: input.contactPhone,

            allowPartialDelivery: input.allowPartialDelivery,
            requiresSignature: input.requiresSignature,
            accessCode: input.accessCode,

            status: 'PUBLISHED', // Publier directement
            publishedAt: new Date(),
          },
          include: {
            client: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        // Créer le code de validation pour cette annonce
        const validationCode = generateValidationCode();
        await ctx.db.deliveryValidationCode.create({
          data: {
            announcementId: announcement.id,
            code: validationCode,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            isUsed: false,
          },
        });

        // TODO: Déclencher notifications aux livreurs de la zone
        // TODO: Calculer le matching automatique

        return {
          success: true,
          data: {
            ...announcement,
            validationCode, // Retourner le code au client
            suggestedPrice: announcement.suggestedPrice.toNumber(),
            estimatedDistance: announcement.estimatedDistance?.toNumber(),
          },
          message: 'Annonce créée avec succès et publiée',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de la création de l'annonce",
        });
      }
    }),

  /**
   * Mettre à jour une annonce existante
   */
  updateAnnouncement: protectedProcedure
    .input(updateAnnouncementSchema)
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent modifier leurs annonces',
        });
      }

      try {
        // Vérifier que l'annonce appartient au client
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Annonce non trouvée',
          });
        }

        // Vérifier si l'annonce peut être modifiée
        if (!['DRAFT', 'PUBLISHED'].includes(announcement.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette annonce ne peut plus être modifiée',
          });
        }

        // Préparer les données de mise à jour
        const { id, ...updateData } = input;

        // Mettre à jour l'annonce
        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: {
            ...updatedAnnouncement,
            suggestedPrice: updatedAnnouncement.suggestedPrice.toNumber(),
            estimatedDistance: updatedAnnouncement.estimatedDistance?.toNumber(),
          },
          message: 'Annonce mise à jour avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour',
        });
      }
    }),

  /**
   * Obtenir les détails d'une annonce spécifique
   */
  getAnnouncementById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès non autorisé',
        });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
          include: {
            deliveries: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    phoneNumber: true,
                    image: true,
                  },
                },
                trackingEvents: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
            proposals: {
              include: {
                deliverer: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    delivererStats: {
                      select: {
                        totalDeliveries: true,
                        averageRating: true,
                        onTimeRate: true,
                      },
                    },
                  },
                },
              },
              orderBy: { suggestedPrice: 'asc' },
            },
            validationCode: {
              select: {
                code: true,
                expiresAt: true,
                isUsed: true,
              },
            },
            payments: true,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Annonce non trouvée',
          });
        }

        return {
          success: true,
          data: {
            ...announcement,
            suggestedPrice: announcement.suggestedPrice.toNumber(),
            estimatedDistance: announcement.estimatedDistance?.toNumber(),
            canEdit: ['DRAFT', 'PUBLISHED'].includes(announcement.status),
            canCancel: ['PUBLISHED', 'MATCHED'].includes(announcement.status),
            hasActiveDelivery: announcement.deliveries.some(d =>
              ['ACCEPTED', 'IN_PROGRESS'].includes(d.status)
            ),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de la récupération de l'annonce",
        });
      }
    }),

  /**
   * Annuler une annonce
   */
  cancelAnnouncement: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        reason: z.string().min(10).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent annuler leurs annonces',
        });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.id,
            clientId: client.id,
          },
          include: {
            deliveries: true,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Annonce non trouvée',
          });
        }

        // Vérifier si l'annonce peut être annulée
        if (!['PUBLISHED', 'MATCHED'].includes(announcement.status)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cette annonce ne peut pas être annulée',
          });
        }

        // Vérifier s'il y a une livraison en cours
        const activeDelivery = announcement.deliveries.find(d =>
          ['ACCEPTED', 'IN_PROGRESS'].includes(d.status)
        );

        if (activeDelivery) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Impossible d'annuler: une livraison est en cours",
          });
        }

        // Annuler l'annonce
        const cancelledAnnouncement = await ctx.db.announcement.update({
          where: { id: input.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: input.reason,
          },
        });

        // Annuler toutes les propositions en attente
        await ctx.db.deliveryProposal.updateMany({
          where: {
            announcementId: input.id,
            status: 'PENDING',
          },
          data: {
            status: 'REJECTED',
          },
        });

        // TODO: Notifier les livreurs qui avaient fait des propositions
        // TODO: Rembourser les frais si applicable

        return {
          success: true,
          data: cancelledAnnouncement,
          message: 'Annonce annulée avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'annulation",
        });
      }
    }),

  /**
   * Accepter une proposition de livreur
   */
  acceptProposal: protectedProcedure
    .input(
      z.object({
        proposalId: z.string().cuid(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== 'CLIENT') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les clients peuvent accepter des propositions',
        });
      }

      try {
        const client = await ctx.db.client.findUnique({
          where: { userId: user.id },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Profil client non trouvé',
          });
        }

        // Récupérer la proposition avec l'annonce
        const proposal = await ctx.db.deliveryProposal.findUnique({
          where: { id: input.proposalId },
          include: {
            announcement: true,
            deliverer: {
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
            code: 'NOT_FOUND',
            message: 'Proposition non trouvée',
          });
        }

        // Vérifier que l'annonce appartient au client
        if (proposal.announcement.clientId !== client.id) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Cette proposition ne vous appartient pas',
          });
        }

        // Vérifier que la proposition peut être acceptée
        if (proposal.status !== 'PENDING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Cette proposition n'est plus disponible",
          });
        }

        // Transaction pour accepter la proposition
        const result = await ctx.db.$transaction(async tx => {
          // Accepter la proposition
          const acceptedProposal = await tx.deliveryProposal.update({
            where: { id: input.proposalId },
            data: {
              status: 'ACCEPTED',
              acceptedAt: new Date(),
              clientNotes: input.notes,
            },
          });

          // Rejeter toutes les autres propositions
          await tx.deliveryProposal.updateMany({
            where: {
              announcementId: proposal.announcement.id,
              id: { not: input.proposalId },
              status: 'PENDING',
            },
            data: {
              status: 'REJECTED',
              rejectedAt: new Date(),
            },
          });

          // Créer la livraison
          const delivery = await tx.delivery.create({
            data: {
              announcementId: proposal.announcement.id,
              clientId: client.id,
              delivererId: proposal.delivererId,
              status: 'ACCEPTED',
              acceptedAt: new Date(),
              scheduledAt: proposal.announcement.pickupDate,
              finalPrice: proposal.suggestedPrice,
            },
          });

          // Mettre à jour l'annonce
          await tx.announcement.update({
            where: { id: proposal.announcement.id },
            data: {
              status: 'MATCHED',
              matchedAt: new Date(),
            },
          });

          return { acceptedProposal, delivery };
        });

        // TODO: Envoyer notifications au livreur accepté et aux autres
        // TODO: Créer le processus de paiement

        return {
          success: true,
          data: result,
          message: 'Proposition acceptée avec succès',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de l'acceptation de la proposition",
        });
      }
    }),
});

// Helper functions
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance en km
}

function generateValidationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
