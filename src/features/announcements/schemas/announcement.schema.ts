import { z } from 'zod'

// Types d'annonces selon le cahier des charges EcoDeli
export const announcementTypeSchema = z.enum([
  'PACKAGE_DELIVERY',      // Transport de colis (intégral ou partiel)
  'PERSON_TRANSPORT',      // Transport de personnes
  'AIRPORT_TRANSFER',      // Transfert aéroport
  'SHOPPING',              // Courses avec liste fournie
  'INTERNATIONAL_PURCHASE', // Achats internationaux
  'PET_SITTING',           // Garde d'animaux
  'HOME_SERVICE',          // Services à domicile (ménage, jardinage)
  'CART_DROP'              // Lâcher de chariot (service phare)
])

export type AnnouncementType = z.infer<typeof announcementTypeSchema>

// Statuts d'annonces
export const announcementStatusSchema = z.enum([
  'DRAFT',      // Brouillon
  'ACTIVE',     // Publiée et visible
  'MATCHED',    // Matchée avec un livreur/prestataire
  'IN_PROGRESS', // En cours de traitement
  'COMPLETED',  // Terminée
  'CANCELLED'   // Annulée
])

export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>

// Schéma pour les coordonnées géographiques
export const locationSchema = z.object({
  address: z.string().min(10, 'Adresse complète requise (minimum 10 caractères)'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().min(5, 'Code postal requis'),
  country: z.string().default('FR'),
  lat: z.number().optional(),
  lng: z.number().optional()
})

export type Location = z.infer<typeof locationSchema>

// Schema de base pour toutes les annonces
export const baseAnnouncementSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit faire au moins 5 caractères')
    .max(100, 'Le titre ne peut dépasser 100 caractères'),
  description: z.string()
    .min(20, 'La description doit faire au moins 20 caractères')
    .max(1000, 'La description ne peut dépasser 1000 caractères'),
  type: announcementTypeSchema,
  startLocation: locationSchema,
  endLocation: locationSchema,
  desiredDate: z.string().datetime('Date invalide'),
  flexibleDates: z.boolean().default(false),
  dateRangeStart: z.string().datetime().optional(),
  dateRangeEnd: z.string().datetime().optional(),
  price: z.number()
    .positive('Le prix doit être positif')
    .max(10000, 'Prix maximum 10,000€'),
  currency: z.string().default('EUR'),
  urgent: z.boolean().default(false),
  specialInstructions: z.string().max(500).optional()
})

// Détails spécifiques pour les colis
export const packageDetailsSchema = z.object({
  weight: z.number().positive('Poids requis').max(50, 'Maximum 50kg par colis'),
  length: z.number().positive('Longueur requise').max(200, 'Maximum 200cm'),
  width: z.number().positive('Largeur requise').max(200, 'Maximum 200cm'),
  height: z.number().positive('Hauteur requise').max(200, 'Maximum 200cm'),
  fragile: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  insuredValue: z.number().positive().optional(),
  content: z.string().min(5, 'Description du contenu requise'),
  specialHandling: z.string().optional()
})

export type PackageDetails = z.infer<typeof packageDetailsSchema>

// Détails spécifiques pour les services à la personne
export const serviceDetailsSchema = z.object({
  serviceType: z.enum([
    'CLEANING',      // Ménage
    'GARDENING',     // Jardinage  
    'HANDYMAN',      // Bricolage
    'PET_CARE',      // Garde d'animaux
    'TUTORING',      // Cours particuliers
    'BEAUTY',        // Soins/beauté
    'TRANSPORT'      // Transport de personnes
  ]),
  numberOfPeople: z.number().positive().max(8).optional(),
  duration: z.number().positive().max(480, 'Maximum 8 heures'), // en minutes
  recurringService: z.boolean().default(false),
  recurringPattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  specialRequirements: z.string().max(300).optional(),
  preferredProviderId: z.string().optional()
})

export type ServiceDetails = z.infer<typeof serviceDetailsSchema>

