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

    // Chercher l'utilisateur avec ce token
    const user = await db.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    // Vérifier l'email et activer le compte
    await db.$transaction(async (tx) => {
      // Mettre à jour l'utilisateur
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
          isActive: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
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