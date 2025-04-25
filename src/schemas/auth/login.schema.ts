import { z } from 'zod';

/**
 * Schéma de connexion standard
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email requis' })
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(1, 'Le mot de passe est requis'),
    
  // Facultatif pour la 2FA
  totp: z.string().optional(),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

/**
 * Schéma de réinitialisation de mot de passe
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email requis' })
    .email('Format d\'email invalide')
    .toLowerCase()
    .trim(),
});

export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

/**
 * Schéma de réinitialisation de mot de passe avec token
 */
export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Token requis' }),
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial'
    ),
  confirmPassword: z
    .string({ required_error: 'Confirmation du mot de passe requise' }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;