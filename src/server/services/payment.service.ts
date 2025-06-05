import { db } from '@/server/db';
import { Decimal } from '@prisma/client/runtime/library';
import { TRPCError } from '@trpc/server';
import { stripeService } from './stripe.service';
import { walletService } from './wallet.service';
import { PaymentStatus, TransactionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import {
  CreatePaymentInput,
  ProcessPaymentInput,
  RefundPaymentInput,
} from '../../schemas/payment.schema';
import { createInvoice } from './invoice.service';
import { addWalletTransaction } from './wallet.service';
import { logger } from '../../lib/logger';
import { createCommission } from './commission.service';

/**
 * Service de gestion des paiements
 */
export const paymentService = {
  /**
   * Initialise un paiement pour un service ou une livraison
   */
  async initiatePayment(data: {
    userId: string;
    amount: number;
    description: string;
    currency?: string;
    serviceId?: string;
    deliveryId?: string;
    invoiceId?: string;
    isEscrow?: boolean;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  }) {
    const {
      userId,
      amount,
      description,
      currency = 'EUR',
      serviceId,
      deliveryId,
      invoiceId,
      isEscrow = false,
      paymentMethodId,
      metadata = {},
    } = data;

    // Créer l'enregistrement de paiement en statut PENDING
    const payment = await db.payment.create({
      data: {
        userId,
        amount: new Decimal(amount),
        currency,
        status: PaymentStatus.PENDING,
        description,
        serviceId,
        deliveryId,
        invoiceId,
        isEscrow,
        paymentMethodId,
        paymentMethodType: paymentMethodId ? 'CARD' : 'WALLET',
        source: process.env.DEMO_MODE === 'true' ? 'DEMO' : 'STRIPE',
        metadata,
      },
    });

    // En mode démo, on peut simuler un paiement direct depuis le portefeuille
    if (process.env.DEMO_MODE === 'true' && process.env.DEMO_DIRECT_PAYMENTS === 'true') {
      await this.processSuccessfulPayment(payment.id, amount, {
        ...metadata,
        demoDirectPayment: true,
      });

      return {
        payment: await db.payment.findUnique({
          where: { id: payment.id },
        }),
        redirectUrl: null,
        clientSecret: null,
        demoMode: true,
      };
    }

    // Sinon, créer une intention de paiement Stripe
    const paymentMetadata = {
      paymentId: payment.id,
      userId,
      serviceId: serviceId || '',
      deliveryId: deliveryId || '',
      invoiceId: invoiceId || '',
      description,
      isEscrow: isEscrow ? 'true' : 'false',
    };

    try {
      const intent = await stripeService.createPaymentIntent(
        Math.round(amount * 100),
        currency,
        paymentMetadata
      );

      // Mettre à jour le paiement avec l'ID Stripe
      await db.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentId: intent.id,
          paymentIntentId: intent.id,
        },
      });

      return {
        payment,
        clientSecret: intent.client_secret,
        redirectUrl: null,
        demoMode: process.env.DEMO_MODE === 'true',
      };
    } catch (error) {
      // En cas d'erreur, marquer le paiement comme échoué
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Échec de l'initialisation du paiement",
        cause: error,
      });
    }
  },

  /**
   * Traite un paiement réussi (appelé par webhook ou en mode démo)
   */
  async processSuccessfulPayment(
    paymentId: string,
    amount: number,
    metadata: Record<string, any> = {}
  ) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        delivery: true,
        service: true,
        invoice: true,
      },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Paiement non trouvé',
      });
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      console.log(`Paiement ${paymentId} déjà marqué comme complété`);
      return payment;
    }

    try {
      return await db.$transaction(async tx => {
        // Mettre à jour le statut du paiement
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.COMPLETED,
            capturedAt: new Date(),
            metadata: {
              ...payment.metadata,
              ...metadata,
            },
          },
        });

        // Traiter les différents types de paiements
        if (payment.deliveryId) {
          await this._processDeliveryPayment(tx, payment, metadata);
        } else if (payment.serviceId) {
          await this._processServicePayment(tx, payment, metadata);
        } else if (payment.invoiceId) {
          await this._processInvoicePayment(tx, payment, metadata);
        } else if (payment.subscriptionId) {
          await this._processSubscriptionPayment(tx, payment, metadata);
        }

        return updatedPayment;
      });
    } catch (error) {
      console.error('Erreur lors du traitement du paiement réussi:', error);

      // Marquer le paiement comme problématique
      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        },
      });

      throw error;
    }
  },

  /**
   * Traite un paiement échoué
   */
  async processFailedPayment(paymentId: string, reason: string) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Paiement non trouvé',
      });
    }

    return await db.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        errorMessage: reason,
      },
    });
  },

  /**
   * Traite un paiement de facture
   */
  async processInvoicePayment(invoiceId: string, paymentId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Facture non trouvée',
      });
    }

    return await db.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
      },
    });
  },

  /**
   * Traite un paiement sortant (payout/retrait)
   */
  async processSuccessfulPayout(payoutId: string, amount: number, walletId: string) {
    // Cette fonction simule le traitement d'un paiement sortant après confirmation
    // par le fournisseur de paiement (Stripe ou autre)

    return await db.walletTransaction.update({
      where: { id: payoutId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  },

  /**
   * Traite les événements d'abonnement
   */
  async handleSubscriptionEvent(
    eventType: string,
    subscriptionId: string,
    metadata: Record<string, any> = {}
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

    switch (eventType) {
      case 'subscription.created':
        return await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'ACTIVE',
            metadata: { ...subscription.metadata, ...metadata },
          },
        });

      case 'subscription.updated':
        return await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            metadata: { ...subscription.metadata, ...metadata },
          },
        });

      case 'subscription.deleted':
        return await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            metadata: { ...subscription.metadata, ...metadata },
          },
        });

      default:
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Type d'événement non pris en charge: ${eventType}`,
        });
    }
  },

  /**
   * Rembourse un paiement
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
      },
    });

    if (!payment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Paiement non trouvé',
      });
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Seuls les paiements complétés peuvent être remboursés',
      });
    }

    // Montant à rembourser (total ou partiel)
    const refundAmount = amount ? new Decimal(amount) : payment.amount;

    // Vérifier que le montant à rembourser ne dépasse pas le montant initial
    if (refundAmount.gt(payment.amount)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Le montant du remboursement ne peut pas dépasser le montant initial',
      });
    }

    try {
      return await db.$transaction(async tx => {
        // Mettre à jour le paiement original
        const updatedPayment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: refundAmount.eq(payment.amount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.COMPLETED,
            refundedAmount: refundAmount,
            refundedAt: new Date(),
          },
        });

        // Créer un paiement de remboursement
        const refundPayment = await tx.payment.create({
          data: {
            userId: payment.userId,
            amount: refundAmount.negated(), // Montant négatif pour un remboursement
            currency: payment.currency,
            status: PaymentStatus.COMPLETED,
            description: `Remboursement: ${payment.description}`,
            refundId: paymentId,
            capturedAt: new Date(),
            metadata: {
              originalPaymentId: paymentId,
              reason: reason || 'Remboursement demandé',
              isRefund: true,
            },
          },
        });

        // En mode démo, simuler un remboursement sur le portefeuille du client
        if (process.env.DEMO_MODE === 'true') {
          const wallet = await walletService.getOrCreateWallet(payment.userId);

          await walletService.createWalletTransaction(wallet.id, {
            amount: Number(refundAmount),
            type: TransactionType.REFUND,
            description: `Remboursement: ${payment.description}`,
            reference: `REFUND-${uuidv4()}`,
            metadata: {
              originalPaymentId: paymentId,
              refundPaymentId: refundPayment.id,
              reason: reason || 'Remboursement demandé',
            },
          });
        }

        return {
          originalPayment: updatedPayment,
          refundPayment,
        };
      });
    } catch (error) {
      console.error('Erreur lors du remboursement:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Échec du remboursement',
        cause: error,
      });
    }
  },

  /**
   * MÉTHODES PRIVÉES
   */

  /**
   * Traite le paiement d'une livraison
   * @private
   */
  async _processDeliveryPayment(tx: any, payment: any, metadata: Record<string, any> = {}) {
    if (!payment.delivery) {
      throw new Error('Données de livraison manquantes');
    }

    // Mettre à jour le statut de la livraison
    await tx.delivery.update({
      where: { id: payment.deliveryId },
      data: {
        currentStatus: 'PAID',
        // Ajouter d'autres mises à jour de statut si nécessaire
      },
    });

    // Si la livraison a un livreur assigné, ajouter les fonds à son portefeuille
    // avec la commission déduite
    if (payment.delivery.delivererId && process.env.DEMO_MODE === 'true') {
      // Pour la démo, calculer une commission simple de 15%
      const commissionRate = 0.15;
      const commissionAmount = payment.amount.mul(commissionRate);
      const delivererAmount = payment.amount.sub(commissionAmount);

      // Créer l'enregistrement de commission
      const commission = await tx.commission.create({
        data: {
          rate: new Decimal(commissionRate),
          serviceType: 'DELIVERY',
          isActive: true,
          applicableRoles: ['DELIVERER'],
          description: `Commission sur livraison #${payment.deliveryId}`,
        },
      });

      // Mise à jour du paiement avec la commission
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          commissionAmount,
          commissionId: commission.id,
        },
      });

      // Ajouter les fonds au portefeuille du livreur
      const delivererWallet = await walletService.getOrCreateWallet(payment.delivery.delivererId);

      await walletService.createWalletTransaction(delivererWallet.id, {
        amount: Number(delivererAmount),
        type: TransactionType.EARNING,
        description: `Paiement pour livraison #${payment.deliveryId} (commission déduite)`,
        paymentId: payment.id,
        deliveryId: payment.deliveryId,
        metadata: {
          commissionId: commission.id,
          commissionAmount: Number(commissionAmount),
          commissionRate,
        },
      });
    }

    // Ajouter les fonds au portefeuille du marchand si nécessaire
    if (payment.merchantId && payment.merchantWalletId) {
      const wallet = await walletService.getWallet(payment.merchantId);

      // Calcul de la commission marchande
      const merchantFeeRate = 0.1; // 10% de commission pour les marchands
      const merchantFee = payment.amount * merchantFeeRate;
      const merchantAmount = payment.amount - merchantFee;

      // Ajouter les fonds au portefeuille du marchand
      await walletService.createWalletTransaction(wallet.id, {
        amount: merchantAmount,
        type: TransactionType.EARNING,
        description: `Paiement pour livraison #${payment.deliveryId}`,
        paymentId: payment.id,
        deliveryId: payment.deliveryId,
        metadata: {
          ...metadata,
          feeAmount: merchantFee,
          feeRate: merchantFeeRate,
        },
      });
    }
  },

  /**
   * Traite le paiement d'un service
   * @private
   */
  async _processServicePayment(tx: any, payment: any, metadata: Record<string, any> = {}) {
    if (!payment.service) {
      throw new Error('Données de service manquantes');
    }

    // Mettre à jour les réservations de service associées
    await tx.serviceBooking.updateMany({
      where: {
        serviceId: payment.serviceId,
        paymentId: null,
        status: 'PENDING',
      },
      data: {
        paymentId: payment.id,
        status: 'CONFIRMED',
      },
    });

    // Si en mode démo, simuler le paiement au prestataire avec commission
    if (process.env.DEMO_MODE === 'true') {
      // Pour la démo, calculer une commission simple de 20%
      const commissionRate = 0.2;
      const commissionAmount = payment.amount.mul(commissionRate);
      const providerAmount = payment.amount.sub(commissionAmount);

      // Créer l'enregistrement de commission
      const commission = await tx.commission.create({
        data: {
          rate: new Decimal(commissionRate),
          serviceType: 'SERVICE',
          isActive: true,
          applicableRoles: ['PROVIDER'],
          description: `Commission sur service #${payment.serviceId}`,
        },
      });

      // Mise à jour du paiement avec la commission
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          commissionAmount,
          commissionId: commission.id,
        },
      });

      // Ajouter les fonds au portefeuille du prestataire
      const service = await tx.service.findUnique({
        where: { id: payment.serviceId },
      });

      if (service?.providerId) {
        const providerWallet = await walletService.getOrCreateWallet(service.providerId);

        await walletService.createWalletTransaction(providerWallet.id, {
          amount: Number(providerAmount),
          type: TransactionType.EARNING,
          description: `Paiement pour service #${payment.serviceId} (commission déduite)`,
          paymentId: payment.id,
          serviceId: payment.serviceId,
          metadata: {
            commissionId: commission.id,
            commissionAmount: Number(commissionAmount),
            commissionRate,
          },
        });
      }
    }
  },

  /**
   * Traite le paiement d'une facture
   * @private
   */
  async _processInvoicePayment(tx: any, payment: any, metadata: Record<string, any> = {}) {
    if (!payment.invoice) {
      throw new Error('Données de facture manquantes');
    }

    // Mettre à jour la facture
    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
      },
    });
  },

  /**
   * Traite le paiement d'un abonnement
   * @private
   */
  async _processSubscriptionPayment(tx: any, payment: any, metadata: Record<string, any> = {}) {
    if (!payment.subscriptionId) {
      throw new Error("ID d'abonnement manquant");
    }

    // Mettre à jour l'abonnement
    await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: 'ACTIVE',
        // Définir la période en cours
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      },
    });
  },
};

