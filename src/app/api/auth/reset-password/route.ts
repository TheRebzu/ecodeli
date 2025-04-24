import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validatePasswordResetToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/auth";

// Validation schema for password reset
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);
    const { token, password } = validatedData;

    // Validate token
    const result = await validatePasswordResetToken(token);
    
    if (!result.valid || !result.userId) {
      return NextResponse.json(
        { error: "Le lien de réinitialisation est invalide ou a expiré" },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);
    
    // Update user
    await prisma.user.update({
      where: { id: result.userId },
      data: { password: hashedPassword }
    });

    // Delete the token after use
    await prisma.passwordResetToken.delete({
      where: { token }
    });

    return NextResponse.json({
      success: true,
      message: "Votre mot de passe a été réinitialisé avec succès"
    });
  } catch (error) {
    console.error("Password reset error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
} 