import { z } from "zod";

// User roles
export const UserRoleEnum = z.enum([
  "USER",      // Utilisateur standard
  "ADMIN",     // Administrateur
  "STAFF",     // Personnel
  "DRIVER",    // Chauffeur/Livreur
  "BUSINESS"   // Client entreprise
]);

export type UserRole = z.infer<typeof UserRoleEnum>;

// User status
export const UserStatusEnum = z.enum([
  "ACTIVE",     // Compte actif
  "INACTIVE",   // Compte inactif
  "SUSPENDED",  // Compte suspendu
  "DELETED"     // Compte supprimé
]);

export type UserStatus = z.infer<typeof UserStatusEnum>;

// User profile validation schema
export const userProfileSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Email invalide" }),
  phone: z.string().min(10, { message: "Le numéro de téléphone doit contenir au moins 10 chiffres" }).optional(),
  bio: z.string().max(500, { message: "La biographie ne peut pas dépasser 500 caractères" }).optional(),
  preferredLanguage: z.string().default("fr"),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    push: z.boolean().default(true),
    marketing: z.boolean().default(false),
  }).optional(),
  address: z.object({
    street: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
    city: z.string().min(2, { message: "La ville doit contenir au moins 2 caractères" }),
    postalCode: z.string().min(5, { message: "Le code postal doit contenir au moins 5 caractères" }),
    country: z.string().min(2, { message: "Le pays doit contenir au moins 2 caractères" }),
    additionalInfo: z.string().optional(),
  }).optional(),
});

export type UserProfileData = z.infer<typeof userProfileSchema>;

// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(6, { message: "Le mot de passe actuel doit contenir au moins 6 caractères" }),
  newPassword: z
    .string()
    .min(8, { message: "Le nouveau mot de passe doit contenir au moins 8 caractères" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

// Payment method validation schema
export const paymentMethodSchema = z.object({
  type: z.enum(["CARD", "PAYPAL", "BANK_TRANSFER"]),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  isDefault: z.boolean().default(false),
  cardDetails: z.object({
    number: z.string().regex(/^\d{16}$/, { message: "Le numéro de carte doit contenir 16 chiffres" }),
    expiryMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, { message: "Le mois d'expiration doit être entre 01 et 12" }),
    expiryYear: z.string().regex(/^\d{2}$/, { message: "L'année d'expiration doit contenir 2 chiffres" }),
    cvv: z.string().regex(/^\d{3,4}$/, { message: "Le CVV doit contenir 3 ou 4 chiffres" }),
  }).optional(),
  paypalEmail: z.string().email({ message: "Email PayPal invalide" }).optional(),
  bankDetails: z.object({
    accountName: z.string().min(2, { message: "Le nom du compte doit contenir au moins 2 caractères" }),
    accountNumber: z.string().min(5, { message: "Le numéro de compte doit contenir au moins 5 caractères" }),
    routingNumber: z.string().min(5, { message: "Le numéro de routage doit contenir au moins 5 caractères" }),
  }).optional(),
}).refine(
  (data) => {
    if (data.type === "CARD") return !!data.cardDetails;
    if (data.type === "PAYPAL") return !!data.paypalEmail;
    if (data.type === "BANK_TRANSFER") return !!data.bankDetails;
    return true;
  },
  {
    message: "Informations manquantes pour le type de paiement sélectionné",
    path: ["type"],
  }
);

export type PaymentMethodData = z.infer<typeof paymentMethodSchema>;

// Address validation schema
export const addressSchema = z.object({
  label: z.string().min(2, { message: "Le libellé doit contenir au moins 2 caractères" }),
  street: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
  city: z.string().min(2, { message: "La ville doit contenir au moins 2 caractères" }),
  postalCode: z.string().min(5, { message: "Le code postal doit contenir au moins 5 caractères" }),
  country: z.string().min(2, { message: "Le pays doit contenir au moins 2 caractères" }),
  additionalInfo: z.string().optional(),
  isDefault: z.boolean().default(false),
  type: z.enum(["HOME", "WORK", "OTHER"]),
});

export type AddressData = z.infer<typeof addressSchema>; 