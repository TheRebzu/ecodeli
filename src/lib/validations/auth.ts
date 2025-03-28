import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// User role enum
export const UserRoleEnum = z.enum([
  "CLIENT", 
  "LIVREUR", 
  "COMMERCANT", 
  "PRESTATAIRE",
]);

export type UserRole = z.infer<typeof UserRoleEnum>;

// Registration validation schema
export const registerSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
  role: UserRoleEnum,
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Reset password validation schema
export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Set new password validation schema
export const newPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
  token: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

// Two-factor authentication validation schema
export const twoFactorSchema = z.object({
  code: z
    .string()
    .min(6, { message: "Le code doit contenir 6 chiffres" })
    .max(6, { message: "Le code doit contenir 6 chiffres" })
    .regex(/^[0-9]+$/, { message: "Le code doit contenir uniquement des chiffres" }),
});

export type TwoFactorFormData = z.infer<typeof twoFactorSchema>; 