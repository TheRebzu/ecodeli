import { z } from "zod";

// User roles enum
export const UserRoleEnum = z.enum(["CLIENT", "LIVREUR", "COMMERCANT", "PRESTATAIRE"]);
export type UserRole = z.infer<typeof UserRoleEnum>;

// Login validation schema
export const loginSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
  rememberMe: z.boolean().default(false).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// User status enum
export const UserStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
]);

export type UserStatus = z.infer<typeof UserStatusEnum>;

// Vehicle types for delivery persons
export const VehicleTypeEnum = z.enum([
  "CAR",
  "BIKE",
  "SCOOTER",
  "VAN",
  "TRUCK",
  "PUBLIC_TRANSPORT",
  "WALK",
]);

export type VehicleType = z.infer<typeof VehicleTypeEnum>;

// Service types for service providers
export const ServiceTypeEnum = z.enum([
  "PERSON_TRANSPORT",
  "AIRPORT_TRANSFER",
  "SHOPPING",
  "FOREIGN_PURCHASE",
  "PET_SITTING",
  "HOUSEKEEPING",
  "GARDENING",
  "OTHER",
]);

export type ServiceType = z.infer<typeof ServiceTypeEnum>;

// Reset password email validation schema
export const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Email invalide" }),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Confirm password reset validation schema
export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type ConfirmResetPasswordFormData = z.infer<typeof confirmResetPasswordSchema>;

// Base registration schema with common fields
const baseRegisterSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "Vous devez accepter les conditions générales d'utilisation",
  }),
});

// Customer specific schema
export const customerRegisterSchema = baseRegisterSchema.extend({
  role: z.literal(UserRoleEnum.enum.CLIENT),
  address: z.string().min(1, { message: "L'adresse est requise" }),
  city: z.string().min(1, { message: "La ville est requise" }),
  postalCode: z.string().min(1, { message: "Le code postal est requis" }),
  country: z.string().min(1, { message: "Le pays est requis" }),
});

// Delivery person specific schema
export const deliveryPersonRegisterSchema = baseRegisterSchema.extend({
  role: z.literal(UserRoleEnum.enum.LIVREUR),
  address: z.string().min(1, { message: "L'adresse est requise" }),
  city: z.string().min(1, { message: "La ville est requise" }),
  postalCode: z.string().min(1, { message: "Le code postal est requis" }),
  country: z.string().min(1, { message: "Le pays est requis" }),
  vehicleType: z.string().min(1, { message: "Le type de véhicule est requis" }),
  licenseNumber: z.string().min(1, { message: "Le numéro de permis est requis" }),
  documents: z
    .array(z.string())
    .min(1, { message: "Au moins un document est requis" }),
});

// Merchant specific schema
export const merchantRegisterSchema = baseRegisterSchema.extend({
  role: z.literal(UserRoleEnum.enum.COMMERCANT),
  address: z.string().min(1, { message: "L'adresse est requise" }),
  city: z.string().min(1, { message: "La ville est requise" }),
  postalCode: z.string().min(1, { message: "Le code postal est requis" }),
  country: z.string().min(1, { message: "Le pays est requis" }),
  companyName: z.string().min(1, { message: "Le nom de l'entreprise est requis" }),
  siret: z.string().min(14, { message: "Le numéro SIRET doit contenir 14 chiffres" }),
  businessType: z.string().min(1, { message: "Le type d'activité est requis" }),
  employeeCount: z.number().int().positive().optional(),
  websiteUrl: z.string().url({ message: "URL du site web invalide" }).optional(),
});

// Service provider specific schema
export const serviceProviderRegisterSchema = baseRegisterSchema.extend({
  role: z.literal(UserRoleEnum.enum.PRESTATAIRE),
  address: z.string().min(1, { message: "L'adresse est requise" }),
  city: z.string().min(1, { message: "La ville est requise" }),
  postalCode: z.string().min(1, { message: "Le code postal est requis" }),
  country: z.string().min(1, { message: "Le pays est requis" }),
  companyName: z.string().min(1, { message: "Le nom de l'entreprise est requis" }),
  siret: z.string().min(14, { message: "Le numéro SIRET doit contenir 14 chiffres" }),
  serviceTypes: z
    .array(z.string())
    .min(1, { message: "Au moins un type de service est requis" }),
  documents: z
    .array(z.string())
    .min(1, { message: "Au moins un document est requis" }),
});

// Combined schema that handles all types of registrations
export const registerSchema = z.discriminatedUnion("role", [
  customerRegisterSchema,
  deliveryPersonRegisterSchema,
  merchantRegisterSchema,
  serviceProviderRegisterSchema,
])
.refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

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