import { DocumentType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import FormData from "form-data";
import Mailgun from "mailgun.js";

// Types pour les templates d'emails
type EmailTemplate = {
  to: string;
  subject: string;
  html: string;
};

// Type temporaire pour les locales
type SupportedLanguage = "fr" | "en" | "es" | "de" | "it";

// Fonctions utilitaires pour générer les templates d'emails
const generateVerificationEmailTemplate = (
  email: string, 
  token: string, 
  name: string,
  locale: SupportedLanguage = "fr"
): EmailTemplate => {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;
  
  const templates = {
    fr: {
      subject: "Vérifiez votre compte EcoDeli",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vérification de compte</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">EcoDeli</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Vérification de compte</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #2563eb; margin-top: 0;">Bonjour ${name},</h2>
      <p>Merci de vous être inscrit sur EcoDeli ! Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Vérifier mon compte
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">Ce lien expire dans 24 heures pour des raisons de sécurité.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} EcoDeli - Plateforme de livraison écologique</p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: "Verify your EcoDeli account",
      html: `<!-- English template similar structure */`
    }
  };
  
  return {
    to: email,
    ...templates[locale] || templates.fr
  };
};

const generatePasswordResetEmailTemplate = (
  email: string,
  name: string,
  token: string,
  locale: SupportedLanguage = "fr"
): EmailTemplate => {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  
  return {
    to: email,
    subject: "Réinitialisation de votre mot de passe EcoDeli",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Réinitialisation mot de passe</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">EcoDeli</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Réinitialisation mot de passe</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #dc2626; margin-top: 0;">Bonjour ${name},</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      <p style="color: #666; font-size: 14px; margin-top: 30px;">Ce lien expire dans 1 heure pour des raisons de sécurité.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} EcoDeli - Plateforme de livraison écologique</p>
    </div>
  </div>
</body>
</html>`
  };
};

const generateWelcomeEmailTemplate = (
  email: string, 
  name: string,
  locale: SupportedLanguage = "fr"
): EmailTemplate => {
  return {
    to: email,
    subject: "Bienvenue sur EcoDeli !",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bienvenue sur EcoDeli</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">🌱 EcoDeli</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Bienvenue dans la communauté</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #059669; margin-top: 0;">Bienvenue ${name} !</h2>
      <p>Merci de rejoindre EcoDeli, la plateforme de livraison éco-responsable !</p>
      <p>Votre compte est maintenant activé et vous pouvez profiter de toutes nos fonctionnalités :</p>
      <ul style="color: #374151; line-height: 1.6;">
        <li>🚚 Livraisons écologiques par des livreurs locaux</li>
        <li>📦 Stockage temporaire sécurisé</li>
        <li>💚 Services éco-responsables</li>
        <li>📱 Suivi en temps réel de vos commandes</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display: inline-block; background-color: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Accéder à mon compte
        </a>
      </div>
      <p>Ensemble, construisons un avenir plus durable ! 🌍</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} EcoDeli - Plateforme de livraison écologique</p>
    </div>
  </div>
</body>
</html>`
  };
};

/**
 * Service pour l'envoi d'emails avec Mailgun
 */
export class EmailService {
  private fromEmail: string;
  private appUrl: string;
  private mailgun: any;
  private domain: string;

  constructor() {
    this.fromEmail = process.env.MAILGUN_FROM_EMAIL || "noreply@ecodeli.me";
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.domain = process.env.MAILGUN_DOMAIN || "";

    // Initialisation de Mailgun avec les vraies clés du .env
    const mailgun = new Mailgun(FormData);
    this.mailgun = mailgun.client({ 
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
      url: process.env.MAILGUN_DOMAIN?.includes('eu') ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
    });

    if (process.env.MAILGUN_API_KEY) {
      console.log("✅ Service Email Mailgun initialisé");
    } else {
      console.warn("⚠️ Mailgun non configuré - les emails seront simulés");
    }
  }

