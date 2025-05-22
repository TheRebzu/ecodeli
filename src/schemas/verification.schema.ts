import { z } from 'zod';
import { DocumentType, VerificationStatus } from '@prisma/client';

/**
 * Enum pour les raisons de rejet (non disponible dans prisma client)
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
 * Type pour le type de vérification
 */
export const verificationType = z.enum(['MERCHANT', 'PROVIDER']);
export type VerificationType = z.infer<typeof verificationType>;

/**
 * Schéma pour la soumission de document
 */
export const documentSubmissionSchema = z.object({
  userId: z.string({
    required_error: "L'ID de l'utilisateur est requis",
  }),
  documentType: z.nativeEnum(DocumentType, {
    required_error: 'Le type de document est requis',
  }),
  documentUrl: z.string({
    required_error: "L'URL du document est requise",
  }),
  documentId: z.string().optional(),
});

export type DocumentSubmissionInput = z.infer<typeof documentSubmissionSchema>;

/**
 * Schéma pour la soumission de vérification
 */
export const verificationSubmissionSchema = z.object({
  userId: z.string({
    required_error: "L'ID de l'utilisateur est requis",
  }),
  type: verificationType,
  documents: z.array(z.string()).min(1, 'Au moins un document est requis'),
});

export type VerificationSubmissionInput = z.infer<typeof verificationSubmissionSchema>;

/**
 * Schéma pour un document
 */
export const documentSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(DocumentType),
  fileUrl: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  status: z.nativeEnum(VerificationStatus).optional(),
  createdAt: z.date(),
});

export type DocumentSchemaType = z.infer<typeof documentSchema>;

/**
 * Schéma pour la vérification de compte par un administrateur
 */
export const accountVerificationSchema = z.object({
  profileId: z.string({
    required_error: "L'ID du profil est requis",
  }),
  approved: z.boolean({
    required_error: 'Veuillez indiquer si le compte est approuvé ou rejeté',
  }),
  notes: z.string().optional(),
});

export type AccountVerificationSchemaType = z.infer<typeof accountVerificationSchema>;

/**
 * Schéma pour la vérification d'un document par un administrateur
 */
export const documentVerificationSchema = z.object({
  documentId: z.string({
    required_error: "L'ID du document est requis",
  }),
  status: z.enum(['APPROVED', 'REJECTED'], {
    required_error: 'Veuillez indiquer si le document est approuvé ou rejeté',
  }),
  notes: z.string().optional(),
});

export type DocumentVerificationSchemaType = z.infer<typeof documentVerificationSchema>;

/**
 * Schéma pour la soumission de document pour vérification
 */
export const documentUploadSchema = z.object({
  type: z.nativeEnum(DocumentType, {
    required_error: 'Le type de document est requis',
    invalid_type_error: 'Type de document invalide'
  }),
  file: z.any(), // Représente un fichier uploadé
  notes: z.string().optional(),
  expiryDate: z.date().optional(),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

/**
 * Schéma pour la soumission de vérification d'un merchant
 */
export const merchantVerificationSubmitSchema = z.object({
  merchantId: z.string({
    required_error: "L'ID du commerçant est requis",
  }),
  businessDocuments: z.array(z.string()).min(1, 'Au moins un document d\'entreprise est requis'),
  identityDocuments: z.array(z.string()).min(1, 'Au moins un document d\'identité est requis'),
  addressDocuments: z.array(z.string()).min(1, 'Au moins un justificatif d\'adresse est requis'),
  notes: z.string().optional(),
});

export type MerchantVerificationSubmitInput = z.infer<typeof merchantVerificationSubmitSchema>;

/**
 * Schéma pour la soumission de vérification d'un provider
 */
export const providerVerificationSubmitSchema = z.object({
  providerId: z.string({
    required_error: "L'ID du prestataire est requis",
  }),
  identityDocuments: z.array(z.string()).min(1, 'Au moins un document d\'identité est requis'),
  qualificationDocs: z.array(z.string()).min(1, 'Au moins un document de qualification est requis'),
  insuranceDocs: z.array(z.string()).min(1, 'Au moins un document d\'assurance est requis'),
  addressDocuments: z.array(z.string()).min(1, 'Au moins un justificatif d\'adresse est requis'),
  notes: z.string().optional(),
});

export type ProviderVerificationSubmitInput = z.infer<typeof providerVerificationSubmitSchema>;

// Type pour le contexte du schéma de traitement de vérification
<<<<<<< HEAD
type _VerificationProcessContext = {
=======
type VerificationProcessContext = {
>>>>>>> amine
  status: VerificationStatus;
};

/**
 * Schéma pour le traitement de vérification par un admin
 */
export const verificationProcessSchema = z.object({
  verificationId: z.string({
    required_error: "L'ID de la vérification est requis",
  }),
  status: z.nativeEnum(VerificationStatus, {
    required_error: 'Le statut est requis',
    invalid_type_error: 'Statut invalide'
  }),
  notes: z.string().optional(),
  rejectionReason: z.nativeEnum(RejectionReason).optional(),
}).refine(
  (data) => {
    // Si le statut est REJECTED, rejectionReason doit être fourni
    if (data.status === 'REJECTED' && !data.rejectionReason) {
      return false;
    }
    return true;
  },
  {
    message: 'Une raison est requise en cas de rejet',
    path: ['rejectionReason'],
  }
);

export type VerificationProcessInput = z.infer<typeof verificationProcessSchema>;

/**
 * Schéma pour les filtres de requête de liste des vérifications
 */
export const verificationListFiltersSchema = z.object({
  status: z.nativeEnum(VerificationStatus).optional(),
  type: z.enum(['MERCHANT', 'PROVIDER']).optional(),
  fromDate: z.date().optional(),
  toDate: z.date().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  page: z.number().int().min(1).default(1),
});

export type VerificationListFiltersInput = z.infer<typeof verificationListFiltersSchema>;

/**
 * Schéma pour la requête de détail d'une vérification
 */
export const verificationDetailSchema = z.object({
  id: z.string({
    required_error: "L'ID de la vérification est requis",
  }),
});

export type VerificationDetailInput = z.infer<typeof verificationDetailSchema>;
