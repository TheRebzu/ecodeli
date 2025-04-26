import { PrismaClient, DocumentType, VerificationStatus } from "@prisma/client";
import { EmailService } from './email.service';
import { DocumentStatus } from '../db/enums';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TRPCError } from '@trpc/server';
import { db } from '../db';

// Interface Document pour typer les retours
interface Document {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
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
enum DocumentType {
  ID_CARD = "ID_CARD",
  DRIVING_LICENSE = "DRIVING_LICENSE",
  VEHICLE_REGISTRATION = "VEHICLE_REGISTRATION",
  INSURANCE = "INSURANCE",
  QUALIFICATION_CERTIFICATE = "QUALIFICATION_CERTIFICATE",
  OTHER = "OTHER"
}

enum VerificationStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

type UploadDocumentParams = {
  userId: string;
  type: DocumentType;
  filename: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  notes?: string;
  expiryDate?: Date;
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

/**
 * Service pour la gestion des documents et vérifications
 */
export class DocumentService {
  private prisma: PrismaClient;
  
  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Télécharge un nouveau document pour un utilisateur
   */
  async uploadDocument(data: UploadDocumentParams) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Créer le document
    const document = await this.prisma.document.create({
      data: {
        userId: data.userId,
        type: data.type as unknown as Prisma.EnumDocumentTypeFieldUpdateOperationsInput,
        filename: data.filename,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        notes: data.notes,
        expiryDate: data.expiryDate,
      },
    });

    // Créer automatiquement une demande de vérification
    const verification = await this.prisma.verification.create({
      data: {
        submitterId: data.userId,
        documentId: document.id,
        status: VerificationStatus.PENDING as unknown as Prisma.EnumVerificationStatusFieldUpdateOperationsInput,
        notes: data.notes,
      },
    });
    
    return { document, verification };
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
   * Obtient un document par son ID
   */
  async getDocumentById(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
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
            verifier: {
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

    if (!document) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Document non trouvé',
      });
    }

    return document;
  }

  /**
   * Obtient tous les documents d'un utilisateur
   */
  async getUserDocuments(userId: string) {
    const documents = await this.prisma.document.findMany({
      where: { userId },
      include: {
        verifications: {
          include: {
            verifier: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
    
    return documents;
  }

  /**
   * Obtient tous les documents en attente de vérification
   */
  async getPendingVerificationDocuments() {
    const documents = await this.prisma.document.findMany({
      where: {
        verifications: {
          some: {
            status: VerificationStatus.PENDING as unknown as string,
          },
        },
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
          where: {
            status: VerificationStatus.PENDING as unknown as string,
          },
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
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return documents;
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
        status: VerificationStatus.PENDING as unknown as Prisma.EnumVerificationStatusFieldUpdateOperationsInput,
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
        status: data.status as unknown as Prisma.EnumVerificationStatusFieldUpdateOperationsInput,
        notes: data.notes,
        verifiedAt: new Date(),
      },
    });

    // Si la vérification est approuvée, marquer le document comme vérifié
    if (data.status === VerificationStatus.APPROVED) {
      await this.prisma.document.update({
        where: { id: verification.documentId },
        data: {
          isVerified: true,
        },
      });

      // Si c'est un document d'identité pour un livreur ou prestataire, mettre à jour leur statut de vérification
      const document = await this.prisma.document.findUnique({
        where: { id: verification.documentId },
        include: {
          user: true,
        },
      });

      if (document && document.user) {
        if (document.user.role === 'DELIVERER') {
          await this.prisma.deliverer.update({
            where: { userId: document.userId },
            data: {
              isVerified: true,
            },
          });
        } else if (document.user.role === 'PROVIDER') {
          await this.prisma.provider.update({
            where: { userId: document.userId },
            data: {
              isVerified: true,
            },
          });
        }
      }
    }

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
  
  async verifyDocument(data: {
    documentId: string;
    status: DocumentStatus;
    adminId: string;
    rejectionReason?: string;
  }): Promise<Document> {
    const { documentId, status, adminId, rejectionReason } = data;
    
    const document = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionReason: status === DocumentStatus.REJECTED ? rejectionReason : null
      },
      include: { user: true }
    });
    
    // Notification par email
    if (status === DocumentStatus.APPROVED) {
      await this.emailService.sendDocumentApprovedEmail(
        document.user.email as string,
        document.originalName,
        document.type as DocumentType
      );
    } else if (status === DocumentStatus.REJECTED) {
      await this.emailService.sendDocumentRejectedEmail(
        document.user.email as string,
        document.originalName,
        document.type as DocumentType,
        rejectionReason || 'Aucune raison spécifiée'
      );
    }
    
    return document as unknown as Document;
  }
  
  async deleteDocument(id: string): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id }
    });
    
