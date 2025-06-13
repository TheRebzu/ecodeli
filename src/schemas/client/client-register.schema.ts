import { z } from "zod";
import {
  UserRole,
  registerBaseFields,
  addressFields,
} from "@/schemas/auth/register.schema";

/**
 * Schéma de validation pour l'inscription d'un client
 */
export const clientRegisterSchema = z
  .object({
    ...registerBaseFields,
    ...addressFields,

    // Préférences
    newsletter: z.boolean().default(false),
    preferences: z.record(z.any()).optional(),

    // Le rôle est forcément CLIENT pour ce schéma
    role: z.literal(UserRole.CLIENT),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ClientRegisterSchemaType = z.infer<typeof clientRegisterSchema>;
