/**
 * Service d'email mock pour le développement
 * Simule l'envoi d'emails sans vraiment les envoyer
 */
export class EmailServiceMock {
  /**
   * Simuler l'envoi d'un email de reset de mot de passe
   */
  static async sendPasswordResetEmail(email: string, resetUrl: string, locale: string = 'fr') {
    // En mode développement, on simule l'envoi et on log dans la console
    if (process.env.NODE_ENV === 'development') {
      // ... existing code ...
    }
    
    return { success: true, messageId: 'mock-id' }
  }

  /**
   * Simuler l'envoi d'un email de vérification
   */
  static async sendVerificationEmail(email: string, verificationUrl: string, locale: string = 'fr') {
    // En mode développement, on simule l'envoi et on log dans la console
    if (process.env.NODE_ENV === 'development') {
      // ... existing code ...
    }
    
    return { success: true, messageId: 'mock-id' }
  }
} 