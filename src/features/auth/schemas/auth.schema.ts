import { z } from "zod";

// Schema de connexion
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export type LoginData = z.infer<typeof loginSchema>;

// Schema d'inscription de base (sans la validation confirmPassword)
const baseRegisterFields = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
      "Le mot de passe doit contenir: minuscule, majuscule, chiffre et caractère spécial",
    ),
  confirmPassword: z.string(),
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(50, "Le nom ne peut pas dépasser 50 caractères"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^(\+33|0)[1-9]([0-9]{8})$/.test(val), {
      message: "Format de téléphone invalide (ex: 0651168619 ou +33651168619)",
    }),
});

// Schema d'inscription générique avec validation
export const baseRegisterSchema = baseRegisterFields.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  },
);

export type BaseRegisterData = z.infer<typeof baseRegisterSchema>;

// Schema d'inscription client
export const clientRegisterSchema = z
  .object({
    email: z
      .string()
      .min(1, "L'email est requis")
      .email("Format d'email invalide"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
        "Le mot de passe doit contenir: minuscule, majuscule, chiffre et caractère spécial",
      ),
    confirmPassword: z.string(),
    firstName: z
      .string()
      .min(2, "Le prénom doit contenir au moins 2 caractères")
      .max(50, "Le prénom ne peut pas dépasser 50 caractères"),
    lastName: z
      .string()
      .min(2, "Le nom doit contenir au moins 2 caractères")
      .max(50, "Le nom ne peut pas dépasser 50 caractères"),
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
      .regex(
        /^[0-9]{5}$/,
        "Le code postal doit contenir exactement 5 chiffres",
      ),
    termsAccepted: z.boolean().refine((val) => val === true, {
      message: "Vous devez accepter les conditions d'utilisation",
    }),
    subscriptionPlan: z.enum(["FREE", "STARTER", "PREMIUM"]).default("FREE"),
    acceptsMarketing: z.boolean().default(false),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^(\+33|0)[1-9]([0-9]{8})$/.test(val), {
        message:
          "Format de téléphone invalide (ex: 0651168619 ou +33651168619)",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ClientRegisterData = z.infer<typeof clientRegisterSchema>;

// Schema d'inscription livreur
export const delivererRegisterSchema = baseRegisterFields
  .extend({
    vehicleType: z.enum(["WALKING", "BIKE", "SCOOTER", "CAR", "TRUCK"]),
    maxWeight: z
      .number()
      .min(1, "Le poids maximum doit être supérieur à 0")
      .max(1000, "Le poids maximum ne peut pas dépasser 1000kg"),
    maxDistance: z
      .number()
      .min(1, "La distance maximum doit être supérieure à 0")
      .max(500, "La distance maximum ne peut pas dépasser 500km"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type DelivererRegisterData = z.infer<typeof delivererRegisterSchema>;

// Schema d'inscription commerçant
export const merchantRegisterSchema = baseRegisterFields
  .extend({
    businessName: z
      .string()
      .min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères")
      .max(100, "Le nom de l'entreprise ne peut pas dépasser 100 caractères"),
    businessType: z.enum(["RETAIL", "RESTAURANT", "SERVICES", "OTHER"]),
    siret: z
      .string()
      .regex(/^[0-9]{14}$/, "Le SIRET doit contenir exactement 14 chiffres"),
    address: z
      .string()
      .min(10, "L'adresse doit contenir au moins 10 caractères")
      .max(200, "L'adresse ne peut pas dépasser 200 caractères"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type MerchantRegisterData = z.infer<typeof merchantRegisterSchema>;

// Schema d'inscription prestataire
export const providerRegisterSchema = baseRegisterFields
  .extend({
    businessName: z
      .string()
      .min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères")
      .max(100, "Le nom de l'entreprise ne peut pas dépasser 100 caractères"),
    specialties: z
      .array(
        z.enum([
          "TRANSPORT",
          "HOME_CLEANING",
          "GARDENING",
          "PET_CARE",
          "TUTORING",
          "HANDYMAN",
          "OTHER",
        ]),
      )
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
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ProviderRegisterData = z.infer<typeof providerRegisterSchema>;

// Schema de réinitialisation de mot de passe
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'email est requis")
    .email("Format d'email invalide"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

// Schema de réinitialisation de mot de passe
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token requis"),
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/,
        "Le mot de passe doit contenir: minuscule, majuscule, chiffre et caractère spécial",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
