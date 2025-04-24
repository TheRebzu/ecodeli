import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export const paymentRouter = router({
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        announcementId: z.string(),
        paymentType: z.enum(['ANNOUNCEMENT_CREATION', 'DELIVERER_PAYMENT', 'SUBSCRIPTION']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { announcementId, paymentType } = input;

      let amount = 0;
      let description = '';

      // Determine the amount to charge based on payment type
      if (paymentType === 'ANNOUNCEMENT_CREATION') {
        const announcement = await prisma.announcement.findUnique({
          where: { id: announcementId },
        });

        if (!announcement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Announcement not found',
          });
        }

        if (announcement.clientId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not authorized to pay for this announcement',
          });
        }

        amount = announcement.price * 100; // Convert to cents for Stripe
        description = `Payment for announcement: ${announcement.title}`;
      } else if (paymentType === 'DELIVERER_PAYMENT') {
        const announcement = await prisma.announcement.findUnique({
          where: { id: announcementId },
          include: {
            deliveries: {
              where: { status: 'DELIVERED' },
            },
          },
        });

        if (!announcement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Announcement not found',
          });
        }

        if (announcement.clientId !== userId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not authorized to pay for this delivery',
          });
        }

        if (announcement.deliveries.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'No completed delivery found for this announcement',
          });
        }

        amount = announcement.price * 100; // Convert to cents for Stripe
        description = `Payment to deliverer for announcement: ${announcement.title}`;
      } else if (paymentType === 'SUBSCRIPTION') {
        // Handle subscription payment logic
        // This would typically look up a subscription plan price
        const subscriptionAmount = 2999; // $29.99 for example
        amount = subscriptionAmount;
        description = 'Monthly subscription payment';
      }

      try {
        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'eur',
          metadata: {
            userId,
            announcementId,
            paymentType,
          },
          description,
        });

        return {
          clientSecret: paymentIntent.client_secret,
          amount: amount / 100, // Convert back to decimal for display
        };
      } catch (error) {
        console.error('Error creating payment intent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment intent',
        });
      }
    }),

  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        type: z.enum(['ANNOUNCEMENT_CREATION', 'DELIVERER_PAYMENT', 'SUBSCRIPTION']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { limit, cursor, type } = input;

      // For a real app, we would have a userId field in the payment model
      // For this example, we'll filter based on announcements associated with the user
      const userAnnouncements = await prisma.announcement.findMany({
        where: {
          OR: [
            { clientId: userId },
            { delivererId: userId },
          ],
        },
        select: {
          id: true,
        },
      });

      const announcementIds = userAnnouncements.map(a => a.id);

      const items = await prisma.payment.findMany({
        take: limit + 1,
        where: {
          announcementId: {
            in: announcementIds,
          },
          ...(type ? { type } : {}),
        },
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          announcement: true,
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

  getAdminPaymentStats: adminProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const { startDate, endDate } = input;

      const where = {
        ...(startDate && endDate
          ? {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
      };

      // Get total payments by type
      const paymentsByType = await prisma.payment.groupBy({
        by: ['type', 'status'],
        where,
        _sum: {
          amount: true,
        },
      });

      // Get total successful payments
      const successfulPayments = await prisma.payment.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      // Get total failed payments
      const failedPayments = await prisma.payment.aggregate({
        where: {
          ...where,
          status: 'FAILED',
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      return {
        paymentsByType,
        successfulPayments,
        failedPayments,
      };
    }),
}); 