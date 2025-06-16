import { z } from "zod";

/**
 * Schéma pour le bannissement/débannissement d'un utilisateur
 */
export const userBanSchema = z.object({ userId: z.string().nonempty("L'ID utilisateur est requis"),
  action: z.enum(["BAN", "UNBAN"]),
  reason: z.string().max(255).optional(), // Raison obligatoire pour BAN
 });

export type UserBanInput = z.infer<typeof userBanSchema>;
