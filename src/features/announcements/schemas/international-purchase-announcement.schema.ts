import { z } from 'zod'

// Schéma pour les détails d'achat international
export const internationalPurchaseDetailsSchema = z.object({
  // Informations destination
  originCountry: z.string().min(2).max(3), // Code pays ISO
  destinationCountry: z.string().min(2).max(3).default('FR'),
  
  // Détails des articles à acheter
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(500),
    category: z.enum([
      'ELECTRONICS', 'CLOTHING', 'BOOKS', 'COSMETICS', 'FOOD',
      'SUPPLEMENTS', 'ACCESSORIES', 'HOME_GOODS', 'TOYS', 'OTHER'
    ]),
    brand: z.string().optional(),
    model: z.string().optional(),
    size: z.string().optional(),
    color: z.string().optional(),
    quantity: z.number().positive().max(100),
    estimatedPrice: z.number().positive(),
    currency: z.string().length(3).default('USD'),
    
    // Informations produit spécifiques
    weight: z.number().positive().optional(), // kg
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    }).optional(),
    
    // Liens et références
    productUrl: z.string().url().optional(),
    productImages: z.array(z.string().url()).max(5).default([]),
    productCode: z.string().optional(),
    
    // Préférences d'achat
    acceptAlternatives: z.boolean().default(false),
    alternativeInstructions: z.string().max(300).optional(),
    maxPriceAcceptable: z.number().positive().optional(),
    
    // Restrictions et notes
    isFragile: z.boolean().default(false),
    requiresSpecialHandling: z.boolean().default(false),
    handlingInstructions: z.string().optional(),
    notes: z.string().max(300).optional()
  })).min(1).max(20),
  
  // Budget et paiement
  totalBudget: z.number().positive(),
  budgetCurrency: z.string().length(3).default('EUR'),
  includesShippingInBudget: z.boolean().default(true),
  includesTaxesInBudget: z.boolean().default(false),
  
  paymentMethod: z.enum(['PLATFORM_WALLET', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE']),
  advancePaymentPercentage: z.number().min(0).max(100).default(50), // % à payer à l'avance
  
  // Informations shopping
  preferredStores: z.array(z.object({
    name: z.string(),
    website: z.string().url().optional(),
    address: z.string().optional(),
    notes: z.string().optional()
  })).default([]),
  
  storesToAvoid: z.array(z.string()).default([]),
  acceptsOnlineOnly: z.boolean().default(true),
  acceptsPhysicalStores: z.boolean().default(true),
  
  // Timing et livraison
  purchaseDeadline: z.string().datetime(),
  estimatedPurchaseDate: z.string().datetime().optional(),
  deliveryDeadline: z.string().datetime(),
  isFlexibleOnDates: z.boolean().default(false),
  
  // Méthode d'expédition
  shippingMethod: z.enum([
    'STANDARD_POST', 'EXPRESS_POST', 'DHL', 'FEDEX', 'UPS',
    'PERSONAL_CARRY', 'LOCAL_DELIVERY', 'COLLECT_IN_PERSON'
  ]),
  
  trackingRequired: z.boolean().default(true),
  insuranceRequired: z.boolean().default(false),
  signatureRequired: z.boolean().default(false),
  
  // Adresses
  deliveryAddress: z.object({
    recipientName: z.string().min(1),
    company: z.string().optional(),
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2).max(3),
    phone: z.string().min(10),
    email: z.string().email(),
    deliveryInstructions: z.string().max(300).optional()
  }),
  
  // Déclaration douanière
  customsDeclaration: z.object({
    declaredValue: z.number().positive(),
    declaredCurrency: z.string().length(3),
    description: z.string().min(10).max(200),
    category: z.enum(['GIFT', 'COMMERCIAL', 'PERSONAL_USE', 'SAMPLE']),
    
    // Documents requis
    requiresInvoice: z.boolean().default(true),
    requiresCertificateOfOrigin: z.boolean().default(false),
    requiresImportLicense: z.boolean().default(false),
    additionalDocuments: z.array(z.string()).default([]),
    
    // Restrictions
    hasRestrictions: z.boolean().default(false),
    restrictionDetails: z.string().max(500).optional(),
    requiresSpecialPermits: z.boolean().default(false),
    permitDetails: z.string().optional()
  }),
  
  // Taxes et frais
  estimatedCustomsDuty: z.number().min(0).optional(),
  estimatedVAT: z.number().min(0).optional(),
  handlingFeesIncluded: z.boolean().default(false),
  
  // Autorisations et limites
  maxSpendingDeviation: z.number().min(0).max(50).default(10), // % d'écart autorisé
  requiresApprovalBeforePurchase: z.boolean().default(true),
  canSubstituteItems: z.boolean().default(false),
  
  // Communication et suivi
  preferredLanguage: z.enum(['FR', 'EN', 'ES', 'DE', 'IT']).default('FR'),
  requiresRegularUpdates: z.boolean().default(true),
  updateFrequency: z.enum(['DAILY', 'EVERY_2_DAYS', 'WEEKLY']).default('EVERY_2_DAYS'),
  
  // Expérience requise du shopper
  requiresExperiencedShopper: z.boolean().default(false),
  minimumShopperRating: z.number().min(1).max(5).optional(),
  requiresLocalKnowledge: z.boolean().default(false),
  languageRequirements: z.array(z.string()).default([]),
  
  // Assurance et garantie
  requiresInsurance: z.boolean().default(true),
  insuranceValue: z.number().positive().optional(),
  warrantyRequired: z.boolean().default(false),
  returnPolicy: z.enum(['NO_RETURNS', 'STORE_POLICY', 'FULL_REFUND']).default('STORE_POLICY'),
  
  // Documents et preuves
  requiresPurchaseReceipts: z.boolean().default(true),
  requiresPhotosOfItems: z.boolean().default(true),
  requiresUnboxingVideo: z.boolean().default(false),
  requiresItemAuthentication: z.boolean().default(false),
  
  // Instructions spéciales
  specialInstructions: z.string().max(1000).optional(),
  allergies: z.array(z.string()).default([]),
  dietaryRestrictions: z.array(z.string()).default([]),
  
  // Urgence
  isUrgent: z.boolean().default(false),
  urgencyReason: z.string().max(200).optional(),
  rushFeeAccepted: z.number().min(0).optional(),
  
  // Conformité et légalité
  confirmsLegalCompliance: z.boolean(),
  confirmsNoProhibitedItems: z.boolean(),
  acceptsCustomsRisk: z.boolean(),
  understands ImportRegulations: z.boolean()
})

