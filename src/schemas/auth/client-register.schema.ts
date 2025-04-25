import { z } from 'zod';
import { registerBaseSchema, UserRole } from './register.schema';

/**
 * Schéma d'inscription pour les clients
 * Étend le schéma de base avec des champs spécifiques aux clients
 */
export const clientRegisterSchema = z.object({
  ...registerBaseSchema.shape,
  // Champs spécifiques au client
  address: z.string().min(5, 'L\'adresse doit contenir au moins 5 caractères'),
  city: z.string().min(2, 'La ville est requise'),
  state: z.string().optional(),
  postalCode: z.string().min(3, 'Le code postal est requis'),
  country: z.string().min(2, 'Le pays est requis'),
  
  // Assignation fixe du rôle CLIENT
  role: z.literal(UserRole.CLIENT),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type ClientRegisterSchemaType = z.infer<typeof clientRegisterSchema>;