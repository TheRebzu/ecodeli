/**
 * Service d'email mock pour le développement
 * Simule l'envoi d'emails sans vraiment les envoyer
 */
export class EmailServiceMock {
  /**
   * Simuler l'envoi d'un email de reset de mot de passe
   */
  static async sendPasswordResetEmail(email: string, resetUrl: string, locale: string = 'fr') {
    // En mode développement, on affiche juste le lien dans la console
    console.log('📧 ===============================================')
    console.log('📧 EMAIL DE RESET DE MOT DE PASSE (MODE DEV)')
    console.log('📧 ===============================================')
    console.log(`📧 Destinataire: ${email}`)
    console.log(`📧 Langue: ${locale}`)
    console.log('📧 Contenu:')
    console.log(`📧 Sujet: ${locale === 'fr' ? 'Réinitialisation de votre mot de passe - EcoDeli' : 'Password reset - EcoDeli'}`)
    console.log('📧')
    console.log(`📧 Lien de réinitialisation: ${resetUrl}`)
    console.log('📧')
    console.log('📧 💡 COPIE CE LIEN DANS TON NAVIGATEUR POUR TESTER')
    console.log('📧 ===============================================')

    // Simuler un délai comme un vrai service d'email
    await new Promise(resolve => setTimeout(resolve, 500))

    return { 
      success: true, 
      messageId: 'mock-' + Date.now(),
      message: 'Email simulé envoyé (mode développement)'
    }
  }

  /**
   * Simuler l'envoi d'un email de vérification
   */
  static async sendVerificationEmail(email: string, verificationUrl: string, locale: string = 'fr') {
    console.log('📧 ===============================================')
    console.log('📧 EMAIL DE VÉRIFICATION (MODE DEV)')
    console.log('📧 ===============================================')
    console.log(`📧 Destinataire: ${email}`)
    console.log(`📧 Langue: ${locale}`)
    console.log('📧 Contenu:')
    console.log(`📧 Sujet: ${locale === 'fr' ? 'Vérifiez votre email - EcoDeli' : 'Verify your email - EcoDeli'}`)
    console.log('📧')
    console.log(`📧 Lien de vérification: ${verificationUrl}`)
    console.log('📧')
    console.log('📧 💡 COPIE CE LIEN DANS TON NAVIGATEUR POUR TESTER')
    console.log('📧 ===============================================')

    await new Promise(resolve => setTimeout(resolve, 500))

    return { 
      success: true, 
      messageId: 'mock-' + Date.now(),
      message: 'Email simulé envoyé (mode développement)'
    }
  }
} 