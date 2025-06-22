import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { addDays, format, parseISO, startOfDay, endOfDay } from "date-fns";

/**
 * Routeur de gestion du planning des livreurs
 * 
 * Fonctionnalités selon Mission 1 :
 * - Gestion du planning et des déplacements
 * - Indication des trajets à l'avance
 * - Notifications pour annonces correspondantes
 */

// Schémas de validation
const createPlanningSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  startLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string()
  }),
  endLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string()
  }),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]),
  availableCapacity: z.number().min(1).max(1000), // en kg
  notes: z.string().optional()
});

const updatePlanningSchema = z.object({
  id: z.string().cuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  startLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string()
  }).optional(),
  endLocation: z.object({
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string()
  }).optional(),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]).optional(),
  availableCapacity: z.number().min(1).max(1000).optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional()
});

const filtersSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  vehicleType: z.enum(["CAR", "BIKE", "SCOOTER", "TRUCK", "VAN"]).optional()
});

export const delivererPlanningRouter = router({
  /**
   * Créer un nouveau planning de trajet
   */
  createPlanning: protectedProcedure
    .input(createPlanningSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent créer des plannings"
        });
      }

      if (!input) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Les données du planning sont requises"
        });
      }

      try {
        // Vérifier que les dates sont cohérentes
        const startDate = parseISO(input.startDate);
        const endDate = parseISO(input.endDate);

        if (endDate <= startDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début"
          });
        }

        // Créer le planning
        const planning = await ctx.db.delivererPlanning.create({
          data: {
            delivererId: user.id,
            startDate,
            endDate,
            startAddress: input.startLocation.address,
            startLatitude: input.startLocation.latitude,
            startLongitude: input.startLocation.longitude,
            startCity: input.startLocation.city,
            endAddress: input.endLocation.address,
            endLatitude: input.endLocation.latitude,
            endLongitude: input.endLocation.longitude,
            endCity: input.endLocation.city,
            vehicleType: input.vehicleType,
            availableCapacity: input.availableCapacity,
            notes: input.notes,
            status: "ACTIVE"
          },
          include: {
            deliverer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        });

        // TODO: Rechercher les annonces correspondantes et envoyer des notifications
        // await notificationService.checkMatchingAnnouncements(planning);

        return {
          success: true,
          data: planning,
          message: "Planning créé avec succès"
        };

      } catch (error) {
        console.error("Erreur lors de la création du planning:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du planning"
        });
      }
    }),

  /**
   * Obtenir tous les plannings du livreur connecté
   */
  getMyPlannings: protectedProcedure
    .input(filtersSchema.optional())
    .query(async ({ ctx, input = {} }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux plannings"
        });
      }

      try {
        const skip = ((input.page ?? 1) - 1) * (input.limit ?? 10);
        const where: any = {
          delivererId: user.id
        };

        // Filtres optionnels
        if (input.status) {
          where.status = input.status;
        }

        if (input.startDate) {
          where.startDate = {
            gte: parseISO(input.startDate)
          };
        }

        if (input.endDate) {
          where.endDate = {
            lte: parseISO(input.endDate)
          };
        }

        if (input.vehicleType) {
          where.vehicleType = input.vehicleType;
        }

        const [plannings, total] = await Promise.all([
          ctx.db.delivererPlanning.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit ?? 10,
            include: {
              _count: {
                select: {
                  matchingAnnouncements: true
                }
              }
            }
          }),
          ctx.db.delivererPlanning.count({ where })
        ]);

        return {
          plannings,
          total,
          page: input.page ?? 1,
          limit: input.limit ?? 10,
          totalPages: Math.ceil(total / (input.limit ?? 10))
        };

      } catch (error) {
        console.error("Erreur lors de la récupération des plannings:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des plannings"
        });
      }
    }),

  /**
   * Obtenir un planning par son ID
   */
  getPlanningById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }).optional())
    .query(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux plannings"
        });
      }

      if (!input?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'ID du planning est requis"
        });
      }

      try {
        const planning = await ctx.db.delivererPlanning.findUnique({
          where: {
            id: input.id,
            delivererId: user.id // Sécurité : seul le propriétaire peut voir son planning
          },
          include: {
            matchingAnnouncements: {
              include: {
                client: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            _count: {
              select: {
                matchingAnnouncements: true
              }
            }
          }
        });

        if (!planning) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planning non trouvé"
          });
        }

        return planning;

      } catch (error) {
        console.error("Erreur lors de la récupération du planning:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du planning"
        });
      }
    }),

  /**
   * Mettre à jour un planning
   */
  updatePlanning: protectedProcedure
    .input(updatePlanningSchema.optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent modifier des plannings"
        });
      }

      if (!input?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'ID du planning est requis"
        });
      }

      try {
        // Vérifier que le planning existe et appartient au livreur
        const existingPlanning = await ctx.db.delivererPlanning.findUnique({
          where: {
            id: input.id,
            delivererId: user.id
          }
        });

        if (!existingPlanning) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planning non trouvé"
          });
        }

        // Préparer les données de mise à jour
        const updateData: any = {};

        if (input.startDate) {
          updateData.startDate = parseISO(input.startDate);
        }

        if (input.endDate) {
          updateData.endDate = parseISO(input.endDate);
        }

        if (input.startLocation) {
          updateData.startAddress = input.startLocation.address;
          updateData.startLatitude = input.startLocation.latitude;
          updateData.startLongitude = input.startLocation.longitude;
          updateData.startCity = input.startLocation.city;
        }

        if (input.endLocation) {
          updateData.endAddress = input.endLocation.address;
          updateData.endLatitude = input.endLocation.latitude;
          updateData.endLongitude = input.endLocation.longitude;
          updateData.endCity = input.endLocation.city;
        }

        if (input.vehicleType) {
          updateData.vehicleType = input.vehicleType;
        }

        if (input.availableCapacity) {
          updateData.availableCapacity = input.availableCapacity;
        }

        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        if (input.status) {
          updateData.status = input.status;
        }

        // Vérifier la cohérence des dates si modifiées
        const finalStartDate = updateData.startDate || existingPlanning.startDate;
        const finalEndDate = updateData.endDate || existingPlanning.endDate;

        if (finalEndDate <= finalStartDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "La date de fin doit être postérieure à la date de début"
          });
        }

        const updatedPlanning = await ctx.db.delivererPlanning.update({
          where: { id: input.id },
          data: updateData,
          include: {
            matchingAnnouncements: {
              include: {
                client: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        return {
          success: true,
          data: updatedPlanning,
          message: "Planning mis à jour avec succès"
        };

      } catch (error) {
        console.error("Erreur lors de la mise à jour du planning:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du planning"
        });
      }
    }),

  /**
   * Supprimer un planning
   */
  deletePlanning: protectedProcedure
    .input(z.object({ id: z.string().cuid() }).optional())
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent supprimer des plannings"
        });
      }

      if (!input?.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'ID du planning est requis"
        });
      }

      try {
        // Vérifier que le planning existe et appartient au livreur
        const existingPlanning = await ctx.db.delivererPlanning.findUnique({
          where: {
            id: input.id,
            delivererId: user.id
          }
        });

        if (!existingPlanning) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Planning non trouvé"
          });
        }

        // Supprimer le planning
        await ctx.db.delivererPlanning.delete({
          where: { id: input.id }
        });

        return {
          success: true,
          message: "Planning supprimé avec succès"
        };

      } catch (error) {
        console.error("Erreur lors de la suppression du planning:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression du planning"
        });
      }
    }),

  /**
   * Obtenir les statistiques du planning
   */
  getPlanningStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { user } = ctx.session;

      if (user.role !== "DELIVERER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les livreurs peuvent accéder aux statistiques"
        });
      }

      try {
        const [
          totalPlannings,
          activePlannings,
          completedPlannings,
          totalMatchingAnnouncements
        ] = await Promise.all([
          ctx.db.delivererPlanning.count({
            where: { delivererId: user.id }
          }),
          ctx.db.delivererPlanning.count({
            where: { delivererId: user.id, status: "ACTIVE" }
          }),
          ctx.db.delivererPlanning.count({
            where: { delivererId: user.id, status: "COMPLETED" }
          }),
          ctx.db.announcement.count({
            where: {
              delivererId: user.id,
              status: { in: ["MATCHED", "IN_PROGRESS", "COMPLETED"] }
            }
          })
        ]);

        return {
          totalPlannings,
          activePlannings,
          completedPlannings,
          cancelledPlannings: totalPlannings - activePlannings - completedPlannings,
          totalMatchingAnnouncements,
          averageMatchingsPerPlanning: totalPlannings > 0 
            ? Math.round((totalMatchingAnnouncements / totalPlannings) * 100) / 100 
            : 0
        };

      } catch (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des statistiques"
        });
      }
    })
});
