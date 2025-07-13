import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { trackingUpdateSchema } from "@/features/deliveries/schemas/delivery.schema";
import { deliveryTrackingService } from "@/features/deliveries/services/delivery-tracking.service";

/**
 * GET /api/shared/deliveries/[id]/tracking
 * Récupère l'historique complet de suivi d'une livraison
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: deliveryId } = await params;

    // Vérifier les permissions d'accès à cette livraison
    const hasAccess = await checkDeliveryAccess(
      deliveryId,
      session.user.id,
      session.user.role,
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Accès refusé à cette livraison" },
        { status: 403 },
      );
    }

    // Récupérer les informations complètes de la livraison avec tracking
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: {
          include: {
            pickupLocation: true,
            deliveryLocation: true,
          },
        },
        deliverer: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        trackingSession: {
          where: { isActive: true },
          include: {
            locationUpdates: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 },
      );
    }

    // Obtenir la position actuelle
    const currentPosition = delivery.trackingSession?.[0]?.locationUpdates?.[0];

    // Calculer l'estimation d'arrivée
    const estimatedArrival = currentPosition
      ? await deliveryTrackingService.calculateEstimatedArrival(
          deliveryId,
          delivery.announcement.deliveryLocation.address,
        )
      : null;

    console.log(
      `[TRACKING CONSULTÉ] Livraison: ${deliveryId}, User: ${session.user.id}`,
    );

    return NextResponse.json({
      success: true,
      delivery: {
        id: delivery.id,
        trackingCode: delivery.trackingCode,
        status: delivery.status,
        pickupLocation: {
          address: delivery.announcement.pickupLocation.address,
          coordinates: delivery.announcement.pickupLocation.coordinates
            ? JSON.parse(
                delivery.announcement.pickupLocation.coordinates as string,
              )
            : null,
        },
        deliveryLocation: {
          address: delivery.announcement.deliveryLocation.address,
          coordinates: delivery.announcement.deliveryLocation.coordinates
            ? JSON.parse(
                delivery.announcement.deliveryLocation.coordinates as string,
              )
            : null,
        },
        deliverer: {
          id: delivery.deliverer.id,
          name: `${delivery.deliverer.user.profile?.firstName} ${delivery.deliverer.user.profile?.lastName}`,
          phone: delivery.deliverer.phone,
          vehicle: delivery.deliverer.vehicleType || "Véhicule",
        },
        estimatedArrival: estimatedArrival?.toISOString(),
        currentPosition: currentPosition
          ? {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              accuracy: currentPosition.accuracy,
              timestamp: currentPosition.timestamp,
              speed: currentPosition.speed,
              heading: currentPosition.heading,
            }
          : null,
        lastUpdate: currentPosition?.timestamp || delivery.updatedAt,
      },
    });
  } catch (error) {
    console.error("Erreur récupération tracking:", error);

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération du suivi",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/shared/deliveries/[id]/tracking
 * Ajoute une mise à jour de suivi temps réel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: deliveryId } = await params;
    const body = await request.json();

    // Validation des données de mise à jour
    const validatedData = trackingUpdateSchema.parse({
      ...body,
      deliveryId,
    });

    const { status, message, location } = validatedData;

    // Vérifier les permissions selon le rôle
    if (!["DELIVERER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        {
          error:
            "Seuls les livreurs et admins peuvent ajouter des mises à jour",
        },
        { status: 403 },
      );
    }

    // Ajouter la mise à jour de suivi
    const trackingUpdate = await deliveryTrackingService.addTrackingUpdate({
      deliveryId,
      status,
      message,
      location,
      isAutomatic: false,
    });

    console.log(
      `[TRACKING AJOUTÉ] Livraison: ${deliveryId}, Statut: ${status}`,
    );

    return NextResponse.json(
      {
        success: true,
        message: "Mise à jour de suivi ajoutée",
        trackingUpdate,
        deliveryId,
        newStatus: status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erreur ajout tracking:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données de mise à jour invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'ajout de la mise à jour",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/shared/deliveries/[id]/tracking
 * Met à jour la position géographique en temps réel (mobile)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id: deliveryId } = await params;
    const body = await request.json();

    // Validation de la géolocalisation
    const locationSchema = z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().optional(),
      altitude: z.number().optional(),
      heading: z.number().optional(),
      speed: z.number().optional(),
    });

    const location = locationSchema.parse(body);

    // Seuls les livreurs peuvent mettre à jour leur position
    if (session.user.role !== "DELIVERER") {
      return NextResponse.json(
        { error: "Seuls les livreurs peuvent mettre à jour leur position" },
        { status: 403 },
      );
    }

    // Mettre à jour la position via le service de tracking
    const result = await deliveryTrackingService.updateLocation(
      deliveryId,
      session.user.id,
      location,
    );

    console.log(
      `[POSITION MISE À JOUR] Livraison: ${deliveryId}, Livreur: ${session.user.id}`,
    );

    return NextResponse.json({
      success: true,
      message: result.message,
      deliveryId,
      location,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur mise à jour position:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données de géolocalisation invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la mise à jour de position",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Fonctions utilitaires pour les permissions

/**
 * Vérifie si un utilisateur a accès aux informations de suivi d'une livraison
 */
async function checkDeliveryAccess(
  deliveryId: string,
  userId: string,
  userRole: string,
): Promise<boolean> {
  try {
    if (userRole === "ADMIN") {
      return true; // Les admins ont accès à tout
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        announcement: true,
      },
    });

    if (!delivery) {
      return false;
    }

    // Le client expéditeur et le livreur assigné ont accès
    return (
      delivery.announcement.authorId === userId ||
      delivery.delivererId === userId
    );
  } catch (error) {
    console.error("Erreur vérification accès:", error);
    return false;
  }
}

/**
 * Vérifie si un livreur est autorisé à modifier une livraison
 */
async function checkDelivererPermission(
  deliveryId: string,
  delivererId: string,
): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/db");

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        delivererId,
        status: {
          in: ["ACCEPTED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
        },
      },
    });

    return !!delivery;
  } catch (error) {
    console.error("Erreur vérification permission livreur:", error);
    return false;
  }
}
