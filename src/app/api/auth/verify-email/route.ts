import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateVerificationToken } from "@/lib/tokens";
import { sendWelcomeEmail } from "@/lib/email";

// Validation schema for email verification
const verifyEmailSchema = z.object({
  token: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyEmailSchema.parse(body);
    const { token } = validatedData;

    // Validate token
    const result = await validateVerificationToken(token);
    
    if (!result.valid || !result.userId) {
      return NextResponse.json(
        { error: "Le lien de vérification est invalide ou a expiré" },
        { status: 400 }
      );
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: result.userId },
      data: { emailVerified: new Date() }
    });

    // Delete the token after use
    await prisma.verificationToken.delete({
      where: { token }
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name || "Utilisateur");

    return NextResponse.json({
      success: true,
      message: "Votre adresse email a été vérifiée avec succès"
    });
  } catch (error) {
    console.error("Email verification error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la vérification de l'email" },
      { status: 500 }
    );
  }
} 