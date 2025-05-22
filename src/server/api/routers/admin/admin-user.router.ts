import { TRPCError } from '@trpc/server';
import {
  getUserDetailSchema,
  updateUserPermissionsSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userActivityLogSchema,
  userFiltersSchema,
  userNoteSchema,
  addUserActivityLogSchema,
  exportUsersSchema,
} from '../../../../schemas/admin/user-management.schema';
import { router, adminProcedure } from '../../trpc';
import { AdminService } from '../../../services/admin.service';

export const adminUserRouter = router({
  /**
   * Get a paginated list of users with filters
   */
  getUsers: adminProcedure.input(userFiltersSchema).query(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);
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
    const adminService = new AdminService(ctx.db);
    const { userId, includeDocuments, includeVerificationHistory, includeActivityLogs } = input;
    return adminService.getUserDetail(userId, {
      includeDocuments,
      includeVerificationHistory,
      includeActivityLogs,
    });
  }),

  /**
   * Update user status
   */
  updateUserStatus: adminProcedure
    .input(updateUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const adminService = new AdminService(ctx.db);
      const { userId, status, reason, notifyUser } = input;
      return adminService.updateUserStatus(userId, status, { reason, notifyUser });
    }),

  /**
   * Update user role
   */
  updateUserRole: adminProcedure.input(updateUserRoleSchema).mutation(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);
    const { userId, role, reason, createRoleSpecificProfile } = input;
    return adminService.updateUserRole(userId, role, { reason, createRoleSpecificProfile });
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

      const adminService = new AdminService(ctx.db);
      return adminService.updateAdminPermissions(input.userId, input.permissions);
    }),

  /**
   * Get user activity logs
   */
  getUserActivityLogs: adminProcedure.input(userActivityLogSchema).query(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);
    const { userId, types, dateFrom, dateTo, page, limit } = input;

    return adminService.getUserActivityLogs(userId, {
      types,
      dateFrom,
      dateTo,
      page,
      limit,
    });
  }),

  /**
   * Add an activity log for a user manually
   */
  addUserActivityLog: adminProcedure
    .input(addUserActivityLogSchema)
    .mutation(async ({ ctx, input }) => {
      const adminService = new AdminService(ctx.db);
      return adminService.addUserActivityLog(input);
    }),

  /**
   * Add a note to a user
   */
  addUserNote: adminProcedure.input(userNoteSchema).mutation(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);
    return adminService.addUserNote(input.userId, input.note);
  }),

  /**
   * Export users data
   */
  exportUsers: adminProcedure.input(exportUsersSchema).mutation(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);
    const { format, fields, filters } = input;
    return adminService.exportUsers(format, fields, filters || {});
  }),

  /**
   * Get user statistics
   */
  getUserStats: adminProcedure.query(async () => {
    // This would connect to an analytics service or database
    // For now, return mock data
    return {
      totalUsers: 1000,
      activeUsers: 750,
      newUsersToday: 25,
      newUsersThisWeek: 87,
      newUsersThisMonth: 345,
      usersByRole: {
        CLIENT: 650,
        DELIVERER: 150,
        MERCHANT: 100,
        PROVIDER: 80,
        ADMIN: 20,
      },
      usersByStatus: {
        ACTIVE: 750,
        PENDING_VERIFICATION: 150,
        SUSPENDED: 50,
        INACTIVE: 50,
      },
      usersByVerification: {
        verified: 800,
        unverified: 200,
      },
      topCountries: [
        { country: 'France', count: 450 },
        { country: 'Canada', count: 200 },
        { country: 'Belgium', count: 150 },
        { country: 'Switzerland', count: 100 },
        { country: 'Other', count: 100 },
      ],
    };
  }),
});
