import { z } from 'zod';
import { UserRole, registerBaseFields } from './register.schema';

/**
 * Schéma d'inscription pour les commerçants
 */
export const merchantRegisterSchema = z
  .object({
    ...registerBaseFields,

    // Informations de l'entreprise
    companyName: z.string().min(2, "Le nom de l'entreprise est requis"),
    address: z.string().min(5, "L'adresse est requise"),
    phone: z.string().min(5, 'Le numéro de téléphone est requis'),

    // Informations commerciales
    businessType: z.string().optional(),
    vatNumber: z.string().optional(),

    // Adresse de l'entreprise
    businessAddress: z.string().optional(),
    businessCity: z.string().optional(),
    businessState: z.string().optional(),
    businessPostal: z.string().optional(),
    businessCountry: z.string().optional(),

    // Informations supplémentaires
    taxId: z.string().optional(),
    websiteUrl: z.string().url().optional(),

    // Le rôle est forcément MERCHANT pour ce schéma
    role: z.literal(UserRole.MERCHANT),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type MerchantRegisterSchemaType = z.infer<typeof merchantRegisterSchema>; 