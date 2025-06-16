import { db } from "@/server/db";
import { Decimal } from "@prisma/client/runtime/library";
import { TRPCError } from "@trpc/server";
import { stripeService } from "@/server/services/shared/stripe.service";
import { walletService } from "@/server/services/shared/wallet.service";
import { PaymentStatus, TransactionType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { randomUUID } from "crypto";
import {
  CreatePaymentInput,
  ProcessPaymentInput,
  RefundPaymentInput} from "@/schemas/payment/payment.schema";
import { createInvoice } from "@/server/services/shared/invoice.service";
import { addWalletTransaction } from "@/server/services/shared/wallet.service";
import { logger } from "@/lib/utils/logger";
import { createCommission } from "@/server/services/admin/commission.service";
import { addDays } from "@/lib/utils/date";
import { invoiceService } from "@/server/services/shared/invoice.service";
import { commissionService } from "@/server/services/admin/commission.service";
import Stripe from "stripe";

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
      currency = "EUR",
      serviceId,
      deliveryId,
      invoiceId,
      isEscrow = false,
      paymentMethodId,
      metadata = {}} = data;

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
        paymentMethodType: paymentMethodId ? "CARD" : "WALLET",
        source: "STRIPE",
        metadata}});

    // Créer une intention de paiement Stripe
    const paymentMetadata = {
      paymentId: payment.id,
      userId,
      serviceId: serviceId || "",
      deliveryId: deliveryId || "",
      invoiceId: invoiceId || "",
      description,
      isEscrow: isEscrow ? "true" : "false"};

    try {
      const intent = await stripeService.createPaymentIntent(
        Math.round(amount * 100),
        currency,
        paymentMetadata,
      );

      // Mettre à jour le paiement avec l'ID Stripe
      await db.payment.update({
        where: { id: payment.id },
        data: {
          stripePaymentId: intent.id,
          paymentIntentId: intent.id}});

      return {
        payment,
        clientSecret: intent.client_secret,
        redirectUrl: null};
    } catch (error) {
      // En cas d'erreur, marquer le paiement comme échoué
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Erreur inconnue"}});

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec de l'initialisation du paiement",
        cause: error });
    }
  },

  /**
   * Traite un paiement réussi (appelé par webhook ou en mode démo)
   */
  async processSuccessfulPayment(
    paymentId: string,
    amount: number,
    metadata: Record<string, any> = {},
  ) {
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        delivery: true,
        service: true,
        invoice: true}});

    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Paiement non trouvé" });
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      console.log(`Paiement ${paymentId} déjà marqué comme complété`);
      return payment;
    }

    try {
      return await db.$transaction(async (tx) => {
        // Mettre à jour le statut du paiement
        const updatedPayment = await tx.payment.update({
          where: { id },
          data: {
            status: PaymentStatus.COMPLETED,
            capturedAt: new Date(),
            metadata: {
              ...payment.metadata,
              ...metadata}}});

        // Traiter les différents types de paiements
        if (payment.deliveryId) {
          await this.processDeliveryPayment(tx, payment, metadata);
        } else if (payment.serviceId) {
          await this.processServicePayment(tx, payment, metadata);
        } else if (payment.invoiceId) {
          await this.processInvoicePayment(tx, payment, metadata);
        } else if (payment.subscriptionId) {
          await this.processSubscriptionPayment(tx, payment, metadata);
        }

        return updatedPayment;
      });
    } catch (error) {
      console.error("Erreur lors du traitement du paiement réussi:", error);

      // Marquer le paiement comme problématique
      await db.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage:
            error instanceof Error ? error.message : "Erreur inconnue"}});

      throw error;
    }
  },

  /**
   * Traite un paiement échoué
   */
  async processFailedPayment(paymentId: string, reason: string) {
    const payment = await db.payment.findUnique({
      where: { id }});

    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Paiement non trouvé" });
    }

    return await db.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.FAILED,
        errorMessage: reason}});
  },

  /**
   * Traite un paiement de facture
   */
  async processInvoicePayment(invoiceId: string, paymentId: string) {
    const invoice = await db.invoice.findUnique({
      where: { id }});

    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Facture non trouvée" });
    }

    return await db.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidDate: new Date()}});
  },

  /**
   * Traite un paiement sortant (payout/retrait)
   */
  async processSuccessfulPayout(
    payoutId: string,
    amount: number,
    walletId: string,
  ) {
    // Cette fonction simule le traitement d'un paiement sortant après confirmation
    // par le fournisseur de paiement (Stripe ou autre)

    return await db.walletTransaction.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date()}});
  },

  /**
   * Traite les événements d'abonnement
   */
  async handleSubscriptionEvent(
    eventType: string,
    subscriptionId: string,
    metadata: Record<string, any> = {},
  ) {
    const subscription = await db.subscription.findUnique({
      where: { id }});

    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Abonnement non trouvé" });
    }

    switch (eventType) {
      case "subscription.created":
        return await db.subscription.update({
          where: { id },
          data: {
            status: "ACTIVE",
            metadata: { ...subscription.metadata, ...metadata }}});

      case "subscription.updated":
        return await db.subscription.update({
          where: { id },
          data: {
            metadata: { ...subscription.metadata, ...metadata }}});

      case "subscription.deleted":
        return await db.subscription.update({
          where: { id },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            metadata: { ...subscription.metadata, ...metadata }}});

      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type d'événement non pris en charge: ${eventType}`});
    }
  },

  /**
   * Rembourse un paiement
   */
  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await db.payment.findUnique({
      where: { id },
      include: { user }});

    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND",
        message: "Paiement non trouvé" });
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new TRPCError({ code: "BAD_REQUEST",
        message: "Seuls les paiements complétés peuvent être remboursés" });
    }

    // Montant à rembourser (total ou partiel)
    const refundAmount = amount ? new Decimal(amount) : payment.amount;

    // Vérifier que le montant à rembourser ne dépasse pas le montant initial
    if (refundAmount.gt(payment.amount)) {
      throw new TRPCError({ code: "BAD_REQUEST",
        message:
          "Le montant du remboursement ne peut pas dépasser le montant initial" });
    }

    try {
      return await db.$transaction(async (tx) => {
        // Mettre à jour le paiement original
        const updatedPayment = await tx.payment.update({
          where: { id },
          data: {
            status: refundAmount.eq(payment.amount)
              ? PaymentStatus.REFUNDED
              : PaymentStatus.COMPLETED,
            refundedAmount: refundAmount,
            refundedAt: new Date()}});

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
              reason: reason || "Remboursement demandé",
              isRefund: true}}});

        // Rembourser sur le portefeuille du client
        const wallet = await walletService.getOrCreateWallet(payment.userId);

        await walletService.createWalletTransaction(wallet.id, {
          amount: Number(refundAmount),
          type: "REFUND",
          description: `Remboursement: ${payment.description}`,
          reference: `REFUND-${uuidv4()}`,
          metadata: {
            originalPaymentId: paymentId,
            refundPaymentId: refundPayment.id,
            reason: reason || "Remboursement demandé"}});

        return {
          originalPayment: updatedPayment,
          refundPayment};
      });
    } catch (error) {
      console.error("Erreur lors du remboursement:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR",
        message: "Échec du remboursement",
        cause: error });
    }
  },

  /**
   * MÉTHODES PRIVÉES
   */

  /**
   * Traite le paiement d'une livraison
   */
  async processDeliveryPayment(
    tx: any,
    payment: any,
    metadata: Record<string, any> = {},
  ) {
    if (!payment.delivery) return;

    const delivery = payment.delivery;
    const delivererId = delivery.delivererId;

    // Mettre à jour le statut de la livraison
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        currentStatus: "PAYMENT_CONFIRMED"}});

    // Calculer la commission
    const commissionRate = 0.15; // 15% par défaut
    const delivererEarnings = payment.amount * (1 - commissionRate);
    const commissionAmount = payment.amount * commissionRate;

    // Créer les gains pour le livreur si nécessaire
    if (delivererId) {
      await walletService.createWalletTransaction(delivererId, {
        amount: delivererEarnings,
        type: "EARNING",
        description: `Gains de livraison - ${delivery.trackingNumber}`,
        deliveryId: delivery.id,
        paymentId: payment.id,
        metadata: {
          ...metadata,
          commissionRate,
          originalAmount: payment.amount}});

      // Créer l'entrée de commission
      await commissionService.createCommission({ paymentId: payment.id,
        serviceType: "DELIVERY",
        amount: commissionAmount,
        rate: commissionRate });
    }

    // Créer la facture associée
    await invoiceService.createInvoice({
      userId: payment.userId,
      items: [
        {
          description: `Livraison ${delivery.trackingNumber}`,
          quantity: 1,
          unitPrice: payment.amount,
          deliveryId: delivery.id}],
      deliveryId: delivery.id,
      dueDate: addDays(new Date(), 30),
      metadata: {
        deliveryId: delivery.id,
        delivererEarnings: delivererEarnings.toString(),
        commissionAmount: commissionAmount.toString()}});
  },

  /**
   * Traite le paiement d'un service
   * @private
   */
  async processServicePayment(
    tx: any,
    payment: any,
    metadata: Record<string, any> = {},
  ) {
    if (!payment.service) {
      throw new Error("Données de service manquantes");
    }

    // Mettre à jour les réservations de service associées
    await tx.serviceBooking.updateMany({
      where: {
        serviceId: payment.serviceId,
        paymentId: null,
        status: "PENDING"},
      data: {
        paymentId: payment.id,
        status: "CONFIRMED"}});

    // Calculer la commission pour le prestataire
    const commissionRate = 0.2; // 20% de commission
    const commissionAmount = payment.amount * commissionRate;
    const providerAmount = payment.amount - commissionAmount;

    // Créer l'enregistrement de commission
    const commission = await tx.commission.create({
      data: {
        rate: commissionRate,
        serviceType: "SERVICE",
        isActive: true,
        applicableRoles: ["PROVIDER"],
        description: `Commission sur service #${payment.serviceId}`}});

    // Mise à jour du paiement avec la commission
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        commissionAmount,
        commissionId: commission.id}});

    // Ajouter les fonds au portefeuille du prestataire
    const service = await tx.service.findUnique({
      where: { id: payment.serviceId }});

    if (service?.providerId) {
      const providerWallet = await walletService.getOrCreateWallet(
        service.providerId,
      );

      await walletService.createWalletTransaction(providerWallet.id, {
        amount: providerAmount,
        type: "EARNING",
        description: `Paiement pour service #${payment.serviceId} (commission déduite)`,
        paymentId: payment.id,
        serviceId: payment.serviceId,
        metadata: {
          commissionId: commission.id,
          commissionAmount,
          commissionRate}});
    }
  },

  /**
   * Traite le paiement d'une facture
   * @private
   */
  async processInvoicePayment(
    tx: any,
    payment: any,
    metadata: Record<string, any> = {},
  ) {
    if (!payment.invoice) {
      throw new Error("Données de facture manquantes");
    }

    // Mettre à jour la facture
    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        status: "PAID",
        paidDate: new Date()}});
  },

  /**
   * Traite le paiement d'un abonnement
   * @private
   */
  async processSubscriptionPayment(
    tx: any,
    payment: any,
    metadata: Record<string, any> = {},
  ) {
    if (!payment.subscriptionId) {
      throw new Error("ID d'abonnement manquant");
    }

    // Mettre à jour l'abonnement
    await tx.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        status: "ACTIVE",
        // Définir la période en cours
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      }});
  }};

