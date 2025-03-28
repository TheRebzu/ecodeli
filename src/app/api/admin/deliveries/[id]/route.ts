import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for validating delivery update data
const deliveryUpdateSchema = z.object({
  status: z.enum(["WAITING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "CANCELLED"]).optional(),
  estimatedDeliveryTime: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "La date estimée doit être une date valide"
  }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  notes: z.string().optional(),
});

// GET: Admin operations to retrieve specific delivery details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    const shipmentId = params.id;
    
    // Fetch detailed shipment information
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
                address: true,
                city: true
              }
            }
          }
        },
        announcement: true,
        couriers: {
          include: {
            courier: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        // Include payment information related to this shipment if applicable
        // Include any issues reported for this shipment if applicable
      }
    });
    
    if (!shipment) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: shipment });
    
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de la livraison:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des détails de la livraison" },
      { status: 500 }
    );
  }
}

// PATCH: Update delivery details
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }
    
    // Check if the user is an administrator
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Accès refusé" },
        { status: 403 }
      );
    }
    
    const shipmentId = params.id;
    
    // Check if shipment exists
    const shipmentExists = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });
    
    if (!shipmentExists) {
      return NextResponse.json(
        { error: "Livraison non trouvée" },
        { status: 404 }
      );
    }
    
    // Parse and validate the request body
    const body = await req.json();
    const validationResult = deliveryUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { data } = validationResult;
    
    // Prepare update data
    const updateData = {
      ...(data.status && { status: data.status }),
      ...(data.estimatedDeliveryTime && { estimatedDeliveryTime: new Date(data.estimatedDeliveryTime) }),
      ...(data.priority && { priority: data.priority }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };
    
    // Update the shipment
    const updatedShipment = await prisma.shipment.update({
      where: { id: shipmentId },
      data: updateData,
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        couriers: {
          include: {
            courier: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // If status was updated to DELIVERED, update related records
    if (data.status === "DELIVERED") {
      // Mark the delivery as complete in other relevant tables
      // Update any related payment status if needed
      // Add delivery completion date
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: {
          deliveryDate: new Date()
        }
      });
    }
    
    // Notify relevant users about the status update (placeholder)
    // This would integrate with your notification system
    
    return NextResponse.json({
      message: "Livraison mise à jour avec succès",
      data: updatedShipment
    });
    
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la livraison:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la livraison" },
      { status: 500 }
    );
  }
} 