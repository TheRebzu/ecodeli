import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
  userStatsAdvancedSchema} from "@/schemas/user/user-management.schema";
import { router, adminProcedure } from "@/server/api/trpc";
import { AdminService } from "@/server/services/admin/admin.service";
import { AuditService } from "@/server/services/admin/audit.service";
import { NotificationService } from "@/server/services/common/notification.service";

export const adminUserRouter = router({ /**
   * Get a paginated list of users with filters
   */
  getUsers: adminProcedure
    .input(z.any().optional())
    .query(async ({ ctx, input: input  }) => {
      try {
        console.log("🔍 [SERVER] adminUser.getUsers appelé avec:", {
          input,
          userId: ctx.session?.user?.id});

        const adminService = new AdminService(ctx.db);

        // Valeurs par défaut si input est vide
        const {
          page = 1,
          limit = 10,
          sortBy = "createdAt",
          sortDirection = "desc",
          ...filters
        } = input || {};

        console.log("🔍 [SERVER] Paramètres traités:", {
          page,
          limit,
          sortBy,
          sortDirection,
          filters});

        const result = await adminService.getUsers(
          { ...filters, page, limit },
          { field: sortBy, direction: sortDirection },
        );

        console.log("✅ [SERVER] Résultat getUsers:", {
          total: result.total,
          usersCount: result.users?.length || 0,
          page: result.page,
          hasUsersProperty: "users" in result,
          resultKeys: Object.keys(result),
          
                name: result.users[0].name,
                email: result.users[0].email}
            : null});

        // Test avec un retour simplifié pour debug
        const simpleResult = {
          users: result.users || [],
          total: result.total || 0,
          page: result.page || 1,
          limit: result.limit || 10,
          totalPages: result.totalPages || 1};

        console.log("🚀 [SERVER] Retour simplifié:", {
          ...simpleResult,
          users: simpleResult.users
            .slice(0, 2)
            .map((u) => ({ id: u.id, name: u.name  }))});

        return simpleResult;
      } catch (error) {
        console.error("❌ [SERVER] Erreur dans getUsers:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des utilisateurs",
          cause: error });
      }
    }),

  /**
   * Get user details
   */
  getUserDetail: adminProcedure
    .input(getUserDetailSchema)
    .query(async ({ ctx, input: input  }) => {
      const adminService = new AdminService(ctx.db);
      return adminService.getUserDetail(input.userId, {
        includeDocuments: input.includeDocuments,
        includeVerificationHistory: input.includeVerificationHistory,
        includeActivityLogs: input.includeActivityLogs});
    }),

  /**
   * Update user status
   */
  updateUserStatus: adminProcedure
    .input(updateUserStatusSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier les permissions administratives
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour effectuer cette action." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action avant de l'effectuer
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "status_change",
        ctx.session.user.id,
        { previousStatus: "unknown" }, // Le service récupérera l'état actuel
        {
          newStatus: input.status,
          reason: input.reason,
          expiresAt: input.expiresAt,
          emailTemplate: input.emailTemplate},
      );

      return adminService.updateUserStatus(input.userId, input.status, {
        reason: input.reason,
        notifyUser: input.notifyUser});
    }),

  /**
   * Update user role
   */
  updateUserRole: adminProcedure
    .input(updateUserRoleSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier les permissions administratives
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour effectuer cette action." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action avant de l'effectuer
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "role_change",
        ctx.session.user.id,
        { previousRole: "unknown" }, // Le service récupérera l'état actuel
        {
          newRole: input.role,
          reason: input.reason,
          maintainAccessToOldRoleData: input.maintainAccessToOldRoleData},
      );

      return adminService.updateUserRole(input.userId, input.role, {
        reason: input.reason,
        createRoleSpecificProfile: input.createRoleSpecificProfile});
    }),

  /**
   * Update admin permissions
   */
  updateAdminPermissions: adminProcedure
    .input(updateUserPermissionsSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier si l'admin actuel a la permission de gérer les utilisateurs
      const adminUser = ctx.session?.user;
      if (!adminUser || adminUser.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour gérer les permissions des utilisateurs" });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "permissions_change",
        ctx.session.user.id,
        { previousPermissions: "unknown" }, // Le service récupérera l'état actuel
        {
          newPermissions: input.permissions,
          permissionGroups: input.permissionGroups,
          restrictToIpAddresses: input.restrictToIpAddresses,
          expiresAt: input.expiresAt},
      );

      return adminService.updateAdminPermissions(
        input.userId,
        input.permissions,
      );
    }),

  /**
   * Get user activity logs
   */
  getUserActivityLogs: adminProcedure
    .input(userActivityLogSchema)
    .query(async ({ ctx, input: input  }) => {
      const adminService = new AdminService(ctx.db);

      return adminService.getUserActivityLogs(input.userId, {
        types: input.types,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        page: input.page,
        limit: input.limit});
    }),

  /**
   * Add an activity log for a user manually
   */
  addUserActivityLog: adminProcedure
    .input(addUserActivityLogSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour effectuer cette action." });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.addUserActivityLog(input);
    }),

  /**
   * Add a note to a user
   */
  addUserNote: adminProcedure
    .input(userNoteSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message: "Vous devez être connecté pour effectuer cette action." });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.addUserNote(input.userId, input.note);
    }),

  /**
   * Export users data
   */
  exportUsers: adminProcedure
    .input(exportUsersSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour exporter les données." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action d'export
      await AuditService.createAuditLog(
        "system",
        "user_export",
        "data_export",
        ctx.session.user.id,
        null,
        {
          format: input.format,
          fields: input.fields,
          filters: input.filters,
          includeSensitiveData: input.includeSensitiveData},
      );

      return adminService.exportUsers(
        input.format,
        input.fields,
        input.filters || {},
      );
    }),

  /**
   * Get user statistics (alias for dashboard)
   */
  getStats: adminProcedure
    .input(
      z.object({ startDate: z.coerce.date(),
        endDate: z.coerce.date() }),
    )
    .query(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques." });
      }

      const adminService = new AdminService(ctx.db);
      const stats = await adminService.getUserStats();
      return {
        ...stats,
        timeRange: {
          startDate: input.startDate,
          endDate: input.endDate}};
    }),

  /**
   * Get user statistics
   */
  getUserStats: adminProcedure
    .input(z.object({}).optional().default({}))
    .query(async ({ ctx  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques." });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.getUserStats();
    }),

  /**
   * Get advanced user statistics
   */
  getUserStatsAdvanced: adminProcedure
    .input(userStatsAdvancedSchema)
    .query(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour accéder aux statistiques avancées." });
      }

      const adminService = new AdminService(ctx.db);
      return adminService.getUserStatsAdvanced({ period: input.period,
        compareWithPrevious: input.compareWithPrevious,
        breakdownByRole: input.breakdownByRole,
        breakdownByStatus: input.breakdownByStatus,
        breakdownByCountry: input.breakdownByCountry,
        includeRetentionRate: input.includeRetentionRate,
        includeChurnRate: input.includeChurnRate,
        includeGrowthRate: input.includeGrowthRate,
        includeConversionRates: input.includeConversionRates,
        customMetrics: input.customMetrics });
    }),

  /**
   * Force the password reset of a user
   */
  forcePasswordReset: adminProcedure
    .input(forcePasswordResetSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour réinitialiser un mot de passe." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "force_password_reset",
        ctx.session.user.id,
        null,
        {
          reason: input.reason,
          notifyUser: input.notifyUser,
          expireExistingTokens: input.expireExistingTokens},
      );

      return adminService.forcePasswordReset(input.userId, {
        reason: input.reason,
        notifyUser: input.notifyUser,
        expireExistingTokens: input.expireExistingTokens,
        performedById: ctx.session.user.id});
    }),

  /**
   * Perform bulk actions on multiple users
   */
  bulkUserAction: adminProcedure
    .input(bulkUserActionSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour effectuer des actions en masse." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action en masse
      await AuditService.createAuditLog(
        "system",
        "bulk_user_action",
        input.action.toLowerCase(),
        ctx.session.user.id,
        null,
        {
          userIds: input.userIds,
          action: input.action,
          reason: input.reason,
          notifyUsers: input.notifyUsers,
          scheduledFor: input.scheduledFor},
      );

      return adminService.bulkUserAction({ userIds: input.userIds,
        action: input.action,
        reason: input.reason,
        notifyUsers: input.notifyUsers,
        additionalData: input.additionalData,
        scheduledFor: input.scheduledFor,
        confirmationCode: input.confirmationCode,
        performedById: ctx.session.user.id });
    }),

  /**
   * Get filtered audit logs
   */
  getAuditLogs: adminProcedure
    .input(auditLogFiltersSchema)
    .query(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour accéder aux journaux d'audit." });
      }

      return AuditService.getAllAuditLogs({ entityType: input.entityType,
        entityId: input.entityId,
        performedById: input.performedById,
        action: input.action,
        fromDate: input.fromDate,
        toDate: input.toDate,
        severity: input.severity,
        status: input.status,
        ipAddress: input.ipAddress,
        limit: input.limit,
        offset: (input.page - 1) * input.limit });
    }),

  /**
   * Permanently delete a user (with admin password confirmation)
   */
  permanentlyDeleteUser: adminProcedure
    .input(
      z.object({ userId: z.string(),
        adminPassword: z.string(),
        reason: z.string() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour supprimer définitivement un utilisateur." });
      }

      const adminService = new AdminService(ctx.db);

      // Vérifier que l'admin a fourni un mot de passe valide (extra sécurité)
      const isPasswordValid = await adminService.verifyAdminPassword(
        ctx.session.user.id,
        input.adminPassword,
      );

      if (!isPasswordValid) {
        throw new TRPCError({ code: "UNAUTHORIZED",
          message:
            "Mot de passe administrateur incorrect. Cette action nécessite une vérification." });
      }

      // Journaliser l'action de suppression définitive
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "permanent_deletion",
        ctx.session.user.id,
        null,
        { reason: input.reason },
      );

      return adminService.permanentlyDeleteUser(input.userId, {
        reason: input.reason,
        performedById: ctx.session.user.id});
    }),

  /**
   * Get user notification settings
   */
  getUserNotificationSettings: adminProcedure
    .input(z.object({ userId: z.string()  }))
    .query(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour voir les paramètres de notification." });
      }

      const notificationService = new NotificationService(ctx.db);
      return notificationService.getUserNotificationSettings(input.userId);
    }),

  /**
   * Update user notification settings
   */
  updateUserNotificationSettings: adminProcedure
    .input(userNotificationSettingsSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour modifier les paramètres de notification." });
      }

      const notificationService = new NotificationService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        "user",
        input.userId,
        "notification_settings_update",
        ctx.session.user.id,
        null,
        { settings },
      );

      return notificationService.updateUserNotificationSettings(input);
    }),

  /**
   * Send notification to user
   */
  sendUserNotification: adminProcedure
    .input(sendUserNotificationSchema)
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour envoyer des notifications." });
      }

      const notificationService = new NotificationService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        "notification",
        "admin_notification",
        "notification_sent",
        ctx.session.user.id,
        null,
        {
          recipient: input.userId,
          title: input.title,
          type: input.type,
          channel: input.channel},
      );

      return notificationService.sendUserNotification({ ...input,
        sentById: ctx.session.user.id });
    }),

  /**
   * Toggle user activation status
   */
  toggleUserActivation: adminProcedure
    .input(
      z.object({ userId: z.string(),
        isActive: z.boolean() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour activer/désactiver un utilisateur." });
      }

      const adminService = new AdminService(ctx.db);

      // Journaliser l'action
      await AuditService.createAuditLog(
        "user",
        input.userId,
        input.isActive ? "user_activated" : "user_deactivated",
        ctx.session.user.id,
        null,
        {
          action: input.isActive ? "activate" : "deactivate",
          userId: input.userId},
      );

      return adminService.toggleUserActivation(input.userId, input.isActive);
    }),

  /**
   * Ban or unban a user
   */
  banUser: adminProcedure
    .input(
      z.object({ userId: z.string(),
        action: z.enum(["BAN", "UNBAN"]),
        reason: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'avez pas les permissions nécessaires pour bannir un utilisateur." });
      }

      const adminService = new AdminService(ctx.db);

      // Validation: raison obligatoire pour le bannissement
      if (input.action === "BAN" && !input.reason) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Une raison est obligatoire pour bannir un utilisateur." });
      }

      // Journaliser l'action
      await AuditService.createAuditLog(
        "user",
        input.userId,
        input.action === "BAN" ? "user_banned" : "user_unbanned",
        ctx.session.user.id,
        null,
        {
          action: input.action,
          reason: input.reason,
          userId: input.userId},
      );

      return adminService.banUser(input.userId, input.action, input.reason);
    }),

  // Routes pour la gestion des appareils utilisateur
  manageUserDevices: adminProcedure
    .input(
      z.object({ userId: z.string(),
        action: z.enum(["ADD", "REMOVE", "UPDATE", "BLOCK"]),
        deviceId: z.string().optional(),
        deviceData: z
          .object({
            name: z.string(),
            type: z.enum(["MOBILE", "DESKTOP", "TABLET"]),
            fingerprint: z.string(),
            userAgent: z.string().optional(),
            ipAddress: z.string().optional() })
          .optional()}),
    )
    .mutation(async ({ input, ctx  }) => {
      return await ctx.adminService.manageUserDevices(input);
    }),

  getUserDevices: adminProcedure
    .input(
      z.object({ userId: z.string(),
        page: z.number().optional(),
        limit: z.number().optional(),
        includeBlocked: z.boolean().optional(),
        type: z.enum(["MOBILE", "DESKTOP", "TABLET"]).optional() }),
    )
    .query(async ({ input, ctx  }) => {
      const { userId: userId, ...options } = input;
      return await ctx.adminService.getUserDevices(userId, options);
    }),

  // Routes pour la gestion des groupes de permissions
  getPermissionGroups: adminProcedure
    .input(
      z
        .object({ includePermissions: z.boolean().optional(),
          includeUserCount: z.boolean().optional() })
        .optional(),
    )
    .query(async ({ input, ctx  }) => {
      return await ctx.adminService.getPermissionGroups(input);
    }),

  upsertPermissionGroup: adminProcedure
    .input(
      z.object({ id: z.string().optional(),
        name: z.string(),
        description: z.string().optional(),
        permissionIds: z.array(z.string()),
        isActive: z.boolean().optional() }),
    )
    .mutation(async ({ input, ctx  }) => {
      return await ctx.adminService.upsertPermissionGroup(input);
    })});
