import { z } from 'zod';

// Statuts possibles d'un cycle de facturation
export const BillingCycleStatusEnum = z.enum([
  'PENDING',   // En attente d'exécution
  'PROCESSING', // En cours d'exécution
  'COMPLETED',  // Terminé avec succès
  'FAILED'      // Échoué
]);

// Schéma de base pour les cycles de facturation
export const billingCycleBaseSchema = z.object({
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  status: BillingCycleStatusEnum.default('PENDING'),
});

// Schéma pour la création d'un cycle de facturation
export const createBillingCycleSchema = billingCycleBaseSchema.extend({
  scheduledRunDate: z.date().default(() => new Date()),
}).refine(
  data => data.merchantId || data.providerId,
  {
    message: "Un ID de marchand ou de prestataire est requis",
    path: ["merchantId"],
  }
).refine(
  data => data.periodEnd > data.periodStart,
  {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["periodEnd"],
  }
).refine(
  data => data.scheduledRunDate >= data.periodEnd,
  {
    message: "La date d'exécution prévue doit être postérieure ou égale à la période de facturation",
    path: ["scheduledRunDate"],
  }
);

// Schéma pour la mise à jour d'un cycle de facturation
export const updateBillingCycleSchema = z.object({
  billingCycleId: z.string().cuid(),
  status: BillingCycleStatusEnum.optional(),
  scheduledRunDate: z.date().optional(),
  errorMessage: z.string().optional().nullable(),
});

// Schéma pour la réexécution d'un cycle de facturation
export const retryBillingCycleSchema = z.object({
  billingCycleId: z.string().cuid(),
});

// Schéma pour la recherche de cycles de facturation
export const searchBillingCyclesSchema = z.object({
  status: BillingCycleStatusEnum.optional(),
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  periodStartFrom: z.date().optional(),
  periodStartTo: z.date().optional(),
  periodEndFrom: z.date().optional(),
  periodEndTo: z.date().optional(),
  scheduledRunDateFrom: z.date().optional(),
  scheduledRunDateTo: z.date().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schéma pour obtenir les statistiques de facturation
export const billingStatsSchema = z.object({
  period: z.enum(['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL']).default('MONTH'),
});

// Schéma pour les rapports de facturation
export const billingReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH', 'MERCHANT_TYPE', 'PROVIDER_TYPE']).default('MONTH'),
  format: z.enum(['PDF', 'CSV', 'JSON']).default('PDF'),
});

// Export des types pour TypeScript
export type BillingCycleStatus = z.infer<typeof BillingCycleStatusEnum>;
export type CreateBillingCycleInput = z.infer<typeof createBillingCycleSchema>;
export type UpdateBillingCycleInput = z.infer<typeof updateBillingCycleSchema>;
export type RetryBillingCycleInput = z.infer<typeof retryBillingCycleSchema>;
export type SearchBillingCyclesInput = z.infer<typeof searchBillingCyclesSchema>;
export type BillingStatsInput = z.infer<typeof billingStatsSchema>;
export type BillingReportInput = z.infer<typeof billingReportSchema>; 