import { TRPCError } from '@trpc/server';
import {
  getUserDetailSchema,
  updateUserPermissionsSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userActivityLogSchema,
  userFiltersSchema,
} from '../../../schemas/admin/user-management.schema';
import { router, adminProcedure } from '../trpc';
import { AdminService } from '../../services/admin.service';

export const adminUserRouter = router({
  /**
   * Get a paginated list of users with filters
   */
  getUsers: adminProcedure.input(userFiltersSchema).query(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.prisma || ctx.db);
    const { page, limit, sortBy, sortDirection, ...filters } = input;

    const result = await adminService.getUsers(
      { ...filters, page, limit },
      { field: sortBy, direction: sortDirection }
    );

    return result;
  }),

  /**
   * Get user details
   */
  getUserDetail: adminProcedure.input(getUserDetailSchema).query(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.prisma || ctx.db);
    return adminService.getUserDetail(input.userId);
  }),

  /**
   * Update user status
   */
  updateUserStatus: adminProcedure
    .input(updateUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const adminService = new AdminService(ctx.prisma || ctx.db);
      return adminService.updateUserStatus(input.userId, input.status);
    }),

  /**
   * Update user role
   */
  updateUserRole: adminProcedure.input(updateUserRoleSchema).mutation(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.prisma || ctx.db);
    return adminService.updateUserRole(input.userId, input.role);
  }),

  /**
   * Update admin permissions
   */
  updateAdminPermissions: adminProcedure
    .input(updateUserPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if the current admin has permission to manage users
      // This can be enhanced with a more sophisticated permissions system
      const adminUser = ctx.session?.user;
      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to manage user permissions',
        });
      }

      const adminService = new AdminService(ctx.prisma || ctx.db);
      return adminService.updateAdminPermissions(input.userId, input.permissions);
    }),

  /**
   * Get user activity logs
   */
  getUserActivityLogs: adminProcedure.input(userActivityLogSchema).query(({ input }) => {
    // This would connect to an activity log system
    // For now, return mock data
    return {
      logs: [
        {
          id: '1',
          userId: input.userId,
          action: 'LOGIN',
          timestamp: new Date(),
          details: 'User logged in',
        },
        {
          id: '2',
          userId: input.userId,
          action: 'UPDATE_PROFILE',
          timestamp: new Date(Date.now() - 3600000),
          details: 'User updated profile',
        },
      ],
      total: 2,
    };
  }),
});
