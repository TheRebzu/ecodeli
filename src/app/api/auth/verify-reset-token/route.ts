import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Vérifier le token de reset
    const passwordReset = await db.passwordReset.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!passwordReset) {
      return NextResponse.json(
        { valid: false, error: "Invalid reset token" },
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
        { valid: false, error: "Reset token has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: passwordReset.user.email,
        name: passwordReset.user.name
      }
    });

  } catch (error) {
    console.error("Error in verify-reset-token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}