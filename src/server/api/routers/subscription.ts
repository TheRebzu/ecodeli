import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  clientProcedure,
} from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const subscriptionRouter = router({
  // Get all available subscription plans
  getPlans: protectedProcedure.query(async () => {
    return await prisma.subscriptionPlan.findMany({
      orderBy: {
        price: "asc",
      },
    });
  }),

  // Get current user's subscription
  getCurrentSubscription: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!clientProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client profile not found",
      });
    }

    return clientProfile.subscription;
  }),

  // Subscribe to a plan
  subscribe: clientProcedure
    .input(
      z.object({
        planId: z.string(),
        paymentMethodId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { planId, paymentMethodId } = input;

      // Check if plan exists
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      // Find client profile
      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId },
        include: {
          subscription: true,
        },
      });

      if (!clientProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // If user already has a subscription, update it
      if (clientProfile.subscription) {
        return await prisma.subscription.update({
          where: { id: clientProfile.subscription.id },
          data: {
            planId,
            startDate: new Date(),
            // Calculate end date (1 month from now)
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            status: "ACTIVE",
          },
          include: {
            plan: true,
          },
        });
      }

      // Otherwise, create a new subscription
      return await prisma.subscription.create({
        data: {
          clientProfileId: clientProfile.id,
          planId,
          startDate: new Date(),
          // Calculate end date (1 month from now)
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          status: "ACTIVE",
          // Payment details would be handled with Stripe integration
        },
        include: {
          plan: true,
        },
      });
    }),

  // Cancel subscription
  cancelSubscription: clientProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        subscription: true,
      },
    });

    if (!clientProfile || !clientProfile.subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });
    }

    return await prisma.subscription.update({
      where: { id: clientProfile.subscription.id },
      data: {
        status: "CANCELLED",
        // Keep the end date as is, allowing the user to use the subscription until it expires
      },
    });
  }),

  // Admin-only: Create new subscription plan
  createPlan: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        description: z.string().min(10).max(500),
        price: z.number().nonnegative(),
        features: z.array(z.string()),
        insuranceCoverage: z.number().nonnegative(),
        shippingDiscount: z.number().min(0).max(100),
        priorityShippingDiscount: z.number().min(0).max(100),
        permanentDiscount: z.number().min(0).max(100),
        freeShipments: z.number().int().nonnegative(),
      }),
    )
    .mutation(async ({ input }) => {
      return await prisma.subscriptionPlan.create({
        data: input,
      });
    }),

  // Admin-only: Update subscription plan
  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(50).optional(),
        description: z.string().min(10).max(500).optional(),
        price: z.number().nonnegative().optional(),
        features: z.array(z.string()).optional(),
        insuranceCoverage: z.number().nonnegative().optional(),
        shippingDiscount: z.number().min(0).max(100).optional(),
        priorityShippingDiscount: z.number().min(0).max(100).optional(),
        permanentDiscount: z.number().min(0).max(100).optional(),
        freeShipments: z.number().int().nonnegative().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      return await prisma.subscriptionPlan.update({
        where: { id },
        data,
      });
    }),

  // Check if a user's subscription covers insurance for a specific amount
  checkInsurance: clientProcedure
    .input(
      z.object({
        amount: z.number().positive(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { amount } = input;

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (
        !clientProfile ||
        !clientProfile.subscription ||
        clientProfile.subscription.status !== "ACTIVE"
      ) {
        return {
          covered: false,
          coverageAmount: 0,
          additionalCost: amount * 0.05, // Default insurance rate
        };
      }

      const { plan } = clientProfile.subscription;
      const coverageAmount = plan.insuranceCoverage;

      return {
        covered: amount <= coverageAmount,
        coverageAmount,
        additionalCost:
          amount <= coverageAmount ? 0 : (amount - coverageAmount) * 0.05,
      };
    }),
});