/**
 * Crée un paiement réel via Stripe
 */
export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  const {
    userId,
    amount,
    currency,
    description,
    isEscrow,
    serviceType,
    deliveryId,
    serviceId,
    subscriptionId} = input;

  // Vérifier l'existence de l'utilisateur
  const user = await db.user.findUnique({
    where: { id }});

  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Utilisateur non trouvé" });
  }

  // Vérifier les références selon le type de service
  if (serviceType === "DELIVERY" && !deliveryId) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "ID de livraison requis pour un paiement de type DELIVERY" });
  }

  if (serviceType === "SERVICE" && !serviceId) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "ID de service requis pour un paiement de type SERVICE" });
  }

  if (serviceType === "SUBSCRIPTION" && !subscriptionId) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "ID d'abonnement requis pour un paiement de type SUBSCRIPTION" });
  }

  // Créer un vrai PaymentIntent avec Stripe
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convertir en centimes
    currency: currency.toLowerCase(),
    description,
    metadata: {
      userId,
      deliveryId: deliveryId || "",
      serviceId: serviceId || "",
      subscriptionId: subscriptionId || "",
      ...input.metadata}, capture_method: isEscrow ? "manual" : "automatic"});

  // Créer le paiement dans la base de données
  const payment = await db.payment.create({
    data: {
      userId,
      amount,
      currency,
      description,
      status: PaymentStatus.PENDING,
      isEscrow,
      stripePaymentId: paymentIntent.id,
      paymentIntentId: paymentIntent.id,
      deliveryId,
      serviceId,
      subscriptionId,
      paymentProvider: "STRIPE",
      capturedAt: null,
      source: input.source || "STRIPE",
      notes: input.notes,
      metadata: input.metadata || {}}});

  // Si c'est un paiement de livraison et qu'il est mis en séquestre, générer un code de libération
  if (isEscrow && deliveryId) {
    const escrowReleaseCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    await db.payment.update({
      where: { id: payment.id },
      data: {
        escrowReleaseCode,
        escrowReleaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours par défaut
      }});
  }

  // Les commissions et factures seront créées lors de la confirmation du paiement via webhook

  return payment;
}

