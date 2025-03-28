import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Valid status transitions - defines which status can follow another
const validStatusTransitions: Record<string, string[]> = {
  "PENDING": ["ASSIGNED", "CANCELLED"],
  "ASSIGNED": ["PICKED_UP", "CANCELLED"],
  "PICKED_UP": ["IN_TRANSIT", "FAILED"],
  "IN_TRANSIT": ["OUT_FOR_DELIVERY", "FAILED"],
  "OUT_FOR_DELIVERY": ["DELIVERED", "FAILED"],
  "FAILED": ["ASSIGNED", "CANCELLED"],
  "DELIVERED": [],
  "CANCELLED": []
};

// Schema for status update
const statusUpdateSchema = z.object({
  status: z.enum([
    "ASSIGNED", "PICKED_UP", "IN_TRANSIT", 
    "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "CANCELLED"
  ]),
  location: z.string().optional(),
  notes: z.string().optional(),
});

// PATCH: Update delivery status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = params.id;
    
    // Get the delivery to check authorization and current status
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: true,
        merchant: true,
        deliveryPerson: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    const body = await req.json();
    const validation = statusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { status, location, notes } = validation.data;
    
    // Check if the status transition is valid
    const validNextStatuses = validStatusTransitions[delivery.status] || [];
    if (!validNextStatuses.includes(status)) {
      return NextResponse.json({
        error: `Transition de statut invalide: ${delivery.status} → ${status}`,
        validTransitions: validNextStatuses
      }, { status: 400 });
    }

    // Different status updates have different authorization requirements
    const userId = session.user.id;
    let isAuthorized = false;
    
    switch (status) {
      case "ASSIGNED":
        // Assigning a delivery person - Admin or delivery person can do this
        if (session.user.role === "ADMIN" || session.user.role === "DELIVERY_PERSON") {
          isAuthorized = true;
          
          // If a delivery person is assigning themselves, connect their profile
          if (session.user.role === "DELIVERY_PERSON") {
            const deliveryPerson = await prisma.deliveryPerson.findUnique({
              where: { userId }
            });
            
            if (!deliveryPerson) {
              return NextResponse.json({ error: "Profil livreur non trouvé" }, { status: 404 });
            }
            
            // Update the delivery with the delivery person
            await prisma.delivery.update({
              where: { id },
              data: {
                deliveryPerson: {
                  connect: { id: deliveryPerson.id }
                }
              }
            });
          }
        }
        break;
        
      case "CANCELLED":
        // Cancelling - Admin, customer, or the assigned delivery person can do this
        isAuthorized = 
          session.user.role === "ADMIN" ||
          (delivery.customer?.userId === userId) ||
          (delivery.deliveryPerson?.userId === userId);
        break;
        
      default:
        // For all other statuses - Admin or the assigned delivery person can update
        isAuthorized = 
          session.user.role === "ADMIN" ||
          (delivery.deliveryPerson?.userId === userId);
    }
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé pour cette mise à jour de statut" }, { status: 403 });
    }

    // Update delivery status
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status,
        // Add a tracking update
        trackingUpdates: {
          create: {
            status,
            location: location || "",
            description: getStatusDescription(status, notes),
            timestamp: new Date()
          }
        }
      }
    });

    // If delivered, update completion time
    if (status === "DELIVERED") {
      await prisma.delivery.update({
        where: { id },
        data: {
          completedAt: new Date()
        }
      });
      
      // Create notification for customer
      if (delivery.customer) {
        await prisma.notification.create({
          data: {
            userId: delivery.customer.userId,
            type: "DELIVERY_COMPLETED",
            title: "Livraison terminée",
            content: `Votre livraison #${delivery.trackingNumber} a été livrée.`,
            isRead: false
          }
        });
      }
    }
    
    // If failed, create notification for customer
    if (status === "FAILED" && delivery.customer) {
      await prisma.notification.create({
        data: {
          userId: delivery.customer.userId,
          type: "DELIVERY_ISSUE",
          title: "Problème de livraison",
          content: `Votre livraison #${delivery.trackingNumber} a rencontré un problème: ${notes || "Échec de livraison"}`,
          isRead: false
        }
      });
    }

    return NextResponse.json({
      message: "Statut de livraison mis à jour avec succès",
      delivery: updatedDelivery
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    );
  }
}

// Helper function to get a description for a status
function getStatusDescription(status: string, notes?: string): string {
  const descriptions: Record<string, string> = {
    "ASSIGNED": "Livreur assigné à la commande",
    "PICKED_UP": "Colis récupéré",
    "IN_TRANSIT": "Colis en transit",
    "OUT_FOR_DELIVERY": "En cours de livraison",
    "DELIVERED": "Livraison effectuée",
    "FAILED": notes ? `Échec de livraison: ${notes}` : "Échec de livraison",
    "CANCELLED": "Livraison annulée"
  };
  
  return descriptions[status] || `Statut mis à jour: ${status}`;
} 