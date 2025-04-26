import { z } from 'zod';

// Définition de l'enum UserRole pour éviter l'erreur d'import
export enum UserRole {
  CLIENT = 'CLIENT',
  DELIVERER = 'DELIVERER',
  MERCHANT = 'MERCHANT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

/**
 * Schéma de base pour l'enregistrement d'un utilisateur
 * Contient les champs communs à tous les types d'utilisateurs
 */
export const registerBaseFields = {
  email: z.string().email({ message: "Email invalide" }),
  password: z
    .string()
    .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
    .regex(/[a-z]/, { message: "Le mot de passe doit contenir au moins une lettre minuscule" })
    .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une lettre majuscule" })
    .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phoneNumber: z.string().optional(),
};

// Schéma de base
export const registerBaseSchema = z.object(registerBaseFields)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

// Schéma pour la création d'un utilisateur par un admin
export const adminCreateUserSchema = z.object({
  ...registerBaseFields,
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).default('ACTIVE'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type AdminCreateUserSchemaType = z.infer<typeof adminCreateUserSchema>;

// Schéma pour l'adresse
export const addressFields = {
  address: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
  city: z.string().min(2, { message: "La ville doit contenir au moins 2 caractères" }),
  state: z.string().min(2, { message: "La région doit contenir au moins 2 caractères" }),
  postalCode: z.string().min(3, { message: "Le code postal doit contenir au moins 3 caractères" }),
  country: z.string().min(2, { message: "Le pays doit contenir au moins 2 caractères" }),
};

export const addressSchema = z.object(addressFields);