import { TRPCError } from '@trpc/server';
import { z } from 'zod';
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
  forcePasswordResetSchema,
  bulkUserActionSchema,
  auditLogFiltersSchema,
  userNotificationSettingsSchema,
  sendUserNotificationSchema,
  userDevicesSchema,
  userStatsAdvancedSchema,
} from '@/schemas/user/user-management.schema';
import { router, adminProcedure } from '@/server/api/trpc';
import { AdminService } from '@/server/services/admin/admin.service';
import { AuditService } from '@/server/services/admin/audit.service';
import { NotificationService } from '@/server/services/common/notification.service';

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
    return adminService.getUserDetail(userId, {
      includeDocuments: input.includeDocuments,
      includeVerificationHistory: input.includeVerificationHistory,
      includeActivityLogs: input.includeActivityLogs,
      includeLoginHistory: input.includeLoginHistory,
      includeNotes: input.includeNotes,
      includePermissions: input.includePermissions,
      includeSubscriptions: input.includeSubscriptions,
      includePaymentMethods: input.includePaymentMethods,
      includeNotificationSettings: input.includeNotificationSettings,
    });
  }),

  /**
   * Update user status
   */
  updateUserStatus: adminProcedure
    .input(updateUserStatusSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier les permissions administratives
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action avant de l'effectuer
      await AuditService.createAuditLog(
        'user',
        input.userId,
        'status_change',
        ctx.session.user.id,
        { previousStatus: 'unknown' }, // Le service récupérera l'état actuel
        {
          newStatus: input.status,
          reason: input.reason,
          expiresAt: input.expiresAt,
          emailTemplate: input.emailTemplate,
        }
      );

      return adminService.updateUserStatus(input.userId, input.status, {
        reason: input.reason,
        notifyUser: input.notifyUser,
        expiresAt: input.expiresAt,
        performedById: ctx.session.user.id,
        sendEmail: input.sendEmail,
        emailTemplate: input.emailTemplate,
        customEmailSubject: input.customEmailSubject,
        customEmailContent: input.customEmailContent,
      });
    }),

  /**
   * Update user role
   */
  updateUserRole: adminProcedure.input(updateUserRoleSchema).mutation(async ({ ctx, input }) => {
    // Vérifier les permissions administratives
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
      });
    }

    const adminService = new AdminService(ctx.db);

    // Journaliser l'action avant de l'effectuer
    await AuditService.createAuditLog(
      'user',
      input.userId,
      'role_change',
      ctx.session.user.id,
      { previousRole: 'unknown' }, // Le service récupérera l'état actuel
      {
        newRole: input.role,
        reason: input.reason,
        maintainAccessToOldRoleData: input.maintainAccessToOldRoleData,
      }
    );

    return adminService.updateUserRole(input.userId, input.role, {
      reason: input.reason,
      createRoleSpecificProfile: input.createRoleSpecificProfile,
      transferExistingData: input.transferExistingData,
      maintainAccessToOldRoleData: input.maintainAccessToOldRoleData,
      notifyUser: input.notifyUser,
      performedById: ctx.session.user.id,
    });
  }),

  /**
   * Update admin permissions
   */
  updateAdminPermissions: adminProcedure
    .input(updateUserPermissionsSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier si l'admin actuel a la permission de gérer les utilisateurs
      const adminUser = ctx.session?.user;
      if (!adminUser || adminUser.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour gérer les permissions des utilisateurs",
        });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        'user',
        input.userId,
        'permissions_change',
        ctx.session.user.id,
        { previousPermissions: 'unknown' }, // Le service récupérera l'état actuel
        {
          newPermissions: input.permissions,
          permissionGroups: input.permissionGroups,
          restrictToIpAddresses: input.restrictToIpAddresses,
          expiresAt: input.expiresAt,
        }
      );

      return adminService.updateAdminPermissions(input.userId, {
        permissions: input.permissions,
        expiresAt: input.expiresAt,
        permissionGroups: input.permissionGroups,
        restrictToIpAddresses: input.restrictToIpAddresses,
        notifyUser: input.notifyUser,
      });
    }),

  /**
   * Get user activity logs
   */
  getUserActivityLogs: adminProcedure.input(userActivityLogSchema).query(async ({ ctx, input }) => {
    const adminService = new AdminService(ctx.db);

    return adminService.getUserActivityLogs(input.userId, {
      types: input.types,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: input.page,
      limit: input.limit,
      sortDirection: input.sortDirection,
      includeDetails: input.includeDetails,
      ipAddress: input.ipAddress,
      importance: input.importance,
      searchTerm: input.searchTerm,
    });
  }),

  /**
   * Add an activity log for a user manually
   */
  addUserActivityLog: adminProcedure
    .input(addUserActivityLogSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas les permissions nécessaires pour effectuer cette action.",
        });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.addUserActivityLog({
        ...input,
        performedById: ctx.session.user.id,
      });
    }),

  /**
   * Add a note to a user
   */
  addUserNote: adminProcedure.input(userNoteSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Vous devez être connecté pour effectuer cette action.',
      });
    }

    const adminService = new AdminService(ctx.db);
    return adminService.addUserNote(input.userId, {
      note: input.note,
      category: input.category,
      visibility: input.visibility,
      pinned: input.pinned,
      reminderDate: input.reminderDate,
      createdById: ctx.session.user.id,
    });
  }),

  /**
   * Export users data
   */
  exportUsers: adminProcedure.input(exportUsersSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les permissions nécessaires pour exporter les données.",
      });
    }

    const adminService = new AdminService(ctx.db);

    // Journaliser l'action d'export
    await AuditService.createAuditLog(
      'system',
      'user_export',
      'data_export',
      ctx.session.user.id,
      null,
      {
        format: input.format,
        fields: input.fields,
        filters: input.filters,
        includeSensitiveData: input.includeSensitiveData,
      }
    );

    return adminService.exportUsers({
      format: input.format,
      fields: input.fields,
      filters: input.filters || {},
      includeSensitiveData: input.includeSensitiveData,
      encryptionPassword: input.encryptionPassword,
      includeHeaders: input.includeHeaders,
      dateFormat: input.dateFormat,
      fileName: input.fileName,
    });
  }),

  /**
   * Get user statistics
   */
  getUserStats: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques.",
      });
    }

    const adminService = new AdminService(ctx.db);
    return adminService.getUserStats();
  }),

  /**
   * Get advanced user statistics
   */
  getUserStatsAdvanced: adminProcedure
    .input(userStatsAdvancedSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques avancées.",
        });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.getUserStatsAdvanced({
        period: input.period,
        compareWithPrevious: input.compareWithPrevious,
        breakdownByRole: input.breakdownByRole,
        breakdownByStatus: input.breakdownByStatus,
        breakdownByCountry: input.breakdownByCountry,
        includeRetentionRate: input.includeRetentionRate,
        includeChurnRate: input.includeChurnRate,
        includeGrowthRate: input.includeGrowthRate,
        includeConversionRates: input.includeConversionRates,
        customMetrics: input.customMetrics,
      });
    }),

  /**
   * Force the password reset of a user
   */
  forcePasswordReset: adminProcedure
    .input(forcePasswordResetSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour réinitialiser un mot de passe.",
        });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        'user',
        input.userId,
        'force_password_reset',
        ctx.session.user.id,
        null,
        {
          reason: input.reason,
          notifyUser: input.notifyUser,
          expireExistingTokens: input.expireExistingTokens,
          expiresIn: input.expiresIn,
          requireStrongPassword: input.requireStrongPassword,
          blockLoginUntilReset: input.blockLoginUntilReset,
        }
      );

      return adminService.forcePasswordReset(input.userId, {
        reason: input.reason,
        notifyUser: input.notifyUser,
        expireExistingTokens: input.expireExistingTokens,
        expiresIn: input.expiresIn,
        requireStrongPassword: input.requireStrongPassword,
        blockLoginUntilReset: input.blockLoginUntilReset,
        performedById: ctx.session.user.id,
      });
    }),

  /**
   * Perform bulk actions on multiple users
   */
  bulkUserAction: adminProcedure.input(bulkUserActionSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les permissions nécessaires pour effectuer des actions en masse.",
      });
    }

    const adminService = new AdminService(ctx.db);

    // Journaliser l'action en masse
    await AuditService.createAuditLog(
      'system',
      'bulk_user_action',
      input.action.toLowerCase(),
      ctx.session.user.id,
      null,
      {
        userIds: input.userIds,
        action: input.action,
        reason: input.reason,
        notifyUsers: input.notifyUsers,
        scheduledFor: input.scheduledFor,
      }
    );

    return adminService.bulkUserAction({
      userIds: input.userIds,
      action: input.action,
      reason: input.reason,
      notifyUsers: input.notifyUsers,
      additionalData: input.additionalData,
      scheduledFor: input.scheduledFor,
      confirmationCode: input.confirmationCode,
      performedById: ctx.session.user.id,
    });
  }),

  /**
   * Get filtered audit logs
   */
  getAuditLogs: adminProcedure.input(auditLogFiltersSchema).query(async ({ ctx, input }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'avez pas les permissions nécessaires pour accéder aux journaux d'audit.",
      });
    }

    return AuditService.getAllAuditLogs({
      entityType: input.entityType,
      entityId: input.entityId,
      performedById: input.performedById,
      action: input.action,
      fromDate: input.fromDate,
      toDate: input.toDate,
      severity: input.severity,
      status: input.status,
      ipAddress: input.ipAddress,
      limit: input.limit,
      offset: (input.page - 1) * input.limit,
    });
  }),

  /**
   * Permanently delete a user (with admin password confirmation)
   */
  permanentlyDeleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        adminPassword: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour supprimer définitivement un utilisateur.",
        });
      }

      const adminService = new AdminService(ctx.db);

      // Vérifier que l'admin a fourni un mot de passe valide (extra sécurité)
      const isPasswordValid = await adminService.verifyAdminPassword(
        ctx.session.user.id,
        input.adminPassword
      );

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message:
            'Mot de passe administrateur incorrect. Cette action nécessite une vérification.',
        });
      }

      // Journaliser l'action de suppression définitive
      await AuditService.createAuditLog(
        'user',
        input.userId,
        'permanent_deletion',
        ctx.session.user.id,
        null,
        { reason: input.reason }
      );

      return adminService.permanentlyDeleteUser(input.userId, {
        reason: input.reason,
        performedById: ctx.session.user.id,
      });
    }),

  /**
   * Get user notification settings
   */
  getUserNotificationSettings: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour voir les paramètres de notification.",
        });
      }

      const notificationService = new NotificationService(ctx.db);
      return notificationService.getUserNotificationSettings(input.userId);
    }),

  /**
   * Update user notification settings
   */
  updateUserNotificationSettings: adminProcedure
    .input(userNotificationSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour modifier les paramètres de notification.",
        });
      }

      const notificationService = new NotificationService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        'user',
        input.userId,
        'notification_settings_update',
        ctx.session.user.id,
        null,
        { settings: input }
      );

      return notificationService.updateUserNotificationSettings(input);
    }),

  /**
   * Send notification to user
   */
  sendUserNotification: adminProcedure
    .input(sendUserNotificationSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas les permissions nécessaires pour envoyer des notifications.",
        });
      }

      const notificationService = new NotificationService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        'notification',
        'admin_notification',
        'notification_sent',
        ctx.session.user.id,
        null,
        {
          recipient: input.userId,
          title: input.title,
          type: input.type,
          channel: input.channel,
        }
      );

      return notificationService.sendUserNotification({
        ...input,
        sentById: ctx.session.user.id,
      });
    }),

  /**
   * Manage user devices
   */
  manageUserDevices: adminProcedure.input(userDevicesSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          "Vous n'avez pas les permissions nécessaires pour gérer les appareils des utilisateurs.",
      });
    }

    const adminService = new AdminService(ctx.db);

    // Journaliser l'action
    await AuditService.createAuditLog(
      'user_device',
      input.deviceId || input.userId,
      `device_${input.action.toLowerCase()}`,
      ctx.session.user.id,
      null,
      {
        userId: input.userId,
        action: input.action,
        deviceId: input.deviceId,
      }
    );

    return adminService.manageUserDevices(input);
  }),

  /**
   * Get user devices
   */
  getUserDevices: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour voir les appareils des utilisateurs.",
        });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.getUserDevices(input.userId);
    }),

  /**
   * Get permission groups
   */
  getPermissionGroups: adminProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message:
          "Vous n'avez pas les permissions nécessaires pour accéder aux groupes de permissions.",
      });
    }

    const adminService = new AdminService(ctx.db);
    return adminService.getPermissionGroups();
  }),

  /**
   * Create or update permission group
   */
  upsertPermissionGroup: adminProcedure
    .input(
      z.object({
        id: z.string().optional(), // Si fourni, c'est une mise à jour
        name: z.string().min(1),
        description: z.string(),
        permissions: z.array(z.string()),
        isPreDefined: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user || ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            "Vous n'avez pas les permissions nécessaires pour gérer les groupes de permissions.",
        });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        'permission_group',
        input.id || 'new_group',
        input.id ? 'permission_group_update' : 'permission_group_create',
        ctx.session.user.id,
        null,
        {
          name: input.name,
          permissions: input.permissions,
        }
      );

      return adminService.upsertPermissionGroup({
        ...input,
        createdBy: ctx.session.user.id,
      });
    }),
});
