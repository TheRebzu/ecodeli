// Types unifiés pour le système de paiements client avec Stripe
export interface PaymentMethod {
  id: string;
  type: "card" | "sepa_debit" | "paypal" | "wallet" | "bank_transfer";
  isDefault: boolean;
  card?: {
    brand: "visa" | "mastercard" | "amex" | "discover" | "diners" | "jcb" | "unionpay" | "unknown";
    last4: string;
    expMonth: number;
    expYear: number;
    country: string;
  };
  sepaDebit?: {
    last4: string;
    bankCode: string;
    country: string;
  };
  wallet?: {
    provider: "paypal" | "apple_pay" | "google_pay";
    email?: string;
  };
  billingDetails: {
    name: string;
    email: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentTransaction {
  id: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled" | "requires_action";
  paymentMethodId: string;
  paymentMethod: PaymentMethod;
  description: string;
  metadata: {
    orderId?: string;
    serviceBookingId?: string;
    storageReservationId?: string;
    announcementId?: string;
    subscriptionId?: string;
    type: "service_booking" | "storage_reservation" | "delivery" | "subscription" | "top_up" | "refund";
  };
  fees: {
    stripeFee: number;
    platformFee: number;
    total: number;
  };
  refunds: PaymentRefund[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRefund {
  id: string;
  transactionId: string;
  stripeRefundId?: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  reason: "duplicate" | "fraudulent" | "requested_by_customer" | "service_not_provided" | "other";
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  number: string;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "canceled";
  type: "service" | "storage" | "delivery" | "subscription" | "platform_fee";
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    address?: {
      line1: string;
      line2?: string;
      city: string;
      postalCode: string;
      country: string;
    };
  };
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  paymentTransactionId?: string;
  stripeInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  metadata?: {
    serviceId?: string;
    bookingId?: string;
    reservationId?: string;
    period?: {
      start: Date;
      end: Date;
    };
  };
}

export interface Subscription {
  id: string;
  planId: string;
  plan: SubscriptionPlan;
  customerId: string;
  status: "active" | "canceled" | "past_due" | "unpaid" | "incomplete" | "trialing";
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  paymentMethodId?: string;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: "basic" | "premium" | "enterprise" | "delivery_pro" | "merchant_plus";
  price: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  stripePriceId?: string;
  features: SubscriptionFeature[];
  limits: {
    maxAnnouncements?: number;
    maxStorageBoxes?: number;
    maxServiceBookings?: number;
    prioritySupport: boolean;
    advancedAnalytics: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
  limit?: number;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  frozenAmount: number; // Montant gelé pour les transactions en cours
  transactions: WalletTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: "credit" | "debit" | "freeze" | "unfreeze";
  amount: number;
  currency: string;
  description: string;
  status: "pending" | "completed" | "failed" | "canceled";
  reference?: {
    type: "payment" | "refund" | "top_up" | "withdrawal" | "commission";
    id: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentStats {
  totalSpent: number;
  totalRefunded: number;
  averageTransactionAmount: number;
  transactionCount: number;
  currency: string;
  period: {
    start: Date;
    end: Date;
  };
  paymentMethodBreakdown: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };
  categoryBreakdown: {
    services: number;
    storage: number;
    deliveries: number;
    subscriptions: number;
  };
}

// Types pour les actions de paiement
export interface CreatePaymentData {
  amount: number;
  currency: string;
  paymentMethodId: string;
  description: string;
  metadata: {
    type: PaymentTransaction["metadata"]["type"];
    orderId?: string;
    serviceBookingId?: string;
    storageReservationId?: string;
    announcementId?: string;
    subscriptionId?: string;
  };
  confirmationMethod?: "automatic" | "manual";
  returnUrl?: string;
}

export interface CreatePaymentMethodData {
  type: PaymentMethod["type"];
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  billingDetails: PaymentMethod["billingDetails"];
  saveForFuture?: boolean;
}

export interface CreateSubscriptionData {
  planId: string;
  paymentMethodId: string;
  trialDays?: number;
  couponCode?: string;
}

export interface TopUpWalletData {
  amount: number;
  paymentMethodId: string;
}

export interface WithdrawFromWalletData {
  amount: number;
  bankAccountId: string;
}

// Helpers pour le formatage
export function formatPaymentAmount(
  amount: number,
  currency: string
): string {
  return (amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

export function getPaymentStatusLabel(status: PaymentTransaction["status"]): string {
  const statusLabels = {
    pending: "En attente",
    processing: "En cours",
    succeeded: "Réussi",
    failed: "Échoué",
    canceled: "Annulé",
    requires_action: "Action requise",
  };
  return statusLabels[status];
}

export function getPaymentStatusColor(status: PaymentTransaction["status"]): string {
  const statusColors = {
    pending: "text-yellow-600 bg-yellow-100",
    processing: "text-blue-600 bg-blue-100",
    succeeded: "text-green-600 bg-green-100",
    failed: "text-red-600 bg-red-100",
    canceled: "text-gray-600 bg-gray-100",
    requires_action: "text-orange-600 bg-orange-100",
  };
  return statusColors[status];
}

export function getInvoiceStatusLabel(status: Invoice["status"]): string {
  const statusLabels = {
    draft: "Brouillon",
    sent: "Envoyée",
    paid: "Payée",
    partially_paid: "Partiellement payée",
    overdue: "En retard",
    canceled: "Annulée",
  };
  return statusLabels[status];
}

export function getInvoiceStatusColor(status: Invoice["status"]): string {
  const statusColors = {
    draft: "text-gray-600 bg-gray-100",
    sent: "text-blue-600 bg-blue-100",
    paid: "text-green-600 bg-green-100",
    partially_paid: "text-yellow-600 bg-yellow-100",
    overdue: "text-red-600 bg-red-100",
    canceled: "text-gray-600 bg-gray-100",
  };
  return statusColors[status];
}

export function getSubscriptionStatusLabel(status: Subscription["status"]): string {
  const statusLabels = {
    active: "Active",
    canceled: "Annulée",
    past_due: "En retard",
    unpaid: "Impayée",
    incomplete: "Incomplète",
    trialing: "Période d'essai",
  };
  return statusLabels[status];
}

export function getSubscriptionStatusColor(status: Subscription["status"]): string {
  const statusColors = {
    active: "text-green-600 bg-green-100",
    canceled: "text-gray-600 bg-gray-100",
    past_due: "text-red-600 bg-red-100",
    unpaid: "text-red-600 bg-red-100",
    incomplete: "text-yellow-600 bg-yellow-100",
    trialing: "text-blue-600 bg-blue-100",
  };
  return statusColors[status];
}

export function getPaymentMethodIcon(type: PaymentMethod["type"], brand?: string): string {
  if (type === "card") {
    switch (brand) {
      case "visa":
        return "💳"; // Replace with actual Visa icon
      case "mastercard":
        return "💳"; // Replace with actual Mastercard icon
      case "amex":
        return "💳"; // Replace with actual Amex icon
      default:
        return "💳";
    }
  }
  
  const typeIcons = {
    card: "💳",
    sepa_debit: "🏦",
    paypal: "📧",
    wallet: "👛",
    bank_transfer: "🏛️",
  };
  
  return typeIcons[type] || "💳";
}

export function calculateNextBillingDate(
  currentPeriodEnd: Date,
  interval: SubscriptionPlan["interval"],
  intervalCount: number
): Date {
  const nextDate = new Date(currentPeriodEnd);
  
  if (interval === "month") {
    nextDate.setMonth(nextDate.getMonth() + intervalCount);
  } else if (interval === "year") {
    nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
  }
  
  return nextDate;
}

export function isPaymentMethodExpired(paymentMethod: PaymentMethod): boolean {
  if (paymentMethod.type !== "card" || !paymentMethod.card) {
    return false;
  }
  
  const now = new Date();
  const expDate = new Date(paymentMethod.card.expYear, paymentMethod.card.expMonth - 1);
  
  return expDate < now;
}

export function calculateStripeFees(
  amount: number,
  paymentMethodType: PaymentMethod["type"],
  currency: string = "eur"
): number {
  // Tarifs Stripe pour l'Europe (en centimes)
  const rates = {
    card: { percentage: 1.4, fixed: 25 }, // 1.4% + 0.25€
    sepa_debit: { percentage: 0.8, fixed: 0 }, // 0.8%
    paypal: { percentage: 3.4, fixed: 35 }, // 3.4% + 0.35€
    wallet: { percentage: 2.9, fixed: 30 }, // 2.9% + 0.30€
    bank_transfer: { percentage: 0.8, fixed: 0 }, // 0.8%
  };
  
  const rate = rates[paymentMethodType] || rates.card;
  return Math.round((amount * rate.percentage / 100) + rate.fixed);
}

export function getPlatformCommission(
  amount: number,
  serviceType: "service" | "storage" | "delivery",
  userTier: "basic" | "premium" | "enterprise" = "basic"
): number {
  // Commission de la plateforme selon le type de service et le tier utilisateur
  const commissionRates = {
    service: {
      basic: 5.0, // 5%
      premium: 3.5, // 3.5%
      enterprise: 2.0, // 2%
    },
    storage: {
      basic: 3.0, // 3%
      premium: 2.0, // 2%
      enterprise: 1.5, // 1.5%
    },
    delivery: {
      basic: 4.0, // 4%
      premium: 3.0, // 3%
      enterprise: 2.5, // 2.5%
    },
  };
  
  const rate = commissionRates[serviceType][userTier];
  return Math.round(amount * rate / 100);
}