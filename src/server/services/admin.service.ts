import { TRPCError } from '@trpc/server';
import { PrismaClient, UserRole, UserStatus, Prisma } from '@prisma/client';
import { db } from '../db';
import { sendEmailNotification } from '@/lib/email';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { UserFilters, ActivityType } from '@/types/admin/admin';

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
}
