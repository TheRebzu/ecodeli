import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

// Schéma de base pour les factures
export const invoiceBaseSchema = z.object({
  userId: z.string().cuid(),
  currency: z.string().default('EUR'),
  status: z.nativeEnum(InvoiceStatus).default('DRAFT'),
  description: z.string().optional(),
});

// Schéma pour la création d'une facture
export const createInvoiceSchema = invoiceBaseSchema.extend({
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  amount: z.number().positive().min(0.01, { message: 'Le montant minimum est de 0,01 €' }),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().positive(),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      taxRate: z.number().min(0).max(100).optional(),
      discount: z.number().min(0).max(100).optional(),
      serviceId: z.string().cuid().optional(),
      deliveryId: z.string().cuid().optional(),
      periodStart: z.date().optional(),
      periodEnd: z.date().optional(),
    })
  ),
  serviceDescription: z.string().optional(),
  billingName: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingPostal: z.string().optional(),
  billingCountry: z.string().default('France'),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional(),
  invoiceType: z.enum(['SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE', 'CUSTOM']).default('SERVICE'),
  paymentTerms: z.string().optional(),
  locale: z.string().default('fr'),
});

// Schéma pour la mise à jour d'une facture
export const updateInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  amount: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().positive().optional(),
  dueDate: z.date().optional(),
  items: z.array(
    z.object({
      id: z.string().cuid().optional(),
      description: z.string(),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      taxRate: z.number().min(0).max(100).optional(),
      discount: z.number().min(0).max(100).optional(),
    })
  ).optional(),
  serviceDescription: z.string().optional(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
});

// Schéma pour marquer une facture comme payée
export const markInvoicePaidSchema = z.object({
  invoiceId: z.string().cuid(),
  paymentDate: z.date().default(() => new Date()),
  paymentReference: z.string().optional(),
  amount: z.number().positive().optional(), // Si montant partiel
});

// Schéma pour la génération d'une note de crédit (remboursement)
export const createCreditNoteSchema = z.object({
  originalInvoiceId: z.string().cuid(),
  amount: z.number().positive(),
  reason: z.string(),
  date: z.date().default(() => new Date()),
  refundPayment: z.boolean().default(false),
});

// Schéma pour l'envoi d'une facture par email
export const sendInvoiceEmailSchema = z.object({
  invoiceId: z.string().cuid(),
  recipientEmail: z.string().email().optional(),
  customMessage: z.string().optional(),
  sendCopyToSelf: z.boolean().default(false),
});

// Schéma pour la recherche de factures
export const searchInvoicesSchema = z.object({
  userId: z.string().cuid().optional(),
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  invoiceType: z.enum(['SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE', 'CUSTOM']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// Schéma pour la récupération d'une facture
export const getInvoiceSchema = z.object({
  invoiceId: z.string().cuid(),
});

// Schéma pour générer un PDF de facture
export const generateInvoicePdfSchema = z.object({
  invoiceId: z.string().cuid(),
  template: z.enum(['DEFAULT', 'MINIMAL', 'DETAILED']).default('DEFAULT'),
});

// Schéma pour les rapports de facturation
export const invoiceReportSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH', 'USER', 'STATUS']).default('MONTH'),
  invoiceType: z.enum(['SERVICE', 'SUBSCRIPTION', 'MERCHANT_FEE', 'CUSTOM', 'ALL']).default('ALL'),
  includeUnpaid: z.boolean().default(true),
  format: z.enum(['PDF', 'CSV', 'JSON']).default('PDF'),
});

// Schéma pour la facturation automatique
export const createBillingCycleSchema = z.object({
  merchantId: z.string().cuid().optional(),
  providerId: z.string().cuid().optional(),
  periodStart: z.date(),
  periodEnd: z.date(),
  scheduledRunDate: z.date(),
});

// Schéma pour la récupération des statistiques de facturation
export const invoiceStatsSchema = z.object({
  userId: z.string().cuid().optional(),
  period: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR', 'ALL']).default('MONTH'),
  groupBy: z.enum(['STATUS', 'TYPE']).default('STATUS'),
});

// Export des types pour TypeScript
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidSchema>;
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;
export type SendInvoiceEmailInput = z.infer<typeof sendInvoiceEmailSchema>;
export type SearchInvoicesInput = z.infer<typeof searchInvoicesSchema>;
export type GetInvoiceInput = z.infer<typeof getInvoiceSchema>;
export type GenerateInvoicePdfInput = z.infer<typeof generateInvoicePdfSchema>;
export type InvoiceReportInput = z.infer<typeof invoiceReportSchema>;
export type CreateBillingCycleInput = z.infer<typeof createBillingCycleSchema>;
export type InvoiceStatsInput = z.infer<typeof invoiceStatsSchema>;