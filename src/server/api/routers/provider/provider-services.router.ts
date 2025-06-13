import { z } from "zod";
import { router, protectedProcedure } from "@/server/api/trpc";
import { serviceService } from "@/server/services/provider/provider-service.service";
import {
  createAvailabilitySchema,
  createBookingSchema,
  createReviewSchema,
  createServiceCategorySchema,
  createServiceSchema,
  searchServicesSchema,
  updateBookingSchema,
  updateServiceCategorySchema,
  updateServiceSchema,
} from "@/schemas/service/service.schema";
import { TRPCError } from "@trpc/server";

export const serviceRouter = router({
  // Endpoints publics
  getCategories: publicProcedure.query(async () => {
    return await serviceService.getServiceCategories();
  }),

  searchServices: publicProcedure
    .input(searchServicesSchema)
    .query(async ({ input: _input }) => {
      return await serviceService.searchServices(input);
    }),

  getServiceById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input: _input }) => {
      return await serviceService.getServiceById(input.id);
    }),

  getServiceReviews: publicProcedure
    .input(z.object({ serviceId: z.string().cuid() }))
    .query(async ({ input: _input }) => {
      return await serviceService.getServiceReviews(input.serviceId);
    }),

  getProviderReviews: publicProcedure
    .input(z.object({ providerId: z.string().cuid() }))
    .query(async ({ input: _input }) => {
      return await serviceService.getProviderReviews(input.providerId);
    }),

  getAvailableTimeSlots: publicProcedure
    .input(
      z.object({
        providerId: z.string().cuid(),
        serviceId: z.string().cuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ input: _input }) => {
      const {
        providerId: _providerId,
        serviceId: _serviceId,
        date: _date,
      } = input;
      return await serviceService.getAvailableTimeSlots(
        providerId,
        serviceId,
        date,
      );
    }),

  // Endpoints protégés pour tous les utilisateurs authentifiés
  createBooking: protectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur n'est pas le prestataire
      if (_ctx.session.user.id === input.providerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Vous ne pouvez pas réserver votre propre service",
        });
      }

      return await serviceService.createBooking(_ctx.session.user.id, input);
    }),

  updateBookingStatus: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return await serviceService.updateBookingStatus(
        _ctx.session.user.id,
        input,
      );
    }),

  rescheduleBooking: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return await serviceService.rescheduleBooking(
        _ctx.session.user.id,
        input,
      );
    }),

  getBookingById: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ _ctx, input: _input }) => {
      return await serviceService.getBookingById(
        _ctx.session.user.id,
        input.id,
      );
    }),

  getMyClientBookings: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "RESCHEDULED",
          ])
          .optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      return await serviceService.getClientBookings(
        _ctx.session.user.id,
        input.status,
      );
    }),

  createReview: protectedProcedure
    .input(createReviewSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return await serviceService.createReview(_ctx.session.user.id, input);
    }),

  // Endpoints pour les prestataires
  createService: protectedProcedure
    .input(createServiceSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: _ctx.session.user.id },
        select: { isProvider: true, providerVerified: true },
      });

      if (!user?.isProvider) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous devez être un prestataire pour créer un service",
        });
      }

      if (!user?.providerVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Votre compte de prestataire doit être vérifié pour créer un service",
        });
      }

      return await serviceService.createService(_ctx.session.user.id, input);
    }),

  updateService: protectedProcedure
    .input(updateServiceSchema)
    .mutation(async ({ _ctx, input: _input }) => {
      return await serviceService.updateService(_ctx.session.user.id, input);
    }),

  getMyProviderServices: protectedProcedure.query(async ({ _ctx }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: _ctx.session.user.id },
      select: { isProvider: true },
    });

    if (!user?.isProvider) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Vous devez être un prestataire pour accéder à vos services",
      });
    }

    return await serviceService.getProviderServices(_ctx.session.user.id);
  }),

  getMyProviderBookings: protectedProcedure
    .input(
      z.object({
        status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "RESCHEDULED",
          ])
          .optional(),
      }),
    )
    .query(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: _ctx.session.user.id },
        select: { isProvider: true },
      });

      if (!user?.isProvider) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour accéder à vos réservations",
        });
      }

      return await serviceService.getProviderBookings(
        _ctx.session.user.id,
        input.status,
      );
    }),

  createAvailability: protectedProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: _ctx.session.user.id },
        select: { isProvider: true },
      });

      if (!user?.isProvider) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour définir vos disponibilités",
        });
      }

      return await serviceService.createAvailability(
        _ctx.session.user.id,
        input,
      );
    }),

  getMyAvailabilities: protectedProcedure.query(async ({ _ctx }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: _ctx.session.user.id },
      select: { isProvider: true },
    });

    if (!user?.isProvider) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Vous devez être un prestataire pour accéder à vos disponibilités",
      });
    }

    return await serviceService.getProviderAvailabilities(_ctx.session.user.id);
  }),

  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ _ctx, input: _input }) => {
      return await serviceService.deleteAvailability(
        _ctx.session.user.id,
        input.id,
      );
    }),

  // Endpoints pour l'administrateur
  createCategory: protectedProcedure
    .input(createServiceCategorySchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (_ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous devez être administrateur pour créer une catégorie",
        });
      }

      return await serviceService.createServiceCategory(input);
    }),

  updateCategory: protectedProcedure
    .input(updateServiceCategorySchema)
    .mutation(async ({ _ctx, input: _input }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (_ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vous devez être administrateur pour modifier une catégorie",
        });
      }

      // Cette méthode n'est pas implémentée dans le service, il faudrait l'ajouter
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Cette fonctionnalité n'est pas encore implémentée",
      });
    }),
});
