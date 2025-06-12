import * as z from 'zod';

// Schéma pour la création d'un contrat
export const createContractSchema = z.object({
  merchantId: z.string().min(1, 'Le commerçant est requis'),
  templateId: z.string().optional(),
  title: z.string().min(1, 'Le titre est requis').max(200, 'Titre trop long'),
  content: z.string().min(10, 'Le contenu est trop court').max(50000, 'Contenu trop long'),
  status: z
    .enum([
      'DRAFT',
      'PENDING_SIGNATURE',
      'ACTIVE',
      'SUSPENDED',
      'TERMINATED',
      'EXPIRED',
      'CANCELLED',
    ])
    .default('DRAFT'),
  type: z.enum(['STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM']).default('STANDARD'),
  monthlyFee: z.number().min(0, 'Les frais ne peuvent pas être négatifs').optional(),
  commissionRate: z
    .number()
    .min(0, 'Le taux ne peut pas être négatif')
    .max(1, 'Le taux ne peut pas dépasser 100%')
    .optional(),
  minimumVolume: z.number().min(0, 'Le volume minimum ne peut pas être négatif').optional(),
  merchantCategory: z.string().optional(),
  deliveryZone: z.string().optional(),
  maxDeliveryRadius: z.number().min(0, 'Le rayon ne peut pas être négatif').optional(),
  effectiveDate: z.date().optional(),
  expiresAt: z.date().optional(),
  autoRenewal: z.boolean().default(false),
  renewalNotice: z.number().min(0, 'Le préavis ne peut pas être négatif').optional(),
  insuranceRequired: z.boolean().default(false),
  insuranceAmount: z
    .number()
    .min(0, "Le montant de l'assurance ne peut pas être négatif")
    .optional(),
  securityDeposit: z.number().min(0, 'Le dépôt de garantie ne peut pas être négatif').optional(),
  notes: z.string().optional(),
});

// Schéma pour la mise à jour d'un contrat
export const updateContractSchema = createContractSchema.partial().extend({
  id: z.string().min(1, "L'ID du contrat est requis"),
});

// Schéma pour les filtres de recherche
export const contractFiltersSchema = z.object({
  search: z.string().optional(),
  status: z
    .enum([
      'DRAFT',
      'PENDING_SIGNATURE',
      'ACTIVE',
      'SUSPENDED',
      'TERMINATED',
      'EXPIRED',
      'CANCELLED',
    ])
    .optional(),
  type: z.enum(['STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM']).optional(),
  merchantId: z.string().optional(),
  merchantCategory: z.string().optional(),
  effectiveDateFrom: z.date().optional(),
  effectiveDateTo: z.date().optional(),
  expiresFrom: z.date().optional(),
  expiresTo: z.date().optional(),
  minMonthlyFee: z.number().min(0).optional(),
  maxMonthlyFee: z.number().min(0).optional(),
  minCommissionRate: z.number().min(0).max(1).optional(),
  maxCommissionRate: z.number().min(0).max(1).optional(),
  autoRenewal: z.boolean().optional(),
  insuranceRequired: z.boolean().optional(),
  sortBy: z
    .enum([
      'title',
      'status',
      'type',
      'monthlyFee',
      'commissionRate',
      'effectiveDate',
      'expiresAt',
      'createdAt',
    ])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

// Schéma pour les templates de contrat
export const contractTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom du template est requis').max(100, 'Nom trop long'),
  description: z.string().optional(),
  type: z.enum(['STANDARD', 'PREMIUM', 'PARTNER', 'TRIAL', 'CUSTOM']).default('STANDARD'),
  content: z.string().min(10, 'Le contenu est trop court').max(50000, 'Contenu trop long'),
  defaultMonthlyFee: z.number().min(0).optional(),
  defaultCommissionRate: z.number().min(0).max(1).optional(),
  defaultRenewalNotice: z.number().min(0).default(30),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional(),
});

