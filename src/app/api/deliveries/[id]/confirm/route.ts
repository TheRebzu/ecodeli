import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for confirming delivery
const confirmDeliverySchema = z.object({
  signature: z.string().optional(),
  notes: z.string().optional(),
  recipientName: z.string().min(1, { message: "Nom du destinataire requis" }),
  photoProof: z.string().optional(), // Base64 encoded image or image URL
});

// POST: Confirm delivery completion
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
    
    // Get the delivery to check status and authorization
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        deliveryPerson: true,
        customer: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Only the assigned delivery person or admin can confirm delivery
    const userId = session.user.id;
    const isAuthorized = 
      session.user.role === "ADMIN" ||
      (delivery.deliveryPerson?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Can only confirm delivery if it's in "OUT_FOR_DELIVERY" status
    if (delivery.status !== "OUT_FOR_DELIVERY") {
      return NextResponse.json(
        { error: "La livraison doit être en cours de livraison pour être confirmée" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = confirmDeliverySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { signature, notes, recipientName, photoProof } = validation.data;

    // Update delivery to delivered status
    const confirmedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: "DELIVERED",
        completedAt: new Date(),
        proof: {
          signature,
          recipientName,
          photoProof,
          notes,
          timestamp: new Date()
        },
        // Add a tracking update
        trackingUpdates: {
          create: {
            status: "DELIVERED",
            location: delivery.destination,
            description: notes 
              ? `Livraison effectuée à ${recipientName}. Notes: ${notes}` 
              : `Livraison effectuée à ${recipientName}`,
            timestamp: new Date()
          }
        }
      }
    });

    // Create delivery history record
    await prisma.deliveryHistory.create({
      data: {
        deliveryId: id,
        status: "DELIVERED",
        details: {
          recipientName,
          notes,
          hasSignature: Boolean(signature),
          hasPhoto: Boolean(photoProof)
        },
        timestamp: new Date()
      }
    });

    // Create notification for the customer
    if (delivery.customer) {
      await prisma.notification.create({
        data: {
          userId: delivery.customer.userId,
          type: "DELIVERY_COMPLETED",
          title: "Livraison terminée",
          content: `Votre livraison #${delivery.trackingNumber} a été livrée à ${recipientName}.`,
          isRead: false
        }
      });
    }

    // Return success with the updated delivery
    return NextResponse.json({
      message: "Livraison confirmée avec succès",
      delivery: confirmedDelivery
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation de livraison" },
      { status: 500 }
    );
  }
} 