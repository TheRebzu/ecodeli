import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { DocumentType, VerificationStatus } from "@prisma/client";

// Types d'upload supportés
export type UploadType = "announcement" | "profile" | "service" | "document";

// Configuration des types de fichiers autorisés
const ALLOWED_TYPES = {
  announcement: ["image/jpeg", "image/png", "image/webp"],
  profile: ["image/jpeg", "image/png", "image/webp"],
  service: ["image/jpeg", "image/png", "image/webp"],
  document: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

// Tailles maximales par type (en octets)
const MAX_FILE_SIZES = {
  announcement: 5 * 1024 * 1024, // 5MB
  profile: 2 * 1024 * 1024, // 2MB
  service: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
};

export interface UploadFileInput {
  file: string | File; // Base64 string ou objet File
  type: UploadType;
  userId: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UploadFileResult {
  success: boolean;
  url: string;
  filename: string;
  size: number;
  type: string;
  id?: string;
}

export class UploadService {
  /**
   * Upload un fichier selon le type spécifié
   */
  static async uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
    try {
      const { file, type, userId, description, metadata } = input;

      // Validation du type d'upload
      if (!ALLOWED_TYPES[type]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type d'upload non supporté: ${type}`,
        });
      }

      let fileUrl = "";
      let fileName = "";
      let mimeType = "";
      let fileSize = 0;

      // Traitement selon le type de fichier
      if (typeof file === "string") {
        // Cas d'une chaîne base64
        const result = await this.processBase64File(file, type, userId);
        fileUrl = result.url;
        fileName = result.filename;
        mimeType = result.mimeType;
        fileSize = result.size;
      } else {
        // Cas d'un objet File
        const result = await this.processFileObject(file, type, userId);
        fileUrl = result.url;
        fileName = result.filename;
        mimeType = result.mimeType;
        fileSize = result.size;
      }

      // Validation du type de fichier
      if (!ALLOWED_TYPES[type].includes(mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type de fichier non autorisé pour ${type}. Types acceptés: ${ALLOWED_TYPES[type].join(", ")}`,
        });
      }

      // Validation de la taille
      if (fileSize > MAX_FILE_SIZES[type]) {
        const maxSizeMB = MAX_FILE_SIZES[type] / (1024 * 1024);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Fichier trop volumineux. Taille maximale: ${maxSizeMB}MB`,
        });
      }

      // Enregistrer en base pour les documents (pas pour les photos d'annonces)
      let uploadId: string | undefined;
      if (type === "document") {
        const documentRecord = await db.document.create({
          data: {
            userId,
            type: DocumentType.OTHER, // Type par défaut
            filename: fileName,
            fileUrl,
            mimeType,
            fileSize,
            verificationStatus: VerificationStatus.PENDING,
            notes: description,
            uploadedAt: new Date(),
          },
        });
        uploadId = documentRecord.id;
      }

      // Log de l'upload pour audit
      console.log(
        `[UPLOAD] ${userId} uploaded ${fileName} (${fileSize} bytes) as ${type} to ${fileUrl}`,
      );

      return {
        success: true,
        url: fileUrl,
        filename: fileName,
        size: fileSize,
        type: mimeType,
        id: uploadId,
      };
    } catch (error: any) {
      console.error("Erreur lors de l'upload:", error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Erreur interne lors de l'upload",
      });
    }
  }

  /**
   * Traite un fichier base64
   */
  private static async processBase64File(
    base64: string,
    type: UploadType,
    userId: string,
  ) {
    // Extraire le type MIME et les données
    const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Format base64 invalide",
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Déterminer l'extension
    const extension = this.getFileExtension(mimeType);
    const filename = `${randomUUID()}${extension}`;

    // Créer le répertoire et écrire le fichier
    const { uploadDir, filepath } = this.getFilePaths(type, userId, filename);
    await this.ensureDirectoryExists(uploadDir);
    await writeFile(filepath, buffer);

    return {
      url: this.getPublicUrl(type, userId, filename),
      filename,
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Traite un objet File
   */
  private static async processFileObject(
    file: any,
    type: UploadType,
    userId: string,
  ) {
    // Extraire les propriétés selon le type d'objet
    let mimeType: string;
    let buffer: Buffer;
    let originalName: string;

    if ("originalFilename" in file && "mimetype" in file) {
      // Format formidable
      mimeType = file.mimetype;
      originalName = file.originalFilename || "file";

      if (file.filepath) {
        const fs = await import("fs/promises");
        buffer = await fs.readFile(file.filepath);
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fichier invalide: données manquantes",
        });
      }
    } else {
      // Objet File standard
      mimeType = (file as any).type || "application/octet-stream";
      originalName = (file as any).name || "file";

      if ("buffer" in file) {
        buffer = file.buffer;
      } else if (Buffer.isBuffer(file)) {
        buffer = file;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Format de fichier non supporté",
        });
      }
    }

    // Générer nom unique
    const extension = this.getFileExtension(mimeType);
    const filename = `${randomUUID()}${extension}`;

    // Créer le répertoire et écrire le fichier
    const { uploadDir, filepath } = this.getFilePaths(type, userId, filename);
    await this.ensureDirectoryExists(uploadDir);
    await writeFile(filepath, buffer);

    return {
      url: this.getPublicUrl(type, userId, filename),
      filename,
      mimeType,
      size: buffer.length,
    };
  }

  /**
   * Supprime un fichier uploadé
   */
  static async deleteFile(
    fileUrl: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      // Vérifier les permissions pour les documents
      const documentRecord = await db.document.findFirst({
        where: {
          fileUrl,
          userId,
          verificationStatus: { not: VerificationStatus.REJECTED },
        },
      });

      // Construire le chemin du fichier
      const urlPath = fileUrl.replace("/uploads/", "");
      const filepath = path.join(process.cwd(), "public", "uploads", urlPath);

      // Supprimer le fichier physique
      if (existsSync(filepath)) {
        const { unlink } = await import("fs/promises");
        await unlink(filepath);
      }

      // Marquer comme rejeté en base si c'est un document
      if (documentRecord) {
        await db.document.update({
          where: { id: documentRecord.id },
          data: { verificationStatus: VerificationStatus.REJECTED },
        });
      }

      console.log(`[DELETE] ${userId} deleted file ${fileUrl}`);

      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de la suppression du fichier",
      });
    }
  }

  /**
   * Récupère les informations d'un fichier
   */
  static async getFileInfo(
    filename: string,
    userId?: string,
  ): Promise<{
    exists: boolean;
    url?: string;
    type?: UploadType;
    metadata?: any;
  }> {
    try {
      // Chercher dans la base de données d'abord pour les documents
      if (userId) {
        const documentRecord = await db.document.findFirst({
          where: {
            filename,
            userId,
            verificationStatus: { not: VerificationStatus.REJECTED },
          },
        });

        if (documentRecord) {
          return {
            exists: true,
            url: documentRecord.fileUrl,
            type: "document",
            metadata: {
              type: documentRecord.type,
              notes: documentRecord.notes,
            },
          };
        }
      }

      // Chercher dans le système de fichiers
      const uploadTypes: UploadType[] = [
        "announcement",
        "profile",
        "service",
        "document",
      ];

      for (const type of uploadTypes) {
        const filepath = path.join(
          process.cwd(),
          "public",
          "uploads",
          type,
          filename,
        );

        if (existsSync(filepath)) {
          return {
            exists: true,
            url: `/uploads/${type}/${filename}`,
            type,
          };
        }
      }

      return { exists: false };
    } catch (error: any) {
      console.error("Erreur lors de la récupération du fichier:", error);
      return { exists: false };
    }
  }

  /**
   * Utilitaires privés
   */
  private static getFileExtension(mimeType: string): string {
    switch (mimeType) {
      case "image/jpeg":
        return ".jpg";
      case "image/png":
        return ".png";
      case "image/webp":
        return ".webp";
      case "image/heic":
        return ".heic";
      case "application/pdf":
        return ".pdf";
      default:
        return ".bin";
    }
  }

  private static getFilePaths(
    type: UploadType,
    userId: string,
    filename: string,
  ) {
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);
    const filepath = path.join(uploadDir, filename);

    return { uploadDir, filepath };
  }

  private static getPublicUrl(
    type: UploadType,
    userId: string,
    filename: string,
  ): string {
    return `/uploads/${type}/${filename}`;
  }

  private static async ensureDirectoryExists(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}
