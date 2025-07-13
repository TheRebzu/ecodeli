import { SubscriptionPlan } from "@/features/payments/types/subscription.types";

declare const process: {
  env: Record<string, string | undefined>;
};

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  FREE: {
    id: "free",
    name: "Free",
    price: 0,
    currency: "EUR",
    interval: "month",
    stripePriceId: null,
    features: {
      insurance: 0,
      discount: 0,
      priorityShipping: false,
      priorityShippingDiscount: 15, // +15% surcoût
      permanentDiscount: 0,
    },
    limits: {
      maxShipments: null,
      freeShipments: 0,
    },
  },
  STARTER: {
    id: "starter",
    name: "Starter",
    price: 9.9,
    currency: "EUR",
    interval: "month",
    stripePriceId:
      process.env.STRIPE_STARTER_PRICE_ID || "price_1RiXwZGhcgIsYtVUxr7wg44d",
    features: {
      insurance: 115, // €/envoi
      discount: 5, // %
      priorityShipping: true,
      priorityShippingDiscount: 5, // +5% surcoût
      permanentDiscount: 5, // % sur petits colis
    },
    limits: {
      maxShipments: null,
      freeShipments: 0,
    },
  },
  PREMIUM: {
    id: "premium",
    name: "Premium",
    price: 19.99,
    currency: "EUR",
    interval: "month",
    stripePriceId:
      process.env.STRIPE_PREMIUM_PRICE_ID || "price_1RiXwZGhcgIsYtVUnNUIAomh",
    features: {
      insurance: 3000, // €/envoi max (au-delà +75€)
      discount: 9, // %
      priorityShipping: true,
      priorityShippingDiscount: 5, // +5% surcoût après 3 gratuits
      permanentDiscount: 5, // % sur tous colis
      firstShipmentFree: true, // si < 150€
    },
    limits: {
      maxShipments: null,
      freeShipments: 3, // envois prioritaires gratuits/mois
    },
  },
};

export const getSubscriptionPlan = (
  planId: string,
): SubscriptionPlan | null => {
  return SUBSCRIPTION_PLANS[planId.toUpperCase()] || null;
};

export const calculatePlanPrice = (
  planId: string,
  basePrice: number,
): number => {
  const plan = getSubscriptionPlan(planId);
  if (!plan) return basePrice;

  const discount = plan.features.discount / 100;
  return basePrice * (1 - discount);
};

export const calculateInsuranceFee = (
  planId: string,
  itemValue: number,
): number => {
  const plan = getSubscriptionPlan(planId);
  if (!plan) return 0;

  // Plan FREE : pas d'assurance
  if (plan.id === "free") return 0;

  // Plan STARTER : couverture jusqu'à 115€
  if (plan.id === "starter") {
    return itemValue <= 115 ? 0 : Math.min(itemValue * 0.02, 50); // 2% avec max 50€
  }

  // Plan PREMIUM : couverture jusqu'à 3000€
  if (plan.id === "premium") {
    if (itemValue <= 3000) return 0;
    return 75; // Forfait 75€ au-delà de 3000€
  }

  return 0;
};

export const calculatePriorityShippingFee = (
  planId: string,
  basePrice: number,
  usedPriorityShipments: number = 0,
): number => {
  const plan = getSubscriptionPlan(planId);
  if (!plan) return basePrice * 0.15; // 15% de surcoût pour les non-abonnés

  if (!plan.features.priorityShipping) {
    return basePrice * 0.15; // Pas d'envoi prioritaire pour FREE
  }

  // Plan PREMIUM : 3 envois prioritaires gratuits par mois
  if (
    plan.id === "premium" &&
    usedPriorityShipments < plan.limits.freeShipments!
  ) {
    return 0;
  }

  // Surcoût réduit pour les abonnés
  return basePrice * (plan.features.priorityShippingDiscount / 100);
};
