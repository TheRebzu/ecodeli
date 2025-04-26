import { z } from 'zod';
import { UserRole } from './register.schema';

/**
 * Schéma d'inscription pour les commerçants
 * Étend le schéma de base avec des champs spécifiques aux commerçants
 */
export const merchantRegisterSchema = z.object({
  // Informations de base
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phoneNumber: z.string().min(10, { message: "Numéro de téléphone invalide" }),
  role: z.literal(UserRole.MERCHANT),
  
  // Informations professionnelles
  businessName: z.string().min(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères" }),
  taxId: z.string().min(5, { message: "Numéro de TVA invalide" }),
  siret: z.string().min(14, { message: "Numéro SIRET invalide" }).max(14),
  
  // Adresse professionnelle
  businessAddress: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
  businessCity: z.string().min(2, { message: "La ville doit contenir au moins 2 caractères" }),
  businessState: z.string().optional(),
  businessPostal: z.string().min(3, { message: "Code postal invalide" }),
  businessCountry: z.string().min(2, { message: "Le pays doit contenir au moins 2 caractères" }),
  
  // Informations additionnelles (optionnelles)
  businessDescription: z.string().optional(),
  websiteUrl: z.string().url({ message: "URL invalide" }).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type MerchantRegisterSchemaType = z.infer<typeof merchantRegisterSchema>;