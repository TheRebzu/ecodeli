export interface SubscriptionFeatures {
  insurance: number; // Montant maximum assuré par envoi (€)
  discount: number; // Pourcentage de réduction sur les envois
  priorityShipping: boolean; // Envoi prioritaire disponible
  priorityShippingDiscount: number; // Pourcentage de surcoût pour envoi prioritaire
  permanentDiscount: number; // Réduction permanente sur les colis (%)
  firstShipmentFree?: boolean; // Premier envoi gratuit si < 150€
}

export interface SubscriptionLimits {
  maxShipments: number | null; // Nombre maximum d'envois par mois (null = illimité)
  freeShipments: number; // Nombre d'envois prioritaires gratuits par mois
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  stripePriceId: string | null;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
}

export interface SubscriptionUsage {
  deliveries: number;
  savings: number;
  priorityShipments: number;
  insuranceUsed: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  plan: "FREE" | "STARTER" | "PREMIUM";
  status: "active" | "inactive" | "expired" | "cancelled";
  startDate: Date;
  endDate: Date | null;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  autoRenew: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  usage: {
    thisMonth: SubscriptionUsage;
    lastMonth: SubscriptionUsage;
  };
}

export interface CreateSubscriptionRequest {
  planId: "STARTER" | "PREMIUM";
  paymentMethodId: string;
}

export interface UpdateSubscriptionRequest {
  planId: "FREE" | "STARTER" | "PREMIUM";
}

export interface SubscriptionWebhookData {
  subscriptionId: string;
  customerId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  priceId: string;
}

export interface StripeSubscriptionEvent {
  id: string;
  object: "event";
  type: string;
  data: {
    object: SubscriptionWebhookData;
  };
}

export type SubscriptionEventType =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed";
