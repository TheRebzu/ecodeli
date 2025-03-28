import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/lib/prisma";

// Schema for validating password reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = resetPasswordSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { token, password } = validation.data;
    
    // Find the reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });
    
    if (!resetToken) {
      return NextResponse.json(
        { error: "Token de réinitialisation invalide" },
        { status: 400 }
      );
    }
    
    // Check if token has expired
    if (new Date() > new Date(resetToken.expires)) {
      await prisma.passwordResetToken.delete({
        where: { token }
      });
      
      return NextResponse.json(
        { error: "Token de réinitialisation expiré" },
        { status: 400 }
      );
    }
    
    // Find the user associated with the token
    const user = await prisma.user.findFirst({
      where: { email: resetToken.identifier }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }
    
    // Hash the new password
    const hashedPassword = await hash(password, 12);
    
    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    // Delete the reset token
    await prisma.passwordResetToken.delete({
      where: { token }
    });
    
    return NextResponse.json({
      message: "Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter."
    });
    
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
} 