import { z } from 'zod';

// Définition de InvoiceStatus (non importé de Prisma car peut être inaccessible)
export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
} as const;

// Schéma de base pour les factures
export const invoiceBaseSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
  currency: z.string().default('EUR'),
  dueDate: z.date().min(new Date(), "La date d'échéance doit être future"),
  description: z.string().optional(),
});

// Schéma pour la création d'une facture
export const createInvoiceSchema = invoiceBaseSchema.extend({
  userId: z.string().cuid('ID utilisateur invalide'),
  invoiceType: z
    .enum(['SERVICE', 'DELIVERY', 'SUBSCRIPTION', 'COMMISSION', 'MERCHANT_FEE', 'OTHER'])
    .default('SERVICE'),

  // Informations spécifiques à la facturation marchande
  merchantId: z.string().cuid('ID commerçant invalide').optional(),
  providerId: z.string().cuid('ID prestataire invalide').optional(),
  billingPeriodStart: z.date().optional(),
  billingPeriodEnd: z.date().optional(),
  serviceDescription: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),

  // Informations sur l'entité facturée
  billingName: z.string(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingPostal: z.string().optional(),
  billingCountry: z.string().default('France'),

  // Informations fiscales
  taxRate: z.number().min(0).max(100).default(20),
  taxId: z.string().optional(),

  // Éléments de facturation
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        taxRate: z.number().min(0).max(100).optional(),
        discount: z.number().min(0).max(100).optional(),
        serviceId: z.string().cuid('ID service invalide').optional(),
        deliveryId: z.string().cuid('ID livraison invalide').optional(),
        itemCode: z.string().optional(),
        periodStart: z.date().optional(),
        periodEnd: z.date().optional(),
      })
    )
    .min(1, 'Au moins un élément est requis'),

  // Référence optionnelle à un paiement
  paymentId: z.string().cuid('ID paiement invalide').optional(),

  // Génération de numéro de facture
  customInvoiceNumber: z.string().optional(),

  // Paramètres pour le mode démonstration
  isDemo: z.boolean().default(true),
});

// Schéma pour filtrer les factures
export const invoiceFilterSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide').optional(),
  status: z
    .enum([
      InvoiceStatus.DRAFT,
      InvoiceStatus.ISSUED,
      InvoiceStatus.PAID,
      InvoiceStatus.OVERDUE,
      InvoiceStatus.CANCELLED,
    ])
    .optional(),
  invoiceType: z
    .enum(['SERVICE', 'DELIVERY', 'SUBSCRIPTION', 'COMMISSION', 'MERCHANT_FEE', 'OTHER'])
    .optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  issueDateFrom: z.date().optional(),
  issueDateTo: z.date().optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  invoiceNumber: z.string().optional(),
  merchantId: z.string().cuid('ID commerçant invalide').optional(),
  providerId: z.string().cuid('ID prestataire invalide').optional(),
  isCreditNote: z.boolean().optional(),
  page: z.number().int('La page doit être un nombre entier').min(1).default(1),
  limit: z.number().int('La limite doit être un nombre entier').min(1).max(100).default(10),
});

// Schéma pour mettre à jour le statut d'une facture
export const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().cuid('ID facture invalide'),
  status: z.enum([
    InvoiceStatus.DRAFT,
    InvoiceStatus.ISSUED,
    InvoiceStatus.PAID,
    InvoiceStatus.OVERDUE,
    InvoiceStatus.CANCELLED,
  ]),
  notes: z.string().optional(),
  paidDate: z.date().optional(),
  reminderSent: z.boolean().optional(),

  // Paramètres pour le mode démonstration
  isDemo: z.boolean().default(true),
});

// Schéma pour la création d'une note de crédit (facture d'avoir)
export const createCreditNoteSchema = z.object({
  originalInvoiceId: z.string().cuid('ID facture originale invalide'),
  amount: z.number().positive('Le montant doit être positif'),
  reason: z.string(),
  refundPaymentId: z.string().cuid('ID paiement de remboursement invalide').optional(),
  notes: z.string().optional(),

  // Paramètres pour le mode démonstration
  isDemo: z.boolean().default(true),
});

// Schéma pour envoyer une facture par email
export const sendInvoiceEmailSchema = z.object({
  invoiceId: z.string().cuid('ID facture invalide'),
  recipientEmail: z.string().email('Email invalide').optional(),
  customMessage: z.string().optional(),
  includePDF: z.boolean().default(true),

  // Paramètres pour le mode démonstration
  isDemo: z.boolean().default(true),
});

// Schéma pour générer un PDF de facture
export const generateInvoicePdfSchema = z.object({
  invoiceId: z.string().cuid('ID facture invalide'),
  template: z.enum(['DEFAULT', 'SIMPLE', 'DETAILED']).default('DEFAULT'),
});

// Schéma pour obtenir des statistiques de facturation
export const invoiceStatsSchema = z.object({
  userId: z.string().cuid('ID utilisateur invalide').optional(),
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
});

// Schéma pour la facturation automatique mensuelle des marchands
export const monthlyMerchantBillingSchema = z.object({
  merchantId: z.string().cuid('ID commerçant invalide').optional(),
  periodStart: z.date().optional(),
  periodEnd: z.date().optional(),
  forceGenerate: z.boolean().default(false),
  autoProcess: z.boolean().default(true),
  includeFixedFees: z.boolean().default(true),
  includeCommissions: z.boolean().default(true),
  isDemo: z.boolean().default(true),
});

// Schéma pour la facturation automatique mensuelle des prestataires
export const monthlyProviderBillingSchema = z.object({
  providerId: z.string().cuid('ID prestataire invalide').optional(),
  periodStart: z.date().optional(),
  periodEnd: z.date().optional(),
  forceGenerate: z.boolean().default(false),
  autoProcess: z.boolean().default(true),
  includeCommissions: z.boolean().default(true),
  isDemo: z.boolean().default(true),
});

// Schéma pour les cycles de facturation
export const billingCycleSchema = z.object({
  merchantId: z.string().cuid('ID commerçant invalide').optional(),
  providerId: z.string().cuid('ID prestataire invalide').optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  scheduledRunDate: z.date(),
  autoExecute: z.boolean().default(true),
  isDemo: z.boolean().default(true),
});

// Schéma pour les statistiques de facturation
export const billingStatsSchema = z.object({
  period: z.enum(['MONTH', 'QUARTER', 'YEAR']).default('MONTH'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  entityType: z.enum(['ALL', 'MERCHANT', 'PROVIDER']).default('ALL'),
  includeDetails: z.boolean().default(false),
});

// Export des types pour TypeScript
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
export type GenerateInvoicePdfInput = z.infer<typeof generateInvoicePdfSchema>;
export type InvoiceStatsInput = z.infer<typeof invoiceStatsSchema>;
export type MonthlyMerchantBillingInput = z.infer<typeof monthlyMerchantBillingSchema>;
export type MonthlyProviderBillingInput = z.infer<typeof monthlyProviderBillingSchema>;
export type BillingCycleInput = z.infer<typeof billingCycleSchema>;
export type BillingStatsInput = z.infer<typeof billingStatsSchema>;
