import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  UploadService,
  type UploadType,
} from "@/server/services/common/upload.service";
import { TRPCError } from "@trpc/server";

// Schémas de validation pour les uploads
const uploadTypeSchema = z.enum([
  "announcement",
  "profile",
  "service",
  "document",
]);

const uploadFileSchema = z.object({
  file: z.string().min(1, "Fichier requis"), // Base64 string
  type: uploadTypeSchema,
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const deleteFileSchema = z.object({
  fileUrl: z.string().min(1, "URL du fichier requise"),
});

const getFileInfoSchema = z.object({
  filename: z.string().min(1, "Nom de fichier requis"),
});

export const uploadRouter = router({
  /**
   * Upload un fichier (base64)
   */
  uploadFile: protectedProcedure
    .input(uploadFileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        });
      }

      try {
        const result = await UploadService.uploadFile({
          file: input.file,
          type: input.type,
          userId: ctx.session.user.id,
          description: input.description,
          metadata: input.metadata,
        });

        return {
          success: true,
          data: result,
          message: "Fichier uploadé avec succès",
        };
      } catch (error: any) {
        console.error("Erreur upload tRPC:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erreur lors de l'upload",
        });
      }
    }),

  /**
   * Supprime un fichier uploadé
   */
  deleteFile: protectedProcedure
    .input(deleteFileSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        });
      }

      try {
        const result = await UploadService.deleteFile(
          input.fileUrl,
          ctx.session.user.id,
        );

        return {
          success: result.success,
          message: "Fichier supprimé avec succès",
        };
      } catch (error: any) {
        console.error("Erreur suppression tRPC:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la suppression",
        });
      }
    }),

  /**
   * Récupère les informations d'un fichier
   */
  getFileInfo: protectedProcedure
    .input(getFileInfoSchema)
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        });
      }

      try {
        const result = await UploadService.getFileInfo(
          input.filename,
          ctx.session.user.id,
        );

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        console.error("Erreur récupération fichier tRPC:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération du fichier",
        });
      }
    }),

  /**
   * Upload multiple pour les photos d'annonces
   */
  uploadAnnouncementPhotos: protectedProcedure
    .input(
      z.object({
        photos: z
          .array(z.string())
          .min(1, "Au moins une photo requise")
          .max(5, "Maximum 5 photos"),
        announcementId: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        });
      }

      try {
        const uploadPromises = input.photos.map(async (photo, index) => {
          return await UploadService.uploadFile({
            file: photo,
            type: "announcement",
            userId: ctx.session.user.id,
            description: `Photo d'annonce ${index + 1}`,
            metadata: {
              ...input.metadata,
              announcementId: input.announcementId,
              photoIndex: index,
            },
          });
        });

        const results = await Promise.all(uploadPromises);

        return {
          success: true,
          data: {
            photos: results,
            count: results.length,
          },
          message: `${results.length} photo(s) uploadée(s) avec succès`,
        };
      } catch (error: any) {
        console.error("Erreur upload photos tRPC:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'upload des photos",
        });
      }
    }),

  /**
   * Récupère les uploads d'un utilisateur
   */
  getUserUploads: protectedProcedure
    .input(
      z.object({
        type: uploadTypeSchema.optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentification requise",
        });
      }

      try {
        // Pour les documents, on peut récupérer depuis la base
        if (input.type === "document" || !input.type) {
          const documents = await ctx.db.document.findMany({
            where: {
              userId: ctx.session.user.id,
              ...(input.type && { type: { not: undefined } }),
            },
            select: {
              id: true,
              filename: true,
              fileUrl: true,
              fileSize: true,
              mimeType: true,
              uploadedAt: true,
              verificationStatus: true,
              notes: true,
            },
            orderBy: { uploadedAt: "desc" },
            skip: (input.page - 1) * input.limit,
            take: input.limit,
          });

          const total = await ctx.db.document.count({
            where: {
              userId: ctx.session.user.id,
              ...(input.type && { type: { not: undefined } }),
            },
          });

          return {
            success: true,
            data: {
              uploads: documents,
              pagination: {
                page: input.page,
                limit: input.limit,
                total,
                pages: Math.ceil(total / input.limit),
              },
            },
          };
        }

        // Pour les autres types, retourner une liste vide car pas trackés en DB
        return {
          success: true,
          data: {
            uploads: [],
            pagination: {
              page: input.page,
              limit: input.limit,
              total: 0,
              pages: 0,
            },
          },
        };
      } catch (error: any) {
        console.error("Erreur récupération uploads tRPC:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des uploads",
        });
      }
    }),
});
