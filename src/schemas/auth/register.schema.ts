import { z } from 'zod';

// Définition de l'enum UserRole pour éviter l'erreur d'import
export enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERER = 'DELIVERER',
  MERCHANT = 'MERCHANT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

/**
 * Schéma de base pour l'enregistrement d'un utilisateur
 * Contient les champs communs à tous les types d'utilisateurs
 */
export const registerBaseSchema = z.object({
  email: z
    .string({ required_error: 'Email requis' })
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial'
    ),
  
  confirmPassword: z
    .string({ required_error: 'Confirmation du mot de passe requise' }),
  
  name: z
    .string({ required_error: 'Nom requis' })
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .trim(),
  
  phoneNumber: z
    .string()
    .optional()
    .refine(val => !val || /^(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(val), {
      message: 'Numéro de téléphone invalide',
    }),
  
  role: z.nativeEnum(UserRole, {
    required_error: 'Rôle requis',
    invalid_type_error: 'Rôle invalide',
  }),
});

// Séparation de la validation de confirmation du mot de passe
export const registerSchema = registerBaseSchema.superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;

/**
 * Schéma pour la création d'un utilisateur par un admin
 */
export const adminCreateUserSchema = z.object({
  ...registerBaseSchema.shape,
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('ACTIVE'),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type AdminCreateUserSchemaType = z.infer<typeof adminCreateUserSchema>;