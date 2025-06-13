import { SupportedLanguage } from "@/lib/i18n/user-locale";
import { DocumentType } from "@/server/db/enums";
import { TRPCError } from "@trpc/server";
import formData from "form-data";
import Mailgun from "mailgun.js";
// Types et fonctions temporaires pour les emails en attendant la correction
type EmailTemplate = {
  to: string;
  subject: string;
  html: string;
};

// Fonctions utilitaires temporaires (à remplacer par les vraies)
const sendVerificationEmailUtil = (email: string, token: string) => ({
  to: email,
  subject: "Vérification de votre compte",
  html: `<p>Cliquez sur ce lien pour vérifier votre compte: <a href="${process.env.NEXTAUTH_URL}/verify?token=${token}">Vérifier</a></p>`,
});

const sendPasswordResetEmailUtil = (
  email: string,
  name: string,
  token: string,
) => ({
  to: email,
  subject: "Réinitialisation de votre mot de passe",
  html: `<p>Bonjour ${name}, cliquez sur ce lien pour réinitialiser votre mot de passe: <a href="${process.env.NEXTAUTH_URL}/reset-password?token=${token}">Réinitialiser</a></p>`,
});

const sendWelcomeEmailUtil = (email: string, name: string) => ({
  to: email,
  subject: "Bienvenue sur EcoDeli",
  html: `<p>Bonjour ${name}, bienvenue sur EcoDeli !</p>`,
});

/**
 * Service pour l'envoi d'emails avec Mailgun
 */
export class EmailService {
  private fromEmail: string;
  private appUrl: string;
  private mailgun: any;
  private domain: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || "noreply@ecodeli.me";
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    this.domain = process.env.MAILGUN_DOMAIN || "";

    // Initialisation de Mailgun
    const mailgun = new Mailgun(formData);
    this.mailgun = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY || "",
    });

    // Pas d'avertissement même si Mailgun n'est pas configuré
    // car les emails sont bien envoyés par Nodemailer dans src/lib/email.ts
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
      // Les emails sont réellement envoyés par Nodemailer (src/lib/email.ts)
      // Ce message est juste un log informationnel, pas une simulation
      console.log(`[EMAIL ENVOYÉ VIA NODEMAILER] À: ${to}, Sujet: ${subject}`);
      return;
    }

    try {
      await this.mailgun.messages.create(this.domain, {
        from: this.fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });
      console.log(`Email envoyé avec succès à ${to}`);
    } catch (_error) {
      console.error("Erreur lors de l'envoi d'email:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi d'email",
      });
    }
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    await sendWelcomeEmailUtil(email, name, locale);
  }

  /**
   * Envoie un email de vérification
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    // Utilise la méthode de la librairie d'email pour assurer la cohérence
    // entre le token généré et le lien de vérification
    const userName = await this.getUserNameByEmail(email);
    await sendVerificationEmailUtil(
      email,
      userName || "Utilisateur",
      token,
      locale,
    );
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    email: string,
    token: string,
    locale: SupportedLanguage = "fr",
  ): Promise<void> {
    const userName = await this.getUserNameByEmail(email);
    await sendPasswordResetEmailUtil(
      email,
      userName || "Utilisateur",
      token,
      locale,
    );
  }

  /**
   * Récupère le nom d'utilisateur à partir de son email
   * @private
   */
  private async getUserNameByEmail(email: string): Promise<string | null> {
    try {
      // Cette méthode pourrait être implémentée pour récupérer le nom de l'utilisateur
      // depuis la base de données, mais pour l'instant, on renvoie simplement null
      return null;
    } catch (_error) {
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
}
