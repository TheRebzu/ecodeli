import { z } from 'zod'

// Statuts des livraisons selon le workflow EcoDeli
export const deliveryStatusSchema = z.enum([
  'PENDING',        // En attente d'acceptation par livreur
  'ACCEPTED',       // Acceptée par le livreur
  'PICKED_UP',      // Colis récupéré chez l'expéditeur
  'IN_TRANSIT',     // En cours de transport
  'AT_WAREHOUSE',   // Dans un entrepôt EcoDeli (livraison partielle)
  'OUT_FOR_DELIVERY', // En cours de livraison finale
  'DELIVERED',      // Livré avec succès
  'FAILED',         // Échec de livraison
  'CANCELLED',      // Annulée
  'RETURNED'        // Retournée à l'expéditeur
])

export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>

// Types de livraison selon EcoDeli
export const deliveryTypeSchema = z.enum([
  'COMPLETE',       // Prise en charge intégrale (point A → point B)
  'PARTIAL_PICKUP', // Prise en charge partielle (A → entrepôt)
  'PARTIAL_DELIVERY', // Livraison finale (entrepôt → B)
  'RELAY'           // Via multiple entrepôts
])

export type DeliveryType = z.infer<typeof deliveryTypeSchema>

// Schéma pour la géolocalisation temps réel
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  timestamp: z.string().datetime(),
  accuracy: z.number().positive().optional() // en mètres
})

export type Location = z.infer<typeof locationSchema>

// Schéma pour la création d'une livraison
export const createDeliverySchema = z.object({
  announcementId: z.string().min(1, 'ID annonce requis'),
  delivererId: z.string().min(1, 'ID livreur requis'),
  type: deliveryTypeSchema,
  
  // Adresses
  pickupAddress: z.object({
    street: z.string().min(5, 'Adresse de récupération requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    country: z.string().default('FR'),
    coordinates: locationSchema.optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    instructions: z.string().max(500).optional()
  }),
  
  deliveryAddress: z.object({
    street: z.string().min(5, 'Adresse de livraison requise'),
    city: z.string().min(2, 'Ville requise'),
    postalCode: z.string().min(5, 'Code postal requis'),
    country: z.string().default('FR'),
    coordinates: locationSchema.optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    instructions: z.string().max(500).optional()
  }),
  
  // Dates et horaires
  scheduledPickupAt: z.string().datetime('Date de récupération invalide'),
  estimatedDeliveryAt: z.string().datetime('Date de livraison estimée invalide'),
  
  // Détails du colis/service
  packageDetails: z.object({
    weight: z.number().positive('Poids requis').max(50, 'Maximum 50kg'),
    dimensions: z.object({
      length: z.number().positive().max(200, 'Maximum 200cm'),
      width: z.number().positive().max(200, 'Maximum 200cm'),
      height: z.number().positive().max(200, 'Maximum 200cm')
    }),
    fragile: z.boolean().default(false),
    description: z.string().min(5, 'Description du contenu requise'),
    value: z.number().positive().optional(), // Pour assurance
    specialHandling: z.string().max(200).optional()
  }).optional(),
  
  // Tarification
  basePrice: z.number().positive('Prix de base requis'),
  deliveryFee: z.number().positive('Frais de livraison requis'),
  insuranceFee: z.number().min(0).default(0),
  urgentFee: z.number().min(0).default(0),
  totalPrice: z.number().positive('Prix total requis'),
  
  // Options
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  allowPartialDelivery: z.boolean().default(true),
  
  // Instructions spéciales
  deliveryInstructions: z.string().max(500).optional(),
  clientNotes: z.string().max(300).optional()
})

// Schéma pour la mise à jour du statut
export const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().min(1, 'ID livraison requis'),
  status: deliveryStatusSchema,
  location: locationSchema.optional(),
  notes: z.string().max(500).optional(),
  proofPhotos: z.array(z.string().url()).max(5).optional(),
  timestamp: z.string().datetime().optional()
})

// Schéma pour la validation par code 6 chiffres (CRITIQUE)
export const validateDeliveryCodeSchema = z.object({
  deliveryId: z.string().min(1, 'ID livraison requis'),
  validationCode: z.string()
    .length(6, 'Le code doit faire exactement 6 chiffres')
    .regex(/^\d{6}$/, 'Le code ne doit contenir que des chiffres'),
  location: locationSchema.optional(),
  signature: z.string().optional(), // Signature digitale
  proofPhoto: z.string().url().optional(),
  clientId: z.string().min(1, 'ID client requis pour validation')
})