// Schéma pour les amendements de contrat
export const contractAmendmentSchema = z.object({
  contractId: z.string().min(1, "L'ID du contrat est requis"),
  title: z.string().min(1, "Le titre de l'amendement est requis").max(200, 'Titre trop long'),
  description: z.string().min(1, 'La description est requise').max(1000, 'Description trop longue'),
  changes: z.record(z.any()).optional(), // JSON des changements
  effectiveDate: z.date().optional(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE']).default('DRAFT'),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  notes: z.string().optional(),
});

// Schéma pour les négociations
export const contractNegotiationSchema = z.object({
  contractId: z.string().min(1, "L'ID du contrat est requis"),
  merchantId: z.string().min(1, "L'ID du commerçant est requis"),
  adminId: z.string().min(1, "L'ID de l'administrateur est requis"),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  merchantProposal: z.record(z.any()).optional(), // JSON de la proposition du commerçant
  adminCounterProposal: z.record(z.any()).optional(), // JSON de la contre-proposition admin
  finalTerms: z.record(z.any()).optional(), // JSON des termes finaux
  notes: z.string().optional(),
  expiresAt: z.date().optional(),
});

// Schéma pour l'historique des négociations
export const negotiationHistorySchema = z.object({
  negotiationId: z.string().min(1, "L'ID de la négociation est requis"),
  action: z.enum([
    'CREATED',
    'PROPOSAL_SUBMITTED',
    'COUNTER_PROPOSAL',
    'ACCEPTED',
    'REJECTED',
    'MODIFIED',
  ]),
  performedBy: z.string().min(1, "L'utilisateur qui a effectué l'action est requis"),
  data: z.record(z.any()).optional(), // JSON des données de l\'action
  comment: z.string().optional(),
});

// Schéma pour les performances de contrat
export const contractPerformanceSchema = z.object({
  contractId: z.string().min(1, "L'ID du contrat est requis"),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  year: z.number().min(2020).max(2030),
  month: z.number().min(1).max(12).optional(),
  quarter: z.number().min(1).max(4).optional(),
  totalRevenue: z.number().min(0).default(0),
  totalCommissions: z.number().min(0).default(0),
  totalOrders: z.number().min(0).default(0),
  averageOrderValue: z.number().min(0).default(0),
  customerSatisfaction: z.number().min(0).max(5).optional(),
  deliverySuccessRate: z.number().min(0).max(1).default(1),
  averageDeliveryTime: z.number().min(0).optional(), // en minutes
  notes: z.string().optional(),
});

// Types TypeScript dérivés des schémas
export type CreateContractData = z.infer<typeof createContractSchema>;
export type UpdateContractData = z.infer<typeof updateContractSchema>;
export type ContractFilters = z.infer<typeof contractFiltersSchema>;
export type ContractTemplateData = z.infer<typeof contractTemplateSchema>;
export type ContractAmendmentData = z.infer<typeof contractAmendmentSchema>;
export type ContractNegotiationData = z.infer<typeof contractNegotiationSchema>;
export type NegotiationHistoryData = z.infer<typeof negotiationHistorySchema>;
export type ContractPerformanceData = z.infer<typeof contractPerformanceSchema>;

// Schémas de validation pour les actions administratives
export const contractStatusUpdateSchema = z.object({
  id: z.string().min(1, "L'ID du contrat est requis"),
  status: z.enum([
    'DRAFT',
    'PENDING_SIGNATURE',
    'ACTIVE',
    'SUSPENDED',
    'TERMINATED',
    'EXPIRED',
    'CANCELLED',
  ]),
  reason: z.string().optional(),
  effectiveDate: z.date().optional(),
});

export const contractRenewalSchema = z.object({
  id: z.string().min(1, "L'ID du contrat est requis"),
  newExpiresAt: z.date(),
  updateTerms: z.boolean().default(false),
  newMonthlyFee: z.number().min(0).optional(),
  newCommissionRate: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export const bulkContractActionSchema = z.object({
  contractIds: z.array(z.string()).min(1, 'Au moins un contrat doit être sélectionné'),
  action: z.enum(['ACTIVATE', 'SUSPEND', 'TERMINATE', 'RENEW', 'UPDATE_STATUS']),
  parameters: z.record(z.any()).optional(),
  reason: z.string().optional(),
});

export type ContractStatusUpdateData = z.infer<typeof contractStatusUpdateSchema>;
export type ContractRenewalData = z.infer<typeof contractRenewalSchema>;
export type BulkContractActionData = z.infer<typeof bulkContractActionSchema>;