/**
 * Traite une intention de paiement réelle
 */
export async function processPaymentIntent(input: {
  paymentId: string;
  action: string;
  amount: number;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}> {
  const { paymentId: paymentId, action: action, amount: amount } = input;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id }});

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Paiement non trouvé" });
  }

  // Traiter selon l'action demandée
  switch (action) {
    case "capture":
      if (payment.status !== PaymentStatus.PENDING) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Ce paiement ne peut pas être capturé" });
      }

      // Capturer le paiement via Stripe
      await stripe.paymentIntents.capture(payment.paymentIntentId!);

      await db.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.COMPLETED,
          capturedAt: new Date()}});
      break;

    case "cancel":
      if (payment.status !== PaymentStatus.PENDING) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Ce paiement ne peut pas être annulé" });
      }

      // Annuler le paiement via Stripe
      await stripe.paymentIntents.cancel(payment.paymentIntentId!);

      await db.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.CANCELLED}});
      break;

    case "refund":
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Ce paiement ne peut pas être remboursé" });
      }

      const refundAmount = amount || payment.amount;

      await db.payment.update({
        where: { id },
        data: {
          status:
            refundAmount >= payment.amount
              ? PaymentStatus.REFUNDED
              : PaymentStatus.COMPLETED,
          refundedAmount: refundAmount,
          refundedAt: new Date()}});
      break;

    case "dispute":
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Ce paiement ne peut pas être contesté" });
      }

      await db.payment.update({
        where: { id },
        data: {
          disputeStatus: "UNDER_REVIEW"}});
      break;

    default:
      throw new TRPCError({ code: "BAD_REQUEST",
        message: "Action non reconnue" });
  }

  // Récupérer le paiement mis à jour
  const updatedPayment = await db.payment.findUnique({
    where: { id }});

  // Générer une réponse simulée pour l'intention de paiement
  // Récupérer le PaymentIntent mis à jour depuis Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    payment.paymentIntentId!,
  );

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
    status: updatedPayment?.status || "unknown",
  };
}

