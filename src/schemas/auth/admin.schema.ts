import { z } from 'zod';

/**
 * Schéma pour la création d'un administrateur par un super-admin
 */
export const createAdminSchema = z.object({
  email: z
    .string({
      required_error: "L'email est requis",
    })
    .email("Format d'email invalide"),
  name: z
    .string({
      required_error: 'Le nom est requis',
    })
    .min(3, 'Le nom doit comporter au moins 3 caractères'),
  password: z
    .string({
      required_error: 'Le mot de passe est requis',
    })
    .min(8, 'Le mot de passe doit comporter au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/,
      'Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial'
    ),
  permissions: z
    .array(z.string())
    .min(1, 'Au moins une permission doit être assignée')
    .default(['USER_MANAGEMENT']),
  department: z.string().optional(),
});

export type CreateAdminSchemaType = z.infer<typeof createAdminSchema>;
