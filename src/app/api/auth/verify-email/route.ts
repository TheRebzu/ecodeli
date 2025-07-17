import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requis"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token de vérification manquant" },
        { status: 400 }
      );
    }

    // Valider le token
    const { token: validatedToken } = verifyEmailSchema.parse({ token });

    // Chercher l'utilisateur avec ce token
    const user = await db.user.findFirst({
      where: {
        verificationToken: validatedToken,
        verificationTokenExpires: {
          gt: new Date() // Token non expiré
        }
      },
      include: {
        profile: true,
        deliverer: true,
        provider: true,
        merchant: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token de vérification invalide ou expiré" },
        { status: 400 }
      );
    }

    // Activer le compte selon le rôle
    const updateData: any = {
      isActive: true,
      verificationToken: null,
      verificationTokenExpires: null,
      emailVerified: new Date()
    };

    // Mettre à jour le statut de validation selon le rôle
    switch (user.role) {
      case "DELIVERER":
        if (user.deliverer) {
          await db.deliverer.update({
            where: { userId: user.id },
            data: { validationStatus: "APPROVED" }
          });
        }
        break;
      case "PROVIDER":
        if (user.provider) {
          await db.provider.update({
            where: { userId: user.id },
            data: { validationStatus: "APPROVED" }
          });
        }
        break;
      case "MERCHANT":
        if (user.merchant) {
          await db.merchant.update({
            where: { userId: user.id },
            data: { contractStatus: "APPROVED" }
          });
        }
        break;
    }

    // Mettre à jour l'utilisateur
    await db.user.update({
      where: { id: user.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: "Compte activé avec succès",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: true
      }
    });

  } catch (error) {
    console.error("Erreur vérification email:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Token invalide", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
} 