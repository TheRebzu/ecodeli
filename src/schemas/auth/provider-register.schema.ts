import { z } from 'zod';
import { UserRole, registerBaseFields, addressFields } from './register.schema';

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
 */
export const providerRegisterSchema = z.object({
  ...registerBaseFields,
  ...addressFields,
  
  // Informations professionnelles
  companyName: z.string().optional(),
  address: z.string().min(5, "L'adresse est requise"),
  phone: z.string().min(5, "Le numéro de téléphone est requis"),
  
  // Services proposés
  services: z.array(z.string()).min(1, "Sélectionnez au moins un service"),
  serviceType: z.nativeEnum(ServiceType, {
    invalid_type_error: "Type de service invalide"
  }).optional(),
  description: z.string().optional(),
  
  // Disponibilité
  availability: z.string().optional(),
  
  // Champs optionnels
  websiteUrl: z.string().url({ message: "URL de site web invalide" }).optional(),
  
  // Le rôle est forcément PROVIDER pour ce schéma
  role: z.literal(UserRole.PROVIDER),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type ProviderRegisterSchemaType = z.infer<typeof providerRegisterSchema>;