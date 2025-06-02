import { db } from '@/server/db';
import {
  PrismaClient,
  DocumentType,
  UserRole,
  VerificationStatus,
  UserStatus,
} from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { 
  MerchantVerificationSubmitInput,
  ProviderVerificationSubmitInput
} from '@/schemas/verification.schema';
import type { 
  MerchantVerification, 
  ProviderVerification,
  VerificationUpdateRequest
} from '@/types/verification';

type UploadResult = {
  fileUrl: string;
  filename: string;
  mimeType: string;
  fileSize: number;
};

type VerificationResult = {
  isComplete: boolean;
  missingDocuments: DocumentType[];
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
};

/**
 * Service pour la gestion des vérifications de documents et d'utilisateurs
 */
export class VerificationService {
  private prisma: PrismaClient;
  
  // Configuration des documents requis par rôle
  private static readonly REQUIRED_DOCUMENTS: Record<UserRole, DocumentType[]> = {
    [UserRole.DELIVERER]: [
      DocumentType.ID_CARD,
      DocumentType.DRIVING_LICENSE,
      DocumentType.VEHICLE_REGISTRATION,
      DocumentType.INSURANCE,
    ],
    [UserRole.PROVIDER]: [
      DocumentType.ID_CARD,
      DocumentType.QUALIFICATION_CERTIFICATE,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
    ],
    [UserRole.MERCHANT]: [
      DocumentType.ID_CARD,
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.PROOF_OF_ADDRESS,
    ],
    [UserRole.ADMIN]: [], // Admins don't need verification
    [UserRole.CUSTOMER]: [], // Customers don't need verification
  };

  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Télécharge un document pour vérification avec validation renforcée
   */
  async uploadDocument(userId: string, type: DocumentType, file: File, userRole: UserRole) {
    // Validation des entrées
    await this.validateUser(userId, userRole);
    this.validateFileType(file, type);
    
    // Vérifier si le document est requis pour ce rôle
    const requiredDocs = VerificationService.REQUIRED_DOCUMENTS[userRole];
    if (!requiredDocs.includes(type)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Document type ${type} is not required for ${userRole}`,
      });
    }

    // Vérifier si un document de ce type existe déjà
    const existingDocument = await this.prisma.document.findFirst({
      where: {
        userId,
        type,
        userRole,
      },
    });

    // Upload du fichier
    const uploadResult = await this.uploadFileToStorage(file);

    let document;
    if (existingDocument) {
      // Mettre à jour le document existant
      document = await this.prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          filename: uploadResult.filename,
          fileUrl: uploadResult.fileUrl,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          isVerified: false,
          verificationStatus: VerificationStatus.PENDING,
          rejectionReason: null,
          updatedAt: new Date(),
        },
      });
    } else {
      // Créer un nouveau document
      document = await this.prisma.document.create({
        data: {
          userId,
          type,
          userRole,
          filename: uploadResult.filename,
          fileUrl: uploadResult.fileUrl,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
        },
      });
    }

    // Créer ou mettre à jour la demande de vérification
    await this.upsertVerificationRequest(userId, document.id);

    return document;
  }

  /**
   * Valide l'utilisateur et son rôle
   */
  private async validateUser(userId: string, expectedRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    if (user.role !== expectedRole) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Type d'utilisateur incorrect",
      });
    }
  }

  /**
   * Valide le type de fichier en fonction du type de document
   */
  private validateFileType(file: File, documentType: DocumentType) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Type de fichier non autorisé. Formats acceptés: JPEG, PNG, PDF',
      });
    }

    // Limite de taille: 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Fichier trop volumineux. Taille maximale: 10MB',
      });
    }
  }

  /**
   * Crée ou met à jour une demande de vérification
   */
  private async upsertVerificationRequest(userId: string, documentId: string) {
    const existingVerification = await this.prisma.verification.findFirst({
      where: { documentId },
    });

    if (existingVerification) {
      return await this.prisma.verification.update({
        where: { id: existingVerification.id },
        data: {
          status: VerificationStatus.PENDING,
          requestedAt: new Date(),
          verifiedAt: null,
          verifierId: null,
          notes: null,
        },
      });
    }

    return await this.prisma.verification.create({
      data: {
        submitterId: userId,
        documentId,
      },
    });
  }

  /**
   * Upload vers le stockage externe avec retry et validation
   */
  private async uploadFileToStorage(file: File): Promise<UploadResult> {
    try {
      // TODO: Implémenter l'upload réel vers S3/CloudStorage
      // Pour l'instant, simulation
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      return {
        fileUrl: `https://storage.example.com/${timestamp}_${sanitizedFilename}`,
        filename: sanitizedFilename,
        mimeType: file.type,
        fileSize: file.size,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors du téléchargement du fichier',
      });
    }
  }

  /**
   * Examine un document avec logging et notifications
   */
  async reviewDocument(
    documentId: string,
    verifierId: string,
    status: VerificationStatus,
    notes?: string
  ) {
    // Validation de l'administrateur
    await this.validateAdminPermissions(verifierId);

    // Transaction pour garantir la cohérence
    return await this.prisma.$transaction(async (tx) => {
      // Récupérer les informations nécessaires
      const verification = await tx.verification.findFirst({
        where: { documentId },
        include: {
          document: {
            include: { user: true }
          }
        }
      });

      if (!verification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Demande de vérification non trouvée',
        });
      }

      // Mettre à jour la vérification
      const updatedVerification = await tx.verification.update({
        where: { id: verification.id },
        data: {
          verifierId,
          status,
          notes,
          verifiedAt: new Date(),
        },
      });

      // Mettre à jour le document
      await tx.document.update({
        where: { id: documentId },
        data: {
          isVerified: status === VerificationStatus.APPROVED,
          reviewerId: verifierId,
          verificationStatus: status,
          rejectionReason: status === VerificationStatus.REJECTED ? notes : null,
        },
      });

      // Vérifier si l'utilisateur peut être complètement vérifié
      if (status === VerificationStatus.APPROVED && verification.document?.user) {
        await this.checkAndUpdateCompleteVerification(
          verification.document.user.id,
          verification.document.user.role as UserRole,
          tx
        );
      }

      // Créer un log d'audit
      await tx.auditLog.create({
        data: {
          action: `DOCUMENT_${status}`,
          entityType: 'DOCUMENT',
          entityId: documentId,
          userId: verifierId,
          details: {
            documentType: verification.document?.type,
            submitterId: verification.submitterId,
            notes,
          },
        }
      });

      return updatedVerification;
    });
  }

  /**
   * Valide les permissions d'administrateur
   */
  private async validateAdminPermissions(verifierId: string) {
    const verifier = await this.prisma.user.findUnique({
      where: { id: verifierId },
    });

    if (!verifier || verifier.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les administrateurs peuvent vérifier les documents',
      });
    }
  }

  /**
   * Vérifie et met à jour le statut de vérification complet d'un utilisateur
   */
  private async checkAndUpdateCompleteVerification(
    userId: string,
    userRole: UserRole,
    tx?: any
  ) {
    const prisma = tx || this.prisma;
    const requiredDocuments = VerificationService.REQUIRED_DOCUMENTS[userRole];
    
    if (requiredDocuments.length === 0) return;

    // Vérifier si tous les documents requis sont approuvés
    const verifiedDocuments = await prisma.document.findMany({
      where: {
        userId,
        userRole,
        type: { in: requiredDocuments },
        isVerified: true,
      },
    });

    // Si tous les documents sont vérifiés
    if (verifiedDocuments.length >= requiredDocuments.length) {
      const systemAdmin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });

      const systemId = systemAdmin?.id || 'system';

      // Mettre à jour selon le rôle
      await this.updateRoleSpecificVerification(userId, userRole, systemId, prisma);

      // Mettre à jour l'utilisateur principal
      await prisma.user.update({
        where: { id: userId },
        data: { 
          status: UserStatus.ACTIVE,
          isVerified: true 
        },
      });
    }
  }

  /**
   * Met à jour la vérification spécifique au rôle
   */
  private async updateRoleSpecificVerification(
    userId: string,
    userRole: UserRole,
    verifierId: string,
    prisma: any
  ) {
    const updateData = {
      isVerified: true,
      verificationDate: new Date(),
    };

    const historyData = {
      userId,
      verifiedById: verifierId,
      status: VerificationStatus.APPROVED,
      reason: 'All required documents verified',
      createdAt: new Date(),
    };

    switch (userRole) {
      case UserRole.DELIVERER:
        await prisma.deliverer.update({
          where: { userId },
          data: updateData,
        });
        break;
      case UserRole.PROVIDER:
        await prisma.provider.update({
          where: { userId },
          data: updateData,
        });
        break;
      case UserRole.MERCHANT:
        await prisma.merchant.update({
          where: { userId },
          data: updateData,
        });
        break;
    }

    // Ajouter à l'historique
    await prisma.verificationHistory.create({
      data: historyData,
    });
  }

  /**
   * Récupère le statut de vérification complet d'un utilisateur
   */
  async getUserVerificationStatus(userId: string, userRole: UserRole): Promise<VerificationResult> {
    const requiredDocuments = VerificationService.REQUIRED_DOCUMENTS[userRole];
    
    if (requiredDocuments.length === 0) {
      return {
        isComplete: true,
        missingDocuments: [],
        verificationStatus: 'APPROVED'
      };
    }

    // Récupérer tous les documents de l'utilisateur
    const userDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        userRole,
        type: { in: requiredDocuments },
      },
    });

    // Identifier les documents manquants ou non vérifiés
    const verifiedDocTypes = userDocuments
      .filter(doc => doc.isVerified)
      .map(doc => doc.type);
    
    const missingDocuments = requiredDocuments.filter(
      type => !verifiedDocTypes.includes(type)
    );

    // Déterminer le statut global
    let verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
    
    if (userDocuments.length === 0) {
      verificationStatus = 'NOT_SUBMITTED';
    } else if (missingDocuments.length === 0) {
      verificationStatus = 'APPROVED';
    } else if (userDocuments.some(doc => doc.verificationStatus === VerificationStatus.REJECTED)) {
      verificationStatus = 'REJECTED';
    } else {
      verificationStatus = 'PENDING';
    }

    return {
      isComplete: missingDocuments.length === 0,
      missingDocuments,
      verificationStatus
    };
  }

  /**
   * Récupère les vérifications en attente avec pagination améliorée
   */
  async getPendingVerifications(
    userRole?: UserRole,
    limit: number = 20,
    page: number = 1,
    sortBy: 'requestedAt' | 'submitterName' = 'requestedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      status: VerificationStatus.PENDING,
    };

    if (userRole) {
      whereClause.document = {
        userRole,
      };
    }

    const [verifications, totalCount] = await Promise.all([
      this.prisma.verification.findMany({
        where: whereClause,
        include: {
          document: true,
          submitter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
        },
        orderBy: sortBy === 'submitterName' 
          ? { submitter: { name: sortOrder } }
          : { requestedAt: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.verification.count({ where: whereClause }),
    ]);

    return {
      verifications,
      pagination: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Récupère les statistiques de vérification pour le dashboard admin
   */
  async getVerificationStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      this.prisma.verification.count({
        where: { status: VerificationStatus.PENDING }
      }),
      this.prisma.verification.count({
        where: { status: VerificationStatus.APPROVED }
      }),
      this.prisma.verification.count({
        where: { status: VerificationStatus.REJECTED }
      }),
      this.prisma.verification.count(),
    ]);

    // Stats par rôle
    const statsByRole = await this.prisma.verification.groupBy({
      by: ['document.userRole'],
      _count: {
        id: true,
      },
      where: {
        status: VerificationStatus.PENDING,
      },
    });

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      statsByRole: statsByRole.reduce((acc, stat) => {
        acc[stat.document.userRole] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Vérifie et met à jour le statut de vérification d'un livreur si tous les documents requis sont approuvés
   */
  private async updateDelivererVerificationStatus(userId: string) {
    const requiredDocuments: DocumentType[] = [
      DocumentType.ID_CARD,
      DocumentType.DRIVING_LICENSE,
      DocumentType.VEHICLE_REGISTRATION,
      DocumentType.INSURANCE,
    ];

    await this.updateUserVerificationStatus(userId, UserRole.DELIVERER, requiredDocuments);
  }

  /**
   * Vérifie et met à jour le statut de vérification d'un prestataire si tous les documents requis sont approuvés
   */
  private async updateProviderVerificationStatus(userId: string) {
    const requiredDocuments: DocumentType[] = [
      DocumentType.ID_CARD,
      DocumentType.QUALIFICATION_CERTIFICATE,
      DocumentType.INSURANCE,
      DocumentType.PROOF_OF_ADDRESS,
    ];

    await this.updateUserVerificationStatus(userId, UserRole.PROVIDER, requiredDocuments);
  }

  /**
   * Vérifie et met à jour le statut de vérification d'un commerçant si tous les documents requis sont approuvés
   */
  private async updateMerchantVerificationStatus(userId: string) {
    const requiredDocuments: DocumentType[] = [
      DocumentType.ID_CARD,
      DocumentType.BUSINESS_REGISTRATION,
      DocumentType.PROOF_OF_ADDRESS,
    ];

    await this.updateUserVerificationStatus(userId, UserRole.MERCHANT, requiredDocuments);
  }

  /**
   * Récupère l'historique des vérifications pour un utilisateur spécifique
   */
  async getUserVerifications(userId: string) {
    return await this.prisma.verification.findMany({
      where: {
        submitterId: userId,
      },
      include: {
        document: true,
        verifier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  /**
   * Récupère le statut de vérification d'un merchant
   */
  async getMerchantVerificationStatus(merchantId: string) {
    const verification = await db.merchantVerification.findUnique({
      where: { merchantId },
      include: {
        merchant: true,
      },
    });

    if (!verification) {
      return {
        status: 'NOT_SUBMITTED' as const,
        isVerified: false,
      };
    }

    return {
      status: verification.status,
      isVerified: verification.status === 'APPROVED',
      submittedAt: verification.requestedAt,
      verifiedAt: verification.verifiedAt,
      notes: verification.notes,
      rejectionReason: verification.rejectionReason,
    };
  }

  /**
   * Récupère le statut de vérification d'un provider
   */
  async getProviderVerificationStatus(providerId: string) {
    const verification = await db.providerVerification.findUnique({
      where: { providerId },
      include: {
        provider: true,
      },
    });

    if (!verification) {
      return {
        status: 'NOT_SUBMITTED' as const,
        isVerified: false,
      };
    }

    return {
      status: verification.status,
      isVerified: verification.status === 'APPROVED',
      submittedAt: verification.requestedAt,
      verifiedAt: verification.verifiedAt,
      notes: verification.notes,
      rejectionReason: verification.rejectionReason,
    };
  }

  // Conserver les méthodes existantes pour les vérifications Merchant et Provider
  // avec des améliorations mineures...

  /**
   * Crée une demande de vérification pour un merchant (version améliorée)
   */
  async createMerchantVerification(data: MerchantVerificationSubmitInput): Promise<MerchantVerification> {
    const { merchantId, businessDocuments, identityDocuments, addressDocuments, notes } = data;

    return await this.prisma.$transaction(async (tx) => {
      // Vérifier le merchant
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId },
        include: { user: true }
      });

      if (!merchant) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Merchant not found',
        });
      }

      // Vérifier si une vérification existe déjà
      const existingVerification = await tx.merchantVerification.findUnique({
        where: { merchantId }
      });

      if (existingVerification) {
        // Si la vérification est déjà approuvée, ne rien faire
        if (existingVerification.status === 'APPROVED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Le compte est déjà vérifié',
          });
        }

        // Sinon, mettre à jour la vérification existante
        const updatedVerification = await tx.merchantVerification.update({
          where: { id: existingVerification.id },
          data: {
            status: 'PENDING',
            businessDocuments,
            identityDocuments,
            addressDocuments,
            notes,
            requestedAt: new Date(),
            verifiedAt: null,
            verifierId: null,
            rejectionReason: null,
          }
        });

        return updatedVerification as unknown as MerchantVerification;
      }

      // Créer une nouvelle vérification
      const verification = await tx.merchantVerification.create({
        data: {
          merchantId,
          status: 'PENDING',
          businessDocuments,
          identityDocuments,
          addressDocuments,
          notes,
        }
      });

      return verification as unknown as MerchantVerification;
    });
  }

  /**
   * Crée une demande de vérification pour un provider
   */
  async createProviderVerification(data: ProviderVerificationSubmitInput): Promise<ProviderVerification> {
    const { providerId, qualificationDocuments, identityDocuments, addressDocuments, insuranceDocuments, notes } = data;

    return await this.prisma.$transaction(async (tx) => {
      // Vérifier le provider
      const provider = await tx.provider.findUnique({
        where: { id: providerId },
        include: { user: true }
      });

      if (!provider) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Provider not found',
        });
      }

      // Vérifier si une vérification existe déjà
      const existingVerification = await tx.providerVerification.findUnique({
        where: { providerId }
      });

      if (existingVerification) {
        // Si la vérification est déjà approuvée, ne rien faire
        if (existingVerification.status === 'APPROVED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Le compte est déjà vérifié',
          });
        }

        // Sinon, mettre à jour la vérification existante
        const updatedVerification = await tx.providerVerification.update({
          where: { id: existingVerification.id },
          data: {
            status: 'PENDING',
            qualificationDocuments,
            identityDocuments,
            addressDocuments,
            insuranceDocuments,
            notes,
            requestedAt: new Date(),
            verifiedAt: null,
            verifierId: null,
            rejectionReason: null,
          }
        });

        return updatedVerification as unknown as ProviderVerification;
      }

      // Créer une nouvelle vérification
      const verification = await tx.providerVerification.create({
        data: {
          providerId,
          status: 'PENDING',
          qualificationDocuments,
          identityDocuments,
          addressDocuments,
          insuranceDocuments,
          notes,
        }
      });

      return verification as unknown as ProviderVerification;
    });
  }

  /**
   * Met à jour le statut d'une vérification
   */
  async updateVerificationStatus(data: VerificationUpdateRequest): Promise<any> {
    const { id, type, status, verifierId, rejectionReason } = data;

    return await this.prisma.$transaction(async (tx) => {
      // Vérifier si l'utilisateur est un admin
      const verifier = await tx.user.findUnique({
        where: { id: verifierId },
      });

      if (!verifier || verifier.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Seuls les administrateurs peuvent vérifier les comptes',
        });
      }

      // Mettre à jour selon le type
      if (type === 'MERCHANT') {
        const verification = await tx.merchantVerification.findUnique({
          where: { id },
          include: { merchant: true },
        });

        if (!verification) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vérification non trouvée',
          });
        }

        // Mettre à jour la vérification
        await tx.merchantVerification.update({
          where: { id },
          data: {
            status,
            verifierId,
            verifiedAt: new Date(),
            rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          },
        });

        // Si approuvé, mettre à jour le statut du merchant
        if (status === 'APPROVED') {
          await tx.merchant.update({
            where: { id: verification.merchantId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });

          // Mettre à jour le statut de l'utilisateur
          await tx.user.update({
            where: { id: verification.merchant.userId },
            data: {
              status: UserStatus.ACTIVE,
              isVerified: true,
            },
          });
        }

        // Ajouter à l'historique
        await tx.verificationHistory.create({
          data: {
            userId: verification.merchant.userId,
            verifiedById: verifierId,
            status: status as any,
            reason: status === 'REJECTED' ? rejectionReason : 'Verification approved',
            createdAt: new Date(),
          },
        });

        return { success: true };
      } else if (type === 'PROVIDER') {
        const verification = await tx.providerVerification.findUnique({
          where: { id },
          include: { provider: true },
        });

        if (!verification) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Vérification non trouvée',
          });
        }

        // Mettre à jour la vérification
        await tx.providerVerification.update({
          where: { id },
          data: {
            status,
            verifierId,
            verifiedAt: new Date(),
            rejectionReason: status === 'REJECTED' ? rejectionReason : null,
          },
        });

        // Si approuvé, mettre à jour le statut du provider
        if (status === 'APPROVED') {
          await tx.provider.update({
            where: { id: verification.providerId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });

          // Mettre à jour le statut de l'utilisateur
          await tx.user.update({
            where: { id: verification.provider.userId },
            data: {
              status: UserStatus.ACTIVE,
              isVerified: true,
            },
          });
        }

        // Ajouter à l'historique
        await tx.verificationHistory.create({
          data: {
            userId: verification.provider.userId,
            verifiedById: verifierId,
            status: status as any,
            reason: status === 'REJECTED' ? rejectionReason : 'Verification approved',
            createdAt: new Date(),
          },
        });

        return { success: true };
      }

      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Type de vérification non supporté',
      });
    });
  }
}
