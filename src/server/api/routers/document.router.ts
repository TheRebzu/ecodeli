import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '@/server/api/trpc';
import { DocumentService } from '@/server/services/document.service';
import { DocumentStatus, DocumentType } from '../../db/enums';
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  createVerificationSchema,
  updateVerificationSchema,
} from '@/schemas/document.schema';

const documentService = new DocumentService();

export const documentRouter = router({
  /**
   * Obtenir les documents de l'utilisateur connecté
   */
  getMyDocuments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.session.user.id;
      const documents = await ctx.db.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: 'desc' },
      });
      return documents;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des documents',
        cause: error,
      });
    }
  }),

  /**
   * Obtenir les documents d'un utilisateur
   */
  getUserDocuments: protectedProcedure.query(async ({ ctx }) => {
    try {
      const documents = await DocumentService.getUserDocuments(ctx.session.user.id);
      return { documents };
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de la récupération des documents',
        cause: error,
      });
    }
  }),

  /**
   * Obtenir les documents en attente de vérification (admin)
   */
  getPendingDocuments: adminProcedure
    .input(
      z
        .object({
          userRole: z.enum(['DELIVERER', 'PROVIDER']).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      try {
        const userRole = input?.userRole;
        const documents = await DocumentService.getPendingDocuments(userRole);
        return { documents };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des documents en attente',
          cause: error,
        });
      }
    }),

  /**
   * Approuver ou rejeter un document (admin)
   */
  updateDocumentStatus: adminProcedure
    .input(
      z.object({
        documentId: z.string(),
        status: z.enum(['APPROVED', 'REJECTED']),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { documentId, status, rejectionReason } = input;
        const adminId = ctx.session.user.id;

        const document = await DocumentService.updateDocumentStatus(
          documentId,
          status as DocumentStatus,
          adminId,
          rejectionReason
        );

        return {
          success: true,
          document,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la mise à jour du statut du document',
          cause: error,
        });
      }
    }),

  /**
   * Téléverser un document
   */
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return await documentService.uploadDocument({
        userId,
        type: input.type,
        filename: input.file.name,
        fileUrl: 'temp-url', // Sera mise à jour après upload sur le service de stockage
        mimeType: input.file.type,
        fileSize: input.file.size,
        notes: input.notes,
      });
    }),

  /**
   * Supprimer un document
   */
  deleteDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const deleted = await DocumentService.deleteDocument(input.documentId, userId);

        if (!deleted) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à supprimer ce document",
          });
        }

        return {
          success: true,
          documentId: input.documentId,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la suppression du document',
          cause: error,
        });
      }
    }),

  // Mettre à jour un document
  updateDocument: protectedProcedure
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier que le document appartient à l'utilisateur
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé',
        });
      }

      if (document.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à modifier ce document",
        });
      }

      return await documentService.updateDocument(input);
    }),

  // Obtenir un document par ID
  getDocumentById: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await documentService.getDocumentById(input.documentId);

      // Vérifier que l'utilisateur a le droit de voir ce document
      if (document.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à accéder à ce document",
        });
      }

      return document;
    }),

  // Admin: Obtenir tous les documents en attente de vérification
  getPendingVerifications: protectedProcedure.query(async ({ ctx }) => {
    // Vérifier que l'utilisateur est admin
    if (ctx.session.user.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accès refusé',
      });
    }

    return await documentService.getPendingVerificationDocuments();
  }),

  // Créer une demande de vérification pour un document
  createVerification: protectedProcedure
    .input(createVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Vérifier que le document appartient à l'utilisateur
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé',
        });
      }

      if (document.userId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à demander une vérification pour ce document",
        });
      }

      return await documentService.createVerification({
        submitterId: userId,
        documentId: input.documentId,
        notes: input.notes,
      });
    }),

  // Admin: Mettre à jour une vérification
  updateVerification: protectedProcedure
    .input(updateVerificationSchema)
    .mutation(async ({ ctx, input }) => {
      // Vérifier que l'utilisateur est admin
      if (ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        });
      }

      return await documentService.updateVerification({
        verificationId: input.verificationId,
        verifierId: ctx.session.user.id,
        status: input.status,
        notes: input.notes,
      });
    }),

  // Obtenir les vérifications pour un document
  getDocumentVerifications: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Vérifier que le document appartient à l'utilisateur ou que l'utilisateur est admin
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId },
      });

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé',
        });
      }

      if (document.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à accéder aux vérifications de ce document",
        });
      }

      return await documentService.getDocumentVerifications(input.documentId);
    }),
});
