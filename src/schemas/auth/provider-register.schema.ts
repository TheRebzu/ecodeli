import { z } from 'zod';
import { registerBaseSchema, UserRole } from './register.schema';

/**
 * Schéma d'inscription pour les prestataires de services
 * Étend le schéma de base avec des champs spécifiques aux prestataires
 */
export const providerRegisterSchema = z.object({
  ...registerBaseSchema.shape,
  // Champs spécifiques au prestataire
  serviceType: z.enum(['STORAGE', 'PACKAGING', 'LABELING', 'HANDLING', 'OTHER'], {
    required_error: 'Le type de service est requis',
  }),
  description: z.string().min(20, 'La description doit contenir au moins 20 caractères'),
  
  // Informations sur le service
  address: z.string().min(5, 'L\'adresse est requise'),
  city: z.string().min(2, 'La ville est requise'),
  state: z.string().optional(),
  postalCode: z.string().min(3, 'Le code postal est requis'),
  country: z.string().min(2, 'Le pays est requis'),
  
  // Disponibilité
  availability: z.string().optional(), // Format JSON de disponibilité
  
  // Informations fiscales
  taxId: z.string().min(5, 'Le numéro d\'identification fiscale est requis').optional(),
  websiteUrl: z.string().url('URL du site web invalide').optional(),
  
  // Assignation fixe du rôle PROVIDER
  role: z.literal(UserRole.PROVIDER),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type ProviderRegisterSchemaType = z.infer<typeof providerRegisterSchema>;