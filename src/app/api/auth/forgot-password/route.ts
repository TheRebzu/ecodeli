import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";

// Validation schema for forgot password
const forgotPasswordSchema = z.object({
  email: z.string().email("Veuillez saisir une adresse email valide"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);
    const { email } = validatedData;

    // Generate reset token (function handles finding the user)
    const token = await generatePasswordResetToken(email);
    
    // If a token was generated (valid user found)
    if (token) {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (user) {
        // Send reset email
        await sendPasswordResetEmail(
          user.email,
          user.name || "Utilisateur",
          token
        );
      }
    }
    
    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "Si votre adresse est associée à un compte, un email de réinitialisation a été envoyé"
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la demande de réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
} 