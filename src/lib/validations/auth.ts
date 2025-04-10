import * as z from "zod";
import { UserRole } from "../auth-utils";

// Importation et réexportation des schémas de auth.schema.ts
import { 
  baseRegisterSchema,
  registerSchema,
  clientRegisterSchema,
  courierRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  UserRoleEnum
} from "./auth.schema";

export type {
  ClientRegisterFormData,
  CourierRegisterFormData,
  MerchantRegisterFormData,
  ProviderRegisterFormData,
  RegisterFormData
} from "./auth.schema";

/**
 * Schema pour les données de connexion
 */
export const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

/**
 * Schema pour les données d'inscription de base
 */
export const registerSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phone: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les conditions générales" }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Schema pour la réinitialisation du mot de passe
 */
export const resetPasswordSchema = z.object({
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Schema pour la demande de réinitialisation du mot de passe
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema pour la mise à jour du profil
 */
export const profileSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phone: z.string().optional(),
  email: z.string().email({ message: "Email invalide" }).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Réexporter les types utilisés dans d'autres fichiers
 */
export { 
  UserRole,
  // Réexportation des schémas
  baseRegisterSchema,
  registerSchema,
  clientRegisterSchema, 
  courierRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema,
  UserRoleEnum
}; 