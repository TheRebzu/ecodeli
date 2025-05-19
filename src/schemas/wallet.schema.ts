import { z } from 'zod';
import { TransactionStatus, TransactionType, WithdrawalStatus } from '@prisma/client';

/**
 * Schéma de base du portefeuille
 * Utilisé pour la validation des opérations sur le portefeuille
 */
export const WalletSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string(),
  balance: z.number().nonnegative(),
  currency: z.string().default('EUR'),
  isActive: z.boolean().default(true),
  stripeAccountId: z.string().nullable().optional(),
  accountVerified: z.boolean().default(false),
  accountType: z.enum(['express', 'standard', 'custom']).nullable().optional(),
  iban: z.string().nullable().optional(),
  bic: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountHolder: z.string().nullable().optional(),
  accountHolderType: z.enum(['individual', 'company']).nullable().optional(),
  minimumWithdrawalAmount: z.number().default(10),
  automaticWithdrawal: z.boolean().default(false),
  withdrawalThreshold: z.number().default(100),
  withdrawalDay: z.number().min(1).max(31).nullable().optional(),
});

/**
 * Schéma pour créer un portefeuille
 */
export const CreateWalletSchema = WalletSchema.omit({
  id: true,
  balance: true,
  accountVerified: true,
  stripeAccountId: true,
}).extend({
  userId: z.string(),
});

/**
 * Schéma pour mettre à jour un portefeuille
 */
export const UpdateWalletSchema = WalletSchema.partial().omit({
  id: true,
  userId: true,
  balance: true,
});

/**
 * Schéma pour le solde du portefeuille
 */
export const WalletBalanceSchema = z.object({
  balance: z.number().nonnegative(),
  currency: z.string().default('EUR'),
  availableBalance: z.number().nonnegative().optional(),
  pendingBalance: z.number().nonnegative().optional(),
});

/**
 * Schéma pour les transactions du portefeuille
 */
export const WalletTransactionSchema = z.object({
  id: z.string().cuid().optional(),
  walletId: z.string(),
  amount: z.number(),
  currency: z.string().default('EUR'),
  type: z.enum([
    'EARNING',
    'WITHDRAWAL',
    'REFUND',
    'SUBSCRIPTION_FEE',
    'PLATFORM_FEE',
    'ADJUSTMENT',
    'BONUS',
  ]),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).default('PENDING'),
  description: z.string().optional(),
  reference: z.string().optional(),
  stripeTransferId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schéma pour la création d'une transaction
 */
export const CreateTransactionSchema = z.object({
  walletId: z.string(),
  amount: z.number().positive('Le montant doit être positif'),
  type: z.enum([
    'EARNING',
    'WITHDRAWAL',
    'REFUND',
    'SUBSCRIPTION_FEE',
    'PLATFORM_FEE',
    'ADJUSTMENT',
    'BONUS',
  ]),
  description: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schéma pour les demandes de retrait
 */
export const WithdrawalRequestSchema = z.object({
  id: z.string().cuid().optional(),
  walletId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']).default('PENDING'),
  stripePayoutId: z.string().optional(),
  requestedAt: z.date().optional(),
  processedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  bankAccountLast4: z.string().optional(),
});

/**
 * Schéma pour créer une demande de retrait
 */
export const CreateWithdrawalRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
});

/**
 * Schéma pour mettre à jour une demande de retrait
 */
export const UpdateWithdrawalRequestSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  processedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  stripePayoutId: z.string().optional(),
});

/**
 * Schéma pour les statistiques du portefeuille
 */
export const WalletStatsSchema = z.object({
  totalEarnings: z.number().nonnegative(),
  totalWithdrawals: z.number().nonnegative(),
  pendingWithdrawals: z.number().nonnegative(),
  currentBalance: z.number().nonnegative(),
  pendingBalance: z.number().nonnegative(),
  currency: z.string().default('EUR'),
  transactionCount: z.number().nonnegative(),
  lastTransactionDate: z.date().optional(),
});

/**
 * Schéma pour la configuration du portefeuille
 */
export const WalletConfigSchema = z.object({
  minimumWithdrawalAmount: z.number().min(1).default(10),
  automaticWithdrawal: z.boolean().default(false),
  withdrawalThreshold: z.number().min(10).default(100),
  withdrawalDay: z.number().min(1).max(31).nullable().optional(),
});

/**
 * Schéma pour l'ajout d'informations bancaires
 */
