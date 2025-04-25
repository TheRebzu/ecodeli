import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, adminProcedure } from "../trpc";

export const adminRouter = createTRPCRouter({
  // Get dashboard stats for admin
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    try {
      const [
        totalUsers,
        totalClients,
        totalDeliverers,
        totalMerchants,
        totalProviders,
        totalOrders,
        totalStores,
        totalServices,
      ] = await Promise.all([
        ctx.prisma.user.count(),
        ctx.prisma.user.count({ where: { role: "CLIENT" } }),
        ctx.prisma.user.count({ where: { role: "DELIVERER" } }),
        ctx.prisma.user.count({ where: { role: "MERCHANT" } }),
        ctx.prisma.user.count({ where: { role: "PROVIDER" } }),
        ctx.prisma.delivery.count(),
        ctx.prisma.store.count(),
        ctx.prisma.service.count(),
      ]);

      return {
        users: {
          total: totalUsers,
          clients: totalClients,
          deliverers: totalDeliverers,
          merchants: totalMerchants,
          providers: totalProviders,
        },
        business: {
          totalOrders,
          totalStores,
          totalServices,
        },
      };
    } catch (error) {
      console.error("Error fetching admin dashboard stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch admin dashboard stats",
      });
    }
  }),

  // Get recent users
  getRecentUsers: adminProcedure.query(async ({ ctx }) => {
    try {
      const recentUsers = await ctx.prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          image: true,
        },
      });

      return recentUsers;
    } catch (error) {
      console.error("Error fetching recent users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch recent users",
      });
    }
  }),

  // Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["CLIENT", "DELIVERER", "MERCHANT", "PROVIDER", "ADMIN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await ctx.prisma.user.update({
          where: {
            id: input.userId,
          },
          data: {
            role: input.role,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        return updatedUser;
      } catch (error) {
        console.error("Error updating user role:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user role",
        });
      }
    }),
});
