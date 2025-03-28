import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH: Approve a service provider
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
    
    const providerId = params.id;
    
    // Find the service provider and associated user
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      include: { user: true }
    });
    
    if (!provider) {
      return NextResponse.json(
        { error: "Prestataire non trouvé" },
        { status: 404 }
      );
    }
    
    // Update user status to approved
    const updatedUser = await prisma.user.update({
      where: { id: provider.userId },
      data: {
        status: "APPROVED",
        emailVerified: new Date() // Ensure email is marked as verified
      }
    });
    
    // Optional: Verify provider documents or certifications if applicable
    // This would be implemented based on your business logic
    
    // Send notification to the provider about approval (placeholder)
    // This would integrate with your notification system
    
    return NextResponse.json({ 
      message: "Prestataire approuvé avec succès",
      data: {
        user: updatedUser,
        provider: provider
      }
    });
    
  } catch (error) {
    console.error("Erreur lors de l'approbation du prestataire:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de l'approbation du prestataire" },
      { status: 500 }
    );
  }
} 