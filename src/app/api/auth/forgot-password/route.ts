import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur existe
    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      // Pour des raisons de sécurité, ne pas révéler si l'email existe
      return NextResponse.json({
        message: "If an account with this email exists, you will receive a password reset link."
      });
    }

    // Générer un token de reset
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Supprimer les anciens tokens de reset pour cet utilisateur
    await db.passwordReset.deleteMany({
      where: { userId: user.id }
    });

    // Créer un nouveau token de reset
    await db.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: resetTokenExpiry
      }
    });

    // Envoyer l'email de reset
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
    
    await sendEmail({
      to: user.email,
      subject: "Réinitialisation de votre mot de passe - EcoDeli",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${user.name || user.profile?.firstName || ""},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe sur EcoDeli.</p>
          <p>Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Ce lien expire dans 24 heures. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Si le bouton ne fonctionne pas, vous pouvez copier ce lien dans votre navigateur :<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            © 2024 EcoDeli - Livraison éco-responsable
          </p>
        </div>
      `
    });

    return NextResponse.json({
      message: "If an account with this email exists, you will receive a password reset link."
    });

  } catch (error) {
    console.error("Error in forgot-password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}