import { z } from "zod";

export const documentTypeSchema = z.enum([
  "ID_CARD",
  "DRIVING_LICENSE",
  "VEHICLE_REGISTRATION",
  "INSURANCE",
  "QUALIFICATION_CERTIFICATE",
  "OTHER",
]);

export const verificationStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

// Schéma pour le téléchargement d'un document
export const uploadDocumentSchema = z.object({
  type: documentTypeSchema,
  file: z.any(), // Sera validé côté client avec uploadSchema
  notes: z.string().optional(),
});

// Schéma pour la mise à jour d'un document
export const updateDocumentSchema = z.object({
  documentId: z.string(),
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
}); 