export const BankInfoSchema = z.object({
  iban: z
    .string()
    .min(15)
    .max(34)
    .regex(/^[A-Z0-9]+$/),
  bic: z
    .string()
    .min(8)
    .max(11)
    .regex(/^[A-Z0-9]+$/),
  bankName: z.string().min(2),
  accountHolder: z.string().min(2),
  accountHolderType: z.enum(['individual', 'company']),
});

/**
 * Schéma pour la recherche de transactions
 */
export const TransactionSearchSchema = z.object({
  walletId: z.string(),
  type: z
    .enum([
      'EARNING',
      'WITHDRAWAL',
      'REFUND',
      'SUBSCRIPTION_FEE',
      'PLATFORM_FEE',
      'ADJUSTMENT',
      'BONUS',
    ])
    .optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});

// Exports des types
export type WalletSchemaType = z.infer<typeof WalletSchema>;
export type WalletTransactionSchemaType = z.infer<typeof WalletTransactionSchema>;
export type CreateTransactionSchemaType = z.infer<typeof CreateTransactionSchema>;
export type WalletConfigSchemaType = z.infer<typeof WalletConfigSchema>;
export type BankInfoSchemaType = z.infer<typeof BankInfoSchema>;
export type TransactionSearchSchemaType = z.infer<typeof TransactionSearchSchema>;

// Schéma de base pour un portefeuille
export const walletBaseSchema = z.object({
  userId: z.string().cuid(),
  currency: z.string().default('EUR'),
});

// Schéma pour créer un portefeuille
export const createWalletSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide'),
  currency: z.string().default('EUR'),
  initialBalance: z.number().default(0),
  accountType: z.string().optional(),
  minimumWithdrawalAmount: z.number().positive().default(10),
  automaticWithdrawal: z.boolean().default(false),
  withdrawalThreshold: z.number().positive().optional(),
  withdrawalDay: z.number().int().min(1).max(28).optional(),
  notificationThreshold: z.number().positive().optional(),
  notificationsEnabled: z.boolean().default(true),
});

