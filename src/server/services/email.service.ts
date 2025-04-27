import { EmailService as EmailServiceInterface } from '../../types/email';
import nodemailer from 'nodemailer';
import { DocumentType } from '../db/enums';
import { TRPCError } from '@trpc/server';
import {
  SupportedLanguage,
  UserRole,
  generateEmailHTML,
  welcomeEmailTemplates,
  roleSpecificWelcomeTemplates,
  verificationEmailTemplates,
  postVerificationInstructionsTemplates,
  passwordResetTemplates,
  documentApprovedTemplates,
  documentRejectedTemplates,
  verificationStatusChangedTemplates,
  documentReminderTemplates,
} from '../../emails/templates';

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
   * @param email Adresse email du destinataire
   * @param name Nom du destinataire
   * @param locale Langue de l'email
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const template = welcomeEmailTemplates[locale];
    const html = generateEmailHTML(template, { name });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie un email de bienvenue spécifique au rôle de l'utilisateur
   * @param email Adresse email du destinataire
   * @param name Nom du destinataire
   * @param role Rôle de l'utilisateur
   * @param locale Langue de l'email
   */
  async sendRoleSpecificWelcomeEmail(
    email: string,
    name: string,
    role: UserRole,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const template = roleSpecificWelcomeTemplates[role][locale];
    const html = generateEmailHTML(template, { name });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie un email de vérification pour confirmer l'adresse email
   * @param email Adresse email du destinataire
   * @param verificationToken Token de vérification
   * @param locale Langue de l'email
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/${locale}/verify-email?token=${verificationToken}`;
    const template = verificationEmailTemplates[locale];

    const html = generateEmailHTML(template, {
      customUrl: verificationUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie un email avec les instructions spécifiques au rôle après la vérification de l'email
   * @param email Adresse email du destinataire
   * @param name Nom du destinataire
   * @param role Rôle de l'utilisateur
   * @param locale Langue de l'email
   */
  async sendPostVerificationInstructions(
    email: string,
    name: string,
    role: UserRole,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const template = postVerificationInstructionsTemplates[role][locale];
    const html = generateEmailHTML(template, { name });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param email Adresse email du destinataire
   * @param resetToken Token de réinitialisation
   * @param locale Langue de l'email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/${locale}/reset-password?token=${resetToken}`;
    const template = passwordResetTemplates[locale];

    const html = generateEmailHTML(template, {
      customUrl: resetUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie une notification d'approbation de document
   * @param email Adresse email du destinataire
   * @param documentName Nom du document approuvé
   * @param documentType Type du document approuvé
   * @param locale Langue de l'email
   */
  async sendDocumentApprovedEmail(
    email: string,
    documentName: string,
    documentType: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const documentsUrl = `${this.frontendUrl}/${locale}/documents`;
    const template = documentApprovedTemplates[locale];

    const customMessage = `${template.message} Votre document <strong>${documentName}</strong> (${documentType}) a été approuvé.`;

    const html = generateEmailHTML(template, {
      customMessage,
      customUrl: documentsUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie une notification de rejet de document
   * @param email Adresse email du destinataire
   * @param documentName Nom du document rejeté
   * @param documentType Type du document rejeté
   * @param reason Raison du rejet
   * @param locale Langue de l'email
   */
  async sendDocumentRejectedEmail(
    email: string,
    documentName: string,
    documentType: string,
    reason: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const documentsUrl = `${this.frontendUrl}/${locale}/documents`;
    const template = documentRejectedTemplates[locale];

    const customMessage = `${template.message}<br/><br/><strong>${template.reasonLabel}</strong><br/><em>${reason}</em>`;

    const html = generateEmailHTML(template, {
      customMessage,
      customUrl: documentsUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie une notification de changement de statut de vérification
   * @param email Adresse email du destinataire
   * @param name Nom du destinataire
   * @param status Nouveau statut de vérification (PENDING, APPROVED, REJECTED)
   * @param details Détails supplémentaires (raison du rejet, etc.)
   * @param locale Langue de l'email
   */
  async sendVerificationStatusChangedEmail(
    email: string,
    name: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED',
    details: string = '',
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const templatesByStatus = verificationStatusChangedTemplates[locale];
    const template = templatesByStatus[status];

    let customMessage = template.message;
    if (status === 'REJECTED' && details) {
      customMessage += `<br/><br/><strong>${locale === 'fr' ? 'Détails :' : 'Details:'}</strong><br/><em>${details}</em>`;
    }

    const dashboardUrl = `${this.frontendUrl}/${locale}/dashboard`;
    const documentsUrl = `${this.frontendUrl}/${locale}/documents`;
    const customUrl = status === 'REJECTED' ? documentsUrl : dashboardUrl;

    const html = generateEmailHTML(template, {
      name,
      customMessage,
      customUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Envoie un rappel pour les documents manquants
   * @param email Adresse email du destinataire
   * @param name Nom du destinataire
   * @param missingDocuments Liste des documents manquants
   * @param locale Langue de l'email
   */
  async sendDocumentReminderEmail(
    email: string,
    name: string,
    missingDocuments: Array<{ type: DocumentType; label: string }>,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const template = documentReminderTemplates[locale];

    const documentsListHtml = missingDocuments.map(doc => `<li>${doc.label}</li>`).join('');
    const documentsListText = locale === 'fr' ? 'Documents manquants :' : 'Missing documents:';

    const customMessage = `
      ${template.message}
      <br/><br/>
      <strong>${documentsListText}</strong>
      <ul>
        ${documentsListHtml}
      </ul>
    `;

    const documentsUrl = `${this.frontendUrl}/${locale}/documents`;

    const html = generateEmailHTML(template, {
      name,
      customMessage,
      customUrl: documentsUrl,
    });

    await this.sendEmail({
      to: email,
      subject: template.subject,
      html,
    });
  }

  /**
   * Planifie des rappels automatiques pour les documents manquants
   * @param user Utilisateur avec documents manquants
   * @param missingDocuments Liste des documents manquants
   * @param locale Langue de l'email
   * @param delayDays Nombre de jours avant l'envoi du rappel
   */
  async scheduleDocumentReminder(
    email: string,
    name: string,
    missingDocuments: Array<{ type: DocumentType; label: string }>,
    locale: SupportedLanguage = 'fr',
    delayDays: number = 3
  ): Promise<void> {
    // Calculer la date d'envoi du rappel
    const sendDate = new Date();
    sendDate.setDate(sendDate.getDate() + delayDays);

    // Enregistrer le rappel dans la base de données
    // Note: Cette implémentation est simplifiée, dans une application réelle,
    // il faudrait stocker ces rappels dans une base de données et avoir
    // un service de cron qui exécute les rappels à la date prévue

    console.log(`Scheduled reminder for ${email} on ${sendDate.toISOString()}`);

    // Pour les besoins de la démo, nous simulons l'envoi immédiat
    if (process.env.NODE_ENV === 'development') {
      await this.sendDocumentReminderEmail(email, name, missingDocuments, locale);
    }
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
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: "Erreur lors de l'envoi de l'email",
      });
    }
  }

  /**
   * Renvoie le nom localisé d'un type de document
   * @param type Type de document
   * @param locale Langue
   */
  private getDocumentTypeName(type: DocumentType, locale: SupportedLanguage = 'fr'): string {
    const documentTypeNames: Record<SupportedLanguage, Record<DocumentType, string>> = {
      fr: {
        [DocumentType.ID_CARD]: "Carte d'identité",
        [DocumentType.DRIVER_LICENSE]: 'Permis de conduire',
        [DocumentType.VEHICLE_REGISTRATION]: 'Carte grise',
        [DocumentType.INSURANCE]: "Attestation d'assurance",
        [DocumentType.CRIMINAL_RECORD]: 'Casier judiciaire',
        [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Certification professionnelle',
        [DocumentType.OTHER]: 'Autre document',
      },
      en: {
        [DocumentType.ID_CARD]: 'ID Card',
        [DocumentType.DRIVER_LICENSE]: 'Driver License',
        [DocumentType.VEHICLE_REGISTRATION]: 'Vehicle Registration',
        [DocumentType.INSURANCE]: 'Insurance Certificate',
        [DocumentType.CRIMINAL_RECORD]: 'Criminal Record',
        [DocumentType.PROFESSIONAL_CERTIFICATION]: 'Professional Certification',
        [DocumentType.OTHER]: 'Other Document',
      },
    };

    return documentTypeNames[locale][type] || (locale === 'fr' ? 'Document' : 'Document');
  }

  /**
   * Envoie une confirmation de livraison
   */
  async sendDeliveryConfirmation(
    to: string,
    deliveryId: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const trackingUrl = `${this.frontendUrl}/${locale}/deliveries/${deliveryId}`;
    const subject =
      locale === 'fr' ? 'Confirmation de livraison - EcoDeli' : 'Delivery confirmation - EcoDeli';
    const title = locale === 'fr' ? 'Confirmation de livraison' : 'Delivery confirmation';
    const message =
      locale === 'fr'
        ? `Votre livraison a été confirmée. Numéro de livraison: <strong>${deliveryId}</strong>`
        : `Your delivery has been confirmed. Delivery ID: <strong>${deliveryId}</strong>`;
    const cta = locale === 'fr' ? 'Suivre ma livraison' : 'Track my delivery';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        <p>${message}</p>
        <p>
          <a 
            href="${trackingUrl}" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject,
      html,
    });
  }

  /**
   * Envoie une facture par email
   */
  async sendInvoiceEmail(
    to: string,
    invoiceId: string,
    pdfBuffer: Buffer,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr' ? `Facture ${invoiceId} - EcoDeli` : `Invoice ${invoiceId} - EcoDeli`;

    const title = locale === 'fr' ? 'Votre facture EcoDeli' : 'Your EcoDeli invoice';
    const message =
      locale === 'fr'
        ? `Veuillez trouver ci-joint votre facture <strong>${invoiceId}</strong>. Vous pouvez également consulter vos factures à tout moment dans votre espace personnel.`
        : `Please find attached your invoice <strong>${invoiceId}</strong>. You can also view your invoices at any time in your personal space.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    `;

    const text =
      locale === 'fr'
        ? `Votre facture EcoDeli\n\nVeuillez trouver ci-joint votre facture ${invoiceId}.\nVous pouvez également consulter vos factures à tout moment dans votre espace personnel.`
        : `Your EcoDeli invoice\n\nPlease find attached your invoice ${invoiceId}.\nYou can also view your invoices at any time in your personal space.`;

    await this.sendEmail({
      to,
      subject,
      html,
      text,
      attachments: [
        {
          filename: `facture-${invoiceId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  /**
   * Envoie une notification d'activation de compte
   */
  async sendAccountActivationNotification(
    email: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr' ? 'Votre compte EcoDeli est activé' : 'Your EcoDeli account is activated';
    const title =
      locale === 'fr' ? 'Votre compte est maintenant actif !' : 'Your account is now active!';
    const message =
      locale === 'fr'
        ? 'Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant vous connecter à votre compte EcoDeli.'
        : 'Your email address has been successfully verified. You can now log in to your EcoDeli account.';
    const cta = locale === 'fr' ? 'Se connecter' : 'Log in';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        <p>${message}</p>
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/login" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie un email de bienvenue au client
   */
  async sendClientWelcomeEmail(email: string, locale: SupportedLanguage = 'fr'): Promise<void> {
    const subject = locale === 'fr' ? 'Bienvenue sur EcoDeli !' : 'Welcome to EcoDeli!';
    const title = locale === 'fr' ? 'Bienvenue sur EcoDeli !' : 'Welcome to EcoDeli!';
    const message =
      locale === 'fr'
        ? `
        <p>Votre compte client est maintenant activé et prêt à l'emploi.</p>
        <p>Voici ce que vous pouvez faire maintenant :</p>
        <ul>
          <li>Explorer nos services de livraison écologique</li>
          <li>Planifier votre première livraison</li>
          <li>Découvrir nos commerçants partenaires</li>
        </ul>
        <p>Nous vous souhaitons une excellente expérience !</p>
      `
        : `
        <p>Your client account is now activated and ready to use.</p>
        <p>Here's what you can do now:</p>
        <ul>
          <li>Explore our eco-friendly delivery services</li>
          <li>Plan your first delivery</li>
          <li>Discover our merchant partners</li>
        </ul>
        <p>We wish you an excellent experience!</p>
      `;
    const cta = locale === 'fr' ? 'Accéder à mon espace' : 'Access my account';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/client/dashboard" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie les instructions de vérification pour un livreur
   */
  async sendDelivererVerificationInstructions(
    email: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr'
        ? 'Finaliser votre inscription comme livreur - EcoDeli'
        : 'Complete your registration as a deliverer - EcoDeli';

    const title =
      locale === 'fr'
        ? 'Prochaines étapes pour devenir livreur EcoDeli'
        : 'Next steps to become an EcoDeli deliverer';

    const message =
      locale === 'fr'
        ? `
        <p>Merci d'avoir vérifié votre adresse email.</p>
        <p>Pour finaliser votre inscription en tant que livreur, nous avons besoin de vérifier quelques documents :</p>
        <ul>
          <li>Pièce d'identité</li>
          <li>Permis de conduire (si applicable)</li>
          <li>Justificatif d'assurance</li>
          <li>Photo de votre véhicule</li>
        </ul>
        <p>Veuillez vous connecter à votre espace livreur pour télécharger ces documents.</p>
        <p>Notre équipe vérifiera vos documents sous 48h et vous informera de la suite.</p>
      `
        : `
        <p>Thank you for verifying your email address.</p>
        <p>To complete your registration as a deliverer, we need to verify some documents:</p>
        <ul>
          <li>ID card</li>
          <li>Driver's license (if applicable)</li>
          <li>Insurance certificate</li>
          <li>Photo of your vehicle</li>
        </ul>
        <p>Please log in to your deliverer account to upload these documents.</p>
        <p>Our team will verify your documents within 48 hours and inform you of the next steps.</p>
      `;

    const cta = locale === 'fr' ? 'Télécharger mes documents' : 'Upload my documents';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/deliverer/documents" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie les instructions pour le contrat marchand
   */
  async sendMerchantContractInstructions(
    email: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr'
        ? 'Finaliser votre partenariat marchand - EcoDeli'
        : 'Complete your merchant partnership - EcoDeli';

    const title =
      locale === 'fr'
        ? 'Prochaines étapes pour devenir marchand partenaire'
        : 'Next steps to become a merchant partner';

    const message =
      locale === 'fr'
        ? `
        <p>Merci d'avoir vérifié votre adresse email.</p>
        <p>Pour finaliser votre partenariat avec EcoDeli, nous avons besoin des informations suivantes :</p>
        <ul>
          <li>Vos informations commerciales complètes (SIRET, adresse, etc.)</li>
          <li>Remplir le contrat de partenariat</li>
          <li>Fournir vos préférences de livraison</li>
        </ul>
        <p>Veuillez vous connecter à votre espace commerçant pour compléter ces étapes.</p>
        <p>Notre équipe validera votre dossier sous 72h et vous contactera pour finaliser le partenariat.</p>
      `
        : `
        <p>Thank you for verifying your email address.</p>
        <p>To finalize your partnership with EcoDeli, we need the following information:</p>
        <ul>
          <li>Your complete business information (business ID, address, etc.)</li>
          <li>Fill out the partnership contract</li>
          <li>Provide your delivery preferences</li>
        </ul>
        <p>Please log in to your merchant account to complete these steps.</p>
        <p>Our team will validate your file within 72 hours and contact you to finalize the partnership.</p>
      `;

    const cta = locale === 'fr' ? 'Compléter mon dossier' : 'Complete my profile';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/merchant/contract" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie les instructions pour la vérification des compétences d'un prestataire
   */
  async sendProviderVerificationInstructions(
    email: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr'
        ? 'Finaliser votre profil de prestataire - EcoDeli'
        : 'Complete your service provider profile - EcoDeli';

    const title =
      locale === 'fr'
        ? 'Prochaines étapes pour devenir prestataire EcoDeli'
        : 'Next steps to become an EcoDeli service provider';

    const message =
      locale === 'fr'
        ? `
        <p>Merci d'avoir vérifié votre adresse email.</p>
        <p>Pour finaliser votre inscription en tant que prestataire, nous avons besoin de vérifier vos qualifications :</p>
        <ul>
          <li>Diplômes et certifications</li>
          <li>Justificatifs d'expérience</li>
          <li>Portfolio ou références</li>
          <li>Détails de vos services proposés</li>
        </ul>
        <p>Veuillez vous connecter à votre espace prestataire pour compléter votre profil.</p>
        <p>Notre équipe validera vos informations et vous contactera dans les plus brefs délais.</p>
      `
        : `
        <p>Thank you for verifying your email address.</p>
        <p>To finalize your registration as a service provider, we need to verify your qualifications:</p>
        <ul>
          <li>Diplomas and certifications</li>
          <li>Proof of experience</li>
          <li>Portfolio or references</li>
          <li>Details of your proposed services</li>
        </ul>
        <p>Please log in to your service provider account to complete your profile.</p>
        <p>Our team will validate your information and contact you as soon as possible.</p>
      `;

    const cta = locale === 'fr' ? 'Compléter mon profil' : 'Complete my profile';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/provider/documents" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie une notification d'approbation de compte
   */
  async sendAccountApprovalNotification(
    email: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr'
        ? 'Votre compte EcoDeli a été approuvé !'
        : 'Your EcoDeli account has been approved!';

    const title =
      locale === 'fr'
        ? 'Félicitations ! Votre compte EcoDeli est approuvé'
        : 'Congratulations! Your EcoDeli account is approved';

    const message =
      locale === 'fr'
        ? `
        <p>Nous sommes heureux de vous informer que votre compte a été approuvé par notre équipe.</p>
        <p>Vous pouvez maintenant accéder à toutes les fonctionnalités de votre espace personnel.</p>
        <p>Bienvenue dans la communauté EcoDeli !</p>
      `
        : `
        <p>We are pleased to inform you that your account has been approved by our team.</p>
        <p>You can now access all the features of your personal space.</p>
        <p>Welcome to the EcoDeli community!</p>
      `;

    const cta = locale === 'fr' ? 'Se connecter' : 'Log in';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/login" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie une notification de rejet de compte
   */
  async sendAccountRejectionNotification(
    email: string,
    reason: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const subject =
      locale === 'fr'
        ? 'Information concernant votre compte EcoDeli'
        : 'Information regarding your EcoDeli account';

    const title =
      locale === 'fr' ? 'Concernant votre demande EcoDeli' : 'Regarding your EcoDeli application';

    const reasonLabel = locale === 'fr' ? 'Raison :' : 'Reason:';
    const message =
      locale === 'fr'
        ? `
        <p>Nous avons examiné votre dossier et ne pouvons malheureusement pas l'approuver en l'état.</p>
        <p><strong>${reasonLabel}</strong> ${reason}</p>
        <p>Vous pouvez mettre à jour votre dossier et soumettre une nouvelle demande en vous connectant à votre compte.</p>
        <p>Si vous avez des questions, n'hésitez pas à contacter notre service support.</p>
      `
        : `
        <p>We have reviewed your application and unfortunately cannot approve it in its current state.</p>
        <p><strong>${reasonLabel}</strong> ${reason}</p>
        <p>You can update your file and submit a new application by logging into your account.</p>
        <p>If you have any questions, please don't hesitate to contact our support service.</p>
      `;

    const cta = locale === 'fr' ? 'Mettre à jour mon dossier' : 'Update my file';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${this.frontendUrl}/${locale}/login" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  /**
   * Envoie une invitation pour un nouvel administrateur
   */
  async sendAdminInvitation(
    email: string,
    token: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    const setupUrl = `${this.frontendUrl}/${locale}/admin/setup?token=${token}`;

    const subject =
      locale === 'fr'
        ? "Invitation à rejoindre EcoDeli en tant qu'administrateur"
        : 'Invitation to join EcoDeli as an administrator';

    const title =
      locale === 'fr'
        ? 'Invitation EcoDeli - Administrateur'
        : 'EcoDeli Invitation - Administrator';

    const message =
      locale === 'fr'
        ? `
        <p>Vous avez été invité à rejoindre la plateforme EcoDeli en tant qu'administrateur.</p>
        <p>Pour configurer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
        <p>Ce lien est valable pendant 24 heures et ne peut être utilisé qu'une seule fois.</p>
        <p>Pour des raisons de sécurité, vous devrez changer votre mot de passe lors de votre première connexion.</p>
      `
        : `
        <p>You have been invited to join the EcoDeli platform as an administrator.</p>
        <p>To set up your account, please click the link below:</p>
        <p>This link is valid for 24 hours and can only be used once.</p>
        <p>For security reasons, you will need to change your password when you first log in.</p>
      `;

    const cta = locale === 'fr' ? 'Configurer mon compte' : 'Set up my account';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>${title}</h1>
        ${message}
        <p>
          <a 
            href="${setupUrl}" 
            style="display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;"
          >
            ${cta}
          </a>
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }
}
