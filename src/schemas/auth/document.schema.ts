import { z } from 'zod';
import { DocumentType, VerificationStatus } from '@prisma/client';

export const documentTypeSchema = z.nativeEnum(DocumentType);

export const verificationStatusSchema = z.nativeEnum(VerificationStatus);

// A custom type-check helper for FileList that works in both browser and server environments
const isFileList = (value: unknown): value is FileList => {
  return (
    typeof window !== 'undefined' && typeof FileList !== 'undefined' && value instanceof FileList
  );
};

// Schéma pour le téléchargement d'un document
export const uploadDocumentSchema = z.object({
  type: documentTypeSchema,
  file: z.custom<FileList>(val => isFileList(val) && (val as FileList).length === 1, {
    message: 'Veuillez sélectionner un fichier',
  }),
  notes: z.string().optional(),
  expiryDate: z.date().optional(),
});

// Schéma pour la mise à jour d'un document
export const updateDocumentSchema = z.object({
  id: z.string(),
  type: documentTypeSchema.optional(),
  notes: z.string().optional(),
  expiryDate: z.date().optional(),
});

// Schéma pour la demande de vérification
export const createVerificationSchema = z.object({
  documentId: z.string(),
  status: verificationStatusSchema,
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Schéma pour la mise à jour d'une vérification par un admin
export const updateVerificationSchema = z.object({
  id: z.string(),
  status: verificationStatusSchema,
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Schema pour le filtrage des documents
export const documentFilterSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ALL']).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  page: z.number().default(1),
  limit: z.number().default(10),
});

// Schema pour la validation administrative des documents
export const verifyDocumentSchema = z
  .object({
    documentId: z.string(),
    status: z.enum(['APPROVED', 'REJECTED']),
    notes: z.string().optional(),
    rejectionReason: z.string().optional(),
  })
  .refine(
    data => {
      if (
        data.status === 'REJECTED' &&
        (!data.rejectionReason || data.rejectionReason.length < 3)
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Une raison est requise pour rejeter un document',
      path: ['rejectionReason'],
    }
  );
