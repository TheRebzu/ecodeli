import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../trpc';
import { DocumentService } from '../../services/document.service';
import { DocumentStatus, DocumentType } from '../../db/enums';
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  createVerificationSchema,
  updateVerificationSchema,
} from '../../../schemas/auth/document.schema';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const documentService = new DocumentService();

export const documentRouter = router({
  /**
   * Obtenir les documents d'un utilisateur
   */
  getUserDocuments: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          userId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        // Utilisation de l'instance documentService plutôt que de la classe DocumentService
        const userId = input?.userId || ctx.session.user.id;
        const status = input?.status;
        const documents = await documentService.getUserDocuments(userId);
        return documents;
      } catch (error: any) {
        console.error('Erreur lors de la récupération des documents:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des documents',
          cause: error,
        });
      }
    }),

  /**
   * Obtenir les types de documents requis pour un rôle d'utilisateur
   */
  getRequiredDocumentTypes: protectedProcedure
    .input(
      z.object({
        userRole: z.enum(['DELIVERER', 'PROVIDER', 'MERCHANT', 'CLIENT']),
      })
    )
    .query(async ({ input }) => {
      try {
        const types = documentService.getRequiredDocumentTypesByRole(input.userRole.toLowerCase());
        return types;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des types de documents requis',
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
        const documents = await documentService.getPendingDocuments(userRole);
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
        if (!ctx.session?.user?.id) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Session utilisateur non trouvée',
          });
        }
        const adminId = ctx.session.user.id;

        // Utiliser correctement le service de document pour mettre à jour le statut
        const document = await documentService.verifyDocument({
          documentId,
          status: status as DocumentStatus,
          adminId,
          rejectionReason,
        });

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
      try {
        const userId = ctx.session.user.id;

        // Vérification des données avant envoi
        if (!input.file || !input.type) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Le fichier et le type de document sont requis',
          });
        }

        let docType = input.type;
        let documentNotes = input.notes || '';

        // SELFIE is now a valid enum type in the Prisma schema, no need to convert
        // Keep documentNotes as is

        let fileUrl = '';
        let fileName = '';
        let mimeType = '';
        let fileSize = 0;

        // Traiter le fichier selon son type
        if (typeof input.file === 'string') {
          // Cas d'une chaîne base64
          console.log("Traitement d'une chaîne base64");

          // Extraire le type MIME et les données de la chaîne base64
          const matches = input.file.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

          if (!matches || matches.length !== 3) {
            console.error('Format base64 invalide');
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Format de fichier base64 invalide',
            });
          }

          // Extraire les informations du format base64
          mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          fileSize = buffer.length;

          // Déterminer l'extension de fichier en fonction du MIME type
          let extension = '.bin';
          if (mimeType === 'image/jpeg') extension = '.jpg';
          else if (mimeType === 'image/png') extension = '.png';
          else if (mimeType === 'image/heic') extension = '.heic';
          else if (mimeType === 'application/pdf') extension = '.pdf';

          // Générer un nom de fichier unique
          const randomId = crypto.randomBytes(8).toString('hex');
          const uniqueFilename = `${randomId}${extension}`;

          // Créer le chemin du dossier pour les uploads
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
          await fs.mkdir(uploadDir, { recursive: true });

          // Chemin complet du fichier
          const filePath = path.join(uploadDir, uniqueFilename);

          // Écrire le fichier sur le disque
          await fs.writeFile(filePath, buffer);
          console.log(
            `Fichier base64 écrit avec succès: ${filePath}, taille: ${buffer.length} octets`
          );

          // Construire l'URL du fichier
          fileUrl = `/uploads/${userId}/${uniqueFilename}`;
          fileName = uniqueFilename;

          // Enregistrer les métadonnées dans la base de données
          const result = await documentService.uploadDocument({
            userId,
            type: docType,
            filename: uniqueFilename,
            fileUrl,
            mimeType,
            fileSize: buffer.length,
            notes: documentNotes,
            expiryDate: input.expiryDate,
          });

          return result;
        } else if (typeof input.file === 'object') {
          // Cas d'un objet File ou similaire
          console.log("Traitement d'un objet File:", typeof input.file, input.file);

          // Par sécurité, vérifions que ces propriétés existent
          const originalName = (input.file as { name?: string }).name || `document-${Date.now()}`;
          mimeType = (input.file as { type?: string }).type || 'application/octet-stream';

          // Déterminer l'extension de fichier
          let extension = '.bin';
          if (mimeType === 'image/jpeg') extension = '.jpg';
          else if (mimeType === 'image/png') extension = '.png';
          else if (mimeType === 'image/heic') extension = '.heic';
          else if (mimeType === 'application/pdf') extension = '.pdf';

          // Générer un nom de fichier unique
          const randomId = crypto.randomBytes(8).toString('hex');
          const uniqueFilename = `${randomId}${extension}`;
          fileName = uniqueFilename;

          // Créer le chemin du dossier pour les uploads
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);
          await fs.mkdir(uploadDir, { recursive: true });

          // Chemin complet du fichier
          const filePath = path.join(uploadDir, uniqueFilename);
          fileUrl = `/uploads/${userId}/${uniqueFilename}`;

          // Extraire le contenu binaire du fichier
          let fileBuffer: Buffer;

          if ('arrayBuffer' in input.file && typeof input.file.arrayBuffer === 'function') {
            throw new Error('arrayBuffer method not available in server context');
          } else if ('buffer' in input.file) {
            fileBuffer = (input.file as { buffer: Buffer }).buffer;
          } else if (Buffer.isBuffer(input.file)) {
            fileBuffer = input.file;
          } else if ('base64' in input.file) {
            fileBuffer = Buffer.from((input.file as { base64: string }).base64, 'base64');
          } else if ('data' in input.file) {
            fileBuffer = Buffer.from((input.file as { data: string | Buffer }).data);
          } else {
            try {
              console.log(
                "Tentative de sérialisation de l'objet File:",
                JSON.stringify(input.file)
              );

              if (input.file && typeof input.file === 'object') {
                fileBuffer = Buffer.from(JSON.stringify(input.file));
                mimeType = 'application/json';
                extension = '.json';
              } else {
                throw new Error('Format de fichier non pris en charge');
              }
            } catch (e) {
              console.error('Erreur lors de la sérialisation du fichier:', e);
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Format de fichier non pris en charge',
              });
            }
          }

          // Écrire le fichier sur le disque
          try {
            if (!fileBuffer) {
              throw new Error("Impossible d'extraire les données du fichier");
            }

            await fs.writeFile(filePath, fileBuffer);
            fileSize = fileBuffer.length;
            console.log(`Fichier écrit avec succès: ${filePath}, taille: ${fileSize} octets`);
          } catch (writeError) {
            console.error("Erreur lors de l'écriture du fichier:", writeError);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: "Erreur lors de l'enregistrement du fichier",
            });
          }
        } else {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Format de fichier non pris en charge',
          });
        }

        // Enregistrer les métadonnées dans la base de données
        const result = await documentService.uploadDocument({
          userId,
          type: docType,
          filename: fileName,
          fileUrl,
          mimeType,
          fileSize: fileSize,
          notes: documentNotes,
          expiryDate: input.expiryDate,
        });

        return result;
      } catch (error: any) {
        console.error('Erreur lors du téléversement du document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors du téléversement du document',
          cause: error,
        });
      }
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
        const deleted = await documentService.deleteDocument(input.documentId, userId);

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
      try {
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
      } catch (error: any) {
        console.error('Erreur lors de la mise à jour du document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la mise à jour du document',
          cause: error,
        });
      }
    }),

  // Obtenir un document par ID
  getDocumentById: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const document = await documentService.getDocumentById(input.documentId);

        // Vérifier que l'utilisateur a le droit de voir ce document
        if (document.userId !== ctx.session.user.id && ctx.session.user.role !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à accéder à ce document",
          });
        }

        return document;
      } catch (error: any) {
        console.error('Erreur lors de la récupération du document:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erreur lors de la récupération du document',
          cause: error,
        });
      }
    }),

  // Admin: Obtenir tous les documents en attente de vérification
  getPendingVerifications: protectedProcedure.query(async ({ ctx }) => {
    // Vérifier que l'utilisateur est admin
    if (ctx.session?.user?.role !== 'ADMIN') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Accès refusé',
      });
    }

    return await documentService.getPendingDocuments();
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
      if (ctx.session?.user?.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Accès refusé',
        });
      }

      return await documentService.updateVerification({
        verificationId: input.verificationId,
        verifierId: ctx.session.user.id,
        status: input.status as unknown as VerificationStatus,
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
