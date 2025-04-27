import { z } from 'zod';

export const emailSchema = z.string().email('Adresse email invalide');

export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial');

export const nameSchema = z
  .string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(100, 'Le nom ne peut pas dépasser 100 caractères');

export const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/, 'Numéro de téléphone invalide');

export const zipCodeSchema = z.string().regex(/^[0-9]{5}$/, 'Code postal invalide');

export const registrationSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']),
    acceptTerms: z.boolean().refine(val => val, 'Vous devez accepter les conditions'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
  rememberMe: z.boolean().optional(),
});

export const twoFactorSchema = z.object({
  code: z.string().regex(/^[0-9]{6}$/, 'Le code doit contenir 6 chiffres'),
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const csrfTokenSchema = z.object({
  csrfToken: z.string().min(1, 'CSRF token invalide'),
});
