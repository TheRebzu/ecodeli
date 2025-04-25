import { z } from 'zod';
import { registerBaseSchema, UserRole } from './register.schema';

/**
 * Schéma d'inscription pour les livreurs
 * Étend le schéma de base avec des champs spécifiques aux livreurs
 */
export const delivererRegisterSchema = z.object({
  ...registerBaseSchema.shape,
  // Champs spécifiques au livreur
  address: z.string().min(5, 'L\'adresse doit contenir au moins 5 caractères'),
  city: z.string().min(2, 'La ville est requise'),
  state: z.string().optional(),
  postalCode: z.string().min(3, 'Le code postal est requis'),
  country: z.string().min(2, 'Le pays est requis'),
  
  // Informations sur le véhicule
  vehicleType: z.enum(['CAR', 'BIKE', 'SCOOTER', 'VAN', 'TRUCK'], {
    required_error: 'Le type de véhicule est requis',
  }),
  licenseNumber: z.string().min(5, 'Le numéro de permis de conduire est requis'),
  
  // Disponibilité
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  maxCapacity: z.number().positive('La capacité doit être positive').optional(),
  
  // Assignation fixe du rôle DELIVERER
  role: z.literal(UserRole.DELIVERER),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Les mots de passe ne correspondent pas',
      path: ['confirmPassword'],
    });
  }
});

export type DelivererRegisterSchemaType = z.infer<typeof delivererRegisterSchema>;