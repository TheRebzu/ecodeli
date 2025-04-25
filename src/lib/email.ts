import nodemailer from "nodemailer";

// Configuration du transporteur d'emails
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.example.com",
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: process.env.EMAIL_SERVER_SECURE === "true",
  auth: {
    user: process.env.EMAIL_SERVER_USER || "user@example.com",
    pass: process.env.EMAIL_SERVER_PASSWORD || "password",
  },
});

/**
 * Envoie un email de vérification à l'utilisateur
 * @param to Adresse email du destinataire
 * @param name Nom du destinataire
 * @param token Token de vérification
 * @returns Résultat de l'envoi
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `"EcoDeli" <${process.env.EMAIL_FROM || "noreply@ecodeli.com"}>`,
      to,
      subject: "Vérification de votre adresse email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Bienvenue sur EcoDeli, ${name} !</h2>
          <p>Merci de vous être inscrit sur notre plateforme. Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Vérifier mon adresse email
            </a>
          </p>
          <p>Si vous n'avez pas créé de compte sur EcoDeli, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 24 heures.</p>
          <p>Cordialement,<br>L'équipe EcoDeli</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param to Adresse email du destinataire
 * @param name Nom du destinataire
 * @param token Token de réinitialisation
 * @returns Résultat de l'envoi
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<boolean> {
  try {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"EcoDeli" <${process.env.EMAIL_FROM || "noreply@ecodeli.com"}>`,
      to,
      subject: "Réinitialisation de votre mot de passe",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Réinitialisation de mot de passe</h2>
          <p>Bonjour ${name},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
          <p style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Réinitialiser mon mot de passe
            </a>
          </p>
          <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.</p>
          <p>Ce lien expirera dans 1 heure.</p>
          <p>Cordialement,<br>L'équipe EcoDeli</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
}

/**
 * Envoie un email de notification
 * @param to Adresse email du destinataire
 * @param subject Sujet de l'email
 * @param content Contenu HTML de l'email
 * @returns Résultat de l'envoi
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  content: string,
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"EcoDeli" <${process.env.EMAIL_FROM || "noreply@ecodeli.com"}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${content}
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Cet email a été envoyé automatiquement par EcoDeli. Merci de ne pas y répondre.
          </p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
}

/**
 * Envoie un email de bienvenue à l'utilisateur après vérification
 * @param to Adresse email du destinataire
 * @param name Nom du destinataire
 * @returns Résultat de l'envoi
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
): Promise<boolean> {
  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

    await transporter.sendMail({
      from: `"EcoDeli" <${process.env.EMAIL_FROM || "noreply@ecodeli.com"}>`,
      to,
      subject: "Bienvenue sur EcoDeli !",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Félicitations, ${name} !</h2>
          <p>Votre compte a été vérifié avec succès. Vous pouvez maintenant vous connecter et profiter de tous nos services.</p>
          <p style="margin: 20px 0;">
            <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Se connecter
            </a>
          </p>
          <p>Merci d'avoir rejoint notre communauté écologique !</p>
          <p>Cordialement,<br>L'équipe EcoDeli</p>
        </div>
      `,
    });

    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
}
