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
        delivery: {
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
            validations: {
              where: { isUsed: false },
              orderBy: { createdAt: "desc" },
              take: 1,
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

    if (!announcement.delivery) {
      return NextResponse.json(
        {
          error: "Aucune livraison associée à cette annonce",
          status: announcement.status,
        },
        { status: 400 },
      );
    }

    // Vérifier que la livraison est dans un état où le code est nécessaire
    const validStatuses = ["IN_TRANSIT", "OUT_FOR_DELIVERY"];
    if (!validStatuses.includes(announcement.delivery.status)) {
      return NextResponse.json(
        {
          error: "Le code de validation n'est pas encore disponible",
          deliveryStatus: announcement.delivery.status,
          reason: getValidationCodeUnavailableReason(
            announcement.delivery.status,
          ),
        },
        { status: 400 },
      );
    }

    // Récupérer ou générer le code de validation
    let validationInfo = await ValidationCodeService.getValidationInfo(
      announcement.delivery.id,
    );

    if (!validationInfo) {
      // Générer un nouveau code si aucun n'existe
      const newCode = await ValidationCodeService.generateValidationCode(
        announcement.delivery.id,
      );
      validationInfo = await ValidationCodeService.getValidationInfo(
        announcement.delivery.id,
      );

      if (!validationInfo) {
        throw new Error("Impossible de générer le code de validation");
      }

      logger.info(
        `Nouveau code de validation généré pour livraison ${announcement.delivery.id}`,
      );
    }

    // Calculer le temps restant avant expiration
    const timeRemaining = validationInfo.expiresAt.getTime() - Date.now();
    const isExpired = timeRemaining <= 0;

    if (isExpired) {
      // Régénérer un code si celui-ci a expiré
      const newCode = await ValidationCodeService.generateValidationCode(
        announcement.delivery.id,
      );
      validationInfo = await ValidationCodeService.getValidationInfo(
        announcement.delivery.id,
      );

      if (!validationInfo) {
        throw new Error("Impossible de régénérer le code de validation");
      }

      logger.info(
        `Code de validation régénéré pour livraison ${announcement.delivery.id}`,
      );
    }

    // Préparer les informations de la livraison
    const deliveryInfo = {
      id: announcement.delivery.id,
      status: announcement.delivery.status,
      trackingNumber: announcement.delivery.trackingNumber,
      deliverer: {
        name: announcement.delivery.deliverer?.profile
          ? `${announcement.delivery.deliverer.profile.firstName} ${announcement.delivery.deliverer.profile.lastName}`
          : "Livreur",
        phone: announcement.delivery.deliverer?.profile?.phone,
        avatar: announcement.delivery.deliverer?.profile?.avatar,
      },
    };

    // Créer un QR code pour faciliter la validation mobile
    const qrCodeData = {
      type: "ecodeli_validation",
      announcementId,
      deliveryId: announcement.delivery.id,
      code: validationInfo.code,
      expiresAt: validationInfo.expiresAt.toISOString(),
    };

    const response = {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status,
      },

      delivery: deliveryInfo,

      validation: {
        code: validationInfo.code,
        expiresAt: validationInfo.expiresAt.toISOString(),
        timeRemaining: Math.max(
          0,
          validationInfo.expiresAt.getTime() - Date.now(),
        ),
        timeRemainingFormatted: formatTimeRemaining(
          Math.max(0, validationInfo.expiresAt.getTime() - Date.now()),
        ),
        qrCodeData: Buffer.from(JSON.stringify(qrCodeData)).toString("base64"),
      },

      instructions: [
        "Communiquez ce code au livreur lors de la réception",
        "Le livreur saisira ce code pour confirmer la livraison",
        "Le code expire automatiquement après 2 heures",
        "Un nouveau code sera généré si celui-ci expire",
      ],

      actions: {
        canValidate: true,
        validationUrl: `/api/client/announcements/${announcementId}/validate`,
        qrCodeUrl: `data:text/plain;base64,${Buffer.from(JSON.stringify(qrCodeData)).toString("base64")}`,
      },
    };

    return NextResponse.json(response);
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
    });

    if (!announcement) {
      return NextResponse.json(
        { error: "Annonce introuvable" },
        { status: 404 },
      );
    }

    if (!announcement.delivery) {
      return NextResponse.json(
        { error: "Aucune livraison associée à cette annonce" },
        { status: 400 },
      );
    }

    // Vérifier que la livraison est dans un état valide
    const validStatuses = ["IN_TRANSIT", "OUT_FOR_DELIVERY"];
    if (!validStatuses.includes(announcement.delivery.status)) {
      return NextResponse.json(
        {
          error: "Impossible de régénérer le code dans ce statut",
          deliveryStatus: announcement.delivery.status,
        },
        { status: 400 },
      );
    }

    // Régénérer le code
    const newCode = await ValidationCodeService.generateValidationCode(
      announcement.delivery.id,
    );
    const validationInfo = await ValidationCodeService.getValidationInfo(
      announcement.delivery.id,
    );

    if (!validationInfo) {
      throw new Error("Impossible de récupérer le nouveau code");
    }

    // Logger l'action de régénération
    await prisma.announcementTracking.create({
      data: {
        announcementId,
        status: "CODE_REGENERATED",
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
      `Code de validation régénéré pour livraison ${announcement.delivery.id}`,
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
  if (ms <= 0) return "Expiré";

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
}
