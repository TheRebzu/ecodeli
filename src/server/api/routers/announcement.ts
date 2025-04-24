import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, clientProcedure, delivererProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const announcementRouter = router({
  create: clientProcedure
    .input(
      z.object({
        title: z.string().min(5).max(100),
        description: z.string().min(10).max(500),
        pickupAddress: z.string().min(5),
        deliveryAddress: z.string().min(5),
        packageSize: z.enum(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
        packageWeight: z.number().positive(),
        packageValue: z.number().nonnegative(),
        deadline: z.date(),
        price: z.number().positive(),
        requiresInsurance: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const announcement = await prisma.announcement.create({
        data: {
          ...input,
          clientId: userId,
          status: 'OPEN',
        },
      });

      return announcement;
    }),

  getAll: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(['OPEN', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, status } = input;
      const items = await prisma.announcement.findMany({
        take: limit + 1,
        where: status ? { status } : undefined,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          deliverer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      return announcement;
    }),

  getMine: clientProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(['OPEN', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, cursor, status } = input;
      
      const items = await prisma.announcement.findMany({
        take: limit + 1,
        where: {
          clientId: userId,
          ...(status ? { status } : {}),
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          deliverer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  acceptAnnouncement: delivererProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const delivererId = ctx.session.user.id;
      const { id } = input;

      const announcement = await prisma.announcement.findUnique({
        where: { id },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      if (announcement.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This announcement is not available',
        });
      }

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: {
          delivererId,
          status: 'ASSIGNED',
        },
      });

      return updatedAnnouncement;
    }),

  cancelAnnouncement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
      const { id } = input;

      const announcement = await prisma.announcement.findUnique({
        where: { id },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      if (userRole !== 'ADMIN' && announcement.clientId !== userId && announcement.delivererId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot cancel this announcement',
        });
      }

      if (['DELIVERED', 'CANCELLED'].includes(announcement.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This announcement cannot be cancelled',
        });
      }

      const updatedAnnouncement = await prisma.announcement.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      return updatedAnnouncement;
    }),
}); 