import { z } from 'zod'

// ANNONCES - UNIQUEMENT pour le transport d'objets selon le cahier des charges EcoDeli
export const announcementTypeSchema = z.enum([
  'PACKAGE_DELIVERY',       // Transport de colis standard (ex: Paris → Marseille)
  'SHOPPING',               // Courses effectuées par un livreur (liste fournie)
  'INTERNATIONAL_PURCHASE', // Achat de produits à l'étranger (ex: Jelly d'Angleterre)
  'CART_DROP'               // Lâcher de chariot (service phare EcoDeli - livraison depuis commerçant)
])

export type AnnouncementType = z.infer<typeof announcementTypeSchema>

// Statuts d'annonces
export const announcementStatusSchema = z.enum([
  'DRAFT',      // Brouillon
  'ACTIVE',     // Publiée et visible
  'MATCHED',    // Matchée avec un livreur
  'IN_PROGRESS', // En cours de livraison
  'COMPLETED',  // Livraison terminée
  'CANCELLED'   // Annulée
])

export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>

// Types de prise en charge selon EcoDeli
export const deliveryTypeSchema = z.enum([
  'FULL',      // Prise en charge intégrale (point A → point B)
  'PARTIAL',   // Prise en charge partielle (avec relais entrepôts)
  'FINAL'      // Livraison finale (depuis entrepôt → destinataire)
])

export type DeliveryType = z.infer<typeof deliveryTypeSchema>

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

// Détails pour les courses (shopping)
export const shoppingDetailsSchema = z.object({
  shoppingList: z.array(z.object({
    item: z.string().min(2, 'Nom de l\'article requis'),
    quantity: z.number().positive('Quantité positive requise'),
    specifications: z.string().optional()
  })).min(1, 'Au moins un article requis'),
  budget: z.number().positive('Budget requis'),
  preferredStores: z.array(z.string()).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).default('CARD'),
  urgentItems: z.array(z.string()).optional()
})

export type ShoppingDetails = z.infer<typeof shoppingDetailsSchema>

// Détails pour les achats internationaux
export const internationalPurchaseDetailsSchema = z.object({
  country: z.string().min(2, 'Pays d\'achat requis'),
  productDescription: z.string().min(10, 'Description détaillée requise'),
  estimatedValue: z.number().positive('Valeur estimée requise'),
  urgency: z.enum(['NORMAL', 'URGENT', 'VERY_URGENT']).default('NORMAL'),
  customsDeclaration: z.boolean().default(true),
  maxBudget: z.number().positive('Budget maximum requis'),
  specificStore: z.string().optional(),
  brandPreference: z.string().optional()
})

export type InternationalPurchaseDetails = z.infer<typeof internationalPurchaseDetailsSchema>

// Détails pour le lâcher de chariot (service phare EcoDeli)
export const cartDropDetailsSchema = z.object({
  merchantId: z.string().min(1, 'ID commerçant requis'),
  storeName: z.string().min(2, 'Nom du magasin requis'),
  timeSlot: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM requis')
  }),
  deliveryZone: z.string().min(5, 'Zone de livraison requise'),
  orderValue: z.number().positive('Valeur de commande requise'),
  freeDeliveryEligible: z.boolean().default(false),
  contactPhone: z.string().min(10, 'Numéro de téléphone requis'),
  deliveryInstructions: z.string().max(200).optional(),
  cashPayment: z.boolean().default(false) // Si le client paie en espèces à la livraison
})

export type CartDropDetails = z.infer<typeof cartDropDetailsSchema>

