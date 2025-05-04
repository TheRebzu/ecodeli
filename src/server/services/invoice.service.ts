import { db } from '../db';
import { PdfService } from './pdf.service';
import { Decimal } from '@prisma/client/runtime/library';
import Stripe from 'stripe';

// Initialiser le client Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

/**
 * Type de données pour la création d'une facture
 */
interface InvoiceCreateData {
  userId: string;
  amount: number;
  currency?: string;
  paymentId?: string;
  deliveryId?: string;
  serviceId?: string;
  subscriptionId?: string;
  dueDate?: Date;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Service pour la gestion des factures
 */
export const InvoiceService = {
  /**
   * Récupère toutes les factures d'un utilisateur avec filtrage
   */
  async getAll(userId: string, filters: any = {}) {
    try {
      const { status, fromDate, toDate, page = 1, limit = 10 } = filters;
      const skip = (page - 1) * limit;

      const where: any = { userId };

      // Appliquer les filtres
      if (status) {
        where.status = status;
      }

      if (fromDate && toDate) {
        where.createdAt = {
          gte: new Date(fromDate),
          lte: new Date(toDate)
        };
      } else if (fromDate) {
        where.createdAt = {
          gte: new Date(fromDate)
        };
      } else if (toDate) {
        where.createdAt = {
          lte: new Date(toDate)
        };
      }

      // Récupérer les factures
      const invoices = await db.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          payment: {
            select: {
              id: true,
              status: true,
              paymentMethod: true
            }
          }
        }
      });

      // Compter le total pour la pagination
      const total = await db.invoice.count({ where });

      return {
        invoices,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      throw error;
    }
  },

  /**
   * Récupère une facture par son ID
   */
  async getById(id: string, userId?: string) {
    try {
      const whereClause: any = { id };
      if (userId) {
        whereClause.userId = userId;
      }

      const invoice = await db.invoice.findFirst({
        where: whereClause,
        include: {
          payment: true,
          delivery: {
            select: {
              id: true,
              pickupAddress: true,
              deliveryAddress: true,
              status: true
            }
          },
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        }
      });

      if (!invoice) {
        throw new Error('Facture non trouvée');
      }

      return invoice;
    } catch (error) {
      console.error('Erreur lors de la récupération de la facture:', error);
      throw error;
    }
  },

  /**
   * Génère une nouvelle facture
   */
  async generate(data: InvoiceCreateData) {
    try {
      const { userId, amount, currency = 'EUR', paymentId, deliveryId, serviceId, subscriptionId, dueDate, items } = data;

      // Générer un numéro de facture unique
      const invoiceNumber = await this.generateInvoiceNumber();

      // Créer la facture dans la base de données
      const invoice = await db.invoice.create({
        data: {
          number: invoiceNumber,
          amount: new Decimal(amount),
          currency,
          status: paymentId ? 'PAID' : 'PENDING',
          dueDate,
          userId,
          paymentId,
          deliveryId,
          serviceId,
          subscriptionId
        }
      });

      // Récupérer les informations de l'utilisateur
      const user = await db.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Générer le PDF de la facture
      const pdfBuffer = await PdfService.generateInvoicePdf({
        invoiceNumber,
        date: new Date(),
        dueDate: dueDate || new Date(),
        customerName: user.name,
        customerEmail: user.email,
        items,
        subtotal: amount,
        tax: 0, // Calculer la TVA si nécessaire
        total: amount,
        currency,
        notes: 'Merci pour votre confiance!'
      });

      // Sauvegarder l'URL du PDF (simulé ici)
      const pdfUrl = `/invoices/${invoice.id}.pdf`;
      await db.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl }
      });

      return { ...invoice, pdfUrl, pdfBuffer };
    } catch (error) {
      console.error('Erreur lors de la génération de la facture:', error);
      throw error;
    }
  },

  /**
   * Marque une facture comme payée
   */
  async markAsPaid(id: string, paymentId?: string) {
    try {
      const invoice = await db.invoice.findUnique({
        where: { id }
      });

      if (!invoice) {
        throw new Error('Facture non trouvée');
      }

      return await db.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
          paymentId
        }
      });
    } catch (error) {
      console.error('Erreur lors du marquage de la facture comme payée:', error);
      throw error;
    }
  },

  /**
   * Génère un numéro de facture unique
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    // Compter le nombre de factures existantes pour ce mois
    const count = await db.invoice.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${parseInt(month) + 1}-01`)
        }
      }
    });

    // Formater le numéro de facture: YYYYMM-XXXX
    const number = (count + 1).toString().padStart(4, '0');
    return `${year}${month}-${number}`;
  },

  /**
   * Crée une facture Stripe pour un client
   */
  async createStripeInvoice(userId: string, items: Array<{ description: string; amount: number }>) {
    try {
      // Récupérer l'utilisateur
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.stripe_customer_id) {
        throw new Error('Utilisateur sans compte client Stripe');
      }

      // Créer les éléments de la facture
      const invoiceItems = [];
      for (const item of items) {
        const invoiceItem = await stripe.invoiceItems.create({
          customer: user.stripe_customer_id,
          amount: Math.round(item.amount * 100), // Conversion en centimes
          currency: 'eur',
          description: item.description
        });
        invoiceItems.push(invoiceItem);
      }

      // Créer la facture
      const stripeInvoice = await stripe.invoices.create({
        customer: user.stripe_customer_id,
        auto_advance: true, // Facturer automatiquement
        collection_method: 'send_invoice',
        days_until_due: 30
      });

      // Finaliser la facture
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

      // Envoyer la facture par email
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      // Créer l'entrée dans notre base de données
      const invoice = await db.invoice.create({
        data: {
          number: `STRIPE-${finalizedInvoice.number}`,
          amount: new Decimal(finalizedInvoice.amount_due / 100), // Conversion de centimes en euros
          currency: finalizedInvoice.currency.toUpperCase(),
          status: 'PENDING',
          dueDate: new Date(finalizedInvoice.due_date * 1000),
          pdfUrl: finalizedInvoice.invoice_pdf,
          stripeInvoiceId: finalizedInvoice.id,
          userId
        }
      });

      return { invoice, stripeInvoice: finalizedInvoice };
    } catch (error) {
      console.error('Erreur lors de la création de la facture Stripe:', error);
      throw error;
    }
  }
};