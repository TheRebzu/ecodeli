import { z } from 'zod';
import { UserRole } from './register.schema';
import { registerBaseFields, addressFields } from './register.schema';

// Types de services proposés par les prestataires
export enum ServiceType {
  MAINTENANCE = 'MAINTENANCE',
  CLEANING = 'CLEANING',
  REPAIR = 'REPAIR',
  INSTALLATION = 'INSTALLATION',
  CONSULTING = 'CONSULTING',
  OTHER = 'OTHER'
}

/**
 * Schéma d'inscription pour les prestataires de services
 * Étend le schéma de base avec des champs spécifiques aux prestataires
 */
export const providerRegisterSchema = z.object({
  ...registerBaseFields,
  ...addressFields,
  
  // Champs spécifiques aux prestataires
  serviceType: z.nativeEnum(ServiceType, {
    required_error: "Le type de service est requis",
    invalid_type_error: "Type de service invalide"
  }),
  description: z.string().min(10, { message: "Une description détaillée est requise (minimum 10 caractères)" }),
  
  // Champs optionnels
  websiteUrl: z.string().url({ message: "URL de site web invalide" }).optional(),
  
  // Rôle fixe PROVIDER
  role: z.literal(UserRole.PROVIDER).default(UserRole.PROVIDER),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type ProviderRegisterSchemaType = z.infer<typeof providerRegisterSchema>;