  /**
   * Envoie un email avec Mailgun
   * @private
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
      console.warn(`[EMAIL SERVICE] Configuration Mailgun manquante - Email non envoyé`);
      console.warn(`[EMAIL SERVICE] Destinataire: ${to}, Sujet: ${subject}`);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Service email non configuré - vérifiez les variables d'environnement MAILGUN_API_KEY et MAILGUN_DOMAIN" 
      });
    }

    try {
      const response = await this.mailgun.messages.create(this.domain, {
        from: this.fromEmail,
        to: [to],
        subject: subject,
        html: html,
        'o:tracking': true,
        'o:tracking-clicks': true,
        'o:tracking-opens': true
      });
      
      console.log(`✅ Email envoyé avec succès à ${to} (ID: ${response.id})`);
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi d'email Mailgun:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi d'email" 
      });
    }
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    locale: any = "fr",
  ): Promise<void> {
    const template = generateWelcomeEmailTemplate(email, name, locale);
    await this.sendEmail(template.to, template.subject, template.html);
  }

  /**
   * Envoie un email de vérification
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    locale: any = "fr",
  ): Promise<void> {
    // Utilise la méthode de la librairie d'email pour assurer la cohérence
    // entre le token généré et le lien de vérification
    const userName = await this.getUserNameByEmail(email);
    const template = generateVerificationEmailTemplate(
      email,
      token,
      userName || "Utilisateur",
      locale,
    );
    await this.sendEmail(template.to, template.subject, template.html);
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    locale: any = "fr",
  ): Promise<void> {
    const userName = await this.getUserNameByEmail(email);
    const template = generatePasswordResetEmailTemplate(
      email,
      userName || "Utilisateur",
      token,
      locale,
    );
    await this.sendEmail(template.to, template.subject, template.html);
  }

  /**
   * Récupère le nom d'utilisateur à partir de son email
   * @private
   */
  private async getUserNameByEmail(email: string): Promise<string | null> {
    try {
      const { db } = await import("@/server/db");
      const user = await db.user.findUnique({
        where: { email },
        select: { name: true }
      });
      
      return user?.name || null;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du nom d'utilisateur:",
        error,
      );
      return null;
    }
  }

  /**
   * Envoie un email de notification après vérification d'email réussie
   */
  async sendAccountActivationNotification(
    email: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const loginUrl = `${this.appUrl}/login`;

    const subject = "Votre compte est activé - EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Compte activé avec succès</h1>
        <p>Votre adresse email a été vérifiée et votre compte est maintenant actif.</p>
        <p>Vous pouvez dès à présent vous connecter et profiter de toutes les fonctionnalités d'EcoDeli.</p>
        <a href="${loginUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Se connecter
        </a>
        <p>Merci de votre confiance et bienvenue dans la communauté EcoDeli !</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie un email de bienvenue spécifique aux clients
   */
  async sendClientWelcomeEmail(
    email: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const subject = "Bienvenue chez EcoDeli !";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Bienvenue chez EcoDeli !</h1>
        <p>Votre compte client est désormais actif.</p>
        <p>Vous pouvez maintenant explorer nos services, effectuer des commandes et suivre vos livraisons.</p>
        <p>Merci d'avoir choisi EcoDeli pour vos livraisons éco-responsables !</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie des instructions pour la vérification des livreurs
   */
  async sendDelivererVerificationInstructions(
    email: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const subject = "Prochaines étapes pour devenir livreur EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Finalisez votre inscription comme livreur</h1>
        <p>Merci d'avoir vérifié votre email. Pour finaliser votre inscription, vous devez maintenant soumettre les documents suivants :</p>
        <ul>
          <li>Permis de conduire valide</li>
          <li>Preuve d'assurance</li>
          <li>Justificatif d'identité</li>
          <li>Photo de votre véhicule</li>
        </ul>
        <p>Connectez-vous à votre tableau de bord pour télécharger ces documents :</p>
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Accéder à mon tableau de bord
        </a>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie des instructions pour le contrat des commerçants
   */
  async sendMerchantContractInstructions(
    email: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const subject = "Finalisez votre inscription comme commerçant EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Finalisez votre inscription comme commerçant</h1>
        <p>Merci d'avoir vérifié votre email. Pour finaliser votre inscription, vous devez maintenant :</p>
        <ul>
          <li>Compléter les informations de votre commerce</li>
          <li>Télécharger un extrait K-BIS ou équivalent</li>
          <li>Accepter les conditions du contrat EcoDeli</li>
        </ul>
        <p>Connectez-vous à votre tableau de bord pour compléter ces étapes :</p>
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Accéder à mon tableau de bord
        </a>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie des instructions pour la vérification des prestataires
   */
  async sendProviderVerificationInstructions(
    email: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const dashboardUrl = `${this.appUrl}/dashboard`;

    const subject = "Finalisez votre inscription comme prestataire EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Finalisez votre inscription comme prestataire</h1>
        <p>Merci d'avoir vérifié votre email. Pour finaliser votre inscription, vous devez maintenant :</p>
        <ul>
          <li>Compléter votre profil professionnel</li>
          <li>Télécharger vos qualifications et certifications</li>
          <li>Définir vos disponibilités et tarifs</li>
        </ul>
        <p>Connectez-vous à votre tableau de bord pour compléter ces étapes :</p>
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">
          Accéder à mon tableau de bord
        </a>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie un email de notification d'approbation de document
   */
  async sendDocumentApprovedEmail(
    email: string,
    name: string,
    documentType: DocumentType,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const subject = "Document approuvé - EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Document approuvé</h1>
        <p>Bonjour ${name},</p>
        <p>Nous avons le plaisir de vous informer que votre ${documentType} a été vérifié et approuvé.</p>
        <p>Vous pouvez continuer le processus d'inscription dans votre tableau de bord.</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie un email de notification de rejet de document
   */
  async sendDocumentRejectedEmail(
    email: string,
    name: string,
    documentType: DocumentType,
    reason: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const subject = "Document rejeté - EcoDeli";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3B82F6;">Document rejeté</h1>
        <p>Bonjour ${name},</p>
        <p>Nous regrettons de vous informer que votre ${documentType} a été rejeté pour la raison suivante :</p>
        <p style="background-color: #F9FAFB; padding: 10px; border-left: 4px solid #EF4444;">${reason}</p>
        <p>Veuillez corriger le problème et soumettre à nouveau votre document dans votre tableau de bord.</p>
      </div>
    `;

    await this.sendEmail(email, subject, html);
  }

  /**
   * Envoie un email de facture au client
   */
  async sendInvoiceEmail(
    email: string,
    name: string,
    invoiceNumber: string,
    totalAmount: number,
    invoiceId: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const invoiceUrl = `${this.appUrl}/invoices/${invoiceId}`;
    const subject = `Facture ${invoiceNumber} - EcoDeli`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Facture EcoDeli</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center;">
      <h1 style="margin: 0; font-size: 28px;">📄 EcoDeli</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Facture</p>
    </div>
    <div style="padding: 30px;">
      <h2 style="color: #3b82f6; margin-top: 0;">Bonjour ${name},</h2>
      <p>Vous avez reçu une nouvelle facture de la part d'EcoDeli.</p>
      
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0; color: #666; font-size: 14px;">Numéro de facture</p>
        <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #1e293b;">${invoiceNumber}</p>
        
        <p style="margin: 0; color: #666; font-size: 14px;">Montant total</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #059669;">${totalAmount.toFixed(2)} €</p>
      </div>
      
      <p>Vous pouvez consulter et télécharger votre facture en ligne :</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${invoiceUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Voir ma facture
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">Si vous avez des questions concernant cette facture, n'hésitez pas à nous contacter.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 0;">© ${new Date().getFullYear()} EcoDeli - Plateforme de livraison écologique</p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail(email, subject, html);
  }
}