    if (!document) {
      throw new Error('Document non trouvé');
    }
    
    // Supprimer le fichier physique
    await fs.unlink(path.join(process.cwd(), document.path));
    
    // Supprimer l'entrée dans la base de données
    await this.prisma.document.delete({
      where: { id }
    });
  }
  
  async getPendingDocuments(userRole?: string): Promise<Document[]> {
    // Construire la requête avec ou sans le filtre de rôle
    const where: Record<string, any> = { status: DocumentStatus.PENDING };
    
    // Si un rôle est spécifié, filtrer par ce rôle
    if (userRole) {
      where.user = { role: userRole };
    }
    
    const documents = await this.prisma.document.findMany({
      where,
      orderBy: { uploadedAt: 'asc' },
      include: { user: true }
    });
    
    return documents as unknown as Document[];
  }

  /**
   * Récupère tous les documents d'un utilisateur
   */
  static async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      const documents = await db.document.findMany({
        where: { userId },
        orderBy: { uploadDate: 'desc' }
      });
      
      return documents;
    } catch (error) {
      console.error('Erreur lors de la récupération des documents:', error);
      throw new Error('Impossible de récupérer les documents');
    }
  }
  
  /**
   * Récupère tous les documents en attente de vérification
   */
  static async getPendingDocuments(userRole?: string): Promise<Document[]> {
    try {
      const where: any = { status: 'PENDING' };
      
      // Si un rôle d'utilisateur est spécifié, filtrer par ce rôle
      if (userRole) {
        where.userRole = userRole;
      }
      
      const documents = await db.document.findMany({
        where,
        orderBy: { uploadDate: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });
      
      return documents;
    } catch (error) {
      console.error('Erreur lors de la récupération des documents en attente:', error);
      throw new Error('Impossible de récupérer les documents en attente');
    }
  }
  
  /**
   * Met à jour le statut d'un document
   */
  static async updateDocumentStatus(
    documentId: string, 
    status: DocumentStatus, 
    adminId: string,
    rejectionReason?: string
  ): Promise<Document> {
    try {
      // Récupérer le document pour vérifier qu'il existe
      const existingDocument = await db.document.findUnique({
        where: { id: documentId },
        include: { user: true },
      });
      
      if (!existingDocument) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé'
        });
      }
      
      if (existingDocument.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce document a déjà été traité'
        });
      }
      
      // Mise à jour du document
      const updatedDocument = await db.document.update({
        where: { id: documentId },
        data: {
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          reviewedBy: adminId,
          reviewedAt: new Date()
        }
      });
      
      // Envoyer une notification à l'utilisateur
      const emailService = new EmailService();
      const userEmail = existingDocument.user.email;
      
      if (userEmail) {
        if (status === 'APPROVED') {
          await emailService.sendDocumentApprovedEmail(
            userEmail,
            existingDocument.fileName,
            this.getDocumentTypeName(existingDocument.type as DocumentType)
          );
        } else if (status === 'REJECTED' && rejectionReason) {
          await emailService.sendDocumentRejectedEmail(
            userEmail,
            existingDocument.fileName,
            this.getDocumentTypeName(existingDocument.type as DocumentType),
            rejectionReason
          );
        }
      }
      
      // Mettre à jour le statut de vérification de l'utilisateur si nécessaire
      if (status === 'APPROVED') {
        await this.updateUserVerificationStatus(existingDocument.userId, existingDocument.userRole);
      }
      
      return updatedDocument;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      
      console.error('Erreur lors de la mise à jour du statut du document:', error);
      throw new Error('Impossible de mettre à jour le statut du document');
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
          status: 'PENDING',
        }
      });
      
      return document;
    } catch (error) {
      console.error('Erreur lors de la création du document:', error);
      throw new Error('Impossible de créer le document');
    }
  }
  
  /**
   * Supprime un document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      // Vérifier que le document appartient à l'utilisateur
      const document = await db.document.findUnique({
        where: { id: documentId }
      });
      
      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document non trouvé'
        });
      }
      
      if (document.userId !== userId) {
        return false;
      }
      
      // Supprimer le fichier physique
      if (document.filePath) {
        try {
          await fs.unlink(document.filePath);
        } catch (error) {
          console.error('Erreur lors de la suppression du fichier:', error);
          // On continue même si la suppression du fichier échoue
        }
      }
      
      // Supprimer l'entrée dans la base de données
      await db.document.delete({
        where: { id: documentId }
      });
      
      return true;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      
      console.error('Erreur lors de la suppression du document:', error);
      throw new Error('Impossible de supprimer le document');
    }
  }
  
  /**
   * Vérifie si un utilisateur a tous les documents requis approuvés
   */
  private static async updateUserVerificationStatus(userId: string, userRole: string): Promise<void> {
    try {
      if (userRole === 'DELIVERER') {
        const requiredDocumentTypes = ['ID_CARD', 'DRIVER_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE'];
        
        // Vérifier si tous les documents requis sont approuvés
        const approvedDocuments = await db.document.findMany({
          where: {
            userId,
            status: 'APPROVED',
            type: { in: requiredDocumentTypes }
          }
        });
        
        // Si tous les documents requis sont approuvés, mettre à jour le statut de vérification
        if (approvedDocuments.length === requiredDocumentTypes.length) {
          await db.deliverer.update({
            where: { userId },
            data: { isVerified: true }
          });
          
          // Mise à jour du statut utilisateur
          await db.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' }
          });
        }
      } else if (userRole === 'PROVIDER') {
        // Logique similaire pour les prestataires
        const requiredDocumentTypes = ['ID_CARD', 'PROFESSIONAL_CERTIFICATION'];
        
        const approvedDocuments = await db.document.findMany({
          where: {
            userId,
            status: 'APPROVED',
            type: { in: requiredDocumentTypes }
          }
        });
        
        if (approvedDocuments.length === requiredDocumentTypes.length) {
          await db.provider.update({
            where: { userId },
            data: { isVerified: true }
          });
          
          await db.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' }
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de vérification:', error);
      // Ne pas propager l'erreur pour éviter de bloquer la vérification du document
    }
  }
  
  /**
   * Récupère le nom lisible d'un type de document
   */
  private static getDocumentTypeName(type: DocumentType): string {
    const documentTypeNames: Record<DocumentType, string> = {
      [DocumentType.ID_CARD]: "Carte d'identité",
      [DocumentType.DRIVER_LICENSE]: "Permis de conduire",
      [DocumentType.VEHICLE_REGISTRATION]: "Carte grise",
      [DocumentType.INSURANCE]: "Attestation d'assurance",
      [DocumentType.CRIMINAL_RECORD]: "Casier judiciaire",
      [DocumentType.PROFESSIONAL_CERTIFICATION]: "Certification professionnelle",
      [DocumentType.OTHER]: "Autre document"
    };
    
    return documentTypeNames[type] || "Document";
  }
}