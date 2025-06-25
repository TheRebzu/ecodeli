import { z } from "zod"
import { UserRole } from "@prisma/client"

// Rôles disponibles
export const ROLES = {
  CLIENT: "CLIENT",
  DELIVERER: "DELIVERER",
  MERCHANT: "MERCHANT",
  PROVIDER: "PROVIDER",
  ADMIN: "ADMIN"
} as const

// Schema de connexion
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
})

export type LoginData = z.infer<typeof loginSchema>

// Schema d'inscription de base
const baseRegisterFields = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
    .toLowerCase(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/,
      "Le mot de passe doit contenir au moins: une minuscule, une majuscule et un chiffre"
    ),
  confirmPassword: z.string().min(1, "Veuillez confirmer votre mot de passe"),
  firstName: z
    .string()
    .min(2, "Le prénom doit contenir au moins 2 caractères")
    .max(50, "Le prénom ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le prénom ne peut contenir que des lettres"),
  lastName: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Le nom ne peut contenir que des lettres"),
  phone: z
    .string()
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Format de téléphone français invalide")
    .optional(),
  language: z.enum(["fr", "en"]).default("fr"),
  acceptsTerms: z
    .boolean()
    .refine((val) => val === true, {
      message: "Vous devez accepter les conditions d'utilisation"
    })
})

// Schema d'inscription générique avec validation
export const baseRegisterSchema = baseRegisterFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
)

export type BaseRegisterData = z.infer<typeof baseRegisterSchema>

