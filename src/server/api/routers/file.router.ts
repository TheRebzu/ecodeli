import { z } from 'zod';
import { router, protectedProcedure } from '@/server/api/trpc';
import { TRPCError } from '@trpc/server';
import crypto from 'crypto';
import { DocumentType } from '@prisma/client';

/**
 * Router pour gérer les opérations sur les fichiers
 * Les uploads et downloads réels restent en API routes pour le streaming
 * Ce router gère les métadonnées et les URLs signées
 */
export const fileRouter = router({
  /**
   * Préparer un upload de fichier
   * Retourne une URL signée et un token pour l'upload
   */
  prepareUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        documentType: z.nativeEnum(DocumentType).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session.user.id;
        const { fileName, fileType, fileSize, documentType } = input;

        // Vérifier la taille du fichier (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (fileSize > maxSize) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Le fichier est trop volumineux (max: 10MB)',
          });
        }

        // Vérifier le type de fichier
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

        if (!allowedTypes.includes(fileType)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Type de fichier non supporté',
          });
        }

        // Générer un token unique pour cet upload
        const uploadToken = crypto.randomBytes(32).toString('hex');
        const uploadId = crypto.randomBytes(16).toString('hex');

        // Stocker temporairement les informations d'upload
        // Dans un cas réel, utilisez Redis ou une base de données temporaire
        const uploadInfo = {
          userId,
          fileName,
          fileType,
          fileSize,
          documentType,
          uploadId,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // Expire dans 30 minutes
        };

        // Stocker dans la session ou cache (à implémenter selon votre infrastructure)
        // Pour l'instant, on retourne juste les infos nécessaires

        return {
          uploadId,
          uploadToken,
          uploadUrl: `/api/upload`,
          maxSize,
          allowedTypes,
        };
      } catch (error) {
        console.error("Erreur lors de la préparation de l'upload:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de la préparation de l'upload",
        });
      }
    }),

  /**
   * Obtenir une URL de téléchargement signée pour un fichier
   */
  getDownloadUrl: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
        forceDownload: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { fileUrl, forceDownload } = input;
        const userId = ctx.session.user.id;

        // Vérifier que l'URL est valide et sécurisée
        if (!fileUrl.startsWith('/uploads/')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'URL de fichier invalide',
          });
        }

        // Générer un token temporaire pour le téléchargement
        const downloadToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Expire dans 15 minutes

        // Construire l'URL de téléchargement avec le token
        const downloadUrl = `/api/download?path=${encodeURIComponent(fileUrl)}&token=${downloadToken}${forceDownload ? '&download=true' : ''}`;

        return {
          url: downloadUrl,
          expiresAt,
          token: downloadToken,
        };
      } catch (error) {
        console.error("Erreur lors de la génération de l'URL de téléchargement:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Erreur lors de la génération de l'URL de téléchargement",
        });
      }
    }),

  /**
   * Supprimer un fichier
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { fileUrl } = input;
        const userId = ctx.session.user.id;
        const userRole = ctx.session.user.role;

        // Vérifier que l'URL est valide
        if (!fileUrl.startsWith('/uploads/')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'URL de fichier invalide',
          });
        }

        // Extraire l'ID utilisateur du chemin du fichier
        const pathParts = fileUrl.split('/');
        const fileUserId = pathParts[2]; // /uploads/{userId}/{filename}

        // Vérifier les permissions
        if (fileUserId !== userId && userRole !== 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: "Vous n'êtes pas autorisé à supprimer ce fichier",
          });
        }

        // TODO: Implémenter la suppression physique du fichier
        // Pour l'instant, on retourne juste un succès

        return {
          success: true,
          message: 'Fichier supprimé avec succès',
        };
      } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la suppression du fichier',
        });
      }
    }),

  /**
   * Obtenir les informations sur un fichier
   */
  getFileInfo: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { fileUrl } = input;

        // Vérifier que l'URL est valide
        if (!fileUrl.startsWith('/uploads/')) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'URL de fichier invalide',
          });
        }

        // Extraire les informations du chemin
        const pathParts = fileUrl.split('/');
        const userId = pathParts[2];
        const fileName = pathParts[3];

        // TODO: Récupérer les vraies métadonnées du fichier depuis le système de fichiers
        // Pour l'instant, on retourne des infos basiques

        return {
          fileName,
          fileUrl,
          userId,
          // Ces informations devraient venir de la base de données ou du système de fichiers
          fileSize: 0,
          mimeType: 'application/octet-stream',
          uploadedAt: new Date(),
        };
      } catch (error) {
        console.error('Erreur lors de la récupération des informations du fichier:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erreur lors de la récupération des informations du fichier',
        });
      }
    }),
});
