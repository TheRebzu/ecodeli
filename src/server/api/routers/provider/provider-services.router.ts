import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
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
  updateServiceSchema} from "@/schemas/service/service.schema";
import { TRPCError } from "@trpc/server";

export const serviceRouter = router({ // Endpoints publics
  getCategories: publicProcedure.query(async () => {
    return await serviceService.getServiceCategories();
   }),

  searchServices: publicProcedure
    .input(searchServicesSchema)
    .query(async ({ input  }) => {
      return await serviceService.searchServices(input);
    }),

  getServiceById: publicProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ input  }) => {
      return await serviceService.getServiceById(input.id);
    }),

  getServiceReviews: publicProcedure
    .input(z.object({ serviceId: z.string().cuid()  }))
    .query(async ({ input  }) => {
      return await serviceService.getServiceReviews(input.serviceId);
    }),

  getProviderReviews: publicProcedure
    .input(z.object({ providerId: z.string().cuid()  }))
    .query(async ({ input  }) => {
      return await serviceService.getProviderReviews(input.providerId);
    }),

  getAvailableTimeSlots: publicProcedure
    .input(
      z.object({
        providerId: z.string().cuid(),
        serviceId: z.string().cuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),
    )
    .query(async ({ input  }) => {
      const {
        providerId: providerId,
        serviceId: serviceId,
        date: date} = input;
      return await serviceService.getAvailableTimeSlots(
        providerId,
        serviceId,
        date,
      );
    }),

  // Endpoints protégés pour tous les utilisateurs authentifiés
  createBooking: protectedProcedure
    .input(createBookingSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur n'est pas le prestataire
      if (ctx.session.user.id === input.providerId) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Vous ne pouvez pas réserver votre propre service" });
      }

      return await serviceService.createBooking(ctx.session.user.id, input);
    }),

  updateBookingStatus: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.updateBookingStatus(
        ctx.session.user.id,
        input,
      );
    }),

  rescheduleBooking: protectedProcedure
    .input(updateBookingSchema)
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.rescheduleBooking(
        ctx.session.user.id,
        input,
      );
    }),

  getBookingById: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .query(async ({ ctx, input: input  }) => {
      return await serviceService.getBookingById(
        ctx.session.user.id,
        input.id,
      );
    }),

  getMyClientBookings: protectedProcedure
    .input(
      z.object({ status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "RESCHEDULED"])
          .optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      return await serviceService.getClientBookings(
        ctx.session.user.id,
        input.status,
      );
    }),

  createReview: protectedProcedure
    .input(createReviewSchema)
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.createReview(ctx.session.user.id, input);
    }),

  // Endpoints pour les prestataires
  createService: protectedProcedure
    .input(createServiceSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider: true, providerVerified: true }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être un prestataire pour créer un service" });
      }

      if (!user?.providerVerified) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Votre compte de prestataire doit être vérifié pour créer un service" });
      }

      return await serviceService.createService(ctx.session.user.id, input);
    }),

  updateService: protectedProcedure
    .input(updateServiceSchema)
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.updateService(ctx.session.user.id, input);
    }),

  getMyProviderServices: protectedProcedure.query(async ({ ctx  }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { isProvider }});

    if (!user?.isProvider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous devez être un prestataire pour accéder à vos services" });
    }

    return await serviceService.getProviderServices(ctx.session.user.id);
  }),

  getMyProviderBookings: protectedProcedure
    .input(
      z.object({ status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "RESCHEDULED"])
          .optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour accéder à vos réservations" });
      }

      return await serviceService.getProviderBookings(
        ctx.session.user.id,
        input.status,
      );
    }),

  createAvailability: protectedProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour définir vos disponibilités" });
      }

      return await serviceService.createAvailability(
        ctx.session.user.id,
        input,
      );
    }),

  getMyAvailabilities: protectedProcedure.query(async ({ ctx  }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { isProvider }});

    if (!user?.isProvider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message:
          "Vous devez être un prestataire pour accéder à vos disponibilités" });
    }

    return await serviceService.getProviderAvailabilities(ctx.session.user.id);
  }),

  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.deleteAvailability(
        ctx.session.user.id,
        input.id,
      );
    }),

  // Endpoints pour l'administrateur
  createCategory: protectedProcedure
    .input(createServiceCategorySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être administrateur pour créer une catégorie" });
      }

      return await serviceService.createServiceCategory(input);
    }),

  updateCategory: protectedProcedure
    .input(updateServiceCategorySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être administrateur pour modifier une catégorie" });
      }

      return await serviceService.updateServiceCategory(input);
    }),

  // Endpoints pour les prestataires
  createService: protectedProcedure
    .input(createServiceSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider: true, providerVerified: true }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être un prestataire pour créer un service" });
      }

      if (!user?.providerVerified) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Votre compte de prestataire doit être vérifié pour créer un service" });
      }

      return await serviceService.createService(ctx.session.user.id, input);
    }),

  updateService: protectedProcedure
    .input(updateServiceSchema)
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.updateService(ctx.session.user.id, input);
    }),

  getMyProviderServices: protectedProcedure.query(async ({ ctx  }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { isProvider }});

    if (!user?.isProvider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous devez être un prestataire pour accéder à vos services" });
    }

    return await serviceService.getProviderServices(ctx.session.user.id);
  }),

  getMyProviderBookings: protectedProcedure
    .input(
      z.object({ status: z
          .enum([
            "PENDING",
            "CONFIRMED",
            "COMPLETED",
            "CANCELLED",
            "RESCHEDULED"])
          .optional() }),
    )
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour accéder à vos réservations" });
      }

      return await serviceService.getProviderBookings(
        ctx.session.user.id,
        input.status,
      );
    }),

  createAvailability: protectedProcedure
    .input(createAvailabilitySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un prestataire
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { isProvider }});

      if (!user?.isProvider) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous devez être un prestataire pour définir vos disponibilités" });
      }

      return await serviceService.createAvailability(
        ctx.session.user.id,
        input,
      );
    }),

  getMyAvailabilities: protectedProcedure.query(async ({ ctx  }) => {
    // Vérifier que l'utilisateur est un prestataire
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { isProvider }});

    if (!user?.isProvider) {
      throw new TRPCError({ code: "FORBIDDEN",
        message:
          "Vous devez être un prestataire pour accéder à vos disponibilités" });
    }

    return await serviceService.getProviderAvailabilities(ctx.session.user.id);
  }),

  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.string().cuid()  }))
    .mutation(async ({ ctx, input: input  }) => {
      return await serviceService.deleteAvailability(
        ctx.session.user.id,
        input.id,
      );
    }),

  // Endpoints pour l'administrateur
  createCategory: protectedProcedure
    .input(createServiceCategorySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être administrateur pour créer une catégorie" });
      }

      return await serviceService.createServiceCategory(input);
    }),

  updateCategory: protectedProcedure
    .input(updateServiceCategorySchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est un administrateur
      if (ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous devez être administrateur pour modifier une catégorie" });
      }

      return await serviceService.updateServiceCategory(input);
    })});
