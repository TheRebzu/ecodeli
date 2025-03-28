import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH: Manually verify a user
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
    
    const userId = params.id;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: true,
        merchant: true,
        courier: true,
        provider: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Update the user's status to APPROVED and set email as verified
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "APPROVED",
        emailVerified: new Date(),
      },
      include: {
        client: true,
        merchant: true,
        courier: true,
        provider: true,
      }
    });
    
    // If user is a courier, verify their documents too if present
    if (user.role === "COURIER" && user.courier) {
      await prisma.courier.update({
        where: { id: user.courier.id },
        data: {
          verifiedDocuments: true,
        }
      });
    }
    
    // Send notification to the user about verification (placeholder)
    // This would integrate with your notification system
    
    return NextResponse.json({ 
      message: "Utilisateur vérifié avec succès",
      data: updatedUser 
    });
    
  } catch (error) {
    console.error("Erreur lors de la vérification de l'utilisateur:", error);
    
    return NextResponse.json(
      { error: "Erreur lors de la vérification de l'utilisateur" },
      { status: 500 }
    );
  }
} 