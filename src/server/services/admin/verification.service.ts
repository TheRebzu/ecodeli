import { db } from '@/server/db';
import { UserRole, VerificationStatus } from '@prisma/client';
import {
  ApproveVerification,
  GetVerificationDetail,
  ListVerificationDocuments,
  RejectVerification,
  VerificationFilters,
  VerificationHistory,
  VerificationStats,
} from '@/types/verification';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';

export const verificationService = {
  /**
   * Get a paginated list of verification requests with filters
   */
  async getVerificationRequests(filters: VerificationFilters) {
    const {
      role,
      status,
      search,
      dateFrom,
      dateTo,
      page = 1,
      limit = 10,
      sortBy = 'requestedAt',
      sortDirection = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    // Build the where clause based on filters
    const where: Prisma.VerificationWhereInput = {};

    if (status) {
      where.status = status as VerificationStatus;
    }

    if (dateFrom || dateTo) {
      where.requestedAt = {};
      if (dateFrom) where.requestedAt.gte = new Date(dateFrom);
      if (dateTo) where.requestedAt.lte = new Date(dateTo);
    }

    // For role filtering, we need to join with the user table
    if (role) {
      where.submitter = {
        role: role as UserRole,
      };
    }

    if (search) {
      where.submitter = {
        ...where.submitter,
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    // Get total count for pagination
    const total = await db.verification.count({ where });

    // Get verification requests
    const verificationRequests = await db.verification.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortDirection,
      },
      include: {
        document: true,
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
            role: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      verificationRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get verification request statistics
   */
  async getVerificationStats(): Promise<VerificationStats> {
    // Get counts by status
    const statusCounts = await db.verification.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    // Get counts of pending requests by user role
    const pendingByRoleCounts = await db.$queryRaw<Array<{ role: UserRole; count: BigInt }>>`
      SELECT u.role, COUNT(v.id) as count
      FROM "verifications" v
      JOIN "users" u ON v.submitterId = u.id
      WHERE v.status = 'PENDING'
      GROUP BY u.role
    `;

    // Transform to the expected format
    const pendingByRole: Record<UserRole, number> = {} as Record<UserRole, number>;

    pendingByRoleCounts.forEach(item => {
      pendingByRole[item.role] = Number(item.count);
    });

    // Calculate totals
    const pending = statusCounts.find(s => s.status === 'PENDING')?._count?.id || 0;
    const approved = statusCounts.find(s => s.status === 'APPROVED')?._count?.id || 0;
    const rejected = statusCounts.find(s => s.status === 'REJECTED')?._count?.id || 0;
    const total = pending + approved + rejected;

    return {
      pending,
      approved,
      rejected,
      total,
      pendingByRole,
    };
  },

  /**
   * Get verification request details by ID
   */
  async getVerificationDetail({ verificationId }: GetVerificationDetail) {
    const verification = await db.verification.findUnique({
      where: { id: verificationId },
      include: {
        document: true,
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            image: true,
            createdAt: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!verification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    return verification;
  },

  /**
   * Approve a verification request
   */
  async approveVerification({
    verificationId,
    notes,
    adminId,
  }: ApproveVerification & { adminId: string }) {
    // Check if verification exists and is pending
    const verification = await db.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    if (verification.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verification request has already been processed',
      });
    }

    // Start a transaction to update verification and user role
    const updatedVerification = await db.$transaction(async tx => {
      // 1. Update verification status
      const updated = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: 'APPROVED',
          verifiedAt: new Date(),
          verifierId: adminId,
          notes,
        },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          document: true,
        },
      });

      // 2. Update the document status
      await tx.document.update({
        where: { id: verification.documentId },
        data: {
          verificationStatus: 'APPROVED',
          isVerified: true,
          reviewerId: adminId,
        },
      });

      // 3. Create verification history entry
      await tx.verificationHistory.create({
        data: {
          status: 'APPROVED',
          comment: notes,
          userId: verification.submitterId,
          verifiedById: adminId,
          documentId: verification.documentId,
        },
      });

      return updated;
    });

    return updatedVerification;
  },

  /**
   * Reject a verification request
   */
  async rejectVerification({
    verificationId,
    reason,
    adminId,
  }: RejectVerification & { adminId: string }) {
    // Check if verification exists and is pending
    const verification = await db.verification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Verification request not found',
      });
    }

    if (verification.status !== 'PENDING') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Verification request has already been processed',
      });
    }

    // Start a transaction
    const updatedVerification = await db.$transaction(async tx => {
      // 1. Update verification status
      const updated = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: 'REJECTED',
          verifiedAt: new Date(),
          verifierId: adminId,
          rejectionReason: reason,
        },
        include: {
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          document: true,
        },
      });

      // 2. Update the document status
      await tx.document.update({
        where: { id: verification.documentId },
        data: {
          verificationStatus: 'REJECTED',
          rejectionReason: reason,
          reviewerId: adminId,
        },
      });

      // 3. Create verification history entry
      await tx.verificationHistory.create({
        data: {
          status: 'REJECTED',
          comment: reason,
          userId: verification.submitterId,
          verifiedById: adminId,
          documentId: verification.documentId,
        },
      });

      return updated;
    });

    return updatedVerification;
  },

  /**
   * Get the list of documents for a user
   */
  async getVerificationDocuments({ userId }: ListVerificationDocuments) {
    return db.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  /**
   * Get verification history for a user
   */
  async getVerificationHistory({ userId, page = 1, limit = 10 }: VerificationHistory) {
    const skip = (page - 1) * limit;

    const total = await db.verificationHistory.count({
      where: { userId },
    });

    const history = await db.verificationHistory.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        document: true,
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};
