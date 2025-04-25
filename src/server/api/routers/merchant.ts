import { z } from "zod";
import {
  router,
  protectedProcedure,
  merchantProcedure,
  adminProcedure,
} from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const merchantRouter = router({
  createStore: merchantProcedure
    .input(
      z.object({
        name: z.string().min(3).max(100),
        description: z.string().min(10).max(500),
        address: z.string().min(5),
        phoneNumber: z.string().min(5),
        logoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session.user.id;

      // Check if merchant already has a store
      const existingStore = await prisma.store.findFirst({
        where: {
          merchantId,
        },
      });

      if (existingStore) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have a store",
        });
      }

      // Create a new store
      const store = await prisma.store.create({
        data: {
          ...input,
          merchantId,
          status: "PENDING",
        },
      });

      return store;
    }),

  updateStore: merchantProcedure
    .input(
      z.object({
        storeId: z.string(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().min(10).max(500).optional(),
        address: z.string().min(5).optional(),
        phoneNumber: z.string().min(5).optional(),
        logoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const merchantId = ctx.session.user.id;
      const { storeId, ...updateData } = input;

      // Verify store belongs to merchant
      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      if (store.merchantId !== merchantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this store",
        });
      }

      // Update the store
      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: updateData,
      });

      return updatedStore;
    }),

  getStoreById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      const store = await prisma.store.findUnique({
        where: { id },
        include: {
          merchant: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      return store;
    }),

  getMyStore: merchantProcedure.query(async ({ ctx }) => {
    const merchantId = ctx.session.user.id;

    const store = await prisma.store.findFirst({
      where: {
        merchantId,
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    if (!store) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "You do not have a store",
      });
    }

    return store;
  }),

  approveStore: adminProcedure
    .input(z.object({ storeId: z.string() }))
    .mutation(async ({ input }) => {
      const { storeId } = input;

      const store = await prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      if (store.status === "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Store is already approved",
        });
      }

      const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: {
          status: "APPROVED",
        },
      });

      return updatedStore;
    }),

  getAllStores: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.string().nullish(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor, status } = input;
      const items = await prisma.store.findMany({
        take: limit + 1,
        where: status ? { status } : undefined,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          merchant: {
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
});
