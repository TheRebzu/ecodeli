import { TRPCError } from '@trpc/server';
import { PrismaClient, UserRole, UserStatus, Prisma } from '@prisma/client';
import { db } from '../db';
import { sendEmailNotification } from '@/lib/email';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { UserFilters, ActivityType } from '@/types/admin';
import bcrypt from 'bcrypt';

/**
 * Options de tri pour les utilisateurs
 */
interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
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
    sort: SortOptions = { field: 'createdAt', direction: 'desc' }
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
        hasPendingVerifications,
        country,
        city,
      } = filters;

      const skip = (page - 1) * limit;

      // Construct where conditions
      const where: Prisma.UserWhereInput = {};

      // Search by name or email
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search, mode: 'insensitive' } },
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
          some: {},
        };
      }

      // Filter by having pending verifications
      if (hasPendingVerifications) {
        where.submittedVerifications = {
          some: {
            status: 'PENDING',
          },
        };
      }

      // Filter by location (via role-specific models)
      if (country || city) {
        const locationFilter: Prisma.UserWhereInput = {
          OR: [],
        };

        if (country) {
          locationFilter.OR?.push({
            client: { country },
          });
          locationFilter.OR?.push({
            merchant: { businessCountry: country },
          });
        }

        if (city) {
          locationFilter.OR?.push({
            client: { city },
          });
          locationFilter.OR?.push({
            merchant: { businessCity: city },
          });
        }

        if (locationFilter.OR?.length) {
          where.OR = where.OR || [];
          where.OR.push(...(locationFilter.OR as any[]));
        }
      }

      // Determine sort field mapping
      let orderBy: any = {};
      switch (sort.field) {
        case 'name':
        case 'email':
        case 'role':
        case 'status':
        case 'createdAt':
        case 'lastLoginAt':
          orderBy[sort.field] = sort.direction;
          break;
        case 'lastActivityAt':
          // Sort by the most recent activity log
          orderBy = {
            activityLogs: {
              _max: {
                createdAt: sort.direction,
              },
            },
          };
          break;
        default:
          orderBy.createdAt = 'desc';
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
          _count: {
            select: {
              documents: true,
              submittedVerifications: {
                where: {
                  status: 'PENDING',
                },
              },
            },
          },
          activityLogs: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      // Transform data for client
      const transformedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isVerified: user.isVerified,
        phoneNumber: user.phoneNumber,
        documentsCount: user._count.documents,
        pendingVerificationsCount: user._count.submittedVerifications,
        lastActivityAt: user.activityLogs[0]?.createdAt,
      }));

      return {
        users: transformedUsers,
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      };
    } catch (error) {
      console.error('Error retrieving users:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving users',
      });
    }
  }

  /**
   * Récupère les détails complets d'un utilisateur
   */
  async getUserDetail(
    userId: string,
    options = {
      includeDocuments: true,
      includeVerificationHistory: true,
      includeActivityLogs: false,
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
                  notes: true,
                },
                orderBy: {
                  uploadedAt: 'desc',
                },
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
                      name: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              }
            : false,
          activityLogs: options.includeActivityLogs
            ? {
                select: {
                  id: true,
                  activityType: true,
                  details: true,
                  ipAddress: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 50,
              }
            : false,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Create a properly typed result object with documents field
      const result = {
        ...user,
        documents: [] as any[],
      };

      // Transform documents to handle SELFIE documents stored as OTHER
      if ('documents' in user && Array.isArray(user.documents)) {
        result.documents = user.documents.map(doc => {
          // Determine if this is a SELFIE document based on notes field
          const isSelfie =
            doc.type === 'OTHER' &&
            (doc.notes === 'SELFIE' ||
              (typeof doc.notes === 'string' && doc.notes.toLowerCase().includes('selfie')));

          return {
            ...doc,
            // Map uploadedAt to createdAt for frontend compatibility
            createdAt: doc.uploadedAt,
            // Map verificationStatus to status for frontend compatibility
            status: doc.verificationStatus,
            // If document is OTHER type but has selfie in notes, correct the type for frontend
            type: isSelfie ? 'SELFIE' : doc.type,
          };
        });
      }

      return result;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error retrieving user details:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving user details',
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
        select: { email: true, name: true, role: true, status: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Don't allow updates if status is the same
      if (user.status === status) {
        return { success: true, message: 'User status is already set to ' + status };
      }

      // Update user in a transaction to include audit trail
      const updatedUser = await this.prisma.$transaction(async tx => {
        // Update user status
        const updated = await tx.user.update({
          where: { id: userId },
          data: { status },
        });

        // We'll implement activity logging later when schema is updated
        // For now, just return the updated user
        return updated;
      });

      // Send email notification if enabled
      if (notifyUser) {
        const locale = getUserPreferredLocale(user);
        await sendEmailNotification({
          to: user.email,
          subject: locale === 'fr' ? 'Modification de votre statut' : 'Status update',
          templateName: 'user-status-update',
          data: {
            name: user.name || '',
            status,
            reason: reason || '',
          },
          locale,
        });
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error updating user status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating user status',
      });
    }
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  async updateUserRole(
    userId: string,
    role: UserRole,
    options: { reason?: string; createRoleSpecificProfile?: boolean } = {}
  ) {
    const { reason, createRoleSpecificProfile = true } = options;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: true,
          deliverer: true,
          merchant: true,
          provider: true,
          admin: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Check if role change is allowed
      if (user.role === 'ADMIN' && role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove admin role directly',
        });
      }

      // Don't allow updates if role is the same
      if (user.role === role) {
        return { success: true, message: 'User role is already set to ' + role };
      }

      // Update user in a transaction
      const updatedUser = await this.prisma.$transaction(async tx => {
        // Update user role
        const updated = await tx.user.update({
          where: { id: userId },
          data: { role },
        });

        // Create role-specific profile if it doesn't exist
        if (createRoleSpecificProfile) {
          switch (role) {
            case 'CLIENT':
              if (!user.client) {
                await tx.client.create({
                  data: {
                    userId,
                  },
                });
              }
              break;
            case 'DELIVERER':
              if (!user.deliverer) {
                await tx.deliverer.create({
                  data: {
                    userId,
                    phone: user.phoneNumber || '',
                  },
                });
              }
              break;
            case 'MERCHANT':
              if (!user.merchant) {
                await tx.merchant.create({
                  data: {
                    userId,
                    companyName: user.name,
                    address: '',
                    phone: user.phoneNumber || '',
                  },
                });
              }
              break;
            case 'PROVIDER':
              if (!user.provider) {
                await tx.provider.create({
                  data: {
                    userId,
                  },
                });
              }
              break;
            case 'ADMIN':
              if (!user.admin) {
                await tx.admin.create({
                  data: {
                    userId,
                    permissions: ['users.view'],
                  },
                });
              }
              break;
          }
        }

        // Record the activity
        await tx.userActivityLog.create({
          data: {
            userId,
            activityType: ActivityType.ROLE_CHANGE,
            details: `Role changed from ${user.role} to ${role}${reason ? `: ${reason}` : ''}`,
          },
        });

        return updated;
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error updating user role:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating user role',
      });
    }
  }

  /**
   * Met à jour les permissions d'un administrateur
   */
  async updateAdminPermissions(userId: string, permissions: string[]) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          admin: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      if (user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only administrators can have admin permissions',
        });
      }

      // Create or update admin profile with permissions
      if (!user.admin) {
        await this.prisma.admin.create({
          data: {
            userId,
            permissions,
          },
        });
      } else {
        await this.prisma.admin.update({
          where: { userId },
          data: { permissions },
        });
      }

      // Log the activity
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType: ActivityType.PROFILE_UPDATE,
          details: `Admin permissions updated: ${permissions.join(', ')}`,
        },
      });

      return { success: true, permissions };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error updating admin permissions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating admin permissions',
      });
    }
  }

  /**
   * Ajoute une note à un utilisateur
   */
  async addUserNote(userId: string, note: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          notes: user.notes
            ? `${user.notes}\n\n${new Date().toISOString()}: ${note}`
            : `${new Date().toISOString()}: ${note}`,
        },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error adding user note:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error adding user note',
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
    } = {}
  ) {
    try {
      const { types, dateFrom, dateTo, page = 1, limit = 10 } = options;
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
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error retrieving user activity logs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving user activity logs',
      });
    }
  }

  /**
   * Ajoute manuellement un log d'activité pour un utilisateur
   */
  async addUserActivityLog(data: {
    userId: string;
    activityType: ActivityType;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const { userId, activityType, details, ipAddress, userAgent } = data;

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      // Create activity log
      const log = await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType,
          details,
          ipAddress,
          userAgent,
        },
      });

      return log;
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error('Error adding user activity log:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error adding user activity log',
      });
    }
  }

  /**
   * Exporte les utilisateurs selon des filtres
   */
  async exportUsers(format: 'csv' | 'excel' | 'pdf', fields: string[], filters: UserFilters = {}) {
    try {
      // Get filtered users with no pagination
      const result = await this.getUsers(filters, { field: 'name', direction: 'asc' });
      const users = result.users;

      // This would connect to an export service
      // For now, return mock data or CSV string
      if (format === 'csv') {
        // Create CSV header
        const header = fields.join(',');

        // Create CSV rows
        const rows = users.map(user => {
          return fields
            .map(field => {
              // @ts-ignore
              const value = user[field];
              if (value instanceof Date) {
                return value.toISOString();
              }
              if (typeof value === 'object') {
                return JSON.stringify(value);
              }
              return value?.toString() || '';
            })
            .join(',');
        });

        // Combine header and rows
        return {
          data: [header, ...rows].join('\n'),
          filename: `users_export_${new Date().toISOString().slice(0, 10)}.csv`,
          mimeType: 'text/csv',
        };
      }

      // Mock for other formats
      return {
        data: 'Export data would go here',
        filename: `users_export_${new Date().toISOString().slice(0, 10)}.${format}`,
        mimeType:
          format === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf',
      };
    } catch (error) {
      console.error('Error exporting users:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error exporting users',
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
        verifiedUsers,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { createdAt: { gte: today } } }),
        this.prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        this.prisma.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
        this.prisma.user.groupBy({ by: ['role'], _count: true }),
        this.prisma.user.groupBy({ by: ['status'], _count: true }),
        this.prisma.user.count({ where: { isVerified: true } }),
      ]);

      // Transformation des données
      const roleStats = {};
      usersByRole.forEach(stat => {
        roleStats[stat.role] = stat._count;
      });

      const statusStats = {};
      usersByStatus.forEach(stat => {
        statusStats[stat.status] = stat._count;
      });

      // Remplacer par un tableau vide ou utiliser un autre champ comme providerCity
      const countriesStats = [
        { country: 'France', count: 0 },
        { country: 'Belgium', count: 0 },
        { country: 'Switzerland', count: 0 },
      ];

      // Récupération des inscriptions dans le temps (derniers 6 mois)
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const registrationsOverTime = await this.prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM "users"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `;

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
          unverified: totalUsers - verifiedUsers,
        },
        topCountries: countriesStats,
        registrationsOverTime: registrationsOverTime ? registrationsOverTime.map((row: any) => ({
          date: row.month.toISOString().split('T')[0],
          count: Number(row.count),
        })) : [],
      };
    } catch (error) {
      console.error('Error retrieving user statistics:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error retrieving user statistics',
      });
    }
  }

  /**
   * Force la réinitialisation du mot de passe d'un utilisateur
   */
  async forcePasswordReset(
    userId: string,
    options: {
      reason?: string;
      notifyUser?: boolean;
      expireExistingTokens?: boolean;
      performedById: string;
    }
  ) {
    try {
      const { reason, notifyUser = true, expireExistingTokens = true, performedById } = options;

      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, status: true, role: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Générer un token de réinitialisation
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

      // Supprimer tous les tokens existants si nécessaire
      if (expireExistingTokens) {
        await this.prisma.passwordResetToken.deleteMany({
          where: { userId },
        });
      }

      // Créer un nouveau token
      await this.prisma.passwordResetToken.create({
        data: {
          userId,
          token,
          expires,
          forced: true,
          forcedByUserId: performedById,
          reason,
        },
      });

      // Générer un lien de réinitialisation
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

      // Notifier l'utilisateur si demandé
      if (notifyUser) {
        const locale = (await getUserPreferredLocale(userId)) || 'fr';

        await sendEmailNotification({
          to: user.email,
          subject:
            locale === 'fr' ? 'Réinitialisation de votre mot de passe' : 'Password Reset Required',
          template: 'admin-force-password-reset',
          data: {
            name: user.name,
            resetLink,
            reason:
              reason || (locale === 'fr' ? "Demande de l'administrateur" : 'Administrator request'),
            expiresIn: '24 heures',
            locale,
          },
        });
      }

      // Ajouter une entrée dans le journal d'activité
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType: 'PASSWORD_RESET_REQUEST',
          details: `Réinitialisation forcée par un administrateur${reason ? `: ${reason}` : ''}`,
          performedById,
        },
      });

      return { success: true, message: 'Réinitialisation du mot de passe initiée' };
    } catch (error) {
      console.error('Error forcing password reset:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la réinitialisation du mot de passe',
      });
    }
  }

  /**
   * Effectue des actions en masse sur plusieurs utilisateurs
   */
  async bulkUserAction(options: {
    userIds: string[];
    action: string;
    reason?: string;
    notifyUsers?: boolean;
    additionalData?: Record<string, any>;
    performedById: string;
  }) {
    try {
      const {
        userIds,
        action,
        reason,
        notifyUsers = true,
        additionalData,
        performedById,
      } = options;

      if (!userIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Aucun utilisateur sélectionné pour cette action',
        });
      }

      // Vérifier que tous les utilisateurs existent
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true, status: true, role: true },
      });

      if (users.length !== userIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Certains utilisateurs n'existent pas",
        });
      }

      let results = [];

      switch (action) {
        case 'ACTIVATE':
          results = await Promise.all(
            users.map(user =>
              this.updateUserStatus(user.id, 'ACTIVE', {
                reason,
                notifyUser: notifyUsers,
                performedById,
              })
            )
          );
          break;

        case 'DEACTIVATE':
          results = await Promise.all(
            users.map(user =>
              this.updateUserStatus(user.id, 'INACTIVE', {
                reason,
                notifyUser: notifyUsers,
                performedById,
              })
            )
          );
          break;

        case 'SUSPEND':
          results = await Promise.all(
            users.map(user =>
              this.updateUserStatus(user.id, 'SUSPENDED', {
                reason,
                notifyUser: notifyUsers,
                performedById,
                expiresAt: additionalData?.expiresAt,
              })
            )
          );
          break;

        case 'FORCE_PASSWORD_RESET':
          results = await Promise.all(
            users.map(user =>
              this.forcePasswordReset(user.id, {
                reason,
                notifyUser: notifyUsers,
                expireExistingTokens: true,
                performedById,
              })
            )
          );
          break;

        case 'SEND_VERIFICATION_EMAIL':
          // Implémentation de l'envoi en masse d'emails de vérification
          // ...
          break;

        case 'DELETE':
          results = await Promise.all(
            users.map(user => this.softDeleteUser(user.id, reason, performedById))
          );
          break;

        case 'ADD_TAG':
          if (!additionalData?.tag) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Tag non spécifié pour cette action',
            });
          }

          results = await Promise.all(
            users.map(user => this.addUserTag(user.id, additionalData.tag, performedById))
          );
          break;

        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Action non prise en charge',
          });
      }

      return {
        success: true,
        processed: users.length,
        results,
      };
    } catch (error) {
      console.error('Error performing bulk user action:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'exécution de l'action en masse",
      });
    }
  }

  /**
   * Ajoute un tag à un utilisateur
   */
  private async addUserTag(userId: string, tag: string, performedById: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tags: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Ajouter le tag s'il n'existe pas déjà
      const currentTags = user.tags || [];
      if (!currentTags.includes(tag)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { tags: [...currentTags, tag] },
        });

        // Ajouter une entrée dans le journal d'activité
        await this.prisma.userActivityLog.create({
          data: {
            userId,
            activityType: 'OTHER',
            details: `Tag ajouté: ${tag}`,
            performedById,
          },
        });
      }

      return { success: true, userId, tag };
    } catch (error) {
      console.error('Error adding user tag:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'ajout du tag",
      });
    }
  }

  /**
   * Soft delete d'un utilisateur (marque comme supprimé sans effacer les données)
   */
  private async softDeleteUser(userId: string, reason: string | undefined, performedById: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Marquer l'utilisateur comme supprimé
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'INACTIVE',
          isDeleted: true,
          deletedAt: new Date(),
          deletedByUserId: performedById,
          deletionReason: reason,
          // Anonymiser les données sensibles
          email: `deleted_${userId}@deleted.com`,
          name: 'Utilisateur supprimé',
          phoneNumber: null,
          // Révoquer les sessions
          sessions: {
            deleteMany: {},
          },
        },
      });

      // Ajouter une entrée dans le journal d'activité
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType: 'OTHER',
          details: `Compte supprimé${reason ? `: ${reason}` : ''}`,
          performedById,
        },
      });

      return { success: true, userId };
    } catch (error) {
      console.error('Error soft-deleting user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la suppression de l'utilisateur",
      });
    }
  }

  /**
   * Suppression définitive d'un utilisateur (hard delete)
   */
  async permanentlyDeleteUser(
    userId: string,
    options: {
      reason: string;
      performedById: string;
    }
  ) {
    try {
      const { reason, performedById } = options;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          documents: { select: { id: true } },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Enregistrer les informations de base dans les logs d'activité
      await this.prisma.userActivityLog.create({
        data: {
          userId,
          activityType: 'OTHER',
          details: `Suppression définitive du compte - Raison: ${reason} - Effectuée par: ${performedById}`,
          ipAddress: 'admin-action',
        },
      });

      // Supprimer les documents associés
      if (user.documents.length > 0) {
        await this.prisma.document.deleteMany({
          where: { userId },
        });
      }

      // Supprimer le wallet associé à l'utilisateur (résout l'erreur de clé étrangère)
      await this.prisma.wallet.deleteMany({
        where: { userId },
      });

      // Supprimer toutes les transactions du wallet associées à l'utilisateur
      await this.prisma.walletTransaction.deleteMany({
        where: { wallet: { userId } },
      });

      // Supprimer les demandes de retrait associées
      await this.prisma.withdrawalRequest.deleteMany({
        where: { wallet: { userId } },
      });

      // Supprimer l'utilisateur et toutes ses données associées en cascade
      await this.prisma.user.delete({
        where: { id: userId },
      });

      return { success: true, message: 'Utilisateur définitivement supprimé' };
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de la suppression définitive de l'utilisateur",
      });
    }
  }

  /**
   * Vérifie le mot de passe d'un administrateur
   */
  async verifyAdminPassword(adminId: string, password: string): Promise<boolean> {
    try {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId, role: 'ADMIN' },
        select: { id: true, password: true },
      });

      if (!admin || !admin.password) {
        return false;
      }

      // Vérifier le mot de passe en utilisant bcrypt
      return bcrypt.compare(password, admin.password);
    } catch (error) {
      console.error('Error verifying admin password:', error);
      return false;
    }
  }
}
