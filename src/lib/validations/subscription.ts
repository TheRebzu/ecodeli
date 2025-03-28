import { z } from "zod";

// Subscription plans
export const SubscriptionPlanEnum = z.enum([
  "BASIC",     // Plan de base
  "STANDARD",  // Plan standard
  "PREMIUM",   // Plan premium
  "BUSINESS"   // Plan entreprise
]);

export type SubscriptionPlan = z.infer<typeof SubscriptionPlanEnum>;

// Subscription periods
export const SubscriptionPeriodEnum = z.enum([
  "MONTHLY",   // Abonnement mensuel
  "QUARTERLY", // Abonnement trimestriel
  "BIANNUAL",  // Abonnement semestriel
  "ANNUAL"     // Abonnement annuel
]);

export type SubscriptionPeriod = z.infer<typeof SubscriptionPeriodEnum>;

// Subscription status
export const SubscriptionStatusEnum = z.enum([
  "ACTIVE",    // Abonnement actif
  "PENDING",   // En attente de paiement
  "CANCELLED", // Annulé par l'utilisateur
  "EXPIRED",   // Expiré
  "SUSPENDED"  // Suspendu (problème de paiement)
]);

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;

// Subscription creation validation schema
export const subscriptionCreateSchema = z.object({
  planId: z.string().uuid({ message: "ID de plan invalide" }),
  period: SubscriptionPeriodEnum.default("MONTHLY"),
  autoRenew: z.boolean().default(true),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional(),
  startImmediately: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
});

export type SubscriptionCreateData = z.infer<typeof subscriptionCreateSchema>;

// Subscription update validation schema
export const subscriptionUpdateSchema = z.object({
  id: z.string().uuid({ message: "ID d'abonnement invalide" }),
  planId: z.string().uuid({ message: "ID de plan invalide" }).optional(),
  period: SubscriptionPeriodEnum.optional(),
  autoRenew: z.boolean().optional(),
  paymentMethodId: z.string().optional(),
});

export type SubscriptionUpdateData = z.infer<typeof subscriptionUpdateSchema>;

// Subscription plan selection validation schema
export const planSelectionSchema = z.object({
  planId: z.string().uuid({ message: "ID de plan invalide" }),
  period: SubscriptionPeriodEnum.default("MONTHLY"),
});

export type PlanSelectionData = z.infer<typeof planSelectionSchema>;

// Subscription cancellation validation schema
export const subscriptionCancelSchema = z.object({
  id: z.string().uuid({ message: "ID d'abonnement invalide" }),
  reason: z.string().optional(),
  feedbackRating: z.number().min(1).max(5).optional(),
  cancelImmediately: z.boolean().default(false),
});

export type SubscriptionCancelData = z.infer<typeof subscriptionCancelSchema>;

// Subscription features access validation schema
export const featureAccessSchema = z.object({
  subscriptionId: z.string().uuid({ message: "ID d'abonnement invalide" }),
  featureKey: z.string(),
});

export type FeatureAccessData = z.infer<typeof featureAccessSchema>; 