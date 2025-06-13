/**
 * Templates d'emails multilingues pour l'application
 */

import { DocumentType, VerificationStatus } from "@prisma/client";

export type SupportedLanguage = "fr" | "en";

export interface EmailTemplate {
  subject: string;
  title: string;
  greeting: string;
  message: string;
  cta?: {
    text: string;
    url: string;
  };
  footer?: string;
}

export interface LocalizedTemplate {
  fr: EmailTemplate;
  en: EmailTemplate;
}

export type UserRole =
  | "CLIENT"
  | "DELIVERER"
  | "MERCHANT"
  | "PROVIDER"
  | "ADMIN";

type TemplateSet<T extends Record<string, unknown>> = Record<
  SupportedLanguage,
  T
>;

/**
 * Template d'email de bienvenue
 */
export const welcomeEmailTemplates: TemplateSet<EmailTemplate> = {
  fr: {
    subject: "Bienvenue sur EcoDeli",
    title: "Bienvenue",
    greeting: "Bonjour",
    message:
      "Merci de vous être inscrit sur EcoDeli. Nous sommes ravis de vous compter parmi notre communauté.",
    cta: {
      text: "Accéder à mon compte",
      url: "/dashboard",
    },
  },
  en: {
    subject: "Welcome to EcoDeli",
    title: "Welcome",
    greeting: "Hello",
    message:
      "Thank you for signing up with EcoDeli. We are excited to have you join our community.",
    cta: {
      text: "Access my account",
      url: "/dashboard",
    },
  },
};

/**
 * Templates d'email de bienvenue spécifiques par rôle
 */
export const roleSpecificWelcomeTemplates: Record<
  UserRole,
  TemplateSet<EmailTemplate>
> = {
  CLIENT: {
    fr: {
      subject: "Bienvenue sur EcoDeli",
      title: "Bienvenue chez EcoDeli",
      greeting: "Bonjour",
      message:
        "Merci de vous être inscrit sur EcoDeli en tant que client. Vous pouvez maintenant profiter de nos services de livraison écologique et découvrir nos commerçants partenaires.",
      cta: {
        text: "Découvrir les services",
        url: "/client/services",
      },
    },
    en: {
      subject: "Welcome to EcoDeli",
      title: "Welcome to EcoDeli",
      greeting: "Hello",
      message:
        "Thank you for signing up with EcoDeli as a client. You can now enjoy our eco-friendly delivery services and discover our merchant partners.",
      cta: {
        text: "Discover our services",
        url: "/client/services",
      },
    },
  },
  DELIVERER: {
    fr: {
      subject: "Bienvenue dans l'équipe EcoDeli",
      title: "Bienvenue dans notre équipe de livraison",
      greeting: "Bonjour",
      message:
        "Merci de vous être inscrit sur EcoDeli en tant que livreur. Pour commencer à effectuer des livraisons, vous devez compléter votre profil et soumettre les documents requis pour vérification.",
      cta: {
        text: "Compléter mon profil",
        url: "/deliverer/documents",
      },
      footer:
        "Une fois vos documents approuvés, vous pourrez accéder à toutes les fonctionnalités de livreur.",
    },
    en: {
      subject: "Welcome to the EcoDeli team",
      title: "Welcome to our delivery team",
      greeting: "Hello",
      message:
        "Thank you for signing up with EcoDeli as a deliverer. To start making deliveries, you need to complete your profile and submit the required documents for verification.",
      cta: {
        text: "Complete my profile",
        url: "/deliverer/documents",
      },
      footer:
        "Once your documents are approved, you will be able to access all deliverer features.",
    },
  },
  MERCHANT: {
    fr: {
      subject: "Bienvenue parmi nos commerçants EcoDeli",
      title: "Bienvenue chez EcoDeli, nouveau partenaire",
      greeting: "Bonjour",
      message:
        "Merci de vous être inscrit sur EcoDeli en tant que commerçant. Pour commencer à utiliser nos services de livraison écologique, veuillez compléter votre profil commercial et signer le contrat de partenariat.",
      cta: {
        text: "Compléter mon profil commercial",
        url: "/merchant/contract",
      },
      footer:
        "Notre équipe examinera vos informations et vous contactera pour finaliser le partenariat.",
    },
    en: {
      subject: "Welcome to our EcoDeli merchants",
      title: "Welcome to EcoDeli, new partner",
      greeting: "Hello",
      message:
        "Thank you for signing up with EcoDeli as a merchant. To start using our eco-friendly delivery services, please complete your business profile and sign the partnership contract.",
      cta: {
        text: "Complete my business profile",
        url: "/merchant/contract",
      },
      footer:
        "Our team will review your information and contact you to finalize the partnership.",
    },
  },
  PROVIDER: {
    fr: {
      subject: "Bienvenue parmi nos prestataires EcoDeli",
      title: "Bienvenue chez EcoDeli, nouveau prestataire",
      greeting: "Bonjour",
      message:
        "Merci de vous être inscrit sur EcoDeli en tant que prestataire de services. Pour proposer vos services sur notre plateforme, veuillez compléter votre profil professionnel et soumettre vos certifications.",
      cta: {
        text: "Compléter mon profil professionnel",
        url: "/provider/documents",
      },
      footer:
        "Notre équipe examinera vos qualifications et vous contactera dans les plus brefs délais.",
    },
    en: {
      subject: "Welcome to our EcoDeli service providers",
      title: "Welcome to EcoDeli, new service provider",
      greeting: "Hello",
      message:
        "Thank you for signing up with EcoDeli as a service provider. To offer your services on our platform, please complete your professional profile and submit your certifications.",
      cta: {
        text: "Complete my professional profile",
        url: "/provider/documents",
      },
      footer:
        "Our team will review your qualifications and contact you as soon as possible.",
    },
  },
  ADMIN: {
    fr: {
      subject: "Accès administrateur EcoDeli",
      title: "Accès administrateur",
      greeting: "Bonjour",
      message:
        "Votre compte administrateur EcoDeli a été créé. Vous avez maintenant accès au panneau d'administration pour gérer la plateforme.",
      cta: {
        text: "Accéder au panneau d'administration",
        url: "/admin/dashboard",
      },
    },
    en: {
      subject: "EcoDeli Admin Access",
      title: "Admin Access",
      greeting: "Hello",
      message:
        "Your EcoDeli administrator account has been created. You now have access to the admin panel to manage the platform.",
      cta: {
        text: "Access admin panel",
        url: "/admin/dashboard",
      },
    },
  },
};