// Schema d'inscription client
export const clientRegisterSchema = baseRegisterFields.extend({
  role: z.literal(ROLES.CLIENT).default(ROLES.CLIENT),
  address: z
    .string()
    .min(10, "L'adresse doit contenir au moins 10 caractères")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères"),
  city: z
    .string()
    .min(2, "La ville doit contenir au moins 2 caractères")
    .max(50, "La ville ne peut pas dépasser 50 caractères"),
  postalCode: z
    .string()
    .regex(/^[0-9]{5}$/, "Le code postal doit contenir exactement 5 chiffres"),
  country: z.string().default("FR"),
  subscriptionPlan: z.enum(['FREE', 'STARTER', 'PREMIUM']).default('FREE'),
  acceptsMarketing: z.boolean().default(false),
  acceptsEmailNotifications: z.boolean().default(true),
  acceptsPushNotifications: z.boolean().default(true),
  acceptsSmsNotifications: z.boolean().default(false)
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
)

export type ClientRegisterData = z.infer<typeof clientRegisterSchema>

// Schema d'inscription livreur
export const delivererRegisterSchema = baseRegisterFields.extend({
  role: z.literal(ROLES.DELIVERER).default(ROLES.DELIVERER),
  vehicleType: z.enum(['WALKING', 'BIKE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK']),
  licensePlate: z
    .string()
    .regex(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/, "Format de plaque invalide (ex: AB-123-CD)")
    .optional(),
  maxWeight: z
    .number()
    .min(1, "Le poids maximum doit être supérieur à 0")
    .max(1000, "Le poids maximum ne peut pas dépasser 1000kg"),
  maxVolume: z
    .number()
    .min(1, "Le volume maximum doit être supérieur à 0")
    .max(5000, "Le volume maximum ne peut pas dépasser 5000 litres"),
  maxDistance: z
    .number()
    .min(1, "La distance maximum doit être supérieure à 0")
    .max(500, "La distance maximum ne peut pas dépasser 500km"),
  hasInsurance: z
    .boolean()
    .refine((val) => val === true, {
      message: "Vous devez avoir une assurance valide"
    }),
  hasLicense: z
    .boolean()
    .refine((val) => val === true, {
      message: "Vous devez avoir un permis de conduire valide si applicable"
    })
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
).refine(
  (data) => {
    // Vérifier que les véhicules motorisés ont une plaque
    if (['CAR', 'VAN', 'TRUCK'].includes(data.vehicleType) && !data.licensePlate) {
      return false
    }
    return true
  },
  {
    message: "La plaque d'immatriculation est requise pour ce type de véhicule",
    path: ["licensePlate"]
  }
)

export type DelivererRegisterData = z.infer<typeof delivererRegisterSchema>

// Schema d'inscription commerçant
export const merchantRegisterSchema = baseRegisterFields.extend({
  role: z.literal(ROLES.MERCHANT).default(ROLES.MERCHANT),
  companyName: z
    .string()
    .min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères")
    .max(100, "Le nom de l'entreprise ne peut pas dépasser 100 caractères"),
  businessType: z.enum(['RETAIL', 'RESTAURANT', 'GROCERY', 'SERVICES', 'OTHER']),
  siret: z
    .string()
    .regex(/^[0-9]{14}$/, "Le SIRET doit contenir exactement 14 chiffres"),
  vatNumber: z
    .string()
    .regex(/^FR[0-9]{11}$/, "Format de TVA invalide (ex: FR12345678901)")
    .optional(),
  address: z
    .string()
    .min(10, "L'adresse doit contenir au moins 10 caractères")
    .max(200, "L'adresse ne peut pas dépasser 200 caractères"),
  city: z
    .string()
    .min(2, "La ville doit contenir au moins 2 caractères")
    .max(50, "La ville ne peut pas dépasser 50 caractères"),
  postalCode: z
    .string()
    .regex(/^[0-9]{5}$/, "Le code postal doit contenir exactement 5 chiffres"),
  country: z.string().default("FR"),
  contractType: z.enum(['STANDARD', 'PREMIUM', 'ENTERPRISE', 'CUSTOM']).default('STANDARD'),
  acceptsCartDrop: z.boolean().default(false),
  estimatedMonthlyVolume: z
    .number()
    .min(0, "Le volume mensuel estimé doit être positif")
    .optional()
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
)

export type MerchantRegisterData = z.infer<typeof merchantRegisterSchema>

// Schema d'inscription prestataire
export const providerRegisterSchema = baseRegisterFields.extend({
  role: z.literal(ROLES.PROVIDER).default(ROLES.PROVIDER),
  businessName: z
    .string()
    .min(2, "Le nom d'entreprise doit contenir au moins 2 caractères")
    .max(100, "Le nom d'entreprise ne peut pas dépasser 100 caractères")
    .optional(),
  siret: z
    .string()
    .regex(/^[0-9]{14}$/, "Le SIRET doit contenir exactement 14 chiffres")
    .optional(),
  specialties: z
    .array(z.enum(['TRANSPORT', 'HOME_CLEANING', 'GARDENING', 'HANDYMAN', 'TUTORING', 'HEALTHCARE', 'BEAUTY', 'PET_CARE', 'OTHER']))
    .min(1, "Veuillez sélectionner au moins une spécialité")
    .max(5, "Vous ne pouvez pas sélectionner plus de 5 spécialités"),
  hourlyRate: z
    .number()
    .min(10, "Le taux horaire minimum est de 10€")
    .max(200, "Le taux horaire maximum est de 200€"),
  description: z
    .string()
    .min(50, "La description doit contenir au moins 50 caractères")
    .max(500, "La description ne peut pas dépasser 500 caractères"),
  serviceZone: z.object({
    radius: z.number().min(1, "Le rayon doit être d'au moins 1km").max(50, "Le rayon ne peut pas dépasser 50km"),
    city: z.string().min(2, "La ville est requise"),
    postalCode: z.string().regex(/^[0-9]{5}$/, "Code postal invalide")
  }),
  hasAutoEntrepreneurStatus: z
    .boolean()
    .refine((val) => val === true, {
      message: "Vous devez avoir le statut d'auto-entrepreneur"
    }),
  monthlyInvoiceDay: z
    .number()
    .min(1, "Le jour doit être entre 1 et 31")
    .max(31, "Le jour doit être entre 1 et 31")
    .default(30)
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
)

export type ProviderRegisterData = z.infer<typeof providerRegisterSchema>

// Schema de réinitialisation de mot de passe
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide")
})

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

// Schema d'inscription admin (usage interne uniquement)
export const adminRegisterSchema = baseRegisterFields.extend({
  role: z.literal(ROLES.ADMIN).default(ROLES.ADMIN),
  department: z.enum(['OPERATIONS', 'FINANCE', 'SUPPORT', 'TECHNICAL', 'MANAGEMENT']),
  permissions: z.array(z.string()).default([]),
  secretKey: z
    .string()
    .min(32, "Clé secrète invalide")
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
  }
)

export type AdminRegisterData = z.infer<typeof adminRegisterSchema>

// Schema de changement de mot de passe
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/,
      "Le mot de passe doit contenir au moins: une minuscule, une majuscule et un chiffre"
    ),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmNewPassword"]
})

export type ChangePasswordData = z.infer<typeof changePasswordSchema>

// Schema de réinitialisation de mot de passe
export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]/,
      "Le mot de passe doit contenir au moins: une minuscule, une majuscule et un chiffre"
    ),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
})

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>

// Schema de mise à jour du profil
export const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  phone: z.string().regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Format invalide").optional(),
  address: z.string().min(10).max(200).optional(),
  city: z.string().min(2).max(50).optional(),
  postalCode: z.string().regex(/^[0-9]{5}$/, "Code postal invalide").optional(),
  language: z.enum(["fr", "en"]).optional()
})

export type UpdateProfileData = z.infer<typeof updateProfileSchema>