import { stripe } from "@/lib/stripe";
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
export class AnnouncementPaymentService {
  /**
   * Crée un PaymentIntent Stripe pour une annonce
   * Le paiement est mis en séquestre jusqu'à validation de livraison
   */
  static async createPaymentIntent(
    input: CreatePaymentIntentInput,
  ): Promise<PaymentIntentResult> {
    const {
      announcementId,
      amount,
      currency = "EUR",
      clientId,
      metadata = {},
    } = input;

    try {
      logger.info(
        `Création PaymentIntent pour annonce ${announcementId}, montant: ${amount}€`,
      );

      // Vérifier que l'annonce existe et appartient au client
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          authorId: clientId,
        },
        include: {
          author: {
            include: {
              client: {
                include: { subscription: true },
              },
            },
          },
        },
      });

      if (!announcement) {
        throw new Error("Annonce introuvable ou non autorisée");
      }

      // Vérifier qu'il n'y a pas déjà un paiement en cours
      const existingPayment = await prisma.payment.findFirst({
        where: {
          announcementId,
          status: { in: ["PENDING", "PROCESSING"] },
        },
      });

      if (existingPayment) {
        throw new Error("Un paiement est déjà en cours pour cette annonce");
      }

      // Calculer le montant final avec les réductions d'abonnement
      const subscription = announcement.author.client?.subscription;
      const finalAmount = this.calculateFinalAmount(
        amount,
        subscription?.plan || "FREE",
        announcement.isUrgent || false,
      );

      // Créer le PaymentIntent Stripe avec capture manuelle
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Stripe utilise les centimes
        currency: currency.toLowerCase(),
        capture_method: "manual", // CRITIQUE : capture manuelle pour séquestre
        confirmation_method: "manual",
        metadata: {
          announcementId,
          clientId,
          originalAmount: amount.toString(),
          finalAmount: finalAmount.toString(),
          subscriptionPlan: subscription?.plan || "FREE",
          isUrgent: announcement.isUrgent?.toString() || "false",
          ...metadata,
        },
        description: `EcoDeli - ${announcement.title}`,
        receipt_email: announcement.author.email,
      });

      // Sauvegarder en base de données
      const payment = await prisma.payment.create({
        data: {
          userId: clientId,
          announcementId,
          amount: finalAmount,
          currency,
          status: "PENDING",
          paymentMethod: "STRIPE",
          stripePaymentId: paymentIntent.id,
          metadata: {
            originalAmount: amount,
            discountApplied: amount - finalAmount,
            subscriptionPlan: subscription?.plan || "FREE",
            paymentIntentStatus: paymentIntent.status,
          },
        },
      });

      logger.info(
        `PaymentIntent créé: ${paymentIntent.id}, montant final: ${finalAmount}€`,
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        amount: finalAmount,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error(`Erreur création PaymentIntent:`, error);
      throw error;
    }
  }

  /**
   * Confirme un PaymentIntent après saisie des informations de paiement
   */
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string,
    clientId: string,
  ): Promise<{
    success: boolean;
    requiresAction?: boolean;
    clientSecret?: string;
  }> {
    try {
      logger.info(`Confirmation PaymentIntent: ${paymentIntentId}`);

      // Vérifier que le paiement appartient au client
      const payment = await prisma.payment.findFirst({
        where: {
          stripePaymentId: paymentIntentId,
          userId: clientId,
          status: "PENDING",
        },
        include: { announcement: true },
      });

      if (!payment) {
        throw new Error("Paiement introuvable ou non autorisé");
      }

      // Confirmer le PaymentIntent avec Stripe
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: paymentMethodId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/client/announcements/${payment.announcementId}/payment-success`,
        },
      );

      // Mettre à jour le statut en base
      if (paymentIntent.status === "requires_action") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "REQUIRES_ACTION",
            metadata: {
              ...(payment.metadata as any),
              paymentIntentStatus: paymentIntent.status,
              nextAction: paymentIntent.next_action?.type,
            },
          },
        });

        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret!,
        };
      }

      if (paymentIntent.status === "succeeded") {
        // Le paiement est confirmé mais pas encore capturé (séquestre)
        await this.handlePaymentConfirmed(payment.id, paymentIntent);
        return { success: true };
      }

      throw new Error(
        `Statut PaymentIntent inattendu: ${paymentIntent.status}`,
      );
    } catch (error) {
      logger.error(`Erreur confirmation PaymentIntent:`, error);
      throw error;
    }
  }

  /**
   * Capture le paiement après validation de livraison
   * CRITIQUE : débloque l'argent du séquestre
   */
  static async capturePayment(
    paymentId: string,
    deliveryId?: string,
  ): Promise<void> {
    try {
      logger.info(`Capture du paiement: ${paymentId}`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          announcement: true,
          delivery: true,
        },
      });

      if (!payment) {
        throw new Error("Paiement introuvable");
      }

      if (payment.status !== "CONFIRMED") {
        throw new Error(
          `Impossible de capturer un paiement en statut: ${payment.status}`,
        );
      }

      if (!payment.stripePaymentId) {
        throw new Error("ID PaymentIntent Stripe manquant");
      }

      // Capturer le paiement sur Stripe
      const paymentIntent = await stripe.paymentIntents.capture(
        payment.stripePaymentId,
      );

      if (paymentIntent.status !== "succeeded") {
        throw new Error(`Échec de la capture: ${paymentIntent.status}`);
      }

      // Mettre à jour le statut en base
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
          paidAt: new Date(),
          metadata: {
            ...(payment.metadata as any),
            capturedAt: new Date().toISOString(),
            deliveryId: deliveryId || payment.delivery?.id,
          },
        },
      });

      // Calculer et transférer vers le wallet du livreur
      if (payment.delivery) {
        await this.transferToDelivererWallet(
          payment.delivery.delivererId,
          payment,
        );
      }

      // Envoyer notifications
      await Promise.all([
        NotificationService.notifyPaymentReceived(
          payment.userId,
          payment.amount,
          "Paiement annonce débité avec succès",
          "delivery",
        ),
        payment.delivery
          ? NotificationService.notifyPaymentReceived(
              payment.delivery.delivererId,
              this.calculateDelivererFee(payment.amount),
              "Paiement de livraison reçu",
              "delivery",
            )
          : Promise.resolve(),
      ]);

      logger.info(
        `Paiement capturé avec succès: ${paymentId}, montant: ${payment.amount}€`,
      );
    } catch (error) {
      logger.error(`Erreur capture paiement:`, error);
      throw error;
    }
  }

  /**
   * Rembourse un paiement en cas d'annulation
   */
  static async refundPayment(
    paymentId: string,
    reason: string = "Annulation de la livraison",
    amount?: number,
  ): Promise<void> {
    try {
      logger.info(`Remboursement du paiement: ${paymentId}`);

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { announcement: true },
      });

      if (!payment) {
        throw new Error("Paiement introuvable");
      }

      if (!["CONFIRMED", "COMPLETED"].includes(payment.status)) {
        throw new Error(
          `Impossible de rembourser un paiement en statut: ${payment.status}`,
        );
      }

      if (!payment.stripePaymentId) {
        throw new Error("ID PaymentIntent Stripe manquant");
      }

      const refundAmount = amount || payment.amount;

      // Créer le remboursement sur Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        amount: Math.round(refundAmount * 100), // Convertir en centimes
        reason: "requested_by_customer",
        metadata: {
          paymentId,
          announcementId: payment.announcementId!,
          reason,
        },
      });

      // Mettre à jour le statut en base
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
          refundAmount: refundAmount,
          metadata: {
            ...(payment.metadata as any),
            refundId: refund.id,
            refundReason: reason,
            refundedAt: new Date().toISOString(),
          },
        },
      });

      // Notifier le client
      await NotificationService.createNotification({
        userId: payment.userId,
        type: "PAYMENT_REFUNDED",
        title: "Remboursement effectué",
        message: `Votre paiement de ${refundAmount}€ pour "${payment.announcement?.title}" a été remboursé`,
        data: {
          paymentId,
          refundAmount,
          reason,
        },
        sendPush: true,
        priority: "medium",
      });

      logger.info(
        `Remboursement effectué: ${refund.id}, montant: ${refundAmount}€`,
      );
    } catch (error) {
      logger.error(`Erreur remboursement:`, error);
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
        await stripe.paymentIntents.retrieve(stripePaymentId);
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
}

// Export du service
export const announcementPaymentService = AnnouncementPaymentService;
export default AnnouncementPaymentService;
