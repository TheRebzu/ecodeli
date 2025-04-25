import { z } from 'zod';
import { registerBaseSchema, UserRole } from './register.schema';

/**
 * Schéma d'inscription pour les commerçants
 * Étend le schéma de base avec des champs spécifiques aux commerçants
 */
export const merchantRegisterSchema = z.object({
  ...registerBaseSchema.shape,
  // Champs spécifiques au commerçant
  businessName: z.string().min(2, 'Le nom de l\'entreprise est requis'),
  businessAddress: z.string().min(5, 'L\'adresse de l\'entreprise est requise'),
  businessCity: z.string().min(2, 'La ville est requise'),
  businessState: z.string().optional(),
  businessPostal: z.string().min(3, 'Le code postal est requis'),
  businessCountry: z.string().min(2, 'Le pays est requis'),
  
  // Informations fiscales
  taxId: z.string().min(5, 'Le numéro d\'identification fiscale est requis'),
  websiteUrl: z.string().url('URL du site web invalide').optional(),
  
  // Assignation fixe du rôle MERCHANT
  role: z.literal(UserRole.MERCHANT),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type MerchantRegisterSchemaType = z.infer<typeof merchantRegisterSchema>;