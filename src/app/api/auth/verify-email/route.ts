import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendEmailVerificationSuccessEmail } from "@/lib/auth/email-utils";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token requis" },
        { status: 400 }
      );
    }

    // Rechercher le token de vérification
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: {
        user: true
      }
    });

    if (!verificationToken) {
      return NextResponse.json(
        { success: false, message: "Token de vérification invalide" },
        { status: 400 }
      );
    }

    // Vérifier si le token n'a pas expiré
    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });

      return NextResponse.json(
        { success: false, message: "Le token de vérification a expiré" },
        { status: 400 }
      );
    }

    // Activer l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });

    // Supprimer le token utilisé
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    });

    // Envoyer un email de confirmation
    await sendEmailVerificationSuccessEmail(updatedUser);

    return NextResponse.json({
      success: true,
      message: "Email vérifié avec succès. Vous pouvez maintenant vous connecter.",
    });
  } catch (error) {
    console.error("Erreur de vérification d'email:", error);
    return NextResponse.json(
      { success: false, message: "Une erreur est survenue lors de la vérification de l'email" },
      { status: 500 }
    );
  }
}