/**
 * Template d'email de vérification d'adresse email
 */
export const verificationEmailTemplates: TemplateSet<EmailTemplate> = {
  fr: {
    subject: "Vérifiez votre adresse email - EcoDeli",
    title: "Vérification de votre adresse email",
    greeting: "Bonjour",
    message:
      "Merci de vous être inscrit sur EcoDeli. Pour vérifier votre adresse email, veuillez cliquer sur le lien ci-dessous :",
    cta: {
      text: "Vérifier mon email",
      url: "/verify-email",
    },
    footer: "Ce lien est valable pendant 24 heures.",
  },
  en: {
    subject: "Verify your email address - EcoDeli",
    title: "Email verification",
    greeting: "Hello",
    message:
      "Thank you for signing up with EcoDeli. To verify your email address, please click the link below:",
    cta: {
      text: "Verify my email",
      url: "/verify-email",
    },
    footer: "This link is valid for 24 hours.",
  },
};

/**
 * Templates d'instructions post-vérification d'email par rôle
 */
export const postVerificationInstructionsTemplates: Record<
  UserRole,
  TemplateSet<EmailTemplate>
> = {
  CLIENT: {
    fr: {
      subject: "Votre compte client est activé - EcoDeli",
      title: "Votre compte est activé",
      greeting: "Bonjour",
      message:
        "Votre adresse email a été vérifiée avec succès. Votre compte client est maintenant actif et vous pouvez commencer à utiliser nos services de livraison écologique.",
      cta: {
        text: "Découvrir les services",
        url: "/client/services",
      },
    },
    en: {
      subject: "Your client account is activated - EcoDeli",
      title: "Your account is activated",
      greeting: "Hello",
      message:
        "Your email address has been successfully verified. Your client account is now active and you can start using our eco-friendly delivery services.",
      cta: {
        text: "Discover our services",
        url: "/client/services",
      },
    },
  },
  DELIVERER: {
    fr: {
      subject: "Prochaines étapes pour devenir livreur - EcoDeli",
      title: "Prochaines étapes pour devenir livreur",
      greeting: "Bonjour",
      message:
        "Votre adresse email a été vérifiée avec succès. Pour compléter votre inscription en tant que livreur, veuillez soumettre les documents requis pour vérification :",
      cta: {
        text: "Soumettre mes documents",
        url: "/deliverer/documents",
      },
      footer:
        "Pièces requises : pièce d'identité, permis de conduire, attestation d'assurance, photo du véhicule.",
    },
    en: {
      subject: "Next steps to become a deliverer - EcoDeli",
      title: "Next steps to become a deliverer",
      greeting: "Hello",
      message:
        "Your email address has been successfully verified. To complete your registration as a deliverer, please submit the required documents for verification:",
      cta: {
        text: "Submit my documents",
        url: "/deliverer/documents",
      },
      footer:
        "Required documents: ID card, driver's license, insurance certificate, vehicle photo.",
    },
  },
  MERCHANT: {
    fr: {
      subject: "Compléter votre profil commerçant - EcoDeli",
      title: "Compléter votre profil commerçant",
      greeting: "Bonjour",
      message:
        "Votre adresse email a été vérifiée avec succès. Pour finaliser votre partenariat avec EcoDeli, veuillez compléter votre profil commerçant et signer le contrat de partenariat.",
      cta: {
        text: "Compléter mon profil",
        url: "/merchant/contract",
      },
      footer:
        "Informations requises : détails de l'entreprise, coordonnées bancaires, préférences de livraison.",
    },
    en: {
      subject: "Complete your merchant profile - EcoDeli",
      title: "Complete your merchant profile",
      greeting: "Hello",
      message:
        "Your email address has been successfully verified. To finalize your partnership with EcoDeli, please complete your merchant profile and sign the partnership contract.",
      cta: {
        text: "Complete my profile",
        url: "/merchant/contract",
      },
      footer:
        "Required information: business details, banking information, delivery preferences.",
    },
  },
  PROVIDER: {
    fr: {
      subject: "Compléter votre profil prestataire - EcoDeli",
      title: "Compléter votre profil prestataire",
      greeting: "Bonjour",
      message:
        "Votre adresse email a été vérifiée avec succès. Pour proposer vos services sur EcoDeli, veuillez compléter votre profil prestataire et soumettre vos certifications professionnelles.",
      cta: {
        text: "Compléter mon profil",
        url: "/provider/documents",
      },
      footer:
        "Documents requis : diplômes, certifications, attestations d'expérience, détails des services proposés.",
    },
    en: {
      subject: "Complete your service provider profile - EcoDeli",
      title: "Complete your service provider profile",
      greeting: "Hello",
      message:
        "Your email address has been successfully verified. To offer your services on EcoDeli, please complete your service provider profile and submit your professional certifications.",
      cta: {
        text: "Complete my profile",
        url: "/provider/documents",
      },
      footer:
        "Required documents: diplomas, certifications, proof of experience, details of services offered.",
    },
  },
  ADMIN: {
    fr: {
      subject: "Accès administrateur confirmé - EcoDeli",
      title: "Accès administrateur confirmé",
      greeting: "Bonjour",
      message:
        "Votre adresse email a été vérifiée avec succès. Vous avez maintenant un accès complet au panneau d'administration EcoDeli.",
      cta: {
        text: "Accéder au panneau d'administration",
        url: "/admin/dashboard",
      },
    },
    en: {
      subject: "Admin access confirmed - EcoDeli",
      title: "Admin access confirmed",
      greeting: "Hello",
      message:
        "Your email address has been successfully verified. You now have full access to the EcoDeli admin panel.",
      cta: {
        text: "Access admin panel",
        url: "/admin/dashboard",
      },
    },
  },
};