/**
 * Crée un paiement simulé en mode démonstration
 */
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const {
    userId,
    amount,
    currency,
    description,
    isEscrow,
    serviceType,
    deliveryId,
    serviceId,
    subscriptionId,
    demoSuccessScenario = true,
    demoDelayMs = 1000,
  } = input;

  // Si ce n'est pas une démo et qu'on n'est pas en environnement de test, vérifier que le mode démo est activé
  if (!input.isDemo && process.env.NODE_ENV !== 'test' && !process.env.DEMO_PAYMENTS_ENABLED) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Les paiements réels ne sont pas activés sur cette instance',
    });
  }

  // Vérifier l'existence de l'utilisateur
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Utilisateur non trouvé',
    });
  }

  // Vérifier les références selon le type de service
  if (serviceType === 'DELIVERY' && !deliveryId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'ID de livraison requis pour un paiement de type DELIVERY',
    });
  }

  if (serviceType === 'SERVICE' && !serviceId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'ID de service requis pour un paiement de type SERVICE',
    });
  }

  if (serviceType === 'SUBSCRIPTION' && !subscriptionId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "ID d'abonnement requis pour un paiement de type SUBSCRIPTION",
    });
  }

  // Simuler un délai de traitement
  if (demoDelayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, demoDelayMs));
  }

  // Simuler un scénario d'échec si demandé
  if (!demoSuccessScenario) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Paiement refusé (simulation de scénario d'échec)",
    });
  }

  // Générer un ID de paiement Stripe simulé
  const stripePaymentId = `demo_pi_${randomUUID().replace(/-/g, '')}`;

  // Créer le paiement dans la base de données
  const payment = await db.payment.create({
    data: {
      userId,
      amount,
      currency,
      description,
      status: isEscrow ? PaymentStatus.PENDING : PaymentStatus.COMPLETED,
      isEscrow,
      stripePaymentId,
      paymentIntentId: stripePaymentId,
      deliveryId,
      serviceId,
      subscriptionId,
      paymentProvider: 'STRIPE',
      capturedAt: isEscrow ? null : new Date(),
      source: input.source || 'DEMO',
      notes: input.notes,
      metadata: input.metadata || {},
    },
  });

  // Si c'est un paiement de livraison et qu'il est mis en séquestre, générer un code de libération
  if (isEscrow && deliveryId) {
    const escrowReleaseCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.payment.update({
      where: { id: payment.id },
      data: {
        escrowReleaseCode,
        escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours par défaut
      },
    });
  }

  // Calculer et créer la commission si applicable
  if (
    payment.status === PaymentStatus.COMPLETED &&
    (serviceType === 'DELIVERY' || serviceType === 'SERVICE')
  ) {
    try {
      await createCommission({
        paymentId: payment.id,
        serviceType,
        amount,
      });
    } catch (error) {
      logger.error('Erreur lors de la création de la commission', error);
      // Ne pas échouer le paiement si la commission échoue
    }
  }

  // Créer une facture si le paiement est complété
  if (payment.status === PaymentStatus.COMPLETED) {
    try {
      await createInvoice({
        userId,
        paymentId: payment.id,
        amount,
        invoiceType: serviceType,
        billingName: user.name,
      });
    } catch (error) {
      logger.error('Erreur lors de la création de la facture', error);
      // Ne pas échouer le paiement si la facture échoue
    }
  }

  return payment;
}