// Schéma pour les opérations d'ajout de fonds
export const addFundsSchema = z.object({
  walletId: z.string().cuid(),
  amount: z.number().positive().min(0.01, { message: 'Le montant minimum est de 0,01 €' }),
  type: z.nativeEnum(TransactionType).default('EARNING'),
  reference: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Schéma pour les opérations de déduction de fonds
export const deductFundsSchema = z.object({
  walletId: z.string().cuid(),
  amount: z.number().positive().min(0.01, { message: 'Le montant minimum est de 0,01 €' }),
  type: z.nativeEnum(TransactionType).default('PLATFORM_FEE'),
  reference: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Schéma pour la confirmation d'une transaction
export const confirmTransactionSchema = z.object({
  transactionId: z.string().cuid(),
  stripeTransferId: z.string().optional(),
});

// Schéma pour l'historique des transactions
export const transactionHistorySchema = z.object({
  walletId: z.string().cuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  types: z.array(z.nativeEnum(TransactionType)).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
});

// Schéma pour les transferts vers un compte Stripe Connect
export const transferToConnectSchema = z.object({
  amount: z.number().positive().min(0.01),
  destinationAccountId: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Schéma pour la création d'un compte Stripe Connect
export const createConnectAccountSchema = z.object({
  walletId: z.string().cuid(),
  type: z.enum(['express', 'standard']).default('express'),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('FR'),
});

// Schéma pour la vérification d'un compte Stripe Connect
export const verifyConnectAccountSchema = z.object({
  walletId: z.string().cuid(),
});

// Schéma pour l'enregistrement des informations bancaires
export const saveBankInfoSchema = z.object({
  walletId: z.string().cuid(),
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, {
    message: 'IBAN invalide',
  }),
  bic: z.string().regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, {
    message: 'BIC/SWIFT invalide',
  }),
  bankName: z.string().min(2, { message: 'Nom de banque requis' }),
  accountHolder: z.string().min(2, { message: 'Nom du titulaire requis' }),
  accountHolderType: z.enum(['individual', 'company']).default('individual'),
});

// Schéma pour la demande de virement
export const requestWithdrawalSchema = z.object({
  walletId: z.string().cuid(),
  amount: z.number().positive(),
  preferredMethod: z.enum(['BANK_TRANSFER', 'STRIPE_CONNECT']).default('BANK_TRANSFER'),
  reference: z.string().optional(),
});

// Schéma pour le traitement d'une demande de virement
export const processWithdrawalSchema = z.object({
  withdrawalId: z.string().cuid('ID retrait invalide'),
  status: z.nativeEnum(WithdrawalStatus),
  processorComments: z.string().optional(),
  reference: z.string().optional(),
  rejectionReason: z.string().optional(),
}).refine((data) => {
  // La raison de rejet est obligatoire si le statut est REJECTED
  if (data.status === WithdrawalStatus.REJECTED && !data.rejectionReason) {
    return false;
  }
  return true;
}, {
  message: 'La raison de rejet est requise pour un retrait rejeté',
  path: ['rejectionReason']
});

// Schéma pour la mise à jour des paramètres de virement automatique
export const updateAutomaticWithdrawalSettingsSchema = z.object({
  walletId: z.string().cuid(),
  automaticWithdrawal: z.boolean(),
  withdrawalThreshold: z.number().positive().optional(),
  withdrawalDay: z.number().int().min(1).max(31).optional(),
  minimumWithdrawalAmount: z.number().positive().optional(),
});

// Schéma pour la génération d'un rapport de gains
export const generateEarningsReportSchema = z.object({
  userId: z.string().cuid(),
  startDate: z.date(),
  endDate: z.date(),
  format: z.enum(['PDF', 'CSV', 'JSON']).default('PDF'),
});

// Schéma pour l'obtention du solde et des statistiques d'un portefeuille
export const getWalletStatsSchema = z.object({
  walletId: z.string().cuid(),
  period: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL']).default('MONTH'),
});

// Export des types pour TypeScript
export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type AddFundsInput = z.infer<typeof addFundsSchema>;
export type DeductFundsInput = z.infer<typeof deductFundsSchema>;
export type ConfirmTransactionInput = z.infer<typeof confirmTransactionSchema>;
export type TransactionHistoryInput = z.infer<typeof transactionHistorySchema>;
export type TransferToConnectInput = z.infer<typeof transferToConnectSchema>;
export type CreateConnectAccountInput = z.infer<typeof createConnectAccountSchema>;
export type VerifyConnectAccountInput = z.infer<typeof verifyConnectAccountSchema>;
export type SaveBankInfoInput = z.infer<typeof saveBankInfoSchema>;
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
export type ProcessWithdrawalInput = z.infer<typeof processWithdrawalSchema>;
export type UpdateAutomaticWithdrawalSettingsInput = z.infer<
  typeof updateAutomaticWithdrawalSettingsSchema
>;
export type GenerateEarningsReportInput = z.infer<typeof generateEarningsReportSchema>;
export type GetWalletStatsInput = z.infer<typeof getWalletStatsSchema>;

// Schéma de base pour les transactions de portefeuille
export const walletTransactionSchema = z.object({
  walletId: z.string().cuid('ID portefeuille invalide'),
  amount: z.number().min(0.01, 'Le montant minimum est de 0,01 €'),
  currency: z.string().default('EUR'),
  type: z.nativeEnum(TransactionType),
  description: z.string().optional(),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  
  // Relations optionnelles
  deliveryId: z.string().cuid('ID livraison invalide').optional(),
  paymentId: z.string().cuid('ID paiement invalide').optional(),
  serviceId: z.string().cuid('ID service invalide').optional(),
  
  // Champs spécifiques au mode démonstration
  isDemo: z.boolean().default(true).optional(),
  demoSuccessScenario: z.boolean().default(true).optional(),
  demoDelayMs: z.number().min(0).max(3000).optional(),
});

// Schéma pour rechercher les transactions d'un portefeuille
export const walletTransactionFilterSchema = z.object({
  walletId: z.string().cuid('ID portefeuille invalide'),
  type: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Schéma pour obtenir le solde d'un portefeuille
export const getWalletBalanceSchema = z.object({
  walletId: z.string().cuid('ID portefeuille invalide'),
});

// Schéma pour mettre à jour les préférences de portefeuille
export const updateWalletPreferencesSchema = z.object({
  walletId: z.string().cuid('ID portefeuille invalide'),
  minimumWithdrawalAmount: z.number().positive().optional(),
  automaticWithdrawal: z.boolean().optional(),
  withdrawalThreshold: z.number().positive().optional(),
  withdrawalDay: z.number().int().min(1).max(28).optional(),
  notificationThreshold: z.number().positive().optional(),
  notificationsEnabled: z.boolean().optional(),
  taxReportingEnabled: z.boolean().optional(),
});