/**
 * Template d'email de réinitialisation de mot de passe
 */
export const passwordResetTemplates: TemplateSet<EmailTemplate> = {
  fr: {
    subject: "Réinitialisation de mot de passe - EcoDeli",
    title: "Réinitialisation de votre mot de passe",
    greeting: "Bonjour",
    message:
      "Vous avez demandé la réinitialisation de votre mot de passe. Pour définir un nouveau mot de passe, veuillez cliquer sur le lien ci-dessous :",
    cta: {
      text: "Réinitialiser mon mot de passe",
      url: "/reset-password",
    },
    footer:
      "Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.",
  },
  en: {
    subject: "Password reset - EcoDeli",
    title: "Password reset",
    greeting: "Hello",
    message:
      "You requested a password reset. To set a new password, please click the link below:",
    cta: {
      text: "Reset my password",
      url: "/reset-password",
    },
    footer:
      "This link is valid for 1 hour. If you didn't request this reset, please ignore this email.",
  },
};

/**
 * Templates d'email pour l'approbation de document
 */
export const documentApprovedTemplates: TemplateSet<EmailTemplate> = {
  fr: {
    subject: "Document approuvé - EcoDeli",
    title: "Document approuvé",
    greeting: "Bonjour",
    message:
      "Votre document a été approuvé. Vous pouvez désormais accéder à toutes les fonctionnalités de votre compte.",
    cta: {
      text: "Voir mes documents",
      url: "/documents",
    },
  },
  en: {
    subject: "Document approved - EcoDeli",
    title: "Document approved",
    greeting: "Hello",
    message:
      "Your document has been approved. You can now access all the features of your account.",
    cta: {
      text: "View my documents",
      url: "/documents",
    },
  },
};

