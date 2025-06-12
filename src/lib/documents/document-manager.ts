import { DocumentType, UserRole } from '@prisma/client';

/**
 * Mapping des types de documents vers leur nom en français
 */
export const documentTypeNames: Record<DocumentType, string> = {
  ID_CARD: "Carte d'identité",
  DRIVING_LICENSE: 'Permis de conduire',
  VEHICLE_REGISTRATION: 'Carte grise',
  INSURANCE: 'Assurance',
  QUALIFICATION_CERTIFICATE: 'Certification professionnelle',
  PROOF_OF_ADDRESS: 'Justificatif de domicile',
  BUSINESS_REGISTRATION: 'Extrait K-bis',
  SELFIE: 'Photo de profil',
  OTHER: 'Autre document',
};

/**
 * Récupère le nom affichable d'un type de document
 * @param type Le type de document (DocumentType de Prisma)
 * @param t Fonction optionnelle de traduction
 * @returns Le nom du type de document formaté pour l'affichage
 */
export function getDocumentTypeName(type: DocumentType, t?: (key: string) => string): string {
  // Si une fonction de traduction est fournie, essayer de l'utiliser d'abord
  if (t) {
    try {
      const translated = t(`documents.types.${type.toLowerCase()}`);
      // Si la traduction n'est pas une clé (ne contient pas de points), on l'utilise
      if (!translated.includes('.')) {
        return translated;
      }
    } catch (error) {
      // En cas d'erreur avec la traduction, on continue avec le fallback
    }
  }

  // Fallback sur les noms français hardcodés
  return documentTypeNames[type] || String(type);
}

/**
 * Retourne les types de documents requis en fonction du rôle de l'utilisateur
 * @param role Rôle de l'utilisateur (UserRole de Prisma ou string)
 * @returns Tableau des types de documents requis pour ce rôle
 */
export function getRequiredDocumentTypesByRole(role: UserRole | string): DocumentType[] {
  // Normaliser le rôle pour accepter à la fois les strings et l'enum UserRole
  const normalizedRole = typeof role === 'string' ? role.toUpperCase() : role;

  switch (normalizedRole) {
    case UserRole.DELIVERER:
    case 'DELIVERER':
      return [
        DocumentType.ID_CARD,
        DocumentType.DRIVING_LICENSE,
        DocumentType.VEHICLE_REGISTRATION,
        DocumentType.INSURANCE,
      ];
    case UserRole.MERCHANT:
    case 'MERCHANT':
      return [
        DocumentType.ID_CARD,
        DocumentType.BUSINESS_REGISTRATION,
        DocumentType.PROOF_OF_ADDRESS,
      ];
    case UserRole.PROVIDER:
    case 'PROVIDER':
      return [
        DocumentType.ID_CARD,
        DocumentType.QUALIFICATION_CERTIFICATE,
        DocumentType.INSURANCE,
        DocumentType.PROOF_OF_ADDRESS,
      ];
    default:
      return [DocumentType.ID_CARD];
  }
}
/**
 * Utilitaires centralisés pour la validation cohérente des documents
 * Ce fichier résout les incohérences entre les différents services
 */
import { db } from '@/server/db';
import { UserRole } from '@prisma/client';
import { seedTypeToPrismaType, doesSeedTypeMatchPrismaType } from '@/types/documents/document';

/**
 * Vérifie si un document est expiré
 */
export function isDocumentExpired(document: any): boolean {
  if (!document.expiryDate) return false;
  return new Date(document.expiryDate) < new Date();
}

/**
 * Détermine le statut effectif d'un document
 * Cette fonction DOIT être utilisée partout pour garantir la cohérence
 */
export function getEffectiveDocumentStatus(document: any): string {
  // Si le document est expiré, retourner EXPIRED indépendamment du statut de vérification
  if (isDocumentExpired(document)) {
    return 'EXPIRED';
  }

  // Si le document n'est pas vérifié, retourner le statut de vérification
  if (!document.isVerified) {
    return document.verificationStatus || 'PENDING';
  }

  // Si vérifié et non expiré, retourner APPROVED
  return 'APPROVED';
}

/**
 * Vérifie si un document est effectivement approuvé (non expiré)
 * Cette fonction remplace toutes les vérifications doc.status === 'APPROVED'
 */
export function isDocumentEffectivelyApproved(document: any): boolean {
  return getEffectiveDocumentStatus(document) === 'APPROVED';
}

/**
 * Documents requis par rôle (centralisé)
 * IMPORTANT: Ces types correspondent aux types créés dans les seeds
 */
