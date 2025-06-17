import {
  PrismaClient,
  DocumentType,
  VerificationStatus,
  UserRole} from "@prisma/client";
import { EmailService } from "@/server/services/common/email.service";
import { DocumentStatus } from "@/server/db/enums";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import crypto from "crypto";
import {
  NotificationService,
  sendNotification} from "@/server/services/common/notification.service";
import { getUserPreferredLocale } from "@/lib/i18n/user-locale";

// Interface Document pour typer les retours
interface Document {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

/**
 * Interface pour création/mise à jour des documents
 */
interface DocumentCreateInput {
  userId: string;
  userRole: string;
  type: DocumentType;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// Types pour les enums
enum VerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"}

type UploadDocumentParams = {
  userId: string;
  type: DocumentType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  notes?: string;
  expiryDate?: Date;
  userRole?: UserRole;
};

type UpdateDocumentParams = {
  documentId: string;
  notes?: string;
  expiryDate?: Date;
};

type CreateVerificationParams = {
  submitterId: string;
  documentId: string;
  notes?: string;
};

type UpdateVerificationParams = {
  verificationId: string;
  verifierId: string;
  status: VerificationStatus;
  notes?: string;
};

type UploadFileResult = {
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

/**
 * Service pour la gestion des documents et vérifications
 */
export class DocumentService {
  private prisma: PrismaClient;
  private uploadDir: string;

  constructor(prisma = db) {
    this.prisma = prisma;
    // Le dossier d'uploads est relatif à la racine du projet
    this.uploadDir = path.join(process.cwd(), "public", "uploads");
  }

  /**
   * Sauvegarde un fichier sur le serveur et retourne son URL
   * Dans un environnement de production, utilisez plutôt un service de stockage comme S3
   */
  private async saveFile(
    file: { buffer: Buffer; filename: string; mimetype: string },
    userId: string,
  ): Promise<UploadFileResult> {
    try {
      // S'assurer que le dossier d'uploads existe
      await fs.mkdir(this.uploadDir, { recursive });

      // Créer un nom de fichier unique avec un timestamp et un hash
      const fileExt = path.extname(file.filename);
      const fileNameBase = path.basename(file.filename, fileExt);
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      const safeFileName = `${fileNameBase.replace(/[^a-z0-9]/gi, "-")}-${uniqueSuffix}${fileExt}`;

      // Créer un sous-dossier par utilisateur
      const userDir = path.join(this.uploadDir, userId);
      await fs.mkdir(userDir, { recursive });

      // Chemin complet du fichier
      const filePath = path.join(userDir, safeFileName);

      // Écrire le fichier
      await fs.writeFile(filePath, file.buffer);

      // URL relative pour le client
      const fileUrl = `/uploads/${userId}/${safeFileName}`;

      return {
        filename: safeFileName,
        fileUrl,
        mimeType: file.mimetype,
        fileSize: file.buffer.length};
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du fichier:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'upload du fichier" });
    }
  }

  /**
   * Télécharge un document pour un utilisateur
   */
  async uploadDocument(params: UploadDocumentParams) {
    try {
      const {
        userId,
        type,
        filename,
        fileUrl,
        mimeType,
        fileSize,
        notes,
        expiryDate,
        userRole} = params;

      // Vérifier si l'utilisateur existe
      const user = await this.db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          locale: true}});

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Utilisateur non trouvé" });
      }

      // Créer l'entrée du document dans la base de données
      const document = await this.db.document.create({
        data: {
          userId,
          type,
          filename,
          mimeType,
          fileSize,
          fileUrl,
          uploadedAt: new Date(),
          status: "PENDING", // Add status to match document list component expectation
          verificationStatus: VerificationStatus.PENDING,
          notes,
          expiryDate,
          isVerified: false,
          userRole: userRole || user.role},
        include: { user }});

      // Créer une demande de vérification pour ce document
      await this.db.verification.create({
        data: {
          submitterId: userId,
          documentId: document.id,
          status: "PENDING",
          requestedAt: new Date()}});

      console.log(`Document créé avec succès: ${document.id}`);
      console.log(
        `Envoi de notification aux administrateurs pour le document ${document.id}`,
      );

