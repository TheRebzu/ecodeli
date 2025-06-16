import { z } from "zod";

/**
 * Enum pour les différents rôles d'utilisateurs
 */
export enum UserRole {
  CLIENT = "CLIENT",
  DELIVERER = "DELIVERER",
  MERCHANT = "MERCHANT",
  PROVIDER = "PROVIDER",
  ADMIN = "ADMIN"}

/**
 * Validation du mot de passe avec règles de complexité
 */
export const passwordSchema = z
  .string()
  .min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" })
  .regex(/[a-z]/, {
    message: "Le mot de passe doit contenir au moins une lettre minuscule"})
  .regex(/[A-Z]/, {
    message: "Le mot de passe doit contenir au moins une lettre majuscule"})
  .regex(/[0-9]/, {
    message: "Le mot de passe doit contenir au moins un chiffre"});

/**
 * Champs de base pour l'enregistrement
 */
export const registerBaseFields = {
  email: z.string().email({ message: "Email invalide"  }),
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  phoneNumber: z.string().optional()};

/**
 * Champs d'adresse communs à plusieurs schémas
 */
export const addressFields = {
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional()};

/**
 * Schéma de base pour l'enregistrement commun à tous les types d'utilisateurs
 */
export const registerBaseSchema = z
  .object({ ...registerBaseFields,
    role: z.nativeEnum(UserRole) })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export type RegisterBaseSchemaType = z.infer<typeof registerBaseSchema>;

// Schéma pour la création d'un utilisateur par un admin
export const adminCreateUserSchema = z
  .object({ ...registerBaseFields,
    status: z
      .enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_VERIFICATION"])
      .default("ACTIVE") })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export type AdminCreateUserSchemaType = z.infer<typeof adminCreateUserSchema>;

// Schéma pour l'adresse
export const addressSchema = z.object(addressFields);