/**
 * Crée une intention de paiement simulée
 */
export async function processPaymentIntent(input: ProcessPaymentInput): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}> {
  const { paymentId, action, amount, demoSuccessScenario = true } = input;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Paiement non trouvé',
    });
  }

  // Simuler un scénario d'échec si demandé
  if (!demoSuccessScenario) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Action ${action} refusée (simulation de scénario d'échec)`,
    });
  }

  // Traiter selon l'action demandée
  switch (action) {
    case 'capture':
      if (payment.status !== PaymentStatus.PENDING) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce paiement ne peut pas être capturé',
        });
      }

      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          capturedAt: new Date(),
        },
      });
      break;

    case 'cancel':
      if (payment.status !== PaymentStatus.PENDING) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce paiement ne peut pas être annulé',
        });
      }

      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });
      break;

    case 'refund':
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce paiement ne peut pas être remboursé',
        });
      }

      const refundAmount = amount || payment.amount;

      await db.payment.update({
        where: { id: paymentId },
        data: {
          status: refundAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED,
          refundedAmount: refundAmount,
          refundedAt: new Date(),
        },
      });
      break;

    case 'dispute':
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Ce paiement ne peut pas être contesté',
        });
      }

      await db.payment.update({
        where: { id: paymentId },
        data: {
          disputeStatus: 'UNDER_REVIEW',
        },
      });
      break;

    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Action non reconnue',
      });
  }

  // Récupérer le paiement mis à jour
  const updatedPayment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  // Générer une réponse simulée pour l'intention de paiement
  return {
    clientSecret: `demo_pi_secret_${randomUUID().replace(/-/g, '')}`,
    paymentIntentId: updatedPayment?.paymentIntentId || `demo_pi_${randomUUID().replace(/-/g, '')}`,
    status: updatedPayment?.status || 'unknown',
  };
}

