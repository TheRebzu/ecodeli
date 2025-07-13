import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { GeolocationService } from "@/features/tracking/services/geolocation.service";

const startTrackingSchema = z.object({
  deliveryId: z.string(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  altitude: z.number().optional(),
  timestamp: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
});

const stopTrackingSchema = z.object({
  deliveryId: z.string(),
});

/**
 * POST - Actions de tracking pour le livreur
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const body = await request.json();

    switch (action) {
      case "start":
        // Démarrer le tracking d'une livraison
        const startData = startTrackingSchema.parse(body);
        const session = await GeolocationService.startDeliveryTracking(
          startData.deliveryId,
          deliverer.id,
        );

        return NextResponse.json({
          success: true,
          message: "Tracking démarré",
          session,
        });

      case "update":
        // Mettre à jour la position
        const locationData = updateLocationSchema.parse(body);
        await GeolocationService.updateDelivererPosition(deliverer.id, {
          ...locationData,
          timestamp: locationData.timestamp || new Date(),
        });

        return NextResponse.json({
          success: true,
          message: "Position mise à jour",
        });

      case "stop":
        // Arrêter le tracking
        const stopData = stopTrackingSchema.parse(body);
        await GeolocationService.stopDeliveryTracking(
          stopData.deliveryId,
          deliverer.id,
        );

        return NextResponse.json({
          success: true,
          message: "Tracking arrêté",
        });

      default:
        return NextResponse.json(
          { error: "Action non spécifiée" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error handling tracking action:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Erreur lors de l'action de tracking" },
      { status: 500 },
    );
  }
}

/**
 * GET - Récupérer les sessions de tracking actives
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "DELIVERER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id },
    });

    if (!deliverer) {
      return NextResponse.json(
        { error: "Profil livreur non trouvé" },
        { status: 404 },
      );
    }

    // Récupérer les sessions actives
    const activeSessions = await prisma.trackingSession.findMany({
      where: {
        delivererId: deliverer.id,
        isActive: true,
      },
      include: {
        delivery: {
          include: {
            client: {
              include: {
                user: { include: { profile: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      activeSessions,
    });
  } catch (error) {
    console.error("Error getting tracking sessions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des sessions" },
      { status: 500 },
    );
  }
}
