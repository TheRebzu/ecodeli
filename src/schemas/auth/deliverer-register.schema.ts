import { z } from 'zod';
import { UserRole, registerBaseFields, addressFields } from './register.schema';

/**
 * Schéma d'inscription pour les livreurs
 */
export const delivererRegisterSchema = z.object({
  ...registerBaseFields,
  ...addressFields,
  
  // Informations spécifiques au livreur
  licenseNumber: z.string().min(1, "Le numéro de permis est requis"),
  vehicleType: z.enum(['BICYCLE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK']),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.number().optional(),
  vehiclePlate: z.string().optional(),
  
  // Disponibilité
  availableWeekends: z.boolean().default(false),
  availableNights: z.boolean().default(false),
  
  // Le rôle est forcément DELIVERER pour ce schéma
  role: z.literal(UserRole.DELIVERER),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export type DelivererRegisterSchemaType = z.infer<typeof delivererRegisterSchema>;