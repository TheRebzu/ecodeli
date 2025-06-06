import { z } from 'zod';
import { PlanType, SubscriptionStatus } from '@prisma/client';

/**
 * Énumération des types de plans disponibles
 */
export const PlanTypeEnum = z.enum(['FREE', 'STARTER', 'PREMIUM']);

/**
 * Énumération des statuts d'abonnement
 */
export const SubscriptionStatusEnum = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'UNPAID',
  'CANCELLED',
  'TRIAL',
  'ENDED',
]);

/**
 * Schéma principal pour les abonnements
 */
export const SubscriptionSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  status: SubscriptionStatusEnum.default('ACTIVE'),
  planType: PlanTypeEnum,
  stripePriceId: z.string().optional(),
  stripeSubscriptionId: z.string().optional(),
  startDate: z.date().default(() => new Date()),
  endDate: z.date().optional(),
  autoRenew: z.boolean().default(true),
  cancelAtPeriodEnd: z.boolean().default(false),
  trialEndsAt: z.date().optional(),
  cancelledAt: z.date().optional(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  planName: z.string().optional(),
  planDescription: z.string().optional(),
  planFeatures: z.array(z.string()).optional(),
  planPrice: z.number().optional(),
  discountPercent: z.number().optional(),
  insuranceAmount: z.number().optional(),
  isPriority: z.boolean().default(false),
  previousPlanType: PlanTypeEnum.optional(),
  downgradedFrom: z.string().optional(),
  upgradedFrom: z.string().optional(),
  planChangedAt: z.date().optional(),
});

/**
 * Schéma de base pour les abonnements
 */
export const subscriptionBaseSchema = z.object({
  userId: z.string().cuid(),
  planType: z.nativeEnum(PlanType),
});

/**
 * Schéma pour la création d'un abonnement
 */
export const subscriptionCreateSchema = z
  .object({
    userId: z.string().cuid('ID utilisateur invalide'),
    planType: z.nativeEnum(PlanType),
    startDate: z.date().default(() => new Date()),
    autoRenew: z.boolean().default(true),
    currency: z.string().default('EUR'),
    couponCode: z.string().optional(),
    paymentMethodId: z.string().optional(),

    // Si un plan Custom est choisi, ces champs sont obligatoires
    customPlanFeatures: z.record(z.any()).optional(),

    // Champs spécifiques pour le mode démonstration
    isDemo: z.boolean().default(true),
    demoSuccessScenario: z.boolean().default(true).optional(),
  })
  .refine(
    data => {
      // Vérification que customPlanFeatures est défini si planType est CUSTOM
      return data.customPlanFeatures !== undefined || data.planType !== PlanType.CUSTOM;
    },
    {
      message: 'Les caractéristiques du plan personnalisé sont requises pour un abonnement Custom',
      path: ['customPlanFeatures'],
    }
  );

/**
 * Schéma pour la mise à jour d'un abonnement
 */
export const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  autoRenew: z.boolean().optional(),
  planType: z.nativeEnum(PlanType).optional(),
  paymentMethodId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Schéma pour l'annulation d'un abonnement
 */
export const subscriptionCancelSchema = z.object({
  subscriptionId: z.string().cuid('ID abonnement invalide'),
  cancelAtPeriodEnd: z.boolean().default(true),
  reason: z.string().optional(),
  provideFeedback: z.boolean().default(false),
  feedbackContent: z.string().optional(),

  // Champs spécifiques pour le mode démonstration
  isDemo: z.boolean().default(true),
});

/**
 * Schéma pour la réactivation d'un abonnement
 */
export const subscriptionReactivateSchema = z.object({
  subscriptionId: z.string().cuid('ID abonnement invalide'),

  // Champs spécifiques pour le mode démonstration
  isDemo: z.boolean().default(true),
  demoSuccessScenario: z.boolean().default(true).optional(),
});

/**
 * Schéma pour le changement de plan
 */
