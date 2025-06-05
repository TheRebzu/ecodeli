import { DocumentType } from '@prisma/client';
import { VerificationDocumentType } from '@/types/verification';

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
