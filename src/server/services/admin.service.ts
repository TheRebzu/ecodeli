import { PrismaClient, User, UserRole, UserStatus, Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { UserFilters, UserListItem, UserSortOptions } from '../../types/admin';

export class AdminService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get a paginated list of users with filters and sorting
   */
  async getUsers(
    filters: UserFilters & { page: number; limit: number },
    sortOptions: UserSortOptions
  ): Promise<{ users: UserListItem[]; total: number }> {
    const { role, status, isVerified, search, dateFrom, dateTo, page, limit } = filters;
    const { field, direction } = sortOptions;

    const where: Prisma.UserWhereInput = {};

    // Apply filters
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Count total matching users
    const total = await this.prisma.user.count({ where });

    // Fetch users with pagination and sorting
    const users = await this.prisma.user.findMany({
      where,
      include: {
        client: { select: { id: true } },
        deliverer: { select: { id: true, isVerified: true } },
        merchant: { select: { id: true, isVerified: true } },
        provider: { select: { id: true, isVerified: true } },
        admin: { select: { id: true, permissions: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [field]: direction },
    });

    // Map to the required format and determine verified status
    const mappedUsers = users.map(user => {
      let isVerifiedStatus = false;

      if (user.role === UserRole.DELIVERER && user.deliverer) {
        isVerifiedStatus = user.deliverer.isVerified;
      } else if (user.role === UserRole.MERCHANT && user.merchant) {
        isVerifiedStatus = user.merchant.isVerified;
      } else if (user.role === UserRole.PROVIDER && user.provider) {
        isVerifiedStatus = user.provider.isVerified;
      } else if (user.role === UserRole.CLIENT || user.role === UserRole.ADMIN) {
        // Clients and admins don't need verification
        isVerifiedStatus = true;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        isVerified: isVerifiedStatus,
      };
    });

    // Filter by verification status if requested
    const filteredUsers =
      isVerified !== undefined
        ? mappedUsers.filter(user => user.isVerified === isVerified)
        : mappedUsers;

    return {
      users: filteredUsers,
      total: isVerified !== undefined ? filteredUsers.length : total,
    };
  }

  /**
   * Get detailed information about a specific user
   */
  async getUserDetail(userId: string): Promise<
    User & {
      client: Prisma.ClientGetPayload<{}> | null;
      deliverer: Prisma.DelivererGetPayload<{}> | null;
      merchant: Prisma.MerchantGetPayload<{}> | null;
      provider: Prisma.ProviderGetPayload<{}> | null;
      admin: Prisma.AdminGetPayload<{}> | null;
    }
  > {
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

    return user;
  }

  /**
   * Update a user's status (activate, suspend, etc.)
   */
  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Update user status
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // Future improvement: add activity logging
  }

  /**
   * Update a user's role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    // Cannot change role if already has profile data for current role
    // This would require a more complex migration process
    if (role !== user.role) {
      const hasExistingProfile = await this.checkExistingProfile(userId, user.role);
      if (hasExistingProfile) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot change role: user already has profile data for current role',
        });
      }
    }

    // Create the new role-specific record if needed
    await this.createRoleProfile(userId, role);

    // Update user role
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Future improvement: add activity logging
  }

  /**
   * Update admin permissions
   */
  async updateAdminPermissions(userId: string, permissions: string[]): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    if (user.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'User is not an admin',
      });
    }

    if (!user.admin) {
      // Create admin record if it doesn't exist
      await this.prisma.admin.create({
        data: {
          userId,
          permissions,
        },
      });
    } else {
      // Update existing admin record
      await this.prisma.admin.update({
        where: { userId },
        data: { permissions },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
    }) as Promise<User>;
  }

  // Helper methods
  private async checkExistingProfile(userId: string, role: UserRole): Promise<boolean> {
    switch (role) {
      case UserRole.CLIENT:
        return !!(await this.prisma.client.findUnique({ where: { userId } }));
      case UserRole.DELIVERER:
        return !!(await this.prisma.deliverer.findUnique({ where: { userId } }));
      case UserRole.MERCHANT:
        return !!(await this.prisma.merchant.findUnique({ where: { userId } }));
      case UserRole.PROVIDER:
        return !!(await this.prisma.provider.findUnique({ where: { userId } }));
      case UserRole.ADMIN:
        return !!(await this.prisma.admin.findUnique({ where: { userId } }));
      default:
        return false;
    }
  }

  private async createRoleProfile(userId: string, role: UserRole): Promise<void> {
    switch (role) {
      case UserRole.CLIENT:
        await this.prisma.client.create({
          data: { userId },
        });
        break;
      case UserRole.DELIVERER:
        await this.prisma.deliverer.create({
          data: {
            userId,
            phone: '', // Required field
          },
        });
        break;
      case UserRole.MERCHANT:
        await this.prisma.merchant.create({
          data: {
            userId,
            companyName: '',
            address: '',
            phone: '',
          },
        });
        break;
      case UserRole.PROVIDER:
        await this.prisma.provider.create({
          data: {
            userId,
            address: '',
            phone: '',
            services: [],
          },
        });
        break;
      case UserRole.ADMIN:
        await this.prisma.admin.create({
          data: {
            userId,
            permissions: ['users.view'],
          },
        });
        break;
      default:
        break;
    }
  }
}