/**
 * Confirme un paiement simulé
 */
export async function confirmPayment(paymentId: string): Promise<Payment> {
  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Paiement non trouvé',
    });
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Ce paiement ne peut pas être confirmé',
    });
  }

  // Mettre à jour le statut du paiement
  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.COMPLETED,
      capturedAt: new Date(),
    },
  });

  // Si c'est un paiement pour une livraison, mettre à jour le status de la livraison
  if (payment.deliveryId) {
    try {
      await db.delivery.update({
        where: { id: payment.deliveryId },
        data: {
          status: 'PENDING_PICKUP', // Statut à adapter selon votre modèle
        },
      });
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du statut de livraison', error);
    }
  }

  return updatedPayment;
}

/**
 * Rembourse un paiement simulé
 */
export async function refundPayment(input: RefundPaymentInput): Promise<Payment> {
  const { paymentId, amount, reason, demoSuccessScenario = true } = input;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Paiement non trouvé',
    });
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Ce paiement ne peut pas être remboursé',
    });
  }

  // Simuler un scénario d'échec si demandé
  if (!demoSuccessScenario) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Remboursement refusé (simulation de scénario d'échec)",
    });
  }

  const refundAmount = amount || payment.amount;
  const refundId = `demo_re_${randomUUID().replace(/-/g, '')}`;

  // Mettre à jour le paiement avec les informations de remboursement
  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: refundAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED,
      refundedAmount: refundAmount,
      refundedAt: new Date(),
      refundId,
      notes: payment.notes
        ? `${payment.notes}\nRemboursement: ${reason}`
        : `Remboursement: ${reason}`,
    },
  });

  // Créer une transaction de remboursement dans le portefeuille si nécessaire
  if (payment.userId) {
    try {
      await addWalletTransaction({
        userId: payment.userId,
        amount: refundAmount,
        type: TransactionType.REFUND,
        description: `Remboursement: ${reason || 'Remboursement demandé'}`,
        reference: refundId,
        paymentId: payment.id,
      });
    } catch (error) {
      logger.error('Erreur lors de la création de la transaction de remboursement', error);
    }
  }

  return updatedPayment;
}

