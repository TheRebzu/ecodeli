import nodemailer from "nodemailer";
import { env } from "@/lib/env";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

// Send account verification email
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
) {
  const verificationUrl = `${env.NEXTAUTH_URL}/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">Bienvenue sur EcoDeli, ${name}!</h2>
      <p style="color: #555; line-height: 1.5;">
        Merci de vous être inscrit(e) sur EcoDeli. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Vérifier mon adresse email
        </a>
      </div>
      <p style="color: #555; line-height: 1.5;">
        Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
      </p>
      <p style="color: #555; line-height: 1.5;">
        Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur:
      </p>
      <p style="color: #555; line-height: 1.5; word-break: break-all;">
        ${verificationUrl}
      </p>
      <p style="color: #777; font-size: 14px; margin-top: 40px; text-align: center;">
        &copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"EcoDeli" <${env.SMTP_FROM}>`,
      to,
      subject: "Vérification de votre adresse email - EcoDeli",
      html,
    });
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
) {
  const resetUrl = `${env.NEXTAUTH_URL}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">Réinitialisation de mot de passe</h2>
      <p style="color: #555; line-height: 1.5;">
        Bonjour ${name},
      </p>
      <p style="color: #555; line-height: 1.5;">
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color: #555; line-height: 1.5;">
        Si vous n'avez pas demandé à réinitialiser votre mot de passe, vous pouvez ignorer cet email.
      </p>
      <p style="color: #555; line-height: 1.5;">
        Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur:
      </p>
      <p style="color: #555; line-height: 1.5; word-break: break-all;">
        ${resetUrl}
      </p>
      <p style="color: #777; font-size: 14px; margin-top: 40px; text-align: center;">
        &copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"EcoDeli" <${env.SMTP_FROM}>`,
      to,
      subject: "Réinitialisation de votre mot de passe - EcoDeli",
      html,
    });
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

// Send welcome email after verification
export async function sendWelcomeEmail(to: string, name: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333; text-align: center;">Bienvenue sur EcoDeli!</h2>
      <p style="color: #555; line-height: 1.5;">
        Bonjour ${name},
      </p>
      <p style="color: #555; line-height: 1.5;">
        Votre compte a été vérifié avec succès! Nous sommes ravis de vous accueillir sur EcoDeli.
      </p>
      <p style="color: #555; line-height: 1.5;">
        Vous pouvez maintenant vous connecter et commencer à utiliser nos services.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${env.NEXTAUTH_URL}/login" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Se connecter
        </a>
      </div>
      <p style="color: #777; font-size: 14px; margin-top: 40px; text-align: center;">
        &copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"EcoDeli" <${env.SMTP_FROM}>`,
      to,
      subject: "Bienvenue sur EcoDeli!",
      html,
    });
    console.log(`Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
} 