export const subscriptionChangeSchema = z
  .object({
    subscriptionId: z.string().cuid('ID abonnement invalide'),
    newPlanType: z.nativeEnum(PlanType),
    effectiveDate: z
      .date()
      .optional()
      .default(() => new Date()),
    prorated: z.boolean().default(true),
    keepExistingFeatures: z.boolean().default(false),

    // Pour les plans Custom
    customPlanFeatures: z.record(z.any()).optional(),

    // Champs spécifiques pour le mode démonstration
    isDemo: z.boolean().default(true),
    demoSuccessScenario: z.boolean().default(true).optional(),
  })
  .refine(
    data => {
      // Vérification que customPlanFeatures est défini si newPlanType est CUSTOM
      return data.customPlanFeatures !== undefined || data.newPlanType !== PlanType.CUSTOM;
    },
    {
      message: 'Les caractéristiques du plan personnalisé sont requises pour un abonnement Custom',
      path: ['customPlanFeatures'],
    }
  );

/**
 * Schéma pour l'application d'un coupon
 */
export const applyCouponSchema = z.object({
  subscriptionId: z.string().cuid(),
  couponCode: z.string(),
});

/**
 * Schéma pour la pause d'un abonnement
 */
export const pauseSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
  resumeDate: z.date().optional(),
  reason: z.string().optional(),
});

/**
 * Schéma pour la reprise d'un abonnement
 */
export const resumeSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid(),
});

/**
 * Schéma pour récupérer les détails d'un abonnement
 */
export const getSubscriptionSchema = z.object({
  subscriptionId: z.string().cuid('ID abonnement invalide'),
});

/**
 * Schéma pour la recherche d'abonnements
 */
export const searchSubscriptionsSchema = z.object({
  planType: z.nativeEnum(PlanType).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Schéma pour la définition des plans d'abonnement
 */
export const subscriptionPlanSchema = z.object({
  type: z.nativeEnum(PlanType),
  name: z.string(),
  description: z.string(),
  priceMonthly: z.number().positive(),
  priceYearly: z.number().positive().optional(),
  currency: z.string().default('EUR'),
  features: z.array(z.string()),
  metaFeatures: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  discountPercent: z.number().min(0).max(100).optional(),
  insuranceAmount: z.number().min(0).optional(),
  isPriority: z.boolean().default(false),
  trialDays: z.number().int().min(0).default(0),
  isPublic: z.boolean().default(true),
});

/**
 * Schéma pour ajouter ou modifier des fonctionnalités personnalisées
 */
export const customPlanFeaturesSchema = z.object({
  subscriptionId: z.string().cuid(),
  features: z.record(z.any()),
});

/**
 * Schéma pour générer un rapport d'abonnements
 */
export const subscriptionReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['PLAN', 'STATUS', 'DAY', 'WEEK', 'MONTH']).default('PLAN'),
  includeMetrics: z.boolean().default(true),
});

/**
 * Configuration des plans d'abonnement
 */
export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    description: 'Accès aux fonctionnalités de base',
    price: 0,
    stripePriceId: '',
    features: [
      'Accès limité aux services de livraison',
      'Assurance limitée',
      'Support client standard',
    ],
    insuranceAmount: 50,
    discountPercent: 0,
    priority: false,
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    description: 'Parfait pour une utilisation régulière',
    price: 9.9,
    stripePriceId: 'price_starter_mensuel',
    features: [
      'Accès complet aux services de livraison',
      "Assurance jusqu'à 115€ par envoi",
      "Réduction de 5% sur les frais d'envoi",
      'Support client prioritaire',
    ],
    insuranceAmount: 115,
    discountPercent: 5,
    priority: false,
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    description: 'Pour les utilisateurs fréquents',
    price: 19.99,
    stripePriceId: 'price_premium_mensuel',
    features: [
      'Accès illimité à tous les services',
      "Assurance jusqu'à 3000€ par envoi",
      'Réduction de 9% sur tous les frais',
      'Support client VIP',
      'Livraisons prioritaires',
      'Accès aux promotions exclusives',
    ],
    insuranceAmount: 3000,
    discountPercent: 9,
    priority: true,
  },
};