// Schéma pour le suivi temps réel
export const trackingUpdateSchema = z.object({
  deliveryId: z.string().min(1, 'ID livraison requis'),
  status: deliveryStatusSchema,
  message: z.string().min(1, 'Message de suivi requis'),
  location: locationSchema.optional(),
  estimatedArrival: z.string().datetime().optional(),
  delay: z.number().optional(), // en minutes
  isAutomatic: z.boolean().default(false), // Mise à jour automatique ou manuelle
  metadata: z.record(z.any()).optional() // Données additionnelles
})

// Schéma pour les preuves de livraison
export const proofOfDeliverySchema = z.object({
  deliveryId: z.string().min(1, 'ID livraison requis'),
  photos: z.array(z.object({
    url: z.string().url('URL photo invalide'),
    caption: z.string().max(100).optional(),
    timestamp: z.string().datetime()
  })).min(1, 'Au moins une photo requise').max(5, 'Maximum 5 photos'),
  signature: z.object({
    dataUrl: z.string().min(1, 'Signature requise'),
    signerName: z.string().min(2, 'Nom du signataire requis'),
    timestamp: z.string().datetime()
  }).optional(),
  recipientInfo: z.object({
    name: z.string().min(2, 'Nom du destinataire requis'),
    relation: z.enum(['RECIPIENT', 'FAMILY', 'NEIGHBOR', 'CONCIERGE', 'OTHER']),
    comment: z.string().max(200).optional()
  }),
  deliveryCondition: z.enum(['PERFECT', 'GOOD', 'DAMAGED', 'PARTIAL']),
  notes: z.string().max(300).optional()
})

// Schéma pour la recherche de livraisons
export const searchDeliveriesSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  
  // Filtres par rôle
  clientId: z.string().optional(),
  delivererId: z.string().optional(),
  announcementId: z.string().optional(),
  
  // Filtres par statut et type
  status: deliveryStatusSchema.optional(),
  type: deliveryTypeSchema.optional(),
  
  // Filtres par date
  scheduledFrom: z.string().datetime().optional(),
  scheduledTo: z.string().datetime().optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  
  // Filtres géographiques
  pickupCity: z.string().optional(),
  deliveryCity: z.string().optional(),
  
  // Filtres par prix
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  
  // Options
  urgent: z.coerce.boolean().optional(),
  insured: z.coerce.boolean().optional(),
  
  // Tri
  sortBy: z.enum(['createdAt', 'scheduledPickupAt', 'estimatedDeliveryAt', 'totalPrice', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Schéma pour l'estimation de prix automatique
export const priceEstimationSchema = z.object({
  pickupAddress: z.object({
    city: z.string().min(2),
    postalCode: z.string().min(5),
    coordinates: locationSchema.optional()
  }),
  deliveryAddress: z.object({
    city: z.string().min(2),
    postalCode: z.string().min(5),
    coordinates: locationSchema.optional()
  }),
  packageDetails: z.object({
    weight: z.number().positive().max(50),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    }),
    value: z.number().positive().optional()
  }),
  deliveryType: deliveryTypeSchema,
  isUrgent: z.boolean().default(false),
  requiresInsurance: z.boolean().default(false),
  subscriptionPlan: z.enum(['FREE', 'STARTER', 'PREMIUM']).default('FREE')
})

// Schéma pour les réclamations
export const deliveryClaimSchema = z.object({
  deliveryId: z.string().min(1, 'ID livraison requis'),
  type: z.enum(['DELAY', 'DAMAGE', 'LOST', 'WRONG_ADDRESS', 'POOR_SERVICE', 'OTHER']),
  description: z.string().min(20, 'Description détaillée requise').max(1000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  evidence: z.array(z.object({
    type: z.enum(['PHOTO', 'VIDEO', 'DOCUMENT']),
    url: z.string().url(),
    description: z.string().optional()
  })).max(10).optional(),
  requestedResolution: z.enum(['REFUND', 'REDELIVERY', 'COMPENSATION', 'EXPLANATION']),
  clientContact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    preferredMethod: z.enum(['PHONE', 'EMAIL', 'SMS'])
  })
})

// Types d'export
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>
export type ValidateDeliveryCodeInput = z.infer<typeof validateDeliveryCodeSchema>
export type TrackingUpdateInput = z.infer<typeof trackingUpdateSchema>
export type ProofOfDeliveryInput = z.infer<typeof proofOfDeliverySchema>
export type SearchDeliveriesInput = z.infer<typeof searchDeliveriesSchema>
export type PriceEstimationInput = z.infer<typeof priceEstimationSchema>
export type DeliveryClaimInput = z.infer<typeof deliveryClaimSchema> 