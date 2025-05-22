// src/server/services/invoice/invoice.service.ts
import { db } from '@/server/db';
import { TRPCError } from '@trpc/server';
import { formatISO, format, addDays, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { PdfService, InvoicePdfData } from './pdf.service';
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
  calculateAmounts(items: Array<{
    description: string,
    quantity: number,
    unitPrice: number,
    taxRate?: number,
    discount?: number
  }>) {
    // Calcul des montants avant taxes et remises
    const itemsWithAmounts = items.map(item => {
      const taxRate = item.taxRate !== undefined ? item.taxRate : 0.20; // 20% par défaut
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
        totalAmount: amountAfterDiscount + taxAmount
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
        total: new Decimal(total)
      }
    };
  },
  
  /**
   * Crée une facture
   */
  async createInvoice(data: {
    userId: string,
    items: Array<{
      description: string,
      quantity: number,
      unitPrice: number,
      taxRate?: number,
      discount?: number,
      serviceId?: string,
      deliveryId?: string
    }>,
    dueDate?: Date,
    notes?: string,
    metadata?: Record<string, any>,
    issueDate?: Date,
    companyName?: string,
    billingAddress?: string,
    billingName?: string,
    taxId?: string,
    invoiceType?: string
  }) {
    const user = await db.user.findUnique({
      where: { id: data.userId },
      include: {
        client: true,
        merchant: true,
        provider: true
      }
    });
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé'
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
      taxId: data.taxId || this._getBillingTaxId(user)
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
            taxRate: new Decimal(item.taxRate || 0.20),
            taxAmount: new Decimal(item.taxAmount),
            amount: new Decimal(item.totalAmount),
            discount: item.discount ? new Decimal(item.discount) : null,
            serviceId: item.serviceId,
            deliveryId: item.deliveryId
          }))
        }
      },
      include: {
        items: true
      }
    });
    
    // Génération du PDF
    try {
      const pdfUrl = await this.generateInvoice(invoice.id);
      
      return await db.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
        include: { items: true }
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
        user: true
      }
    });
    
    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée'
      });
    }
    
    // Vérifier si on est en mode démo
    if (process.env.DEMO_MODE === 'true') {
      // Simuler un délai pour la génération (plus réaliste)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const fileHash = createHash('md5')
        .update(`${invoice.id}-${Date.now()}`)
        .digest('hex')
        .substring(0, 8);
      
      return `/demo/invoices/${invoice.invoiceNumber}-${fileHash}.pdf`;
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
        unitPrice: Number(item.unitPrice)
      })),
      subtotal: Number(invoice.subtotalAmount || invoice.amount),
      tax: Number(invoice.taxAmount || 0),
      total: Number(invoice.totalAmount || invoice.amount),
      currency: invoice.currency || 'EUR',
      notes: invoice.notes || undefined
    };
    
    // Générer le PDF
    const pdfBuffer = await PdfService.generateInvoicePdf(pdfData);
    
    // Stocker le PDF
    const uploadPath = process.env.NODE_ENV === 'development' 
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
        message: 'Impossible de stocker le PDF de la facture'
      });
    }
  },
  
  /**
   * Stocke une facture dans le système
   */
  async storeInvoice(invoice: any, pdfBuffer: Buffer): Promise<string> {
    // Vérifier si on est en mode démo
    if (process.env.DEMO_MODE === 'true') {
      // En mode démo, on simule le stockage
      return `/demo/invoices/${invoice.invoiceNumber}.pdf`;
    }
    
    // Stocker le PDF
    const uploadPath = process.env.NODE_ENV === 'development' 
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
        message: 'Impossible de stocker le PDF de la facture'
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
            email: true
          }
        }
      }
    });
    
    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée'
      });
    }
    
    // Si on demande le PDF et qu'il n'existe pas déjà, le générer
    if (includePdf && !invoice.pdfUrl) {
      const pdfUrl = await this.generateInvoice(invoiceId);
      
      return await db.invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
    }
    
    return invoice;
  },
  
  /**
   * Liste les factures d'un utilisateur avec filtrage
   */
  async listInvoices(options: {
    userId?: string,
    status?: InvoiceStatus,
    invoiceType?: string,
    startDate?: Date,
    endDate?: Date,
    page?: number,
    limit?: number,
    sort?: 'asc' | 'desc'
  } = {}) {
    const {
      userId,
      status,
      invoiceType,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sort = 'desc'
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
        issueDate: sort
      },
      skip,
      take: limit,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return {
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  },
  
  /**
   * Génère automatiquement les factures mensuelles
   */
  async generateMonthlyInvoices(options: {
    month?: Date,
    userType?: 'MERCHANT' | 'PROVIDER' | 'DELIVERER',
    simulateOnly?: boolean,
    adminId?: string
  } = {}) {
    const {
      month = new Date(),
      userType,
      simulateOnly = false,
      adminId
    } = options;
    
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
            userType: userType || 'ALL'
          }
        }
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
    
    // En mode démo, renvoyez des données simulées si demandé
    if (process.env.DEMO_MODE === 'true' && simulateOnly) {
      return {
        period: {
          start: periodStart,
          end: periodEnd,
          label: periodLabel
        },
        estimated: {
          merchantInvoices: 5,
          providerInvoices: 8,
          delivererInvoices: 12,
          totalAmount: 4250.75
        },
        demo: true
      };
    }
    
    // Retourner le résumé de l'opération
    const merchantCount = await db.invoice.count({
      where: {
        invoiceType: 'MERCHANT_FEE',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000) // +1 jour
        }
      }
    });
    
    const providerCount = await db.invoice.count({
      where: {
        invoiceType: 'COMMISSION',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000) // +1 jour
        }
      }
    });
    
    const delivererCount = await db.invoice.count({
      where: {
        invoiceType: 'COMMISSION',
        issueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 86400000) // +1 jour
        }
      }
    });
    
    return {
      period: {
        start: periodStart,
        end: periodEnd,
        label: periodLabel
      },
      generated: {
        merchantInvoices: merchantCount,
        providerInvoices: providerCount,
        delivererInvoices: delivererCount
      }
    };
  },
  
  /**
   * Finalise une facture (change son statut de DRAFT à ISSUED)
   */
  async finalizeInvoice(invoiceId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée'
      });
    }
    
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seules les factures en brouillon peuvent être finalisées'
      });
    }
    
    // Mettre à jour le statut et la date d'envoi
    return await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.ISSUED,
        emailSentAt: new Date()
      }
    });
  },
  
  /**
   * Marque une facture comme payée
   */
  async markInvoiceAsPaid(invoiceId: string, paymentId?: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée'
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
        paymentId
      }
    });
  },
  
  /**
   * Génère une facture d'abonnement
   */
  async createSubscriptionInvoice(userId: string, subscriptionId: string, planType: string, amount: number) {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId }
    });
    
    if (!subscription) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Abonnement non trouvé'
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
          taxRate: 0.20 // 20% TVA par défaut
        }
      ],
      issueDate: new Date(),
      dueDate: new Date(), // Paiement immédiat pour les abonnements
      notes: 'Facture générée automatiquement pour votre abonnement',
      invoiceType: 'SUBSCRIPTION',
      metadata: {
        subscriptionId,
        planType,
        billingPeriodStart: formatISO(billingStart),
        billingPeriodEnd: formatISO(billingEnd)
      }
    });
  },
  
  /**
   * Génère une facture de commission pour les prestataires/livreurs
   */
  async createCommissionInvoice(userId: string, items: Array<any>, period: { start: Date, end: Date }) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        deliverer: true,
        provider: true
      }
    });
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Utilisateur non trouvé'
      });
    }
    
    if (!user.deliverer && !user.provider) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'L\'utilisateur n\'est ni un livreur ni un prestataire'
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
        taxRate: 0.20 // 20% TVA par défaut
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
        userRole: isDeliverer ? 'DELIVERER' : 'PROVIDER'
      }
    });
  },
  
  /**
   * Génère les factures mensuelles pour les commerçants
   * @private
   */
  async _generateMerchantInvoices(periodStart: Date, periodEnd: Date, periodLabel: string, simulateOnly: boolean) {
    if (simulateOnly) return;
    
    // Cette fonction serait implémentée en production pour générer les factures mensuelles
    // des commerçants (abonnements, frais de plateforme, etc.)
    
    // En mode démo, on peut simuler la génération de quelques factures
    if (process.env.DEMO_MODE === 'true') {
      const merchants = await db.user.findMany({
        where: {
          role: 'MERCHANT',
          merchant: {
            isActive: true
          }
        },
        take: 5 // Limiter à 5 commerçants pour la démo
      });
      
      for (const merchant of merchants) {
        await this.createInvoice({
          userId: merchant.id,
          items: [
            {
              description: `Frais de plateforme - ${periodLabel}`,
              quantity: 1,
              unitPrice: 49.99,
              taxRate: 0.20
            }
          ],
          issueDate: new Date(),
          dueDate: addDays(new Date(), 15),
          notes: 'Facture mensuelle générée automatiquement',
          invoiceType: 'MERCHANT_FEE',
          metadata: {
            periodStart: formatISO(periodStart),
            periodEnd: formatISO(periodEnd),
            isRecurring: true,
            demo: true
          }
        });
      }
    }
  },
  
  /**
   * Génère les factures mensuelles pour les prestataires
   * @private
   */
  async _generateProviderInvoices(periodStart: Date, periodEnd: Date, periodLabel: string, simulateOnly: boolean) {
    if (simulateOnly) return;
    
    // Cette fonction serait implémentée en production pour générer les factures de commission
    // pour les prestataires
    
    // En mode démo, on peut simuler la génération de quelques factures
    if (process.env.DEMO_MODE === 'true') {
      const providers = await db.user.findMany({
        where: {
          role: 'PROVIDER',
          provider: {
            isActive: true
          }
        },
        take: 3 // Limiter à 3 prestataires pour la démo
      });
      
      for (const provider of providers) {
        // Simuler 2-4 services par prestataire
        const serviceCount = Math.floor(Math.random() * 3) + 2;
        const items = [];
        
        for (let i = 0; i < serviceCount; i++) {
          const serviceAmount = Math.floor(Math.random() * 200) + 50;
          const commissionRate = 0.15; // 15%
          const commissionAmount = serviceAmount * commissionRate;
          
          items.push({
            description: `Commission sur service #SERV-${Date.now()}-${i} - ${periodLabel}`,
            quantity: 1,
            unitPrice: commissionAmount,
            taxRate: 0.20, // 20% TVA
            serviceId: `demo-service-${i}`
          });
        }
        
        await this.createCommissionInvoice(provider.id, items, { start: periodStart, end: periodEnd });
      }
    }
  },
  
  /**
   * Génère les factures mensuelles pour les livreurs
   * @private
   */
  async _generateDelivererInvoices(periodStart: Date, periodEnd: Date, periodLabel: string, simulateOnly: boolean) {
    if (simulateOnly) return;
    
    // Cette fonction serait implémentée en production pour générer les factures de commission
    // pour les livreurs
    
    // En mode démo, on peut simuler la génération de quelques factures
    if (process.env.DEMO_MODE === 'true') {
      const deliverers = await db.user.findMany({
        where: {
          role: 'DELIVERER',
          deliverer: {
            isActive: true
          }
        },
        take: 4 // Limiter à 4 livreurs pour la démo
      });
      
      for (const deliverer of deliverers) {
        // Simuler 5-10 livraisons par livreur
        const deliveryCount = Math.floor(Math.random() * 6) + 5;
        const items = [];
        
        for (let i = 0; i < deliveryCount; i++) {
          const deliveryAmount = Math.floor(Math.random() * 30) + 10;
          const commissionRate = 0.10; // 10%
          const commissionAmount = deliveryAmount * commissionRate;
          
          items.push({
            description: `Commission sur livraison #DEL-${Date.now()}-${i} - ${periodLabel}`,
            quantity: 1,
            unitPrice: commissionAmount,
            taxRate: 0.20, // 20% TVA
            deliveryId: `demo-delivery-${i}`
          });
        }
        
        await this.createCommissionInvoice(deliverer.id, items, { start: periodStart, end: periodEnd });
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
  }
};

// Export des fonctions individuelles pour faciliter les tests et l'utilisation
export const {
  generateInvoiceNumber,
  calculateAmounts,
  createInvoice,
  generateInvoice,
  storeInvoice,
  getInvoiceById,
  listInvoices,
  generateMonthlyInvoices,
  finalizeInvoice,
  markInvoiceAsPaid,
  createSubscriptionInvoice,
  createCommissionInvoice
} = invoiceService;

// Export pour la compatibilité avec payment.service.ts
export async function createInvoiceForPayment(data: {
  userId: string,
  paymentId: string,
  amount: number,
  invoiceType: string,
  description?: string,
  billingName: string,
  customInvoiceNumber?: string
}) {
  return await createInvoice({
    userId: data.userId,
    items: [
      {
        description: data.description || `Paiement #${data.paymentId}`,
        quantity: 1,
        unitPrice: data.amount,
        taxRate: 0.20 // TVA par défaut
      }
    ],
    issueDate: new Date(),
    dueDate: new Date(), // Immédiat car déjà payé
    notes: 'Facture générée automatiquement pour votre paiement',
    invoiceType: data.invoiceType,
    billingName: data.billingName,
    metadata: {
      paymentId: data.paymentId,
      automaticallyGenerated: true
    }
  });
}