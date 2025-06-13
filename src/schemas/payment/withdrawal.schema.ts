import { z } from "zod";
import { WithdrawalStatus } from "@prisma/client";

/**
 * Schéma principal pour les demandes de retrait
 */
export const WithdrawalSchema = z.object({
  id: z.string().cuid().optional(),
  walletId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("EUR"),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
    .default("PENDING"),
  stripePayoutId: z.string().optional(),
  requestedAt: z.date().optional(),
  processedAt: z.date().optional(),
  rejectionReason: z.string().optional(),
  bankAccountLast4: z.string().optional(),
  adminNote: z.string().optional(),
  stripeTransferId: z.string().optional(),
  preferredMethod: z
    .enum(["SEPA", "STRIPE_CONNECT", "BANK_TRANSFER"])
    .optional()
    .default("STRIPE_CONNECT"),
  reference: z.string().optional(),
  notifiedAt: z.date().optional(),
  relatedInvoiceId: z.string().optional(),
  estimatedArrivalDate: z.date().optional(),
  requestedByUserId: z.string().optional(),
  processedByAdminId: z.string().optional(),
});

/**
 * Schéma pour la création d'une demande de retrait
 */
export const CreateWithdrawalSchema = z.object({
  amount: z.number().positive("Le montant doit être supérieur à 0"),
  currency: z.string().default("EUR"),
  preferredMethod: z
    .enum(["SEPA", "STRIPE_CONNECT", "BANK_TRANSFER"])
    .optional()
    .default("STRIPE_CONNECT"),
  reference: z.string().optional(),
});

/**
 * Schéma pour mettre à jour le statut d'une demande de retrait
 */
export const UpdateWithdrawalStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]),
  rejectionReason: z.string().optional(),
  stripePayoutId: z.string().optional(),
});

/**
 * Schéma pour les filtres de liste des retraits
 */
export const WithdrawalListFilterSchema = z.object({
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
    .optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  sortBy: z.enum(["amount", "requestedAt", "processedAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

/**
 * Schéma pour le résumé des retraits
 */
export const WithdrawalSummarySchema = z.object({
  totalWithdrawn: z.number().nonnegative(),
  pendingAmount: z.number().nonnegative(),
  failedAmount: z.number().nonnegative(),
  lastWithdrawalDate: z.date().optional(),
  currency: z.string().default("EUR"),
  withdrawalsCount: z.number().nonnegative(),
});

/**
 * Schéma pour le traitement administratif d'une demande de retrait
 */
export const ProcessWithdrawalSchema = z.object({
  withdrawalId: z.string(),
  action: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  adminNote: z.string().optional(),
  rejectionReason: z
    .string()
    .optional()
    .refine((data) => data !== undefined && data.length > 0, {
      message: "Une raison de rejet est requise",
      path: ["rejectionReason"],
    }),
});

/**
 * Schéma pour la recherche des demandes de retrait
 */
export const WithdrawalSearchSchema = z.object({
  userId: z.string().optional(),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
    .optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
});

/**
 * Schéma pour la configuration de virement automatique
 */
export const AutomaticWithdrawalConfigSchema = z.object({
  enabled: z.boolean().default(false),
  threshold: z.number().min(10).default(100),
  day: z.number().min(1).max(31).nullable().optional(),
  preferredMethod: z
    .enum(["SEPA", "STRIPE_CONNECT", "BANK_TRANSFER"])
    .default("STRIPE_CONNECT"),
});

// Exports des types
export type WithdrawalSchemaType = z.infer<typeof WithdrawalSchema>;
export type CreateWithdrawalSchemaType = z.infer<typeof CreateWithdrawalSchema>;
export type ProcessWithdrawalSchemaType = z.infer<
  typeof ProcessWithdrawalSchema
>;
export type WithdrawalSearchSchemaType = z.infer<typeof WithdrawalSearchSchema>;
export type AutomaticWithdrawalConfigSchemaType = z.infer<
  typeof AutomaticWithdrawalConfigSchema
>;

/**
 * Schéma de base pour les demandes de virement
 */
export const withdrawalBaseSchema = z.object({
  walletId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  amount: z
    .number()
    .positive()
    .min(10, { message: "Le montant minimum de retrait est de 10€" }),
  currency: z.string().default("EUR"),
  preferredMethod: z
    .enum(["BANK_TRANSFER", "STRIPE_CONNECT"])
    .default("BANK_TRANSFER"),
});

/**
 * Schéma pour créer une demande de virement
 */
export const createWithdrawalRequestSchema = withdrawalBaseSchema
  .omit({ walletId: true })
  .extend({
    userId: z.string().cuid(),
  });

/**
 * Schéma pour traiter une demande de virement (admin)
 */
export const processWithdrawalRequestSchema = z.object({
  requestId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT"]),
  adminId: z.string().cuid(),
  notes: z.string().optional(),
});

/**
 * Schéma pour finaliser un transfert bancaire
 */
export const finalizeBankTransferSchema = z.object({
  bankTransferId: z.string().cuid(),
  status: z.enum(["COMPLETED", "FAILED"]),
  adminId: z.string().cuid(),
  reference: z.string().optional(),
  failureReason: z.string().optional(),
});

/**
 * Schéma pour rechercher des demandes de virement
 */
export const withdrawalSearchSchema = z.object({
  userId: z.string().cuid().optional(),
  walletId: z.string().cuid().optional(),
  status: z.nativeEnum(WithdrawalStatus).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

/**
 * Schéma pour les demandes de virement en attente (admin)
 */
export const pendingWithdrawalsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  priority: z.boolean().optional(),
  reviewRequired: z.boolean().optional(),
});

/**
 * Schéma pour les détails d'un virement
 */
export const withdrawalDetailsSchema = z.object({
  requestId: z.string().cuid(),
  userId: z.string().cuid().optional(),
});

/**
 * Schéma pour les informations bancaires
 */
export const bankInfoSchema = z.object({
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
  accountHolderType: z.enum(["individual", "company"]),
});

/**
 * Schéma pour les statistiques de virement
 */
export const withdrawalStatsSchema = z.object({
  userId: z.string().cuid(),
});

// Exports des types
export type CreateWithdrawalRequestInput = z.infer<
  typeof createWithdrawalRequestSchema
>;
export type ProcessWithdrawalRequestInput = z.infer<
  typeof processWithdrawalRequestSchema
>;
export type FinalizeBankTransferInput = z.infer<
  typeof finalizeBankTransferSchema
>;
export type WithdrawalSearchInput = z.infer<typeof withdrawalSearchSchema>;
export type PendingWithdrawalsInput = z.infer<typeof pendingWithdrawalsSchema>;
export type WithdrawalDetailsInput = z.infer<typeof withdrawalDetailsSchema>;
export type BankInfoInput = z.infer<typeof bankInfoSchema>;
export type WithdrawalStatsInput = z.infer<typeof withdrawalStatsSchema>;
