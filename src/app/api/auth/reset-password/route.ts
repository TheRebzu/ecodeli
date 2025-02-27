import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import * as z from "zod";
import { createResetTokenAndSendEmail, sendPasswordChangeConfirmationEmail } from "@/lib/auth/email-utils";

// Schéma pour la demande de réinitialisation
const requestResetSchema = z.object({
  email: z.string().email("Email invalide"),
});

// Schéma pour la mise à jour du mot de passe
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
    .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Cas 1: Demande de réinitialisation
    if (body.email && !body.token) {
      const { email } = requestResetSchema.parse(body);

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Pour des raisons de sécurité, ne pas divulguer si l'email existe
        return NextResponse.json({
          success: true,
          message: "Si l'email est valide, vous recevrez un lien de réinitialisation.",
        });
      }

      // Créer un token et envoyer l'email
      await createResetTokenAndSendEmail(user);

      return NextResponse.json({
        success: true,
        message: "Si l'email est valide, vous recevrez un lien de réinitialisation.",
      });
    }

    // Cas 2: Réinitialisation du mot de passe
    if (body.token && body.password) {
      const { token, password } = resetPasswordSchema.parse(body);

      const resetToken = await prisma.resetToken.findUnique({
        where: { token },
        include: {
          user: true
        }
      });

      if (!resetToken) {
        return NextResponse.json(
          { success: false, message: "Token de réinitialisation invalide" },
          { status: 400 }
        );
      }

      if (resetToken.expires < new Date()) {
        await prisma.resetToken.delete({
          where: { id: resetToken.id },
        });

        return NextResponse.json(
          { success: false, message: "Le token de réinitialisation a expiré" },
          { status: 400 }
        );
      }

      // Mettre à jour le mot de passe
      const hashedPassword = await hash(password, 12);
      const updatedUser = await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Supprimer le token utilisé
      await prisma.resetToken.delete({
        where: { id: resetToken.id },
      });

      // Envoyer un email de confirmation de changement de mot de passe
      await sendPasswordChangeConfirmationEmail(updatedUser);

      return NextResponse.json({
        success: true,
        message: "Mot de passe mis à jour avec succès",
      });
    }

    return NextResponse.json(
      { success: false, message: "Requête invalide" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erreur de réinitialisation de mot de passe:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Données invalides",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Une erreur est survenue" },
      { status: 500 }
    );
  }
}