export const REQUIRED_DOCUMENTS_BY_ROLE: Record<UserRole, readonly string[]> = {
  DELIVERER: ['IDENTITY_CARD', 'DRIVING_LICENSE', 'VEHICLE_REGISTRATION', 'INSURANCE_CERTIFICATE'],
  PROVIDER: [
    'IDENTITY_CARD',
    'PROFESSIONAL_DIPLOMA',
    'INSURANCE_CERTIFICATE',
    'BANK_RIB',
    'CRIMINAL_RECORD',
  ],
  MERCHANT: ['IDENTITY_CARD', 'KBIS', 'BANK_RIB'], // Types correspondant aux seeds
  CLIENT: ['IDENTITY_CARD'],
  ADMIN: [], // Les admins n'ont pas de documents requis
} as const;

/**
 * Vérifie si un document correspond à un type requis (gère la compatibilité seeds/Prisma)
 */
function doesDocumentMatchRequiredType(documentType: string, requiredType: string): boolean {
  // Correspondance directe
  if (documentType === requiredType) {
    return true;
  }

  // Vérifier la correspondance via le mapping seeds/Prisma
  return doesSeedTypeMatchPrismaType(requiredType, documentType as any);
}

/**
 * Vérifie si tous les documents requis sont effectivement approuvés pour un utilisateur
 * Cette fonction centralise la logique de validation des documents
 */
export async function areAllRequiredDocumentsApproved(
  userId: string,
  userRole: UserRole
): Promise<boolean> {
  const requiredDocumentTypes = REQUIRED_DOCUMENTS_BY_ROLE[userRole] || [];

  if (requiredDocumentTypes.length === 0) {
    return true; // Aucun document requis
  }

  // Récupérer TOUS les documents de l'utilisateur (pas seulement ceux qui matchent exactement)
  const userDocuments = await db.document.findMany({
    where: {
      userId,
      userRole,
    },
  });

  // Vérifier que chaque type de document requis a au moins un document effectivement approuvé
  return requiredDocumentTypes.every((requiredType: any) =>
    userDocuments.some(
      doc =>
        doesDocumentMatchRequiredType(doc.type, requiredType) && isDocumentEffectivelyApproved(doc)
    )
  );
}

/**
 * Obtient le statut de vérification des documents pour un utilisateur
 * Utilise la même logique que le frontend
 */
export async function getUserDocumentVerificationStatus(
  userId: string,
  userRole: UserRole
): Promise<{
  isComplete: boolean;
  hasExpiredDocuments: boolean;
  hasRejectedDocuments: boolean;
  hasPendingDocuments: boolean;
  missingDocuments: string[];
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED';
}> {
  const requiredDocumentTypes = REQUIRED_DOCUMENTS_BY_ROLE[userRole] || [];

  if (requiredDocumentTypes.length === 0) {
    return {
      isComplete: true,
      hasExpiredDocuments: false,
      hasRejectedDocuments: false,
      hasPendingDocuments: false,
      missingDocuments: [],
      verificationStatus: 'APPROVED',
    };
  }

  // Récupérer TOUS les documents de l'utilisateur
  const userDocuments = await db.document.findMany({
    where: {
      userId,
      userRole,
    },
  });

  // Analyser le statut de chaque document
  const documentStatuses = userDocuments.map(doc => getEffectiveDocumentStatus(doc));

  // Identifier les documents approuvés avec correspondance flexible
  const approvedRequiredTypes = requiredDocumentTypes.filter((requiredType: any) =>
    userDocuments.some(
      doc =>
        doesDocumentMatchRequiredType(doc.type, requiredType) &&
        getEffectiveDocumentStatus(doc) === 'APPROVED'
    )
  );

  const missingDocuments = requiredDocumentTypes.filter(
    (type: any) => !approvedRequiredTypes.includes(type)
  );

  // Analyser les statuts
  const hasExpiredDocuments = documentStatuses.includes('EXPIRED');
  const hasRejectedDocuments = documentStatuses.includes('REJECTED');
  const hasPendingDocuments = documentStatuses.includes('PENDING');
  const isComplete = missingDocuments.length === 0;

  // Déterminer le statut global
  let verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'NOT_SUBMITTED' =
    'NOT_SUBMITTED';

  if (userDocuments.length === 0) {
    verificationStatus = 'NOT_SUBMITTED';
  } else if (isComplete) {
    verificationStatus = 'APPROVED';
  } else if (hasExpiredDocuments) {
    verificationStatus = 'EXPIRED';
  } else if (hasRejectedDocuments) {
    verificationStatus = 'REJECTED';
  } else if (hasPendingDocuments) {
    verificationStatus = 'PENDING';
  } else {
    verificationStatus = 'PENDING';
  }

  return {
    isComplete,
    hasExpiredDocuments,
    hasRejectedDocuments,
    hasPendingDocuments,
    missingDocuments,
    verificationStatus,
  };
}

