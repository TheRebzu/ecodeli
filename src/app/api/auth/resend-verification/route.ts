import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { EmailService } from "@/lib/email";
import { randomUUID } from "crypto";

const resendVerificationSchema = z.object({
  email: z.string().email("Email invalide"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = resendVerificationSchema.parse(body);

    // Chercher l'utilisateur
    const user = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si l'email est déjà vérifié
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email déjà vérifié" },
        { status: 400 }
      );
    }

    // Générer un nouveau token
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Stocker le token dans la table VerificationToken
    await db.verificationToken.upsert({
      where: { 
        identifier_token: {
          identifier: user.email,
          token: token
        }
      },
      update: {
        expires
      },
      create: {
        identifier: user.email,
        token,
        expires
      }
    });

    // Envoyer l'email de vérification
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`;
      await EmailService.sendVerificationEmail(
        user.email,
        verificationUrl,
        "fr"
      );
    } catch (emailError) {
      console.error("Erreur envoi email de vérification:", emailError);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email de vérification renvoyé avec succès",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors du renvoi de vérification:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
} 