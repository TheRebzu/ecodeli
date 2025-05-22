import { SupportedLanguage } from './user-locale';

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
 * Envoie un email en utilisant un template
 * @param options Options pour l'envoi de l'email
 * @returns Résultat de l'envoi
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, templateName, data, locale = 'fr' } = options;

  // TODO: Implémenter l'envoi réel des emails
  // Cette fonction est un placeholder pour le moment
  console.log(`Email envoyé à ${to} avec template ${templateName}`, { data, locale });

  return true;
}

/**
 * Envoie un email de notification administrative avec un sujet personnalisé
 * @param options Options pour l'envoi de l'email de notification
 * @returns Résultat de l'envoi
 */
export async function sendEmailNotification(options: SendNotificationOptions): Promise<boolean> {
  const { to, subject, data, locale = 'fr' } = options;

  // Construire un template simple pour les notifications
  const title = locale === 'fr' ? 'Notification EcoDeli' : 'EcoDeli Notification';

  // Créer un message basique
  let messageContent = '';
  if (typeof data === 'string') {
    messageContent = data;
  } else if (data.name && data.status) {
    messageContent =
      locale === 'fr'
        ? `Bonjour ${data.name}, votre statut a été modifié en "${data.status}".`
        : `Hello ${data.name}, your status has been updated to "${data.status}".`;
  } else {
    messageContent =
      locale === 'fr'
        ? 'Une mise à jour a été effectuée sur votre compte.'
        : 'An update has been made to your account.';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>${title}</h1>
      <p>${messageContent}</p>
    </div>
  `;

  // TODO: Implémenter l'envoi réel des emails avec sujet personnalisé
  console.log(`Notification envoyée à ${to} avec sujet "${subject}"`, { data, locale, html });

  return true;
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
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/verify-email?token=${token}`;

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
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password?token=${token}`;

  return sendEmail({
    to,
    templateName: 'reset-password',
    data: { name, resetUrl },
    locale,
  });
}
