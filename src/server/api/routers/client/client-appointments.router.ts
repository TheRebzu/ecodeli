import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour la gestion des rendez-vous clients
 * Mission 1 - CLIENT - Gestion des rendez-vous avec prestataires
 */
export const clientAppointmentsRouter = router({
  // Récupérer les rendez-vous d'un client
  getClientAppointments: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.string().optional(),
        type: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un client
        if (ctx.session.user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent accéder à leurs rendez-vous",
          });
        }

        const skip = (input.page - 1) * input.limit;
        const where: any = {
          clientId: ctx.session.user.id,
        };

        // Filtrer par période si spécifiée
        if (input.startDate) {
          where.scheduledDate = {
            ...where.scheduledDate,
            gte: new Date(input.startDate),
          };
        }
        if (input.endDate) {
          where.scheduledDate = {
            ...where.scheduledDate,
            lte: new Date(input.endDate),
          };
        }

        // Filtrer par statut si spécifié
        if (input.status && input.status !== "all") {
          where.status = input.status;
        }

        // Filtrer par type si spécifié
        if (input.type && input.type !== "all") {
          where.type = input.type;
        }

        // Récupérer les rendez-vous avec pagination
        const [appointments, total] = await Promise.all([
          ctx.db.appointment.findMany({
            where,
            orderBy: { scheduledDate: "asc" },
            skip,
            take: input.limit,
            include: {
              provider: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true,
                },
              },
              service: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  duration: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              client: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true,
                },
              },
            },
          }),
          ctx.db.appointment.count({ where }),
        ]);

        return {
          appointments,
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération des rendez-vous:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des rendez-vous",
        });
      }
    }),

  // Récupérer un rendez-vous spécifique
  getAppointmentById: protectedProcedure
    .input(z.object({ appointmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const appointment = await ctx.db.appointment.findUnique({
          where: { id: input.appointmentId },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
                phone: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                duration: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rendez-vous non trouvé",
          });
        }

        // Vérifier que l'utilisateur peut accéder à ce rendez-vous
        const isAuthorized =
          appointment.clientId === ctx.session.user.id ||
          appointment.providerId === ctx.session.user.id ||
          ctx.session.user.role === UserRole.ADMIN;

        if (!isAuthorized) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous n'avez pas accès à ce rendez-vous",
          });
        }

        return appointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération du rendez-vous:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du rendez-vous",
        });
      }
    }),

  // Créer un nouveau rendez-vous
  createAppointment: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        serviceId: z.string(),
        scheduledDate: z.string(),
        duration: z.number().min(15).max(480), // 15 minutes à 8 heures
        notes: z.string().optional(),
        location: z.string().optional(),
        isOnline: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un client
        if (ctx.session.user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent créer des rendez-vous",
          });
        }

        const scheduledDate = new Date(input.scheduledDate);

        // Vérifier que la date n'est pas dans le passé
        if (scheduledDate < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de programmer un rendez-vous dans le passé",
          });
        }

        // Vérifier que le prestataire existe et est actif
        const provider = await ctx.db.provider.findUnique({
          where: { id: input.providerId },
          include: { user: true },
        });

        if (!provider || provider.user.status !== "ACTIVE") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prestataire non trouvé ou inactif",
          });
        }

        // Vérifier que le service existe
        const service = await ctx.db.service.findUnique({
          where: { id: input.serviceId },
        });

        if (!service || service.providerId !== input.providerId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé ou non associé à ce prestataire",
          });
        }

        // Vérifier la disponibilité du prestataire
        const endDate = new Date(scheduledDate.getTime() + input.duration * 60000);

        const conflictingAppointment = await ctx.db.appointment.findFirst({
          where: {
            providerId: input.providerId,
            status: { in: ["PENDING", "CONFIRMED"] },
            OR: [
              {
                AND: [
                  { scheduledDate: { lte: scheduledDate } },
                  { endDate: { gte: scheduledDate } },
                ],
              },
              {
                AND: [
                  { scheduledDate: { lte: endDate } },
                  { endDate: { gte: endDate } },
                ],
              },
              {
                AND: [
                  { scheduledDate: { gte: scheduledDate } },
                  { endDate: { lte: endDate } },
                ],
              },
            ],
          },
        });

        if (conflictingAppointment) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Le prestataire n'est pas disponible à ce créneau",
          });
        }

        // Créer le rendez-vous
        const appointment = await ctx.db.appointment.create({
          data: {
            clientId: ctx.session.user.id,
            providerId: input.providerId,
            serviceId: input.serviceId,
            scheduledDate,
            endDate,
            duration: input.duration,
            notes: input.notes,
            location: input.location,
            isOnline: input.isOnline,
            status: "PENDING",
            totalPrice: service.price,
          },
          include: {
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        });

        return appointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la création du rendez-vous:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création du rendez-vous",
        });
      }
    }),

  // Annuler un rendez-vous
  cancelAppointment: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        reason: z.string().min(5, "La raison d'annulation doit faire au moins 5 caractères"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const appointment = await ctx.db.appointment.findUnique({
          where: { id: input.appointmentId },
        });

        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rendez-vous non trouvé",
          });
        }

        // Vérifier que l'utilisateur peut annuler ce rendez-vous
        if (appointment.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas annuler ce rendez-vous",
          });
        }

        // Vérifier que le rendez-vous peut être annulé
        if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce rendez-vous ne peut pas être annulé dans son état actuel",
          });
        }

        // Vérifier les délais d'annulation (24h minimum)
        const now = new Date();
        const timeDiff = appointment.scheduledDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible d'annuler un rendez-vous moins de 24h avant",
          });
        }

        // Annuler le rendez-vous
        const cancelledAppointment = await ctx.db.appointment.update({
          where: { id: input.appointmentId },
          data: {
            status: "CANCELLED",
            cancelReason: input.reason,
            cancelledAt: new Date(),
          },
        });

        return cancelledAppointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de l'annulation du rendez-vous:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'annulation du rendez-vous",
        });
      }
    }),

  // Reprogrammer un rendez-vous
  rescheduleAppointment: protectedProcedure
    .input(
      z.object({
        appointmentId: z.string(),
        newScheduledDate: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const appointment = await ctx.db.appointment.findUnique({
          where: { id: input.appointmentId },
        });

        if (!appointment) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Rendez-vous non trouvé",
          });
        }

        // Vérifier que l'utilisateur peut reprogrammer ce rendez-vous
        if (appointment.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas reprogrammer ce rendez-vous",
          });
        }

        // Vérifier que le rendez-vous peut être reprogrammé
        if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ce rendez-vous ne peut pas être reprogrammé dans son état actuel",
          });
        }

        const newScheduledDate = new Date(input.newScheduledDate);

        // Vérifier que la nouvelle date n'est pas dans le passé
        if (newScheduledDate < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Impossible de programmer un rendez-vous dans le passé",
          });
        }

        const newEndDate = new Date(newScheduledDate.getTime() + appointment.duration * 60000);

        // Vérifier la disponibilité du prestataire pour la nouvelle date
        const conflictingAppointment = await ctx.db.appointment.findFirst({
          where: {
            id: { not: appointment.id }, // Exclure le rendez-vous actuel
            providerId: appointment.providerId,
            status: { in: ["PENDING", "CONFIRMED"] },
            OR: [
              {
                AND: [
                  { scheduledDate: { lte: newScheduledDate } },
                  { endDate: { gte: newScheduledDate } },
                ],
              },
              {
                AND: [
                  { scheduledDate: { lte: newEndDate } },
                  { endDate: { gte: newEndDate } },
                ],
              },
              {
                AND: [
                  { scheduledDate: { gte: newScheduledDate } },
                  { endDate: { lte: newEndDate } },
                ],
              },
            ],
          },
        });

        if (conflictingAppointment) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Le prestataire n'est pas disponible à ce nouveau créneau",
          });
        }

        // Reprogrammer le rendez-vous
        const rescheduledAppointment = await ctx.db.appointment.update({
          where: { id: input.appointmentId },
          data: {
            scheduledDate: newScheduledDate,
            endDate: newEndDate,
            status: "PENDING", // Remettre en attente de confirmation
            rescheduleReason: input.reason,
            rescheduledAt: new Date(),
          },
        });

        return rescheduledAppointment;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la reprogrammation du rendez-vous:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la reprogrammation du rendez-vous",
        });
      }
    }),

  // Obtenir les statistiques des rendez-vous client
  getAppointmentStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      const [
        totalCount,
        pendingCount,
        confirmedCount,
        completedCount,
        cancelledCount,
        upcomingCount,
      ] = await Promise.all([
        ctx.db.appointment.count({
          where: { clientId: userId },
        }),
        ctx.db.appointment.count({
          where: { clientId: userId, status: "PENDING" },
        }),
        ctx.db.appointment.count({
          where: { clientId: userId, status: "CONFIRMED" },
        }),
        ctx.db.appointment.count({
          where: { clientId: userId, status: "COMPLETED" },
        }),
        ctx.db.appointment.count({
          where: { clientId: userId, status: "CANCELLED" },
        }),
        ctx.db.appointment.count({
          where: {
            clientId: userId,
            status: { in: ["PENDING", "CONFIRMED"] },
            scheduledDate: { gte: new Date() },
          },
        }),
      ]);

      return {
        totalCount,
        pendingCount,
        confirmedCount,
        completedCount,
        cancelledCount,
        upcomingCount,
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
