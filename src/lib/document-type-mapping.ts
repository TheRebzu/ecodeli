import { DocumentType } from '@prisma/client';
import { VerificationDocumentType } from '@/types/verification';

/**
 * Mapping entre les types de documents de vérification et les types de documents Prisma
 */
export const documentTypeMapping: Record<VerificationDocumentType, DocumentType> = {
  [VerificationDocumentType.ID_CARD]: DocumentType.ID_CARD,
  [VerificationDocumentType.PASSPORT]: DocumentType.PASSPORT,
  [VerificationDocumentType.DRIVERS_LICENSE]: DocumentType.DRIVERS_LICENSE,
  [VerificationDocumentType.PROOF_OF_ADDRESS]: DocumentType.PROOF_OF_ADDRESS,
  [VerificationDocumentType.BUSINESS_LICENSE]: DocumentType.BUSINESS_LICENSE,
  [VerificationDocumentType.TAX_CERTIFICATE]: DocumentType.TAX_CERTIFICATE,
  [VerificationDocumentType.BUSINESS_REGISTRATION]: DocumentType.BUSINESS_REGISTRATION,
  [VerificationDocumentType.VAT_REGISTRATION]: DocumentType.VAT_REGISTRATION,
  [VerificationDocumentType.INSURANCE_CERTIFICATE]: DocumentType.INSURANCE_CERTIFICATE,
  [VerificationDocumentType.PROFESSIONAL_QUALIFICATION]: DocumentType.PROFESSIONAL_QUALIFICATION,
};

/**
 * Mapping entre les types de documents Prisma et les types de vérification
 */
export const reverseDocumentTypeMapping: Record<DocumentType, VerificationDocumentType> = {
  [DocumentType.ID_CARD]: VerificationDocumentType.ID_CARD,
  [DocumentType.PASSPORT]: VerificationDocumentType.PASSPORT,
  [DocumentType.DRIVERS_LICENSE]: VerificationDocumentType.DRIVERS_LICENSE,
  [DocumentType.PROOF_OF_ADDRESS]: VerificationDocumentType.PROOF_OF_ADDRESS,
  [DocumentType.BUSINESS_LICENSE]: VerificationDocumentType.BUSINESS_LICENSE,
  [DocumentType.TAX_CERTIFICATE]: VerificationDocumentType.TAX_CERTIFICATE, 
  [DocumentType.BUSINESS_REGISTRATION]: VerificationDocumentType.BUSINESS_REGISTRATION,
  [DocumentType.VAT_REGISTRATION]: VerificationDocumentType.VAT_REGISTRATION,
  [DocumentType.INSURANCE_CERTIFICATE]: VerificationDocumentType.INSURANCE_CERTIFICATE,
  [DocumentType.PROFESSIONAL_QUALIFICATION]: VerificationDocumentType.PROFESSIONAL_QUALIFICATION,
  // Gérer les autres types qui n'ont pas d'équivalent direct
  [DocumentType.VEHICLE_INSURANCE]: VerificationDocumentType.INSURANCE_CERTIFICATE,
  [DocumentType.VEHICLE_REGISTRATION]: VerificationDocumentType.DRIVERS_LICENSE,
  [DocumentType.OTHER]: VerificationDocumentType.ID_CARD, // Fallback valeur par défaut
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