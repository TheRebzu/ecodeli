import { SupportedLanguage } from '@/types/i18n/locale';
import * as nodemailer from 'nodemailer';

/**
 * Configuration des emails basée sur les variables d'environnement
 */
const emailConfig = {
  // Configuration SMTP
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || 'smtp.eu.mailgun.org',
    port: Number(process.env.EMAIL_SMTP_PORT || 587),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    user: process.env.EMAIL_SMTP_USER || 'noreply@mg.ecodeli.me',
    pass: process.env.EMAIL_SMTP_PASS || '',
  },
  // Paramètres généraux
  sender: process.env.EMAIL_SENDER || '"EcoDeli" <noreply@mg.ecodeli.me>',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // Activation des emails
  enabled:
    process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_EMAIL_ENABLED === 'true',
};

/**
 * Types de données pouvant être passées à un template d'email
 */
interface EmailTemplateData {
  [key: string]: string | number | boolean | null | undefined | EmailTemplateData;
}

/**
 * Options pour envoyer un email
 */
interface SendEmailOptions {
  to: string;
  templateName: string;
  data: EmailTemplateData;
  locale?: SupportedLanguage;
}

/**
 * Options pour envoyer une notification par email
 */
export interface SendNotificationOptions {
  to: string;
  subject: string;
  templateName: string;
  data: EmailTemplateData;
  locale?: SupportedLanguage;
}

/**
 * Configurer le transporteur SMTP
 */
function getEmailTransporter() {
  // Configuration SMTP depuis les variables d'environnement
  return nodemailer.createTransport({
    host: emailConfig.smtp.host,
    port: emailConfig.smtp.port,
    secure: emailConfig.smtp.secure,
    auth: {
      user: emailConfig.smtp.user,
      pass: emailConfig.smtp.pass,
    },
  });
}

/**
 * Génère le contenu HTML pour un template d'email
 */
function generateEmailTemplate(
  templateName: string,
  data: EmailTemplateData,
  locale: SupportedLanguage
): string {
  // Traductions des titres et autres textes courants
  const translations = {
    fr: {
      welcome: 'Bienvenue sur EcoDeli',
      verification: 'Vérification de votre compte',
      resetPassword: 'Réinitialisation de mot de passe',
      button: 'Cliquez ici',
      greeting: 'Bonjour',
      footer: 'Cet email a été envoyé automatiquement. Merci de ne pas y répondre.',
      verifyAccount: 'Vérifier mon compte',
      resetPasswordAction: 'Réinitialiser mon mot de passe',
    },
    en: {
      welcome: 'Welcome to EcoDeli',
      verification: 'Account Verification',
      resetPassword: 'Password Reset',
      button: 'Click here',
      greeting: 'Hello',
      footer: 'This email was sent automatically. Please do not reply.',
      verifyAccount: 'Verify my account',
      resetPasswordAction: 'Reset my password',
    },
  };

  // Textes selon la langue
  const t = translations[locale] || translations.fr;

  // Style commun pour les emails
  const commonStyle = `
    font-family: Arial, sans-serif;
    color: #333;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.5;
  `;

  const buttonStyle = `
    display: inline-block;
    padding: 10px 20px;
    margin: 20px 0;
    background-color: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
  `;

  // Génération du HTML selon le template
  switch (templateName) {
    case 'verification':
      return `
        <div style="${commonStyle}">
          <h1 style="color: #4CAF50;">${t.verification}</h1>
          <p>${t.greeting} ${data.name},</p>
          <p>${
            locale === 'fr'
              ? 'Merci de vous être inscrit sur EcoDeli. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :'
              : 'Thank you for registering on EcoDeli. To activate your account, please click the button below:'
          }
          </p>
          <div style="text-align: center;">
            <a href="${data.verificationUrl}" style="${buttonStyle}">${t.verifyAccount}</a>
          </div>
          <p>${
            locale === 'fr'
              ? 'Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :'
              : 'If the button does not work, you can copy and paste the following link into your browser:'
          }
          </p>
          <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
          <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            ${t.footer}
          </p>
        </div>
      `;

    case 'reset-password':
      return `
        <div style="${commonStyle}">
          <h1 style="color: #4CAF50;">${t.resetPassword}</h1>
          <p>${t.greeting} ${data.name},</p>
          <p>${
            locale === 'fr'
              ? 'Vous avez demandé une réinitialisation de votre mot de passe. Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe :'
              : 'You have requested a password reset. Please click the button below to set a new password:'
          }
          </p>
          <div style="text-align: center;">
            <a href="${data.resetUrl}" style="${buttonStyle}">${t.resetPasswordAction}</a>
          </div>
          <p>${
            locale === 'fr'
              ? 'Si le bouton ne fonctionne pas, vous pouvez copier et coller le lien suivant dans votre navigateur :'
              : 'If the button does not work, you can copy and paste the following link into your browser:'
          }
          </p>
          <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
          <p>${
            locale === 'fr'
              ? "Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email."
              : 'If you did not request this reset, you can ignore this email.'
          }
          </p>
          <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            ${t.footer}
          </p>
        </div>
      `;

    case 'welcome':
      return `
        <div style="${commonStyle}">
          <h1 style="color: #4CAF50;">${t.welcome}</h1>
          <p>${t.greeting} ${data.name},</p>
          <p>${
            locale === 'fr'
              ? 'Nous sommes ravis de vous compter parmi nos utilisateurs. Votre compte a été activé avec succès.'
              : 'We are delighted to have you as a user. Your account has been successfully activated.'
          }
          </p>
          <p>${
            locale === 'fr'
              ? 'Vous pouvez maintenant vous connecter et commencer à utiliser nos services.'
              : 'You can now log in and start using our services.'
          }
          </p>
          <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            ${t.footer}
          </p>
        </div>
      `;

    default:
      return `
        <div style="${commonStyle}">
          <h1 style="color: #4CAF50;">EcoDeli</h1>
          <p>${t.greeting} ${data.name || ''},</p>
          <p>${JSON.stringify(data)}</p>
          <p style="font-size: 12px; color: #777; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
            ${t.footer}
          </p>
        </div>
      `;
  }
}

