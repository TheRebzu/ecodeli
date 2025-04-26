/**
 * Interface pour le service d'email
 */
export interface EmailService {
  /**
   * Envoie un email de bienvenue à un nouvel utilisateur
   */
  sendWelcomeEmail(email: string, name: string): Promise<void>;
  
  /**
   * Envoie un email de vérification pour confirmer l'adresse email
   */
  sendVerificationEmail(email: string, verificationToken: string): Promise<void>;
  
  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  sendPasswordResetEmail(email: string, resetToken: string): Promise<void>;
  
  /**
   * Envoie une notification d'approbation de document
   */
  sendDocumentApprovedEmail(email: string, documentName: string, documentType: string): Promise<void>;
  
  /**
   * Envoie une notification de rejet de document
   */
  sendDocumentRejectedEmail(email: string, documentName: string, documentType: string, reason: string): Promise<void>;

  /**
   * Envoie une confirmation de livraison
   */
  sendDeliveryConfirmation(to: string, deliveryId: string): Promise<void>;

  /**
   * Envoie une facture par email
   */
  sendInvoiceEmail(to: string, invoiceId: string, pdfBuffer: Buffer): Promise<void>;
} 