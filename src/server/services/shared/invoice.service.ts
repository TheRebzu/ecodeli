// src/server/services/invoice/invoice.service.ts
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import {
  formatISO,
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PdfService, InvoicePdfData } from '@/server/services/common/pdf.service';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

/**
 * Service de gestion des factures
 */
export const invoiceService = {
  /**
   * Génère un numéro de facture unique
   */
  async generateInvoiceNumber() {
    const date = format(new Date(), 'yyyyMMdd');
    const count = await db.invoice.count();
    return `ECOD-${date}-${(count + 1).toString().padStart(5, '0')}`;
  },

  /**
   * Calcule les montants d'une facture (base, taxes, total)
   */
  calculateAmounts(
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
    }>
  ) {
    // Calcul des montants avant taxes et remises
    const itemsWithAmounts = items.map(item => {
      const taxRate = item.taxRate !== undefined ? item.taxRate : 0.2; // 20% par défaut
      const discount = item.discount || 0;

      // Calcul du montant avec remise
      const baseAmount = item.quantity * item.unitPrice;
      const discountAmount = (baseAmount * discount) / 100;
      const amountAfterDiscount = baseAmount - discountAmount;

      // Calcul des taxes
      const taxAmount = amountAfterDiscount * taxRate;

      return {
        ...item,
        baseAmount,
        discountAmount,
        amountAfterDiscount,
        taxAmount,
        totalAmount: amountAfterDiscount + taxAmount,
      };
    });

    // Montants totaux
    const subtotal = itemsWithAmounts.reduce((sum, item) => sum + item.amountAfterDiscount, 0);
    const totalTax = itemsWithAmounts.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotal + totalTax;

    return {
      items: itemsWithAmounts,
      subtotal,
      totalTax,
      total,
      raw: {
        subtotal: new Decimal(subtotal),
        totalTax: new Decimal(totalTax),
        total: new Decimal(total),
      },
    };
  },

  /**
   * Crée une facture
   */
  async createInvoice(data: {
    userId: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discount?: number;
      serviceId?: string;
      deliveryId?: string;
    }>;
    dueDate?: Date;
    notes?: string;
    metadata?: Record<string, any>;
    issueDate?: Date;
    companyName?: string;
    billingAddress?: string;
    billingName?: string;
    taxId?: string;
    invoiceType?: string;
  }) {
    const user = await db.user.findUnique({
      where: { id: data.userId },
      include: {
        client: true,
        merchant: true,
        provider: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    const invoiceNumber = await this.generateInvoiceNumber();
    const issueDate = data.issueDate || new Date();
    const dueDate = data.dueDate || addDays(issueDate, 30); // +30 jours par défaut

    // Calculer les montants avec la nouvelle fonction
    const amounts = this.calculateAmounts(data.items);

    // Déterminer les informations de facturation en fonction du rôle de l'utilisateur
    const billingInfo = {
      companyName: data.companyName || this._getBillingCompanyName(user),
      billingAddress: data.billingAddress || this._getBillingAddress(user),
      billingName: data.billingName || user.name,
      taxId: data.taxId || this._getBillingTaxId(user),
    };

    // Créer la facture
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        userId: data.userId,
        totalAmount: amounts.raw.total,
        taxAmount: amounts.raw.totalTax,
        amount: amounts.raw.total, // Pour compatibilité avec le schéma
        subtotalAmount: amounts.raw.subtotal,
        status: InvoiceStatus.DRAFT,
        issueDate,
        dueDate,
        notes: data.notes,
        invoiceType: data.invoiceType || 'SERVICE',
        locale: user.locale || 'fr',
        metadata: data.metadata || {},
        ...billingInfo,
        items: {
          create: amounts.items.map(item => ({
            description: item.description,
            quantity: new Decimal(item.quantity),
            unitPrice: new Decimal(item.unitPrice),
            taxRate: new Decimal(item.taxRate || 0.2),
            taxAmount: new Decimal(item.taxAmount),
            amount: new Decimal(item.totalAmount),
            discount: item.discount ? new Decimal(item.discount) : null,
            serviceId: item.serviceId,
            deliveryId: item.deliveryId,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Générer le PDF
    try {
      const pdfUrl = await this.generateInvoice(invoice.id);

      return await db.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
        include: { items: true },
      });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF de facture:', error);
      return invoice;
    }
  },

  /**
   * Génère le PDF d'une facture et le stocke
   */
  async generateInvoice(invoiceId: string): Promise<string> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        user: true,
      },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    // Préparer les données pour le PDF
    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.issueDate,
      dueDate: invoice.dueDate,
      customerName: invoice.billingName,
      customerEmail: invoice.user.email,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      subtotal: Number(invoice.subtotalAmount || invoice.amount),
      tax: Number(invoice.taxAmount || 0),
      total: Number(invoice.totalAmount || invoice.amount),
      currency: invoice.currency || 'EUR',
      notes: invoice.notes || undefined,
    };

    // Générer le PDF
    const pdfBuffer = await PdfService.generateInvoicePdf(pdfData);

    // Stocker le PDF
    const uploadPath =
      process.env.NODE_ENV === 'development'
        ? './public/uploads/invoices'
        : '/app/public/uploads/invoices';

    try {
      // S'assurer que le répertoire existe
      await mkdir(uploadPath, { recursive: true });

      const filename = `${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const filePath = path.join(uploadPath, filename);

      await writeFile(filePath, pdfBuffer);

      // Retourner l'URL relative du fichier
      return `/uploads/invoices/${filename}`;
    } catch (error) {
      console.error('Erreur lors du stockage du PDF:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de stocker le PDF de la facture',
      });
    }
  },

  /**
   * Stocke une facture dans le système
   */
  async storeInvoice(invoice: any, pdfBuffer: Buffer): Promise<string> {
    // Stocker le PDF
    const uploadPath =
      process.env.NODE_ENV === 'development'
        ? './public/uploads/invoices'
        : '/app/public/uploads/invoices';

    try {
      // S'assurer que le répertoire existe
      await mkdir(uploadPath, { recursive: true });

      const filename = `${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const filePath = path.join(uploadPath, filename);

      await writeFile(filePath, pdfBuffer);

      // Retourner l'URL relative du fichier
      return `/uploads/invoices/${filename}`;
    } catch (error) {
      console.error('Erreur lors du stockage du PDF:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de stocker le PDF de la facture',
      });
    }
  },

  /**
   * Récupère une facture par son ID
   */
  async getInvoiceById(invoiceId: string, options: { includePdf?: boolean } = {}) {
    const { includePdf = false } = options;

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    // Si on demande le PDF et qu'il n'existe pas déjà, le générer
    if (includePdf && !invoice.pdfPath) {
      const pdfPath = await this.generateInvoice(invoiceId);

      return await db.invoice.update({
        where: { id: invoiceId },
        data: {
          pdfPath,
          pdfGenerated: true,
        },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    return invoice;
  },

  /**
   * Liste les factures d'un utilisateur avec filtrage
   */
  async listInvoices(
    options: {
      userId?: string;
      status?: InvoiceStatus;
      invoiceType?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
      sort?: 'asc' | 'desc';
    } = {}
  ) {
    const {
      userId,
      status,
      invoiceType,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sort = 'desc',
    } = options;

    // Construction des filtres
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (invoiceType) {
      where.invoiceType = invoiceType;
    }

    if (startDate || endDate) {
      where.issueDate = {};

      if (startDate) {
        where.issueDate.gte = startDate;
      }

      if (endDate) {
        where.issueDate.lte = endDate;
      }
    }

    // Calcul de la pagination
    const skip = (page - 1) * limit;

    // Comptage du nombre total de factures
    const total = await db.invoice.count({ where });

    // Récupération des factures
    const invoices = await db.invoice.findMany({
      where,
      orderBy: {
        issueDate: sort,
      },
      skip,
      take: limit,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * NOUVELLE FONCTIONNALITÉ - Planification automatique des factures récurrentes
   */
  async scheduleRecurringInvoices(options: {
    scheduleType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    targetDate?: Date;
    userType?: 'MERCHANT' | 'PROVIDER' | 'DELIVERER';
    dryRun?: boolean;
    adminId?: string;
  }) {
    const { scheduleType, targetDate = new Date(), userType, dryRun = false, adminId } = options;

    // Créer une tâche financière pour la planification
    const financialTask = await db.financialTask.create({
      data: {
        type: 'INVOICE_GENERATION',
        status: 'PENDING',
        priority: 'MEDIUM',
        scheduledDate: targetDate,
        metadata: {
          scheduleType,
          userType: userType || 'ALL',
          dryRun,
          createdBy: adminId || 'system',
        },
        title: `Génération de factures ${scheduleType.toLowerCase()}`,
        description: `Génération automatique de factures pour ${userType || 'tous les types'} d'utilisateurs`,
        assignedToId: adminId,
      },
    });

    // Si ce n'est pas un dry run, programmer l'exécution
    if (!dryRun) {
      // Ici, on pourrait utiliser un job scheduler comme Bull/BullMQ
      // Pour la démo, on marque la tâche comme programmée
      await db.financialTask.update({
        where: { id: financialTask.id },
        data: {
          status: 'SCHEDULED',
          scheduledDate: targetDate,
        },
      });
    }

    return {
      taskId: financialTask.id,
      scheduledFor: targetDate,
      scheduleType,
      userType: userType || 'ALL',
      dryRun,
    };
  },

  /**
   * NOUVELLE FONCTIONNALITÉ - Génération de factures avec templates personnalisés
   */
  async generateInvoiceWithTemplate(
    invoiceId: string,
    templateType: 'DEFAULT' | 'SIMPLE' | 'DETAILED' = 'DEFAULT'
  ): Promise<string> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        user: true,
      },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    // Préparer les données selon le template
    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      date: invoice.issueDate,
      dueDate: invoice.dueDate,
      customerName: invoice.billingName,
      customerEmail: invoice.user.email,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      subtotal: Number(invoice.subtotalAmount || invoice.amount),
      tax: Number(invoice.taxAmount || 0),
      total: Number(invoice.totalAmount || invoice.amount),
      currency: invoice.currency || 'EUR',
      notes: invoice.notes || undefined,
    };

    // Générer le PDF avec le template spécifique
    let pdfBuffer: Buffer;
    switch (templateType) {
      case 'SIMPLE':
        pdfBuffer =
          (await PdfService.generateSimpleInvoicePdf?.(pdfData)) ||
          (await PdfService.generateInvoicePdf(pdfData));
        break;
      case 'DETAILED':
        pdfBuffer =
          (await PdfService.generateDetailedInvoicePdf?.(pdfData)) ||
          (await PdfService.generateInvoicePdf(pdfData));
        break;
      default:
        pdfBuffer = await PdfService.generateInvoicePdf(pdfData);
    }

    // Stocker le PDF avec le template dans le nom
    const uploadPath =
      process.env.NODE_ENV === 'development'
        ? './public/uploads/invoices'
        : '/app/public/uploads/invoices';

    try {
      await mkdir(uploadPath, { recursive: true });

      const filename = `${invoice.invoiceNumber}-${templateType.toLowerCase()}-${Date.now()}.pdf`;
      const filePath = path.join(uploadPath, filename);

      await writeFile(filePath, pdfBuffer);

      // Mettre à jour la facture avec l'URL du PDF
      await db.invoice.update({
        where: { id: invoiceId },
        data: { pdfPath: `/uploads/invoices/${filename}` },
      });

      return `/uploads/invoices/${filename}`;
    } catch (error) {
      console.error('Erreur lors du stockage du PDF:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de stocker le PDF de la facture',
      });
    }
  },

  /**
   * NOUVELLE FONCTIONNALITÉ - Génération de factures en lot pour un type d'utilisateur
   */
  async batchGenerateInvoices(options: {
    userType: 'MERCHANT' | 'PROVIDER' | 'DELIVERER';
    period: { start: Date; end: Date };
    template?: 'DEFAULT' | 'SIMPLE' | 'DETAILED';
    autoSend?: boolean;
    adminId?: string;
  }) {
    const { userType, period, template = 'DEFAULT', autoSend = false, adminId } = options;

    // Créer une tâche financière pour le traitement en lot
    const batchTask = await db.financialTask.create({
      data: {
        type: 'BATCH_INVOICE_GENERATION',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        scheduledDate: new Date(),
        metadata: {
          userType,
          period,
          template,
          autoSend,
          processedBy: adminId || 'system',
        },
        title: `Génération en lot - ${userType}`,
        description: `Génération de factures en lot pour ${userType} du ${format(period.start, 'dd/MM/yyyy')} au ${format(period.end, 'dd/MM/yyyy')}`,
        assignedToId: adminId,
      },
    });

    const results = {
      taskId: batchTask.id,
      processed: 0,
      success: 0,
      errors: [] as string[],
      invoiceIds: [] as string[],
    };

    try {
      // Récupérer les utilisateurs selon le type
      const users = await this._getUsersByType(userType);
      results.processed = users.length;

      for (const user of users) {
        try {
          // Calculer les données pour cette période
          const invoiceData = await this._calculateUserInvoiceData(user, period, userType);

          if (invoiceData.items.length > 0) {
            // Créer la facture
            const invoice = await this.createInvoice({
              userId: user.id,
              items: invoiceData.items,
              issueDate: new Date(),
              dueDate: addDays(new Date(), 15),
              notes: `Facture générée automatiquement pour la période ${format(period.start, 'dd/MM/yyyy')} - ${format(period.end, 'dd/MM/yyyy')}`,
              invoiceType: invoiceData.type,
              metadata: {
                batchTaskId: batchTask.id,
                period,
                template,
                generatedAt: new Date().toISOString(),
              },
            });

            // Générer le PDF avec le template spécifié
            if (template !== 'DEFAULT') {
              await this.generateInvoiceWithTemplate(invoice.id, template);
            }

            results.invoiceIds.push(invoice.id);
            results.success++;

            // Envoyer par email si demandé
            if (autoSend) {
              await this._sendInvoiceEmail(invoice.id, user.email);
            }
          }
        } catch (error) {
          console.error(`Erreur génération facture pour ${user.id}:`, error);
          results.errors.push(
            `${user.name}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
          );
        }
      }

      // Mettre à jour la tâche
      await db.financialTask.update({
        where: { id: batchTask.id },
        data: {
          status: results.errors.length === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
          completedAt: new Date(),
          metadata: {
            ...batchTask.metadata,
            results,
          },
        },
      });

      return results;
    } catch (error) {
      // Marquer la tâche comme échouée
      await db.financialTask.update({
        where: { id: batchTask.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          metadata: {
            ...batchTask.metadata,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          },
        },
      });

      throw error;
    }
  },

  /**
   * NOUVELLE FONCTIONNALITÉ - Analyse des revenus de facturation
   */
  async getInvoiceAnalytics(options: {
    period: { start: Date; end: Date };
    groupBy?: 'DAY' | 'WEEK' | 'MONTH';
    userType?: 'MERCHANT' | 'PROVIDER' | 'DELIVERER';
    includeProjections?: boolean;
  }) {
    const { period, groupBy = 'MONTH', userType, includeProjections = false } = options;

    // Filtres de base
    const baseWhere: any = {
      issueDate: {
        gte: period.start,
        lte: period.end,
      },
      status: {
        in: ['ISSUED', 'PAID'],
      },
    };

    if (userType) {
      baseWhere.invoiceType = this._getInvoiceTypeForUser(userType);
    }

    // Statistiques globales
    const globalStats = await db.invoice.aggregate({
      where: baseWhere,
      _count: true,
      _sum: {
        totalAmount: true,
        taxAmount: true,
      },
      _avg: {
        totalAmount: true,
      },
    });

    // Répartition par statut
    const statusBreakdown = await db.invoice.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Répartition par type
    const typeBreakdown = await db.invoice.groupBy({
      by: ['invoiceType'],
      where: baseWhere,
      _count: true,
      _sum: {
        totalAmount: true,
      },
    });

    // Évolution temporelle (simplifié pour la démo)
    const timeSeriesData = await this._getInvoiceTimeSeries(baseWhere, groupBy);

    // Projections (si demandées)
    let projections = null;
    if (includeProjections) {
      projections = await this._calculateInvoiceProjections(globalStats, period);
    }

    return {
      period,
      groupBy,
      userType,
      globalStats: {
        totalInvoices: globalStats._count,
        totalRevenue: Number(globalStats._sum.totalAmount || 0),
        totalTax: Number(globalStats._sum.taxAmount || 0),
        averageAmount: Number(globalStats._avg.totalAmount || 0),
      },
      breakdown: {
        byStatus: statusBreakdown.map(item => ({
          status: item.status,
          count: item._count,
          amount: Number(item._sum.totalAmount || 0),
        })),
        byType: typeBreakdown.map(item => ({
          type: item.invoiceType,
          count: item._count,
          amount: Number(item._sum.totalAmount || 0),
        })),
      },
      timeSeriesData,
      projections,
    };
  },

  /**
   * Génère automatiquement les factures mensuelles
   */
  async generateMonthlyInvoices(
    options: {
      month?: Date;
      userType?: 'MERCHANT' | 'PROVIDER' | 'DELIVERER';
      simulateOnly?: boolean;
      adminId?: string;
    } = {}
  ) {
    const { month = new Date(), userType, simulateOnly = false, adminId } = options;

    // Définir la période de facturation (mois précédent par défaut)
    const billingMonth = subMonths(month, 1);
    const periodStart = startOfMonth(billingMonth);
    const periodEnd = endOfMonth(billingMonth);

    const periodLabel = format(periodStart, 'MMMM yyyy', { locale: fr });

    // Log d'audit pour tracer l'opération
    if (!simulateOnly && adminId) {
      await db.auditLog.create({
        data: {
          entityType: 'INVOICE',
          action: 'GENERATE_MONTHLY_INVOICES',
          performedById: adminId,
          changes: {
            period: `${format(periodStart, 'yyyy-MM-dd')} - ${format(periodEnd, 'yyyy-MM-dd')}`,
            userType: userType || 'ALL',
          },
        },
      });
    }

    // Factures pour les commerçants
    if (!userType || userType === 'MERCHANT') {
      await this._generateMerchantInvoices(periodStart, periodEnd, periodLabel, simulateOnly);
    }

    // Factures pour les prestataires
    if (!userType || userType === 'PROVIDER') {
      await this._generateProviderInvoices(periodStart, periodEnd, periodLabel, simulateOnly);
    }

    // Factures pour les livreurs
    if (!userType || userType === 'DELIVERER') {
      await this._generateDelivererInvoices(periodStart, periodEnd, periodLabel, simulateOnly);
    }

    // En mode simulation, calculer les estimations réelles
    if (simulateOnly) {
      const estimatedMerchants = await this._estimateMerchantInvoices(periodStart, periodEnd);
      const estimatedProviders = await this._estimateProviderInvoices(periodStart, periodEnd);
      const estimatedDeliverers = await this._estimateDelivererInvoices(periodStart, periodEnd);

      return {
        period: {
          start: periodStart,
          end: periodEnd,
          label: periodLabel,
        },
        estimated: {
          merchantInvoices: estimatedMerchants.count,
          providerInvoices: estimatedProviders.count,
          delivererInvoices: estimatedDeliverers.count,
          totalAmount: estimatedMerchants.amount + estimatedProviders.amount + estimatedDeliverers.amount,
        },
      };
    }

    // Retourner le résumé de l'opération
    const merchantCount = await db.invoice.count({
      where: {
        invoiceType: 'MERCHANT_FEE',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000), // +1 jour
        },
      },
    });

    const providerCount = await db.invoice.count({
      where: {
        invoiceType: 'COMMISSION',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000), // +1 jour
        },
      },
    });

    const delivererCount = await db.invoice.count({
      where: {
        invoiceType: 'COMMISSION',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000), // +1 jour
        },
      },
    });

    return {
      period: {
        start: periodStart,
        end: periodEnd,
        label: periodLabel,
      },
      generated: {
        merchantInvoices: merchantCount,
        providerInvoices: providerCount,
        delivererInvoices: delivererCount,
      },
    };
  },

  /**
   * Finalise une facture (change son statut de DRAFT à ISSUED)
   */
  async finalizeInvoice(invoiceId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seules les factures en brouillon peuvent être finalisées',
      });
    }

    // Mettre à jour le statut et la date d'envoi
    return await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.ISSUED,
        emailSentAt: new Date(),
      },
    });
  },

  /**
   * Marque une facture comme payée
   */
  async markInvoiceAsPaid(invoiceId: string, paymentId?: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    if (invoice.status === InvoiceStatus.PAID) {
      // Déjà payée, on ne fait rien
      return invoice;
    }

    return await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PAID,
        paidDate: new Date(),
        paymentId,
      },
    });
  },

  /**
   * Génère une facture d'abonnement
   */
  async createSubscriptionInvoice(
    userId: string,
    subscriptionId: string,
    planType: string,
    amount: number
  ) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé',
      });
    }

    // Période de facturation
    const billingStart = subscription.currentPeriodStart || new Date();
    const billingEnd = subscription.currentPeriodEnd || addDays(billingStart, 30);

    // Créer une facture pour l'abonnement
    return await this.createInvoice({
      userId,
      items: [
        {
          description: `Abonnement ${planType} - Période du ${format(billingStart, 'dd/MM/yyyy')} au ${format(billingEnd, 'dd/MM/yyyy')}`,
          quantity: 1,
          unitPrice: amount,
          taxRate: 0.2, // 20% TVA par défaut
        },
      ],
      issueDate: new Date(),
      dueDate: new Date(), // Paiement immédiat pour les abonnements
      notes: 'Facture générée automatiquement pour votre abonnement',
      invoiceType: 'SUBSCRIPTION',
      metadata: {
        subscriptionId,
        planType,
        billingPeriodStart: formatISO(billingStart),
        billingPeriodEnd: formatISO(billingEnd),
      },
    });
  },

  /**
   * Génère une facture de commission pour les prestataires/livreurs
   */
  async createCommissionInvoice(
    userId: string,
    items: Array<any>,
    period: { start: Date; end: Date }
  ) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        deliverer: true,
        provider: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé',
      });
    }

    if (!user.deliverer && !user.provider) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: "L'utilisateur n'est ni un livreur ni un prestataire",
      });
    }

    const isDeliverer = !!user.deliverer;
    const isPlatform = true; // La facture vient de la plateforme

    // Nom de la période pour la description
    const periodName = `${format(period.start, 'MMMM yyyy', { locale: fr })}`;

    // Créer une facture pour les commissions
    return await this.createInvoice({
      userId,
      items: items.map(item => ({
        description: isDeliverer
          ? `Commission sur livraison #${item.deliveryId} - ${periodName}`
          : `Commission sur service #${item.serviceId} - ${periodName}`,
        quantity: 1,
        unitPrice: item.commissionAmount,
        taxRate: 0.2, // 20% TVA par défaut
      })),
      issueDate: new Date(),
      dueDate: addDays(new Date(), 15), // Paiement sous 15 jours
      notes: 'Facture de commission pour la période indiquée',
      invoiceType: 'COMMISSION',
      companyName: 'EcoDeli SAS',
      billingAddress: '123 Rue de la Plateforme, 75001 Paris, France',
      billingName: 'EcoDeli SAS',
      taxId: 'FR12345678900',
      metadata: {
        periodStart: formatISO(period.start),
        periodEnd: formatISO(period.end),
        isPlatformInvoice: true,
        userRole: isDeliverer ? 'DELIVERER' : 'PROVIDER',
      },
    });
  },

  /**
   * Génère les factures mensuelles pour les commerçants
   * @private
   */
  async _generateMerchantInvoices(
    periodStart: Date,
    periodEnd: Date,
    periodLabel: string,
    simulateOnly: boolean
  ) {
    if (simulateOnly) return;

    // Cette fonction serait implémentée en production pour générer les factures mensuelles
    // des commerçants (abonnements, frais de plateforme, etc.)
    // Générer les factures réelles pour les commerçants actifs
    const merchants = await db.user.findMany({
      where: {
        role: 'MERCHANT',
        merchant: {
          isActive: true,
        },
      },
      include: {
        merchant: true,
      },
    });

    for (const merchant of merchants) {
      // Calculer les frais réels basés sur l'activité
      const merchantData = await this._calculateMerchantData(merchant, { start: periodStart, end: periodEnd });
      
      if (merchantData.items.length > 0) {
        await this.createInvoice({
          userId: merchant.id,
          items: merchantData.items,
          issueDate: new Date(),
          dueDate: addDays(new Date(), 15),
          notes: `Facture mensuelle - ${periodLabel}`,
          invoiceType: 'MERCHANT_FEE',
          metadata: {
            periodStart: formatISO(periodStart),
            periodEnd: formatISO(periodEnd),
            isRecurring: true,
          },
        });
      }
    }
  },

  /**
   * Génère les factures mensuelles pour les prestataires
   * @private
   */
  async _generateProviderInvoices(
    periodStart: Date,
    periodEnd: Date,
    periodLabel: string,
    simulateOnly: boolean
  ) {
    if (simulateOnly) return;

    // Cette fonction serait implémentée en production pour générer les factures de commission
    // pour les prestataires

    // Générer les factures réelles pour les prestataires actifs
    const providers = await db.user.findMany({
      where: {
        role: 'PROVIDER',
        provider: {
          isActive: true,
        },
      },
      include: {
        provider: true,
      },
    });

    for (const provider of providers) {
      // Calculer les commissions réelles basées sur l'activité
      const providerData = await this._calculateProviderData(provider, { start: periodStart, end: periodEnd });
      
      if (providerData.items.length > 0) {
        await this.createCommissionInvoice(provider.id, providerData.items, {
          start: periodStart,
          end: periodEnd,
        });
      }
    }
  },

  /**
   * Génère les factures mensuelles pour les livreurs
   * @private
   */
  async _generateDelivererInvoices(
    periodStart: Date,
    periodEnd: Date,
    periodLabel: string,
    simulateOnly: boolean
  ) {
    if (simulateOnly) return;

    // Cette fonction serait implémentée en production pour générer les factures de commission
    // pour les livreurs

    // Générer les factures réelles pour les livreurs actifs
    const deliverers = await db.user.findMany({
      where: {
        role: 'DELIVERER',
        deliverer: {
          isActive: true,
        },
      },
      include: {
        deliverer: true,
      },
    });

    for (const deliverer of deliverers) {
      // Calculer les commissions réelles basées sur l'activité
      const delivererData = await this._calculateDelivererData(deliverer, { start: periodStart, end: periodEnd });
      
      if (delivererData.items.length > 0) {
        await this.createCommissionInvoice(deliverer.id, delivererData.items, {
          start: periodStart,
          end: periodEnd,
        });
      }
    }
  },

  /**
   * Utilitaires pour les données de facturation
   * @private
   */
  _getBillingCompanyName(user: any): string {
    if (user.merchant?.companyName) return user.merchant.companyName;
    if (user.provider?.companyName) return user.provider.companyName;
    if (user.client?.companyName) return user.client.companyName;
    return '';
  },

  _getBillingAddress(user: any): string {
    if (user.merchant?.businessAddress) return user.merchant.businessAddress;
    if (user.provider?.address) return user.provider.address;
    if (user.client?.address) return user.client.address;
    return '';
  },

  _getBillingTaxId(user: any): string {
    if (user.merchant?.taxId) return user.merchant.taxId;
    if (user.provider?.taxId) return user.provider.taxId;
    if (user.client?.taxId) return user.client.taxId;
    return '';
  },

  /**
   * NOUVELLES MÉTHODES HELPER - Support pour les nouvelles fonctionnalités
   */

  /**
   * Récupère les utilisateurs par type
   * @private
   */
  async _getUsersByType(userType: 'MERCHANT' | 'PROVIDER' | 'DELIVERER') {
    const roleMap = {
      MERCHANT: 'MERCHANT',
      PROVIDER: 'PROVIDER',
      DELIVERER: 'DELIVERER',
    };

    return await db.user.findMany({
      where: {
        role: roleMap[userType],
        isActive: true,
      },
      include: {
        merchant: userType === 'MERCHANT',
        provider: userType === 'PROVIDER',
        deliverer: userType === 'DELIVERER',
      },
    });
  },

  /**
   * Calcule les données de facturation pour un utilisateur sur une période
   * @private
   */
  async _calculateUserInvoiceData(
    user: any,
    period: { start: Date; end: Date },
    userType: 'MERCHANT' | 'PROVIDER' | 'DELIVERER'
  ) {
    // Calculer les vraies données basées sur l'activité
    switch (userType) {
      case 'MERCHANT':
        return await this._calculateMerchantData(user, period);
      case 'PROVIDER':
        return await this._calculateProviderData(user, period);
      case 'DELIVERER':
        return await this._calculateDelivererData(user, period);
      default:
        return { items: [], type: 'OTHER' };
    }
  },



  /**
   * Calcule les données réelles pour un marchand
   * @private
   */
  async _calculateMerchantData(user: any, period: { start: Date; end: Date }) {
    // Récupérer les transactions du marchand pour la période
    const transactions = await db.payment.findMany({
      where: {
        userId: user.id,
        status: 'COMPLETED',
        capturedAt: {
          gte: period.start,
          lte: period.end,
        },
      },
    });

    const items = [];

    // Frais d'abonnement mensuel
    items.push({
      description: `Abonnement plateforme - ${format(period.start, 'MMMM yyyy', { locale: fr })}`,
      quantity: 1,
      unitPrice: 29.99,
      taxRate: 0.2,
    });

    // Frais de transaction (1% du volume)
    if (transactions.length > 0) {
      const totalVolume = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const transactionFee = totalVolume * 0.01; // 1%

      if (transactionFee > 0) {
        items.push({
          description: `Frais de transaction (${transactions.length} transactions)`,
          quantity: 1,
          unitPrice: transactionFee,
          taxRate: 0.2,
        });
      }
    }

    return { items, type: 'MERCHANT_FEE' };
  },

  /**
   * Calcule les données réelles pour un prestataire
   * @private
   */
  async _calculateProviderData(user: any, period: { start: Date; end: Date }) {
    // Récupérer les services du prestataire pour la période
    const serviceBookings = await db.serviceBooking.findMany({
      where: {
        service: {
          providerId: user.id,
        },
        status: 'COMPLETED',
        createdAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        payment: true,
        service: true,
      },
    });

    const items = serviceBookings.map((booking, index) => {
      const serviceAmount = Number(booking.payment?.amount || 0);
      const commissionRate = 0.15; // 15% de commission
      const commissionAmount = serviceAmount * commissionRate;

      return {
        description: `Commission service "${booking.service.name}" - ${format(booking.createdAt, 'dd/MM/yyyy')}`,
        quantity: 1,
        unitPrice: commissionAmount,
        taxRate: 0.2,
        serviceId: booking.serviceId,
      };
    });

    return { items, type: 'COMMISSION' };
  },

  /**
   * Calcule les données réelles pour un livreur
   * @private
   */
  async _calculateDelivererData(user: any, period: { start: Date; end: Date }) {
    // Récupérer les livraisons du livreur pour la période
    const deliveries = await db.delivery.findMany({
      where: {
        delivererId: user.id,
        currentStatus: 'DELIVERED',
        updatedAt: {
          gte: period.start,
          lte: period.end,
        },
      },
      include: {
        payment: true,
      },
    });

    const items = deliveries.map((delivery, index) => {
      const deliveryAmount = Number(delivery.payment?.amount || 0);
      const commissionRate = 0.1; // 10% de commission
      const commissionAmount = deliveryAmount * commissionRate;

      return {
        description: `Commission livraison #${delivery.trackingNumber} - ${format(delivery.updatedAt, 'dd/MM/yyyy')}`,
        quantity: 1,
        unitPrice: commissionAmount,
        taxRate: 0.2,
        deliveryId: delivery.id,
      };
    });

    return { items, type: 'COMMISSION' };
  },

  /**
   * Envoie une facture par email
   * @private
   */
  async _sendInvoiceEmail(invoiceId: string, recipientEmail: string) {
    // Récupérer la facture avec ses détails
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: true,
        items: true,
      },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    // Envoyer l'email avec la facture en pièce jointe
    try {
      await emailService.sendInvoiceEmail({
        to: recipientEmail,
        invoiceId,
        subject: `Votre facture ${invoice.invoiceNumber}`,
        attachPdf: true,
      });

      // Marquer la facture comme envoyée
      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          sentAt: new Date(),
          status: 'SENT',
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la facture par email:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erreur lors de l\'envoi de la facture par email',
      });
    }
  },

  /**
   * Obtient le type de facture pour un type d'utilisateur
   * @private
   */
  _getInvoiceTypeForUser(userType: 'MERCHANT' | 'PROVIDER' | 'DELIVERER'): string {
    switch (userType) {
      case 'MERCHANT':
        return 'MERCHANT_FEE';
      case 'PROVIDER':
      case 'DELIVERER':
        return 'COMMISSION';
      default:
        return 'OTHER';
    }
  },

  /**
   * Génère des données de séries temporelles pour les factures
   * @private
   */
  async _getInvoiceTimeSeries(baseWhere: any, groupBy: 'DAY' | 'WEEK' | 'MONTH') {
    // Générer des données réelles basées sur les factures existantes
    const invoices = await db.invoice.findMany({
      where: baseWhere,
      select: {
        issueDate: true,
        totalAmount: true,
      },
      orderBy: {
        issueDate: 'asc',
      },
    });

    // Grouper les données selon la période demandée
    const groupedData = new Map();
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.issueDate);
      let periodKey: string;
      
      switch (groupBy) {
        case 'DAY':
          periodKey = format(date, 'dd/MM/yyyy');
          break;
        case 'WEEK':
          periodKey = format(date, 'ww/yyyy');
          break;
        case 'MONTH':
          periodKey = format(date, 'MM/yyyy');
          break;
        default:
          periodKey = format(date, 'dd/MM/yyyy');
      }
      
      if (!groupedData.has(periodKey)) {
        groupedData.set(periodKey, { count: 0, amount: 0, date });
      }
      
      const existing = groupedData.get(periodKey);
      existing.count += 1;
      existing.amount += Number(invoice.totalAmount || 0);
    });

    // Convertir en tableau et trier
    return Array.from(groupedData.entries()).map(([period, data]) => ({
      period,
      date: data.date,
      count: data.count,
      amount: data.amount,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  },

  /**
   * Calcule les projections de revenus
   * @private
   */
  async _calculateInvoiceProjections(globalStats: any, period: { start: Date; end: Date }) {
    const periodDays = Math.ceil(
      (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyAverage = Number(globalStats._sum.totalAmount || 0) / periodDays;

    // Projections simples basées sur la moyenne
    return {
      nextMonth: dailyAverage * 30,
      nextQuarter: dailyAverage * 90,
      nextYear: dailyAverage * 365,
      confidence: 'medium', // low, medium, high
      basedOnDays: periodDays,
    };
  },
};

// Export des fonctions individuelles pour faciliter les tests et l'utilisation
export const {
  generateInvoiceNumber,
  calculateAmounts,
  createInvoice,
  generateInvoice,
  generateInvoiceWithTemplate,
  storeInvoice,
  getInvoiceById,
  listInvoices,
  generateMonthlyInvoices,
  scheduleRecurringInvoices,
  batchGenerateInvoices,
  getInvoiceAnalytics,
  finalizeInvoice,
  markInvoiceAsPaid,
  createSubscriptionInvoice,
  createCommissionInvoice,
} = invoiceService;

// Export pour la compatibilité avec payment.service.ts
export async function createInvoiceForPayment(data: {
  userId: string;
  paymentId: string;
  amount: number;
  invoiceType: string;
  description?: string;
  billingName: string;
  customInvoiceNumber?: string;
}) {
  return await createInvoice({
    userId: data.userId,
    items: [
      {
        description: data.description || `Paiement #${data.paymentId}`,
        quantity: 1,
        unitPrice: data.amount,
        taxRate: 0.2, // TVA par défaut
      },
    ],
    issueDate: new Date(),
    dueDate: new Date(), // Immédiat car déjà payé
    notes: 'Facture générée automatiquement pour votre paiement',
    invoiceType: data.invoiceType,
    billingName: data.billingName,
    metadata: {
      paymentId: data.paymentId,
      automaticallyGenerated: true,
    },
  });
}
