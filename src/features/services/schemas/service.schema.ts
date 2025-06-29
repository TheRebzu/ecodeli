import { z } from 'zod'

// Types de services selon le cahier des charges EcoDeli
export const serviceTypeSchema = z.enum([
  'HOME_CLEANING',         // Ménage à domicile
  'GARDENING',            // Jardinage et entretien extérieur
  'HANDYMAN',             // Bricolage et petites réparations
  'PET_SITTING',          // Garde d'animaux de compagnie
  'PET_WALKING',          // Promenade d'animaux
  'TUTORING',             // Cours particuliers
  'BEAUTY_HOME',          // Soins esthétiques à domicile
  'PERSONAL_SHOPPING',    // Courses personnalisées
  'ELDERLY_CARE',         // Accompagnement personnes âgées
  'CHILDCARE',            // Garde d'enfants
  'HOUSE_SITTING',        // Surveillance de domicile
  'MOVING_HELP',          // Aide au déménagement
  'ASSEMBLY',             // Montage de meubles
  'COOKING',              // Cuisine à domicile
  'PERSONAL_TRAINING'     // Coach sportif à domicile
])

export type ServiceType = z.infer<typeof serviceTypeSchema>

// Statuts des services
export const serviceStatusSchema = z.enum([
  'DRAFT',           // Brouillon
  'ACTIVE',          // Publiée et visible
  'BOOKED',          // Réservée par un prestataire
  'IN_PROGRESS',     // En cours de réalisation
  'COMPLETED',       // Terminée
  'CANCELLED',       // Annulée
  'PENDING_REVIEW'   // En attente d'évaluation
])

export type ServiceStatus = z.infer<typeof serviceStatusSchema>

// Fréquences pour services récurrents
export const serviceFrequencySchema = z.enum([
  'ONE_TIME',        // Ponctuel
  'WEEKLY',          // Hebdomadaire
  'BIWEEKLY',        // Toutes les 2 semaines
  'MONTHLY',         // Mensuel
  'QUARTERLY'        // Trimestriel
])

export type ServiceFrequency = z.infer<typeof serviceFrequencySchema>

// Schema de base pour les services
export const baseServiceSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit faire au moins 5 caractères')
    .max(100, 'Le titre ne peut dépasser 100 caractères'),
  description: z.string()
    .min(20, 'La description doit faire au moins 20 caractères')
    .max(1000, 'La description ne peut dépasser 1000 caractères'),
  type: serviceTypeSchema,
  location: z.object({
    address: z.string().min(10, 'Adresse complète requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    floor: z.string().optional(),
    accessCode: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional()
  }),
  scheduledAt: z.string().datetime('Date et heure invalides'),
  duration: z.number()
    .positive('La durée doit être positive')
    .max(480, 'Durée maximum 8 heures'), // en minutes
  budget: z.number()
    .positive('Le budget doit être positif')
    .max(5000, 'Budget maximum 5,000€'),
  isRecurring: z.boolean().default(false),
  frequency: serviceFrequencySchema.optional(),
  specificRequirements: z.string().max(500).optional(),
  providerGender: z.enum(['MALE', 'FEMALE', 'NO_PREFERENCE']).optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL')
})

// Détails spécifiques pour le ménage
export const cleaningDetailsSchema = z.object({
  surfaceArea: z.number().positive('Surface requise').max(1000), // m²
  rooms: z.number().positive().max(20),
  bathrooms: z.number().min(0).max(10),
  hasBalcony: z.boolean().default(false),
  hasPets: z.boolean().default(false),
  hasChildren: z.boolean().default(false),
  preferredProducts: z.enum(['ECO', 'STANDARD', 'BRING_OWN']).optional(),
  tasks: z.array(z.enum([
    'DUSTING', 'VACUUMING', 'MOPPING', 'BATHROOMS', 'KITCHEN', 
    'WINDOWS', 'IRONING', 'FRIDGE_CLEANING', 'OVEN_CLEANING'
  ])).min(1, 'Au moins une tâche requise'),
  specialInstructions: z.string().max(300).optional()
})

