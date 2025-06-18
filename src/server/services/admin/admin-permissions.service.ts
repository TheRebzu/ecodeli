import { PrismaClient, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import type { AdminPermission } from "@/types/actors/admin";

export class AdminPermissionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Vérifie si un utilisateur a les permissions d'administrateur requises
   */
  async checkAdminPermissions(
    userId: string,
    requiredPermissions: AdminPermission[]
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { admin: true }
      });

      // Vérifier que l'utilisateur existe et a le rôle ADMIN
      if (!user || user.role !== UserRole.ADMIN) {
        return false;
      }

      // Vérifier que l'utilisateur a un profil admin
      if (!user.admin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Profil administrateur manquant"
        });
      }

      // Super admin a toutes les permissions
      if (user.admin.permissions.includes("super_admin")) {
        return true;
      }

      // Vérifier chaque permission requise
      return requiredPermissions.every(permission =>
        user.admin.permissions.includes(permission)
      );
    } catch (error) {
      console.error("Erreur lors de la vérification des permissions admin:", error);
      return false;
    }
  }

  /**
   * Vérifie et lance une exception si les permissions ne sont pas accordées
   */
  async requireAdminPermissions(
    userId: string,
    requiredPermissions: AdminPermission[],
    customErrorMessage?: string
  ): Promise<void> {
    const hasPermissions = await this.checkAdminPermissions(userId, requiredPermissions);
    
    if (!hasPermissions) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: customErrorMessage || 
          `Permissions administratives requises: ${requiredPermissions.join(", ")}`
      });
    }
  }

  /**
   * Vérifie les permissions spécifiques pour la gestion des logs système
   */
  async checkSystemLogPermissions(userId: string): Promise<boolean> {
    return this.checkAdminPermissions(userId, ["audit.view"]);
  }

  /**
   * Vérifie les permissions pour le nettoyage des logs (super admin uniquement)
   */
  async checkLogCleanupPermissions(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true }
    });

    return (
      user?.role === UserRole.ADMIN &&
      user?.admin?.permissions.includes("super_admin")
    );
  }

  /**
   * Vérifie les permissions pour la gestion des utilisateurs
   */
  async checkUserManagementPermissions(userId: string): Promise<boolean> {
    return this.checkAdminPermissions(userId, ["users.manage"]);
  }

  /**
   * Vérifie les permissions pour la gestion des contrats
   */
  async checkContractManagementPermissions(userId: string): Promise<boolean> {
    return this.checkAdminPermissions(userId, ["contracts.manage"]);
  }

  /**
   * Vérifie les permissions pour les vérifications de documents
   */
  async checkVerificationPermissions(userId: string): Promise<boolean> {
    return this.checkAdminPermissions(userId, ["verifications.approve"]);
  }

  /**
   * Récupère toutes les permissions d'un utilisateur admin
   */
  async getUserPermissions(userId: string): Promise<AdminPermission[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true }
    });

    if (!user || user.role !== UserRole.ADMIN || !user.admin) {
      return [];
    }

    return user.admin.permissions as AdminPermission[];
  }

  /**
   * Assigne des permissions à un administrateur
   */
  async assignPermissions(
    adminId: string,
    permissions: AdminPermission[],
    assignedBy: string
  ): Promise<void> {
    // Vérifier que l'assignateur a les droits
    await this.requireAdminPermissions(assignedBy, ["permissions.manage"]);

    // Vérifier que l'utilisateur cible est bien admin
    const targetUser = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { admin: true }
    });

    if (!targetUser || targetUser.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "L'utilisateur doit avoir le rôle administrateur"
      });
    }

    // Créer ou mettre à jour le profil admin
    await this.prisma.admin.upsert({
      where: { userId: adminId },
      create: {
        userId: adminId,
        permissions
      },
      update: {
        permissions
      }
    });

    // Enregistrer l'audit
    await this.prisma.userActivityLog.create({
      data: {
        userId: adminId,
        activityType: "PERMISSIONS_UPDATED",
        details: `Permissions assignées par ${assignedBy}: ${permissions.join(", ")}`,
        performedByUserId: assignedBy
      }
    });
  }

  /**
   * Révoque des permissions d'un administrateur
   */
  async revokePermissions(
    adminId: string,
    permissionsToRevoke: AdminPermission[],
    revokedBy: string
  ): Promise<void> {
    await this.requireAdminPermissions(revokedBy, ["permissions.manage"]);

    const admin = await this.prisma.admin.findUnique({
      where: { userId: adminId }
    });

    if (!admin) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profil administrateur non trouvé"
      });
    }

    const updatedPermissions = admin.permissions.filter(
      (permission) => !permissionsToRevoke.includes(permission as AdminPermission)
    );

    await this.prisma.admin.update({
      where: { userId: adminId },
      data: { permissions: updatedPermissions }
    });

    // Audit log
    await this.prisma.userActivityLog.create({
      data: {
        userId: adminId,
        activityType: "PERMISSIONS_REVOKED",
        details: `Permissions révoquées par ${revokedBy}: ${permissionsToRevoke.join(", ")}`,
        performedByUserId: revokedBy
      }
    });
  }
} 