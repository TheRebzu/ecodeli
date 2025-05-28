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

/**
 * Service pour la gestion des vérifications de documents et d'utilisateurs
 */
export class VerificationService {
  private prisma: PrismaClient;

  constructor(prisma = db) {
    this.prisma = prisma;
  }

  /**
   * Télécharge un document pour vérification
   */
  async uploadDocument(userId: string, type: DocumentType, file: File, userRole: UserRole) {
    // Vérifier si l'utilisateur existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    // Vérifier si le rôle de l'utilisateur correspond
    if (user.role !== userRole) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "Type d'utilisateur incorrect",
      });
    }

    // Upload the file to storage (implementation depends on your storage solution)
    const uploadResult = await this.uploadFileToStorage(file);

    // Créer le document en base de données
    // @ts-ignore - Le champ userRole existe dans le modèle Document mais pas encore dans les types générés
    const document = await this.prisma.document.create({
      data: {
        userId,
        type,
        userRole, // Champ ajouté dans la migration 20250519104500_add_userRole_to_document
        filename: uploadResult.filename,
        fileUrl: uploadResult.fileUrl,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      },
    });

    // Créer une demande de vérification
    await this.prisma.verification.create({
      data: {
        submitterId: userId,
        documentId: document.id,
      },
    });

    return document;
  }

  /**
   * Fonction factice pour simuler l'upload vers un stockage externe
   * A implémenter avec votre solution de stockage (S3, etc.)
   */
  private async uploadFileToStorage(file: File): Promise<UploadResult> {
    // This is a placeholder - implement with your actual storage solution
    return {
      fileUrl: `https://storage.example.com/${Date.now()}_${file.name}`,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    };
  }

  /**
   * Examine un document et met à jour son statut de vérification
   */
  async reviewDocument(
    documentId: string,
    verifierId: string,
    status: VerificationStatus,
    notes?: string
  ) {
    // Vérifier si le vérifieur est un administrateur
    const verifier = await this.prisma.user.findUnique({
      where: { id: verifierId },
    });

    if (!verifier || verifier.role !== UserRole.ADMIN) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Seuls les administrateurs peuvent vérifier les documents',
      });
    }

    // Trouver la demande de vérification associée
    const verification = await this.prisma.verification.findFirst({
      where: { documentId },
    });

    if (!verification) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Demande de vérification non trouvée',
      });
    }

    // Mettre à jour la vérification
    const updatedVerification = await this.prisma.verification.update({
      where: { id: verification.id },
      data: {
        verifierId,
        status,
        notes,
        verifiedAt: new Date(),
      },
    });

    // Mettre à jour le document
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        isVerified: status === VerificationStatus.APPROVED,
        reviewerId: verifierId,
        verificationStatus: status,
        rejectionReason: status === VerificationStatus.REJECTED ? notes : null,
      },
    });

    // Récupérer les informations sur le document et l'utilisateur
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { user: true },
    });

    if (document && status === VerificationStatus.APPROVED) {
      // Si tous les documents requis sont approuvés, mettre à jour le statut de vérification de l'utilisateur
      if (document.user.role === UserRole.DELIVERER) {
        await this.updateDelivererVerificationStatus(document.userId);
      } else if (document.user.role === UserRole.PROVIDER) {
        await this.updateProviderVerificationStatus(document.userId);
      } else if (document.user.role === UserRole.MERCHANT) {
        await this.updateMerchantVerificationStatus(document.userId);
      }
    }

    return updatedVerification;
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
    ];

    await this.updateUserVerificationStatus(userId, UserRole.PROVIDER, requiredDocuments);
  }

  /**
   * Vérifie et met à jour le statut de vérification d'un commerçant si tous les documents requis sont approuvés
   */
  private async updateMerchantVerificationStatus(userId: string) {
    const requiredDocuments: DocumentType[] = [
      DocumentType.ID_CARD,
      DocumentType.OTHER, // Document d'entreprise
    ];

    await this.updateUserVerificationStatus(userId, UserRole.MERCHANT, requiredDocuments);
  }

  /**
   * Méthode commune pour mettre à jour le statut de vérification d'un utilisateur
   */
  private async updateUserVerificationStatus(
    userId: string,
    userRole: UserRole,
    requiredDocuments: DocumentType[]
  ) {
    // Vérifier si tous les documents requis sont vérifiés
    // @ts-ignore - Le champ userRole existe dans le modèle Document mais pas encore dans les types générés
    const verifiedDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        userRole, // Champ ajouté dans la migration 20250519104500_add_userRole_to_document
        type: { in: requiredDocuments },
        isVerified: true,
      },
    });

    // Si tous les documents requis sont vérifiés
    if (verifiedDocuments.length >= requiredDocuments.length) {
      // Récupérer le premier administrateur pour l'enregistrer comme vérificateur
      const systemAdmin = await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });

      // Si aucun admin n'est trouvé, utiliser l'ID système
      const systemId = systemAdmin?.id || 'system';

      // Mettre à jour le statut de vérification selon le rôle
      switch (userRole) {
        case UserRole.DELIVERER:
          await this.prisma.deliverer.update({
            where: { userId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });

          // Ajouter une entrée dans l'historique de vérification
          await this.prisma.verificationHistory.create({
            data: {
              userId,
              verifiedById: systemId,
              status: VerificationStatus.APPROVED,
              reason: 'All required documents verified',
              createdAt: new Date(),
            },
          });

          break;
        case UserRole.PROVIDER:
          await this.prisma.provider.update({
            where: { userId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });

          // Ajouter une entrée dans l'historique de vérification
          await this.prisma.verificationHistory.create({
            data: {
              userId,
              verifiedById: systemId,
              status: VerificationStatus.APPROVED,
              reason: 'All required documents verified',
              createdAt: new Date(),
            },
          });

          break;
        case UserRole.MERCHANT:
          await this.prisma.merchant.update({
            where: { userId },
            data: {
              isVerified: true,
              verificationDate: new Date(),
            },
          });

          // Ajouter une entrée dans l'historique de vérification
          await this.prisma.verificationHistory.create({
            data: {
              userId,
              verifiedById: systemId,
              status: VerificationStatus.APPROVED,
              reason: 'All required documents verified',
              createdAt: new Date(),
            },
          });

          break;
      }

      // Mettre à jour le statut de l'utilisateur
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });
    }
  }

  /**
   * Récupère toutes les demandes de vérification en attente pour un type d'utilisateur spécifique
   */
  async getPendingVerifications(userRole: UserRole) {
    // @ts-ignore - Le champ userRole existe dans le modèle Document mais pas encore dans les types générés
    return await this.prisma.verification.findMany({
      where: {
        status: VerificationStatus.PENDING,
        document: {
          userRole, // Champ ajouté dans la migration 20250519104500_add_userRole_to_document
        },
      },
      include: {
        document: true,
        submitter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            deliverer: userRole === UserRole.DELIVERER ? true : undefined,
            provider: userRole === UserRole.PROVIDER ? true : undefined,
            merchant: userRole === UserRole.MERCHANT ? true : undefined,
          },
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
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
   * Vérifie et met à jour le statut de vérification pour un livreur automatiquement
   * Utilisé lors de la navigation pour détecter si tous les documents sont vérifiés
   */
  async checkAndUpdateVerificationStatus(userId: string, userRole: UserRole): Promise<boolean> {
    // Vérifier si l'utilisateur est déjà vérifié
    const alreadyVerified = await this.getUserVerificationStatus(userId, userRole);

    // Si déjà vérifié, on retourne simplement true sans rien faire
    if (alreadyVerified) {
      return true;
    }

    // Obtenir la liste des documents requis en fonction du rôle
    let requiredDocuments: DocumentType[];

    if (userRole === UserRole.DELIVERER) {
      requiredDocuments = [
        DocumentType.ID_CARD,
        DocumentType.DRIVING_LICENSE,
        DocumentType.VEHICLE_REGISTRATION,
        DocumentType.INSURANCE,
      ];
    } else if (userRole === UserRole.PROVIDER) {
      requiredDocuments = [
        DocumentType.ID_CARD,
        DocumentType.QUALIFICATION_CERTIFICATE,
        DocumentType.INSURANCE,
      ];
    } else if (userRole === UserRole.MERCHANT) {
      requiredDocuments = [DocumentType.ID_CARD, DocumentType.OTHER];
    } else {
      return false; // Rôle non supporté
    }

    // Vérifier si tous les documents requis sont téléchargés et vérifiés
    // @ts-ignore - Le champ userRole existe dans le modèle Document mais pas encore dans les types générés
    const verifiedDocuments = await this.prisma.document.findMany({
      where: {
        userId,
        userRole, // Champ ajouté dans la migration 20250519104500_add_userRole_to_document
        type: { in: requiredDocuments },
        isVerified: true,
      },
    });

    // Si tous les documents requis sont vérifiés, mais que le statut n'est pas encore mis à jour
    if (verifiedDocuments.length >= requiredDocuments.length) {
      // Mettre à jour le statut de vérification
      await this.updateUserVerificationStatus(userId, userRole, requiredDocuments);
      return true;
    }

    return false;
  }

  /**
   * Récupère le statut de vérification actuel d'un utilisateur
   */
  private async getUserVerificationStatus(userId: string, userRole: UserRole): Promise<boolean> {
    switch (userRole) {
      case UserRole.DELIVERER:
        const deliverer = await this.prisma.deliverer.findUnique({
          where: { userId },
          select: { isVerified: true },
        });
        return deliverer?.isVerified || false;

      case UserRole.PROVIDER:
        const provider = await this.prisma.provider.findUnique({
          where: { userId },
          select: { isVerified: true },
        });
        return provider?.isVerified || false;

      case UserRole.MERCHANT:
        const merchant = await this.prisma.merchant.findUnique({
          where: { userId },
          select: { isVerified: true },
        });
        return merchant?.isVerified || false;

      default:
        return false;
    }
  }

  /**
   * Crée une demande de vérification pour un merchant
   */
  async createMerchantVerification(data: MerchantVerificationSubmitInput): Promise<MerchantVerification> {
    const { merchantId, businessDocuments, identityDocuments, addressDocuments, notes } = data;

    // Vérifier si le merchant existe
    const merchant = await db.merchant.findUnique({
      where: { id: merchantId },
      include: { user: true }
    });

    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // Vérifier si une vérification existe déjà
    const existingVerification = await db.merchantVerification.findUnique({
      where: { merchantId }
    });

    if (existingVerification) {
      // Si la vérification est déjà approuvée, ne rien faire
      if (existingVerification.status === 'APPROVED') {
        throw new Error('Le compte est déjà vérifié');
      }

      // Sinon, mettre à jour la vérification existante
      const updatedVerification = await db.merchantVerification.update({
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
    const verification = await db.merchantVerification.create({
      data: {
        merchantId,
        status: 'PENDING',
        businessDocuments,
        identityDocuments,
        addressDocuments,
        notes,
        businessRegistered: false,
        taxCompliant: false,
      }
    });

    return verification as unknown as MerchantVerification;
  }

  /**
   * Crée une demande de vérification pour un provider
   */
  async createProviderVerification(data: ProviderVerificationSubmitInput): Promise<ProviderVerification> {
    const { providerId, identityDocuments, qualificationDocs, insuranceDocs, addressDocuments, notes } = data;

    // Vérifier si le provider existe
    const provider = await db.provider.findUnique({
      where: { id: providerId },
      include: { user: true }
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Vérifier si une vérification existe déjà
    const existingVerification = await db.providerVerification.findUnique({
      where: { providerId }
    });

    if (existingVerification) {
      // Si la vérification est déjà approuvée, ne rien faire
      if (existingVerification.status === 'APPROVED') {
        throw new Error('Le compte est déjà vérifié');
      }

      // Sinon, mettre à jour la vérification existante
      const updatedVerification = await db.providerVerification.update({
        where: { id: existingVerification.id },
        data: {
          status: 'PENDING',
          identityDocuments,
          qualificationDocs,
          insuranceDocs,
          addressDocuments,
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
    const verification = await db.providerVerification.create({
      data: {
        providerId,
        status: 'PENDING',
        identityDocuments,
        qualificationDocs,
        insuranceDocs,
        addressDocuments,
        notes,
        qualificationsVerified: false,
        insuranceValid: false,
      }
    });

    return verification as unknown as ProviderVerification;
  }

  /**
   * Traite une demande de vérification (approve/reject) pour un merchant
   */
  async processMerchantVerification(verificationId: string, adminId: string, status: VerificationStatus, notes?: string, rejectionReason?: string): Promise<MerchantVerification> {
    // Vérifier si l'admin existe
    const admin = await db.user.findUnique({
      where: { id: adminId },
      include: { admin: true }
    });

    if (!admin || !admin.admin) {
      throw new Error('Unauthorized: only admins can process verifications');
    }

    // Récupérer la vérification
    const verification = await db.merchantVerification.findUnique({
      where: { id: verificationId },
      include: { merchant: true }
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    // Mettre à jour le statut de la vérification
    const updatedVerification = await db.merchantVerification.update({
      where: { id: verificationId },
      data: {
        status,
        verifiedAt: new Date(),
        verifierId: adminId,
        notes,
        rejectionReason,
      }
    });

    // Si approuvé, mettre à jour le statut du merchant
    if (status === 'APPROVED') {
      await db.merchant.update({
        where: { id: verification.merchantId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        }
      });
    }

    // Créer un log d'audit
    await db.auditLog.create({
      data: {
        action: `VERIFICATION_${status}`,
        entityType: 'MERCHANT_VERIFICATION',
        entityId: verificationId,
        userId: adminId,
        details: {
          merchantId: verification.merchantId,
          status,
          notes,
          rejectionReason,
        },
      }
    });

    return updatedVerification as unknown as MerchantVerification;
  }

  /**
   * Traite une demande de vérification (approve/reject) pour un provider
   */
  async processProviderVerification(verificationId: string, adminId: string, status: VerificationStatus, notes?: string, rejectionReason?: string): Promise<ProviderVerification> {
    // Vérifier si l'admin existe
    const admin = await db.user.findUnique({
      where: { id: adminId },
      include: { admin: true }
    });

    if (!admin || !admin.admin) {
      throw new Error('Unauthorized: only admins can process verifications');
    }

    // Récupérer la vérification
    const verification = await db.providerVerification.findUnique({
      where: { id: verificationId },
      include: { provider: true }
    });

    if (!verification) {
      throw new Error('Verification not found');
    }

    // Mettre à jour le statut de la vérification
    const updatedVerification = await db.providerVerification.update({
      where: { id: verificationId },
      data: {
        status,
        verifiedAt: new Date(),
        verifierId: adminId,
        notes,
        rejectionReason,
      }
    });

    // Si approuvé, mettre à jour le statut du provider
    if (status === 'APPROVED') {
      await db.provider.update({
        where: { id: verification.providerId },
        data: {
          isVerified: true,
          verificationDate: new Date(),
        }
      });
    }

    // Créer un log d'audit
    await db.auditLog.create({
      data: {
        action: `VERIFICATION_${status}`,
        entityType: 'PROVIDER_VERIFICATION',
        entityId: verificationId,
        userId: adminId,
        details: {
          providerId: verification.providerId,
          status,
          notes,
          rejectionReason,
        },
      }
    });

    return updatedVerification as unknown as ProviderVerification;
  }

  /**
   * Récupère toutes les vérifications en cours pour les admins
   */
  async getPendingVerifications(
    role?: 'MERCHANT' | 'PROVIDER',
    limit: number = 20,
    page: number = 1
  ) {
    const skip = (page - 1) * limit;
    
    // Par défaut, récupérer les deux types de vérifications
    const [merchantVerifications, providerVerifications] = await Promise.all([
      !role || role === 'MERCHANT' 
        ? db.merchantVerification.findMany({
            where: { status: 'PENDING' },
            include: { merchant: { include: { user: true } } },
            skip,
            take: role ? limit : Math.floor(limit / 2),
          })
        : [],
      !role || role === 'PROVIDER'
        ? db.providerVerification.findMany({
            where: { status: 'PENDING' },
            include: { provider: { include: { user: true } } },
            skip,
            take: role ? limit : Math.floor(limit / 2),
          })
        : [],
    ]);

    // Compter le nombre total pour la pagination
    const [merchantCount, providerCount] = await Promise.all([
      !role || role === 'MERCHANT' 
        ? db.merchantVerification.count({ where: { status: 'PENDING' } })
        : 0,
      !role || role === 'PROVIDER'
        ? db.providerVerification.count({ where: { status: 'PENDING' } })
        : 0,
    ]);

    return {
      merchantVerifications,
      providerVerifications,
      pagination: {
        totalItems: merchantCount + providerCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil((merchantCount + providerCount) / limit),
      },
    };
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
}
