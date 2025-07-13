import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { announcementPaymentService } from "@/features/announcements/services/announcement-payment.service";
import { announcementService } from "@/features/announcements/services/announcement.service";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Schema de validation pour création de payment intent
const createPaymentSchema = z.object({
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  confirmImmediately: z.boolean().default(true),
});

// Schema pour confirmation de paiement
const confirmPaymentSchema = z.object({
  paymentMethodId: z.string().min(1, "Payment method ID requis"),
  returnUrl: z.string().url().optional(),
});

/**
 * POST - Créer un PaymentIntent pour une annonce
 * Workflow : Annonce créée → PaymentIntent → Paiement → Activation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: announcementId } = await params;
    const user = await getUserFromSession(request);

    if (!user || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Accès refusé - Rôle CLIENT requis" },
        { status: 403 },
      );
    }

    logger.info(
      `Création PaymentIntent pour annonce ${announcementId} par client ${user.id}`,
    );

    // Récupérer l'annonce pour validation
    const announcement =
      await announcementService.getAnnouncementById(announcementId);

    // Vérifier les permissions
    if (announcement.authorId !== user.id) {
      return NextResponse.json(
        { error: "Annonce non autorisée" },
        { status: 403 },
      );
    }

    // Vérifier le statut de l'annonce
    if (announcement.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "Cette annonce ne peut plus être payée",
          currentStatus: announcement.status,
        },
        { status: 400 },
      );
    }

    // Vérifier qu'il n'y a pas déjà un paiement en cours
    const existingPayment = await announcementPaymentService.getClientPayments(
      user.id,
      {
        status: "PENDING",
      },
    );

    const hasExistingPayment = existingPayment.payments.some(
      (p) => p.announcementId === announcementId,
    );

    if (hasExistingPayment) {
      return NextResponse.json(
        {
          error: "Un paiement est déjà en cours pour cette annonce",
        },
        { status: 409 },
      );
    }

    // Créer le PaymentIntent
    const paymentIntent = await announcementPaymentService.createPaymentIntent({
      announcementId,
      amount: announcement.finalPrice || announcement.basePrice,
      currency: announcement.currency || "EUR",
      clientId: user.id,
      metadata: {
        announcementTitle: announcement.title,
        announcementType: announcement.type,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        isUrgent: announcement.isUrgent?.toString() || "false",
      },
    });

    logger.info(`PaymentIntent créé: ${paymentIntent.paymentIntentId}`);

    return NextResponse.json(
      {
        success: true,
        paymentIntent: {
          id: paymentIntent.paymentIntentId,
          clientSecret: paymentIntent.clientSecret,
          amount: paymentIntent.amount,
          currency: announcement.currency || "EUR",
          status: paymentIntent.status,
        },
        announcement: {
          id: announcement.id,
          title: announcement.title,
          finalPrice: paymentIntent.amount,
          basePrice: announcement.basePrice,
          discountApplied: announcement.basePrice - paymentIntent.amount > 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("Erreur création PaymentIntent:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    return NextResponse.json(
      {
        error: "Erreur lors de la création du paiement",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Confirmer un PaymentIntent
 * Confirmé le paiement avec les informations de carte
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: announcementId } = await params;
    const user = await getUserFromSession(request);

    if (!user || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Accès refusé - Rôle CLIENT requis" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = confirmPaymentSchema.parse(body);

    logger.info(`Confirmation paiement pour annonce ${announcementId}`);

    // Récupérer le paiement en cours
    const clientPayments = await announcementPaymentService.getClientPayments(
      user.id,
      {
        status: "PENDING",
      },
    );

    const payment = clientPayments.payments.find(
      (p) => p.announcementId === announcementId,
    );

    if (!payment || !payment.stripePaymentId) {
      return NextResponse.json(
        {
          error: "Aucun paiement en attente trouvé pour cette annonce",
        },
        { status: 404 },
      );
    }

    // Confirmer le PaymentIntent
    const result = await announcementPaymentService.confirmPaymentIntent(
      payment.stripePaymentId,
      validatedData.paymentMethodId,
      user.id,
    );

    if (!result.success) {
      // Paiement nécessite une action (3D Secure, etc.)
      return NextResponse.json({
        success: false,
        requiresAction: result.requiresAction,
        clientSecret: result.clientSecret,
        message: "Action supplémentaire requise pour le paiement",
      });
    }

    // Paiement confirmé avec succès - activer l'annonce
    await announcementService.activateAnnouncementAfterPayment(announcementId);

    logger.info(`Paiement confirmé et annonce ${announcementId} activée`);

    return NextResponse.json({
      success: true,
      message: "Paiement confirmé avec succès",
      announcement: {
        id: announcementId,
        status: "ACTIVE",
        paymentStatus: "CONFIRMED",
      },
      nextSteps: [
        "Votre annonce est maintenant active",
        "Les livreurs compatibles vont être notifiés",
        "Vous recevrez une notification dès qu'un livreur accepte",
      ],
    });
  } catch (error) {
    logger.error("Erreur confirmation paiement:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    return NextResponse.json(
      {
        error: "Erreur lors de la confirmation du paiement",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer le statut du paiement d'une annonce
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: announcementId } = await params;
    const user = await getUserFromSession(request);

    if (!user || user.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Accès refusé - Rôle CLIENT requis" },
        { status: 403 },
      );
    }

    // Récupérer les paiements du client pour cette annonce
    const clientPayments = await announcementPaymentService.getClientPayments(
      user.id,
    );

    const payment = clientPayments.payments.find(
      (p) => p.announcementId === announcementId,
    );

    if (!payment) {
      return NextResponse.json(
        {
          error: "Aucun paiement trouvé pour cette annonce",
        },
        { status: 404 },
      );
    }

    // Vérifier le statut sur Stripe si nécessaire
    let currentStatus = payment.status;
    if (
      payment.stripePaymentId &&
      ["PENDING", "REQUIRES_ACTION"].includes(payment.status)
    ) {
      try {
        currentStatus = await announcementPaymentService.checkPaymentStatus(
          payment.stripePaymentId,
        );
      } catch (error) {
        logger.warn("Impossible de vérifier le statut Stripe:", error);
      }
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: currentStatus,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        refundedAt: payment.refundedAt,
      },
      announcement: payment.announcement
        ? {
            id: payment.announcement.id,
            title: payment.announcement.title,
            type: payment.announcement.type,
            pickupAddress: payment.announcement.pickupAddress,
            deliveryAddress: payment.announcement.deliveryAddress,
          }
        : null,
      delivery: payment.delivery
        ? {
            id: payment.delivery.id,
            status: payment.delivery.status,
            trackingNumber: payment.delivery.trackingNumber,
          }
        : null,
    });
  } catch (error) {
    logger.error("Erreur récupération statut paiement:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du statut de paiement",
      },
      { status: 500 },
    );
  }
}
