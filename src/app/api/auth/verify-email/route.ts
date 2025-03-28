import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

// Schema for validating token data
const verifyEmailSchema = z.object({
  token: z.string()
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  
  if (!token) {
    return NextResponse.json(
      { error: "Token de vérification manquant" },
      { status: 400 }
    );
  }
  
  try {
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: "Token de vérification invalide" },
        { status: 400 }
      );
    }
    
    // Check if token has expired
    if (new Date() > new Date(verificationToken.expires)) {
      await prisma.verificationToken.delete({
        where: { token }
      });
      
      return NextResponse.json(
        { error: "Token de vérification expiré" },
        { status: 400 }
      );
    }
    
    // Find the user associated with the token
    const user = await prisma.user.findFirst({
      where: { email: verificationToken.identifier }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Update user status to APPROVED
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "APPROVED" }
    });
    
    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token }
    });
    
    return NextResponse.json({
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter."
    });
    
  } catch (error) {
    console.error("Erreur lors de la vérification d'email:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification d'email" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = verifyEmailSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { token } = validation.data;
    
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });
    
    if (!verificationToken) {
      return NextResponse.json(
        { error: "Token de vérification invalide" },
        { status: 400 }
      );
    }
    
    // Check if token has expired
    if (new Date() > new Date(verificationToken.expires)) {
      await prisma.verificationToken.delete({
        where: { token }
      });
      
      return NextResponse.json(
        { error: "Token de vérification expiré" },
        { status: 400 }
      );
    }
    
    // Find the user associated with the token
    const user = await prisma.user.findFirst({
      where: { email: verificationToken.identifier }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Update user status to APPROVED
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "APPROVED" }
    });
    
    // Delete the verification token
    await prisma.verificationToken.delete({
      where: { token }
    });
    
    return NextResponse.json({
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter."
    });
    
  } catch (error) {
    console.error("Erreur lors de la vérification d'email:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification d'email" },
      { status: 500 }
    );
  }
} 