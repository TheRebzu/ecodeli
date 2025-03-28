import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

// Schema for validating reset password request
const resetRequestSchema = z.object({
  email: z.string().email({ message: "Email invalide" })
});

// Schema for validating password reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

// Request password reset
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = resetRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides", details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { email } = validation.data;
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // For security reasons, always return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({
        message: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé."
      });
    }
    
    // Generate reset token
    const resetToken = randomUUID();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Token valid for 1 hour
    
    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { identifier: email }
    });
    
    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        identifier: email,
        token: resetToken,
        expires: resetExpires
      }
    });
    
    // TODO: Send email with reset link (would integrate with your email service)
    // await sendPasswordResetEmail(email, resetToken);
    
    return NextResponse.json({
      message: "Si un compte est associé à cet email, un lien de réinitialisation a été envoyé."
    });
    
  } catch (error) {
    console.error("Erreur lors de la demande de réinitialisation du mot de passe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
} 