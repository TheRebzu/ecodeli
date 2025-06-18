import { TRPCError } from "@trpc/server";
import { PrismaClient, UserRole, UserStatus, Prisma, ActivityType } from "@prisma/client";
import { db } from "@/server/db";
import { sendEmailNotification } from "@/lib/services/email.service";
import { getUserPreferredLocale } from "@/lib/i18n/user-locale";
import { UserFilters } from "@/types/actors/admin";

/**
 * Options de tri pour les utilisateurs
 */
interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}

/**
 * Service d'administration pour la gestion des utilisateurs
 */
export class AdminService {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient || db;
  }

  /**
   * Récupère une liste paginée d'utilisateurs avec filtres
   */
  async getUsers(
    filters: UserFilters & { page?: number; limit?: number } = {},
    sort: SortOptions = { field: "createdAt", direction: "desc" },
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        role,
        status,
        isVerified,
        dateFrom,
        dateTo,
        hasDocuments,
        hasPendingVerifications
      } = filters;

      const skip = (page - 1) * limit;

      // Construct where conditions
      const where: Prisma.UserWhereInput = {};

      // Search by name or email
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search, mode: "insensitive" } }
        ];
      }

      // Filter by role
      if (role) {
        where.role = role;
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by verification status
      if (isVerified !== undefined) {
        where.isVerified = isVerified;
      }

      // Filter by creation date range
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Filter by having documents
      if (hasDocuments) {
        where.documents = {
          some: {}
        };
      }

      // Filter by having pending verifications
      if (hasPendingVerifications) {
        where.submittedVerifications = {
          some: {
            status: "PENDING"
          }
        };
      }

      // Determine sort field mapping
      let orderBy: any = {};
      switch (sort.field) {
        case "name":
        case "email":
        case "role":
        case "status":
        case "createdAt":
        case "lastLoginAt":
          orderBy[sort.field] = sort.direction;
          break;
        default:
          orderBy.createdAt = "desc";
      }

      // Execute count query
      const totalUsers = await this.prisma.user.count({ where });

      // Execute main query
      const users = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          lastLoginAt: true,
          isVerified: true,
          phoneNumber: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          image: true,
          _count: {
            select: {
              documents: true,
              submittedVerifications: {
                where: {
                  status: "PENDING"
                }
              }
            }
          },
          activityLogs: {
            orderBy: {
              createdAt: "desc"
            },
            take: 1
          }
        },
        orderBy,
        skip,
        take: limit
      });

      // Transform data for client
      const transformedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isVerified: user.isVerified,
        phoneNumber: user.phoneNumber,
        isBanned: user.isBanned || false,
        bannedAt: user.bannedAt,
        banReason: user.banReason,
        image: user.image,
        documentsCount: user._count.documents,
        pendingVerificationsCount: user._count.submittedVerifications,
        lastActivityAt: user.activityLogs[0]?.createdAt
      }));

      return {
        users: transformedUsers,
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      };
    } catch (error) {
      console.error("Error retrieving users:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error retrieving users"
      });
    }
  }

  /**
   * Récupère les détails complets d'un utilisateur
   */
  async getUserDetail(
    userId: string,
    options: {
      includeDocuments?: boolean;
      includeVerificationHistory?: boolean;
      includeActivityLogs?: boolean;
    } = {
      includeDocuments: true,
      includeVerificationHistory: true,
      includeActivityLogs: false
    }
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: options.includeVerificationHistory,
          deliverer: options.includeVerificationHistory,
          merchant: options.includeVerificationHistory,
          provider: options.includeVerificationHistory,
          admin: true,
          documents: options.includeDocuments
            ? {
                select: {
                  id: true,
                  type: true,
                  verificationStatus: true,
                  uploadedAt: true,
                  fileUrl: true,
                  notes: true
                },
                orderBy: {
                  uploadedAt: "desc"
                }
              }
            : false,
          verificationHistory: options.includeVerificationHistory
            ? {
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                  reason: true,
                  verifiedBy: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                },
                orderBy: {
                  createdAt: "desc"
                }
              }
            : false,
          activityLogs: options.includeActivityLogs
            ? {
                select: {
                  id: true,
                  activityType: true,
                  details: true,
                  ipAddress: true,
                  createdAt: true
                },
                orderBy: {
                  createdAt: "desc"
                },
                take: 50
              }
            : false
        }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      return user;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Error retrieving user details:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error retrieving user details"
      });
    }
  }

  /**
   * Met à jour le statut d'un utilisateur
   */
  async updateUserStatus(
    userId: string,
    status: UserStatus,
    options: { reason?: string; notifyUser?: boolean } = {}
  ) {
    const { reason, notifyUser = true } = options;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, role: true, status: true }
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found"
        });
      }

      // Don't allow updates if status is the same
      if (user.status === status) {
        return {
          success: true,
          message: "User status is already set to " + status
        };
      }

      // Update user in a transaction to include audit trail
      const updatedUser = await this.prisma.$transaction(async (tx) => {
        // Update user status
        const updated = await tx.user.update({
          where: { id: userId },
          data: { status }
        });

        // Add activity log
        await tx.userActivityLog.create({
          data: {
            userId,
            activityType: ActivityType.STATUS_CHANGE,
            details: `Status changed from ${user.status} to ${status}${reason ? `: ${reason}` : ""}`
          }
        });

        return updated;
      });

      // Send email notification if enabled
      if (notifyUser) {
        const locale = await getUserPreferredLocale(userId);
        await sendEmailNotification({
          to: user.email,
          subject:
            locale === "fr" ? "Modification de votre statut" : "Status update",
          templateName: "user-status-update",
          data: {
            name: user.name || "",
            status,
            reason: reason || ""
          },
          locale
        });
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Error updating user status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error updating user status"
      });
    }
  }

  /**
   * Récupère les logs d'activité d'un utilisateur
   */
  async getUserActivityLogs(
    userId: string,
    options: {
      types?: ActivityType[];
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    } = {},
  ) {
    try {
      const {
        types,
        dateFrom,
        dateTo,
        page = 1,
        limit = 10
      } = options;
      const skip = (page - 1) * limit;

      // Construct where conditions
      const where: Prisma.UserActivityLogWhereInput = { userId };

      if (types?.length) {
        where.activityType = { in: types };
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      // Get total count
      const total = await this.prisma.userActivityLog.count({ where });

      // Get activity logs
      const logs = await this.prisma.userActivityLog.findMany({
        where,
        select: {
          id: true,
          activityType: true,
          details: true,
          ipAddress: true,
          createdAt: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      });

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error("Error retrieving user activity logs:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Error retrieving user activity logs" 
      });
    }
  }

  /**
   * Récupère les statistiques des utilisateurs pour le tableau de bord
   */
  async getUserStats() {
    try {
      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Récupération des statistiques de base
      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRole,
        usersByStatus,
        verifiedUsers
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: "ACTIVE" } }),
        this.prisma.user.count({ where: { createdAt: { gte: today } } }),
        this.prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        this.prisma.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
        this.prisma.user.groupBy({ 
          by: ["role"], 
          _count: true 
        }),
        this.prisma.user.groupBy({ 
          by: ["status"], 
          _count: true 
        }),
        this.prisma.user.count({ where: { isVerified: true } })
      ]);

      // Transformation des données
      const roleStats: Record<string, number> = {};
      usersByRole.forEach((stat) => {
        roleStats[stat.role] = stat._count;
      });

      const statusStats: Record<string, number> = {};
      usersByStatus.forEach((stat) => {
        statusStats[stat.status] = stat._count;
      });

      // Données de pays simplifiées
      const countriesStats = [
        { country: "France", count: Math.floor(totalUsers * 0.6) },
        { country: "Belgium", count: Math.floor(totalUsers * 0.25) },
        { country: "Switzerland", count: Math.floor(totalUsers * 0.15) }
      ];

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRole: roleStats,
        usersByStatus: statusStats,
        usersByVerification: {
          verified: verifiedUsers,
          unverified: totalUsers - verifiedUsers
        },
        topCountries: countriesStats,
        registrationsOverTime: []
      };
    } catch (error) {
      console.error("Error retrieving user statistics:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Error retrieving user statistics" 
      });
    }
  }

  /**
   * Active ou désactive un utilisateur
   */
  async toggleUserActivation(userId: string, isActive: boolean) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, status: true }
      });

      if (!user) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé" 
        });
      }

      // Déterminer le nouveau statut
      const newStatus = isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;

      // Mettre à jour l'utilisateur
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: newStatus,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        user: updatedUser,
        message: `Utilisateur ${isActive ? "activé" : "désactivé"} avec succès`
      };
    } catch (error) {
      console.error("Error toggling user activation:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la modification de l'activation utilisateur" 
      });
    }
  }

  /**
   * Bannit ou débannit un utilisateur
   */
  async banUser(userId: string, action: "BAN" | "UNBAN", reason?: string) {
    try {
      // Vérifier que l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, isBanned: true }
      });

      if (!user) {
        throw new TRPCError({ 
          code: "NOT_FOUND",
          message: "Utilisateur non trouvé" 
        });
      }

      // Vérifier la cohérence de l'action
      if (action === "BAN" && user.isBanned) {
        throw new TRPCError({ 
          code: "BAD_REQUEST",
          message: "Cet utilisateur est déjà banni" 
        });
      }

      if (action === "UNBAN" && !user.isBanned) {
        throw new TRPCError({ 
          code: "BAD_REQUEST",
          message: "Cet utilisateur n'est pas banni" 
        });
      }

      // Mettre à jour l'utilisateur
      const updateData: any = {
        isBanned: action === "BAN",
        updatedAt: new Date()
      };

      if (action === "BAN") {
        updateData.bannedAt = new Date();
        updateData.banReason = reason;
        updateData.status = UserStatus.SUSPENDED;
      } else {
        updateData.bannedAt = null;
        updateData.banReason = null;
        updateData.status = UserStatus.ACTIVE;
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          isBanned: true,
          bannedAt: true,
          banReason: true,
          status: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        user: updatedUser,
        message: `Utilisateur ${action === "BAN" ? "banni" : "débanni"} avec succès`
      };
    } catch (error) {
      console.error("Error banning/unbanning user:", error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors du bannissement/débannissement de l'utilisateur" 
      });
    }
  }
}
