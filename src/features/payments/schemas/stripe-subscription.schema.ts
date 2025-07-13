import { z } from "zod";

export const subscriptionPlanSchema = z.enum(["FREE", "STARTER", "PREMIUM"]);

export const createStripeSubscriptionSchema = z.object({
  planId: z.enum(["STARTER", "PREMIUM"]),
  paymentMethodId: z.string().min(1, "Payment method is required"),
  returnUrl: z.string().url().optional(),
});

export const updateStripeSubscriptionSchema = z.object({
  planId: subscriptionPlanSchema,
  prorate: z.boolean().default(true),
});

export const stripeCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

export const stripeSubscriptionEventSchema = z.object({
  id: z.string(),
  object: z.literal("subscription"),
  status: z.enum([
    "active",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "trialing",
    "unpaid",
  ]),
  customer: z.string(),
  items: z.object({
    data: z.array(
      z.object({
        price: z.object({
          id: z.string(),
          lookup_key: z.string().optional(),
        }),
      }),
    ),
  }),
  current_period_start: z.number(),
  current_period_end: z.number(),
  metadata: z.record(z.string()).optional(),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

export const subscriptionUsageSchema = z.object({
  deliveries: z.number().int().min(0),
  savings: z.number().min(0),
  priorityShipments: z.number().int().min(0),
  insuranceUsed: z.number().min(0),
});

export const subscriptionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: subscriptionPlanSchema,
  status: z.enum(["active", "inactive", "expired", "cancelled"]),
  startDate: z.date(),
  endDate: z.date().nullable(),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  autoRenew: z.boolean(),
  currentPeriodStart: z.date().optional(),
  currentPeriodEnd: z.date().optional(),
  usage: z.object({
    thisMonth: subscriptionUsageSchema,
    lastMonth: subscriptionUsageSchema,
  }),
});

// Type exports
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type CreateStripeSubscriptionInput = z.infer<
  typeof createStripeSubscriptionSchema
>;
export type UpdateStripeSubscriptionInput = z.infer<
  typeof updateStripeSubscriptionSchema
>;
export type StripeCustomerInput = z.infer<typeof stripeCustomerSchema>;
export type StripeSubscriptionEvent = z.infer<
  typeof stripeSubscriptionEventSchema
>;
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
export type SubscriptionUsage = z.infer<typeof subscriptionUsageSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;

// Helper functions for validation
export const validateSubscriptionPlan = (
  plan: string,
): plan is SubscriptionPlan => {
  return subscriptionPlanSchema.safeParse(plan).success;
};

export const validateStripeEvent = (event: unknown): event is WebhookEvent => {
  return webhookEventSchema.safeParse(event).success;
};

// Subscription feature validation
export const subscriptionFeaturesSchema = z.object({
  insurance: z.number().min(0),
  discount: z.number().min(0).max(100),
  priorityShipping: z.boolean(),
  priorityShippingDiscount: z.number().min(0).max(100),
  permanentDiscount: z.number().min(0).max(100),
  firstShipmentFree: z.boolean().optional(),
});

export type SubscriptionFeatures = z.infer<typeof subscriptionFeaturesSchema>;
