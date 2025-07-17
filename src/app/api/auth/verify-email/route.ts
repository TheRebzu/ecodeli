import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // Chercher le token dans la table VerificationToken
    const verificationToken = await db.verificationToken.findUnique({
      where: {
        token
      }
    });

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur avec cet email
    const user = await db.user.findUnique({
      where: {
        email: verificationToken.identifier
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier l'email et activer le compte
    await db.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          isActive: true,
          validationStatus: user.role === "CLIENT" || user.role === "ADMIN" ? "APPROVED" : "PENDING",
        },
      });

      // Mettre à jour le profil
      await tx.profile.update({
        where: { userId: user.id },
        data: {
          isVerified: user.role === "CLIENT" || user.role === "ADMIN",
        },
      });

      // Supprimer le token utilisé
      await tx.verificationToken.delete({
        where: {
          token
        }
      });
    });

    // Rediriger vers la page de connexion avec un message de succès
    const redirectUrl = new URL("/fr/login", request.url);
    redirectUrl.searchParams.set("message", "Email vérifié avec succès ! Vous pouvez maintenant vous connecter.");
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Erreur lors de la vérification email:", error);
    
    const redirectUrl = new URL("/fr/login", request.url);
    redirectUrl.searchParams.set("error", "Erreur lors de la vérification de l'email.");
    
    return NextResponse.redirect(redirectUrl);
  }
}