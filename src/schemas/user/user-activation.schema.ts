import { z } from 'zod';

/**
 * Schéma pour la désactivation/activation d'un compte utilisateur
 */
export const toggleUserActivationSchema = z.object({
  userId: z.string().nonempty("L'ID utilisateur est requis"),
  isActive: z.boolean(),
});

export type ToggleUserActivationInput = z.infer<typeof toggleUserActivationSchema>;
