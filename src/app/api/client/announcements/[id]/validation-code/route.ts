import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth/utils";
import { ValidationCodeService } from "@/features/deliveries/services/validation-code.service";
import { announcementService } from "@/features/announcements/services/announcement.service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * GET - Récupérer le code de validation d'une livraison
 * Le code est nécessaire pour valider la réception par le destinataire
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

    logger.info(
      `Récupération code validation pour annonce ${announcementId} par client ${user.id}`,
    );

    // Récupérer l'annonce avec la livraison
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        authorId: user.id,
      },
      include: {
        deliveries: {
          include: {
            deliverer: {
              include: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 },
      );
    }

    if (!announcement.deliveries || announcement.deliveries.length === 0) {
      return NextResponse.json(
        {
          error: "Aucune livraison associée à cette annonce",
          status: announcement.status,
        },
        { status: 400 },
      );
    }

    // Retourner directement le code de validation de la livraison liée
    const delivery = announcement.deliveries[0]; // Prendre la première livraison
    
    // Vérifier si le code de validation existe
    if (!delivery.validationCode) {
      return NextResponse.json(
        {
          error: "Code de validation non disponible",
          reason: getValidationCodeUnavailableReason(delivery.status),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status,
      },
      delivery: {
        id: delivery.id,
        status: delivery.status,
        validationCode: delivery.validationCode,
        deliverer: {
          name: delivery.deliverer?.profile
            ? `${delivery.deliverer.profile.firstName} ${delivery.deliverer.profile.lastName}`
            : "Livreur",
          phone: delivery.deliverer?.profile?.phone,
          avatar: delivery.deliverer?.profile?.avatar,
        },
      },
    });
  } catch (error) {
    logger.error("Erreur récupération code validation:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Erreur interne du serveur";

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du code de validation",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Régénérer un code de validation
 * Utile si le code actuel est compromis ou expiré
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

    const body = await request.json();
    const { reason = "Régénération demandée par le client" } = body;

    logger.info(
      `Régénération code validation pour annonce ${announcementId} par client ${user.id}`,
    );

    // Récupérer l'annonce avec la livraison
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        authorId: user.id,
      },
      include: {
        deliveries: true,
      },
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 },
      );
    }

    if (!announcement.deliveries || announcement.deliveries.length === 0) {
      return NextResponse.json(
        { error: "Aucune livraison associée à cette annonce" },
        { status: 400 },
      );
    }

    const delivery = announcement.deliveries[0];

    // Vérifier que la livraison est dans un état valide
    const validStatuses = ["IN_TRANSIT", "OUT_FOR_DELIVERY"];
    if (!validStatuses.includes(delivery.status)) {
      return NextResponse.json(
        {
          error: "Impossible de régénérer le code dans ce statut",
          deliveryStatus: delivery.status,
        },
        { status: 400 },
      );
    }

    // Régénérer le code
    const newCode = await ValidationCodeService.generateValidationCode(
      delivery.id,
    );
    const validationInfo = await ValidationCodeService.getValidationInfo(
      delivery.id,
    );

    if (!validationInfo) {
      throw new Error("Impossible de récupérer le nouveau code");
    }

    // Logger l'action de régénération
    await prisma.announcementTracking.create({
      data: {
        announcementId,
        status: "ACTIVE", // Utiliser un statut valide
        message: `Code de validation régénéré: ${reason}`,
        createdBy: user.id,
        isPublic: false, // Information sensible
        metadata: {
          oldCodeInvalidated: true,
          reason,
        },
      },
    });

    logger.info(
      `Code de validation régénéré pour livraison ${delivery.id}`,
    );

    return NextResponse.json({
      success: true,
      message: "Nouveau code de validation généré",
      validation: {
        code: validationInfo.code,
        expiresAt: validationInfo.expiresAt.toISOString(),
        timeRemaining: validationInfo.expiresAt.getTime() - Date.now(),
        regeneratedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Erreur régénération code validation:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la régénération du code",
      },
      { status: 500 },
    );
  }
}

/**
 * Retourne la raison pour laquelle le code n'est pas disponible
 */
function getValidationCodeUnavailableReason(status: string): string {
  const reasons = {
    PENDING: "La livraison n'a pas encore été acceptée par un livreur",
    ACCEPTED: "Le livreur n'a pas encore récupéré le colis",
    PICKED_UP: "Le colis a été récupéré mais n'est pas encore en transit",
    DELIVERED: "La livraison a déjà été validée",
    CANCELLED: "La livraison a été annulée",
  };

  return (
    reasons[status as keyof typeof reasons] ||
    "Statut de livraison incompatible"
  );
}

/**
 * Formate le temps restant en format lisible
 */
function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
