import {
  PrismaClient,
  DocumentType,
  VerificationStatus,
  UserRole} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { db } from "@/server/db";
import { NotificationService } from "@/lib/services/notification.service";
import { getUserPreferredLocale } from "@/lib/i18n/user-locale";
import { cloudinaryService } from "@/lib/integrations/cloudinary";

// Interface Document pour typer les retours
interface DocumentWithUser {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
  type: DocumentType;
  verificationStatus: VerificationStatus;
  uploadedAt: Date;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  rejectionReason?: string | null;
  isVerified: boolean;
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
  publicId?: string; // Cloudinary public ID
};

/**
 * Service pour la gestion des documents et vérifications
 */
export class DocumentService {
  private prisma: PrismaClient;

  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Sauvegarde un fichier sur Cloudinary et retourne son URL
   * Utilise Cloudinary comme service de stockage cloud
   */
  private async saveFile(
    file: { buffer: Buffer; filename: string; mimetype: string },
    userId: string,
    documentType?: string,
  ): Promise<UploadFileResult> {
    try {
      // Si Cloudinary n'est pas configuré, utiliser le stockage local en fallback
      if (!cloudinaryService.isReady()) {
        console.warn("⚠️ Cloudinary non configuré - stockage local utilisé");
        return this.saveFileLocally(file, userId);
      }

      // Déterminer le type de document pour l'organisation
      const docType = documentType || 'document';
      
      // Upload vers Cloudinary
      const result = await cloudinaryService.uploadDocument(
        file.buffer,
        file.filename,
        userId,
        docType
      );

      console.log(`✅ Document uploadé vers Cloudinary: ${result.public_id}`);

      return {
        filename: file.filename,
        fileUrl: result.secure_url,
        mimeType: file.mimetype,
        fileSize: file.buffer.length,
        publicId: result.public_id
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'upload vers Cloudinary:", error);
      
      // En cas d'erreur, essayer le stockage local en fallback
      console.warn("⚠️ Fallback vers le stockage local");
      try {
        return this.saveFileLocally(file, userId);
      } catch (fallbackError) {
        console.error("❌ Erreur lors du fallback vers le stockage local:", fallbackError);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR",
          message: "Erreur lors de l'upload du fichier - Cloudinary et stockage local ont échoué" 
        });
      }
    }
  }

  /**
   * Méthode de fallback pour le stockage local
   */
  private async saveFileLocally(
    file: { buffer: Buffer; filename: string; mimetype: string },
    userId: string,
  ): Promise<UploadFileResult> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const crypto = await import("crypto");
      
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      // S'assurer que le dossier d'uploads existe
      await fs.mkdir(uploadDir, { recursive: true });

      // Créer un nom de fichier unique avec un timestamp et un hash
      const fileExt = path.extname(file.filename);
      const fileNameBase = path.basename(file.filename, fileExt);
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
      const safeFileName = `${fileNameBase.replace(/[^a-z0-9]/gi, "-")}-${uniqueSuffix}${fileExt}`;

      // Créer un sous-dossier par utilisateur
      const userDir = path.join(uploadDir, userId);
      await fs.mkdir(userDir, { recursive: true });

      // Chemin complet du fichier
      const filePath = path.join(userDir, safeFileName);

      // Écrire le fichier
      await fs.writeFile(filePath, file.buffer);

      // URL relative pour le client
      const fileUrl = `/uploads/${userId}/${safeFileName}`;

      console.log(`📁 Document sauvegardé localement: ${safeFileName}`);

      return {
        filename: safeFileName,
        fileUrl,
        mimeType: file.mimetype,
        fileSize: file.buffer.length
      };
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde locale du fichier:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'upload du fichier" 
      });
    }
  }

  /**
   * Upload un document avec fichier - traite l'upload et crée l'entrée en base
   */
  async uploadDocumentWithFile(
    file: { buffer: Buffer; filename: string; mimetype: string },
    params: {
      userId: string;
      type: DocumentType;
      notes?: string;
      expiryDate?: Date;
      userRole?: UserRole;
    }
  ) {
    try {
      // Upload du fichier
      const uploadResult = await this.saveFile(file, params.userId, params.type);
      
      // Créer le document en base avec les informations du fichier uploadé
      const document = await this.uploadDocument({
        userId: params.userId,
        type: params.type,
        filename: uploadResult.filename,
        fileUrl: uploadResult.fileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        notes: params.notes,
        expiryDate: params.expiryDate,
        userRole: params.userRole
      });

      // Ajouter les informations Cloudinary si disponibles
      if (uploadResult.publicId) {
        await this.prisma.document.update({
          where: { id: document.id },
          data: {
            notes: `${document.notes || ''}\nCloudinary ID: ${uploadResult.publicId}`
          }
        });
      }

      return {
        ...document,
        cloudinaryPublicId: uploadResult.publicId
      };
    } catch (error) {
      console.error("❌ Erreur lors de l'upload du document avec fichier:", error);
      throw error;
    }
  }

  /**
   * Upload document à partir de données base64
   */
  async uploadDocumentFromBase64(params: {
    userId: string;
    type: DocumentType;
    file: string; // Base64 string
    notes?: string;
    expiryDate?: Date;
    userRole?: UserRole;
  }) {
    try {
      console.log("📤 Service uploadDocumentFromBase64 - Début:", {
        userId: params.userId,
        type: params.type,
        fileLength: params.file.length
      });

      // Valider et extraire les données base64
      const matches = params.file.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Format de fichier base64 invalide"
        });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      
      // Convertir base64 en buffer
      const buffer = Buffer.from(base64Data, 'base64');
      const fileSize = buffer.length;
      
      // Générer un nom de fichier
      const fileExtension = mimeType.includes('pdf') ? '.pdf' : '.jpg';
      const filename = `document_${params.type}_${Date.now()}${fileExtension}`;
      
      console.log("📤 Fichier traité:", {
        filename,
        mimeType,
        fileSize,
        type: params.type
      });

      // Créer l'objet file pour saveFile
      const fileData = {
        buffer,
        filename,
        mimetype: mimeType
      };

      // Sauvegarder le fichier
      const savedFile = await this.saveFile(fileData, params.userId, params.type);
      
      console.log("📤 Fichier sauvegardé:", savedFile);

      // Utiliser uploadDocument avec les données du fichier sauvegardé
      const document = await this.uploadDocument({
        userId: params.userId,
        type: params.type,
        filename: savedFile.filename,
        fileUrl: savedFile.fileUrl,
        mimeType: savedFile.mimeType,
        fileSize: savedFile.fileSize,
        notes: params.notes,
        expiryDate: params.expiryDate,
        userRole: params.userRole
      });

      console.log("✅ Document uploadé avec succès:", document.id);
      return document;

    } catch (error) {
      console.error("❌ Erreur uploadDocumentFromBase64:", error);
      throw error;
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
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
      const document = await this.prisma.document.create({
        data: {
          userId,
          type,
          filename,
          mimeType,
          fileSize,
          fileUrl,
          uploadedAt: new Date(),
          verificationStatus: VerificationStatus.PENDING,
          notes,
          expiryDate,
          isVerified: false,
          userRole: userRole || user.role},
        include: { user: true }});

      // Créer une demande de vérification pour ce document
      await this.prisma.verification.create({
        data: {
          submitterId: userId,
          documentId: document.id,
          status: VerificationStatus.PENDING,
          requestedAt: new Date()}});

      console.log(`Document créé avec succès: ${document.id}`);

      try {
        // Envoyer une notification à tous les administrateurs
        await NotificationService.sendDocumentSubmissionNotification(
          document.id,
          document.userId,
          document.type,
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
    const document = await this.prisma.document.findUnique({
      where: { id: data.documentId }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Mettre à jour le document
    const updatedDocument = await this.prisma.document.update({
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
    const document = await this.prisma.document.findUnique({
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }});

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

      const documents = await this.prisma.document.findMany({
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
          doc.verifications?.[0]?.status || doc.verificationStatus || "PENDING",
        status:
          doc.verificationStatus ||
          (doc.verifications?.[0]?.status as any) ||
          "PENDING",
        createdAt: doc.uploadedAt }));
    } catch (error) {
      console.error(`Erreur lors de la récupération des documents: ${error}`);
      throw error;
    }
  }

  /**
   * Obtient tous les documents d'un utilisateur avec leurs informations complètes de statut
   */
  async getUserDocumentsWithStatus(userId: string, userRole?: UserRole) {
    try {
      console.log(
        `Récupération des documents avec statut pour l'utilisateur ${userId}`,
      );

      const documents = await this.prisma.document.findMany({
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

        let effectiveStatus = doc.verificationStatus;

        // Si le document est expiré, remplacer le statut par EXPIRED
        if (isExpired && effectiveStatus === "APPROVED") {
          effectiveStatus = "EXPIRED" as any;
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
      where.user = { role: userRole };
    }

    return await this.prisma.document.findMany({
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
    const document = await this.prisma.document.findUnique({
      where: { id: data.documentId }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Créer la demande de vérification
    const verification = await this.prisma.verification.create({
      data: {
        submitterId: data.submitterId,
        documentId: data.documentId,
        status: VerificationStatus.PENDING,
        notes: data.notes}});

    return verification;
  }

  /**
   * Met à jour une vérification
   */
  async updateVerification(data: UpdateVerificationParams) {
    const {
      verificationId,
      verifierId,
      status,
      notes} = data;

    // Vérifier si la vérification existe
    const verification = await this.prisma.verification.findUnique({
      where: { id: verificationId }});

    if (!verification) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Vérification non trouvée" });
    }

    // Mettre à jour la vérification
    const updatedVerification = await this.prisma.verification.update({
      where: { id: verificationId },
      data: {
        status,
        verifierId,
        verifiedAt: new Date(),
        notes}});

    // Mettre à jour le document associé
    await this.prisma.document.update({
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
    const verifications = await this.prisma.verification.findMany({
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
  }): Promise<DocumentWithUser> {
    const {
      documentId,
      verificationStatus,
      adminId,
      rejectionReason} = data;

    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus,
        reviewerId: adminId,
        rejectionReason:
          verificationStatus === VerificationStatus.REJECTED
            ? rejectionReason
            : null,
        isVerified: verificationStatus === VerificationStatus.APPROVED},
      include: { user: true }});

    // Notification par email
    try {
      if (verificationStatus === VerificationStatus.APPROVED) {
        await NotificationService.sendToUser(document.userId, {
          title: "Document approuvé",
          message: `Votre document ${document.type} a été approuvé.`,
          type: "DOCUMENT_APPROVED",
          data: { documentId: document.id, documentType: document.type }
        });
      } else if (verificationStatus === VerificationStatus.REJECTED) {
        await NotificationService.sendToUser(document.userId, {
          title: "Document rejeté",
          message: `Votre document ${document.type} a été rejeté. Raison: ${rejectionReason || "Aucune raison spécifiée"}`,
          type: "DOCUMENT_REJECTED",
          data: { documentId: document.id, documentType: document.type, rejectionReason }
        });
      }
    } catch (notificationError) {
      console.error("❌ Erreur lors de l'envoi de la notification:", notificationError);
      // Ne pas faire échouer la vérification si la notification échoue
    }

    return document as unknown as DocumentWithUser;
  }

  async deleteDocument(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id }});

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Document non trouvé" });
    }

    // Vérifier si l'utilisateur est le propriétaire ou un admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }});

    if (document.userId !== userId && (!user || user.role !== "ADMIN")) {
      throw new TRPCError({ code: "FORBIDDEN",
        message: "Vous n'êtes pas autorisé à supprimer ce document" });
    }

    // Supprimer le fichier depuis le stockage
    await this.deleteFileFromStorage(document);

    // Supprimer les vérifications associées
    await this.prisma.verification.deleteMany({
      where: { documentId: id }});

    // Supprimer le document de la base de données
    return await this.prisma.document.delete({
      where: { id }});
  }

  /**
   * Supprime un fichier depuis le stockage (Cloudinary ou local)
   */
  private async deleteFileFromStorage(document: any) {
    try {
      // Vérifier si le document a un publicId Cloudinary dans les notes
      const cloudinaryPublicId = document.notes?.match(/Cloudinary ID: ([^\n]+)/)?.[1];
      
      if (cloudinaryPublicId && cloudinaryService.isReady()) {
        // Supprimer depuis Cloudinary
        await cloudinaryService.deleteFile(cloudinaryPublicId);
        console.log(`✅ Fichier supprimé de Cloudinary: ${cloudinaryPublicId}`);
      } else if (document.fileUrl.startsWith('/uploads/')) {
        // Supprimer depuis le stockage local (fallback)
        const fs = await import("fs/promises");
        const path = await import("path");
        
        const filePath = path.join(
          process.cwd(),
          "public",
          document.fileUrl.replace("/uploads/", "uploads/")
        );
        
        await fs.unlink(filePath);
        console.log(`📁 Fichier supprimé du stockage local: ${filePath}`);
      } else {
        console.warn(`⚠️ Impossible de déterminer comment supprimer le fichier: ${document.fileUrl}`);
      }
    } catch (error) {
      console.error("❌ Erreur lors de la suppression du fichier:", error);
      // On continue même si le fichier ne peut pas être supprimé
    }
  }
}

// Instance singleton du service
export const documentService = new DocumentService();

// Export par défaut
export default DocumentService;