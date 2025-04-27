import * as z from 'zod';

/**
 * Schéma de validation pour la connexion
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  totp: z
    .string()
    .max(6)
    .optional()
    .transform(val => (val === '' ? undefined : val)), // Convert empty string to undefined
  remember: z.boolean().default(false).optional(),
  callbackUrl: z.string().optional(),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

/**
 * Schéma de validation pour le formulaire "mot de passe oublié"
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
});

export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

/**
 * Schéma de validation pour la réinitialisation de mot de passe
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token manquant'),
    password: z
      .string()
      .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
      .regex(/[a-z]/, { message: 'Le mot de passe doit contenir au moins une lettre minuscule' })
      .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une lettre majuscule' })
      .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' }),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

/**
 * Schéma de validation pour l'activation de l'authentification à deux facteurs
 */
export const setupTwoFactorSchema = z.object({
  totpCode: z.string().min(6, 'Le code TOTP doit contenir au moins 6 caractères'),
});

export type SetupTwoFactorSchemaType = z.infer<typeof setupTwoFactorSchema>;

/**
 * Schéma de validation pour la vérification d'email
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token manquant'),
});

export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;

// Schema for 2FA challenge when required after initial login
export const totpChallengeSchema = z.object({
  totp: z
    .string()
    .min(6, { message: 'Authentication code must be 6 digits' })
    .max(6, { message: 'Authentication code must be 6 digits' })
    .regex(/^\d+$/, { message: 'Authentication code must contain only digits' }),
  remember: z.boolean().default(false).optional(),
});

export type TotpChallengeSchemaType = z.infer<typeof totpChallengeSchema>;
