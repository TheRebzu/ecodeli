import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    // Validation du mot de passe
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Vérifier le token de reset
    const passwordReset = await db.passwordReset.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!passwordReset) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Vérifier si le token n'a pas expiré
    if (passwordReset.expiresAt < new Date()) {
      // Supprimer le token expiré
      await db.passwordReset.delete({
        where: { id: passwordReset.id }
      });

      return NextResponse.json(
        { error: "Reset token has expired" },
        { status: 400 }
      );
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Mettre à jour le mot de passe de l'utilisateur
    await db.user.update({
      where: { id: passwordReset.userId },
      data: {
        password: hashedPassword,
        emailVerified: new Date(), // Marquer l'email comme vérifié lors du reset
        updatedAt: new Date()
      }
    });

    // Supprimer le token de reset utilisé
    await db.passwordReset.delete({
      where: { id: passwordReset.id }
    });

    // Supprimer tous les autres tokens de reset pour cet utilisateur
    await db.passwordReset.deleteMany({
      where: { userId: passwordReset.userId }
    });

    return NextResponse.json({
      message: "Password has been reset successfully"
    });

  } catch (error) {
    console.error("Error in reset-password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}