// Détails pour le jardinage
export const gardeningDetailsSchema = z.object({
  gardenSize: z.number().positive('Taille du jardin requise').max(10000), // m²
  gardenType: z.enum(['LAWN', 'VEGETABLES', 'FLOWERS', 'MIXED']),
  tasks: z.array(z.enum([
    'MOWING', 'WEEDING', 'PRUNING', 'PLANTING', 'WATERING', 
    'FERTILIZING', 'LEAF_REMOVAL', 'HEDGE_TRIMMING'
  ])).min(1, 'Au moins une tâche requise'),
  hasTools: z.boolean().default(false),
  seasonalWork: z.boolean().default(false),
  plantingPreferences: z.string().max(200).optional()
})

// Détails pour garde d'animaux
export const petCareDetailsSchema = z.object({
  pets: z.array(z.object({
    name: z.string().min(1, 'Nom requis'),
    type: z.enum(['DOG', 'CAT', 'BIRD', 'FISH', 'RABBIT', 'OTHER']),
    breed: z.string().optional(),
    age: z.number().min(0).max(30),
    weight: z.number().positive().optional(),
    medications: z.string().optional(),
    specialNeeds: z.string().optional()
  })).min(1, 'Au moins un animal requis'),
  serviceType: z.enum(['SITTING', 'WALKING', 'FEEDING', 'OVERNIGHT']),
  duration: z.number().positive().max(14), // jours pour garde prolongée
  hasYard: z.boolean().default(false),
  emergencyContact: z.object({
    name: z.string().min(2),
    phone: z.string().min(10)
  })
})

// Détails pour bricolage
export const handymanDetailsSchema = z.object({
  tasks: z.array(z.enum([
    'PLUMBING', 'ELECTRICAL', 'PAINTING', 'CARPENTRY', 'ASSEMBLY',
    'INSTALLATION', 'REPAIR', 'MAINTENANCE'
  ])).min(1, 'Au moins une tâche requise'),
  complexity: z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX']),
  materialsProvided: z.boolean().default(false),
  toolsRequired: z.array(z.string()).optional(),
  urgency: z.enum(['NORMAL', 'URGENT', 'EMERGENCY']).default('NORMAL'),
  photos: z.array(z.string()).optional() // URLs des photos du problème
})

// Schema pour création de service
export const createServiceSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(1000),
  type: serviceTypeSchema,
  location: z.object({
    address: z.string().min(10),
    city: z.string().min(2),
    postalCode: z.string().min(5),
    floor: z.string().optional(),
    accessCode: z.string().optional()
  }),
  scheduledAt: z.string().datetime(),
  duration: z.number().positive().max(480),
  budget: z.number().positive().max(5000),
  isRecurring: z.boolean().default(false),
  frequency: serviceFrequencySchema.optional(),
  specificRequirements: z.string().max(500).optional(),
  providerGender: z.enum(['MALE', 'FEMALE', 'NO_PREFERENCE']).optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  
  // Détails spécifiques selon le type
  cleaningDetails: cleaningDetailsSchema.optional(),
  gardeningDetails: gardeningDetailsSchema.optional(),
  petCareDetails: petCareDetailsSchema.optional(),
  handymanDetails: handymanDetailsSchema.optional()
})

// Schema pour recherche de services
export const searchServicesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: serviceTypeSchema.optional(),
  status: serviceStatusSchema.optional(),
  city: z.string().optional(),
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  isRecurring: z.coerce.boolean().optional(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  sortBy: z.enum(['createdAt', 'scheduledAt', 'budget', 'urgency']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Types d'export
export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type SearchServicesInput = z.infer<typeof searchServicesSchema>
export type CleaningDetails = z.infer<typeof cleaningDetailsSchema>
export type GardeningDetails = z.infer<typeof gardeningDetailsSchema>
export type PetCareDetails = z.infer<typeof petCareDetailsSchema>
export type HandymanDetails = z.infer<typeof handymanDetailsSchema>