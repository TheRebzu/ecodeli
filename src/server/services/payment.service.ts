import Stripe from 'stripe';
import { db } from '../db';
import { Decimal } from '@prisma/client/runtime/library';
import { AuthService } from './auth.service';
import { generateRandomCode } from '@/lib/utils';
import { prisma } from '../db';
import { PaymentStatus, AnnouncementStatus, UserRole } from '@prisma/client';
import { NotificationService } from './notification.service';
import { randomBytes } from 'crypto';
import { TRPCError } from '@trpc/server';

// Service d'authentification
const authService = new AuthService();

// Récupérer la clé API Stripe depuis les variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Initialiser Stripe avec les paramètres de base
// Créer une fonction pour obtenir une instance de Stripe à la demande
// pour éviter les erreurs d'initialisation quand la clé n'est pas disponible
const getStripeInstance = () => {
  if (!STRIPE_SECRET_KEY) {
    console.warn('Clé API Stripe non définie. Les fonctionnalités de paiement sont désactivées.');
    return null;
  }

  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
    appInfo: {
      name: 'EcoDeli Financial System',
      version: '1.0.0',
    },
  });
};

// Obtenir l'instance de Stripe pour les méthodes statiques
const stripe = getStripeInstance();

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
export class PaymentService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || db;
  }

  /**
   * Récupère ou crée un client Stripe pour un utilisateur
   */
  async getOrCreateStripeCustomer(userId: string, email: string) {
    try {
      const stripeInstance = getStripeInstance();
      if (!stripeInstance) {
        return { id: 'stripe-mock-customer-id' };
      }

      // Chercher l'utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { accounts: true },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Chercher si l'utilisateur a déjà un compte Stripe
      let stripeCustomerId = user.accounts.find(
        acc => acc.provider === 'stripe'
      )?.providerAccountId;

      // Si aucun client Stripe n'existe, le créer
      if (!stripeCustomerId) {
        const customer = await stripeInstance.customers.create({
          email: email,
          metadata: { userId },
          name: user.name || undefined,
        });

        stripeCustomerId = customer.id;

        // Enregistrer l'identifiant Stripe
        await this.prisma.account.create({
          data: {
            userId,
            provider: 'stripe',
            providerAccountId: customer.id,
            type: 'payment',
          },
        });
      }

      return { id: stripeCustomerId };
    } catch (error) {
      console.error('Erreur lors de la création du client Stripe:', error);
      throw error;
    }
  }

  /**
   * Crée un intent de paiement
   */
  async createPaymentIntent(params: CreatePaymentIntentParams) {
    try {
      const stripeInstance = getStripeInstance();
      if (!stripeInstance) {
        // En développement, créer un faux payment intent pour ne pas bloquer l'application
        console.log('Mode de développement : simulation de paiement');
        const paymentId = `pi_mock_${Date.now()}`;

        // Créer un paiement fictif dans la base de données
        const payment = await this.prisma.payment.create({
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
            paymentMethodType: params.paymentMethodId ? 'card' : undefined,
          },
        });

        return {
          success: true,
          paymentIntentId: paymentId,
          clientSecret: `pi_${paymentId}_secret_${Date.now()}`,
          payment,
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
        isEscrow = false,
      } = params;

      // Récupérer ou créer le client Stripe
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.email) {
        throw new Error('Utilisateur ou email non trouvé');
      }

      const customer = await this.getOrCreateStripeCustomer(userId, user.email);

      // Créer l'intent de paiement
      const paymentIntent = await stripeInstance.paymentIntents.create({
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
          ...metadata,
        },
      });

      // Créer une entrée dans la base de données
      const payment = await this.prisma.payment.create({
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
          paymentMethodType: paymentMethodId ? 'card' : undefined,
        },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        payment,
      };
    } catch (error) {
      console.error('Erreur lors de la création du payment intent:', error);
      throw error;
    }
  }

  /**
   * Crée un paiement en escrow pour une annonce
   */
  async createAnnouncementPayment(
    announcementId: string,
    amount: number,
    userId: string,
    paymentMethodId?: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Vérifier que l'annonce existe et appartient à l'utilisateur
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
        include: {
          client: true,
        },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce introuvable',
        });
      }

      if (announcement.clientId !== userId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à effectuer ce paiement",
        });
      }

      // Vérifier que l'annonce est assignée à un livreur
      if (announcement.status !== 'ASSIGNED' || !announcement.delivererId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "L'annonce n'est pas assignée à un livreur",
        });
      }

      // Créer une intention de paiement chez Stripe
      const stripeInstance = getStripeInstance();
      const stripeCustomer = await this.getOrCreateStripeCustomer(
        userId,
        announcement.client.email
      );

      let paymentIntent;
      if (stripeInstance) {
        paymentIntent = await stripeInstance.paymentIntents.create({
          amount: Math.round(amount * 100), // Stripe utilise les centimes
          currency: 'eur',
          customer: stripeCustomer.id,
          payment_method: paymentMethodId,
          metadata: {
            announcementId,
            type: 'announcement_payment',
            ...metadata,
          },
          confirm: !!paymentMethodId,
          setup_future_usage: 'off_session',
        });
      } else {
        // Mode développement - simuler un paiement
        paymentIntent = {
          id: `pi_mock_${Date.now()}`,
          client_secret: `seti_mock_${Date.now()}`,
          status: 'succeeded',
        };
      }

      // Calculer la commission de la plateforme (7% par défaut)
      const commissionRate = 0.07;
      const commissionAmount = amount * commissionRate;
      const delivererAmount = amount - commissionAmount;

      // Créer le paiement dans notre base de données
      const payment = await this.prisma.payment.create({
        data: {
          amount: new Decimal(amount),
          currency: 'EUR',
          status: PaymentStatus.PENDING,
          paymentIntentId: paymentIntent.id,
          isEscrow: true,
          userId,
          description: `Paiement pour l'annonce: ${announcement.title}`,
          commissionRate: new Decimal(commissionRate),
          commissionAmount: new Decimal(commissionAmount),
          delivererAmount: new Decimal(delivererAmount),
          metadata: metadata || {},
          deliveryId: announcementId,
        },
      });

      return {
        payment,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      };
    } catch (error) {
      console.error('Erreur lors de la création du paiement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de créer le paiement',
      });
    }
  }

  /**
   * Confirme un paiement après autorisation par Stripe
   */
  async confirmAnnouncementPayment(paymentIntentId: string) {
    try {
      // Récupérer les informations du paiement
      const payment = await this.prisma.payment.findFirst({
        where: { paymentIntentId },
        include: {
          delivery: true,
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Paiement non trouvé',
        });
      }

      // Vérifier le statut chez Stripe
      const stripeInstance = getStripeInstance();
      let status = 'succeeded';
      let errorMessage = null;

      if (stripeInstance) {
        const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
        status = paymentIntent.status;
        errorMessage = paymentIntent.last_payment_error?.message;
      }

      if (status === 'succeeded') {
        // Mettre à jour le statut du paiement
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'AUTHORIZED',
            capturedAt: new Date(),
          },
        });

        // Générer un code de libération pour le paiement en escrow
        const escrowReleaseCode = this.generateEscrowReleaseCode();

        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            escrowReleaseCode,
          },
        });

        // Notifier le client et le livreur
        if (payment.deliveryId) {
          const announcementId = payment.deliveryId;

          // Envoyer le code au client uniquement
          await NotificationService.send(
            payment.userId,
            'Code de confirmation de livraison',
            `Votre code de confirmation pour la livraison: ${escrowReleaseCode}`,
            'PAYMENT_INFO',
            `/client/announcements/${announcementId}`,
            { announcementId, escrowReleaseCode }
          );

          // Notifier le livreur que le paiement est prêt
          const announcement = await this.prisma.announcement.findUnique({
            where: { id: announcementId as string },
            select: { delivererId: true },
          });

          if (announcement?.delivererId) {
            await NotificationService.send(
              announcement.delivererId,
              'Paiement confirmé',
              'Le client a effectué le paiement pour la livraison. Vous pouvez commencer.',
              'PAYMENT_CONFIRMED',
              `/deliverer/announcements/${announcementId}`,
              { announcementId }
            );
          }

          // Mettre à jour le statut de l'annonce si nécessaire
          await this.prisma.announcement.update({
            where: { id: announcementId as string },
            data: {
              status: AnnouncementStatus.ASSIGNED,
              paymentStatus: 'PAID',
            },
          });
        }

        return {
          success: true,
          payment: await this.prisma.payment.findUnique({
            where: { id: payment.id },
          }),
        };
      } else {
        // Le paiement a échoué ou est en attente
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status:
              status === 'requires_payment_method' ? PaymentStatus.FAILED : PaymentStatus.PENDING,
            errorMessage: errorMessage,
          },
        });

        return {
          success: false,
          status: status,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('Erreur lors de la confirmation du paiement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de confirmer le paiement',
      });
    }
  }

  /**
   * Libère un paiement en escrow après confirmation de livraison
   */
  async releaseAnnouncementPayment(
    announcementId: string,
    userId: string,
    escrowReleaseCode?: string
  ) {
    try {
      // Vérifier que l'annonce existe
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce introuvable',
        });
      }

      // Vérifier que l'utilisateur est le client ou un admin
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur introuvable',
        });
      }

      const isAuthorized = announcement.clientId === userId || user.role === UserRole.ADMIN;

      if (!isAuthorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à libérer ce paiement",
        });
      }

      // Vérifier le statut de l'annonce
      if (
        announcement.status !== AnnouncementStatus.DELIVERED &&
        announcement.status !== AnnouncementStatus.COMPLETED
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Le statut de l'annonce ne permet pas de libérer le paiement",
        });
      }

      // Récupérer le paiement
      const payment = await this.prisma.payment.findFirst({
        where: {
          deliveryId: announcementId,
          status: 'AUTHORIZED',
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aucun paiement en attente trouvé pour cette annonce',
        });
      }

      // Si un code est requis et que l'utilisateur n'est pas admin, vérifier le code
      if (payment.escrowReleaseCode && !escrowReleaseCode && user.role !== UserRole.ADMIN) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Code de libération requis',
        });
      }

      if (
        payment.escrowReleaseCode &&
        escrowReleaseCode !== payment.escrowReleaseCode &&
        user.role !== UserRole.ADMIN
      ) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Code de libération invalide',
        });
      }

      // Mettre à jour le statut du paiement
      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          escrowReleasedAt: new Date(),
        },
      });

      // Mettre à jour le statut de l'annonce
      await this.prisma.announcement.update({
        where: { id: announcementId },
        data: {
          status: AnnouncementStatus.PAID,
        },
      });

      // Ajouter le montant au portefeuille du livreur
      if (announcement.delivererId && payment.delivererAmount) {
        await this.addFundsToDelivererWallet(
          announcement.delivererId,
          Number(payment.delivererAmount),
          `Paiement pour la livraison: ${announcement.title}`,
          { announcementId, paymentId: payment.id }
        );
      }

      // Notifier le livreur
      if (announcement.delivererId) {
        await NotificationService.send(
          announcement.delivererId,
          'Paiement reçu',
          `Le paiement pour la livraison "${announcement.title}" a été effectué`,
          'PAYMENT_RECEIVED',
          `/deliverer/wallet`,
          { announcementId, paymentId: payment.id }
        );
      }

      return {
        success: true,
        payment: updatedPayment,
      };
    } catch (error) {
      console.error('Erreur lors de la libération du paiement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Impossible de libérer le paiement',
      });
    }
  }

  /**
   * Rembourse un paiement en cas de problème
   */
  async refundAnnouncementPayment(
    announcementId: string,
    userId: string,
    reason: string,
    amount?: number
  ) {
    try {
      // Vérifier les autorisations (admin ou client)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Utilisateur introuvable',
        });
      }

      // Récupérer l'annonce et le paiement
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: announcementId },
      });

      if (!announcement) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Annonce introuvable',
        });
      }

      const isAuthorized = user.role === UserRole.ADMIN || announcement.clientId === userId;

      if (!isAuthorized) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: "Vous n'êtes pas autorisé à effectuer ce remboursement",
        });
      }

      const payment = await this.prisma.payment.findFirst({
        where: {
          deliveryId: announcementId,
          status: {
            in: ['AUTHORIZED', 'COMPLETED'],
          },
        },
      });

      if (!payment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aucun paiement trouvé pour cette annonce',
        });
      }

      // Si le paiement a un ID Stripe, effectuer le remboursement via Stripe
      const stripeInstance = getStripeInstance();
      if (payment.paymentIntentId && stripeInstance) {
        const refundAmount = amount ? Math.round(amount * 100) : undefined; // Stripe utilise les centimes

        const refund = await stripeInstance.refunds.create({
          payment_intent: payment.paymentIntentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            announcementId,
            reason,
            userId,
          },
        });

        // Mettre à jour le paiement dans notre base de données
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundId: refund.id,
            refundedAmount: new Decimal(refundAmount ? refundAmount / 100 : Number(payment.amount)),
            refundedAt: new Date(),
          },
        });

        // Mettre à jour le statut de l'annonce si nécessaire
        if (announcement.status !== AnnouncementStatus.CANCELLED) {
          await this.prisma.announcement.update({
            where: { id: announcementId },
            data: {
              status: AnnouncementStatus.CANCELLED,
              cancelReason: reason,
            },
          });
        }

        // Notifier le client et le livreur
        await NotificationService.send(
          announcement.clientId,
          'Remboursement effectué',
          `Votre paiement pour l'annonce "${announcement.title}" a été remboursé`,
          'PAYMENT_REFUNDED',
          `/client/announcements/${announcementId}`,
          { announcementId, refundId: refund.id }
        );

        if (announcement.delivererId) {
          await NotificationService.send(
            announcement.delivererId,
            'Annonce remboursée',
            `Le paiement pour l'annonce "${announcement.title}" a été remboursé au client`,
            'PAYMENT_REFUNDED',
            `/deliverer/announcements/${announcementId}`,
            { announcementId }
          );
        }

        return {
          success: true,
          refundId: refund.id,
        };
      } else {
        // Mode développement - simuler un remboursement
        const mockRefundId = `re_mock_${Date.now()}`;

        // Mettre à jour le paiement
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            refundId: mockRefundId,
            refundedAmount: new Decimal(amount || Number(payment.amount)),
            refundedAt: new Date(),
          },
        });

        // Mettre à jour le statut de l'annonce
        await this.prisma.announcement.update({
          where: { id: announcementId },
          data: {
            status: AnnouncementStatus.CANCELLED,
            cancelReason: reason,
          },
        });

        // Notifier les parties
        await NotificationService.send(
          announcement.clientId,
          'Remboursement effectué',
          `Votre paiement pour l'annonce "${announcement.title}" a été remboursé`,
          'PAYMENT_REFUNDED',
          `/client/announcements/${announcementId}`,
          { announcementId, refundId: mockRefundId }
        );

        if (announcement.delivererId) {
          await NotificationService.send(
            announcement.delivererId,
            'Annonce remboursée',
            `Le paiement pour l'annonce "${announcement.title}" a été remboursé au client`,
            'PAYMENT_REFUNDED',
            `/deliverer/announcements/${announcementId}`,
            { announcementId }
          );
        }

        return {
          success: true,
          refundId: mockRefundId,
        };
      }
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Impossible d'effectuer le remboursement",
      });
    }
  }

  /**
   * Génère un code unique pour la libération d'un paiement escrow
   */
  private generateEscrowReleaseCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  /**
   * Ajoute des fonds au portefeuille d'un livreur
   */
  private async addFundsToDelivererWallet(
    delivererId: string,
    amount: number,
    description: string,
    metadata?: Record<string, any>
  ) {
    // Récupérer ou créer le portefeuille du livreur
    const wallet = await this.prisma.wallet.upsert({
      where: { userId: delivererId },
      update: {
        balance: {
          increment: amount,
        },
        lastTransactionAt: new Date(),
      },
      create: {
        userId: delivererId,
        balance: amount,
        lastTransactionAt: new Date(),
      },
    });

    // Enregistrer la transaction
    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: new Decimal(amount),
        currency: 'EUR',
        type: 'EARNING',
        status: 'COMPLETED',
        description,
        previousBalance: wallet.balance - amount,
        balanceAfter: wallet.balance,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    return wallet;
  }
}

// Instancier et exporter le service
export const paymentService = new PaymentService();
