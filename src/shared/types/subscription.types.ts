import { SubscriptionPlan, SubscriptionPeriod, SubscriptionStatus } from "@/lib/validations/subscription";
import { User } from "./user.types";

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: Date;
  renewalDate: Date;
  status: SubscriptionStatus;
  period: SubscriptionPeriod;
  autoRenew: boolean;
  paymentMethodId?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  plan?: SubscriptionPlanDetails;
}

export interface SubscriptionPlanDetails {
  id: string;
  name: string;
  description: string;
  type: SubscriptionPlan;
  price: number;
  durationMonths: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionTier {
  id: string;
  planId: string;
  period: SubscriptionPeriod;
  price: number;
  discountPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionFeature {
  id: string;
  planId: string;
  name: string;
  description: string;
  isHighlighted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionPayment {
  id: string;
  subscriptionId: string;
  userId: string;
  amount: number;
  paymentMethodId: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paymentDate: Date;
  nextPaymentDate?: Date;
  failureReason?: string;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRequest {
  planId: string;
  period: SubscriptionPeriod;
  autoRenew: boolean;
  paymentMethodId?: string;
  couponCode?: string;
  startImmediately?: boolean;
  startDate?: Date;
}

export interface SubscriptionResponse {
  subscription: Subscription;
  payment?: SubscriptionPayment;
  nextPaymentDate: Date;
  canCancel: boolean;
  trialEndDate?: Date;
}

export interface SubscriptionUpdateRequest {
  id: string;
  planId?: string;
  period?: SubscriptionPeriod;
  autoRenew?: boolean;
  paymentMethodId?: string;
}

export interface SubscriptionCancelRequest {
  id: string;
  reason?: string;
  feedbackRating?: number;
  cancelImmediately?: boolean;
}

export interface SubscriptionCancelResponse {
  success: boolean;
  message: string;
  endDate: Date;
  refundAmount?: number;
}

export interface SubscriptionFeatureAccess {
  featureKey: string;
  hasAccess: boolean;
  upgradeLink?: string;
  upgradePlanId?: string;
} 