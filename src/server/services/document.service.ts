import {
  DocumentType,
  PrismaClient,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { EmailService } from './email.service';
import fs from 'fs/promises';
import path from 'path';
import { TRPCError } from '@trpc/server';
import { db } from '../db';
import crypto from 'crypto';
import { NotificationService } from './notification.service';
import { getUserPreferredLocale } from '@/lib/user-locale';
import { User } from '@prisma/client';

/**
 * Types pour les paramètres des méthodes
 */
interface UploadDocumentParams {
  userId: string;
  type: DocumentType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  notes?: string;
  expiryDate?: Date;
}

interface UpdateDocumentParams {
  documentId: string;
  notes?: string;
  expiryDate?: Date;
}

interface UpdateDocumentInput {
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  reviewerId?: string;
  notes?: string | null;
  rejectionReason?: string | null;
  expiryDate?: Date | null;
}

interface ApiRouteDocumentUpdate {
  isVerified?: boolean;
  verificationStatus?: string;
  notes?: string | null;
  rejectionReason?: string | null;
  expiryDate?: Date | null;
  reviewerId?: string | null;
}

interface UploadFileResult {
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}

interface CreateVerificationParams {
  submitterId: string;
  documentId: string;
  notes?: string;
}

interface UpdateVerificationParams {
  verificationId: string;
  verifierId: string;
  status: VerificationStatus;
  notes?: string;
}

/**
 * Service pour la gestion des documents et vérifications
 */
export class DocumentService {
  private prisma: PrismaClient;
  private uploadDir: string;
  private notificationService: NotificationService;
  private emailService: EmailService;

  constructor(prisma = db) {
    this.prisma = prisma;
    // Le dossier d'uploads est relatif à la racine du projet
    this.uploadDir = path.join(process.cwd(), 'public', 'uploads');
    this.notificationService = new NotificationService();
    this.emailService = new EmailService();
  }

  /**
   * Sauvegarde un fichier sur le serveur et retourne son URL
   * Dans un environnement de production, utilisez plutôt un service de stockage comme S3
   */
  private async saveFile(
    file: { buffer: Buffer; filename: string; mimetype: string },
    userId: string
  ): Promise<UploadFileResult> {
    try {
      // S'assurer que le dossier d'uploads existe
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Créer un nom de fichier unique avec un timestamp et un hash
      const fileExt = path.extname(file.filename);
      const fileNameBase = path.basename(file.filename, fileExt);
      const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      const safeFileName = `${fileNameBase.replace(/[^a-z0-9]/gi, '-')}-${uniqueSuffix}${fileExt}`;

      // Créer un sous-dossier par utilisateur
      const userDir = path.join(this.uploadDir, userId);
      await fs.mkdir(userDir, { recursive: true });

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
        fileSize: file.buffer.length,
      };
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du fichier:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'upload du fichier",
      });
    }
  }

  /**
   * Upload a document with parameters as an object
   */
  async uploadDocument(params: UploadDocumentParams) {
    try {
      // Vérifier si l'utilisateur existe
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur non trouvé',
        });
      }

      // Créer l'entrée de document
      const document = await this.prisma.document.create({
        data: {
          userId: params.userId,
          type: params.type,
          filename: params.filename,
          fileUrl: params.fileUrl,
          mimeType: params.mimeType,
          fileSize: params.fileSize,
          uploadedAt: new Date(),
          expiryDate: params.expiryDate,
          notes: params.notes,
          verificationStatus: VerificationStatus.PENDING,
        },
        include: {
          user: true,
        },
      });

      // Créer une demande de vérification
      await this.prisma.verification.create({
        data: {
          submitterId: params.userId,
          documentId: document.id,
          status: VerificationStatus.PENDING,
          requestedAt: new Date(),
        },
      });

      return document;
    } catch (error) {
      console.error("Erreur lors de l'upload du document:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'upload du document",
      });
    }
  }

  /**
   * Met à jour un document existant
   */
  async updateDocument(data: UpdateDocumentParams) {
    // Vérifier si le document existe
    const document = await this.prisma.document.findUnique({
      where: { id: data.documentId },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    // Mettre à jour le document
    const updatedDocument = await this.prisma.document.update({
      where: { id: data.documentId },
      data: {
        notes: data.notes,
        expiryDate: data.expiryDate,
      },
    });

    return updatedDocument;
  }

  /**
   * Obtient un document par son ID avec contrôle d'accès
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
            role: true,
          },
        },
        verifications: {
          include: {
            verifier: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    // Vérifier les permissions si userId est fourni
    if (userId && document.userId !== userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Seuls les admins peuvent voir les documents d'autres utilisateurs
      if (!user || user.role !== 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'avez pas accès à ce document",
        });
      }
    }

    return document;
  }

  /**
   * Obtient tous les documents d'un utilisateur
   */
  async getUserDocuments(userId: string) {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          userId,
        },
        orderBy: {
          uploadedAt: 'desc',
        },
        include: {
          verifications: true,
        },
      });

      // Map uploadedAt to createdAt for frontend compatibility
      // Also handle SELFIE documents stored as OTHER with notes="SELFIE"
      return documents.map(doc => ({
        ...doc,
        createdAt: doc.uploadedAt,
        // If document is OTHER type but has notes containing "SELFIE" (case insensitive), correct the type for frontend
        type:
          doc.type === DocumentType.OTHER &&
          (doc.notes === 'SELFIE' ||
            (typeof doc.notes === 'string' && doc.notes.toLowerCase().includes('selfie')))
            ? 'SELFIE'
            : doc.type,
      }));
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch user documents',
      });
    }
  }

  /**
   * Obtient tous les documents en attente de vérification
   */
  async getPendingDocuments(userRole?: UserRole) {
    const whereClause: any = {
      verificationStatus: VerificationStatus.PENDING,
    };

    if (userRole) {
      whereClause.user = {
        role: userRole,
      };
    }

    const documents = await this.prisma.document.findMany({
      where: whereClause,
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        verifications: {
          include: {
            submitter: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Map uploadedAt to createdAt for frontend compatibility
    return documents.map(doc => ({
      ...doc,
      createdAt: doc.uploadedAt,
      // If document is OTHER type but has notes containing "SELFIE" (case insensitive), correct the type for frontend
      type:
        doc.type === DocumentType.OTHER &&
        (doc.notes === 'SELFIE' ||
          (typeof doc.notes === 'string' && doc.notes.toLowerCase().includes('selfie')))
          ? 'SELFIE'
          : doc.type,
    }));
  }

  /**
   * Crée une demande de vérification pour un document
   */
  async createVerification(data: CreateVerificationParams) {
    // Vérifier si le document existe
    const document = await this.prisma.document.findUnique({
      where: { id: data.documentId },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    // Créer la demande de vérification
    const verification = await this.prisma.verification.create({
      data: {
        submitterId: data.submitterId,
        documentId: data.documentId,
        status: VerificationStatus.PENDING,
        notes: data.notes,
      },
    });

    return verification;
  }

  /**
   * Met à jour une vérification (par un admin)
   */
  async updateVerification(data: UpdateVerificationParams) {
    // Vérifier si la vérification existe
    const verification = await this.prisma.verification.findUnique({
      where: { id: data.verificationId },
      include: {
        document: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!verification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Vérification non trouvée',
      });
    }

    // Mettre à jour la vérification
    const updatedVerification = await this.prisma.verification.update({
      where: { id: data.verificationId },
      data: {
        verifierId: data.verifierId,
        status: data.status,
        notes: data.notes,
        verifiedAt: new Date(),
      },
    });

    // Si la vérification est approuvée, mettre à jour le document
    if (data.status === VerificationStatus.APPROVED) {
      await this.prisma.document.update({
        where: { id: verification.documentId },
        data: {
          isVerified: true,
          verificationStatus: VerificationStatus.APPROVED,
          reviewerId: data.verifierId,
        },
      });

      // Vérifier si tous les documents requis sont approuvés pour le livreur
      await this.checkAndUpdateUserVerificationStatus(
        verification.document.userId,
        verification.document.user.role
      );
    } else if (data.status === VerificationStatus.REJECTED) {
      await this.prisma.document.update({
        where: { id: verification.documentId },
        data: {
          isVerified: false,
          verificationStatus: VerificationStatus.REJECTED,
          reviewerId: data.verifierId,
          rejectionReason: data.notes || null,
        },
      });
    }

    return updatedVerification;
  }

  /**
   * Vérifie si tous les documents requis sont approuvés pour un utilisateur
   * et met à jour son statut de vérification si c'est le cas
   */
  async checkAndUpdateUserVerificationStatus(userId: string, userRole: UserRole) {
    if (userRole === UserRole.DELIVERER) {
      // Types de documents requis pour un livreur
      const requiredTypes = [
        DocumentType.ID_CARD,
        DocumentType.DRIVING_LICENSE,
        DocumentType.VEHICLE_REGISTRATION,
      ];

      // Documents alternatifs acceptables
      const alternativeTypes = [DocumentType.SELFIE, DocumentType.OTHER];

      // Vérifier tous les documents approuvés de cet utilisateur
      const approvedDocs = await this.prisma.document.findMany({
        where: {
          userId: userId,
          verificationStatus: VerificationStatus.APPROVED,
        },
      });

      // Compter les documents requis qui sont approuvés
      const approvedRequiredDocs = approvedDocs.filter(doc => requiredTypes.includes(doc.type));

      // Compter les documents alternatifs approuvés
      const approvedAlternativeDocs = approvedDocs.filter(
        doc =>
          alternativeTypes.includes(doc.type) ||
          (doc.type === DocumentType.OTHER && doc.notes?.toLowerCase().includes('selfie'))
      );

      // Si l'utilisateur a au moins 3 documents approuvés dont au moins 2 sont requis
      const hasEnoughDocs =
        approvedRequiredDocs.length >= 2 &&
        approvedRequiredDocs.length + approvedAlternativeDocs.length >= 3;

      // Si tous les documents requis sont approuvés, marquer le livreur comme vérifié
      if (hasEnoughDocs) {
        console.log('Validation automatique du livreur: documents suffisants approuvés');
        // Mettre à jour le statut du livreur
        await this.prisma.deliverer.update({
          where: { userId: userId },
          data: {
            isVerified: true,
            verificationDate: new Date(),
          },
        });

        // Mettre à jour le statut utilisateur
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isVerified: true,
            status: UserStatus.ACTIVE,
          },
        });

        // Envoyer une notification pour indiquer que tous les documents sont vérifiés
        await this.notificationService.createNotification({
          userId: userId,
          title: 'Vérification complète',
          message:
            'Tous vos documents ont été vérifiés et approuvés. Votre compte est maintenant actif.',
          type: 'SUCCESS',
        });
      }
    }
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
            email: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    return verifications;
  }

  /**
   * Vérifie un document (approuver ou rejeter)
   * Cette méthode déclenche également la vérification automatique du livreur
   * si tous les documents requis sont approuvés
   */
  async verifyDocument(data: {
    documentId: string;
    verificationStatus: VerificationStatus;
    adminId: string;
    rejectionReason?: string;
  }) {
    const { documentId, verificationStatus, adminId, rejectionReason } = data;

    // Récupérer le document avec les informations utilisateur
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    // Mettre à jour le document
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus,
        reviewer: {
          connect: { id: adminId },
        },
        rejectionReason:
          verificationStatus === VerificationStatus.REJECTED ? rejectionReason : null,
        isVerified: verificationStatus === VerificationStatus.APPROVED,
      },
    });

    // Créer un enregistrement de vérification
    await this.prisma.verification.create({
      data: {
        documentId,
        submitterId: document.userId,
        verifierId: adminId,
        status: verificationStatus,
        verifiedAt: new Date(),
        notes: rejectionReason,
      },
    });

    // Notification par email selon le statut
    if (verificationStatus === VerificationStatus.APPROVED) {
      if (document.user?.email) {
        await this.emailService.sendDocumentApprovedEmail(
          document.user.email,
          document.filename,
          document.type
        );
      }

      // Vérifier si tous les documents requis sont approuvés et mettre à jour le statut
      await this.checkAndUpdateUserVerificationStatus(document.userId, document.user.role);
    } else if (verificationStatus === VerificationStatus.REJECTED && document.user?.email) {
      await this.emailService.sendDocumentRejectedEmail(
        document.user.email,
        document.filename,
        document.type,
        rejectionReason || 'Aucune raison spécifiée'
      );
    }

    return updatedDocument;
  }

  /**
   * Supprime un document
   */
  async deleteDocument(id: string, userId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    // Vérifier si l'utilisateur est le propriétaire ou un admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (document.userId !== userId && (!user || user.role !== 'ADMIN')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: "Vous n'êtes pas autorisé à supprimer ce document",
      });
    }

    // Supprimer le fichier physique
    try {
      // Extraire le chemin du fichier à partir de l'URL
      const filePath = path.join(this.uploadDir, document.fileUrl.replace('/uploads/', ''));
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      // On continue même si le fichier ne peut pas être supprimé
    }

    // Supprimer les vérifications associées
    await this.prisma.verification.deleteMany({
      where: { documentId: id },
    });

    // Supprimer le document de la base de données
    return await this.prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Obtient les types de documents requis par rôle utilisateur
   */
  getRequiredDocumentTypes(role: UserRole): DocumentType[] {
    switch (role) {
      case UserRole.DELIVERER:
        return [
          DocumentType.ID_CARD,
          DocumentType.DRIVING_LICENSE,
          DocumentType.VEHICLE_REGISTRATION,
        ];
      case UserRole.MERCHANT:
        return [
          DocumentType.ID_CARD,
          DocumentType.BUSINESS_REGISTRATION,
          DocumentType.PROOF_OF_ADDRESS,
        ];
      case UserRole.PROVIDER:
        return [
          DocumentType.ID_CARD,
          DocumentType.QUALIFICATION_CERTIFICATE,
          DocumentType.PROOF_OF_ADDRESS,
        ];
      default:
        return [DocumentType.ID_CARD];
    }
  }

  /**
   * Vérifie si un utilisateur a tous les documents requis approuvés
   */
  async hasRequiredDocuments(userId: string, role: UserRole): Promise<boolean> {
    const requiredTypes = this.getRequiredDocumentTypes(role);

    const approvedDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        verificationStatus: VerificationStatus.APPROVED,
        type: { in: requiredTypes },
      },
    });

    return requiredTypes.every(type => approvedDocuments.some(doc => doc.type === type));
  }

  /**
   * Récupère les documents requis manquants pour un utilisateur
   */
  async getMissingRequiredDocuments(userId: string, role: UserRole): Promise<DocumentType[]> {
    const requiredTypes = this.getRequiredDocumentTypes(role);

    const approvedDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        verificationStatus: VerificationStatus.APPROVED,
        type: { in: requiredTypes },
      },
    });

    const approvedTypes = approvedDocuments.map(doc => doc.type);

    return requiredTypes.filter(type => !approvedTypes.includes(type));
  }

  /**
   * Envoie des rappels pour les documents manquants
   */
  async sendMissingDocumentsReminders(user: User): Promise<void> {
    const missingDocuments = await this.getMissingRequiredDocuments(user.id, user.role);

    if (missingDocuments.length > 0) {
      const locale = getUserPreferredLocale(user);
      await this.notificationService.sendMissingDocumentsReminder(user, missingDocuments, locale);
    }
  }

  /**
   * Récupère les documents qui vont bientôt expirer
   */
  async getExpiringDocuments(userId: string, daysUntilExpiry: number) {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    return await this.prisma.document.findMany({
      where: {
        userId,
        expiryDate: {
          not: null,
          lte: expiryThreshold,
        },
      },
    });
  }

  /**
   * Méthode pour l'API qui accepte des chaînes de caractères pour les enums
   */
  async updateDocumentFromApi(id: string, data: ApiRouteDocumentUpdate) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document not found',
      });
    }

    // Convertir le statut de chaîne en enum
    let verificationStatus = data.verificationStatus as VerificationStatus | undefined;

    const updateData: any = {
      isVerified: data.isVerified,
      verificationStatus,
      notes: data.notes,
      rejectionReason: data.rejectionReason,
      expiryDate: data.expiryDate,
      reviewerId: data.reviewerId,
    };

    // Mettre à jour le document
    const updatedDocument = await this.prisma.document.update({
      where: { id },
      data: updateData,
    });

    // Créer un enregistrement de vérification si le statut est APPROVED ou REJECTED
    if (
      verificationStatus === VerificationStatus.APPROVED ||
      verificationStatus === VerificationStatus.REJECTED
    ) {
      await this.prisma.verification.create({
        data: {
          status: verificationStatus,
          documentId: id,
          submitterId: document.userId,
          verifierId: data.reviewerId || undefined,
          verifiedAt: new Date(),
          notes: data.notes,
          rejectionReason: data.rejectionReason,
        },
      });

      // Si le document est approuvé, vérifier si tous les documents requis sont approuvés
      if (verificationStatus === VerificationStatus.APPROVED && document.user) {
        await this.checkAndUpdateUserVerificationStatus(document.userId, document.user.role);
      }
    }

    return updatedDocument;
  }
}

// Exporter une instance du service
export const documentService = new DocumentService();
