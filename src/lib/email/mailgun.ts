import formData from 'form-data';
import Mailgun from 'mailgun.js';
import type { MessagesSendResult } from 'mailgun.js/interfaces/Messages';

/**
 * Configuration du service Mailgun
 */
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

const domain = process.env.MAILGUN_DOMAIN || '';
const fromEmail = process.env.MAILGUN_FROM_ADDRESS || 'noreply@ecodeli.me';
const fromName = process.env.MAILGUN_FROM_NAME || 'EcoDeli';

/**
 * Interface de base pour tous les emails
 */
interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateVars?: Record<string, any>;
  attachments?: {
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  template?: string;
  tags?: string[];
}

/**
 * Classe EmailService pour gérer l'envoi d'emails via Mailgun
 */
export class EmailService {
  /**
   * Envoie un email en utilisant Mailgun
   */
  static async sendEmail({
    to,
    subject,
    text,
    html,
    templateVars,
    attachments,
    cc,
    bcc,
    replyTo,
    template,
    tags,
  }: EmailOptions): Promise<MessagesSendResult> {
    try {
      // Vérification des configurations requises
      if (!domain) {
        throw new Error('MAILGUN_DOMAIN is not set in environment variables');
      }

      // Création du message de base
      const messageData = {
        from: `${fromName} <${fromEmail}>`,
        to,
        subject,
        text,
        html,
        cc,
        bcc,
        'h:Reply-To': replyTo,
        template,
        'v:': templateVars,
        'o:tag': tags,
      };

      // Filtrer les champs undefined
      const filteredMessageData = Object.entries(messageData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          if (key === 'v:' && value) {
            // Gérer les variables de template
            Object.entries(value).forEach(([varKey, varValue]) => {
              acc[`v:${varKey}`] = varValue;
            });
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as Record<string, any>);

      // Ajouter les pièces jointes si elles existent
      if (attachments && attachments.length > 0) {
        filteredMessageData.attachment = attachments.map((attachment) => ({
          filename: attachment.filename,
          data: attachment.data,
          contentType: attachment.contentType,
        }));
      }

      // Envoi de l'email via Mailgun
      const result = await mg.messages.create(domain, filteredMessageData);
      console.log(`Email sent successfully to ${to}`, { id: result.id });
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Envoie un email de bienvenue après l'inscription
   */
  static async sendWelcomeEmail(to: string, firstName: string, verificationLink: string): Promise<MessagesSendResult> {
    const subject = 'Bienvenue sur EcoDeli - Confirmez votre adresse email';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenue sur EcoDeli</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .container { 
              background-color: #f9f9f9; 
              border-radius: 8px; 
              padding: 30px; 
              border: 1px solid #eee; 
            }
            .button {
              display: inline-block;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              padding: 12px 20px;
              border-radius: 4px;
              font-weight: bold;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>Bonjour ${firstName} !</h2>
            <p>Nous sommes ravis de vous accueillir sur EcoDeli, la solution de livraison collaborative et de services à la personne.</p>
            <p>Pour finaliser votre inscription et accéder à tous nos services, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Confirmer mon email</a>
            </div>
            
            <p>Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur EcoDeli, veuillez ignorer cet email.</p>
            
            <p>Pour toute question, n'hésitez pas à contacter notre équipe de support à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Bonjour ${firstName} !
      
      Nous sommes ravis de vous accueillir sur EcoDeli, la solution de livraison collaborative et de services à la personne.
      
      Pour finaliser votre inscription et accéder à tous nos services, veuillez confirmer votre adresse email en cliquant sur le lien ci-dessous :
      
      ${verificationLink}
      
      Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur EcoDeli, veuillez ignorer cet email.
      
      Pour toute question, n'hésitez pas à contacter notre équipe de support à support@ecodeli.me.
      
      © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      110, rue de Flandre, 75019 Paris, France
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: ['welcome', 'signup', 'verification']
    });
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  static async sendPasswordResetEmail(to: string, firstName: string, resetLink: string): Promise<MessagesSendResult> {
    const subject = 'EcoDeli - Réinitialisation de votre mot de passe';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de votre mot de passe</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .container { 
              background-color: #f9f9f9; 
              border-radius: 8px; 
              padding: 30px; 
              border: 1px solid #eee; 
            }
            .button {
              display: inline-block;
              background-color: #2196F3;
              color: white;
              text-decoration: none;
              padding: 12px 20px;
              border-radius: 4px;
              font-weight: bold;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
            .warning {
              color: #e74c3c;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>Bonjour ${firstName}</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe sur EcoDeli.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Ce lien expirera dans 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email ou contacter notre support.</p>
            
            <p class="warning">Si vous n'êtes pas à l'origine de cette demande, nous vous conseillons de sécuriser votre compte immédiatement.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Bonjour ${firstName},
      
      Vous avez demandé la réinitialisation de votre mot de passe sur EcoDeli.
      
      Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :
      
      ${resetLink}
      
      Ce lien expirera dans 1 heure. Si vous n'avez pas demandé de réinitialisation de mot de passe, veuillez ignorer cet email ou contacter notre support.
      
      ATTENTION : Si vous n'êtes pas à l'origine de cette demande, nous vous conseillons de sécuriser votre compte immédiatement.
      
      © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      110, rue de Flandre, 75019 Paris, France
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: ['password-reset', 'security']
    });
  }

  /**
   * Envoie un email de confirmation d'une action importante (changement de profil, etc.)
   */
  static async sendActionConfirmationEmail(
    to: string,
    firstName: string,
    action: string,
    details?: string
  ): Promise<MessagesSendResult> {
    const subject = `EcoDeli - Confirmation de votre ${action}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmation de votre ${action}</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .container { 
              background-color: #f9f9f9; 
              border-radius: 8px; 
              padding: 30px; 
              border: 1px solid #eee; 
            }
            .success-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .details {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>Bonjour ${firstName}</h2>
            <p>Nous confirmons que votre ${action} a bien été effectué${action.endsWith('e') ? 'e' : ''} sur votre compte EcoDeli.</p>
            
            <div class="success-icon">✅</div>
            
            ${details ? `<div class="details">${details}</div>` : ''}
            
            <p>Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement notre support à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Bonjour ${firstName},
      
      Nous confirmons que votre ${action} a bien été effectué${action.endsWith('e') ? 'e' : ''} sur votre compte EcoDeli.
      
      ${details ? `Détails: ${details}` : ''}
      
      Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement notre support à support@ecodeli.me.
      
      © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      110, rue de Flandre, 75019 Paris, France
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: ['confirmation', action.replace(' ', '-')]
    });
  }

  /**
   * Envoie un email de confirmation de livraison
   */
  static async sendDeliveryNotificationEmail(
    to: string,
    firstName: string,
    deliveryInfo: {
      id: string;
      trackingCode?: string;
      status: string;
      estimatedDelivery?: string;
      origin: string;
      destination: string;
      details?: string;
      trackingLink?: string;
    }
  ): Promise<MessagesSendResult> {
    const subject = `EcoDeli - Mise à jour de votre livraison #${deliveryInfo.id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mise à jour de votre livraison</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .container { 
              background-color: #f9f9f9; 
              border-radius: 8px; 
              padding: 30px; 
              border: 1px solid #eee; 
            }
            .delivery-info {
              background-color: #f0f0f0;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
            }
            .status {
              font-weight: bold;
              color: #2196F3;
            }
            .button {
              display: inline-block;
              background-color: #2196F3;
              color: white;
              text-decoration: none;
              padding: 12px 20px;
              border-radius: 4px;
              font-weight: bold;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>Bonjour ${firstName}</h2>
            <p>Votre livraison ${deliveryInfo.trackingCode ? `avec le code de suivi <strong>${deliveryInfo.trackingCode}</strong>` : `#${deliveryInfo.id}`} a été mise à jour.</p>
            
            <div class="delivery-info">
              <p><strong>Statut:</strong> <span class="status">${deliveryInfo.status}</span></p>
              ${deliveryInfo.estimatedDelivery ? `<p><strong>Livraison estimée:</strong> ${deliveryInfo.estimatedDelivery}</p>` : ''}
              <p><strong>Origine:</strong> ${deliveryInfo.origin}</p>
              <p><strong>Destination:</strong> ${deliveryInfo.destination}</p>
              ${deliveryInfo.details ? `<p><strong>Détails:</strong> ${deliveryInfo.details}</p>` : ''}
            </div>
            
            ${deliveryInfo.trackingLink ? `
              <div style="text-align: center;">
                <a href="${deliveryInfo.trackingLink}" class="button">Suivre ma livraison</a>
              </div>
            ` : ''}
            
            <p>Pour toute question concernant votre livraison, n'hésitez pas à contacter notre service client.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Bonjour ${firstName},
      
      Votre livraison ${deliveryInfo.trackingCode ? `avec le code de suivi ${deliveryInfo.trackingCode}` : `#${deliveryInfo.id}`} a été mise à jour.
      
      Statut: ${deliveryInfo.status}
      ${deliveryInfo.estimatedDelivery ? `Livraison estimée: ${deliveryInfo.estimatedDelivery}` : ''}
      Origine: ${deliveryInfo.origin}
      Destination: ${deliveryInfo.destination}
      ${deliveryInfo.details ? `Détails: ${deliveryInfo.details}` : ''}
      
      ${deliveryInfo.trackingLink ? `Suivre ma livraison: ${deliveryInfo.trackingLink}` : ''}
      
      Pour toute question concernant votre livraison, n'hésitez pas à contacter notre service client.
      
      © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      110, rue de Flandre, 75019 Paris, France
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: ['delivery', 'notification', deliveryInfo.status.toLowerCase().replace(' ', '-')]
    });
  }

  /**
   * Envoie un email d'alerte de sécurité
   */
  static async sendSecurityAlertEmail(
    to: string,
    firstName: string,
    alertInfo: {
      type: string;
      details: string;
      time: string;
      location?: string;
      device?: string;
      ip?: string;
      actionLink?: string;
      actionText?: string;
    }
  ): Promise<MessagesSendResult> {
    const subject = `EcoDeli - Alerte de sécurité importante`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Alerte de sécurité</title>
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .logo { 
              text-align: center; 
              margin-bottom: 20px; 
            }
            .container { 
              background-color: #f9f9f9; 
              border-radius: 8px; 
              padding: 30px; 
              border: 1px solid #eee; 
            }
            .alert-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
              color: #e74c3c;
            }
            .alert-info {
              background-color: #ffecec;
              padding: 15px;
              border-radius: 4px;
              margin: 15px 0;
              border-left: 4px solid #e74c3c;
            }
            .button {
              display: inline-block;
              background-color: #e74c3c;
              color: white;
              text-decoration: none;
              padding: 12px 20px;
              border-radius: 4px;
              font-weight: bold;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              font-size: 12px; 
              color: #777; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="logo">
            <h1>EcoDeli</h1>
          </div>
          <div class="container">
            <h2>Bonjour ${firstName}</h2>
            <p>Nous avons détecté une activité inhabituelle sur votre compte EcoDeli.</p>
            
            <div class="alert-icon">⚠️</div>
            
            <div class="alert-info">
              <p><strong>Type d'alerte:</strong> ${alertInfo.type}</p>
              <p><strong>Détails:</strong> ${alertInfo.details}</p>
              <p><strong>Date et heure:</strong> ${alertInfo.time}</p>
              ${alertInfo.location ? `<p><strong>Localisation:</strong> ${alertInfo.location}</p>` : ''}
              ${alertInfo.device ? `<p><strong>Appareil:</strong> ${alertInfo.device}</p>` : ''}
              ${alertInfo.ip ? `<p><strong>Adresse IP:</strong> ${alertInfo.ip}</p>` : ''}
            </div>
            
            ${alertInfo.actionLink && alertInfo.actionText ? `
              <div style="text-align: center;">
                <a href="${alertInfo.actionLink}" class="button">${alertInfo.actionText}</a>
              </div>
            ` : ''}
            
            <p>Si cette activité ne provient pas de vous, veuillez sécuriser votre compte immédiatement en modifiant votre mot de passe et en contactant notre équipe de support à <a href="mailto:support@ecodeli.me">support@ecodeli.me</a>.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} EcoDeli. Tous droits réservés.</p>
            <p>110, rue de Flandre, 75019 Paris, France</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Bonjour ${firstName},
      
      Nous avons détecté une activité inhabituelle sur votre compte EcoDeli.
      
      Type d'alerte: ${alertInfo.type}
      Détails: ${alertInfo.details}
      Date et heure: ${alertInfo.time}
      ${alertInfo.location ? `Localisation: ${alertInfo.location}` : ''}
      ${alertInfo.device ? `Appareil: ${alertInfo.device}` : ''}
      ${alertInfo.ip ? `Adresse IP: ${alertInfo.ip}` : ''}
      
      ${alertInfo.actionLink && alertInfo.actionText ? `${alertInfo.actionText}: ${alertInfo.actionLink}` : ''}
      
      Si cette activité ne provient pas de vous, veuillez sécuriser votre compte immédiatement en modifiant votre mot de passe et en contactant notre équipe de support à support@ecodeli.me.
      
      © ${new Date().getFullYear()} EcoDeli. Tous droits réservés.
      110, rue de Flandre, 75019 Paris, France
    `;

    return this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: ['security', 'alert', alertInfo.type.toLowerCase().replace(' ', '-')]
    });
  }
}