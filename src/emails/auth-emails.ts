import nodemailer from 'nodemailer';

// Configuration du transporteur d'email (à remplacer par votre service réel)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  secure: process.env.NODE_ENV === 'production',
});

/**
 * Envoie un email de vérification à l'utilisateur
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  locale: string = 'fr'
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/${locale}/verify-email?token=${token}`;

  await transporter.sendMail({
    to: email,
    subject: 'Vérifiez votre adresse email - EcoDeli',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Vérifiez votre adresse email</h1>
        <p>Bonjour ${name},</p>
        <p>Merci de vous être inscrit sur EcoDeli. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Vérifier mon adresse email
        </a>
        <p>Si vous n'avez pas demandé cette vérification, veuillez ignorer cet email.</p>
        <p>Ce lien expirera dans 24 heures.</p>
      </div>
    `,
  });
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe - EcoDeli',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Réinitialisation de votre mot de passe</h1>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour le réinitialiser :</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Réinitialiser mon mot de passe
        </a>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
        <p>Ce lien expirera dans 1 heure.</p>
      </div>
    `,
  });
}

/**
 * Envoie un email de bienvenue après l'inscription
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  await transporter.sendMail({
    to: email,
    subject: 'Bienvenue sur EcoDeli !',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Bienvenue sur EcoDeli, ${name} !</h1>
        <p>Nous sommes ravis de vous compter parmi nos utilisateurs. Votre compte a été créé avec succès.</p>
        <p>N'hésitez pas à explorer toutes nos fonctionnalités et à nous contacter si vous avez des questions.</p>
        <p>Cordialement,</p>
        <p>L'équipe EcoDeli</p>
      </div>
    `,
  });
}
