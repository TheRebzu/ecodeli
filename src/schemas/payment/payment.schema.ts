import { z } from "zod";
import { PaymentStatus } from "@prisma/client";

// Définition de ServiceType (non importé de Prisma car pas encore généré)
export const ServiceType = {
  DELIVERY: "DELIVERY",
  SERVICE: "SERVICE",
  STORAGE: "STORAGE",
  CUSTOM: "CUSTOM"} as const;

export const createPaymentSchema = paymentBaseSchema.extend({ userId: z.string().cuid("ID utilisateur invalide"),
  isEscrow: z.boolean().optional().default(false),
  serviceType: z.enum([
    ServiceType.DELIVERY,
    ServiceType.SERVICE,
    ServiceType.STORAGE,
    ServiceType.CUSTOM]),
  deliveryId: z.string().cuid("ID livraison invalide").optional(),
  serviceId: z.string().cuid("ID service invalide").optional(),
  subscriptionId: z.string().cuid("ID abonnement invalide").optional(),
  paymentMethodId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  source: z.string().optional(),
  notes: z.string().optional() });

/**
 * Schéma pour la création d'un paiement avec conservation des fonds (escrow)
 */
export const createEscrowPaymentSchema = paymentBaseSchema.extend({ userId: z.string().cuid(),
  deliveryId: z.string().cuid(),
  paymentMethodId: z.string().optional(),
  releaseAfterDays: z.number().int().min(1).max(30).default(3),
  generateReleaseCode: z.boolean().default(true) });

/**
 * Schéma pour le traitement d'un paiement
 */
export const processPaymentSchema = z.object({ paymentId: z.string().cuid("ID paiement invalide"),
  action: z.enum(["capture", "cancel", "refund", "dispute"]),
  amount: z.number().positive("Le montant doit être positif").optional(),
  reason: z.string().optional() });

/**
 * Schéma pour filtrer les paiements
 */
export const paymentFilterSchema = z.object({ userId: z.string().cuid("ID utilisateur invalide").optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  serviceType: z
    .enum([
      ServiceType.DELIVERY,
      ServiceType.SERVICE,
      ServiceType.STORAGE,
      ServiceType.CUSTOM])
    .optional(),
  deliveryId: z.string().cuid("ID livraison invalide").optional(),
  serviceId: z.string().cuid("ID service invalide").optional(),
  subscriptionId: z.string().cuid("ID abonnement invalide").optional(),
  page: z.number().int("La page doit être un nombre entier").min(1).default(1),
  limit: z
    .number()
    .int("La limite doit être un nombre entier")
    .min(1)
    .max(100)
    .default(10) });

/**
 * Schéma pour le remboursement d'un paiement
 */
export const refundPaymentSchema = z.object({ paymentId: z.string().cuid("ID paiement invalide"),
  amount: z.number().positive("Le montant doit être positif").optional(),
  reason: z.string().min(3, "La raison doit contenir au moins 3 caractères") });

/**
 * Schéma pour la libération d'un paiement sous séquestre
 */
export const releaseEscrowPaymentSchema = z.object({ paymentId: z.string().cuid(),
  releaseCode: z.string().optional() });

/**
 * Schéma pour l'annulation d'un paiement
 */
export const cancelPaymentSchema = z.object({ paymentId: z.string().cuid() });

/**
 * Schéma pour la capture d'un paiement
 */
export const capturePaymentSchema = z.object({ paymentIntentId: z.string(),
  amount: z.number().positive().optional() });

/**
 * Schéma pour l'historique des paiements
 */
export const paymentHistorySchema = z.object({ page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  type: z
    .enum(["DELIVERY", "SERVICE", "SUBSCRIPTION", "MERCHANT_FEE"])
    .optional() });

/**
 * Schéma pour l'ajout d'une méthode de paiement
 */
export const addPaymentMethodSchema = z.object({ paymentMethodId: z.string(),
  setAsDefault: z.boolean().default(false) });

/**
 * Schéma pour la suppression d'une méthode de paiement
 */
export const removePaymentMethodSchema = z.object({ paymentMethodId: z.string() });

/**
 * Schéma pour la création d'un intent Stripe
 */
export const createPaymentIntentSchema = paymentBaseSchema.extend({ paymentMethodId: z.string().optional(),
  returnUrl: z.string().url().optional() });

/**
 * Schéma pour la validation d'un paiement par carte
 */
export const validateCardPaymentSchema = z.object({ paymentIntentId: z.string(),
  paymentMethodId: z.string() });

/**
 * Schéma pour le traitement d'un paiement récurrent
 */
export const createRecurringPaymentSchema = paymentBaseSchema.extend({ userId: z.string().cuid(),
  frequency: z.enum(["MONTHLY", "ANNUAL"]),
  startDate: z.date().optional(),
  paymentMethodId: z.string(),
  metadata: z.record(z.string()).optional() });

/**
 * Schéma pour les rapports financiers des paiements
 */
export const paymentReportSchema = z.object({ startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(["DAY", "WEEK", "MONTH"]).default("DAY"),
  status: z.enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED"]).optional(),
  source: z
    .enum(["DELIVERY", "SERVICE", "SUBSCRIPTION", "MERCHANT_FEE"])
    .optional() });

/**
 * Schéma pour la récupération d'un paiement
 */
export const getPaymentSchema = z.object({ paymentId: z.string().cuid("ID paiement invalide") });

/**
 * Schéma pour les litiges et contestations
 */
export const createDisputeSchema = z.object({ paymentId: z.string().cuid(),
  reason: z.enum([
    "PRODUCT_NOT_RECEIVED",
    "PRODUCT_NOT_AS_DESCRIBED",
    "DUPLICATE",
    "FRAUDULENT",
    "OTHER"]),
  description: z.string().min(10).max(1000),
  evidenceFiles: z.array(z.string()).optional() });

/**
 * Schéma pour la facturation d'un paiement
 */
export const createInvoiceForPaymentSchema = z.object({ paymentId: z.string().cuid("ID paiement invalide"),
  customInvoiceNumber: z.string().optional(),
  additionalNotes: z.string().optional() });

/**
 * Export des types pour TypeScript
 */
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateEscrowPaymentInput = z.infer<
  typeof createEscrowPaymentSchema
>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ReleaseEscrowPaymentInput = z.infer<
  typeof releaseEscrowPaymentSchema
>;
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>;
export type CapturePaymentInput = z.infer<typeof capturePaymentSchema>;
export type PaymentHistoryInput = z.infer<typeof paymentHistorySchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;
export type RemovePaymentMethodInput = z.infer<
  typeof removePaymentMethodSchema
>;
export type CreatePaymentIntentInput = z.infer<
  typeof createPaymentIntentSchema
>;
export type ValidateCardPaymentInput = z.infer<
  typeof validateCardPaymentSchema
>;
export type CreateRecurringPaymentInput = z.infer<
  typeof createRecurringPaymentSchema
>;
export type PaymentReportInput = z.infer<typeof paymentReportSchema>;
export type GetPaymentInput = z.infer<typeof getPaymentSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
