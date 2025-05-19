import { z } from 'zod';

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
