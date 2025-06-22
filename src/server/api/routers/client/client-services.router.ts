import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";

/**
 * Router pour client services - Mission 1 CLIENT
 * Gestion des réservations de services avec prestataires
 */
export const clientServicesRouter = router({
  // Rechercher des services disponibles
  searchServices: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        categoryId: z.string().optional(),
        location: z.string().optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        rating: z.number().optional(),
        available: z.boolean().default(true),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ ctx, input = {} }) => {
      try {
        const skip = ((input.page ?? 1) - 1) * (input.limit ?? 10);
        const where: any = {
          isActive: true,
        };

        // Filtre par catégorie
        if (input.categoryId) {
          where.categoryId = input.categoryId;
        }

        // Filtre par requête de recherche
        if (input.query) {
          where.OR = [
            { name: { contains: input.query, mode: "insensitive" } },
            { description: { contains: input.query, mode: "insensitive" } },
          ];
        }

        // Filtre par prix
        if (input.priceMin !== undefined || input.priceMax !== undefined) {
          where.price = {};
          if (input.priceMin !== undefined) where.price.gte = input.priceMin;
          if (input.priceMax !== undefined) where.price.lte = input.priceMax;
        }

        // Récupérer les services avec pagination
        const [services, total] = await Promise.all([
          ctx.db.service.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit ?? 10,
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
              provider: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
              _count: {
                select: {
                  bookings: true,
                },
              },
            },
          }),
          ctx.db.service.count({ where }),
        ]);

        return {
          services,
          total,
          page: input.page ?? 1,
          limit: input.limit ?? 10,
          totalPages: Math.ceil(total / (input.limit ?? 10)),
        };
      } catch (error) {
        console.error("Erreur lors de la recherche de services:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la recherche de services",
        });
      }
    }),

  // Récupérer un service par ID
  getServiceById: publicProcedure
    .input(z.object({ id: z.string() }).optional())
    .query(async ({ ctx, input = {} }) => {
      if (!input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "ID du service requis",
        });
      }
      try {
        const service = await ctx.db.service.findUnique({
          where: { id: input.id },
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                averageRating: true,
                totalReviews: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                postalCode: true,
              },
            },
            reviews: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
        });

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé",
          });
        }

        return service;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération du service:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du service",
        });
      }
    }),

  // Récupérer les créneaux disponibles d'un prestataire
  getAvailableTimeSlots: publicProcedure
    .input(
      z.object({
        serviceId: z.string(),
        providerId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }).optional()
    )
    .query(async ({ ctx, input = {} }) => {
      if (!input.serviceId || !input.providerId || !input.date) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "serviceId, providerId et date requis",
        });
      }
      try {
        const requestedDate = new Date(input.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Vérifier que la date n'est pas dans le passé
        if (requestedDate < today) {
          return { timeSlots: [] };
        }

        // Vérifier que le service existe
        const service = await ctx.db.service.findUnique({
          where: { id: input.serviceId },
          include: { provider: true },
        });

        if (!service || service.providerId !== input.providerId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé",
          });
        }

        // Récupérer les disponibilités du prestataire pour cette date
        const dayOfWeek = requestedDate.getDay();
        const availability = await ctx.db.providerAvailability.findFirst({
          where: {
            providerId: input.providerId,
            dayOfWeek,
            isActive: true,
          },
        });

        if (!availability) {
          return { timeSlots: [] };
        }

        // Récupérer les réservations existantes pour cette date
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await ctx.db.serviceBooking.findMany({
          where: {
            providerId: input.providerId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
        });

        // Générer les créneaux disponibles
        const timeSlots: string[] = [];
        const serviceDuration = service.duration || 60; // 60 minutes par défaut
        const slotInterval = 30; // Créneaux de 30 minutes

        const startHour = Math.floor(availability.startTime / 60);
        const startMinute = availability.startTime % 60;
        const endHour = Math.floor(availability.endTime / 60);
        const endMinute = availability.endTime % 60;

        let currentTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        while (currentTime + serviceDuration <= endTime) {
          const hours = Math.floor(currentTime / 60);
          const minutes = currentTime % 60;
          const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

          // Vérifier si ce créneau est libre
          const slotStart = new Date(requestedDate);
          slotStart.setHours(hours, minutes, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          const isSlotTaken = existingBookings.some((booking) => {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            return (
              (slotStart >= bookingStart && slotStart < bookingEnd) ||
              (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
              (slotStart <= bookingStart && slotEnd >= bookingEnd)
            );
          });

          if (!isSlotTaken) {
            timeSlots.push(timeString);
          }

          currentTime += slotInterval;
        }

        return { timeSlots };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la récupération des créneaux:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des créneaux",
        });
      }
    }),

  // Créer une réservation de service
  createBooking: protectedProcedure
    .input(
      z.object({
        serviceId: z.string(),
        providerId: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Vérifier que l'utilisateur est un client
        if (ctx.session.user.role !== UserRole.CLIENT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seuls les clients peuvent réserver des services",
          });
        }

        // Vérifier que l'utilisateur ne réserve pas son propre service
        if (ctx.session.user.id === input.providerId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous ne pouvez pas réserver votre propre service",
          });
        }

        // Vérifier que le service existe
        const service = await ctx.db.service.findUnique({
          where: { id: input.serviceId },
          include: { provider: true },
        });

        if (!service || service.providerId !== input.providerId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service non trouvé",
          });
        }

        // Créer les dates de début et fin
        const [hours, minutes] = input.startTime.split(":").map(Number);
        const startDateTime = new Date(input.date);
        startDateTime.setHours(hours, minutes, 0, 0);

        const endDateTime = new Date(startDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + (service.duration || 60));

        // Vérifier que le créneau est toujours disponible
        const conflictingBooking = await ctx.db.serviceBooking.findFirst({
          where: {
            providerId: input.providerId,
            status: { in: ["PENDING", "CONFIRMED"] },
            OR: [
              {
                AND: [
                  { startTime: { lte: startDateTime } },
                  { endTime: { gte: startDateTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lte: endDateTime } },
                  { endTime: { gte: endDateTime } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: startDateTime } },
                  { endTime: { lte: endDateTime } },
                ],
              },
            ],
          },
        });

        if (conflictingBooking) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ce créneau n'est plus disponible",
          });
        }

        // Créer la réservation
        const booking = await ctx.db.serviceBooking.create({
          data: {
            clientId: ctx.session.user.id,
            providerId: input.providerId,
            serviceId: input.serviceId,
            date: new Date(input.date),
            startTime: startDateTime,
            endTime: endDateTime,
            totalPrice: service.price,
            status: "PENDING",
            notes: input.notes,
          },
          include: {
            service: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        return booking;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la création de la réservation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de la réservation",
        });
      }
    }),

  // Mettre à jour le statut d'une réservation
  updateBookingStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.serviceBooking.findUnique({
          where: { id: input.id },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          });
        }

        // Vérifier les autorisations
        if (booking.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas modifier cette réservation",
          });
        }

        const updatedBooking = await ctx.db.serviceBooking.update({
          where: { id: input.id },
          data: { status: input.status },
        });

        return updatedBooking;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la mise à jour:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour de la réservation",
        });
      }
    }),

  // Reprogrammer une réservation
  rescheduleBooking: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.serviceBooking.findUnique({
          where: { id: input.id },
          include: { service: true },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          });
        }

        // Vérifier les autorisations
        if (booking.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas modifier cette réservation",
          });
        }

        // Créer les nouvelles dates
        const [hours, minutes] = input.startTime.split(":").map(Number);
        const newStartDateTime = new Date(input.date);
        newStartDateTime.setHours(hours, minutes, 0, 0);

        const newEndDateTime = new Date(newStartDateTime);
        newEndDateTime.setMinutes(newEndDateTime.getMinutes() + (booking.service.duration || 60));

        const updatedBooking = await ctx.db.serviceBooking.update({
          where: { id: input.id },
          data: {
            date: new Date(input.date),
            startTime: newStartDateTime,
            endTime: newEndDateTime,
            status: "PENDING", // Remettre en attente
          },
        });

        return updatedBooking;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la reprogrammation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la reprogrammation",
        });
      }
    }),

  // Créer une évaluation
  createReview: protectedProcedure
    .input(
      z.object({
        bookingId: z.string(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.serviceBooking.findUnique({
          where: { id: input.bookingId },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Réservation non trouvée",
          });
        }

        // Vérifier les autorisations
        if (booking.clientId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Vous ne pouvez pas évaluer cette réservation",
          });
        }

        // Vérifier que la réservation est terminée
        if (booking.status !== "COMPLETED") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Vous ne pouvez évaluer que les réservations terminées",
          });
        }

        const review = await ctx.db.serviceReview.create({
          data: {
            clientId: ctx.session.user.id,
            serviceId: booking.serviceId,
            providerId: booking.providerId,
            bookingId: input.bookingId,
            rating: input.rating,
            comment: input.comment,
          },
        });

        return review;
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        console.error("Erreur lors de la création de l'évaluation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la création de l'évaluation",
        });
      }
    }),
});