// Schéma complet pour une annonce d'achat international
export const internationalPurchaseAnnouncementSchema = z.object({
  // Champs de base
  title: z.string().min(15).max(150),
  description: z.string().min(100).max(2000),
  type: z.literal('INTERNATIONAL_PURCHASE'),
  
  // Détails spécifiques achat international
  purchaseDetails: internationalPurchaseDetailsSchema,
  
  // Tarification
  basePrice: z.number().positive(),
  currency: z.string().default('EUR'),
  serviceFeePercentage: z.number().min(5).max(25).default(15), // % de commission
  
  // Commission et frais
  shoppingFee: z.number().positive().optional(),
  expeditionFee: z.number().positive().optional(),
  customsHandlingFee: z.number().positive().optional(),
  insuranceFee: z.number().positive().optional(),
  
  // Options de service
  includesPersonalShopping: z.boolean().default(true),
  includesCustomsHandling: z.boolean().default(true),
  includesQualityCheck: z.boolean().default(true),
  includesRepackaging: z.boolean().default(false),
  
  // Garanties et protection
  offersPurchaseProtection: z.boolean().default(true),
  offersMoneyBackGuarantee: z.boolean().default(false),
  protectionDurationDays: z.number().positive().default(30),
  
  // Délais et planning
  estimatedCompletionDays: z.number().positive().max(90),
  maxDelayAcceptable: z.number().positive().default(7), // jours
  
  // Communication
  preferredCommunicationLanguage: z.enum(['FR', 'EN']).default('FR'),
  requiresVideoCall: z.boolean().default(false),
  providesLiveUpdates: z.boolean().default(true)
})

export type InternationalPurchaseDetails = z.infer<typeof internationalPurchaseDetailsSchema>
export type InternationalPurchaseAnnouncement = z.infer<typeof internationalPurchaseAnnouncementSchema>