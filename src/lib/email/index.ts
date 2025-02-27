/**
 * Point d'entrée principal pour le service d'email
 * Exporte les fonctions et classes nécessaires
 */

import { EmailService } from './mailgun';
import * as EmailTemplates from './templates';

// Exporte le service et les templates
export { EmailService, EmailTemplates };

/**
 * Fonctions utilitaires pour les emails
 */

/**
 * Génère un lien de vérification d'email
 */
export function generateVerificationLink(token: string, baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Génère un lien de réinitialisation de mot de passe
 */
export function generatePasswordResetLink(token: string, baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Génère un lien de suivi de livraison
 */
export function generateTrackingLink(deliveryId: string, baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/track/${encodeURIComponent(deliveryId)}`;
}

/**
 * Génère un lien de téléchargement de facture
 */
export function generateInvoiceDownloadLink(invoiceId: string, baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'): string {
  return `${baseUrl}/invoices/${encodeURIComponent(invoiceId)}/download`;
}

/**
 * Masque partiellement une adresse email pour affichage sécurisé
 * Exemple: j***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');

  if (localPart.length <= 1) {
    return `${localPart}***@${domain}`;
  }

  const firstChar = localPart[0];
  const maskedLocalPart = `${firstChar}${'*'.repeat(Math.min(localPart.length - 1, 3))}`;

  return `${maskedLocalPart}@${domain}`;
}