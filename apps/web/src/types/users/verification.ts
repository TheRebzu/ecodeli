/**
 * Types pour la vérification des comptes merchant et provider
 */

// Import supprimé - non utilisé

/**
 * Actions de bannissement possibles
 */
export enum UserBanAction {
  BAN = 'BAN',
  UNBAN = 'UNBAN',
}

/**
 * Statuts de vérification possibles
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Types de raisons de rejet
 */
export enum RejectionReason {
  UNREADABLE = 'UNREADABLE',
  EXPIRED = 'EXPIRED',
  INCOMPLETE = 'INCOMPLETE',
  FAKE = 'FAKE',
  WRONG_TYPE = 'WRONG_TYPE',
  LOW_QUALITY = 'LOW_QUALITY',
  INFORMATION_MISMATCH = 'INFORMATION_MISMATCH',
  OTHER = 'OTHER',
}

/**
 * Types de documents pour vérification
 */
export enum VerificationDocumentType {
  ID_CARD = 'ID_CARD',
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
  BUSINESS_LICENSE = 'BUSINESS_LICENSE',
  TAX_CERTIFICATE = 'TAX_CERTIFICATE',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  VAT_REGISTRATION = 'VAT_REGISTRATION',
  INSURANCE_CERTIFICATE = 'INSURANCE_CERTIFICATE',
  PROFESSIONAL_QUALIFICATION = 'PROFESSIONAL_QUALIFICATION',
}

/**
 * Type pour un document utilisateur dans le frontend
 */
export interface UserDocument {
  documentId: string;
  documentUrl: string;
  documentType: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: Date;
}

/**
 * Type de base pour la vérification
 */
export interface VerificationBase {
  id: string;
  status: VerificationStatus;
  requestedAt: Date;
  verifiedAt?: Date;
  verifierId?: string;
  notes?: string;
  rejectionReason?: string;
}

/**
 * Type pour la vérification des merchants
 */
export interface MerchantVerification extends VerificationBase {
  merchantId: string;
  businessDocuments: string[];
  identityDocuments: string[];
  addressDocuments: string[];
  businessRegistered: boolean;
  taxCompliant: boolean;
}

/**
 * Type pour la vérification des providers
 */
export interface ProviderVerification extends VerificationBase {
  providerId: string;
  identityDocuments: string[];
  qualificationDocs: string[];
  insuranceDocs: string[];
  addressDocuments: string[];
  qualificationsVerified: boolean;
  insuranceValid: boolean;
}

/**
 * Type pour la requête de soumission de vérification d'un merchant
 */
export interface MerchantVerificationRequest {
  merchantId: string;
  documents: {
    type: VerificationDocumentType;
    fileId: string;
  }[];
  notes?: string;
}

/**
 * Type pour la requête de soumission de vérification d'un provider
 */
export interface ProviderVerificationRequest {
  providerId: string;
  documents: {
    type: VerificationDocumentType;
    fileId: string;
  }[];
  notes?: string;
}

/**
 * Type pour la mise à jour d'une demande de vérification par un admin
 */
export interface VerificationUpdateRequest {
  verificationId: string;
  status: VerificationStatus;
  notes?: string;
  rejectionReason?: RejectionReason;
}

/**
 * Type pour le document soumis pour vérification
 */
export interface VerificationDocument {
  id: string;
  type: VerificationDocumentType;
  userId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  expiryDate?: Date;
  notes?: string;
}

/**
 * Type pour la réponse sur le statut de vérification
 */
export interface VerificationStatusResponse {
  status: VerificationStatus;
  submittedAt: Date;
  verifiedAt?: Date;
  documents: VerificationDocument[];
  missingDocuments?: VerificationDocumentType[];
  rejectionReason?: string;
  notes?: string;
}


// Export ajouté automatiquement
// Types pour la vérification utilisateur
export interface CodeVerification {
  id: string;
  userId: string;
  code: string;
  type: 'EMAIL' | 'PHONE' | 'TWO_FACTOR';
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  maxAttempts: number;  
  createdAt: Date;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  attemptsRemaining?: number;
}

// Export par défaut pour compatibilité
export default CodeVerification;