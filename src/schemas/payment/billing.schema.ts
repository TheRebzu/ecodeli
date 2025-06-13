import { z } from "zod";

// Statuts possibles d'un cycle de facturation
export const BillingCycleStatusEnum = z.enum([
  "PENDING", // En attente d'exécution
  "PROCESSING", // En cours d'exécution
  "COMPLETED", // Terminé avec succès
  "FAILED", // Échoué
]);

// Schéma de base pour les cycles de facturation
export const billingCycleBaseSchema = z.object({
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  status: BillingCycleStatusEnum.default("PENDING"),
});

// Schéma pour la création d'un cycle de facturation
export const createBillingCycleSchema = billingCycleBaseSchema
  .extend({
    scheduledRunDate: z.date().default(() => new Date()),
  })
  .refine((data) => data.merchantId || data.providerId, {
    message: "Un ID de marchand ou de prestataire est requis",
    path: ["merchantId"],
  })
  .refine((data) => data.periodEnd > data.periodStart, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["periodEnd"],
  })
  .refine((data) => data.scheduledRunDate >= data.periodEnd, {
    message:
      "La date d'exécution prévue doit être postérieure ou égale à la période de facturation",
    path: ["scheduledRunDate"],
  });

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
  period: z.enum(["WEEK", "MONTH", "QUARTER", "YEAR", "ALL"]).default("MONTH"),
});

// Schéma pour les rapports de facturation
export const billingReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z
    .enum(["DAY", "WEEK", "MONTH", "MERCHANT_TYPE", "PROVIDER_TYPE"])
    .default("MONTH"),
  format: z.enum(["PDF", "CSV", "JSON"]).default("PDF"),
});

// Schéma pour les paramètres de facturation
export const billingSettingsSchema = z.object({
  companyName: z.string().min(1, "Le nom de la société est requis"),
  address: z.string().min(1, "L'adresse est requise"),
  city: z.string().min(1, "La ville est requise"),
  postalCode: z.string().min(1, "Le code postal est requis"),
  country: z.string().min(1, "Le pays est requis"),
  phone: z.string().optional(),
  email: z.string().email("Email invalide"),
  website: z.string().url("URL invalide").optional(),

  // Informations fiscales
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),
  taxRegistrationNumber: z.string().optional(),

  // Paramètres par défaut des factures
  defaultCurrency: z.string().default("EUR"),
  defaultPaymentTerms: z.string().default("À régler sous 30 jours"),
  defaultTaxRate: z.number().min(0).max(100).default(20),
  invoicePrefix: z.string().default("ECO-"),
  invoiceNumberFormat: z.string().default("YYYY-MM-[N]"),
  invoiceFooter: z.string().optional(),
  termsAndConditions: z.string().optional(),

  // Options d'envoi automatique
  autoSendInvoices: z.boolean().default(false),
  sendReminderDays: z.array(z.number().int().positive()).default([7, 3, 1]),
  reminderEmailTemplate: z.string().optional(),

  // Logo et branding
  logoUrl: z.string().url("URL invalide").optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Couleur hexadécimale invalide")
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Couleur hexadécimale invalide")
    .optional(),
});

// Schéma pour les taux de commission
export const commissionRateSchema = z.object({
  serviceType: z.enum(["DELIVERY", "SERVICE", "STORAGE", "CUSTOM"]),
  rate: z.number().min(0).max(100),
  calculationType: z
    .enum(["PERCENTAGE", "FLAT_FEE", "TIERED"])
    .default("PERCENTAGE"),
  flatFee: z.number().positive().optional(),
  minimumAmount: z.number().min(0).optional(),
  maximumAmount: z.number().optional(),

  // Options pour les commissions par palier
  tierThresholds: z
    .array(
      z.object({
        threshold: z.number().nonnegative(),
        rate: z.number().min(0).max(100),
      }),
    )
    .optional(),

  // Paramètres de validité
  isActive: z.boolean().default(true),
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Options spécifiques
  applicableRoles: z
    .array(z.enum(["DELIVERER", "PROVIDER", "MERCHANT"]))
    .min(1, "Au moins un rôle applicable est requis"),
  countryCode: z.string().length(2).optional(),
  description: z.string().optional(),
});

