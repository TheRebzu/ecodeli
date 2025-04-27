import { router, protectedProcedure, adminProcedure } from '../trpc';
import { z } from 'zod';
import { UserRole, DocumentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { VerificationService } from '../../services/verification.service';

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
        userRole: z.nativeEnum(UserRole),
      })
    )
    .query(async ({ input }) => {
      return await verificationService.getPendingVerifications(input.userRole);
    }),

  // Get verification history for the current user
  getUserVerifications: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    return await verificationService.getUserVerifications(userId);
  }),

  // Get verification status for the current user
  getVerificationStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;

    if (!user.profileId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Profil utilisateur non trouvé',
      });
    }

    // Return different verification status based on user role
    switch (user.role) {
      case 'DELIVERER':
        return {
          role: user.role,
          isVerified: user.isVerified || false,
          requiredDocuments: [
            DocumentType.ID_CARD,
            DocumentType.DRIVING_LICENSE,
            DocumentType.VEHICLE_REGISTRATION,
            DocumentType.INSURANCE,
          ],
        };
      case 'PROVIDER':
        return {
          role: user.role,
          isVerified: user.isVerified || false,
          requiredDocuments: [
            DocumentType.ID_CARD,
            DocumentType.QUALIFICATION_CERTIFICATE,
            DocumentType.INSURANCE,
          ],
        };
      case 'MERCHANT':
        return {
          role: user.role,
          isVerified: user.isVerified || false,
          requiredDocuments: [DocumentType.ID_CARD, DocumentType.OTHER],
        };
      default:
        return {
          role: user.role,
          isVerified: true,
          requiredDocuments: [],
        };
    }
  }),
});