/**
 * Templates d'email pour le rejet de document
 */
export const documentRejectedTemplates: TemplateSet<
  EmailTemplate & { reasonLabel: string }
> = {
  fr: {
    subject: "Document rejeté - EcoDeli",
    title: "Document rejeté",
    greeting: "Bonjour",
    message: "Votre document a été rejeté.",
    reasonLabel: "Raison du rejet :",
    cta: {
      text: "Télécharger un nouveau document",
      url: "/documents",
    },
    footer:
      "Veuillez télécharger un nouveau document pour continuer le processus de vérification.",
  },
  en: {
    subject: "Document rejected - EcoDeli",
    title: "Document rejected",
    greeting: "Hello",
    message: "Your document has been rejected.",
    reasonLabel: "Rejection reason:",
    cta: {
      text: "Upload a new document",
      url: "/documents",
    },
    footer:
      "Please upload a new document to continue the verification process.",
  },
};

/**
 * Templates pour les notifications de changement de statut de vérification
 */
export const verificationStatusChangedTemplates: TemplateSet<
  Record<string, EmailTemplate>
> = {
  fr: {
    PENDING: {
      subject: "Documents en cours de vérification - EcoDeli",
      title: "Documents en cours de vérification",
      greeting: "Bonjour",
      message:
        "Nous avons bien reçu vos documents. Notre équipe les examine actuellement et vous informera dès que le processus de vérification sera terminé.",
      footer:
        "Ce processus prend généralement entre 24 et 48 heures ouvrables.",
    },
    APPROVED: {
      subject: "Vérification approuvée - EcoDeli",
      title: "Vérification approuvée",
      greeting: "Bonjour",
      message:
        "Félicitations ! Tous vos documents ont été vérifiés et approuvés. Votre compte est maintenant complètement activé et vous pouvez accéder à toutes les fonctionnalités.",
      cta: {
        text: "Accéder à mon compte",
        url: "/dashboard",
      },
    },
    REJECTED: {
      subject: "Vérification rejetée - EcoDeli",
      title: "Vérification rejetée",
      greeting: "Bonjour",
      message:
        "Malheureusement, certains de vos documents n'ont pas pu être approuvés. Veuillez consulter les détails ci-dessous et soumettre de nouveaux documents.",
      cta: {
        text: "Soumettre de nouveaux documents",
        url: "/documents",
      },
    },
  },
  en: {
    PENDING: {
      subject: "Documents under review - EcoDeli",
      title: "Documents under review",
      greeting: "Hello",
      message:
        "We have received your documents. Our team is currently reviewing them and will inform you as soon as the verification process is complete.",
      footer: "This process usually takes between 24 and 48 business hours.",
    },
    APPROVED: {
      subject: "Verification approved - EcoDeli",
      title: "Verification approved",
      greeting: "Hello",
      message:
        "Congratulations! All your documents have been verified and approved. Your account is now fully activated and you can access all features.",
      cta: {
        text: "Access my account",
        url: "/dashboard",
      },
    },
    REJECTED: {
      subject: "Verification rejected - EcoDeli",
      title: "Verification rejected",
      greeting: "Hello",
      message:
        "Unfortunately, some of your documents could not be approved. Please check the details below and submit new documents.",
      cta: {
        text: "Submit new documents",
        url: "/documents",
      },
    },
  },
};

