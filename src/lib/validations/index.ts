/**
 * Schémas de validation centralisés pour l'application EcoDeli
 * Utilise Zod pour la validation type-safe
 */

import { z } from 'zod';

// ===========================================
// SCHÉMAS D'AUTHENTIFICATION
// ===========================================

export const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string(),
  role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']),
  acceptTerms: z.boolean().refine(val => val === true, 'Vous devez accepter les conditions d\'utilisation'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Adresse email invalide'),
});

export const newPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
  confirmPassword: z.string(),
  token: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

// ===========================================
// SCHÉMAS UTILISATEUR
// ===========================================

export const userProfileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().regex(/^(\+33|0)[1-9](\d{8})$/, 'Numéro de téléphone français invalide').optional(),
  address: z.string().min(5, 'L\'adresse doit contenir au moins 5 caractères').optional(),
  city: z.string().min(2, 'La ville doit contenir au moins 2 caractères').optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal invalide (5 chiffres attendus)').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// ===========================================
// SCHÉMAS ANNONCES ET LIVRAISONS
// ===========================================

export const announcementSchema = z.object({
  title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(500, 'La description ne peut pas dépasser 500 caractères'),
  pickupAddress: z.string().min(5, 'L\'adresse de récupération doit contenir au moins 5 caractères'),
  deliveryAddress: z.string().min(5, 'L\'adresse de livraison doit contenir au moins 5 caractères'),
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  deliveryLatitude: z.number().min(-90).max(90),
  deliveryLongitude: z.number().min(-180).max(180),
  maxPrice: z.number().min(1, 'Le prix maximum doit être d\'au moins 1€').max(1000, 'Le prix maximum ne peut pas dépasser 1000€'),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  weight: z.number().min(0.1, 'Le poids minimum est de 0.1kg').max(100, 'Le poids maximum est de 100kg').optional(),
  volume: z.number().min(0.1, 'Le volume minimum est de 0.1L').max(1000, 'Le volume maximum est de 1000L').optional(),
  category: z.enum(['FOOD', 'DOCUMENTS', 'PACKAGES', 'FRAGILE', 'OTHER']),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  pickupDate: z.date().min(new Date(), 'La date de récupération ne peut pas être dans le passé'),
  deliveryDate: z.date(),
  specialInstructions: z.string().max(300, 'Les instructions spéciales ne peuvent pas dépasser 300 caractères').optional(),
}).refine(data => data.deliveryDate > data.pickupDate, {
  message: 'La date de livraison doit être après la date de récupération',
  path: ['deliveryDate'],
});

export const deliveryApplicationSchema = z.object({
  announcementId: z.string().uuid('ID d\'annonce invalide'),
  proposedPrice: z.number().min(1, 'Le prix proposé doit être d\'au moins 1€').max(1000, 'Le prix proposé ne peut pas dépasser 1000€'),
  estimatedDuration: z.number().min(5, 'La durée estimée minimum est de 5 minutes').max(720, 'La durée estimée maximum est de 12 heures'),
  message: z.string().max(300, 'Le message ne peut pas dépasser 300 caractères').optional(),
  vehicleType: z.enum(['BICYCLE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK']),
});

// ===========================================
// SCHÉMAS PAIEMENTS
// ===========================================

export const paymentSchema = z.object({
  amount: z.number().min(0.5, 'Le montant minimum est de 0.50€').max(10000, 'Le montant maximum est de 10,000€'),
  currency: z.enum(['EUR', 'USD']).default('EUR'),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'CASH']),
  description: z.string().max(200, 'La description ne peut pas dépasser 200 caractères').optional(),
});

export const stripePaymentIntentSchema = z.object({
  amount: z.number().min(50), // Montant en centimes, minimum 0.50€
  currency: z.string().length(3),
  paymentMethodId: z.string().optional(),
  escrowTransactionId: z.string().uuid('ID de transaction escrow invalide'),
  metadata: z.record(z.string()).optional(),
});

// ===========================================
// SCHÉMAS SERVICES
// ===========================================

export const serviceSchema = z.object({
  name: z.string().min(3, 'Le nom du service doit contenir au moins 3 caractères').max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères').max(1000, 'La description ne peut pas dépasser 1000 caractères'),
  category: z.enum(['CLEANING', 'REPAIR', 'GARDENING', 'TUTORING', 'BEAUTY', 'HEALTH', 'OTHER']),
  basePrice: z.number().min(5, 'Le prix de base minimum est de 5€').max(500, 'Le prix de base maximum est de 500€'),
  duration: z.number().min(15, 'La durée minimum est de 15 minutes').max(480, 'La durée maximum est de 8 heures'),
  isActive: z.boolean().default(true),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags autorisés').optional(),
});

