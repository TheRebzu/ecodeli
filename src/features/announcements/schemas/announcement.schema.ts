import { z } from 'zod'

// Types d'annonces - SEULEMENT pour les colis/livraisons selon le cahier des charges EcoDeli
export const announcementTypeSchema = z.enum([
  'PACKAGE_DELIVERY',       // Transport de colis standard
  'DOCUMENT_DELIVERY',      // Transport de documents
  'CART_DROP',              // Lâcher de chariot (service phare EcoDeli)
  'SHOPPING_DELIVERY',      // Livraison de courses
  'AIRPORT_TRANSFER',       // Transfert aéroport avec bagages
  'INTERNATIONAL_PURCHASE', // Achats internationaux à livrer
  'FRAGILE_DELIVERY',       // Livraison d'objets fragiles
  'URGENT_DELIVERY'         // Livraison express/urgente
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

// Schema simplifié pour création d'annonce conforme au cahier des charges
export const createAnnouncementSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit faire au moins 5 caractères')
    .max(100, 'Le titre ne peut dépasser 100 caractères'),
  description: z.string()
    .min(20, 'La description doit faire au moins 20 caractères')
    .max(1000, 'La description ne peut dépasser 1000 caractères'),
  type: z.enum(['PACKAGE', 'TRANSPORT', 'SHOPPING', 'PET_CARE', 'HOME_SERVICE']),
  
  // Adresses
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  
  // Dates
  pickupDate: z.string().datetime('Date de récupération invalide').optional(),
  deliveryDate: z.string().datetime('Date limite de livraison invalide').optional(),
  
  // Tarification
  basePrice: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€'),
  price: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€').optional(),
  currency: z.string().default('EUR'),
  
  // Options
  urgent: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  
  // Détails spécifiques
  packageDetails: z.object({
    weight: z.number().positive().optional(),
    dimensions: z.string().optional(),
    fragile: z.boolean().default(false),
    description: z.string().optional()
  }).optional(),
  
  specialInstructions: z.string().max(500).optional(),
  
  // Compatibilité avec l'ancien format
  startLocation: z.object({
    address: z.string(),
    city: z.string().optional()
  }).optional(),
  endLocation: z.object({
    address: z.string(),
    city: z.string().optional()
  }).optional(),
  desiredDate: z.string().datetime().optional(),
  serviceType: z.string().optional()
})

// Schema pour mise à jour d'annonce
export const updateAnnouncementSchema = z.object({
  id: z.string().min(1, 'ID requis'),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(1000).optional(),
  type: announcementTypeSchema.optional(),
  startLocation: locationSchema.optional(),
  endLocation: locationSchema.optional(),
  desiredDate: z.string().datetime().optional(),
  flexibleDates: z.boolean().optional(),
  dateRangeStart: z.string().datetime().optional(),
  dateRangeEnd: z.string().datetime().optional(),
  price: z.number().positive().max(10000).optional(),
  currency: z.string().optional(),
  urgent: z.boolean().optional(),
  specialInstructions: z.string().max(500).optional(),
  status: announcementStatusSchema.optional(),
  // Détails optionnels selon le type
  packageDetails: packageDetailsSchema.optional(),
  serviceDetails: serviceDetailsSchema.optional(),
  cartDropDetails: cartDropDetailsSchema.optional(),
  shoppingDetails: z.object({
    shoppingList: z.array(z.object({
      item: z.string().min(2),
      quantity: z.number().positive(),
      specifications: z.string().optional()
    })),
    budget: z.number().positive(),
    preferredStores: z.array(z.string()).optional(),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional()
  }).optional()
})

// Schema pour recherche d'annonces
export const searchAnnouncementsSchema = z.object({
  page: z.string().nullable().transform(val => val ? parseInt(val) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().transform(val => val ? parseInt(val) : 20).pipe(z.number().min(1).max(50)),
  type: z.string().nullable().transform(val => val || undefined).pipe(announcementTypeSchema.optional()),
  status: z.string().nullable().transform(val => val || undefined).pipe(announcementStatusSchema.optional()),
  clientId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  priceMin: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().positive().optional()),
  priceMax: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().positive().optional()),
  city: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  urgent: z.string().nullable().transform(val => val === 'true').pipe(z.boolean().optional()),
  sortBy: z.string().nullable().transform(val => val || 'createdAt').pipe(z.enum(['createdAt', 'desiredDate', 'price', 'distance'])),
  sortOrder: z.string().nullable().transform(val => val || 'desc').pipe(z.enum(['asc', 'desc']))
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