/**
 * Récupère l'historique des paiements d'un utilisateur
 */
export async function getPaymentHistory(
  userId: string,
  options: {
    limit?: number;
    page?: number;
    status?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    type?: string;
  } = {}
): Promise<{ payments: Payment[]; total: number; pages: number }> {
  const { limit = 10, page = 1, status, startDate, endDate, type } = options;
  const skip = (page - 1) * limit;

  // Construire les filtres
  const where: any = { userId };

  if (status) {
    where.status = status;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (type) {
    if (type === 'DELIVERY') {
      where.deliveryId = { not: null };
    } else if (type === 'SERVICE') {
      where.serviceId = { not: null };
    } else if (type === 'SUBSCRIPTION') {
      where.subscriptionId = { not: null };
    }
  }

  // Compter le nombre total de paiements
  const total = await db.payment.count({ where });
  const pages = Math.ceil(total / limit);

  // Récupérer les paiements
  const payments = await db.payment.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return { payments, total, pages };
}

/**
 * Bloque un paiement en attente jusqu'à la livraison
 */
export async function holdPaymentForDelivery(
  paymentId: string,
  deliveryId: string,
  options: {
    releaseAfterDays?: number;
    generateReleaseCode?: boolean;
  } = {}
): Promise<Payment> {
  const { releaseAfterDays = 7, generateReleaseCode = true } = options;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Paiement non trouvé',
    });
  }

  if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.COMPLETED) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Ce paiement ne peut pas être mis en séquestre',
    });
  }

  // Vérifier que la livraison existe
  const delivery = await db.delivery.findUnique({
    where: { id: deliveryId },
  });

  if (!delivery) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Livraison non trouvée',
    });
  }

  // Générer un code de libération si demandé
  const escrowReleaseCode = generateReleaseCode
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : null;

  // Calculer la date de libération automatique
  const escrowReleaseDate = new Date();
  escrowReleaseDate.setDate(escrowReleaseDate.getDate() + releaseAfterDays);

  // Mettre à jour le paiement
  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      isEscrow: true,
      status: PaymentStatus.PENDING,
      deliveryId,
      escrowReleaseCode,
      escrowReleaseDate,
    },
  });

  return updatedPayment;
}

