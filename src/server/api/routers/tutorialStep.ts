import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  clientProcedure,
} from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const tutorialStepRouter = router({
  // Get all tutorial steps
  getAllSteps: protectedProcedure.query(async () => {
    return await prisma.tutorialStep.findMany({
      orderBy: {
        order: "asc",
      },
    });
  }),

  // Get tutorial steps for a specific user type
  getStepsByUserType: protectedProcedure
    .input(
      z.object({
        userType: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
      }),
    )
    .query(async ({ input }) => {
      const { userType } = input;

      return await prisma.tutorialStep.findMany({
        where: {
          OR: [{ userTypes: { has: userType } }, { userTypes: { has: "ALL" } }],
        },
        orderBy: {
          order: "asc",
        },
      });
    }),

  // Get tutorial progress for the current user
  getUserProgress: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Get all steps for this user type
    const steps = await prisma.tutorialStep.findMany({
      where: {
        OR: [{ userTypes: { has: user?.role } }, { userTypes: { has: "ALL" } }],
      },
      orderBy: {
        order: "asc",
      },
    });

    // Get user's progress
    const progress = await prisma.tutorialProgress.findUnique({
      where: { userId },
    });

    // Build response with steps and completion status
    return {
      steps,
      currentStep: progress?.currentStep || 0,
      completed: progress?.completed || false,
      lastUpdated: progress?.updatedAt,
    };
  }),

  // Update user's tutorial progress
  updateProgress: protectedProcedure
    .input(
      z.object({
        currentStep: z.number().int().min(0),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const { currentStep, completed } = input;

      // Validate that the step exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      const totalSteps = await prisma.tutorialStep.count({
        where: {
          OR: [
            { userTypes: { has: user?.role } },
            { userTypes: { has: "ALL" } },
          ],
        },
      });

      if (currentStep > totalSteps) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid step number. Total steps: ${totalSteps}`,
        });
      }

      // Update or create progress
      return await prisma.tutorialProgress.upsert({
        where: { userId },
        update: {
          currentStep,
          ...(completed !== undefined && { completed }),
        },
        create: {
          userId,
          currentStep,
          completed: completed || false,
        },
      });
    }),

  // Skip tutorial for the current user
  skipTutorial: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;

    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    return await prisma.tutorialProgress.upsert({
      where: { userId },
      update: {
        completed: true,
      },
      create: {
        userId,
        currentStep: 0,
        completed: true,
      },
    });
  }),

  // Admin only: Create a tutorial step
  createStep: adminProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        element: z.string().optional(),
        order: z.number().int().positive(),
        userTypes: z.array(
          z.enum(["ALL", "CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]),
        ),
        imageUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await prisma.tutorialStep.create({
        data: input,
      });
    }),

  // Admin only: Update a tutorial step
  updateStep: adminProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        element: z.string().optional(),
        order: z.number().int().positive().optional(),
        userTypes: z
          .array(z.enum(["ALL", "CLIENT", "DELIVERER", "MERCHANT", "PROVIDER"]))
          .optional(),
        imageUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      return await prisma.tutorialStep.update({
        where: { id },
        data,
      });
    }),

  // Admin only: Delete a tutorial step
  deleteStep: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await prisma.tutorialStep.delete({
        where: { id: input.id },
      });
    }),

  // Admin only: Reorder tutorial steps
  reorderSteps: adminProcedure
    .input(
      z.object({
        steps: z.array(
          z.object({
            id: z.string(),
            order: z.number().int().positive(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const { steps } = input;

      // Update each step's order
      await Promise.all(
        steps.map((step) =>
          prisma.tutorialStep.update({
            where: { id: step.id },
            data: { order: step.order },
          }),
        ),
      );

      return await prisma.tutorialStep.findMany({
        orderBy: {
          order: "asc",
        },
      });
    }),
});
