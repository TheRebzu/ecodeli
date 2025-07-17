import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmailService } from "@/lib/email";
import { z } from "zod";

const sendVerificationSchema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Vérifier que l'utilisateur est connecté
    if (!session?.user) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = sendVerificationSchema.parse(body);

    // Vérifier que l'email correspond à l'utilisateur connecté
    if (email !== session.user.email) {
      return NextResponse.json(
        { error: "Email non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer l'utilisateur complet
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: true,
        deliverer: true,
        provider: true,
        merchant: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Générer un token de vérification
    const verificationToken = `verify_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Sauvegarder le token dans la base de données
    await db.user.update({
      where: { id: user.id },
      data: {
        verificationToken: verificationToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      }
    });

    // Construire l'URL de vérification
            const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/fr/login?message=Email de vérification envoyé`;

    // Envoyer l'email de vérification
    const result = await EmailService.sendVerificationEmail(
      user.email,
      verificationUrl,
      "fr" // ou récupérer depuis la session
    );

    return NextResponse.json({
      success: true,
      message: "Email de vérification envoyé avec succès",
      messageId: result.messageId
    });

  } catch (error) {
    console.error("Erreur envoi email de vérification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'email de vérification" },
      { status: 500 }
    );
  }
} 