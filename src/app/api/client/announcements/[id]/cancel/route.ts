import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { announcementService } from "@/features/announcements/services/announcement.service";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Schema de validation pour l'annulation
const cancelAnnouncementSchema = z.object({
  reason: z
    .string()
    .min(10, "Raison d'annulation requise (minimum 10 caractères)")
    .max(500, "Raison trop longue (maximum 500 caractères)"),
  confirmCancel: z
    .boolean()
    .refine((val) => val === true, "Confirmation d'annulation requise"),
});

/**
 * POST - Annuler une annonce
 * Gère l'annulation avec remboursement automatique si nécessaire
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
      `Demande d'annulation pour annonce ${announcementId} par client ${user.id}`,
    );

    const body = await request.json();
    const validatedData = cancelAnnouncementSchema.parse(body);

    // Récupérer l'annonce pour vérifier le statut actuel
    const announcement =
      await announcementService.getAnnouncementById(announcementId);

    // Vérifier les permissions
    if (announcement.authorId !== user.id) {
      return NextResponse.json(
        { error: "Annonce non autorisée" },
        { status: 403 },
      );
    }

    // Vérifier qu'on peut annuler selon le statut
    const cancellableStatuses = ["DRAFT", "ACTIVE", "MATCHED"];
    if (!cancellableStatuses.includes(announcement.status)) {
      const statusMessages = {
        IN_PROGRESS:
          "Cette annonce ne peut plus être annulée car elle est en cours de livraison",
        COMPLETED: "Cette annonce est déjà terminée",
        CANCELLED: "Cette annonce est déjà annulée",
      };

      return NextResponse.json(
        {
          error:
            statusMessages[
              announcement.status as keyof typeof statusMessages
            ] || "Annulation impossible dans ce statut",
          currentStatus: announcement.status,
          canCancel: false,
        },
        { status: 400 },
      );
    }

    // Calculer les frais d'annulation selon le timing
    const cancellationInfo = calculateCancellationFees(announcement);

    // Effectuer l'annulation via le service
    await announcementService.cancelAnnouncement(
      announcementId,
      user.id,
      validatedData.reason,
    );

    logger.info(`Annonce ${announcementId} annulée avec succès`);

    // Préparer la réponse avec les détails de remboursement
    const response = {
      success: true,
      message: "Annonce annulée avec succès",
      cancellation: {
        announcementId,
        reason: validatedData.reason,
        cancelledAt: new Date().toISOString(),
        refund: cancellationInfo.refund,
        fees: cancellationInfo.fees,
      },
      nextSteps: cancellationInfo.refund.willRefund
        ? [
            `Un remboursement de ${cancellationInfo.refund.amount}€ sera effectué`,
            "Le remboursement apparaîtra sous 3-5 jours ouvrés",
            "Vous recevrez un email de confirmation",
          ]
        : [
            "Aucun remboursement n'est dû",
            "L'annonce a été supprimée de votre tableau de bord",
          ],
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Erreur annulation annonce:", error);

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
        error: "Erreur lors de l'annulation",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer les informations d'annulation (frais, conditions)
 * Permet au client de voir les implications avant d'annuler
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

    // Récupérer l'annonce
    const announcement =
      await announcementService.getAnnouncementById(announcementId);

    // Vérifier les permissions
    if (announcement.authorId !== user.id) {
      return NextResponse.json(
        { error: "Annonce non autorisée" },
        { status: 403 },
      );
    }

    // Calculer les informations d'annulation
    const cancellationInfo = calculateCancellationFees(announcement);

    // Déterminer si l'annulation est possible
    const cancellableStatuses = ["DRAFT", "ACTIVE", "MATCHED"];
    const canCancel = cancellableStatuses.includes(announcement.status);

    const response = {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status,
        createdAt: announcement.createdAt,
        finalPrice: announcement.finalPrice || announcement.basePrice,
      },
      cancellation: {
        canCancel,
        reason: canCancel
          ? null
          : getCancellationBlockReason(announcement.status),
        fees: cancellationInfo.fees,
        refund: cancellationInfo.refund,
        conditions: [
          "L'annulation est définitive et ne peut pas être annulée",
          "Les frais d'annulation sont basés sur le timing",
          "Le remboursement prend 3-5 jours ouvrés",
          "Un email de confirmation sera envoyé",
        ],
      },
      timing: {
        createdAt: announcement.createdAt,
        timeElapsed: Date.now() - new Date(announcement.createdAt).getTime(),
        gracePeriod: 30 * 60 * 1000, // 30 minutes
        pickupDate: announcement.pickupDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Erreur récupération infos annulation:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération des informations d'annulation",
      },
      { status: 500 },
    );
  }
}

/**
 * Calcule les frais d'annulation et le montant de remboursement
 */
function calculateCancellationFees(announcement: any) {
  const now = Date.now();
  const createdAt = new Date(announcement.createdAt).getTime();
  const timeElapsed = now - createdAt;
  const totalAmount = announcement.finalPrice || announcement.basePrice;

  // Période de grâce : 30 minutes après création
  const gracePeriodMs = 30 * 60 * 1000; // 30 minutes

  // Si dans la période de grâce : remboursement complet
  if (timeElapsed <= gracePeriodMs) {
    return {
      fees: {
        cancellationFee: 0,
        processingFee: 0,
        total: 0,
      },
      refund: {
        willRefund: announcement.status !== "DRAFT",
        amount: announcement.status !== "DRAFT" ? totalAmount : 0,
        reason:
          announcement.status !== "DRAFT"
            ? "Annulation dans la période de grâce"
            : "Aucun paiement effectué",
      },
    };
  }

  // Après la période de grâce : frais selon le statut
  let cancellationFeeRate = 0;
  let processingFee = 2.5; // Frais fixes de traitement

  switch (announcement.status) {
    case "ACTIVE":
      cancellationFeeRate = 0.05; // 5% de frais
      break;
    case "MATCHED":
      cancellationFeeRate = 0.15; // 15% de frais (livreur déjà assigné)
      break;
    default:
      cancellationFeeRate = 0;
  }

  const cancellationFee = totalAmount * cancellationFeeRate;
  const totalFees = cancellationFee + processingFee;
  const refundAmount = Math.max(0, totalAmount - totalFees);

  return {
    fees: {
      cancellationFee: Math.round(cancellationFee * 100) / 100,
      processingFee,
      total: Math.round(totalFees * 100) / 100,
    },
    refund: {
      willRefund: announcement.status !== "DRAFT" && refundAmount > 0,
      amount: Math.round(refundAmount * 100) / 100,
      reason:
        refundAmount > 0
          ? `Remboursement après déduction des frais d'annulation`
          : "Montant entièrement utilisé pour les frais d'annulation",
    },
  };
}

/**
 * Retourne la raison pour laquelle l'annulation est bloquée
 */
function getCancellationBlockReason(status: string): string {
  const reasons = {
    IN_PROGRESS: "La livraison est en cours, contactez le support client",
    COMPLETED: "L'annonce est déjà terminée",
    CANCELLED: "L'annonce est déjà annulée",
  };

  return (
    reasons[status as keyof typeof reasons] ||
    "Statut incompatible avec l'annulation"
  );
}
