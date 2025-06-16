import { z } from "zod";

// Définition des types (non importés de Prisma car peut être inaccessible)
export const FinancialTaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH"} as const;

export const FinancialTaskCategory = {
  PAYMENT: "PAYMENT",
  INVOICE: "INVOICE",
  WITHDRAWAL: "WITHDRAWAL",
  OTHER: "OTHER"} as const;

// Schéma de base pour les tâches financières
export const financialTaskBaseSchema = z.object({ title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z
    .enum([
      FinancialTaskPriority.LOW,
      FinancialTaskPriority.MEDIUM,
      FinancialTaskPriority.HIGH])
    .default(FinancialTaskPriority.MEDIUM),
  category: z
    .enum([
      FinancialTaskCategory.PAYMENT,
      FinancialTaskCategory.INVOICE,
      FinancialTaskCategory.WITHDRAWAL,
      FinancialTaskCategory.OTHER])
    .default(FinancialTaskCategory.OTHER),
  userId: z.string().cuid("ID utilisateur invalide") });

// Schéma pour les tâches de facturation programmées
export const scheduledBillingTaskSchema = financialTaskBaseSchema.extend({ category: z
    .enum([
      FinancialTaskCategory.PAYMENT,
      FinancialTaskCategory.INVOICE,
      FinancialTaskCategory.WITHDRAWAL,
      FinancialTaskCategory.OTHER])
    .default(FinancialTaskCategory.INVOICE),

  // Paramètres spécifiques à la facturation
  billingPeriodStart: z.date(),
  billingPeriodEnd: z.date(),
  targetEntities: z
    .array(
      z.object({
        entityType: z.enum(["MERCHANT", "PROVIDER", "DELIVERER"]),
        entityId: z.string().cuid("ID entité invalide") }),
    )
    .min(1, "Au moins une entité cible est requise"),

  // Options de récurrence
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"])
    .optional(),
  recurringEndDate: z.date().optional(),

  // Paramètres de génération de facture
  autoGenerateInvoices: z.boolean().default(true),
  invoiceTemplate: z.string().optional(),
  addLateFees: z.boolean().default(false),
  lateFeePercentage: z.number().min(0).max(100).optional(),

  // Actions post-facturation
  sendEmailNotifications: z.boolean().default(true),
  archiveCompletedInvoices: z.boolean().default(true)});

// Schéma pour le traitement des paiements aux prestataires
export const payoutProcessingSchema = financialTaskBaseSchema.extend({ category: z
    .enum([
      FinancialTaskCategory.PAYMENT,
      FinancialTaskCategory.INVOICE,
      FinancialTaskCategory.WITHDRAWAL,
      FinancialTaskCategory.OTHER])
    .default(FinancialTaskCategory.PAYMENT),

  // Paramètres spécifiques au paiement
  payoutPeriodStart: z.date(),
  payoutPeriodEnd: z.date(),
  recipients: z
    .array(
      z.object({
        recipientType: z.enum(["MERCHANT", "PROVIDER", "DELIVERER"]),
        recipientId: z.string().cuid("ID destinataire invalide"),
        estimatedAmount: z.number().positive().optional() }),
    )
    .min(1, "Au moins un destinataire est requis"),

  // Paramètres de méthode de paiement
  paymentMethod: z
    .enum(["BANK_TRANSFER", "STRIPE_CONNECT", "PAYPAL", "OTHER"])
    .default("BANK_TRANSFER"),

  // Options de validation et vérification
  requiresAdminApproval: z.boolean().default(true),
  approvalThreshold: z.number().positive().optional(),
  generatePayoutReports: z.boolean().default(true),
  includeInvoiceReferences: z.boolean().default(true),

  // Paramètres fiscaux
  applyTaxWithholding: z.boolean().default(false),
  withholdingRate: z.number().min(0).max(100).optional()});

// Schéma pour la réconciliation financière
export const financialReconciliationSchema = financialTaskBaseSchema.extend({ category: z.nativeEnum(FinancialTaskCategory).default("OTHER"),

  // Paramètres spécifiques à la réconciliation
  reconciliationPeriod: z.object({
    startDate: z.date(),
    endDate: z.date() }),
  accountsToReconcile: z
    .array(z.string())
    .min(1, "Au moins un compte à réconcilier est requis"),

  // Options de réconciliation
  matchingCriteria: z
    .array(
      z.enum([
        "AMOUNT",
        "DATE",
        "REFERENCE",
        "DESCRIPTION",
        "TRANSACTION_TYPE"]),
    )
    .default(["AMOUNT", "DATE", "REFERENCE"]),

  // Actions post-réconciliation
  generateDiscrepancyReport: z.boolean().default(true),
  autoResolveSmallDifferences: z.boolean().default(false),
  smallDifferenceThreshold: z.number().positive().optional()});

// Schéma pour les tâches de rapport financier
export const financialReportTaskSchema = financialTaskBaseSchema.extend({ category: z.nativeEnum(FinancialTaskCategory).default("OTHER"),

  // Paramètres spécifiques au rapport
  reportType: z.enum([
    "REVENUE",
    "COMMISSIONS",
    "TAX",
    "PROFIT_LOSS",
    "CASH_FLOW",
    "ACCOUNTS_RECEIVABLE",
    "ACCOUNTS_PAYABLE"]),
  reportPeriod: z.object({
    startDate: z.date(),
    endDate: z.date() }),

  // Options de format et distribution
  fileFormat: z.enum(["PDF", "EXCEL", "CSV", "JSON"]).default("PDF"),
  recipients: z.array(z.string().email("Email invalide")).optional(),
  includeCharts: z.boolean().default(true),
  includeComparisons: z.boolean().default(false),
  comparisonPeriods: z
    .array(
      z.object({ startDate: z.date(),
        endDate: z.date(),
        label: z.string() }),
    )
    .optional()});

