import { z } from 'zod';

/**
 * Schéma de base pour les paiements
 */
export const paymentBaseSchema = z.object({
  amount: z.number().positive().min(0.5, { message: 'Le montant minimum est de 0,50 €' }),
  currency: z.string().default('EUR'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Schéma pour la création d'un paiement standard
 */
export const createPaymentSchema = paymentBaseSchema.extend({
  userId: z.string().cuid(),
  deliveryId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  subscriptionId: z.string().cuid().optional(),
  paymentMethodId: z.string().optional(),
  isEscrow: z.boolean().default(false),
  generateReleaseCode: z.boolean().default(false),
  releaseAfterDays: z.number().int().min(1).max(30).optional(),
});

/**
 * Schéma pour la création d'un paiement avec conservation des fonds (escrow)
 */
export const createEscrowPaymentSchema = paymentBaseSchema.extend({
  userId: z.string().cuid(),
  deliveryId: z.string().cuid(),
  paymentMethodId: z.string().optional(),
  releaseAfterDays: z.number().int().min(1).max(30).default(3),
  generateReleaseCode: z.boolean().default(true),
});

/**
 * Schéma pour le remboursement d'un paiement
 */
export const refundPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  amount: z.number().positive().optional(),
  reason: z.string().max(255).optional(),
});

/**
 * Schéma pour la libération d'un paiement sous séquestre
 */
export const releaseEscrowPaymentSchema = z.object({
  paymentId: z.string().cuid(),
  releaseCode: z.string().optional(),
});

/**
 * Schéma pour l'annulation d'un paiement
 */
export const cancelPaymentSchema = z.object({
  paymentId: z.string().cuid(),
});

/**
 * Schéma pour la capture d'un paiement
 */
export const capturePaymentSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().positive().optional(),
});

/**
 * Schéma pour l'historique des paiements
 */
export const paymentHistorySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  type: z.enum(['DELIVERY', 'SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE']).optional(),
});

/**
 * Schéma pour l'ajout d'une méthode de paiement
 */
export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
  setAsDefault: z.boolean().default(false),
});

/**
 * Schéma pour la suppression d'une méthode de paiement
 */
export const removePaymentMethodSchema = z.object({
  paymentMethodId: z.string(),
});

/**
 * Schéma pour la création d'un intent Stripe
 */
export const createPaymentIntentSchema = paymentBaseSchema.extend({
  paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional(),
});

/**
 * Schéma pour la validation d'un paiement par carte
 */
export const validateCardPaymentSchema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
});

/**
 * Schéma pour le traitement d'un paiement récurrent
 */
export const createRecurringPaymentSchema = paymentBaseSchema.extend({
  userId: z.string().cuid(),
  frequency: z.enum(['MONTHLY', 'ANNUAL']),
  startDate: z.date().optional(),
  paymentMethodId: z.string(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Schéma pour les rapports financiers des paiements
 */
export const paymentReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH']).default('DAY'),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  source: z.enum(['DELIVERY', 'SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE']).optional(),
});

/**
 * Schéma pour la récupération des informations d'un paiement
 */
export const getPaymentSchema = z.object({
  paymentId: z.string().cuid(),
});

/**
 * Schéma pour les litiges et contestations
 */
export const createDisputeSchema = z.object({
  paymentId: z.string().cuid(),
  reason: z.enum(['PRODUCT_NOT_RECEIVED', 'PRODUCT_NOT_AS_DESCRIBED', 'DUPLICATE', 'FRAUDULENT', 'OTHER']),
  description: z.string().min(10).max(1000),
  evidenceFiles: z.array(z.string()).optional(),
});

/**
 * Export des types pour TypeScript
 */
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateEscrowPaymentInput = z.infer<typeof createEscrowPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ReleaseEscrowPaymentInput = z.infer<typeof releaseEscrowPaymentSchema>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type PaymentHistoryInput = z.infer<typeof paymentHistorySchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type RemovePaymentMethodInput = z.infer<typeof removePaymentMethodSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type ValidateCardPaymentInput = z.infer<typeof validateCardPaymentSchema>;
export type CreateRecurringPaymentInput = z.infer<typeof createRecurringPaymentSchema>;
export type PaymentReportInput = z.infer<typeof paymentReportSchema>;
export type GetPaymentInput = z.infer<typeof getPaymentSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;