/**
 * Envoie un email en utilisant Nodemailer avec SMTP
 * @param options Options pour l'envoi de l'email
 * @returns Résultat de l'envoi
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, templateName, data, locale = 'fr' } = options;

  try {
    // Générer le sujet de l'email selon le template et la langue
    let subject = 'EcoDeli';
    if (templateName === 'verification') {
      subject =
        locale === 'fr' ? 'Vérification de votre compte EcoDeli' : 'Verify your EcoDeli account';
    } else if (templateName === 'reset-password') {
      subject =
        locale === 'fr'
          ? 'Réinitialisation de votre mot de passe EcoDeli'
          : 'Reset your EcoDeli password';
    } else if (templateName === 'welcome') {
      subject = locale === 'fr' ? 'Bienvenue sur EcoDeli' : 'Welcome to EcoDeli';
    }

    // Générer le contenu HTML de l'email
    const html = generateEmailTemplate(templateName, data, locale);

    // En développement, log au lieu d'envoyer si les emails ne sont pas activés
    if (!emailConfig.enabled) {
      console.log(`===== SIMULATION D'ENVOI D'EMAIL =====`);
      console.log(`À: ${to}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Template: ${templateName}`);
      console.log(`Données:`, data);
      console.log(`HTML généré:`, html.substring(0, 500) + '...');
      console.log(`===== FIN DE LA SIMULATION =====`);
      return true;
    }

    // Obtenir le transporteur email
    const transporter = getEmailTransporter();

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: emailConfig.sender,
      to,
      subject,
      html,
    });

    console.log(`Email envoyé à ${to} avec l'ID:`, info.messageId);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return false;
  }
}

/**
 * Envoie un email de notification administrative avec un sujet personnalisé
 * @param options Options pour l'envoi de l'email de notification
 * @returns Résultat de l'envoi
 */
export async function sendEmailNotification(options: SendNotificationOptions): Promise<boolean> {
  const { to, subject, templateName, data, locale = 'fr' } = options;

  try {
    // Générer le contenu HTML de l'email
    const html = generateEmailTemplate(templateName, data, locale);

    // En développement, log au lieu d'envoyer si les emails ne sont pas activés
    if (!emailConfig.enabled) {
      console.log(`===== SIMULATION D'ENVOI DE NOTIFICATION =====`);
      console.log(`À: ${to}`);
      console.log(`Sujet: ${subject}`);
      console.log(`Données:`, data);
      console.log(`HTML généré:`, html.substring(0, 500) + '...');
      console.log(`===== FIN DE LA SIMULATION =====`);
      return true;
    }

    // Obtenir le transporteur email
    const transporter = getEmailTransporter();

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: emailConfig.sender,
      to,
      subject,
      html,
    });

    console.log(`Notification envoyée à ${to} avec l'ID:`, info.messageId);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
    return false;
  }
}

/**
 * Envoie un email de vérification à un utilisateur
 * @param to Adresse email du destinataire
 * @param name Nom de l'utilisateur
 * @param token Token de vérification
 * @param locale Langue de l'utilisateur
 * @returns true si l'email a été envoyé avec succès
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  locale: SupportedLanguage = 'fr'
): Promise<boolean> {
  const verificationUrl = `${emailConfig.baseUrl}/${locale}/verify-email?token=${token}`;

  return sendEmail({
    to,
    templateName: 'verification',
    data: { name, verificationUrl },
    locale,
  });
}

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param to Adresse email du destinataire
 * @param name Nom de l'utilisateur
 * @param locale Langue de l'utilisateur
 * @returns true si l'email a été envoyé avec succès
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  locale: SupportedLanguage = 'fr'
): Promise<boolean> {
  return sendEmail({
    to,
    templateName: 'welcome',
    data: { name },
    locale,
  });
}

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param to Adresse email du destinataire
 * @param name Nom de l'utilisateur
 * @param token Token de réinitialisation
 * @param locale Langue de l'utilisateur
 * @returns true si l'email a été envoyé avec succès
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  locale: SupportedLanguage = 'fr'
): Promise<boolean> {
  const resetUrl = `${emailConfig.baseUrl}/${locale}/reset-password?token=${token}`;

  return sendEmail({
    to,
    templateName: 'reset-password',
    data: { name, resetUrl },
    locale,
  });
}
