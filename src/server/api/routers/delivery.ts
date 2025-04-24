import { z } from 'zod';
import { router, protectedProcedure, delivererProcedure, clientProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const deliveryRouter = router({
  startDelivery: delivererProcedure
    .input(z.object({ announcementId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const delivererId = ctx.session.user.id;
      const { announcementId } = input;

      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Announcement not found',
        });
      }

      if (announcement.delivererId !== delivererId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not assigned to this delivery',
        });
      }

      if (announcement.status !== 'ASSIGNED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This delivery cannot be started',
        });
      }

      const delivery = await prisma.delivery.create({
        data: {
          announcementId,
          startTime: new Date(),
          status: 'IN_TRANSIT',
        },
      });

      await prisma.announcement.update({
        where: { id: announcementId },
        data: { status: 'IN_TRANSIT' },
      });

      return delivery;
    }),

  updateLocation: delivererProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const delivererId = ctx.session.user.id;
      const { deliveryId, latitude, longitude } = input;

      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { announcement: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Delivery not found',
        });
      }

      if (delivery.announcement.delivererId !== delivererId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not the deliverer for this delivery',
        });
      }

      if (delivery.status !== 'IN_TRANSIT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This delivery is not in transit',
        });
      }

      const locationUpdate = await prisma.locationUpdate.create({
        data: {
          deliveryId,
          latitude,
          longitude,
          timestamp: new Date(),
        },
      });

      return locationUpdate;
    }),

  completeDelivery: delivererProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        confirmationCode: z.string().optional(),
        proof: z.string().optional(), // URL to image/document
      })
    )
    .mutation(async ({ ctx, input }) => {
      const delivererId = ctx.session.user.id;
      const { deliveryId, confirmationCode, proof } = input;

      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { announcement: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Delivery not found',
        });
      }

      if (delivery.announcement.delivererId !== delivererId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not the deliverer for this delivery',
        });
      }

      if (delivery.status !== 'IN_TRANSIT') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This delivery is not in transit',
        });
      }

      // In a real app, validate the confirmation code against what was generated for this delivery
      // For now, we'll just check if it's provided when required
      if (delivery.requiresConfirmationCode && !confirmationCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Confirmation code is required',
        });
      }

      const completedDelivery = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          endTime: new Date(),
          proof,
        },
      });

      await prisma.announcement.update({
        where: { id: delivery.announcementId },
        data: { status: 'DELIVERED' },
      });

      return completedDelivery;
    }),

  confirmDelivery: clientProcedure
    .input(
      z.object({
        deliveryId: z.string(),
        rating: z.number().min(1).max(5).optional(),
        feedback: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.session.user.id;
      const { deliveryId, rating, feedback } = input;

      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: { announcement: true },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Delivery not found',
        });
      }

      if (delivery.announcement.clientId !== clientId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot confirm this delivery',
        });
      }

      if (delivery.status !== 'DELIVERED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'This delivery has not been completed yet',
        });
      }

      if (delivery.clientConfirmed) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You have already confirmed this delivery',
        });
      }

      const updatedDelivery = await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          clientConfirmed: true,
          rating,
          feedback,
        },
      });

      // Release payment to deliverer or process whatever business logic is needed
      // This would typically trigger a payment service, etc.

      return updatedDelivery;
    }),

  getDeliveryById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id } = input;

      const delivery = await prisma.delivery.findUnique({
        where: { id },
        include: {
          announcement: {
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
          },
          locationUpdates: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 20,
          },
        },
      });

      if (!delivery) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Delivery not found',
        });
      }

      const isAuthorized =
        userId === delivery.announcement.clientId ||
        userId === delivery.announcement.delivererId ||
        ctx.session.user.role === 'ADMIN';

      if (!isAuthorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to view this delivery',
        });
      }

      return delivery;
    }),

  getMyDeliveries: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
        role: z.enum(['CLIENT', 'DELIVERER']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, cursor, status, role = 'DELIVERER' } = input;

      const roleFilter = 
        role === 'DELIVERER' 
          ? { announcement: { delivererId: userId } }
          : { announcement: { clientId: userId } };

      const items = await prisma.delivery.findMany({
        take: limit + 1,
        where: {
          ...roleFilter,
          ...(status ? { status } : {}),
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          announcement: {
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
}); 