import * as z from "zod";
import { UserRole } from "../auth-utils";

// Enum pour les rôles utilisateur (compatible avec les types UserRole)
export const UserRoleEnum = z.enum([
  "ADMIN",
  "CLIENT", 
  "COURIER", 
  "MERCHANT", 
  "PROVIDER"
]);

/**
 * Schéma pour les données d'inscription de base
 */
export const baseRegisterSchema = z.object({
  firstName: z.string().min(2, { message: "Le prénom doit contenir au moins 2 caractères" }),
  lastName: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  phone: z.string().optional(),
  password: z.string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" })
    .regex(/[^A-Za-z0-9]/, { message: "Le mot de passe doit contenir au moins un caractère spécial" }),
  confirmPassword: z.string(),
  role: UserRoleEnum,
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les conditions générales"
  }),
});

// Ajouter la validation de correspondance des mots de passe
export const registerSchema = baseRegisterSchema.refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Schema pour l'inscription client
 */
export const clientRegisterSchema = z.object({
  ...baseRegisterSchema.shape,
  role: z.literal(UserRoleEnum.enum.CLIENT),
}).refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

export type ClientRegisterFormData = z.infer<typeof clientRegisterSchema>;

/**
 * Schema pour l'inscription livreur
 */
export const courierRegisterSchema = z.object({
  ...baseRegisterSchema.shape,
  role: z.literal(UserRoleEnum.enum.COURIER),
  // Champs spécifiques aux livreurs
  vehicleType: z.enum(["BICYCLE", "SCOOTER", "CAR", "VAN"], {
    required_error: "Veuillez sélectionner un type de véhicule"
  }),
  licenseNumber: z.string().min(1, { message: "Veuillez entrer votre numéro de permis" }),
  address: z.object({
    street: z.string().min(1, { message: "Veuillez entrer votre adresse" }),
    city: z.string().min(1, { message: "Veuillez entrer votre ville" }),
    postalCode: z.string().min(1, { message: "Veuillez entrer votre code postal" }),
    country: z.string().min(1, { message: "Veuillez entrer votre pays" }),
  }),
  availability: z.object({
    weekdays: z.boolean(),
    weekends: z.boolean(),
    evenings: z.boolean(),
  }),
  identityDocument: z.string().optional(),
}).refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

export type CourierRegisterFormData = z.infer<typeof courierRegisterSchema>;

/**
 * Schema pour l'inscription commerçant
 */
export const merchantRegisterSchema = z.object({
  ...baseRegisterSchema.shape,
  role: z.literal(UserRoleEnum.enum.MERCHANT),
  // Champs spécifiques aux commerçants
  businessName: z.string().min(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères" }),
  businessType: z.enum(["RESTAURANT", "GROCERY", "RETAIL", "BAKERY", "OTHER"], {
    required_error: "Veuillez sélectionner un type d'entreprise"
  }),
  siret: z.string().regex(/^\d{14}$/, { message: "Le numéro SIRET doit contenir 14 chiffres" }),
  address: z.object({
    street: z.string().min(1, { message: "Veuillez entrer l'adresse de votre commerce" }),
    city: z.string().min(1, { message: "Veuillez entrer la ville de votre commerce" }),
    postalCode: z.string().min(1, { message: "Veuillez entrer le code postal de votre commerce" }),
    country: z.string().min(1, { message: "Veuillez entrer le pays de votre commerce" }),
  }),
  logo: z.string().optional(),
  commerceDocument: z.string().optional(),
}).refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

export type MerchantRegisterFormData = z.infer<typeof merchantRegisterSchema>;

/**
 * Schema pour l'inscription prestataire
 */
export const providerRegisterSchema = z.object({
  ...baseRegisterSchema.shape,
  role: z.literal(UserRoleEnum.enum.PROVIDER),
  // Champs spécifiques aux prestataires
  companyName: z.string().min(2, { message: "Le nom de l'entreprise doit contenir au moins 2 caractères" }),
  serviceType: z.enum(["STORAGE", "PACKAGING", "DELIVERY", "OTHER"], {
    required_error: "Veuillez sélectionner un type de service"
  }),
  siret: z.string().regex(/^\d{14}$/, { message: "Le numéro SIRET doit contenir 14 chiffres" }),
  address: z.object({
    street: z.string().min(1, { message: "Veuillez entrer l'adresse de votre entreprise" }),
    city: z.string().min(1, { message: "Veuillez entrer la ville de votre entreprise" }),
    postalCode: z.string().min(1, { message: "Veuillez entrer le code postal de votre entreprise" }),
    country: z.string().min(1, { message: "Veuillez entrer le pays de votre entreprise" }),
  }),
  servicesOffered: z.array(z.string()).min(1, { message: "Veuillez sélectionner au moins un service" }),
  companyDocument: z.string().optional(),
}).refine(
  (data) => data.password === data.confirmPassword, 
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  }
);

export type ProviderRegisterFormData = z.infer<typeof providerRegisterSchema>;

// Re-export pour la compatibilité
export { UserRole }; 