/**
 * Templates pour les rappels de documents manquants
 */
export const documentReminderTemplates: TemplateSet<EmailTemplate> = {
  fr: {
    subject: "Rappel : Documents manquants - EcoDeli",
    title: "Documents manquants pour votre compte",
    greeting: "Bonjour",
    message:
      "Nous remarquons que certains documents nécessaires à la vérification de votre compte sont toujours manquants. Pour accéder à toutes les fonctionnalités de notre plateforme, veuillez soumettre les documents manquants dès que possible.",
    cta: {
      text: "Soumettre mes documents",
      url: "/documents",
    },
    footer:
      "Si vous avez des questions ou besoin d'assistance, n'hésitez pas à contacter notre support.",
  },
  en: {
    subject: "Reminder: Missing documents - EcoDeli",
    title: "Missing documents for your account",
    greeting: "Hello",
    message:
      "We notice that some documents required to verify your account are still missing. To access all the features of our platform, please submit the missing documents as soon as possible.",
    cta: {
      text: "Submit my documents",
      url: "/documents",
    },
    footer:
      "If you have any questions or need assistance, please don't hesitate to contact our support.",
  },
};

/**
 * Génère un email HTML responsive à partir des templates
 * @param template Template d'email
 * @param customization Données personnalisées
 * @returns HTML de l'email
 */
