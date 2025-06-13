/**
 * Types simplifiés pour les modèles Prisma utilisés dans le système de paiement
 * Ce fichier est utilisé comme solution temporaire en cas d'échec de génération du client Prisma
 */

import { Decimal } from "@prisma/client/runtime/library";

// Enums
export enum TransactionType {
  EARNING = "EARNING",
  WITHDRAWAL = "WITHDRAWAL",
  REFUND = "REFUND",
  SUBSCRIPTION_FEE = "SUBSCRIPTION_FEE",
  PLATFORM_FEE = "PLATFORM_FEE",
  ADJUSTMENT = "ADJUSTMENT",
  BONUS = "BONUS",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum WithdrawalStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum SubscriptionStatus {
  ACTIVE = "ACTIVE",
  PAST_DUE = "PAST_DUE",
  UNPAID = "UNPAID",
  CANCELLED = "CANCELLED",
  TRIAL = "TRIAL",
  ENDED = "ENDED",
}

export enum PlanType {
  FREE = "FREE",
  STARTER = "STARTER",
  PREMIUM = "PREMIUM",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  VOIDED = "VOIDED",
}

// Structure des modèles
export interface Wallet {
  id: string;
  userId: string;
  balance: Decimal;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTransactionAt?: Date | null;
  stripeAccountId?: string | null;
  accountVerified: boolean;
  accountType?: string | null;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: Decimal;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string | null;
  reference?: string | null;
  stripeTransferId?: string | null;
  metadata?: any;
  createdAt: Date;
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  amount: Decimal;
  currency: string;
  status: WithdrawalStatus;
  stripePayoutId?: string | null;
  requestedAt: Date;
  processedAt?: Date | null;
  rejectionReason?: string | null;
  bankAccountLast4?: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  planType: PlanType;
  stripePriceId?: string | null;
  stripeSubscriptionId?: string | null;
  startDate: Date;
  endDate?: Date | null;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: Date | null;
  cancelledAt?: Date | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  isDefault: boolean;
  brand?: string | null;
  last4?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  number: string;
  userId: string;
  subscriptionId?: string | null;
  amount: Decimal;
  currency: string;
  status: InvoiceStatus;
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date | null;
  pdfUrl?: string | null;
  stripeInvoiceId?: string | null;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
}

/**
 * Extension du client Prisma pour faciliter l'autocomplétion
 */
export interface ExtendedPrismaClient {
  wallet: {
    findUnique: (args: any) => Promise<Wallet | null>;
    findFirst: (args: any) => Promise<Wallet | null>;
    findMany: (args: any) => Promise<Wallet[]>;
    create: (args: any) => Promise<Wallet>;
    update: (args: any) => Promise<Wallet>;
    delete: (args: any) => Promise<Wallet>;
    upsert: (args: any) => Promise<Wallet>;
    count: (args: any) => Promise<number>;
    aggregate: (args: any) => Promise<any>;
  };

  walletTransaction: {
    findUnique: (args: any) => Promise<WalletTransaction | null>;
    findFirst: (args: any) => Promise<WalletTransaction | null>;
    findMany: (args: any) => Promise<WalletTransaction[]>;
    create: (args: any) => Promise<WalletTransaction>;
    update: (args: any) => Promise<WalletTransaction>;
    delete: (args: any) => Promise<WalletTransaction>;
    upsert: (args: any) => Promise<WalletTransaction>;
    count: (args: any) => Promise<number>;
    aggregate: (args: any) => Promise<any>;
  };

  withdrawalRequest: {
    findUnique: (args: any) => Promise<WithdrawalRequest | null>;
    findFirst: (args: any) => Promise<WithdrawalRequest | null>;
    findMany: (args: any) => Promise<WithdrawalRequest[]>;
    create: (args: any) => Promise<WithdrawalRequest>;
    update: (args: any) => Promise<WithdrawalRequest>;
    delete: (args: any) => Promise<WithdrawalRequest>;
    upsert: (args: any) => Promise<WithdrawalRequest>;
    count: (args: any) => Promise<number>;
    aggregate: (args: any) => Promise<any>;
  };
}
