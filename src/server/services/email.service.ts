import { EmailService as EmailServiceInterface } from '@/types/email';
import nodemailer from 'nodemailer';
import { DocumentType } from '../db/enums';
import { TRPCError } from "@trpc/server";

/**
 * Service de gestion des emails
 * Gère l'envoi de tous les types d'emails de l'application
 */
export class EmailService implements EmailServiceInterface {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private frontendUrl: string;

  constructor() {
    // Configuration du transporteur SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: process.env.EMAIL_SERVER_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ecodeli.me';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Envoie un email de bienvenue à un nouvel utilisateur
   */
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Bienvenue sur EcoDeli',
      html: `
        <h1>Bienvenue ${name} !</h1>
        <p>Merci de vous être inscrit sur EcoDeli.</p>
        <p>Nous sommes ravis de vous compter parmi notre communauté.</p>
      `,
    });
  }

  /**
   * Envoie un email de vérification pour confirmer l'adresse email
   */
  async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Vérifiez votre adresse email - EcoDeli',
      html: `
        <h1>Vérification de votre adresse email</h1>
        <p>Merci de vous être inscrit sur EcoDeli.</p>
        <p>Pour vérifier votre adresse email, veuillez cliquer sur le lien ci-dessous :</p>
        <p><a href="${verificationUrl}">Vérifier mon email</a></p>
        <p>Ce lien est valable pendant 24 heures.</p>
      `,
    });
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Réinitialisation de mot de passe - EcoDeli',
      html: `
        <h1>Réinitialisation de votre mot de passe</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le lien ci-dessous :</p>
        <p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien est valable pendant 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>
      `,
    });
  }

  /**
   * Envoie une notification d'approbation de document
   */
  async sendDocumentApprovedEmail(email: string, documentName: string, documentType: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Document approuvé - EcoDeli',
      html: `
        <h1>Document approuvé</h1>
        <p>Votre document <strong>${documentName}</strong> (${documentType}) a été approuvé.</p>
        <p>Vous pouvez désormais accéder à toutes les fonctionnalités de votre compte.</p>
      `,
    });
  }

  /**
   * Envoie une notification de rejet de document
   */
  async sendDocumentRejectedEmail(email: string, documentName: string, documentType: string, reason: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Document rejeté - EcoDeli',
      html: `
        <h1>Document rejeté</h1>
        <p>Votre document <strong>${documentName}</strong> (${documentType}) a été rejeté pour la raison suivante :</p>
        <p><em>${reason}</em></p>
        <p>Veuillez télécharger un nouveau document pour continuer le processus de vérification.</p>
      `,
    });
  }

  /**
   * Méthode privée pour envoyer un email
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      ...options,
      text: options.text || options.html.replace(/<[^>]*>/g, '')
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erreur lors de l'envoi de l'email",
      });
    }
  }

  private getDocumentTypeName(type: DocumentType): string {
    const documentTypeNames: Record<DocumentType, string> = {
      [DocumentType.ID_CARD]: "Carte d'identité",
      [DocumentType.DRIVER_LICENSE]: "Permis de conduire",
      [DocumentType.VEHICLE_REGISTRATION]: "Carte grise",
      [DocumentType.INSURANCE]: "Attestation d'assurance",
      [DocumentType.CRIMINAL_RECORD]: "Casier judiciaire",
      [DocumentType.PROFESSIONAL_CERTIFICATION]: "Certification professionnelle",
      [DocumentType.OTHER]: "Autre document"
    };
    
    return documentTypeNames[type] || "Document";
  }

  /**
   * Envoie une confirmation de livraison
   */
  async sendDeliveryConfirmation(to: string, deliveryId: string): Promise<void> {
    const trackingUrl = `${this.frontendUrl}/deliveries/${deliveryId}`;
    
    await this.sendEmail({
      to,
      subject: 'Confirmation de livraison - EcoDeli',
      html: `
        <h1>Confirmation de livraison</h1>
        <p>Votre livraison a été confirmée.</p>
        <p>Numéro de livraison: <strong>${deliveryId}</strong></p>
        <p>Vous pouvez suivre l'état de votre livraison en cliquant sur le lien ci-dessous :</p>
        <p><a href="${trackingUrl}">Suivre ma livraison</a></p>
      `,
    });
  }

  /**
   * Envoie une facture par email
   */
  async sendInvoiceEmail(to: string, invoiceId: string, pdfBuffer: Buffer): Promise<void> {
    await this.sendEmail({
      to,
      subject: `Facture ${invoiceId} - EcoDeli`,
      html: `
        <h1>Votre facture EcoDeli</h1>
        <p>Veuillez trouver ci-joint votre facture <strong>${invoiceId}</strong>.</p>
        <p>Vous pouvez également consulter vos factures à tout moment dans votre espace personnel.</p>
      `,
      text: `Votre facture EcoDeli\n\nVeuillez trouver ci-joint votre facture ${invoiceId}.\nVous pouvez également consulter vos factures à tout moment dans votre espace personnel.`,
      attachments: [
        {
          filename: `facture-${invoiceId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }

  /**
   * Envoie un email de notification pour la vérification d'un document
   */
  async sendDocumentVerificationNotification(
    email: string,
    documentType: string,
    status: "APPROVED" | "REJECTED",
    notes?: string
  ): Promise<void> {
    const statusText = status === "APPROVED" ? "approuvé" : "rejeté";
    const statusColor = status === "APPROVED" ? "#22C55E" : "#EF4444";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Notification de vérification de document</h1>
        <p>Votre document <strong>${documentType}</strong> a été <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
        ${notes ? `<p><strong>Notes :</strong> ${notes}</p>` : ""}
        <p>
          <a 
            href="${process.env.NEXT_PUBLIC_APP_URL}/documents" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            Voir mes documents
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: `Document ${statusText} - EcoDeli`,
      html,
    });
  }

  /**
   * Envoie un email de notification pour l'activation du compte
   */
  async sendAccountActivationNotification(email: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Votre compte est maintenant actif !</h1>
        <p>Félicitations ! Votre compte EcoDeli a été vérifié et est maintenant actif.</p>
        <p>Vous pouvez maintenant vous connecter et commencer à utiliser la plateforme.</p>
        <p>
          <a 
            href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            Se connecter
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: "Votre compte est activé - EcoDeli",
      html,
    });
  }
}