// Exports des types
export type PlanTypeEnum = z.infer<typeof PlanTypeEnum>;
export type SubscriptionStatusEnum = z.infer<typeof SubscriptionStatusEnum>;
export type SubscriptionSchemaType = z.infer<typeof SubscriptionSchema>;
export type CreateSubscriptionInput = z.infer<typeof subscriptionCreateSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof subscriptionCancelSchema>;
export type ReactivateSubscriptionInput = z.infer<typeof subscriptionReactivateSchema>;
export type ChangePlanInput = z.infer<typeof subscriptionChangeSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type PauseSubscriptionInput = z.infer<typeof pauseSubscriptionSchema>;
export type ResumeSubscriptionInput = z.infer<typeof resumeSubscriptionSchema>;
export type GetSubscriptionInput = z.infer<typeof getSubscriptionSchema>;
export type SearchSubscriptionsInput = z.infer<typeof searchSubscriptionsSchema>;
export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanSchema>;
export type CustomPlanFeaturesInput = z.infer<typeof customPlanFeaturesSchema>;
export type SubscriptionReportInput = z.infer<typeof subscriptionReportSchema>;

// Plans d'abonnement selon l'ANNEXE 4
export const subscriptionPlans = [
  {
    type: 'FREE',
    name: 'Gratuit',
    description: 'Accès de base aux services EcoDeli',
    priceMonthly: 0,
    features: ['Accès à la plateforme', 'Livraisons standards', "Assurance limitée (jusqu'à 115€)"],
    insuranceAmount: 115,
    discountPercent: 0,
    isPriority: false,
  },
  {
    type: 'STARTER',
    name: 'Starter',
    description: 'Idéal pour les utilisateurs réguliers',
    priceMonthly: 9.9,
    features: [
      'Tous les avantages du forfait Gratuit',
      "Assurance standard (jusqu'à 115€)",
      'Réduction de 5% sur toutes les commandes',
      'Support client prioritaire',
    ],
    insuranceAmount: 115,
    discountPercent: 5,
    isPriority: false,
  },
  {
    type: 'PREMIUM',
    name: 'Premium',
    description: 'Notre meilleure offre pour les utilisateurs exigeants',
    priceMonthly: 19.99,
    features: [
      'Tous les avantages du forfait Starter',
      "Assurance premium (jusqu'à 3000€)",
      'Réduction de 9% sur toutes les commandes',
      'Service client ultra-prioritaire',
      'Livraisons express illimitées',
    ],
    insuranceAmount: 3000,
    discountPercent: 9,
    isPriority: true,
  },
  {
    type: 'CUSTOM',
    name: 'Sur mesure',
    description: 'Plan personnalisé pour les besoins spécifiques',
    priceMonthly: null, // Prix sur mesure
    features: [
      'Fonctionnalités personnalisées',
      'Assurance sur mesure',
      'Tarification adaptée à vos besoins',
    ],
    isPublic: false,
  },
];

// Schéma pour filtrer les abonnements
export const subscriptionFilterSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide').optional(),
  planType: z.nativeEnum(PlanType).optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  startDateFrom: z.date().optional(),
  startDateTo: z.date().optional(),
  endDateFrom: z.date().optional(),
  endDateTo: z.date().optional(),
  autoRenew: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schéma pour appliquer une réduction à un abonnement
export const applyDiscountSchema = z.object({
  subscriptionId: z.string().cuid('ID abonnement invalide'),
  discountPercent: z.number().min(1).max(100),
  discountDurationMonths: z.number().int().min(1).max(12).optional(),
  reason: z.string().optional(),

  // Champs spécifiques pour le mode démonstration
  isDemo: z.boolean().default(true),
  demoSuccessScenario: z.boolean().default(true).optional(),
});
