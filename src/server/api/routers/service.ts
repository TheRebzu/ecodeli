import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const serviceRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const services = await ctx.prisma.service.findMany({
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return services;
    } catch (error) {
      console.error("Error fetching services:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch services",
      });
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const service = await ctx.prisma.service.findUnique({
          where: {
            id: input.id,
          },
          include: {
            provider: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        });

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service not found",
          });
        }

        return service;
      } catch (error) {
        console.error("Error fetching service by ID:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch service",
        });
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3),
        description: z.string().min(10),
        price: z.number().positive(),
        duration: z.number().positive(),
        category: z.string(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure user has provider role
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { role: true },
        });

        if (user?.role !== "PROVIDER") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only providers can create services",
          });
        }

        const service = await ctx.prisma.service.create({
          data: {
            ...input,
            providerId: ctx.session.user.id,
          },
        });

        return service;
      } catch (error) {
        console.error("Error creating service:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create service",
        });
      }
    }),
});