/**
 * Confirme un paiement réel via Stripe
 */
export async function confirmPayment(paymentId: string): Promise<Payment> {
  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id }});

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Paiement non trouvé" });
  }

  if (payment.status !== PaymentStatus.PENDING) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Ce paiement ne peut pas être confirmé" });
  }

  // Mettre à jour le statut du paiement
  const updatedPayment = await db.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.COMPLETED,
      capturedAt: new Date()}});

  // Si c'est un paiement pour une livraison, mettre à jour le status de la livraison
  if (payment.deliveryId) {
    try {
      await db.delivery.update({
        where: { id: payment.deliveryId },
        data: {
          status: "PENDING_PICKUP", // Statut à adapter selon votre modèle
        }});
    } catch (error) {
      logger.error(
        "Erreur lors de la mise à jour du statut de livraison",
        error,
      );
    }
  }

  return updatedPayment;
}

/**
 * Rembourse un paiement réel via Stripe
 */
export async function refundPayment(input: {
  paymentId: string;
  amount?: number;
  reason?: string;
}): Promise<any> {
  const { paymentId: paymentId, amount: amount, reason: reason } = input;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id }});

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Paiement non trouvé" });
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Ce paiement ne peut pas être remboursé" });
  }

  const refundAmount = amount || payment.amount;
  const refundId = `ref_${randomUUID().replace(/-/g, "")}`;

  // Implémenter le remboursement réel via Stripe
  let stripeRefund: any = null;
  
  if (payment.stripePaymentIntentId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2024-12-18.acacia",
      });
      
      stripeRefund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(refundAmount * 100), // Convertir en centimes
        reason: reason === "duplicate" ? "duplicate" : "requested_by_customer",
        metadata: {
          original_payment_id: payment.id,
          refund_reason: reason || "Remboursement demandé",
        },
      });
    } catch (stripeError) {
      logger.error("Erreur lors du remboursement Stripe:", stripeError);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Erreur lors du remboursement: ${stripeError instanceof Error ? stripeError.message : "Erreur inconnue"}`,
      });
    }
  }

  // Vérifier que le paiement peut être remboursé
  if (payment.status === PaymentStatus.REFUNDED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Ce paiement a déjà été remboursé",
    });
  }

  // Mettre à jour le paiement avec les informations de remboursement
  const updatedPayment = await db.payment.update({
    where: { id },
    data: {
      status:
        refundAmount >= payment.amount
          ? PaymentStatus.REFUNDED
          : PaymentStatus.COMPLETED,
      refundedAmount: refundAmount,
      refundedAt: new Date(),
      refundId,
      notes: payment.notes
        ? `${payment.notes}\nRemboursement: ${reason}`
        : `Remboursement: ${reason}`}});

  // Créer une transaction de remboursement dans le portefeuille si nécessaire
  if (payment.userId) {
    try {
      await addWalletTransaction({
        userId: payment.userId,
        amount: refundAmount,
        type: TransactionType.REFUND,
        description: `Remboursement: ${reason || "Remboursement demandé"}`,
        reference: refundId,
        paymentId: payment.id});
    } catch (error) {
      logger.error(
        "Erreur lors de la création de la transaction de remboursement",
        error,
      );
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
  } = {},
): Promise<{ payments: Payment[]; total: number; pages: number }> {
  const {
    limit = 10,
    page = 1,
    status: status,
    startDate: startDate,
    endDate: endDate,
    type: type} = options;
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
    if (type === "DELIVERY") {
      where.deliveryId = { not };
    } else if (type === "SERVICE") {
      where.serviceId = { not };
    } else if (type === "SUBSCRIPTION") {
      where.subscriptionId = { not };
    }
  }

  // Compter le nombre total de paiements
  const total = await db.payment.count({ where  });
  const pages = Math.ceil(total / limit);

  // Récupérer les paiements
  const payments = await db.payment.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" }});

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
  } = {},
): Promise<Payment> {
  const { releaseAfterDays = 7, generateReleaseCode = true } = options;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id }});

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Paiement non trouvé" });
  }

  if (
    payment.status !== PaymentStatus.PENDING &&
    payment.status !== PaymentStatus.COMPLETED
  ) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Ce paiement ne peut pas être mis en séquestre" });
  }

  // Vérifier que la livraison existe
  const delivery = await db.delivery.findUnique({
    where: { id }});

  if (!delivery) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Livraison non trouvée" });
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
    where: { id },
    data: {
      isEscrow: true,
      status: PaymentStatus.PENDING,
      deliveryId,
      escrowReleaseCode,
      escrowReleaseDate}});

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
  } = {},
): Promise<Payment> {
  const {
    releaseCode: releaseCode,
    releaseByAdmin = false,
    adminId: adminId} = options;

  // Récupérer le paiement
  const payment = await db.payment.findUnique({
    where: { id },
    include: { delivery }});

  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND",
      message: "Paiement non trouvé" });
  }

  if (!payment.isEscrow || payment.status !== PaymentStatus.PENDING) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Ce paiement ne peut pas être libéré" });
  }

  // Vérifier la livraison associée
  if (!payment.delivery || !payment.deliveryId) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Ce paiement n'est pas associé à une livraison" });
  }

  // Vérifier le livreur associé
  if (!payment.delivery.delivererId) {
    throw new TRPCError({ code: "BAD_REQUEST",
      message: "Cette livraison n'a pas de livreur assigné" });
  }

  // Vérifier le code de libération si nécessaire
  if (
    !releaseByAdmin &&
    payment.escrowReleaseCode &&
    payment.escrowReleaseCode !== releaseCode
  ) {
    throw new TRPCError({ code: "FORBIDDEN",
      message: "Code de libération invalide" });
  }

  // Vérifier l'autorisation d'admin si nécessaire
  if (releaseByAdmin && !adminId) {
    throw new TRPCError({ code: "FORBIDDEN",
      message: "ID d'administrateur requis pour la libération administrative" });
  }

  // Mettre à jour le paiement
  const updatedPayment = await db.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.COMPLETED,
      escrowReleasedAt: new Date(),
      capturedAt: new Date(),
      notes: payment.notes
        ? `${payment.notes}\nPaiement libéré ${releaseByAdmin ? "par admin" : ""}`
        : `Paiement libéré ${releaseByAdmin ? "par admin" : ""}`}});

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
      paymentId: payment.id});

    // Enregistrer la commission perçue
    await createCommission({ paymentId: payment.id,
      serviceType: "DELIVERY",
      amount: payment.amount,
      recipientId: delivererId,
      commissionAmount });
  } catch (error) {
    logger.error(
      "Erreur lors de l'ajout des fonds au portefeuille du livreur",
      error,
    );
    // Ne pas échouer le processus de libération
  }

  return updatedPayment;
}