// Schema principal pour création d'annonce (TRANSPORT D'OBJETS UNIQUEMENT)
export const createAnnouncementSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit faire au moins 5 caractères')
    .max(100, 'Le titre ne peut dépasser 100 caractères'),
  description: z.string()
    .min(20, 'La description doit faire au moins 20 caractères')
    .max(1000, 'La description ne peut dépasser 1000 caractères'),
  type: announcementTypeSchema,
  deliveryType: deliveryTypeSchema.default('FULL'),
  
  // Adresses obligatoires
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  pickupLatitude: z.number().optional(),
  pickupLongitude: z.number().optional(),
  deliveryLatitude: z.number().optional(),
  deliveryLongitude: z.number().optional(),
  
  // Dates
  pickupDate: z.string().min(1, 'Date de récupération requise'),
  deliveryDate: z.string().optional(),
  isFlexibleDate: z.boolean().default(false),
  
  // Tarification
  basePrice: z.number().positive('Le prix doit être positif').max(10000, 'Prix maximum 10,000€'),
  currency: z.string().default('EUR'),
  isPriceNegotiable: z.boolean().default(false),
  
  // Options
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  allowsPartialDelivery: z.boolean().default(false),
  
  // Détails spécifiques selon le type d'annonce
  packageDetails: packageDetailsSchema.optional(),
  shoppingDetails: shoppingDetailsSchema.optional(),
  internationalPurchaseDetails: internationalPurchaseDetailsSchema.optional(),
  cartDropDetails: cartDropDetailsSchema.optional(),
  
  // Instructions spéciales
  specialInstructions: z.string().max(500).optional(),
  customerNotes: z.string().max(300).optional()
}).refine((data) => {
  // Validation conditionnelle selon le type d'annonce
  if (data.type === 'PACKAGE_DELIVERY' && !data.packageDetails) {
    return false
  }
  if (data.type === 'SHOPPING' && !data.shoppingDetails) {
    return false
  }
  if (data.type === 'INTERNATIONAL_PURCHASE' && !data.internationalPurchaseDetails) {
    return false
  }
  if (data.type === 'CART_DROP' && !data.cartDropDetails) {
    return false
  }
  return true
}, {
  message: "Les détails spécifiques sont requis selon le type d'annonce"
})

// Schema pour mise à jour d'annonce
export const updateAnnouncementSchema = z.object({
  id: z.string().min(1, 'ID requis'),
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(1000).optional(),
  type: announcementTypeSchema.optional(),
  deliveryType: deliveryTypeSchema.optional(),
  pickupAddress: z.string().min(10).optional(),
  deliveryAddress: z.string().min(10).optional(),
  pickupDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  isFlexibleDate: z.boolean().optional(),
  basePrice: z.number().positive().max(10000).optional(),
  currency: z.string().optional(),
  isPriceNegotiable: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  requiresInsurance: z.boolean().optional(),
  allowsPartialDelivery: z.boolean().optional(),
  specialInstructions: z.string().max(500).optional(),
  customerNotes: z.string().max(300).optional(),
  status: announcementStatusSchema.optional(),
  // Détails optionnels selon le type
  packageDetails: packageDetailsSchema.optional(),
  shoppingDetails: shoppingDetailsSchema.optional(),
  internationalPurchaseDetails: internationalPurchaseDetailsSchema.optional(),
  cartDropDetails: cartDropDetailsSchema.optional()
})

// Schema pour recherche d'annonces
export const searchAnnouncementsSchema = z.object({
  page: z.string().nullable().transform(val => val ? parseInt(val) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().transform(val => val ? parseInt(val) : 20).pipe(z.number().min(1).max(50)),
  type: z.string().nullable().transform(val => val || undefined).pipe(announcementTypeSchema.optional()),
  status: z.string().nullable().transform(val => val || undefined).pipe(announcementStatusSchema.optional()),
  deliveryType: z.string().nullable().transform(val => val || undefined).pipe(deliveryTypeSchema.optional()),
  clientId: z.string().nullable().optional(),
  merchantId: z.string().nullable().optional(),
  priceMin: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().positive().optional()),
  priceMax: z.string().nullable().transform(val => val ? parseFloat(val) : undefined).pipe(z.number().positive().optional()),
  city: z.string().nullable().optional(),
  dateFrom: z.string().nullable().optional(),
  dateTo: z.string().nullable().optional(),
  urgent: z.string().nullable().transform(val => val === 'true').pipe(z.boolean().optional()),
  sortBy: z.string().nullable().transform(val => val || 'createdAt').pipe(z.enum(['createdAt', 'pickupDate', 'basePrice', 'distance'])),
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