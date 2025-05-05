import { z } from 'zod';
import { DocumentType, VerificationStatus } from '@prisma/client';

export const documentTypeSchema = z.nativeEnum(DocumentType);

export const verificationStatusSchema = z.nativeEnum(VerificationStatus);

// Schéma pour le fichier: accepte soit une chaîne (URL ou base64), soit un objet File
const fileSchema = z.union([
  // Option 1: Une chaîne (URL ou base64)
  z.string().refine(
    val => {
      // Accepte soit une URL, soit une chaîne base64 commençant par "data:"
      return (
        val.startsWith('http') ||
        val.startsWith('https') ||
        val.startsWith('/') ||
        val.startsWith('data:')
      );
    },
    {
      message: 'Veuillez fournir une URL valide ou un fichier encodé en base64',
    }
  ),
  // Option 2: Un objet (qui représente un File)
  z.object({}).passthrough(),
]);

// Improved schema for document upload
export const uploadDocumentSchema = z.object({
  type: documentTypeSchema,
  file: fileSchema,
  notes: z.string().optional(),
  expiryDate: z.date().optional(),
});

// Schéma pour la mise à jour d'un document
export const updateDocumentSchema = z.object({
  documentId: z.string(),
  type: documentTypeSchema.optional(),
  notes: z.string().optional(),
  expiryDate: z.date().optional(),
});

// Schéma pour la demande de vérification
export const createVerificationSchema = z.object({
  documentId: z.string(),
  notes: z.string().optional(),
});

// Schéma pour la mise à jour d'une vérification par un admin
export const updateVerificationSchema = z.object({
  verificationId: z.string(),
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
