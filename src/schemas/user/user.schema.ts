import { z } from "zod";

export const userRoleSchema = z.enum([
  "CLIENT",
  "DELIVERER",
  "MERCHANT",
  "PROVIDER",
  "ADMIN"]);

export const userStatusSchema = z.enum([
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "INACTIVE"]);

export const loginSchema = z.object({ email: z.string().email({ message: "Adresse email invalide"  }),
  password: z.string().min(8, { message: "Mot de passe trop court" })});

const passwordValidation = z
  .string()
  .min(8, { message: "Mot de passe trop court" })
  .regex(/[A-Z]/, { message: "Doit contenir au moins une majuscule" })
  .regex(/[a-z]/, { message: "Doit contenir au moins une minuscule" })
  .regex(/[0-9]/, { message: "Doit contenir au moins un chiffre" });

// Base schema sans le refine
const baseUserSchemaObj = z.object({ email: z.string().email({ message: "Adresse email invalide"  }),
  password: passwordValidation,
  confirmPassword: z.string(),
  name: z.string().min(2, { message: "Nom trop court" })});

// Refine dans une étape séparée
export const baseUserSchema = baseUserSchemaObj.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]},
);

export const clientRegisterSchema = z
  .object({ ...baseUserSchemaObj.shape,
    role: z.literal("CLIENT"),
    address: z.string().optional(),
    phone: z.string().optional(),
    preferences: z.record(z.string(), z.any()).optional() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export const delivererRegisterSchema = z
  .object({ ...baseUserSchemaObj.shape,
    role: z.literal("DELIVERER"),
    address: z.string().min(5, { message: "Adresse requise"  }),
    phone: z.string().min(10, { message: "Numéro de téléphone requis" }),
    vehicleType: z.string(),
    licensePlate: z.string()})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export const merchantRegisterSchema = z
  .object({ ...baseUserSchemaObj.shape,
    role: z.literal("MERCHANT"),
    companyName: z.string().min(2, { message: "Nom d'entreprise requis"  }),
    address: z.string().min(5, { message: "Adresse requise" }),
    phone: z.string().min(10, { message: "Numéro de téléphone requis" }),
    businessType: z.string().optional(),
    vatNumber: z.string().optional()})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export const providerRegisterSchema = z
  .object({ ...baseUserSchemaObj.shape,
    role: z.literal("PROVIDER"),
    companyName: z.string().optional(),
    address: z.string().min(5, { message: "Adresse requise"  }),
    phone: z.string().min(10, { message: "Numéro de téléphone requis" }),
    services: z
      .array(z.string())
      .min(1, { message: "Au moins un service requis" })})
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});

export const verifyEmailSchema = z.object({ token: z.string() });

export const forgotPasswordSchema = z.object({ email: z.string().email({ message: "Adresse email invalide"  })});

export const resetPasswordSchema = z
  .object({ token: z.string(),
    password: passwordValidation,
    confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]});
