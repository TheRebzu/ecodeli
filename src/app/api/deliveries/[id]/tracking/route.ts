import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for adding a tracking update
const trackingUpdateSchema = z.object({
  location: z.string().min(1, { message: "Localisation requise" }),
  description: z.string().min(1, { message: "Description requise" }),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

// GET: Get tracking information for a delivery
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if tracking number is provided in query
    const { searchParams } = new URL(req.url);
    const trackingNumber = searchParams.get("trackingNumber");
    
    // Determine query based on provided parameters
    let query: any = {};
    
    if (trackingNumber) {
      // Public tracking by tracking number
      query.trackingNumber = trackingNumber;
    } else {
      // Tracking by ID requires authentication
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
      
      query.id = id;
    }
    
    // Fetch the delivery with tracking updates
    const delivery = await prisma.delivery.findUnique({
      where: query,
      select: {
        id: true,
        trackingNumber: true,
        status: true,
        origin: true,
        destination: true,
        estimatedDeliveryDate: true,
        completedAt: true,
        isExpress: true,
        trackingUpdates: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!delivery) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Erreur lors de la récupération du suivi:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du suivi" },
      { status: 500 }
    );
  }
}

// POST: Add a tracking update for a delivery
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = params.id;
    
    // Get the delivery to check authorization
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        deliveryPerson: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Only delivery person assigned to this delivery or admin can add tracking updates
    const userId = session.user.id;
    const isAuthorized = 
      session.user.role === "ADMIN" ||
      (delivery.deliveryPerson?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Cannot add tracking updates to cancelled or delivered orders
    if (delivery.status === "CANCELLED" || delivery.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Impossible d'ajouter des mises à jour pour une livraison terminée ou annulée" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = trackingUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { location, description, coordinates } = validation.data;

    // Create the tracking update
    const trackingUpdate = await prisma.trackingUpdate.create({
      data: {
        deliveryId: id,
        status: delivery.status,
        location,
        description,
        coordinates: coordinates ? JSON.stringify(coordinates) : null,
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      message: "Mise à jour de suivi ajoutée avec succès",
      trackingUpdate
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de la mise à jour de suivi:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la mise à jour de suivi" },
      { status: 500 }
    );
  }
} 