// Schéma pour les tâches de traitement fiscal
export const taxProcessingTaskSchema = financialTaskBaseSchema.extend({ category: z.nativeEnum(FinancialTaskCategory).default("OTHER"),

  // Paramètres spécifiques au traitement fiscal
  taxType: z.enum(["VAT", "INCOME_TAX", "SALES_TAX", "WITHHOLDING_TAX"]),
  taxPeriod: z.object({
    startDate: z.date(),
    endDate: z.date() }),

  // Options de calcul
  calculationMethod: z.enum(["ACCRUAL", "CASH"]).default("ACCRUAL"),
  taxRate: z.number().min(0).max(100).optional(),

  // Juridictions et conformité
  jurisdiction: z.string().min(2, "Juridiction invalide"),
  digitalServicesTax: z.boolean().default(false)});

// Schéma pour la création d'une tâche financière
export const createFinancialTaskSchema = z.object({ title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
  priority: z
    .enum([
      FinancialTaskPriority.LOW,
      FinancialTaskPriority.MEDIUM,
      FinancialTaskPriority.HIGH])
    .default(FinancialTaskPriority.MEDIUM),
  category: z
    .enum([
      FinancialTaskCategory.PAYMENT,
      FinancialTaskCategory.INVOICE,
      FinancialTaskCategory.WITHDRAWAL,
      FinancialTaskCategory.OTHER])
    .default(FinancialTaskCategory.OTHER),
  completed: z.boolean().default(false),
  // userId est fourni automatiquement par la procédure tRPC
 });

// Schéma pour la mise à jour d'une tâche financière
export const updateFinancialTaskSchema = z.object({ id: z.string().cuid("ID de tâche invalide"),
  title: z
    .string()
    .min(3, "Le titre doit contenir au moins 3 caractères")
    .optional(),
  description: z.string().optional().or(z.literal("")),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .or(z.date().optional())
    .or(z.null()),
  priority: z
    .enum([
      FinancialTaskPriority.LOW,
      FinancialTaskPriority.MEDIUM,
      FinancialTaskPriority.HIGH])
    .optional(),
  category: z
    .enum([
      FinancialTaskCategory.PAYMENT,
      FinancialTaskCategory.INVOICE,
      FinancialTaskCategory.WITHDRAWAL,
      FinancialTaskCategory.OTHER])
    .optional(),
  completed: z.boolean().optional() });

// Schéma pour le changement de statut d'une tâche
export const toggleFinancialTaskSchema = z.object({ id: z.string().cuid("ID de tâche invalide"),
  completed: z.boolean() });

// Schéma pour la suppression d'une tâche
export const deleteFinancialTaskSchema = z.object({ id: z.string().cuid("ID de tâche invalide") });

// Schéma pour les options de pagination et tri
export const financialTaskListOptionsSchema = z.object({ page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(10),
  sortField: z
    .enum(["title", "dueDate", "priority", "createdAt", "category"])
    .default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  filters: z
    .object({
      search: z.string().optional(),
      priority: z
        .enum([
          FinancialTaskPriority.LOW,
          FinancialTaskPriority.MEDIUM,
          FinancialTaskPriority.HIGH])
        .optional(),
      category: z
        .enum([
          FinancialTaskCategory.PAYMENT,
          FinancialTaskCategory.INVOICE,
          FinancialTaskCategory.WITHDRAWAL,
          FinancialTaskCategory.OTHER])
        .optional(),
      completed: z.boolean().optional(),
      dueDateFrom: z.string().datetime().optional().or(z.date().optional()),
      dueDateTo: z.string().datetime().optional().or(z.date().optional()) })
    .optional()
    .default({})});

// Schéma pour les filtres (utilisé séparément)
export const financialTaskFiltersSchema = z
  .object({ search: z.string().optional(),
    priority: z
      .enum([
        FinancialTaskPriority.LOW,
        FinancialTaskPriority.MEDIUM,
        FinancialTaskPriority.HIGH])
      .optional(),
    category: z
      .enum([
        FinancialTaskCategory.PAYMENT,
        FinancialTaskCategory.INVOICE,
        FinancialTaskCategory.WITHDRAWAL,
        FinancialTaskCategory.OTHER])
      .optional(),
    completed: z.boolean().optional(),
    dueDateFrom: z.string().datetime().optional().or(z.date().optional()),
    dueDateTo: z.string().datetime().optional().or(z.date().optional()) })
  .optional()
  .default({});

// Export des types pour TypeScript
export type FinancialTaskBaseInput = z.infer<typeof financialTaskBaseSchema>;
export type ScheduledBillingTaskInput = z.infer<
  typeof scheduledBillingTaskSchema
>;
export type PayoutProcessingInput = z.infer<typeof payoutProcessingSchema>;
export type FinancialReconciliationInput = z.infer<
  typeof financialReconciliationSchema
>;
export type FinancialReportTaskInput = z.infer<
  typeof financialReportTaskSchema
>;
export type TaxProcessingTaskInput = z.infer<typeof taxProcessingTaskSchema>;
