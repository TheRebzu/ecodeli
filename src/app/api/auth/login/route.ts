import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Schéma de validation pour la connexion
const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation des données
    const validatedData = loginSchema.parse(body);
    
    // Chercher l'utilisateur dans la base de données
    const user = await db.user.findUnique({
      where: {
        email: validatedData.email
      },
      include: {
        profile: true,
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    if (user.password) {
      const isPasswordValid = await bcrypt.compare(
        validatedData.password,
        user.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Identifiants invalides" },
          { status: 401 }
        );
      }
    }

    // Vérifier si l'utilisateur est actif (pour certains rôles)
    const requiresActiveStatus = ['DELIVERER', 'PROVIDER'];
    if (!user.isActive && requiresActiveStatus.includes(user.role)) {
      return NextResponse.json(
        { error: "Compte en attente de validation" },
        { status: 403 }
      );
    }

    // Mettre à jour la date de dernière connexion
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Retourner les données utilisateur formatées pour l'app mobile
    return NextResponse.json({
      success: true,
      message: "Connexion réussie",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        phone: user.profile?.phone || null,
        avatar: user.profile?.avatar || null,
        role: user.role,
        isValidated: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      token: `mock_token_${user.id}`, // Token temporaire pour l'app mobile
      refreshToken: `mock_refresh_token_${user.id}`
    });

  } catch (error) {
    console.error("Erreur lors de la connexion:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}