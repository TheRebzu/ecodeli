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

        let fileUrl = '';
        let fileName = '';
        let mimeType = '';
        let fileSize = 0;

        // Traitement différent selon que input.file est un objet File ou une URL
        if (typeof input.file === 'string') {
          // C'est une URL de fichier déjà téléchargé
          console.log("Traitement d'une URL de fichier:", input.file);
          fileUrl = input.file;

          // Extraire le nom du fichier depuis l'URL
          const urlParts = input.file.split('/');
          fileName = urlParts[urlParts.length - 1];
          // On ne peut pas déterminer précisément ces informations depuis une URL
          mimeType = 'application/octet-stream'; // Par défaut
          fileSize = 0; // Par défaut
        } else {
          // C'est un objet File, on doit le sauvegarder physiquement
          console.log("Traitement d'un objet File:", input.file);
          const file = input.file;

          // Vérifier que le fichier est valide
          if (!file) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Fichier invalide',
            });
          }

          // Vérifier que le nom du fichier est disponible
          if (!file.name) {
            console.log("Fichier sans nom, utilisation d'un nom générique");
            file.name = `document-${Date.now()}`;
          }

          // 1. Sauvegarder physiquement le fichier
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId);

          // Créer le répertoire s'il n'existe pas
          await fs.mkdir(uploadDir, { recursive: true });

          // Créer un nom de fichier unique pour éviter les collisions
          // Utiliser un nom sécurisé pour le fichier
          const safeName = file.name
            ? file.name.replace(/[^a-z0-9.]/gi, '-')
            : `document-${Date.now()}`;
          const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`;

          // Chemin complet du fichier
          const filePath = path.join(uploadDir, uniqueFilename);

          // URL relative pour l'accès client
          fileUrl = `/uploads/${userId}/${uniqueFilename}`;

          // Extraire le contenu du fichier et l'écrire sur le disque
          let fileBuffer;

          // Vérifier tous les cas possibles pour extraire le contenu du fichier
          if ('arrayBuffer' in file && typeof file.arrayBuffer === 'function') {
            // Cas standard pour File web API
            const arrayBuffer = await file.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
          } else if ('buffer' in file) {
            // Format Node.js
            fileBuffer = file.buffer;
          } else if (typeof file === 'object' && 'base64' in file) {
            // Format base64 spécifié dans un objet
            fileBuffer = Buffer.from(file.base64, 'base64');
          } else if (typeof file === 'object' && 'data' in file) {
            // Format objet avec données brutes
            fileBuffer = Buffer.from(file.data);
          } else if (typeof file === 'object') {
            // Tentative de conversion de l'objet entier en Buffer
            try {
              // Convertir l'objet en JSON string pour le debug
              console.log('Format du fichier reçu:', JSON.stringify(file));

              // Si l'objet a une propriété qui pourrait contenir les données
              if ('stream' in file) {
                // Lecture d'un stream
                const chunks = [];
                for await (const chunk of file.stream) {
                  chunks.push(chunk);
                }
                fileBuffer = Buffer.concat(chunks);
              } else if (file.toString() !== '[object Object]') {
                // Si toString() retourne quelque chose d'utile
                fileBuffer = Buffer.from(file.toString());
              } else {
                // Dernier recours: considérer que le fichier est actuellement une représentation JSON
                // On le convertit en chaîne pour l'enregistrer tel quel
                fileBuffer = Buffer.from(JSON.stringify(file));
              }
            } catch (e) {
              console.error('Erreur lors de la tentative de conversion du fichier:', e);
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Format de fichier non pris en charge',
              });
            }
          } else {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Impossible de lire le contenu du fichier',
            });
          }

          await fs.writeFile(filePath, fileBuffer);

          console.log(`Fichier écrit avec succès : ${filePath}`);
          console.log(`URL du fichier : ${fileUrl}`);

          // Récupérer les métadonnées du fichier
          fileName = file.name || uniqueFilename;
          mimeType = file.type || 'application/octet-stream';
          fileSize = file.size || fileBuffer.length || 0;
        }

        // 2. Enregistrer les métadonnées du document dans la base de données
        const result = await documentService.uploadDocument({
          userId,
          type: input.type,
          filename: fileName,
          fileUrl: fileUrl,
          mimeType: mimeType,
          fileSize: fileSize,
          notes: input.notes,
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