/**
 * Libère un paiement bloqué vers le livreur
 */
export async function releasePaymentToDeliverer(
  paymentId: string,
  options: {
    releaseCode?: string;
    releaseByAdmin?: boolean;
    adminId?: string;
  } = {}
): Promise<Payment> {
  const { releaseCode, releaseByAdmin = false, adminId } = options;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
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

  if (!payment.isEscrow || payment.status !== PaymentStatus.PENDING) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Ce paiement ne peut pas être libéré',
    });
  }

  // Vérifier la livraison associée
  if (!payment.delivery || !payment.deliveryId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Ce paiement n'est pas associé à une livraison",
    });
  }

  // Vérifier le livreur associé
  if (!payment.delivery.delivererId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "Cette livraison n'a pas de livreur assigné",
    });
  }

  // Vérifier le code de libération si nécessaire
  if (!releaseByAdmin && payment.escrowReleaseCode && payment.escrowReleaseCode !== releaseCode) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Code de libération invalide',
    });
  }

  // Vérifier l'autorisation d'admin si nécessaire
  if (releaseByAdmin && !adminId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "ID d'administrateur requis pour la libération administrative",
    });
  }

  // Mettre à jour le paiement
  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.COMPLETED,
      escrowReleasedAt: new Date(),
      capturedAt: new Date(),
      notes: payment.notes
        ? `${payment.notes}\nPaiement libéré ${releaseByAdmin ? 'par admin' : ''}`
        : `Paiement libéré ${releaseByAdmin ? 'par admin' : ''}`,
    },
  });

  // Ajouter les fonds au portefeuille du livreur
  try {
    const delivererId = payment.delivery.delivererId;

    // Calcul de la commission (généralement 15% par défaut)
    const commissionRate = 0.15; // À adapter selon votre logique métier
    const commissionAmount = payment.amount * commissionRate;
    const delivererAmount = payment.amount - commissionAmount;

    await addWalletTransaction({
      userId: delivererId,
      amount: delivererAmount,
      type: TransactionType.EARNING,
      description: `Paiement pour livraison #${payment.deliveryId}`,
      paymentId: payment.id,
    });

    // Enregistrer la commission perçue
    await createCommission({
      paymentId: payment.id,
      serviceType: 'DELIVERY',
      amount: payment.amount,
      recipientId: delivererId,
      commissionAmount,
    });
  } catch (error) {
    logger.error("Erreur lors de l'ajout des fonds au portefeuille du livreur", error);
    // Ne pas échouer le processus de libération
  }

  return updatedPayment;
}
