/**
 * Fonctions utilitaires pour l'envoi d'emails liés à l'authentification
 */

import { prisma } from "@/lib/prisma";
import {
  EmailService,
  EmailTemplates,
  generateVerificationLink,
  generatePasswordResetLink
} from "@/lib/email";
import type { User } from "@prisma/client";

/**
 * Envoie un email de bienvenue avec un lien de vérification
 */
export async function sendWelcomeEmail(user: User, token: string): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email");
    }

    const verificationLink = generateVerificationLink(token);
    const firstName = user.firstName || "Utilisateur";

    const { subject, html, text } = EmailTemplates.welcomeEmailTemplate({
      firstName,
      verificationLink
    });

    await EmailService.sendEmail({
      to: user.email,
      subject,
      html,
      text,
      tags: ['welcome', 'signup', 'verification']
    });

    console.log(`Email de bienvenue envoyé à ${user.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de bienvenue:", error);
    throw error;
  }
}

/**
 * Crée un token de vérification et envoie l'email de bienvenue
 */
export async function createVerificationTokenAndSendEmail(user: User): Promise<void> {
  try {
    // Supprimer les tokens existants pour cet utilisateur
    await prisma.verificationToken.deleteMany({
      where: { userId: user.id }
    });

    // Créer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    const verificationToken = await prisma.verificationToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
      },
    });

    // Envoyer l'email de bienvenue
    await sendWelcomeEmail(user, token);
  } catch (error) {
    console.error("Erreur lors de la création du token et de l'envoi de l'email:", error);
    throw error;
  }
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(user: User, token: string): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email");
    }

    const resetLink = generatePasswordResetLink(token);
    const firstName = user.firstName || "Utilisateur";

    const { subject, html, text } = EmailTemplates.passwordResetEmailTemplate({
      firstName,
      resetLink
    });

    await EmailService.sendEmail({
      to: user.email,
      subject,
      html,
      text,
      tags: ['password-reset', 'security']
    });

    console.log(`Email de réinitialisation de mot de passe envoyé à ${user.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
    throw error;
  }
}

/**
 * Crée un token de réinitialisation et envoie l'email correspondant
 */
export async function createResetTokenAndSendEmail(user: User): Promise<void> {
  try {
    // Supprimer les tokens existants pour cet utilisateur
    await prisma.resetToken.deleteMany({
      where: { userId: user.id }
    });

    // Créer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    const resetToken = await prisma.resetToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 heure
      },
    });

    // Envoyer l'email de réinitialisation
    await sendPasswordResetEmail(user, token);
  } catch (error) {
    console.error("Erreur lors de la création du token de réinitialisation et de l'envoi de l'email:", error);
    throw error;
  }
}

/**
 * Envoie un email de confirmation de changement de mot de passe
 */
export async function sendPasswordChangeConfirmationEmail(user: User): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email");
    }

    const firstName = user.firstName || "Utilisateur";
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    await EmailService.sendActionConfirmationEmail(
      user.email,
      firstName,
      "modification de mot de passe",
      `Votre mot de passe a été modifié le ${formattedDate}. Si vous n'êtes pas à l'origine de cette action, veuillez contacter notre support immédiatement.`
    );

    console.log(`Email de confirmation de changement de mot de passe envoyé à ${user.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de confirmation de changement de mot de passe:", error);
    throw error;
  }
}

/**
 * Envoie un email de confirmation de connexion inhabituelle
 */
export async function sendUnusualLoginEmail(
  user: User,
  loginInfo: {
    ip: string;
    location?: string;
    device?: string;
    time: Date;
  }
): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email");
    }

    const firstName = user.firstName || "Utilisateur";
    const formattedDate = loginInfo.time.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const { subject, html, text } = EmailTemplates.securityAlertEmailTemplate({
      firstName,
      alertInfo: {
        type: "Connexion inhabituelle",
        details: "Nous avons détecté une connexion à votre compte depuis un nouvel appareil ou un nouvel emplacement.",
        time: formattedDate,
        location: loginInfo.location,
        device: loginInfo.device,
        ip: loginInfo.ip,
        actionLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/account/security`,
        actionText: "Vérifier l'activité de mon compte"
      }
    });

    await EmailService.sendEmail({
      to: user.email,
      subject,
      html,
      text,
      tags: ['security', 'unusual-login']
    });

    console.log(`Email d'alerte de connexion inhabituelle envoyé à ${user.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email d'alerte de connexion:", error);
    throw error;
  }
}

/**
 * Envoie un email de confirmation d'email
 */
export async function sendEmailVerificationSuccessEmail(user: User): Promise<void> {
  try {
    if (!user.email) {
      throw new Error("L'utilisateur n'a pas d'email");
    }

    const firstName = user.firstName || "Utilisateur";

    await EmailService.sendActionConfirmationEmail(
      user.email,
      firstName,
      "vérification d'email",
      "Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter pleinement des services EcoDeli."
    );

    console.log(`Email de confirmation de vérification envoyé à ${user.email}`);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de confirmation de vérification:", error);
    throw error;
  }
}

/**
 * Utilitaire pour générer un token cryptographiquement sécurisé
 */
const crypto = {
  randomBytes: (size: number): string => {
    const array = new Uint8Array(size);
    if (typeof window === 'undefined') {
      // Environnement serveur
      return require('crypto').randomBytes(size).toString('hex');
    } else {
      // Environnement navigateur
      window.crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  }
};