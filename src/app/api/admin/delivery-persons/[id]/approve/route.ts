import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH: Approve a delivery person
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
    
    const courierId = params.id;
    
    // Find the courier and associated user
    const courier = await prisma.courier.findUnique({
      where: { id: courierId },
      include: { user: true }
    });
    
    if (!courier) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      );
    }
    
    // Update courier: mark documents as verified
    const updatedCourier = await prisma.courier.update({
      where: { id: courierId },
      data: {
        verifiedDocuments: true,
      }
    });
    
    // Update user status to approved
    const updatedUser = await prisma.user.update({
      where: { id: courier.userId },
      data: {
        status: "APPROVED"
      }
    });
    
    // Send notification to the courier about approval (placeholder)
    // This would integrate with your notification system
    
    return NextResponse.json({ 
      message: "Livreur approuvé avec succès",
      data: {
        courier: updatedCourier,
        user: updatedUser
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de l'approbation du livreur:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de l'approbation du livreur" },
      { status: 500 }
    );
  }
} 