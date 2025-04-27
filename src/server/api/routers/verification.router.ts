import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { UserRole, DocumentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { VerificationService } from '../../services/verification.service';
import { documentService } from '@/server/services/document.service';
import { notificationService } from '@/server/services/notification.service';
import { VerificationStatus } from '@prisma/client';
import { getUserPreferredLocale } from '@/lib/user-locale';

const verificationService = new VerificationService();

export const verificationRouter = router({
  // Upload a document for verification
  uploadDocument: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(DocumentType),
        file: z.any(), // In a real implementation, this would be handled by formidable or similar
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role as UserRole;

      // For the demo, we'll use a placeholder for the file. In a real implementation,
      // this would be handled by a file upload middleware
      const fileData = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 1024000,
      } as File;

      return await verificationService.uploadDocument(userId, input.type, fileData, userRole);
    }),

  // Review a document (admin only)
  reviewDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(['APPROVED', 'REJECTED']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const adminId = ctx.session.user.id;

      return await verificationService.reviewDocument(
        input.documentId,
        adminId,
        input.status as any,
        input.notes
      );
    }),

  // Get pending verifications for a specific user role (admin only)
  getPendingVerifications: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const skip = (page - 1) * limit;

      try {
        const [verifications, total] = await Promise.all([
          ctx.db.document.findMany({
            where: {
              isVerified: false,
              verificationStatus: VerificationStatus.PENDING,
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              uploadedAt: 'desc',
            },
            skip,
            take: limit,
          }),
          ctx.db.document.count({
            where: {
              isVerified: false,
              verificationStatus: VerificationStatus.PENDING,
            },
          }),
        ]);

        return {
          data: verifications,
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasMore: skip + limit < total,
          },
        };
      } catch (error) {
        console.error('Error fetching pending verifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch pending verifications',
        });
      }
    }),

  // Get verified and rejected documents
  getProcessedVerifications: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
        status: z.enum([VerificationStatus.APPROVED, VerificationStatus.REJECTED]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status } = input;
      const skip = (page - 1) * limit;

      const whereClause = status
        ? { verificationStatus: status }
        : {
            verificationStatus: {
              in: [VerificationStatus.APPROVED, VerificationStatus.REJECTED],
            },
          };

      try {
        const [verifications, total] = await Promise.all([
          ctx.db.document.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              verifiedAt: 'desc',
            },
            skip,
            take: limit,
          }),
          ctx.db.document.count({
            where: whereClause,
          }),
        ]);

        return {
          data: verifications,
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
            hasMore: skip + limit < total,
          },
        };
      } catch (error) {
        console.error('Error fetching processed verifications:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch processed verifications',
        });
      }
    }),

  // Approve a document
  approveDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { documentId, notes } = input;

      try {
        const document = await ctx.db.document.findUnique({
          where: { id: documentId },
          include: { user: true },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Update document status
        const updatedDocument = await documentService.updateDocument(documentId, {
          isVerified: true,
          verificationStatus: VerificationStatus.APPROVED,
          verifiedAt: new Date(),
          verifiedBy: ctx.session.user.id,
          notes: notes || null,
        });

        // Check if all required documents are now verified
        const requiredDocuments = documentService.getRequiredDocumentTypesByRole(
          document.user.role
        );
        const hasAllDocuments = await documentService.hasRequiredDocuments(
          document.user.id,
          requiredDocuments
        );

        // If all documents are verified, update user verification status
        if (hasAllDocuments) {
          await ctx.db.user.update({
            where: { id: document.user.id },
            data: {
              status: 'ACTIVE',
            },
          });

          // Send verification status changed notification
          const userLocale = getUserPreferredLocale(document.user);
          await notificationService.sendVerificationStatusChangedNotification(
            document.user,
            VerificationStatus.APPROVED,
            null,
            userLocale
          );
        }

        return updatedDocument;
      } catch (error) {
        console.error('Error approving document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to approve document',
        });
      }
    }),

  // Reject a document
  rejectDocument: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { documentId, reason } = input;

      try {
        const document = await ctx.db.document.findUnique({
          where: { id: documentId },
          include: { user: true },
        });

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Document not found',
          });
        }

        // Update document status
        const updatedDocument = await documentService.updateDocument(documentId, {
          isVerified: false,
          verificationStatus: VerificationStatus.REJECTED,
          verifiedAt: new Date(),
          verifiedBy: ctx.session.user.id,
          rejectionReason: reason,
        });

        return updatedDocument;
      } catch (error) {
        console.error('Error rejecting document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reject document',
        });
      }
    }),

  // Get user verification status
  getUserVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;

      // Get required documents based on user role
      const requiredDocuments = documentService.getRequiredDocumentTypesByRole(
        ctx.session.user.role
      );

      // Get user documents
      const documents = await ctx.db.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
      });

      // Compute missing documents
      const verifiedDocumentTypes = documents.filter(doc => doc.isVerified).map(doc => doc.type);

      const missingDocuments = requiredDocuments.filter(
        type => !verifiedDocumentTypes.includes(type)
      );

      // Check if any documents are pending verification
      const hasPendingDocuments = documents.some(
        doc => doc.verificationStatus === VerificationStatus.PENDING
      );

      // Check if any documents are rejected
      const hasRejectedDocuments = documents.some(
        doc => doc.verificationStatus === VerificationStatus.REJECTED
      );

      return {
        isVerified: missingDocuments.length === 0,
        pendingDocuments: hasPendingDocuments,
        rejectedDocuments: hasRejectedDocuments,
        requiredDocuments,
        uploadedDocuments: documents,
        missingDocuments,
      };
    } catch (error) {
      console.error('Error getting user verification status:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get user verification status',
      });
    }
  }),

  // Request verification reminder for a user
  requestVerificationReminder: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId } = input;

      try {
        const user = await ctx.db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // Get required documents and check which ones are missing
        const requiredDocuments = documentService.getRequiredDocumentTypesByRole(user.role);
        const missingDocuments = await documentService.getMissingRequiredDocuments(
          userId,
          requiredDocuments
        );

        if (missingDocuments.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User has already uploaded all required documents',
          });
        }

        // Send notification for missing documents
        const userLocale = getUserPreferredLocale(user);
        await notificationService.sendMissingDocumentsReminder(user, missingDocuments, userLocale);

        return { success: true, missingDocuments };
      } catch (error) {
        console.error('Error sending verification reminder:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification reminder',
        });
      }
    }),
});
