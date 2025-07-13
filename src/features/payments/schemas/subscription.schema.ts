import { z } from "zod";

export const subscriptionPlanSchema = z.enum(["FREE", "STARTER", "PREMIUM"]);

export const subscriptionSchema = z.object({
  plan: subscriptionPlanSchema,
  paymentMethodId: z.string(),
});

export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
