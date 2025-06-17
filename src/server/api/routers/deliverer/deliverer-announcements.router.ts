import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole, AnnouncementStatus, AnnouncementType } from "@prisma/client";

/**
 * Router pour les annonces des livreurs
 * Gestion des annonces de services proposés par les livreurs
 */
export const delivererAnnouncementsRouter = createTRPCRouter({
  // Récupérer les annonces du livreur
  getMyAnnouncements: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
        status: z.nativeEnum(AnnouncementStatus).optional(),
        type: z.nativeEnum(AnnouncementType).optional(),
        search: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder à leurs annonces",
        });
      }

      try {
        const where = {
          delivererId: user.id,
          ...(input.status && { status: input.status }),
          ...(input.type && { type: input.type }),
          ...(input.startDate && input.endDate && {
            createdAt: {
              gte: input.startDate,
              lte: input.endDate,
            },
          }),
          ...(input.search && {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { description: { contains: input.search, mode: "insensitive" } },
              { pickupAddress: { contains: input.search, mode: "insensitive" } },
              { destinationAddress: { contains: input.search, mode: "insensitive" } },
            ],
          }),
        };

        const [announcements, total] = await Promise.all([
          ctx.db.announcement.findMany({
            where,
            include: {
              proposals: {
                where: { delivererId: user.id },
                include: {
                  client: {
                    select: { name: true, image: true },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
              delivery: {
                select: {
                  id: true,
                  status: true,
                  completedAt: true,
                },
              },
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  proposals: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          }),
          ctx.db.announcement.count({ where }),
        ]);

        return {
          success: true,
          data: {
            announcements,
            pagination: {
              total,
              pages: Math.ceil(total / input.limit),
              currentPage: input.page,
              limit: input.limit,
            },
          },
        };
      } catch (error) {
        console.error("Erreur lors de la récupération des annonces:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des annonces",
        });
      }
    }),

  // Créer une nouvelle annonce (offre de service)
  createServiceOffer: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3, "Titre requis"),
        description: z.string().min(10, "Description requise"),
        type: z.nativeEnum(AnnouncementType),
        serviceAreas: z.array(z.string()).min(1, "Au moins une zone de service requise"),
        basePrice: z.number().positive("Prix de base requis"),
        pricePerKm: z.number().min(0, "Prix par km doit être positif"),
        maxDistance: z.number().positive("Distance maximale requise"),
        vehicleType: z.enum(["BIKE", "SCOOTER", "CAR", "VAN", "TRUCK"]),
        availableTimeSlots: z.array(
          z.object({
            dayOfWeek: z.number().min(0).max(6), // 0 = dimanche, 6 = samedi
            startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
        ).min(1, "Au moins un créneau horaire requis"),
        specialServices: z.array(z.string()).optional(),
        restrictions: z.object({
          maxWeight: z.number().positive().optional(),
          noFragile: z.boolean().default(false),
          noLiquids: z.boolean().default(false),
          refrigerated: z.boolean().default(false),
        }).optional(),
        contactPreferences: z.object({
          allowCalls: z.boolean().default(true),
          allowMessages: z.boolean().default(true),
          responseTime: z.enum(["IMMEDIATE", "WITHIN_HOUR", "WITHIN_DAY"]).default("WITHIN_HOUR"),
        }),
        photos: z.array(z.string().url()).max(5).optional(),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent créer des offres de service",
        });
      }

      try {
        // Vérifier que le livreur est vérifié et actif
        const delivererProfile = await ctx.db.delivererProfile.findUnique({
          where: { userId: user.id },
          include: {
            verificationDocuments: {
              where: { status: "APPROVED" },
            },
          },
        });

        if (!delivererProfile || !delivererProfile.isVerified) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Votre profil de livreur doit être vérifié pour créer des offres",
          });
        }

        // Vérifier qu'il n'y a pas trop d'annonces actives
        const activeAnnouncementsCount = await ctx.db.announcement.count({
          where: {
            delivererId: user.id,
            status: { in: [AnnouncementStatus.PUBLISHED, AnnouncementStatus.PENDING] },
          },
        });

        if (activeAnnouncementsCount >= 10) { // Limite à 10 annonces actives
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous avez atteint la limite d'annonces actives (10 maximum)",
          });
        }

        // Créer l'annonce
        const announcement = await ctx.db.announcement.create({
          data: {
            delivererId: user.id,
            title: input.title,
            description: input.description,
            type: input.type,
            price: input.basePrice,
            pricePerKm: input.pricePerKm,
            maxDistance: input.maxDistance,
            serviceAreas: input.serviceAreas,
            vehicleType: input.vehicleType,
            availableTimeSlots: input.availableTimeSlots,
            specialServices: input.specialServices || [],
            restrictions: input.restrictions || {},
            contactPreferences: input.contactPreferences,
            photos: input.photos || [],
            validUntil: input.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
            status: AnnouncementStatus.PENDING, // Nécessite modération
          },
          include: {
            deliverer: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        });

        // Créer une notification pour l'équipe de modération
        await ctx.db.notification.create({
          data: {
            userId: "admin", // À remplacer par un système d'admin réel
            type: "ANNOUNCEMENT_MODERATION_REQUIRED",
            title: "Nouvelle offre de service à modérer",
            message: `${user.name} a créé une nouvelle offre de service: ${input.title}`,
            data: {
              announcementId: announcement.id,
              delivererId: user.id,
              type: input.type,
            },
          },
        });

        console.log(`📢 Offre de service créée: ${announcement.title} par ${announcement.deliverer.name}`);

        return {
          success: true,
          data: announcement,
          message: "Offre de service créée avec succès. Elle sera examinée avant publication.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la création de l'offre:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'offre de service",
        });
      }
    }),

  // Mettre à jour une annonce
  updateAnnouncement: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        title: z.string().min(3).optional(),
        description: z.string().min(10).optional(),
        basePrice: z.number().positive().optional(),
        pricePerKm: z.number().min(0).optional(),
        maxDistance: z.number().positive().optional(),
        serviceAreas: z.array(z.string()).optional(),
        availableTimeSlots: z.array(
          z.object({
            dayOfWeek: z.number().min(0).max(6),
            startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          })
        ).optional(),
        specialServices: z.array(z.string()).optional(),
        restrictions: z.object({
          maxWeight: z.number().positive().optional(),
          noFragile: z.boolean().optional(),
          noLiquids: z.boolean().optional(),
          refrigerated: z.boolean().optional(),
        }).optional(),
        contactPreferences: z.object({
          allowCalls: z.boolean().optional(),
          allowMessages: z.boolean().optional(),
          responseTime: z.enum(["IMMEDIATE", "WITHIN_HOUR", "WITHIN_DAY"]).optional(),
        }).optional(),
        photos: z.array(z.string().url()).max(5).optional(),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            delivererId: user.id,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée",
          });
        }

        if (announcement.status === AnnouncementStatus.COMPLETED) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de modifier une annonce terminée",
          });
        }

        // Filtrer les champs non définis
        const updateData = Object.fromEntries(
          Object.entries({
            title: input.title,
            description: input.description,
            price: input.basePrice,
            pricePerKm: input.pricePerKm,
            maxDistance: input.maxDistance,
            serviceAreas: input.serviceAreas,
            availableTimeSlots: input.availableTimeSlots,
            specialServices: input.specialServices,
            restrictions: input.restrictions,
            contactPreferences: input.contactPreferences,
            photos: input.photos,
            validUntil: input.validUntil,
            updatedAt: new Date(),
          }).filter(([_, value]) => value !== undefined)
        );

        // Si des modifications importantes, remettre en modération
        const importantFields = ["title", "description", "price", "type"];
        const hasImportantChanges = importantFields.some(field => 
          updateData[field] !== undefined && updateData[field] !== announcement[field]
        );

        if (hasImportantChanges && announcement.status === AnnouncementStatus.PUBLISHED) {
          updateData.status = AnnouncementStatus.PENDING;
        }

        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.announcementId },
          data: updateData,
        });

        return {
          success: true,
          data: updatedAnnouncement,
          message: hasImportantChanges && announcement.status === AnnouncementStatus.PUBLISHED
            ? "Annonce mise à jour. Elle sera réexaminée avant republication."
            : "Annonce mise à jour avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la mise à jour:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de l'annonce",
        });
      }
    }),

  // Désactiver/Réactiver une annonce
  toggleAnnouncementStatus: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        active: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            delivererId: user.id,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée",
          });
        }

        const newStatus = input.active 
          ? (announcement.status === AnnouncementStatus.PAUSED ? AnnouncementStatus.PUBLISHED : announcement.status)
          : AnnouncementStatus.PAUSED;

        const updatedAnnouncement = await ctx.db.announcement.update({
          where: { id: input.announcementId },
          data: {
            status: newStatus,
            pausedReason: input.active ? null : input.reason,
            pausedAt: input.active ? null : new Date(),
          },
        });

        return {
          success: true,
          data: updatedAnnouncement,
          message: input.active ? "Annonce réactivée" : "Annonce mise en pause",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors du changement de statut:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du changement de statut",
        });
      }
    }),

  // Supprimer une annonce
  deleteAnnouncement: protectedProcedure
    .input(z.object({ announcementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;

      if (user.role !== UserRole.DELIVERER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès non autorisé",
        });
      }

      try {
        const announcement = await ctx.db.announcement.findFirst({
          where: {
            id: input.announcementId,
            delivererId: user.id,
          },
          include: {
            proposals: {
              where: {
                status: { in: ["PENDING", "ACCEPTED"] },
              },
            },
            delivery: true,
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Annonce non trouvée",
          });
        }

        // Vérifier qu'il n'y a pas de propositions actives ou de livraison en cours
        if (announcement.proposals.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de supprimer une annonce avec des propositions actives",
          });
        }

        if (announcement.delivery && announcement.delivery.status !== "DELIVERED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de supprimer une annonce avec une livraison en cours",
          });
        }

        await ctx.db.announcement.delete({
          where: { id: input.announcementId },
        });

        return {
          success: true,
          message: "Annonce supprimée avec succès",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Erreur lors de la suppression:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression de l'annonce",
        });
      }
    }),

  // Obtenir les statistiques des annonces
  getAnnouncementStats: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (user.role !== UserRole.DELIVERER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès non autorisé",
      });
    }

    try {
      const [totalStats, statusStats, performanceStats] = await Promise.all([
        ctx.db.announcement.aggregate({
          where: { delivererId: user.id },
          _count: { id: true },
          _avg: { price: true },
          _sum: { price: true },
        }),
        ctx.db.announcement.groupBy({
          by: ["status"],
          where: { delivererId: user.id },
          _count: { id: true },
        }),
        ctx.db.proposal.aggregate({
          where: {
            announcement: { delivererId: user.id },
            status: "ACCEPTED",
          },
          _count: { id: true },
        }),
      ]);

      const successRate = totalStats._count.id > 0 
        ? (performanceStats._count.id / totalStats._count.id) * 100 
        : 0;

      return {
        success: true,
        data: {
          total: {
            announcements: totalStats._count.id || 0,
            averagePrice: totalStats._avg.price || 0,
            totalValue: totalStats._sum.price || 0,
          },
          byStatus: statusStats.reduce((acc: Record<string, number>, stat: any) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {}),
          performance: {
            acceptedProposals: performanceStats._count.id || 0,
            successRate: Math.round(successRate * 100) / 100,
          },
        },
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des statistiques:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des statistiques",
      });
    }
  }),
});
