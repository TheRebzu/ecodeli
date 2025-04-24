import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/lib/trpc';
import { TRPCError } from '@trpc/server';
import { prisma } from '@/lib/prisma';

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const user = await prisma.user.update({
        where: {
          id: userId,
        },
        data: input,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          updatedAt: true,
        },
      });

      return user;
    }),

  getAllUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().nullish(),
        role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']).optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, role } = input;
      const items = await prisma.user.findMany({
        take: limit + 1,
        where: role ? { role } : undefined,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          createdAt: true,
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