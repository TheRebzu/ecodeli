import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for updating a delivery
const updateDeliverySchema = z.object({
  recipientName: z.string().min(1).optional(),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  deliveryInstructions: z.string().optional(),
  requestedDeliveryDate: z.string().optional(), // ISO string
  isExpress: z.boolean().optional(),
});

// GET: Get a specific delivery
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const id = params.id;
    
    // Fetch the delivery with related data
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              }
            }
          }
        },
        merchant: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              }
            }
          }
        },
        deliveryPerson: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              }
            }
          }
        },
        trackingUpdates: {
          orderBy: {
            timestamp: 'desc'
          }
        },
        issues: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Check authorization - only admin, assigned delivery person, customer, or merchant can access
    const userId = session.user.id;
    
    const isAuthorized = 
      session.user.role === "ADMIN" ||
      (delivery.customer?.userId === userId) ||
      (delivery.merchant?.userId === userId) ||
      (delivery.deliveryPerson?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Erreur lors de la récupération de la livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la livraison" },
      { status: 500 }
    );
  }
}

// PATCH: Update a delivery
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
    
    // Get the delivery to check authorization
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

    // Authorization check - only admin, customer, or merchant can update
    const userId = session.user.id;
    const isAuthorized = 
      session.user.role === "ADMIN" ||
      (delivery.customer?.userId === userId) ||
      (delivery.merchant?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Can only update if not already picked up or delivered
    if (delivery.status !== "PENDING" && delivery.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "La livraison ne peut plus être modifiée une fois en cours" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validation = updateDeliverySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      recipientName,
      recipientPhone,
      recipientEmail,
      deliveryInstructions,
      requestedDeliveryDate,
      isExpress,
    } = validation.data;

    // Create update data object with only provided fields
    const updateData: any = {};
    
    if (recipientName) updateData.recipientName = recipientName;
    if (recipientPhone !== undefined) updateData.recipientPhone = recipientPhone;
    if (recipientEmail !== undefined) updateData.recipientEmail = recipientEmail;
    if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;
    
    // Handle requested delivery date
    if (requestedDeliveryDate) {
      const estimatedDeliveryDate = new Date(requestedDeliveryDate);
      updateData.estimatedDeliveryDate = estimatedDeliveryDate;
    }
    
    // If express option is changed, recalculate price
    if (isExpress !== undefined && isExpress !== delivery.isExpress) {
      updateData.isExpress = isExpress;
      
      // Access package details from JSON field
      const packageDetails = delivery.packageDetails as any;
      const packageSize = packageDetails.packageSize;
      const packageWeight = packageDetails.packageWeight;
      
      // Recalculate price
      updateData.price = calculateDeliveryPrice(packageSize, packageWeight, isExpress);
    }

    // Update delivery
    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: updateData
    });

    // Create a tracking update to log the changes
    await prisma.trackingUpdate.create({
      data: {
        deliveryId: id,
        status: delivery.status,
        location: delivery.status === "ASSIGNED" ? delivery.origin : "",
        description: "Informations de livraison mises à jour",
        timestamp: new Date()
      }
    });

    return NextResponse.json(updatedDelivery);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la livraison" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a delivery
export async function DELETE(
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
        customer: true
      }
    });

    if (!delivery) {
      return NextResponse.json({ error: "Livraison non trouvée" }, { status: 404 });
    }

    // Authorization check - only admin or customer can cancel
    const userId = session.user.id;
    const isAuthorized = 
      session.user.role === "ADMIN" ||
      (delivery.customer?.userId === userId);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    // Can only cancel if not already picked up or delivered
    if (delivery.status !== "PENDING" && delivery.status !== "ASSIGNED") {
      return NextResponse.json(
        { error: "La livraison ne peut plus être annulée une fois en cours" },
        { status: 400 }
      );
    }

    // Update delivery status to CANCELLED
    const cancelledDelivery = await prisma.delivery.update({
      where: { id },
      data: {
        status: "CANCELLED",
        trackingUpdates: {
          create: {
            status: "CANCELLED",
            description: "Livraison annulée par le client",
            timestamp: new Date()
          }
        }
      }
    });

    return NextResponse.json({
      message: "Livraison annulée avec succès",
      delivery: cancelledDelivery
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la livraison:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de la livraison" },
      { status: 500 }
    );
  }
}

// Helper function to calculate delivery price (same as in route.ts)
function calculateDeliveryPrice(packageSize: string, weight: number, isExpress: boolean) {
  let basePrice = 0;
  
  // Base price according to package size
  switch (packageSize) {
    case "SMALL":
      basePrice = 5.99;
      break;
    case "MEDIUM":
      basePrice = 8.99;
      break;
    case "LARGE":
      basePrice = 12.99;
      break;
    case "EXTRA_LARGE":
      basePrice = 19.99;
      break;
    default:
      basePrice = 8.99;
  }
  
  // Add weight factor
  const weightFactor = Math.max(1, Math.ceil(weight / 5));
  const weightPrice = basePrice * 0.1 * (weightFactor - 1);
  
  // Express delivery adds 50% to the price
  const expressMultiplier = isExpress ? 1.5 : 1;
  
  return Number(((basePrice + weightPrice) * expressMultiplier).toFixed(2));
} 