export function generateEmailHTML(
  template: EmailTemplate,
  customization: {
    name?: string;
    customMessage?: string;
    customUrl?: string;
  } = {},
) {
  const { name, customMessage, customUrl } = customization;

  // Personnaliser le message si nécessaire
  const personalisedMessage = customMessage || template.message;

  // Personnaliser l'URL si nécessaire
  const ctaUrl = template.cta ? customUrl || template.cta.url : "";

  // Construire l'email HTML
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${template.subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9fafb;
        }
        .footer {
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          background-color: #f3f4f6;
        }
        .button {
          display: inline-block;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          margin: 20px 0;
          border-radius: 5px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${template.title}</h1>
        </div>
        <div class="content">
          <p>${template.greeting}${name ? " " + name : ""},</p>
          <p>${personalisedMessage}</p>
          ${
            template.cta
              ? `<p><a href="${ctaUrl}" class="button">${template.cta.text}</a></p>`
              : ""
          }
          ${template.footer ? `<p>${template.footer}</p>` : ""}
        </div>
        <div class="footer">
          <p>EcoDeli &copy; ${new Date().getFullYear()}</p>
          <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Templates d'emails
export const emailTemplates = {
  // Email de bienvenue
  welcome: {
    fr: {
      subject: "Bienvenue sur EcoDeli !",
      title: "Bienvenue sur EcoDeli",
      greeting: "Bonjour {name},",
      message:
        "Nous sommes ravis de vous accueillir sur EcoDeli. Votre compte a été créé avec succès.",
      cta: {
        text: "Accéder à mon compte",
        url: "{baseUrl}/fr/login",
      },
      footer: "Merci de nous faire confiance. L'équipe EcoDeli",
    },
    en: {
      subject: "Welcome to EcoDeli!",
      title: "Welcome to EcoDeli",
      greeting: "Hello {name},",
      message:
        "We are delighted to welcome you to EcoDeli. Your account has been successfully created.",
      cta: {
        text: "Access my account",
        url: "{baseUrl}/en/login",
      },
      footer: "Thank you for your trust. The EcoDeli Team",
    },
  },

  // Email de vérification
  verification: {
    fr: {
      subject: "Vérifiez votre adresse email",
      title: "Vérification de votre email",
      greeting: "Bonjour {name},",
      message:
        "Merci de vous être inscrit sur EcoDeli. Pour finaliser votre inscription, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.",
      cta: {
        text: "Vérifier mon email",
        url: "{verificationUrl}",
      },
      footer:
        "Si vous n'avez pas créé de compte sur EcoDeli, vous pouvez ignorer cet email.",
    },
    en: {
      subject: "Verify your email address",
      title: "Email verification",
      greeting: "Hello {name},",
      message:
        "Thank you for registering on EcoDeli. To complete your registration, please verify your email address by clicking the button below.",
      cta: {
        text: "Verify my email",
        url: "{verificationUrl}",
      },
      footer:
        "If you did not create an account on EcoDeli, you can ignore this email.",
    },
  },

  // Instructions post-vérification
  postVerification: {
    deliverer: {
      fr: {
        subject: "Prochaines étapes pour devenir livreur",
        title: "Bienvenue parmi nos livreurs",
        greeting: "Bonjour {name},",
        message:
          "Votre email a été vérifié avec succès. Pour compléter votre inscription en tant que livreur, veuillez soumettre les documents suivants pour vérification : permis de conduire, preuve d'assurance, et photo d'identité.",
        cta: {
          text: "Télécharger mes documents",
          url: "{baseUrl}/fr/deliverer/documents",
        },
        footer:
          "Si vous avez des questions, n'hésitez pas à contacter notre équipe de support.",
      },
      en: {
        subject: "Next steps to become a deliverer",
        title: "Welcome to our deliverers team",
        greeting: "Hello {name},",
        message:
          "Your email has been successfully verified. To complete your registration as a deliverer, please submit the following documents for verification: driver's license, proof of insurance, and ID photo.",
        cta: {
          text: "Upload my documents",
          url: "{baseUrl}/en/deliverer/documents",
        },
        footer:
          "If you have any questions, don't hesitate to contact our support team.",
      },
    },
    provider: {
      fr: {
        subject: "Prochaines étapes pour devenir prestataire",
        title: "Bienvenue parmi nos prestataires",
        greeting: "Bonjour {name},",
        message:
          "Votre email a été vérifié avec succès. Pour compléter votre inscription en tant que prestataire, veuillez soumettre les documents suivants pour vérification : attestation professionnelle, preuve d'assurance, et photo d'identité.",
        cta: {
          text: "Télécharger mes documents",
          url: "{baseUrl}/fr/provider/documents",
        },
        footer:
          "Si vous avez des questions, n'hésitez pas à contacter notre équipe de support.",
      },
      en: {
        subject: "Next steps to become a service provider",
        title: "Welcome to our providers team",
        greeting: "Hello {name},",
        message:
          "Your email has been successfully verified. To complete your registration as a service provider, please submit the following documents for verification: professional certification, proof of insurance, and ID photo.",
        cta: {
          text: "Upload my documents",
          url: "{baseUrl}/en/provider/documents",
        },
        footer:
          "If you have any questions, don't hesitate to contact our support team.",
      },
    },
    client: {
      fr: {
        subject: "Bienvenue sur EcoDeli",
        title: "Bienvenue chez EcoDeli",
        greeting: "Bonjour {name},",
        message:
          "Votre email a été vérifié avec succès. Vous pouvez maintenant profiter de tous nos services de livraison écologique.",
        cta: {
          text: "Explorer les services",
          url: "{baseUrl}/fr/client/services",
        },
        footer: "Merci de votre confiance. L'équipe EcoDeli",
      },
      en: {
        subject: "Welcome to EcoDeli",
        title: "Welcome to EcoDeli",
        greeting: "Hello {name},",
        message:
          "Your email has been successfully verified. You can now enjoy all our eco-friendly delivery services.",
        cta: {
          text: "Explore services",
          url: "{baseUrl}/en/client/services",
        },
        footer: "Thank you for your trust. The EcoDeli Team",
      },
    },
    merchant: {
      fr: {
        subject: "Bienvenue parmi nos commerçants",
        title: "Bienvenue chez EcoDeli",
        greeting: "Bonjour {name},",
        message:
          "Votre email a été vérifié avec succès. Pour compléter votre inscription en tant que commerçant, veuillez soumettre les documents suivants pour vérification : extrait K-bis et justificatif d'identité.",
        cta: {
          text: "Télécharger mes documents",
          url: "{baseUrl}/fr/merchant/profile",
        },
        footer: "Merci de votre confiance. L'équipe EcoDeli",
      },
      en: {
        subject: "Welcome to our merchants",
        title: "Welcome to EcoDeli",
        greeting: "Hello {name},",
        message:
          "Your email has been successfully verified. To complete your registration as a merchant, please submit the following documents for verification: business registration and proof of identity.",
        cta: {
          text: "Upload my documents",
          url: "{baseUrl}/en/merchant/profile",
        },
        footer: "Thank you for your trust. The EcoDeli Team",
      },
    },
  },

  // Email de réinitialisation de mot de passe
  passwordReset: {
    fr: {
      subject: "Réinitialisation de votre mot de passe",
      title: "Réinitialisation de mot de passe",
      greeting: "Bonjour {name},",
      message:
        "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.",
      cta: {
        text: "Réinitialiser mon mot de passe",
        url: "{resetUrl}",
      },
      footer:
        "Si vous n'avez pas demandé la réinitialisation de votre mot de passe, ignorez cet email.",
    },
    en: {
      subject: "Reset your password",
      title: "Password Reset",
      greeting: "Hello {name},",
      message:
        "You have requested to reset your password. Click the button below to create a new password.",
      cta: {
        text: "Reset my password",
        url: "{resetUrl}",
      },
      footer:
        "If you did not request a password reset, please ignore this email.",
    },
  },

  // Email de document approuvé
  documentApproved: {
    fr: {
      subject: "Document approuvé",
      title: "Document approuvé",
      greeting: "Bonjour,",
      message:
        'Nous sommes heureux de vous informer que votre document "{documentName}" a été approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités associées à ce document.',
      cta: {
        text: "Voir mes documents",
        url: "{baseUrl}/fr/documents",
      },
      footer: "Merci de votre confiance. L'équipe EcoDeli",
    },
    en: {
      subject: "Document approved",
      title: "Document approved",
      greeting: "Hello,",
      message:
        'We are pleased to inform you that your document "{documentName}" has been approved. You can now access all features associated with this document.',
      cta: {
        text: "View my documents",
        url: "{baseUrl}/en/documents",
      },
      footer: "Thank you for your trust. The EcoDeli Team",
    },
  },

  // Email de document rejeté
  documentRejected: {
    fr: {
      subject: "Document rejeté",
      title: "Document rejeté",
      greeting: "Bonjour,",
      message:
        'Nous regrettons de vous informer que votre document "{documentName}" a été rejeté pour la raison suivante : {reason}. Veuillez télécharger un nouveau document en suivant les instructions fournies.',
      cta: {
        text: "Télécharger un nouveau document",
        url: "{baseUrl}/fr/documents",
      },
      footer:
        "Si vous avez des questions, n'hésitez pas à contacter notre équipe de support.",
    },
    en: {
      subject: "Document rejected",
      title: "Document rejected",
      greeting: "Hello,",
      message:
        'We regret to inform you that your document "{documentName}" has been rejected for the following reason: {reason}. Please upload a new document following the provided instructions.',
      cta: {
        text: "Upload a new document",
        url: "{baseUrl}/en/documents",
      },
      footer:
        "If you have any questions, don't hesitate to contact our support team.",
    },
  },

  // Email de changement de statut de vérification
  verificationStatusChanged: {
    fr: {
      [VerificationStatus.APPROVED]: {
        subject: "Compte approuvé - EcoDeli",
        title: "Votre compte a été approuvé",
        greeting: "Bonjour {name},",
        message:
          "Nous sommes heureux de vous informer que votre compte a été vérifié et approuvé. Vous pouvez maintenant accéder à toutes les fonctionnalités de notre plateforme.",
        cta: {
          text: "Accéder à mon compte",
          url: "{baseUrl}/fr/login",
        },
        footer: "Merci de votre confiance. L'équipe EcoDeli",
      },
      [VerificationStatus.REJECTED]: {
        subject: "Compte non approuvé - EcoDeli",
        title: "Votre compte n'a pas été approuvé",
        greeting: "Bonjour {name},",
        message:
          "Nous regrettons de vous informer que votre compte n'a pas été approuvé pour la raison suivante : {details}. Veuillez mettre à jour vos informations et soumettre à nouveau votre demande.",
        cta: {
          text: "Mettre à jour mon profil",
          url: "{baseUrl}/fr/login",
        },
        footer:
          "Si vous avez des questions, n'hésitez pas à contacter notre équipe de support.",
      },
      [VerificationStatus.PENDING]: {
        subject: "Vérification en cours - EcoDeli",
        title: "Vérification de votre compte en cours",
        greeting: "Bonjour {name},",
        message:
          "Nous vous informons que votre demande de vérification est en cours de traitement. Nous vous notifierons dès que la vérification sera terminée.",
        footer: "Merci de votre patience. L'équipe EcoDeli",
      },
    },
    en: {
      [VerificationStatus.APPROVED]: {
        subject: "Account approved - EcoDeli",
        title: "Your account has been approved",
        greeting: "Hello {name},",
        message:
          "We are pleased to inform you that your account has been verified and approved. You can now access all features of our platform.",
        cta: {
          text: "Access my account",
          url: "{baseUrl}/en/login",
        },
        footer: "Thank you for your trust. The EcoDeli Team",
      },
      [VerificationStatus.REJECTED]: {
        subject: "Account not approved - EcoDeli",
        title: "Your account has not been approved",
        greeting: "Hello {name},",
        message:
          "We regret to inform you that your account has not been approved for the following reason: {details}. Please update your information and submit your request again.",
        cta: {
          text: "Update my profile",
          url: "{baseUrl}/en/login",
        },
        footer:
          "If you have any questions, don't hesitate to contact our support team.",
      },
      [VerificationStatus.PENDING]: {
        subject: "Verification in progress - EcoDeli",
        title: "Your account verification is in progress",
        greeting: "Hello {name},",
        message:
          "We inform you that your verification request is being processed. We will notify you as soon as the verification is complete.",
        footer: "Thank you for your patience. The EcoDeli Team",
      },
    },
  },

  // Email de rappel pour documents manquants
  documentReminder: {
    fr: {
      subject: "Rappel : Documents manquants pour compléter votre profil",
      title: "Documents manquants",
      greeting: "Bonjour {name},",
      message:
        "Nous vous rappelons que pour compléter votre profil et accéder à toutes les fonctionnalités, vous devez fournir les documents suivants : {documentsList}.",
      cta: {
        text: "Télécharger mes documents",
        url: "{baseUrl}/fr/documents",
      },
      footer:
        "Si vous avez déjà soumis ces documents, veuillez ignorer cet email. L'équipe EcoDeli",
    },
    en: {
      subject: "Reminder: Missing documents to complete your profile",
      title: "Missing documents",
      greeting: "Hello {name},",
      message:
        "We remind you that to complete your profile and access all features, you must provide the following documents: {documentsList}.",
      cta: {
        text: "Upload my documents",
        url: "{baseUrl}/en/documents",
      },
      footer:
        "If you have already submitted these documents, please ignore this email. The EcoDeli Team",
    },
  },
};

// Fonction pour obtenir le template d'email approprié en fonction de la langue
export const getEmailTemplate = (
  templateName: keyof typeof emailTemplates,
  language: SupportedLanguage = "fr",
): EmailTemplate => {
  const template = emailTemplates[templateName];
  return language === "fr" ? template.fr : template.en;
};

// Fonction pour obtenir le template d'email post-vérification par rôle
export const getPostVerificationTemplate = (
  role: "deliverer" | "provider" | "client" | "merchant",
  language: SupportedLanguage = "fr",
): EmailTemplate => {
  const templates = emailTemplates.postVerification;
  // @ts-ignore
  const template = templates[role];
  return language === "fr" ? template.fr : template.en;
};

// Fonction pour obtenir le template d'email de changement de statut de vérification
export const getVerificationStatusTemplate = (
  status: VerificationStatus,
  language: SupportedLanguage = "fr",
): EmailTemplate => {
  const templates = emailTemplates.verificationStatusChanged[language];
  return templates[status];
};