      try {
        // Envoyer une notification à tous les administrateurs
        const userLocale = getUserPreferredLocale(user);
        await this.notificationService.sendDocumentSubmissionToAdminsNotification(
          document,
          userLocale,
        );
        console.log(
          `Notification envoyée avec succès aux administrateurs pour le document ${document.id}`,
        );
      } catch (notifError) {
        console.error(
          "Erreur lors de l'envoi de la notification aux administrateurs:",
          notifError,
        );
        // Ne pas faire échouer l'upload si la notification échoue
      }

      return document;
    } catch (error) {
      console.error("Erreur lors du téléchargement du document:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message:
          "Erreur lors du téléchargement du document: " +
          (error instanceof Error ? error.message : String(error)),
        cause: error });
    }
  }

  /**
   * Met à jour un document existant
   */
  async updateDocument(data: UpdateDocumentParams) {
    // Vérifier si le document existe
    const document = await this.db.document.findUnique({
      where: { id: data.documentId }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Mettre à jour le document
    const updatedDocument = await this.db.document.update({
      where: { id: data.documentId },
      data: {
        notes: data.notes,
        expiryDate: data.expiryDate}});

    return updatedDocument;
  }

  /**
   * Obtient un document par son ID
   */
  async getDocumentById(id: string, userId: string | null = null) {
    const document = await this.db.document.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true}},
        verifications: {
          include: {
            verifier: {
              select: {
                id: true,
                name: true,
                role: true}}}}}});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Vérifier les permissions si userId est fourni
    if (userId && document.userId !== userId) {
      const user = await this.db.user.findUnique({
        where: { id },
        select: { role }});

      // Seuls les admins peuvent voir les documents d'autres utilisateurs
      if (!user || user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN",
          message: "Vous n'avez pas accès à ce document" });
      }
    }

    return document;
  }

  /**
   * Obtient tous les documents d'un utilisateur
   */
  async getUserDocuments(userId: string) {
    try {
      console.log(`Récupération des documents pour l'utilisateur ${userId}`);

      const documents = await this.db.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true}},
          verifications: {
            orderBy: { requestedAt: "desc" },
            select: {
              id: true,
              status: true,
              verifiedAt: true,
              notes: true,
              rejectionReason: true,
              requestedAt: true}}}});

      console.log(
        `${documents.length} documents trouvés pour l'utilisateur ${userId}`,
      );

      // Assurer la compatibilité avec l'interface attendue par le frontend
      return documents.map((doc) => ({ ...doc,
        verificationStatus:
          doc.verifications[0]?.status || doc.verificationStatus || "PENDING",
        status:
          doc.status ||
          doc.verificationStatus ||
          (doc.verifications[0]?.status as any) ||
          "PENDING",
        createdAt: doc.uploadedAt }));
    } catch (error) {
      console.error(`Erreur lors de la récupération des documents: ${error}`);
      throw error;
    }
  }

  /**
   * Obtient tous les documents d'un utilisateur avec leurs informations complètes de statut
   * Méthode consistante pour récupérer les documents à travers l'application
   */
  async getUserDocumentsWithStatus(userId: string, userRole?: UserRole) {
    try {
      console.log(
        `Récupération des documents avec statut pour l'utilisateur ${userId}`,
      );

      const documents = await this.db.document.findMany({
        where: {
          userId,
          ...(userRole ? { userRole } : {})},
        orderBy: { uploadedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true}},
          verifications: {
            orderBy: { requestedAt: "desc" },
            take: 1, // Récupère seulement la dernière vérification
            select: {
              id: true,
              status: true,
              verifiedAt: true,
              notes: true,
              rejectionReason: true,
              requestedAt: true}}}});

      // Amélioration: Ajoute des informations dérivées pour chaque document
      return documents.map((doc) => {
        // Détermine le statut effectif en fonction du statut et de la date d'expiration
        const isExpired = doc.expiryDate
          ? new Date(doc.expiryDate) < new Date()
          : false;
        const lastVerification =
          doc.verifications && doc.verifications.length > 0
            ? doc.verifications[0]
            : null;

        const effectiveStatus = doc.verificationStatus;

        // Si le document est expiré, remplacer le statut par EXPIRED
        if (isExpired && effectiveStatus === "APPROVED") {
          effectiveStatus = "EXPIRED";
        }

        // Détermine le badge à afficher en fonction du statut
        const statusInfo = this.getStatusBadgeProps(effectiveStatus);

        return {
          ...doc,
          effectiveStatus,
          statusInfo,
          isExpired,
          lastVerification,
          canResubmit: ["REJECTED", "EXPIRED"].includes(effectiveStatus)};
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des documents:", error);
      throw error;
    }
  }

  /**
   * Obtient les propriétés d'affichage pour un statut de document (badge)
   */
  getStatusBadgeProps(status: string) {
    switch (status?.toUpperCase()) {
      case "PENDING":
        return { variant: "outline" as const, label: "En attente" };
      case "APPROVED":
        return { variant: "success" as const, label: "Approuvé" };
      case "REJECTED":
        return { variant: "destructive" as const, label: "Rejeté" };
      case "EXPIRED":
        return { variant: "warning" as const, label: "Expiré" };
      default:
        return { variant: "outline" as const, label: "Inconnu" };
    }
  }

  /**
   * Obtient tous les documents en attente de vérification
   */
  async getPendingDocuments(userRole?: UserRole) {
    const where: any = {
      verificationStatus: "PENDING"};

    if (userRole) {
      where.user = { role };
    }

    return await this.db.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true}}}});
  }

  /**
   * Crée une demande de vérification pour un document
   */
  async createVerification(data: CreateVerificationParams) {
    // Vérifier si le document existe
    const document = await this.db.document.findUnique({
      where: { id: data.documentId }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Créer la demande de vérification
    const verification = await this.db.verification.create({
      data: {
        submitterId: data.submitterId,
        documentId: data.documentId,
        status:
          VerificationStatus.PENDING as unknown as Prisma.EnumVerificationStatusFieldUpdateOperationsInput,
        notes: data.notes}});

    return verification;
  }

  /**
   * Met à jour une vérification
   */
  async updateVerification(data: UpdateVerificationParams) {
    const {
      verificationId: verificationId,
      verifierId: verifierId,
      status: status,
      notes: notes} = data;

    // Vérifier si la vérification existe
    const verification = await this.db.verification.findUnique({
      where: { id }});

    if (!verification) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Vérification non trouvée" });
    }

    // Mettre à jour la vérification
    const updatedVerification = await this.db.verification.update({
      where: { id },
      data: {
        status,
        verifierId,
        verifiedAt: new Date(),
        notes}});

    // Mettre à jour le document associé
    await this.db.document.update({
      where: { id: verification.documentId },
      data: {
        verificationStatus: status,
        isVerified: status === VerificationStatus.APPROVED}});

    return updatedVerification;
  }

  /**
   * Obtient toutes les vérifications pour un document
   */
  async getDocumentVerifications(documentId: string) {
    const verifications = await this.db.verification.findMany({
      where: { documentId },
      include: {
        submitter: {
          select: {
            id: true,
            name: true,
            email: true}},
        verifier: {
          select: {
            id: true,
            name: true,
            email: true}}},
      orderBy: {
        requestedAt: "desc"}});

    return verifications;
  }

  async verifyDocument(data: {
    documentId: string;
    verificationStatus: VerificationStatus;
    adminId: string;
    rejectionReason?: string;
  }): Promise<Document> {
    const {
      documentId: documentId,
      verificationStatus: verificationStatus,
      adminId: adminId,
      rejectionReason: rejectionReason} = data;

    const document = await this.db.document.update({
      where: { id },
      data: {
        status: verificationStatus as unknown as DocumentStatus,
        verificationStatus,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason:
          verificationStatus === VerificationStatus.REJECTED
            ? rejectionReason
            : null,
        isVerified: verificationStatus === VerificationStatus.APPROVED},
      include: { user }});

    // Notification par email
    if (verificationStatus === VerificationStatus.APPROVED) {
      await this.emailService.sendDocumentApprovedEmail(
        document.user.email as string,
        document.type as DocumentType,
      );
    } else if (verificationStatus === VerificationStatus.REJECTED) {
      await this.emailService.sendDocumentRejectedEmail(
        document.user.email as string,
        document.type as DocumentType,
        rejectionReason || "Aucune raison spécifiée",
      );
    }

    return document as unknown as Document;
  }

  async deleteDocument(id: string, userId: string) {
    const document = await this.db.document.findUnique({
      where: { id }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Vérifier si l'utilisateur est le propriétaire ou un admin
    const user = await this.db.user.findUnique({
      where: { id },
      select: { role }});

    if (document.userId !== userId && (!user || user.role !== "ADMIN")) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à supprimer ce document" });
    }

    // Supprimer le fichier physique
    try {
      // Extraire le chemin du fichier à partir de l'URL
      const filePath = path.join(
        this.uploadDir,
        document.fileUrl.replace("/uploads/", ""),
      );
      await fs.unlink(filePath);
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      // On continue même si le fichier ne peut pas être supprimé
    }

    // Supprimer les vérifications associées
    await this.db.verification.deleteMany({
      where: { documentId }});

    // Supprimer le document de la base de données
    return await this.db.document.delete({
      where: { id }});
  }

  /**
   * Récupère tous les documents d'un utilisateur
   */ static async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const documents = await db.document.findMany({
        where: { userId },
        orderBy: { uploadedAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true}},
          verifications: {
            orderBy: { requestedAt: "desc" },
            select: {
              id: true,
              status: true,
              verifiedAt: true,
              notes: true,
              rejectionReason: true,
              requestedAt: true}}}});

      // Assurer la cohérence avec l'instance method et le frontend
      return documents.map((doc) => ({ ...doc,
        verificationStatus:
          doc.verifications?.[0]?.status || doc.verificationStatus || "PENDING",
        status:
          doc.status ||
          doc.verificationStatus ||
          (doc.verifications?.[0]?.status as any) ||
          "PENDING",
        createdAt: doc.uploadedAt }));
    } catch (error) {
      console.error("Erreur lors de la récupération des documents:", error);
      throw new Error("Impossible de récupérer les documents");
    }
  }

  /**
   * Récupère tous les documents en attente de vérification
   */
  static async getPendingDocuments(userRole?: string): Promise<Document[]> {
    try {
      const where: any = { status: "PENDING" };

      // Si un rôle d'utilisateur est spécifié, filtrer par ce rôle
      if (userRole) {
        where.userRole = userRole;
      }

      const documents = await db.document.findMany({
        where,
        orderBy: { uploadDate: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true}}}});

      return documents;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des documents en attente:",
        error,
      );
      throw new Error("Impossible de récupérer les documents en attente");
    }
  }

  /**
   * Met à jour le statut d'un document
   */
  static async updateDocumentStatus(
    documentId: string,
    status: DocumentStatus,
    adminId: string,
    rejectionReason?: string,
  ): Promise<Document> {
    try {
      // Récupérer le document pour vérifier qu'il existe
      const existingDocument = await db.document.findUnique({
        where: { id },
        include: { user }});

      if (!existingDocument) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document non trouvé" });
      }

      if (existingDocument.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Ce document a déjà été traité" });
      } // Mise à jour du document avec status et verificationStatus pour être cohérent avec le frontend
      const updatedDocument = await db.document.update({
        where: { id },
        data: {
          status,
          verificationStatus: status as unknown as VerificationStatus, // Ajouter verificationStatus
          rejectionReason: status === "REJECTED" ? rejectionReason : null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          isVerified: status === "APPROVED", // Mise à jour cohérente avec verifyDocument
        }});

      // Envoyer une notification à l'utilisateur
      const emailService = new EmailService();
      const userEmail = existingDocument.user.email;
      if (userEmail) {
        if (status === "APPROVED") {
          await emailService.sendDocumentApprovedEmail(
            userEmail,
            existingDocument.filename,
            this.getDocumentTypeName(existingDocument.type as DocumentType),
          );
        } else if (status === "REJECTED" && rejectionReason) {
          await emailService.sendDocumentRejectedEmail(
            userEmail,
            existingDocument.filename,
            this.getDocumentTypeName(existingDocument.type as DocumentType),
            rejectionReason,
          );
        }
      }

      // Mettre à jour le statut de vérification de l'utilisateur si nécessaire
      if (status === "APPROVED") {
        await this.updateUserVerificationStatus(
          existingDocument.userId,
          existingDocument.userRole,
        );
      }

      return updatedDocument;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error(
        "Erreur lors de la mise à jour du statut du document:",
        error,
      );
      throw new Error("Impossible de mettre à jour le statut du document");
    }
  }

  /**
   * Crée un nouveau document
   */
  static async createDocument(input: DocumentCreateInput): Promise<Document> {
    try {
      const document = await db.document.create({
        data: {
          type: input.type,
          filePath: input.filePath,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          userId: input.userId,
          userRole: input.userRole,
          status: "PENDING",
          verificationStatus: "PENDING", // Add verificationStatus to match frontend expectations
        }});

      return document;
    } catch (error) {
      console.error("Erreur lors de la création du document:", error);
      throw new Error("Impossible de créer le document");
    }
  }

  /**
   * Supprime un document
   */
  static async deleteDocument(
    documentId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      // Vérifier que le document appartient à l'utilisateur
      const document = await db.document.findUnique({
        where: { id }});

      if (!document) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document non trouvé" });
      }

      if (document.userId !== userId) {
        return false;
      }

      // Supprimer le fichier physique
      if (document.filePath) {
        try {
          await fs.unlink(document.filePath);
        } catch (error) {
          console.error("Erreur lors de la suppression du fichier:", error);
          // On continue même si la suppression du fichier échoue
        }
      }

      // Supprimer l'entrée dans la base de données
      await db.document.delete({
        where: { id }});

      return true;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Erreur lors de la suppression du document:", error);
      throw new Error("Impossible de supprimer le document");
    }
  }

  /**
   * Vérifie si un utilisateur a tous les documents requis approuvés
   */
  private static async updateUserVerificationStatus(
    userId: string,
    userRole: string,
  ): Promise<void> {
    try {
      if (userRole === "DELIVERER") {
        const requiredDocumentTypes = [
          "ID_CARD",
          "DRIVING_LICENSE",
          "VEHICLE_REGISTRATION",
          "INSURANCE"];

        // Vérifier si tous les documents requis sont approuvés
        const approvedDocuments = await db.document.findMany({
          where: {
            userId,
            status: "APPROVED",
            type: { in }}});

        // Si tous les documents requis sont approuvés, mettre à jour le statut de vérification
        if (approvedDocuments.length === requiredDocumentTypes.length) {
          await db.deliverer.update({
            where: { userId },
            data: { isVerified }});

          // Mise à jour du statut utilisateur
          await db.user.update({
            where: { id },
            data: { status: "ACTIVE" }});
        }
      } else if (userRole === "PROVIDER") {
        // Documents requis pour les prestataires
        const requiredDocumentTypes = [
          "ID_CARD",
          "QUALIFICATION_CERTIFICATE",
          "INSURANCE",
          "PROOF_OF_ADDRESS"];

        const approvedDocuments = await db.document.findMany({
          where: {
            userId,
            status: "APPROVED",
            type: { in }}});

        if (approvedDocuments.length === requiredDocumentTypes.length) {
          await db.provider.update({
            where: { userId },
            data: { isVerified }});

          await db.user.update({
            where: { id },
            data: { status: "ACTIVE" }});
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du statut de vérification:",
        error,
      );
      // Ne pas propager l'erreur pour éviter de bloquer la vérification du document
    }
  }
  /**
   * Récupère le nom lisible d'un type de document
   */
  private static getDocumentTypeName(type: DocumentType): string {
    // Import dynamiquement depuis le module partagé pour éviter les dépendances circulaires
    // const { documentTypeNames } = require("@/utils/document-utils");

    // Mapping temporaire des types de documents
    const documentTypeNames: Record<DocumentType, string> = {
      IDENTITY_CARD: "Carte d'identité",
      PASSPORT: "Passeport",
      DRIVING_LICENSE: "Permis de conduire",
      VEHICLE_REGISTRATION: "Carte grise",
      INSURANCE_CERTIFICATE: "Attestation d'assurance",
      CRIMINAL_RECORD: "Extrait de casier judiciaire",
      BANK_RIB: "RIB",
      KBIS: "Extrait KBIS",
      PROFESSIONAL_CARD: "Carte professionnelle",
    };

    // Vérifier si le type existe dans le mapping
    if (documentTypeNames[type]) {
      return documentTypeNames[type];
    }

    // Fallback pour les types qui ne sont plus dans l'enum actuel
    const legacyTypes: Record<string, string> = { DRIVER_LICENSE: "Permis de conduire", CRIMINAL_RECORD: "Casier judiciaire", PROFESSIONAL_CERTIFICATION: "Certification professionnelle"};

    return legacyTypes[type as string] || "Document";
  }

  // Create a new document
  async createDocument(data: DocumentCreateInput): Promise<Document> {
    try {
      return await this.db.document.create({
        data: {
          userId: data.userId,
          type: data.type,
          filePath: data.filePath,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          userRole: data.userRole,
          status: "PENDING"}});
    } catch (error) {
      console.error("Error creating document:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create document" });
    }
  }

  // Get a document by ID
  async getDocumentById(id: string): Promise<Document | null> {
    return await this.db.document.findUnique({
      where: { id }});
  }

  // Get documents by user ID
  async getDocumentsByUserId(userId: string): Promise<Document[]> {
    return await this.db.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: "desc" }});
  }

  // Get the most recent document of a specific type for a user
  async getMostRecentDocumentByType(
    userId: string,
    type: DocumentType,
  ): Promise<Document | null> {
    return await this.db.document.findFirst({
      where: { userId, type },
      orderBy: { uploadedAt: "desc" }});
  }

  // Update a document
  async updateDocument(
    id: string,
    data: UpdateDocumentInput,
  ): Promise<Document> {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document not found" });
    }

    // If verification status is changing to APPROVED or REJECTED, fetch user details for notification
    const shouldNotify =
      data.verificationStatus &&
      document.verificationStatus !== data.verificationStatus &&
      (data.verificationStatus === VerificationStatus.APPROVED ||
        data.verificationStatus === VerificationStatus.REJECTED);

    const userWithDocument = null;
    if (shouldNotify) {
      userWithDocument = await this.db.document.findUnique({
        where: { id },
        include: { user }});

      if (!userWithDocument) {
        throw new TRPCError({ code: "NOT_FOUND",
          message: "Document with user not found" });
      }
    }

    try {
      const updatedDocument = await this.db.document.update({
        where: { id },
        data});

      // Send notifications and emails if the verification status changed to APPROVED or REJECTED
      if (shouldNotify && userWithDocument) {
        const locale = getUserPreferredLocale(userWithDocument.user);

        if (data.verificationStatus === VerificationStatus.APPROVED) {
          // Send approval notification using the exported NotificationService function
          await sendNotification({
            userId: userWithDocument.user.id,
            title: "Document approuvé",
            message: `Votre document ${userWithDocument.type} a été approuvé.`,
            type: "VERIFICATION",
            data: { status: VerificationStatus.APPROVED }});

          // Notification email pour approbation de document
          await this.sendDocumentApprovalEmail(userWithDocument.user, userWithDocument.type);
        }

        if (data.verificationStatus === VerificationStatus.REJECTED) {
          // Send rejection notification
          await sendNotification({
            userId: userWithDocument.user.id,
            title: "Document rejeté",
            message: `Votre document ${userWithDocument.type} a été rejeté: ${data.rejectionReason || "Document invalide"}`,
            type: "VERIFICATION",
            data: {
              status: VerificationStatus.REJECTED,
              reason: data.rejectionReason}});

          // Notification email pour rejet de document
          await this.sendDocumentRejectionEmail(userWithDocument.user, userWithDocument.type, data.rejectionReason);
        }
      }

      return updatedDocument;
    } catch (error) {
      console.error("Error updating document:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update document" });
    }
  }

  // Delete a document
  async deleteDocument(id: string): Promise<Document> {
    const document = await this.getDocumentById(id);

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document not found" });
    }

    try {
      return await this.db.document.delete({
        where: { id }});
    } catch (error) {
      console.error("Error deleting document:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete document" });
    }
  }

  // Check if user has provided all required documents
  async hasRequiredDocuments(
    userId: string,
    requiredTypes: DocumentType[],
  ): Promise<boolean> {
    const documents = await this.getDocumentsByUserId(userId);
    const verifiedDocumentTypes = documents
      .filter((doc) => doc.isVerified)
      .map((doc) => doc.type);

    return requiredTypes.every((type) => verifiedDocumentTypes.includes(type));
  }

  // Get missing required documents
  async getMissingRequiredDocuments(
    userId: string,
    requiredTypes: DocumentType[],
  ): Promise<DocumentType[]> {
    const documents = await this.getDocumentsByUserId(userId);
    const verifiedDocumentTypes = documents
      .filter((doc) => doc.isVerified)
      .map((doc) => doc.type);

    return requiredTypes.filter(
      (type) => !verifiedDocumentTypes.includes(type),
    );
  }

  // Check if any documents are about to expire
  async getExpiringDocuments(
    userId: string,
    daysUntilExpiry: number,
  ): Promise<Document[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    return await this.db.document.findMany({
      where: {
        userId,
        expiryDate: {
          not: null,
          lte: expiryThreshold}}});
  }
  // Get required document types by user role
  getRequiredDocumentTypesByRole(role: string): DocumentType[] {
    // Utiliser la fonction centralisée dans document-utils
    const {
      getRequiredDocumentTypesByRole} = // require("@/utils/document-utils");
    return getRequiredDocumentTypesByRole(role);
  }

  // Send reminders for missing documents
  async sendMissingDocumentsReminders(user: User): Promise<void> {
    const requiredDocuments = this.getRequiredDocumentTypesByRole(user.role);
    const missingDocuments = await this.getMissingRequiredDocuments(
      user.id,
      requiredDocuments,
    );

    if (missingDocuments.length > 0) {
      const locale = getUserPreferredLocale(user);
      await this.notificationService.sendMissingDocumentsReminder(
        user,
        missingDocuments,
        locale,
      );
    }
  }

  /**
   * Obtient les documents filtrés par statut de vérification et rôle utilisateur
   * Cette méthode est utilisée à la fois par l'admin et par les commerçants
   */
  async getDocumentsByStatusAndRole(status: string, userRole?: UserRole) {
    const where: any = { verificationStatus };

    if (userRole) {
      where.user = { role };
    }

    const documents = await this.db.document.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true}},
        verifications: {
          orderBy: { requestedAt: "desc" },
          select: {
            id: true,
            status: true,
            verifiedAt: true,
            notes: true,
            rejectionReason: true,
            requestedAt: true}}}});

    // Ensure consistent data format for both admin and merchant interfaces
    return documents.map((doc) => ({ ...doc,
      status: doc.verificationStatus,
      createdAt: doc.uploadedAt }));
  }

  /**
   * Envoie un email de notification pour approbation de document
   */
  private async sendDocumentApprovalEmail(user: any, documentType: string): Promise<void> {
    try {
      const emailService = await import("@/server/services/common/email.service").then(m => m.emailService);
      
      const documentTypeLabel = this.getDocumentTypeLabel(documentType);
      
      await emailService.sendEmail({
        to: user.email,
        subject: `Document approuvé - ${documentTypeLabel}`,
        template: 'document-approval',
        data: {
          userName: user.name || user.email,
          documentType: documentTypeLabel,
          approvalDate: new Date().toLocaleDateString('fr-FR'),
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ecodeli.me'
        }
      });
      
      console.log(`📧 Email d'approbation envoyé à ${user.email} pour ${documentTypeLabel}`);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email d\'approbation:', error);
      // Ne pas faire échouer le processus principal si l'email échoue
    }
  }

  /**
   * Envoie un email de notification pour rejet de document
   */
  private async sendDocumentRejectionEmail(user: any, documentType: string, rejectionReason?: string): Promise<void> {
    try {
      const emailService = await import("@/server/services/common/email.service").then(m => m.emailService);
      
      const documentTypeLabel = this.getDocumentTypeLabel(documentType);
      
      await emailService.sendEmail({
        to: user.email,
        subject: `Document rejeté - ${documentTypeLabel}`,
        template: 'document-rejection',
        data: {
          userName: user.name || user.email,
          documentType: documentTypeLabel,
          rejectionReason: rejectionReason || 'Document non conforme aux exigences',
          rejectionDate: new Date().toLocaleDateString('fr-FR'),
          uploadUrl: `${process.env.NEXT_PUBLIC_APP_URL}/documents/upload`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@ecodeli.me',
          helpUrl: `${process.env.NEXT_PUBLIC_APP_URL}/help/documents`
        }
      });
      
      console.log(`📧 Email de rejet envoyé à ${user.email} pour ${documentTypeLabel}`);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de rejet:', error);
      // Ne pas faire échouer le processus principal si l'email échoue
    }
  }

  /**
   * Obtient le libellé français du type de document
   */
  private getDocumentTypeLabel(documentType: string): string {
    const labels: Record<string, string> = {
      'IDENTITY_CARD': 'Carte d\'identité',
      'PASSPORT': 'Passeport',
      'DRIVING_LICENSE': 'Permis de conduire',
      'VEHICLE_REGISTRATION': 'Carte grise',
      'INSURANCE_CERTIFICATE': 'Certificat d\'assurance',
      'BUSINESS_LICENSE': 'Licence commerciale',
      'TAX_CERTIFICATE': 'Certificat fiscal',
      'BANK_RIB': 'RIB bancaire',
      'ADDRESS_PROOF': 'Justificatif de domicile',
      'PROFESSIONAL_QUALIFICATION': 'Qualification professionnelle'
    };
    
    return labels[documentType] || documentType;
  }
}

// Exporter une instance du service
export const documentService = new DocumentService();
