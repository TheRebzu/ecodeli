import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "@/server/api/trpc";
import { DocumentService } from "@/server/services/common/document.service";
import { DocumentStatus, UserRole, VerificationStatus } from "@/server/db/enums";
import {
  uploadDocumentSchema,
  updateDocumentSchema,
  createVerificationSchema,
  updateVerificationSchema} from "@/schemas/common/document.schema";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getUserDocumentsWithFullStatus, getRequiredDocumentTypesByRole } from "@/utils/document-utils";

const documentService = new DocumentService();

export const documentRouter = router({ /**
   * Obtenir les documents de l'utilisateur connecté
   */
  getMyDocuments: protectedProcedure.query(async ({ ctx  }) => {
    try {
      const userId = ctx.session.user.id;
      // Utiliser la fonction utilitaire pour récupérer les documents avec statut complet
      return await getUserDocumentsWithFullStatus(userId);
    } catch (error: any) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la récupération des documents",
        cause: error });
    }
  }),

  /**
   * Obtenir les documents d'un utilisateur
   */
  getUserDocuments: protectedProcedure
    .input(
      z
        .object({ status: z.string().optional(),
          userId: z.string().optional() })
        .optional(),
    )
    .query(async ({ ctx, input: input  }) => {
      try {
        const userId = input?.userId || ctx.session.user.id;
        console.log(`Récupération des documents pour l'utilisateur ${userId}`);

        // Utiliser la fonction utilitaire pour récupérer les documents avec statut complet
        const documents = await getUserDocumentsWithFullStatus(userId);

        // Filtrer par statut si nécessaire
        if (input?.status) {
          return documents.filter(
            (doc) => doc.effectiveStatus === input.status,
          );
        }

        return documents;
      } catch (error: any) {
        console.error("Erreur lors de la récupération des documents:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents",
          cause: error });
      }
    }),

  /**
   * Obtenir les types de documents requis pour un rôle d'utilisateur
   */
  getRequiredDocumentTypes: protectedProcedure
    .input(
      z.object({ userRole: z.enum(["DELIVERER", "PROVIDER", "MERCHANT", "CLIENT"]) }),
    )
    .query(async ({ input  }) => {
      try {
        // Utiliser la fonction centralisée depuis document-utils
        const { getRequiredDocumentTypesByRole } = await import("@/utils/document-utils");
        const types = getRequiredDocumentTypesByRole(input.userRole);
        return types;
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            "Erreur lors de la récupération des types de documents requis",
          cause: error });
      }
    }),
  /**
   * Obtenir les documents en attente de vérification (admin)
   */
  getPendingDocuments: adminProcedure
    .input(
      z
        .object({ status: z
            .enum(["PENDING", "APPROVED", "REJECTED"])
            .default("PENDING"),
          userRole: z.enum(["DELIVERER", "PROVIDER", "MERCHANT"]).optional() })
        .optional(),
    )
    .query(async ({ input  }) => {
      try {
        const status = input?.status || "PENDING";
        const userRole = input?.userRole;
        const documents = await documentService.getDocumentsByStatusAndRole(
          status,
          userRole,
        );
        return { documents };
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la récupération des documents en attente",
          cause: error });
      }
    }),

  /**
   * Approuver ou rejeter un document (admin)
   */
  updateDocumentStatus: adminProcedure
    .input(
      z.object({ documentId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
        rejectionReason: z.string().optional() }),
    )
    .mutation(async ({ ctx, input: input  }) => {
      try {
        const { documentId: documentId, status: status, rejectionReason: rejectionReason } = input;
        if (!ctx.session?.user?.id) {
          throw new TRPCError({ code: "UNAUTHORIZED",
            message: "Session utilisateur non trouvée" });
        }
        const adminId = ctx.session.user.id;

        // Convertir le status en VerificationStatus
        const verificationStatus =
          status === "APPROVED"
            ? VerificationStatus.APPROVED
            : VerificationStatus.REJECTED;

        // Utiliser correctement le service de document pour mettre à jour le statut
        const document = await documentService.verifyDocument({ documentId,
          verificationStatus,
          adminId,
          rejectionReason });

        return {
          success: true,
          document};
      } catch (error: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de la mise à jour du statut du document",
          cause: error });
      }
    }),

  /**
   * Téléverser un document
   * Cette procédure gère à la fois les uploads base64, les objets File et est compatible
   * avec les anciens appels à l'API Route /api/documents/upload qui utilisaient formidable
   */
  uploadDocument: protectedProcedure
    .input(uploadDocumentSchema.passthrough())
    .mutation(async ({ ctx, input }) => {
      console.log("📤 Upload Document - Données reçues:", {
        input: input,
        inputType: typeof input,
        inputKeys: input ? Object.keys(input) : "input is falsy",
        userId: ctx.session.user.id,
      });

      try {
        const userId = ctx.session.user.id;

        // Vérification des données avant envoi
        if (!input.file || !input.type) {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Le fichier et le type de document sont requis" });
        }

        let fileUrl = "";
        let fileName = "";
        let mimeType = "";
        let fileSize = 0;

        // Traiter le fichier selon son type
        if (typeof input.file === "string") {
          // Cas d'une chaîne base64
          console.log("Traitement d'une chaîne base64");

          // Extraire le type MIME et les données de la chaîne base64
          const matches = input.file.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

          if (!matches || matches.length !== 3) {
            console.error("Format base64 invalide");
            throw new TRPCError({ code: "BAD_REQUEST",
              message: "Format de fichier base64 invalide" });
          }

          // Extraire les informations du format base64
          mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          fileSize = buffer.length;

          // Déterminer l'extension de fichier en fonction du MIME type
          let extension = ".bin";
          if (mimeType === "image/jpeg") extension = ".jpg";
          else if (mimeType === "image/png") extension = ".png";
          else if (mimeType === "image/heic") extension = ".heic";
          else if (mimeType === "application/pdf") extension = ".pdf";

          // Générer un nom de fichier unique
          const randomId = crypto.randomBytes(8).toString("hex");
          const uniqueFilename = `${randomId}${extension}`;
          fileName = uniqueFilename;

          // Créer le chemin du dossier pour les uploads
          const uploadDir = path.join(
            process.cwd(),
            "public",
            "uploads",
            userId,
          );
          await fs.mkdir(uploadDir, { recursive: true });

          // Chemin complet du fichier
          const filePath = path.join(uploadDir, uniqueFilename);

          // Écrire le fichier sur le disque
          await fs.writeFile(filePath, buffer);
          console.log(
            `Fichier base64 écrit avec succès: ${filePath}, taille: ${buffer.length} octets`,
          );

          // Construire l'URL du fichier
          fileUrl = `/uploads/${userId}/${uniqueFilename}`;
        } else if (typeof input.file === "object") {
          // Cas d'un objet File ou similaire, y compris les fichiers traités par formidable
          console.log(
            "Traitement d'un objet File:",
            typeof input.file,
            input.file,
          );

          // Gérer différents types d'objets File
          if ("originalFilename" in input.file) {
            // Format provenant de formidable
            const formidableFile = input.file as {
              originalFilename?: string;
              mimetype?: string;
              size?: number;
              filepath?: string;
            };

            // Extraire les propriétés
            fileName =
              formidableFile.originalFilename || `document-${Date.now()}`;
            mimeType = formidableFile.mimetype || "application/octet-stream";
            fileSize = formidableFile.size || 0;

            // Le fichier est déjà écrit sur le disque par formidable
            // Nous devons juste le déplacer au bon endroit si nécessaire
            if (formidableFile.filepath) {
              // Générer un nom de fichier unique
              const extension = path.extname(fileName);
              const randomId = crypto.randomBytes(8).toString("hex");
              const uniqueFilename = `${randomId}${extension}`;
              fileName = uniqueFilename;

              // Créer le répertoire d'upload pour l'utilisateur
              const uploadDir = path.join(
                process.cwd(),
                "public",
                "uploads",
                userId,
              );
              await fs.mkdir(uploadDir, { recursive: true });

              // Destination finale
              const finalPath = path.join(uploadDir, uniqueFilename);

              // Déplacer le fichier
              await fs.rename(formidableFile.filepath, finalPath);
              console.log(`Fichier déplacé vers: ${finalPath}`);

              fileUrl = `/uploads/${userId}/${uniqueFilename}`;
            } else {
              throw new TRPCError({ code: "BAD_REQUEST",
                message: "Fichier invalide: chemin non trouvé" });
            }
          } else {
            // Cas d'un objet File ou similaire (comme dans l'implémentation existante)
            // Par sécurité, vérifions que ces propriétés existent
            const originalName =
              (input.file as { name?: string }).name ||
              `document-${Date.now()}`;
            mimeType =
              (input.file as { type?: string }).type ||
              "application/octet-stream";

            // Déterminer l'extension de fichier
            let extension = ".bin";
            if (mimeType === "image/jpeg") extension = ".jpg";
            else if (mimeType === "image/png") extension = ".png";
            else if (mimeType === "image/heic") extension = ".heic";
            else if (mimeType === "application/pdf") extension = ".pdf";

            // Générer un nom de fichier unique
            const randomId = crypto.randomBytes(8).toString("hex");
            const uniqueFilename = `${randomId}${extension}`;
            fileName = uniqueFilename;

            // Créer le chemin du dossier pour les uploads
            const uploadDir = path.join(
              process.cwd(),
              "public",
              "uploads",
              userId,
            );
            await fs.mkdir(uploadDir, { recursive: true });

            // Chemin complet du fichier
            const filePath = path.join(uploadDir, uniqueFilename);
            fileUrl = `/uploads/${userId}/${uniqueFilename}`;

            // Extraire le contenu binaire du fichier
            let fileBuffer: Buffer;

            if (
              "arrayBuffer" in input.file &&
              typeof input.file.arrayBuffer === "function"
            ) {
              throw new Error(
                "arrayBuffer method not available in server context",
              );
            } else if ("buffer" in input.file) {
              fileBuffer = (input.file as any).buffer;
            } else if (Buffer.isBuffer(input.file)) {
              fileBuffer = input.file;
            } else if ("base64" in input.file) {
              fileBuffer = Buffer.from(
                (input.file as any).base64,
                "base64",
              );
            } else if ("data" in input.file) {
              fileBuffer = Buffer.from(
                (input.file as { data: string | Buffer }).data,
              );
            } else {
              try {
                console.log(
                  "Tentative de sérialisation de l'objet File:",
                  JSON.stringify(input.file),
                );

                if (input.file && typeof input.file === "object") {
                  fileBuffer = Buffer.from(JSON.stringify(input.file));
                  mimeType = "application/json";
                  let extension = ".json";
                } else {
                  throw new Error("Format de fichier non pris en charge");
                }
              } catch (e) {
                console.error("Erreur lors de la sérialisation du fichier:", e);
                throw new TRPCError({ code: "BAD_REQUEST",
                  message: "Format de fichier non pris en charge" });
              }
            }

            // Écrire le fichier sur le disque
            try {
              if (!fileBuffer) {
                throw new Error("Impossible d'extraire les données du fichier");
              }

              await fs.writeFile(filePath, fileBuffer);
              fileSize = fileBuffer.length;
              console.log(
                `Fichier écrit avec succès: ${filePath}, taille: ${fileSize} octets`,
              );
            } catch (writeError) {
              console.error(
                "Erreur lors de l'écriture du fichier:",
                writeError,
              );
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
                message: "Erreur lors de l'enregistrement du fichier" });
            }
          }
        } else {
          throw new TRPCError({ code: "BAD_REQUEST",
            message: "Format de fichier non pris en charge" });
        }

        // Enregistrer les métadonnées dans la base de données
        // Patch: use userRole from input if provided, else from session
        const userRole = input.userRole || ctx.session.user.role;
        // Pass userRole to documentService.uploadDocument
        const document = await documentService.uploadDocument({ userId,
          type: input.type,
          filename: fileName,
          fileUrl,
          mimeType,
          fileSize,
          notes: input.notes,
          expiryDate: input.expiryDate,
          userRole });

        return document;
      } catch (error: any) {
        console.error("Erreur lors du téléversement du document:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erreur lors du téléversement du document",
          cause: error });
      }
    }),

  /**
   * Supprimer un document
   */
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.string()  }))
    .mutation(async ({ ctx, input: input  }) => {
      const { documentId } = input;
      const { user } = ctx.session;

      // Vérifier que le document existe
      const document = await ctx.db.document.findUnique({
        where: { id }});

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document not found" });
      }

      // Vérifier que l'utilisateur a le droit de supprimer ce document
      if (document.userId !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "You do not have permission to delete this document" });
      }

      return await ctx.db.document.delete({
        where: { id }});
    }),

  // Mettre à jour un document
  updateDocument: protectedProcedure
    .input(updateDocumentSchema)
    .mutation(async ({ ctx, input: input  }) => {
      try {
        // Vérifier que le document appartient à l'utilisateur
        const document = await ctx.db.document.findUnique({
          where: { id: input.documentId }});

        if (!document) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Document non trouvé" });
        }

        if (
          document.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à modifier ce document" });
        }

        return await documentService.updateDocument(input);
      } catch (error: any) {
        console.error("Erreur lors de la mise à jour du document:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Erreur lors de la mise à jour du document",
          cause: error });
      }
    }),

  // Obtenir un document par ID
  getDocumentById: protectedProcedure
    .input(z.object({ documentId: z.string()  }))
    .query(async ({ ctx, input: input  }) => {
      try {
        const document = await documentService.getDocumentById(
          input.documentId,
        );

        // Vérifier que l'utilisateur a le droit de voir ce document
        if (
          document.userId !== ctx.session.user.id &&
          ctx.session.user.role !== "ADMIN"
        ) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Vous n'êtes pas autorisé à accéder à ce document" });
        }

        return document;
      } catch (error: any) {
        console.error("Erreur lors de la récupération du document:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message:
            error.message || "Erreur lors de la récupération du document",
          cause: error });
      }
    }),

  // Admin: Obtenir tous les documents en attente de vérification
  getPendingVerifications: protectedProcedure.query(async ({ ctx  }) => {
    // Vérifier que l'utilisateur est admin
    if (ctx.session?.user?.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Accès refusé" });
    }

    return await documentService.getPendingDocuments();
  }),

  // Créer une demande de vérification pour un document
  createVerification: protectedProcedure
    .input(createVerificationSchema)
    .mutation(async ({ ctx, input: input  }) => {
      const userId = ctx.session.user.id;

      // Vérifier que le document appartient à l'utilisateur
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId }});

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document non trouvé" });
      }

      if (document.userId !== userId) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'êtes pas autorisé à demander une vérification pour ce document" });
      }

      return await documentService.createVerification({ submitterId: userId,
        documentId: input.documentId,
        notes: input.notes });
    }),

  // Admin: Mettre à jour une vérification
  updateVerification: protectedProcedure
    .input(updateVerificationSchema)
    .mutation(async ({ ctx, input: input  }) => {
      // Vérifier que l'utilisateur est admin
      if (ctx.session?.user?.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Accès refusé" });
      }

      return await documentService.updateVerification({ verificationId: input.verificationId,
        verifierId: ctx.session.user.id,
        status: input.status as DocumentStatus,
        notes: input.notes });
    }),

  // Obtenir les vérifications pour un document
  getDocumentVerifications: protectedProcedure
    .input(z.object({ documentId: z.string()  }))
    .query(async ({ ctx, input: input  }) => {
      // Vérifier que le document appartient à l'utilisateur ou que l'utilisateur est admin
      const document = await ctx.db.document.findUnique({
        where: { id: input.documentId }});

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document non trouvé" });
      }

      if (
        document.userId !== ctx.session.user.id &&
        ctx.session.user.role !== "ADMIN"
      ) {
        throw new TRPCError({ code: "FORBIDDEN",
          message:
            "Vous n'êtes pas autorisé à accéder aux vérifications de ce document" });
      }

      return await documentService.getDocumentVerifications(input.documentId);
    }),

  /**
   * Télécharger un fichier via l'API
   */
  downloadDocument: protectedProcedure
    .input(z.object({ filePath: z.string()  }))
    .query(async ({ ctx, input: input  }) => {
      try {
        // Sécurité: s'assurer que le chemin est dans le répertoire uploads
        const normalizedPath = path
          .normalize(input.filePath)
          .replace(/^\/+/, "");
        if (
          !normalizedPath.startsWith("uploads/") &&
          !input.filePath.startsWith("/uploads/")
        ) {
          throw new TRPCError({ code: "FORBIDDEN",
            message: "Chemin non autorisé" });
        }

        // Chemin complet du fichier sur le serveur
        // Supprimer le slash initial s'il existe avant de joindre au chemin public
        const cleanPath = input.filePath.startsWith("/")
          ? input.filePath.substring(1)
          : input.filePath;
        const fullPath = path.join(process.cwd(), "public", cleanPath);

        // Vérifier si le fichier existe
        try {
          await fs.access(fullPath);
        } catch (error) {
          throw new TRPCError({ code: "NOT_FOUND",
            message: "Fichier non trouvé" });
        }

        // Lire le fichier
        const fileData = await fs.readFile(fullPath);
        const fileExt = path.extname(fullPath).toLowerCase();

        // Déterminer le type MIME basé sur l'extension
        const contentType = "application/octet-stream";
        switch (fileExt) {
          case ".pdf":
            contentType = "application/pdf";
            break;
          case ".jpg":
          case ".jpeg":
            contentType = "image/jpeg";
            break;
          case ".png":
            contentType = "image/png";
            break;
          case ".gif":
            contentType = "image/gif";
            break;
          case ".webp":
            contentType = "image/webp";
            break;
        }

        // Retourner les données du fichier
        return {
          fileData: Buffer.from(fileData).toString("base64"),
          fileName: path.basename(fullPath),
          contentType,
          size: fileData.length};
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Erreur lors du téléchargement du fichier:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors du téléchargement du fichier",
          cause: error });
      }
    })});
