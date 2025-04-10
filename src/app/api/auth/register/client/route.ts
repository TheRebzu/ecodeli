import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { UserRole } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, password, phone } = body;

    // Validation basique
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Données manquantes" },
        { status: 400 }
      );
    }

    // Avec mockDb, nous pouvons simuler une vérification d'email
    // Dans le mode développement, on va simplement continuer avec l'inscription

    // Hacher le mot de passe (en mode développement, on peut simplement le garder tel quel)
    const hashedPassword = process.env.NODE_ENV === "production" 
      ? await hashPassword(password) 
      : password;

    // Créer l'utilisateur
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: UserRole.CLIENT,
      }
    });

    // Retourner une réponse réussie
    return NextResponse.json(
      {
        success: true,
        message: "Inscription réussie",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { success: false, message: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
} 