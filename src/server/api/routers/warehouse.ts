import { z } from "zod";
import {
  router,
  protectedProcedure,
  adminProcedure,
  clientProcedure,
} from "@/lib/trpc";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";

export const warehouseRouter = router({
  // Get all warehouses
  getAllWarehouses: protectedProcedure.query(async () => {
    return await prisma.warehouse.findMany({
      include: {
        _count: {
          select: {
            storageUnits: true,
          },
        },
      },
    });
  }),

  // Get warehouse by ID
  getWarehouseById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { id } = input;
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          storageUnits: true,
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found",
        });
      }

      return warehouse;
    }),

  // Admin-only: Create warehouse
  createWarehouse: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100),
        address: z.string().min(5),
        city: z.string().min(2),
        postalCode: z.string().min(2),
        country: z.string().min(2),
        capacity: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      return await prisma.warehouse.create({
        data: input,
      });
    }),

  // Admin-only: Update warehouse
  updateWarehouse: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(100).optional(),
        address: z.string().min(5).optional(),
        city: z.string().min(2).optional(),
        postalCode: z.string().min(2).optional(),
        country: z.string().min(2).optional(),
        capacity: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;

      return await prisma.warehouse.update({
        where: { id },
        data,
      });
    }),

  // Admin-only: Create storage unit
  createStorageUnit: adminProcedure
    .input(
      z.object({
        warehouseId: z.string(),
        code: z.string().min(2),
        size: z.number().positive(),
        price: z.number().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const { warehouseId } = input;

      // Check if warehouse exists
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Warehouse not found",
        });
      }

      return await prisma.storageUnit.create({
        data: input,
      });
    }),

  // Get available storage units
  getAvailableStorageUnits: protectedProcedure
    .input(
      z.object({
        warehouseId: z.string().optional(),
        minSize: z.number().positive().optional(),
        maxSize: z.number().positive().optional(),
        maxPrice: z.number().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { warehouseId, minSize, maxSize, maxPrice } = input;

      return await prisma.storageUnit.findMany({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          status: "AVAILABLE",
          ...(minSize ? { size: { gte: minSize } } : {}),
          ...(maxSize ? { size: { lte: maxSize } } : {}),
          ...(maxPrice ? { price: { lte: maxPrice } } : {}),
        },
        include: {
          warehouse: {
            select: {
              name: true,
              address: true,
              city: true,
              postalCode: true,
            },
          },
        },
      });
    }),

  // Rent a storage unit
  rentStorageUnit: clientProcedure
    .input(
      z.object({
        storageUnitId: z.string(),
        startDate: z.date(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { storageUnitId, startDate, endDate } = input;

      // Check if storage unit exists and is available
      const storageUnit = await prisma.storageUnit.findUnique({
        where: { id: storageUnitId },
      });

      if (!storageUnit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Storage unit not found",
        });
      }

      if (storageUnit.status !== "AVAILABLE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Storage unit is not available",
        });
      }

      // Create rental
      const rental = await prisma.storageRental.create({
        data: {
          storageUnitId,
          userId,
          startDate,
          endDate,
          status: "ACTIVE",
        },
      });

      // Update storage unit status
      await prisma.storageUnit.update({
        where: { id: storageUnitId },
        data: { status: "OCCUPIED" },
      });

      return rental;
    }),

  // Get user's rentals
  getUserRentals: clientProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    return await prisma.storageRental.findMany({
      where: { userId },
      include: {
        storageUnit: {
          include: {
            warehouse: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // End rental
  endRental: clientProcedure
    .input(z.object({ rentalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { rentalId } = input;

      const rental = await prisma.storageRental.findUnique({
        where: { id: rentalId },
        include: {
          storageUnit: true,
        },
      });

      if (!rental) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rental not found",
        });
      }

      if (rental.userId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to end this rental",
        });
      }

      if (rental.status !== "ACTIVE") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This rental is not active",
        });
      }

      // Update rental
      const updatedRental = await prisma.storageRental.update({
        where: { id: rentalId },
        data: {
          status: "COMPLETED",
          endDate: new Date(),
        },
      });

      // Update storage unit status
      await prisma.storageUnit.update({
        where: { id: rental.storageUnitId },
        data: { status: "AVAILABLE" },
      });

      return updatedRental;
    }),
});
