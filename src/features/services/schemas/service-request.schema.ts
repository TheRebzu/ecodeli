import { z } from 'zod'

// Schéma pour les demandes de service (côté client)
export const createServiceRequestSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit faire au moins 5 caractères')
    .max(100, 'Le titre ne peut dépasser 100 caractères'),
  description: z.string()
    .min(20, 'La description doit faire au moins 20 caractères')
    .max(1000, 'La description ne peut dépasser 1000 caractères'),
  type: z.enum([
    'HOME_SERVICE',      // Services à domicile (ménage, jardinage, etc.)
    'PET_CARE',          // Garde d'animaux
    'PERSON_TRANSPORT',  // Transport de personnes
    'AIRPORT_TRANSFER',  // Transfert aéroport
    'SHOPPING',          // Courses
    'INTERNATIONAL_PURCHASE', // Achats internationaux
    'CART_DROP',         // Lâcher de chariot
    'OTHER'              // Autres services
  ]),
  location: z.object({
    address: z.string().min(10, 'Adresse complète requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    floor: z.string().optional(),
    accessCode: z.string().optional()
  }),
  scheduledAt: z.string().min(1, 'Date et heure requises'),
  duration: z.number().positive().max(480, 'Maximum 8 heures'), // en minutes
  budget: z.number().positive().max(5000, 'Budget maximum 5000€'),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
  specificRequirements: z.string().max(500).optional(),
  providerGender: z.enum(['NO_PREFERENCE', 'FEMALE', 'MALE']).optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  
  // Détails spécifiques selon le type
  cleaningDetails: z.object({
    surfaceArea: z.number().positive().optional(),
    rooms: z.number().positive().default(3),
    bathrooms: z.number().positive().default(1),
    hasBalcony: z.boolean().default(false),
    hasPets: z.boolean().default(false),
    hasChildren: z.boolean().default(false),
    tasks: z.array(z.string()).default(['DUSTING', 'VACUUMING', 'MOPPING'])
  }).optional(),
  
  gardeningDetails: z.object({
    gardenSize: z.number().positive().optional(),
    gardenType: z.string().optional(),
    tasks: z.array(z.string()).default(['MOWING', 'TRIMMING']),
    hasTools: z.boolean().default(false)
  }).optional(),
  
  petCareDetails: z.object({
    pets: z.array(z.object({
      name: z.string().min(1, 'Nom requis'),
      type: z.string().min(1, 'Type requis'),
      breed: z.string().optional(),
      age: z.number().positive().max(30)
    })).min(1, 'Au moins un animal requis'),
    serviceType: z.enum(['SITTING', 'WALKING', 'FEEDING', 'GROOMING']),
    hasYard: z.boolean().default(false)
  }).optional(),
  
  handymanDetails: z.object({
    tasks: z.array(z.string()).min(1, 'Au moins une tâche requise'),
    complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']).default('SIMPLE'),
    materialsProvided: z.boolean().default(false)
  }).optional()
})

export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema> 