// Détails pour le lâcher de chariot (service phare EcoDeli)
export const cartDropDetailsSchema = z.object({
  storeId: z.string().min(1, 'ID magasin requis'),
  storeName: z.string().min(2, 'Nom du magasin requis'),
  timeSlot: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis')
  }),
  deliveryZone: z.string().min(5, 'Zone de livraison requise'),
  orderValue: z.number().positive('Valeur de commande requise'),
  freeDeliveryEligible: z.boolean().default(false),
  contactPhone: z.string().min(10, 'Numéro de téléphone requis'),
  deliveryInstructions: z.string().max(200).optional()
})

export type CartDropDetails = z.infer<typeof cartDropDetailsSchema>

// Schema pour création d'annonce avec validation conditionnelle
export const createAnnouncementSchema = baseAnnouncementSchema.and(
  z.discriminatedUnion('type', [
    // Colis et livraisons
    z.object({
      type: z.literal('PACKAGE_DELIVERY'),
      packageDetails: packageDetailsSchema
    }),
    z.object({
      type: z.literal('INTERNATIONAL_PURCHASE'),
      packageDetails: packageDetailsSchema.extend({
        customsValue: z.number().positive().optional(),
        customsDescription: z.string().min(10).optional()
      })
    }),
    // Transport de personnes
    z.object({
      type: z.literal('PERSON_TRANSPORT'),
      serviceDetails: serviceDetailsSchema.extend({
        serviceType: z.literal('TRANSPORT'),
        numberOfPeople: z.number().positive().max(8)
      })
    }),
    z.object({
      type: z.literal('AIRPORT_TRANSFER'),
      serviceDetails: serviceDetailsSchema.extend({
        serviceType: z.literal('TRANSPORT'),
        flightNumber: z.string().optional(),
        terminal: z.string().optional(),
        luggage: z.boolean().default(false)
      }).extend({
        flightNumber: z.string().optional(),
        terminal: z.string().optional(),
        luggage: z.boolean().default(false)
      })
    }),
    // Services à domicile
    z.object({
      type: z.literal('HOME_SERVICE'),
      serviceDetails: serviceDetailsSchema
    }),
    z.object({
      type: z.literal('PET_SITTING'),
      serviceDetails: serviceDetailsSchema.extend({
        serviceType: z.literal('PET_CARE'),
        petType: z.enum(['DOG', 'CAT', 'BIRD', 'OTHER']),
        petSize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
        specialNeeds: z.string().max(200).optional()
      }).extend({
        petType: z.enum(['DOG', 'CAT', 'BIRD', 'OTHER']),
        petSize: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
        specialNeeds: z.string().max(200).optional()
      })
    }),
    // Courses
    z.object({
      type: z.literal('SHOPPING'),
      shoppingDetails: z.object({
        shoppingList: z.array(z.object({
          item: z.string().min(2),
          quantity: z.number().positive(),
          specifications: z.string().optional()
        })).min(1, 'Liste de courses requise'),
        budget: z.number().positive('Budget requis'),
        preferredStores: z.array(z.string()).optional(),
        paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CARD')
      })
    }),
    // Lâcher de chariot (service phare)
    z.object({
      type: z.literal('CART_DROP'),
      cartDropDetails: cartDropDetailsSchema
    })
  ])
)

// Schema pour mise à jour d'annonce
export const updateAnnouncementSchema = createAnnouncementSchema.partial().extend({
  id: z.string().min(1, 'ID requis'),
  status: announcementStatusSchema.optional()
})

// Schema pour recherche d'annonces
export const searchAnnouncementsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  type: announcementTypeSchema.optional(),
  status: announcementStatusSchema.optional(),
  clientId: z.string().optional(),
  merchantId: z.string().optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
  city: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  urgent: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'desiredDate', 'price', 'distance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Schema pour matching avec trajets livreurs
export const routeMatchingSchema = z.object({
  announcementId: z.string().min(1),
  maxDistance: z.number().positive().max(100).default(50), // km
  minMatchScore: z.number().min(0).max(100).default(60),
  notifyDeliverers: z.boolean().default(true)
})

// Types d'export
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>
export type SearchAnnouncementsInput = z.infer<typeof searchAnnouncementsSchema>
export type RouteMatchingInput = z.infer<typeof routeMatchingSchema> 