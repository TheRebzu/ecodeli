import { SupportedLanguage } from '@/lib/user-locale';
import { DocumentType } from '../db/enums';
import { TRPCError } from '@trpc/server';

/**
 * Service pour l'envoi d'emails
 */
export class EmailService {
  private fromEmail: string;
  private frontendUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ecodeli.me';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    // Simulation d'envoi d'email
    console.log(`Email de bienvenue envoyé à ${email} (${locale})`);
  }

  /**
   * Envoie un email de vérification
   */
  async sendVerificationEmail(
    email: string,
    token: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    // Simulation d'envoi d'email
    console.log(`Email de vérification envoyé à ${email} avec token ${token} (${locale})`);
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    // Simulation d'envoi d'email
    console.log(`Email de réinitialisation envoyé à ${email} avec token ${token} (${locale})`);
  }

  /**
   * Envoie un email de notification d'approbation de document
   */
  async sendDocumentApprovedEmail(
    email: string,
    name: string,
    documentType: DocumentType,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    // Simulation d'envoi d'email
    console.log(`Email d'approbation de document envoyé à ${email} (${locale})`);
  }

  /**
   * Envoie un email de notification de rejet de document
   */
  async sendDocumentRejectedEmail(
    email: string,
    name: string,
    documentType: DocumentType,
    reason: string,
    locale: SupportedLanguage = 'fr'
  ): Promise<void> {
    // Simulation d'envoi d'email
    console.log(`Email de rejet de document envoyé à ${email}: ${reason} (${locale})`);
  }
}
