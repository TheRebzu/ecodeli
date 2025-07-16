import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotificationService } from "@/features/notifications/services/notification.service";

export interface CreatePaymentIntentInput {
  announcementId: string;
  amount: number;
  currency?: string;
  clientId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  status: string;
}

export interface SubscriptionPricing {
  plan: "FREE" | "STARTER" | "PREMIUM";
  discountPercentage: number;
  urgencyFeePercentage: number;
  insuranceIncluded: boolean;
  maxInsuranceValue: number;
}

/**
 * Service de gestion des paiements Stripe pour les annonces EcoDeli
 * Gère le workflow de paiement en séquestre selon le cahier des charges
 */
class AnnouncementPaymentService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Créer un Payment Intent pour une annonce
   */
  async createPaymentIntent(
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntentResult> {
    try {
      // Vérifier si Stripe est configuré
      let stripe;
      try {
        stripe = getStripe();
      } catch (error) {
        logger.error("Stripe not configured", { error: error.message });
        throw new Error("Payment system not configured");
      }

      const { announcementId, amount, currency = "eur", clientId, metadata } = input;

      // Vérifier que l'annonce existe
      const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId },
        include: { author: true },
      });

      if (!announcement) {
        throw new Error("Announcement not found");
      }

      // Créer le Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir en centimes
        currency,
        metadata: {
          announcementId,
          clientId,
          ...metadata,
        },
      });

      // Enregistrer le paiement en base
      await prisma.payment.create({
        data: {
          id: paymentIntent.id,
          userId: clientId,
          announcementId,
          amount: amount,
          currency,
          status: "PENDING",
          type: "DELIVERY",
          stripePaymentId: paymentIntent.id,
        },
      });

      logger.info("Payment intent created", {
        paymentIntentId: paymentIntent.id,
        announcementId,
        amount,
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error("Error creating payment intent", { error, input });
      throw error;
    }
  }

  /**
   * Confirmer un paiement
   */
  async confirmPayment(paymentIntentId: string): Promise<void> {
    try {
      // Vérifier si Stripe est configuré
      let stripe;
      try {
        stripe = getStripe();
      } catch (error) {
        logger.error("Stripe not configured", { error: error.message });
        throw new Error("Payment system not configured");
      }

      // Récupérer le Payment Intent depuis Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === "succeeded") {
        // Mettre à jour le statut en base
        await prisma.payment.update({
          where: { id: paymentIntentId },
          data: { status: "COMPLETED" },
        });

        // Notifier le succès
        const payment = await prisma.payment.findUnique({
          where: { id: paymentIntentId },
          include: { announcement: true, user: true },
        });

        if (payment?.user) {
          await this.notificationService.notifyPaymentReceived(
            payment.user.id,
            payment.amount,
            `Votre paiement de ${payment.amount}€ a été confirmé`,
            "payment"
          );
        }

        logger.info("Payment confirmed", { paymentIntentId });
      }
    } catch (error) {
      logger.error("Error confirming payment", { error, paymentIntentId });
      throw error;
    }
  }

  /**
   * Annuler un paiement
   */
  async cancelPayment(paymentIntentId: string): Promise<void> {
    try {
      // Vérifier si Stripe est configuré
      let stripe;
      try {
        stripe = getStripe();
      } catch (error) {
        logger.error("Stripe not configured", { error: error.message });
        throw new Error("Payment system not configured");
      }

      // Annuler le Payment Intent
      await stripe.paymentIntents.cancel(paymentIntentId);

      // Mettre à jour le statut en base
      await prisma.payment.update({
        where: { id: paymentIntentId },
        data: { status: "CANCELLED" },
      });

      logger.info("Payment cancelled", { paymentIntentId });
    } catch (error) {
      logger.error("Error cancelling payment", { error, paymentIntentId });
      throw error;
    }
  }

  /**
   * Récupérer les paiements d'une annonce
   */
  async getAnnouncementPayments(announcementId: string) {
    try {
      const payments = await prisma.payment.findMany({
        where: { announcementId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return payments;
    } catch (error) {
      logger.error("Error getting announcement payments", { error, announcementId });
      throw error;
    }
  }

  /**
   * Récupérer le statut d'un paiement
   */
  async getPaymentStatus(paymentIntentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentIntentId },
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      return payment;
    } catch (error) {
      logger.error("Error getting payment status", { error, paymentIntentId });
      throw error;
    }
  }

  /**
   * Calcule le montant final avec réductions d'abonnement et frais d'urgence
   */
  private static calculateFinalAmount(
    baseAmount: number,
    plan: string,
    isUrgent: boolean,
  ): number {
    const pricing = this.getSubscriptionPricing(plan);

    let finalAmount = baseAmount;

    // Appliquer réduction d'abonnement
    if (pricing.discountPercentage > 0) {
      finalAmount = finalAmount * (1 - pricing.discountPercentage / 100);
    }

    // Appliquer frais d'urgence
    if (isUrgent) {
      finalAmount = finalAmount * (1 + pricing.urgencyFeePercentage / 100);
    }

    // Frais de plateforme EcoDeli (5% du montant)
    const platformFee = finalAmount * 0.05;
    finalAmount += platformFee;

    return Math.round(finalAmount * 100) / 100;
  }

  /**
   * Configuration des tarifs selon les abonnements EcoDeli
   */
  private static getSubscriptionPricing(plan: string): SubscriptionPricing {
    const pricingConfig: Record<string, SubscriptionPricing> = {
      FREE: {
        plan: "FREE",
        discountPercentage: 0,
        urgencyFeePercentage: 15,
        insuranceIncluded: false,
        maxInsuranceValue: 115,
      },
      STARTER: {
        plan: "STARTER",
        discountPercentage: 5,
        urgencyFeePercentage: 15,
        insuranceIncluded: true,
        maxInsuranceValue: 115,
      },
      PREMIUM: {
        plan: "PREMIUM",
        discountPercentage: 9,
        urgencyFeePercentage: 5,
        insuranceIncluded: true,
        maxInsuranceValue: 3000,
      },
    };

    return pricingConfig[plan] || pricingConfig.FREE;
  }

  /**
   * Traite la confirmation de paiement et active l'annonce
   */
  private static async handlePaymentConfirmed(
    paymentId: string,
    paymentIntent: any,
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Mettre à jour le paiement
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "CONFIRMED",
            metadata: {
              paymentIntentStatus: paymentIntent.status,
              confirmedAt: new Date().toISOString(),
            },
          },
          include: { announcement: true },
        });

        // Activer l'annonce
        await tx.announcement.update({
          where: { id: payment.announcementId! },
          data: {
            status: "ACTIVE",
            publishedAt: new Date(),
            finalPrice: payment.amount,
          },
        });

        logger.info(
          `Annonce ${payment.announcementId} activée après paiement confirmé`,
        );
      });
    } catch (error) {
      logger.error(`Erreur traitement paiement confirmé:`, error);
      throw error;
    }
  }

  /**
   * Transfert vers le wallet du livreur après livraison validée
   */
  private static async transferToDelivererWallet(
    delivererId: string,
    payment: any,
  ): Promise<void> {
    try {
      const delivererFee = this.calculateDelivererFee(payment.amount);

      // Récupérer ou créer le wallet du livreur
      const wallet = await prisma.wallet.upsert({
        where: { userId: delivererId },
        update: {
          balance: {
            increment: delivererFee,
          },
        },
        create: {
          userId: delivererId,
          balance: delivererFee,
          currency: payment.currency || "EUR",
        },
      });

      // Enregistrer l'opération
      await prisma.walletOperation.create({
        data: {
          walletId: wallet.id,
          userId: delivererId,
          type: "DELIVERY_PAYMENT",
          amount: delivererFee,
          description: `Paiement livraison - ${payment.announcement?.title}`,
          reference: payment.id,
          status: "COMPLETED",
          executedAt: new Date(),
        },
      });

      logger.info(
        `Transfert wallet effectué: ${delivererFee}€ vers livreur ${delivererId}`,
      );
    } catch (error) {
      logger.error(`Erreur transfert wallet:`, error);
      throw error;
    }
  }

  /**
   * Calcule la part du livreur (80% du montant hors frais plateforme)
   */
  private static calculateDelivererFee(totalAmount: number): number {
    const platformFeeRate = 0.05; // 5% pour EcoDeli
    const delivererRate = 0.8; // 80% pour le livreur

    const amountWithoutPlatformFee = totalAmount / (1 + platformFeeRate);
    const delivererFee = amountWithoutPlatformFee * delivererRate;

    return Math.round(delivererFee * 100) / 100;
  }

  /**
   * Vérifie le statut d'un paiement sur Stripe
   */
  static async checkPaymentStatus(stripePaymentId: string): Promise<string> {
    try {
      const paymentIntent =
        await getStripe().paymentIntents.retrieve(stripePaymentId);
      return paymentIntent.status;
    } catch (error) {
      logger.error(`Erreur vérification statut paiement:`, error);
      throw error;
    }
  }

  /**
   * Liste les paiements d'un client avec pagination
   */
  static async getClientPayments(
    clientId: string,
    options: { page?: number; limit?: number; status?: string } = {},
  ) {
    const { page = 1, limit = 10, status } = options;

    const where: any = { userId: clientId };
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              type: true,
              pickupAddress: true,
              deliveryAddress: true,
            },
          },
          delivery: {
            select: {
              id: true,
              status: true,
              trackingNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Récupérer le statut d'un paiement via Stripe
   */
  async getStripePaymentStatus(stripePaymentId: string) {
    try {
      const paymentIntent =
        await getStripe().paymentIntents.retrieve(stripePaymentId);
      return paymentIntent.status;
    } catch (error) {
      logger.error("Error getting Stripe payment status", { error, stripePaymentId });
      throw error;
    }
  }
}

export const announcementPaymentService = new AnnouncementPaymentService();