// Schéma pour les paramètres de taxes
export const taxSettingsSchema = z.object({
  name: z.string().min(1, "Le nom de la taxe est requis"),
  rate: z.number().min(0).max(100),
  type: z.enum(["VAT", "GST", "SALES_TAX", "OTHER"]).default("VAT"),
  countryCode: z.string().length(2),
  region: z.string().optional(),
  isActive: z.boolean().default(true),
  description: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),

  // Catégories de produits/services exemptés
  exemptCategories: z.array(z.string()).optional(),

  // Validation pour certains pays
  euVatValidation: z.boolean().default(false),
});

// Schéma pour les cycles de facturation
export const billingCycleSchema = z.object({
  merchantId: z.string().cuid("ID commerçant invalide").optional(),
  providerId: z.string().cuid("ID prestataire invalide").optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  scheduledRunDate: z.date(),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
    .default("PENDING"),

  // Champs additionnels pour le suivi
  lastRunAt: z.date().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  serviceSummary: z.record(z.any()).optional(),
});

// Schéma pour la configuration de facturation par rôle
export const roleBillingConfigSchema = z.object({
  role: z.enum(["DELIVERER", "PROVIDER", "MERCHANT"]),
  billingCycle: z
    .enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"])
    .default("MONTHLY"),
  payoutCycle: z
    .enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"])
    .default("BIWEEKLY"),
  commissionType: z
    .enum(["FIXED", "PERCENTAGE", "TIERED"])
    .default("PERCENTAGE"),
  defaultCommissionRate: z.number().min(0).max(100).default(15),
  minimumPayoutAmount: z.number().min(0).default(50),

  // Options de retenue fiscale
  withholding: z.boolean().default(false),
  withholdingRate: z.number().min(0).max(100).optional(),

  // Paramètres de traitement de paiement
  processingFeesPaidBy: z.enum(["PLATFORM", "RECIPIENT"]).default("PLATFORM"),
  processingFeeRate: z.number().min(0).max(10).default(1.5),
});

// Schéma pour les métadonnées financières des utilisateurs
export const userFinancialProfileSchema = z.object({
  userId: z.string().cuid("ID utilisateur invalide"),
  taxIdentifier: z.string().optional(),
  taxResidenceCountry: z.string().length(2).optional(),
  legalEntityType: z
    .enum(["INDIVIDUAL", "COMPANY", "SELF_EMPLOYED"])
    .default("INDIVIDUAL"),
  isVatExempt: z.boolean().default(false),
  vatNumber: z.string().optional(),

  // Informations bancaires (encodées)
  hasVerifiedBankAccount: z.boolean().default(false),
  preferredPaymentMethod: z.string().optional(),

  // Information fiscale spécifique par pays
  w9Submitted: z.boolean().optional(),
  w8BenSubmitted: z.boolean().optional(),
});

// Export des types pour TypeScript
export type BillingCycleStatus = z.infer<typeof BillingCycleStatusEnum>;
export type CreateBillingCycleInput = z.infer<typeof createBillingCycleSchema>;
export type UpdateBillingCycleInput = z.infer<typeof updateBillingCycleSchema>;
export type RetryBillingCycleInput = z.infer<typeof retryBillingCycleSchema>;
export type SearchBillingCyclesInput = z.infer<
  typeof searchBillingCyclesSchema
>;
export type BillingStatsInput = z.infer<typeof billingStatsSchema>;
export type BillingReportInput = z.infer<typeof billingReportSchema>;
export type BillingSettingsInput = z.infer<typeof billingSettingsSchema>;
export type CommissionRateInput = z.infer<typeof commissionRateSchema>;
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
export type BillingCycleInput = z.infer<typeof billingCycleSchema>;
export type RoleBillingConfigInput = z.infer<typeof roleBillingConfigSchema>;
export type UserFinancialProfileInput = z.infer<
  typeof userFinancialProfileSchema
>;