/**
 * Met à jour le statut de vérification d'un utilisateur de manière cohérente
 * Cette fonction doit être appelée après chaque modification de document
 */
export async function updateUserVerificationStatusConsistently(
  userId: string,
  userRole: UserRole
): Promise<boolean> {
  try {
    const isAllApproved = await areAllRequiredDocumentsApproved(userId, userRole);

    if (isAllApproved) {
      // Mettre à jour le statut utilisateur
      await db.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE',
          isVerified: true,
        },
      });

      // Mettre à jour le profil spécifique selon le rôle
      if (userRole === 'DELIVERER') {
        await db.deliverer.update({
          where: { userId },
          data: {
            isVerified: true,
            verificationDate: new Date(),
          },
        });
      } else if (userRole === 'PROVIDER') {
        await db.provider.update({
          where: { userId },
          data: {
            isVerified: true,
            verificationDate: new Date(),
          },
        });
      } else if (userRole === 'MERCHANT') {
        await db.merchant.update({
          where: { userId },
          data: {
            isVerified: true,
            verificationDate: new Date(),
          },
        });
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de vérification:', error);
    return false;
  }
}
import { DocumentType } from '@prisma/client';
import { VerificationDocumentType } from '@/types/documents/verification';

/**
 * Mapping entre les types de documents de vérification et les types de documents Prisma
 */
export const documentTypeMapping: Record<VerificationDocumentType, DocumentType> = {
  [VerificationDocumentType.ID_CARD]: DocumentType.ID_CARD,
  [VerificationDocumentType.PASSPORT]: DocumentType.OTHER,
  [VerificationDocumentType.DRIVERS_LICENSE]: DocumentType.DRIVING_LICENSE,
  [VerificationDocumentType.PROOF_OF_ADDRESS]: DocumentType.PROOF_OF_ADDRESS,
  [VerificationDocumentType.BUSINESS_LICENSE]: DocumentType.OTHER,
  [VerificationDocumentType.TAX_CERTIFICATE]: DocumentType.OTHER,
  [VerificationDocumentType.BUSINESS_REGISTRATION]: DocumentType.BUSINESS_REGISTRATION,
  [VerificationDocumentType.VAT_REGISTRATION]: DocumentType.OTHER,
  [VerificationDocumentType.INSURANCE_CERTIFICATE]: DocumentType.INSURANCE,
  [VerificationDocumentType.PROFESSIONAL_QUALIFICATION]: DocumentType.QUALIFICATION_CERTIFICATE,
};

/**
 * Mapping entre les types de documents Prisma et les types de vérification
 */
export const reverseDocumentTypeMapping: Record<DocumentType, VerificationDocumentType> = {
  [DocumentType.ID_CARD]: VerificationDocumentType.ID_CARD,
  [DocumentType.DRIVING_LICENSE]: VerificationDocumentType.DRIVERS_LICENSE,
  [DocumentType.VEHICLE_REGISTRATION]: VerificationDocumentType.DRIVERS_LICENSE,
  [DocumentType.INSURANCE]: VerificationDocumentType.INSURANCE_CERTIFICATE,
  [DocumentType.QUALIFICATION_CERTIFICATE]: VerificationDocumentType.PROFESSIONAL_QUALIFICATION,
  [DocumentType.PROOF_OF_ADDRESS]: VerificationDocumentType.PROOF_OF_ADDRESS,
  [DocumentType.BUSINESS_REGISTRATION]: VerificationDocumentType.BUSINESS_REGISTRATION,
  [DocumentType.SELFIE]: VerificationDocumentType.ID_CARD,
  [DocumentType.OTHER]: VerificationDocumentType.ID_CARD,
};

/**
 * Convertit un VerificationDocumentType en DocumentType Prisma
 */
export function toDbDocumentType(type: VerificationDocumentType): DocumentType {
  return documentTypeMapping[type] || DocumentType.OTHER;
}

/**
 * Convertit un DocumentType Prisma en VerificationDocumentType
 */
export function toVerificationDocumentType(type: DocumentType): VerificationDocumentType {
  return reverseDocumentTypeMapping[type] || VerificationDocumentType.ID_CARD;
}