export const serviceBookingSchema = z.object({
  serviceId: z.string().uuid('ID de service invalide'),
  startTime: z.date().min(new Date(), 'La date de début ne peut pas être dans le passé'),
  endTime: z.date(),
  notes: z.string().max(500, 'Les notes ne peuvent pas dépasser 500 caractères').optional(),
  address: z.string().min(5, 'L\'adresse doit contenir au moins 5 caractères'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).refine(data => data.endTime > data.startTime, {
  message: 'L\'heure de fin doit être après l\'heure de début',
  path: ['endTime'],
});

// ===========================================
// SCHÉMAS GÉOLOCALISATION
// ===========================================

export const locationSchema = z.object({
  latitude: z.number().min(-90, 'Latitude invalide').max(90, 'Latitude invalide'),
  longitude: z.number().min(-180, 'Longitude invalide').max(180, 'Longitude invalide'),
  address: z.string().min(3, 'L\'adresse doit contenir au moins 3 caractères').optional(),
  city: z.string().min(2, 'La ville doit contenir au moins 2 caractères').optional(),
  postalCode: z.string().optional(),
  country: z.string().length(2, 'Code pays invalide (2 lettres attendues)').default('FR'),
});

export const routeOptimizationSchema = z.object({
  startLocation: locationSchema,
  destinations: z.array(locationSchema.extend({
    id: z.string(),
    priority: z.number().min(1).max(5).default(3),
    timeWindow: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
  })).min(1, 'Au moins une destination est requise').max(20, 'Maximum 20 destinations autorisées'),
  vehicleType: z.enum(['BICYCLE', 'SCOOTER', 'CAR', 'VAN', 'TRUCK']).default('CAR'),
  optimizationGoal: z.enum(['SHORTEST_DISTANCE', 'FASTEST_TIME', 'LOWEST_COST']).default('FASTEST_TIME'),
});

// ===========================================
// SCHÉMAS ADMIN
// ===========================================

export const adminUserUpdateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  email: z.string().email('Adresse email invalide').optional(),
  role: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(1000, 'Les notes ne peuvent pas dépasser 1000 caractères').optional(),
});

export const systemConfigSchema = z.object({
  key: z.string().min(1, 'La clé de configuration est requise'),
  value: z.string(),
  description: z.string().max(500, 'La description ne peut pas dépasser 500 caractères').optional(),
  isPublic: z.boolean().default(false),
  category: z.enum(['PAYMENT', 'NOTIFICATION', 'SECURITY', 'PERFORMANCE', 'FEATURE']).default('FEATURE'),
});

// ===========================================
// SCHÉMAS DE VALIDATION DE FICHIERS
// ===========================================

export const fileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB par défaut
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  category: z.enum(['PROFILE_PICTURE', 'DOCUMENT', 'PROOF', 'OTHER']).default('OTHER'),
});

// ===========================================
// SCHÉMAS DE NOTIFICATION
// ===========================================

export const notificationSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  message: z.string().min(1, 'Le message est requis').max(500, 'Le message ne peut pas dépasser 500 caractères'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).default('INFO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  targetRole: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN', 'ALL']).optional(),
  targetUserId: z.string().uuid().optional(),
  scheduledFor: z.date().optional(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

// ===========================================
// TYPES TYPESCRIPT DÉRIVÉS
// ===========================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type UserProfileData = z.infer<typeof userProfileSchema>;
export type AnnouncementData = z.infer<typeof announcementSchema>;
export type DeliveryApplicationData = z.infer<typeof deliveryApplicationSchema>;
export type PaymentData = z.infer<typeof paymentSchema>;
export type ServiceData = z.infer<typeof serviceSchema>;
export type ServiceBookingData = z.infer<typeof serviceBookingSchema>;
export type LocationData = z.infer<typeof locationSchema>;
export type RouteOptimizationData = z.infer<typeof routeOptimizationSchema>;
export type AdminUserUpdateData = z.infer<typeof adminUserUpdateSchema>;
export type SystemConfigData = z.infer<typeof systemConfigSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
export type NotificationData = z.infer<typeof notificationSchema>;

// ===========================================
// UTILITAIRES DE VALIDATION
// ===========================================

/**
 * Valide les données avec gestion d'erreur structurée
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      const errors = result.error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
  } catch (error) {
    return { 
      success: false, 
      errors: ['Erreur de validation inattendue'] 
    };
  }
}

/**
 * Middleware de validation pour les APIs
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => {
    const result = validateWithSchema(schema, data);
    if (!result.success) {
      throw new Error(`Validation échouée: ${result.errors?.join(', ')}`);
    }
    return result.data!;
  };
}