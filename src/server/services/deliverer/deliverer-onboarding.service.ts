import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { DocumentType, VerificationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Service d'onboarding complet pour les livreurs EcoDeli
 * Gère l'inscription, la validation des documents et l'activation des comptes
 */
export const delivererOnboardingService = {
  /**
   * Complète l'inscription d'un livreur avec toutes les informations détaillées
   */
  async completeDelivererRegistration(userId: string, data: {
    // Informations personnelles étendues
    phone: string;
    address: string;
    city: string;
    postalCode: string;
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
    
    // Véhicule détaillé
    vehicleType: string;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: number;
    vehicleColor: string;
    licensePlate: string;
    vehicleCapacityKg: number;
    vehicleCapacityM3: number;
    
    // Zone de service
    serviceRadius: number;
    preferredCities: string[];
    blacklistedCities?: string[];
    
    // Préférences métier
    acceptsAnimals: boolean;
    acceptsFragile: boolean;
    acceptsFood: boolean;
    acceptsLargePackages: boolean;
    acceptsNightDelivery?: boolean;
    
    // Horaires de travail
    workingDays: string[];
    workingHoursStart: string;
    workingHoursEnd: string;
    
    // Informations bancaires
    bankName: string;
    iban: string;
    bic: string;
    accountHolder: string;
  }) {
    // Vérifier que l'utilisateur existe et est un livreur
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { deliverer: true }
    });
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }
    
    if (user.role !== 'DELIVERER') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Utilisateur non autorisé comme livreur'
      });
    }
    
    if (user.hasCompletedOnboarding) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Onboarding déjà terminé'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Mettre à jour le profil deliverer existant
      const deliverer = await tx.deliverer.update({
        where: { userId },
        data: {
          phone: data.phone,
          address: data.address,
          vehicleType: data.vehicleType,
          licensePlate: data.licensePlate,
          maxCapacity: data.vehicleCapacityKg,
          bankInfo: {
            bankName: data.bankName,
            iban: data.iban,
            bic: data.bic,
            accountHolder: data.accountHolder,
            emergencyContact: data.emergencyContact,
            vehicleDetails: {
              brand: data.vehicleBrand,
              model: data.vehicleModel,
              year: data.vehicleYear,
              color: data.vehicleColor,
              capacityKg: data.vehicleCapacityKg,
              capacityM3: data.vehicleCapacityM3
            },
            preferences: {
              serviceRadius: data.serviceRadius,
              preferredCities: data.preferredCities,
              blacklistedCities: data.blacklistedCities || [],
              acceptsAnimals: data.acceptsAnimals,
              acceptsFragile: data.acceptsFragile,
              acceptsFood: data.acceptsFood,
              acceptsLargePackages: data.acceptsLargePackages,
              acceptsNightDelivery: data.acceptsNightDelivery || false
            },
            workingHours: {
              days: data.workingDays,
              start: data.workingHoursStart,
              end: data.workingHoursEnd
            }
          }
        }
      });
      
      // Créer ou mettre à jour le portefeuille
      const existingWallet = await tx.wallet.findUnique({
        where: { userId }
      });
      
      if (!existingWallet) {
        await tx.wallet.create({
          data: {
            userId,
            balance: new Decimal(0),
            currency: 'EUR',
            iban: data.iban,
            minimumWithdrawalAmount: new Decimal(10),
            totalEarned: new Decimal(0),
            totalWithdrawn: new Decimal(0),
            earningsThisMonth: new Decimal(0)
          }
        });
      }
      
      // Mettre à jour le statut d'onboarding partiel
      await tx.user.update({
        where: { id: userId },
        data: {
          lastOnboardingStep: 1, // Étape 1: Informations complétées
          notes: `Onboarding étape 1 terminé le ${new Date().toISOString()}`
        }
      });
      
      return { deliverer, step: 1 };
    });
  },

  /**
   * Upload et validation des documents obligatoires
   */
  async uploadRequiredDocument(userId: string, documentType: DocumentType, fileData: {
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }) {
    // Vérifier que le type de document est obligatoire pour les livreurs
    const requiredDocs: DocumentType[] = [
      'ID_CARD',
      'DRIVING_LICENSE', 
      'VEHICLE_REGISTRATION',
      'INSURANCE',
      'PROOF_OF_ADDRESS'
    ];
    
    if (!requiredDocs.includes(documentType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Type de document non requis pour les livreurs'
      });
    }
    
    // Vérifier la taille du fichier (max 10MB)
    if (fileData.fileSize > 10 * 1024 * 1024) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Fichier trop volumineux (max 10MB)'
      });
    }
    
    // Vérifier le type MIME
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(fileData.mimeType)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Type de fichier non autorisé'
      });
    }
    
    return await db.$transaction(async (tx) => {
      // Vérifier si un document de ce type existe déjà
      const existingDoc = await tx.document.findFirst({
        where: {
          userId,
          type: documentType
        }
      });
      
      if (existingDoc) {
        // Supprimer l'ancien document
        await tx.document.delete({
          where: { id: existingDoc.id }
        });
      }
      
      // Créer le nouveau document
      const document = await tx.document.create({
        data: {
          userId,
          type: documentType,
          filename: fileData.fileName,
          fileUrl: fileData.fileUrl,
          mimeType: fileData.mimeType,
          fileSize: fileData.fileSize,
          status: 'PENDING',
          uploadedAt: new Date()
        }
      });
      
      // Vérifier si tous les documents requis sont uploadés
      const completenessCheck = await this.checkDocumentCompleteness(userId);
      
      // Mettre à jour l'étape d'onboarding si tous les documents sont uploadés
      if (completenessCheck.isComplete) {
        await tx.user.update({
          where: { id: userId },
          data: {
            lastOnboardingStep: 2, // Étape 2: Documents uploadés
            notes: `Documents complets le ${new Date().toISOString()}`
          }
        });
      }
      
      return { document, completeness: completenessCheck };
    });
  },

  /**
   * Vérifie si tous les documents requis sont présents
   */
  async checkDocumentCompleteness(userId: string) {
    const requiredDocs: DocumentType[] = [
      'ID_CARD',
      'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION', 
      'INSURANCE',
      'PROOF_OF_ADDRESS'
    ];
    
    const uploadedDocs = await db.document.groupBy({
      by: ['type'],
      where: {
        userId,
        type: { in: requiredDocs }
      }
    });
    
    const uploadedTypes = uploadedDocs.map(doc => doc.type);
    const missingTypes = requiredDocs.filter(type => !uploadedTypes.includes(type));
    const isComplete = missingTypes.length === 0;
    
    if (isComplete) {
      // Marquer l'utilisateur comme ayant terminé l'onboarding
      await db.user.update({
        where: { id: userId },
        data: {
          hasCompletedOnboarding: true,
          onboardingCompletionDate: new Date(),
          lastOnboardingStep: 3 // Étape finale
        }
      });
      
      // Créer automatiquement une demande de vérification
      const existingVerification = await db.verification.findFirst({
        where: { 
          performedById: userId,
          entityType: 'USER'
        }
      });
      
      if (!existingVerification) {
        await db.verification.create({
          data: {
            entityType: 'USER',
            entityId: userId,
            performedById: userId,
            type: 'IDENTITY_VERIFICATION',
            status: VerificationStatus.PENDING,
            requestedAt: new Date(),
            notes: 'Vérification automatique suite à onboarding complet'
          }
        });
      }
    }
    
    return { 
      isComplete, 
      uploadedDocs: uploadedTypes.length, 
      requiredDocs: requiredDocs.length,
      missingTypes,
      progress: Math.round((uploadedTypes.length / requiredDocs.length) * 100)
    };
  },

  /**
   * Obtient le statut de validation complet d'un livreur
   */
  async getValidationStatus(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        hasCompletedOnboarding: true, 
        isVerified: true,
        status: true,
        lastOnboardingStep: true,
        onboardingCompletionDate: true
      }
    });
    
    const documents = await db.document.findMany({
      where: { userId },
      select: { 
        type: true, 
        status: true, 
        updatedAt: true,
        filename: true
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    const verification = await db.verification.findFirst({
      where: { 
        entityType: 'USER',
        entityId: userId
      },
      orderBy: { requestedAt: 'desc' }
    });
    
    const completeness = await this.checkDocumentCompleteness(userId);
    
    // Calculer le score de progression global
    let progressScore = 0;
    if (user?.lastOnboardingStep >= 1) progressScore += 30; // Infos complétées
    if (completeness.isComplete) progressScore += 40;       // Documents uploadés
    if (user?.isVerified) progressScore += 30;              // Vérifié
    
    return {
      user,
      documents,
      verification,
      completeness,
      canStartWorking: user?.isVerified && user?.hasCompletedOnboarding,
      progressScore,
      nextStep: this.getNextOnboardingStep(user, completeness, verification)
    };
  },

  /**
   * Détermine la prochaine étape de l'onboarding
   */
  getNextOnboardingStep(user: any, completeness: any, verification: any) {
    if (!user?.hasCompletedOnboarding) {
      if (user?.lastOnboardingStep < 1) {
        return {
          step: 'complete_profile',
          title: 'Compléter le profil',
          description: 'Remplissez vos informations personnelles et véhicule'
        };
      }
      if (!completeness.isComplete) {
        return {
          step: 'upload_documents',
          title: 'Uploader les documents',
          description: `Il reste ${completeness.missingTypes.length} document(s) à uploader`,
          missingDocuments: completeness.missingTypes
        };
      }
    }
    
    if (!verification) {
      return {
        step: 'waiting_verification_creation',
        title: 'Initialisation de la vérification',
        description: 'Création de votre dossier de vérification...'
      };
    }
    
    if (verification.status === 'PENDING') {
      return {
        step: 'waiting_verification',
        title: 'Vérification en cours',
        description: 'Nos équipes vérifient vos documents (délai: 24-48h)'
      };
    }
    
    if (verification.status === 'REJECTED') {
      return {
        step: 'verification_rejected',
        title: 'Vérification rejetée',
        description: verification.notes || 'Veuillez corriger les documents rejetés'
      };
    }
    
    if (user?.isVerified) {
      return {
        step: 'complete',
        title: 'Compte activé',
        description: 'Félicitations ! Vous pouvez commencer à livrer'
      };
    }
    
    return {
      step: 'unknown',
      title: 'Statut en cours d\'analyse',
      description: 'Contactez le support si cette situation persiste'
    };
  },

  /**
   * Force la mise à jour du statut de vérification (admin seulement)
   */
  async updateVerificationStatus(userId: string, status: VerificationStatus, adminId: string, notes?: string) {
    return await db.$transaction(async (tx) => {
      // Mettre à jour la vérification
      const verification = await tx.verification.updateMany({
        where: { 
          entityType: 'USER',
          entityId: userId
        },
        data: {
          status,
          reviewedAt: new Date(),
          performedById: adminId,
          notes
        }
      });
      
      // Si approuvé, activer le compte
      if (status === VerificationStatus.APPROVED) {
        await tx.user.update({
          where: { id: userId },
          data: {
            isVerified: true,
            status: 'ACTIVE'
          }
        });
        
        // Marquer tous les documents comme approuvés
        await tx.document.updateMany({
          where: { userId },
          data: { status: 'APPROVED' }
        });
      }
      
      return verification;
    });
  }
};