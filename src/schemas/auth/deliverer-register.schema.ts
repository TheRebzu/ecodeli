import { z } from 'zod';
import { UserRole, registerBaseFields, addressFields } from './register.schema';

/**
 * Schéma d'inscription pour les livreurs
 */
export const delivererRegisterSchema = z.object({
  ...registerBaseFields,
  ...addressFields,
  
  // Informations spécifiques au livreur
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  vehicleType: z.enum(['BICYCLE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK']),
  licensePlate: z.string().min(1, "La plaque d'immatriculation est requise"),
  
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