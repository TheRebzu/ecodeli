/**
 * Types pour le système de paiement
 */

// Types pour les transactions du portefeuille
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

// Interface pour les transactions
export interface Transaction {
  id: string;
  walletId: string;
  amount: number | string;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description?: string;
  reference?: string;
  stripeTransferId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Interface pour les demandes de retrait
export interface Withdrawal {
  id: string;
  walletId: string;
  amount: number | string;
  currency: string;
  status: WithdrawalStatus;
  stripePayoutId?: string;
  requestedAt: Date;
  processedAt?: Date;
  rejectionReason?: string;
  bankAccountLast4?: string;
}

// Interface pour le portefeuille
export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  isActive: boolean;
  stripeAccountId?: string | null;
  accountVerified: boolean;
  accountType?: "express" | "standard" | "custom" | null;
  createdAt: Date;
  updatedAt: Date;
  lastTransactionAt?: Date | null;
}

// Interface pour les données de pagination
export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interface pour les réponses d'historique de transactions
export interface TransactionHistoryResponse {
  transactions: Transaction[];
  pagination: PaginationData;
}

// Interface pour les réponses de demandes de virement
export interface WithdrawalResponse {
  withdrawals: Withdrawal[];
  pagination: PaginationData;
}

// Interface pour le solde du portefeuille
export interface WalletBalanceInfo {
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: string;
}

// Interface pour le statut du compte Stripe Connect
export interface ConnectAccountStatus {
  hasConnectAccount: boolean;
  isVerified: boolean;
  details: {
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
    requirements?: Record<string, any>;
  } | null;
}
