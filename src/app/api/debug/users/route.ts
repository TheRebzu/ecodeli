import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Récupérer quelques utilisateurs pour vérifier
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        validationStatus: true,
        password: true, // Vérifier le hash du mot de passe
        profile: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      take: 10
    });

    // Compter le nombre total d'utilisateurs
    const totalUsers = await db.user.count();

    return NextResponse.json({
      success: true,
      totalUsers,
      users: users.map(user => ({
        ...user,
        passwordHash: user.password ? user.password.substring(0, 20) + "..." : null
      }))
    });

  } catch (error) {
    console.error("Erreur debug users:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 500 }
    );
  }
} 