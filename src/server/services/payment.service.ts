import Stripe from 'stripe';
import { db } from '../db';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthService } from './auth.service';
import { generateRandomCode } from '@/lib/utils';

// Service d'authentification
const authService = new AuthService();

// Récupérer la clé API Stripe depuis les variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

// Initialiser Stripe avec les paramètres de base
// Créer une fonction pour obtenir une instance de Stripe à la demande
// pour éviter les erreurs d'initialisation quand la clé n'est pas disponible
const getStripeInstance = () => {
  if (!STRIPE_SECRET_KEY) {
    console.warn('Clé API Stripe non définie. Les fonctionnalités de paiement sont désactivées.');
    return null;
  }
  
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
    appInfo: {
      name: 'EcoDeli Financial System',
      version: '1.0.0',
    },
  });
};

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  userId: string;
  deliveryId?: string;
  serviceId?: string;
  subscriptionId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  isEscrow?: boolean;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  phone?: string;
  metadata?: Record<string, string>;
}

/**
 * Service pour gérer les paiements via Stripe
 */
export const PaymentService = {
  /**
   * Récupère ou crée un client Stripe pour un utilisateur
   */
  async getOrCreateStripeCustomer(userId: string, email: string) {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        return { id: 'stripe-mock-customer-id' };
      }

      // Chercher l'utilisateur
      const user = await db.user.findUnique({ 
        where: { id: userId },
        include: { accounts: true }
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Chercher si l'utilisateur a déjà un compte Stripe
      let stripeCustomerId = user.accounts.find(acc => acc.provider === 'stripe')?.providerAccountId;

      // Si aucun client Stripe n'existe, le créer
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: email,
          metadata: { userId },
          name: user.name || undefined
        });

        stripeCustomerId = customer.id;

        // Enregistrer l'identifiant Stripe
        await db.account.create({
          data: {
            userId,
            provider: 'stripe',
            providerAccountId: customer.id,
            type: 'payment'
          }
        });
      }

      return { id: stripeCustomerId };
    } catch (error) {
      console.error('Erreur lors de la création du client Stripe:', error);
      throw error;
    }
  },

  /**
   * Crée un intent de paiement
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    deliveryId?: string;
    serviceId?: string;
    subscriptionId?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, any>;
    isEscrow?: boolean;
  }) {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        // En développement, créer un faux payment intent pour ne pas bloquer l'application
        console.log('Mode de développement : simulation de paiement');
        const paymentId = `pi_mock_${Date.now()}`;
        
        // Créer un paiement fictif dans la base de données
        const payment = await db.payment.create({
          data: {
            amount: new Decimal(params.amount),
            currency: params.currency,
            status: 'PENDING',
            userId: params.userId,
            stripePaymentId: paymentId,
            paymentIntentId: paymentId,
            ...(params.deliveryId ? { deliveryId: params.deliveryId } : {}),
            ...(params.serviceId ? { serviceId: params.serviceId } : {}),
            ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}),
            isEscrow: params.isEscrow || false,
            metadata: params.metadata || {},
            paymentMethodType: params.paymentMethodId ? 'card' : undefined
          }
        });

        return {
          success: true,
          paymentIntentId: paymentId,
          clientSecret: `pi_${paymentId}_secret_${Date.now()}`,
          payment
        };
      }

      const { 
        amount, 
        currency, 
        userId, 
        deliveryId, 
        serviceId, 
        subscriptionId, 
        paymentMethodId,
        description,
        metadata,
        isEscrow = false
      } = params;

      // Récupérer ou créer le client Stripe
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.email) {
        throw new Error('Utilisateur ou email non trouvé');
      }

      const customer = await this.getOrCreateStripeCustomer(userId, user.email);

      // Créer l'intent de paiement
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Conversion en centimes
        currency,
        customer: customer.id,
        ...(paymentMethodId ? { payment_method: paymentMethodId, confirm: true } : {}),
        description: description || 'Paiement EcoDeli',
        metadata: {
          userId,
          ...(deliveryId ? { deliveryId } : {}),
          ...(serviceId ? { serviceId } : {}),
          ...(subscriptionId ? { subscriptionId } : {}),
          isEscrow: isEscrow ? 'true' : 'false',
          ...metadata
        },
      });

      // Créer une entrée dans la base de données
      const payment = await db.payment.create({
        data: {
          amount: new Decimal(amount),
          currency,
          status: 'PENDING',
          userId,
          stripePaymentId: paymentIntent.id,
          paymentIntentId: paymentIntent.id,
          ...(deliveryId ? { deliveryId } : {}),
          ...(serviceId ? { serviceId } : {}),
          ...(subscriptionId ? { subscriptionId } : {}),
          isEscrow,
          metadata: metadata || {},
          paymentMethodType: paymentMethodId ? 'card' : undefined
        }
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        payment
      };
    } catch (error) {
      console.error('Erreur lors de la création du payment intent:', error);
      throw error;
    }
  },

  /**
   * Crée une transaction Stripe
   */
  async createTransfer(amount: number, destinationAccountId: string, description: string, metadata?: Record<string, any>) {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        // En développement, simuler un transfert
        return {
          success: true,
          transferId: `tr_mock_${Date.now()}`
        };
      }

      // Créer le transfert
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100), // Conversion en centimes
        currency: 'eur',
        destination: destinationAccountId,
        description,
        metadata
      });

      return {
        success: true,
        transferId: transfer.id
      };
    } catch (error) {
      console.error('Erreur lors de la création du transfert:', error);
      throw error;
    }
  },

  /**
   * Crée une transaction de paiement sous séquestre
   */
  async createEscrowPayment(
    amount: number,
    currency: string,
    userId: string,
    deliveryId: string,
    releaseAfterDays?: number,
    generateReleaseCode: boolean = false,
    paymentMethodId?: string,
    description?: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Générer un code de déblocage si nécessaire
      let releaseCode = null;
      if (generateReleaseCode) {
        releaseCode = generateRandomCode(6);
      }

      // Calculer la date de déblocage automatique si nécessaire
      let releaseDate = null;
      if (releaseAfterDays && releaseAfterDays > 0) {
        releaseDate = new Date();
        releaseDate.setDate(releaseDate.getDate() + releaseAfterDays);
      }

      // Créer l'intent de paiement avec isEscrow à true
      const result = await this.createPaymentIntent({
        amount,
        currency,
        userId,
        deliveryId,
        paymentMethodId,
        description: description || "Paiement sous séquestre pour livraison",
        metadata: {
          ...metadata,
          escrow: 'true',
          releaseCode,
          releaseDate: releaseDate ? releaseDate.toISOString() : null
        },
        isEscrow: true
      });

      // Mettre à jour le paiement avec les données spécifiques d'escrow
      await db.payment.update({
        where: { id: result.payment.id },
        data: {
          isEscrow: true,
          escrowReleaseCode: releaseCode,
          escrowReleaseDate: releaseDate
        }
      });

      return {
        success: true,
        paymentIntentId: result.paymentIntentId,
        clientSecret: result.clientSecret,
        releaseCode,
        releaseDate
      };
    } catch (error) {
      console.error('Erreur lors de la création du paiement sous séquestre:', error);
      throw error;
    }
  },

  /**
   * Libère un paiement sous séquestre
   */
  async releaseEscrowPayment(paymentId: string, releaseCode?: string) {
    try {
      const stripe = getStripeInstance();
      
      // Récupérer le paiement
      const payment = await db.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Paiement non trouvé');
      }

      // Vérifier que c'est un paiement sous séquestre
      if (!payment.isEscrow) {
        throw new Error('Ce paiement n\'est pas sous séquestre');
      }

      // Vérifier si le paiement a déjà été libéré
      if (payment.escrowReleasedAt) {
        return { success: false, message: 'Ce paiement a déjà été libéré' };
      }

      // Vérifier le code de déblocage si nécessaire
      if (payment.escrowReleaseCode && releaseCode) {
        if (payment.escrowReleaseCode !== releaseCode) {
          return { success: false, message: 'Code de déblocage invalide' };
        }
      }

      // Libérer le paiement dans la base de données
      const updatedPayment = await db.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          escrowReleasedAt: new Date()
        }
      });

      // Si Stripe est configuré, capturer le paiement
      if (stripe && payment.paymentIntentId) {
        await stripe.paymentIntents.capture(payment.paymentIntentId);
      }

      return {
        success: true,
        message: 'Paiement libéré avec succès',
        payment: updatedPayment
      };
    } catch (error) {
      console.error('Erreur lors de la libération du paiement sous séquestre:', error);
      throw error;
    }
  },

  /**
   * Capture un paiement autorisé
   */
  async capturePayment(paymentIntentId: string, amount?: number) {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        // En développement, simuler une capture
        const payment = await db.payment.findFirst({
          where: { paymentIntentId }
        });
        
        if (!payment) {
          throw new Error('Paiement non trouvé');
        }
        
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' }
        });
        
        return {
          success: true,
          message: 'Paiement capturé avec succès (simulation)'
        };
      }

      // Capturer le paiement
      const captureParams: any = {};
      if (amount) {
        captureParams.amount_to_capture = Math.round(amount * 100);
      }

      const paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId,
        captureParams
      );

      // Mettre à jour le statut dans la base de données
      const payment = await db.payment.findFirst({
        where: { paymentIntentId }
      });

      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' }
        });
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Erreur lors de la capture du paiement:', error);
      throw error;
    }
  },

  /**
   * Annule un paiement
   */
  async cancelPayment(paymentId: string) {
    try {
      const stripe = getStripeInstance();
      
      // Récupérer le paiement
      const payment = await db.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Paiement non trouvé');
      }

      // Si le paiement est déjà terminé ou annulé, on ne peut pas l'annuler
      if (['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(payment.status)) {
        throw new Error(`Impossible d'annuler un paiement avec le statut ${payment.status}`);
      }

      // Annuler le paiement dans Stripe si configuré
      if (stripe && payment.paymentIntentId) {
        await stripe.paymentIntents.cancel(payment.paymentIntentId);
      }

      // Mettre à jour le statut dans la base de données
      const updatedPayment = await db.payment.update({
        where: { id: paymentId },
        data: { status: 'CANCELLED' }
      });

      return {
        success: true,
        message: 'Paiement annulé avec succès',
        payment: updatedPayment
      };
    } catch (error) {
      console.error('Erreur lors de l\'annulation du paiement:', error);
      throw error;
    }
  },

  /**
   * Effectue un remboursement
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    try {
      const stripe = getStripeInstance();
      
      // Récupérer le paiement
      const payment = await db.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new Error('Paiement non trouvé');
      }

      // Vérifier si le paiement peut être remboursé
      if (payment.status !== 'COMPLETED') {
        throw new Error('Seuls les paiements complétés peuvent être remboursés');
      }

      let refund = null;
      
      // Créer le remboursement dans Stripe si configuré
      if (stripe && payment.stripePaymentId) {
        const refundParams: any = {
          payment_intent: payment.stripePaymentId,
          reason: reason || 'requested_by_customer'
        };

        if (amount) {
          refundParams.amount = Math.round(amount * 100);
        }

        refund = await stripe.refunds.create(refundParams);
      }

      // Créer une entrée de remboursement dans la base de données
      const refundAmount = amount || Number(payment.amount);
      
      const refundRecord = await db.refund.create({
        data: {
          paymentId,
          amount: new Decimal(refundAmount),
          reason: reason || 'Demande de remboursement client',
          status: 'COMPLETED',
          stripeRefundId: refund ? refund.id : `refund_mock_${Date.now()}`
        }
      });

      // Mettre à jour le statut du paiement
      const fullRefund = !amount || amount === Number(payment.amount);
      
      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: fullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
          refundedAmount: db.Prisma.Decimal.add(
            payment.refundedAmount || 0,
            refundAmount
          )
        }
      });

      return {
        success: true,
        message: 'Remboursement effectué avec succès',
        refundId: refundRecord.id,
        stripeRefundId: refund ? refund.id : null
      };
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      throw error;
    }
  },

  /**
   * Obtient l'historique des paiements d'un utilisateur
   */
  async getPaymentHistory(userId: string, options: {
    page?: number;
    limit?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    type?: string;
  }) {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        status,
        type
      } = options;

      const skip = (page - 1) * limit;

      // Construction de la requête
      const whereClause: any = { userId };

      if (startDate) {
        whereClause.createdAt = { ...(whereClause.createdAt || {}), gte: startDate };
      }

      if (endDate) {
        whereClause.createdAt = { ...(whereClause.createdAt || {}), lte: endDate };
      }

      if (status) {
        whereClause.status = status;
      }

      // Filtrer par type (deliveryId, serviceId, subscriptionId)
      if (type) {
        switch (type) {
          case 'delivery':
            whereClause.deliveryId = { not: null };
            break;
          case 'service':
            whereClause.serviceId = { not: null };
            break;
          case 'subscription':
            whereClause.subscriptionId = { not: null };
            break;
        }
      }

      // Comptage total pour la pagination
      const totalCount = await db.payment.count({ where: whereClause });

      // Récupération des paiements avec relations
      const payments = await db.payment.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              trackingNumber: true,
              deliveryDate: true
            }
          },
          service: {
            select: {
              id: true,
              name: true,
              description: true
            }
          },
          subscription: {
            select: {
              id: true,
              planId: true,
              status: true,
              currentPeriodEnd: true
            }
          },
          refunds: true
        }
      });

      // Calcul de la pagination
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        payments,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage,
          hasPreviousPage
        }
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
      throw error;
    }
  },

  /**
   * Ajoute une méthode de paiement à un utilisateur
   */
  async addPaymentMethod(userId: string, paymentMethodId: string, setAsDefault: boolean = false) {
    try {
      const stripe = getStripeInstance();
      if (!stripe) {
        return {
          success: true,
          message: 'Méthode de paiement simulée ajoutée avec succès',
          paymentMethodId: `pm_mock_${Date.now()}`
        };
      }

      // Récupérer ou créer le customer Stripe
      const user = await db.user.findUnique({ 
        where: { id: userId },
        select: { email: true }
      });

      if (!user || !user.email) {
        throw new Error('Utilisateur ou email non trouvé');
      }

      const customer = await this.getOrCreateStripeCustomer(userId, user.email);

      // Attacher la méthode de paiement au customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Si demandé, définir comme méthode par défaut
      if (setAsDefault) {
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        });
      }

      // Enregistrer la méthode de paiement dans la base de données
      // Récupérer les détails de la méthode de paiement
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      await db.paymentMethod.create({
        data: {
          userId,
          stripePaymentMethodId: paymentMethodId,
          type: paymentMethod.type,
          isDefault: setAsDefault,
          brand: paymentMethod.card?.brand || null,
          last4: paymentMethod.card?.last4 || null,
          expiryMonth: paymentMethod.card?.exp_month || null,
          expiryYear: paymentMethod.card?.exp_year || null,
          fingerprint: paymentMethod.card?.fingerprint || null,
        }
      });

      return {
        success: true,
        message: 'Méthode de paiement ajoutée avec succès',
        paymentMethodId
      };
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la méthode de paiement:', error);
      throw error;
    }
  },

  /**
   * Récupère les méthodes de paiement d'un utilisateur
   */
  async getPaymentMethods(userId: string) {
    try {
      const stripe = getStripeInstance();
      
      // Récupérer les méthodes de paiement de la base de données
      const dbPaymentMethods = await db.paymentMethod.findMany({
        where: { userId }
      });

      if (!stripe) {
        return {
          success: true,
          paymentMethods: dbPaymentMethods
        };
      }

      return {
        success: true,
        paymentMethods: dbPaymentMethods
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des méthodes de paiement:', error);
      throw error;
    }
  },

  /**
   * Supprime une méthode de paiement
   */
  async removePaymentMethod(userId: string, paymentMethodId: string) {
    try {
      const stripe = getStripeInstance();
      
      // Vérifier que la méthode appartient à l'utilisateur
      const paymentMethod = await db.paymentMethod.findFirst({
        where: {
          userId,
          stripePaymentMethodId: paymentMethodId
        }
      });

      if (!paymentMethod) {
        throw new Error('Méthode de paiement non trouvée ou n\'appartient pas à l\'utilisateur');
      }

      // Détacher la méthode de paiement dans Stripe si configuré
      if (stripe) {
        await stripe.paymentMethods.detach(paymentMethodId);
      }

      // Supprimer de la base de données
      await db.paymentMethod.delete({
        where: { id: paymentMethod.id }
      });

      return {
        success: true,
        message: 'Méthode de paiement supprimée avec succès'
      };
    } catch (error) {
      console.error('Erreur lors de la suppression de la méthode de paiement:', error);
      throw error;
    }
  }
};