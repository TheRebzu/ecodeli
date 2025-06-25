import Mailgun from 'mailgun.js'
import formData from 'form-data'

/**
 * Configuration Mailgun
 */
const mailgun = new Mailgun(formData)
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
})

/**
 * Service d'envoi d'emails
 */
export class EmailService {
  /**
   * Envoyer un email de vérification
   */
  static async sendVerificationEmail(email: string, verificationUrl: string, locale: string = 'fr') {
    const subject = locale === 'fr' 
      ? '🔐 Vérifiez votre email - EcoDeli'
      : '🔐 Verify your email - EcoDeli'
    
    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
          .button { display: inline-block; background: #16a34a; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
          </div>
          
          <h2>${locale === 'fr' ? 'Vérifiez votre adresse email' : 'Verify your email address'}</h2>
          
          <p>${locale === 'fr' 
            ? 'Merci de vous être inscrit sur EcoDeli ! Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :'
            : 'Thank you for signing up with EcoDeli! To activate your account, please click the button below:'
          }</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">
              ${locale === 'fr' ? '✅ Vérifier mon email' : '✅ Verify my email'}
            </a>
          </div>
          
          <p>${locale === 'fr' 
            ? 'Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :'
            : 'If the button doesn\'t work, copy and paste this link into your browser:'
          }</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          
          <div class="footer">
            <p>${locale === 'fr' 
              ? 'Cet email a été envoyé automatiquement, merci de ne pas y répondre.'
              : 'This email was sent automatically, please do not reply.'
            }</p>
            <p>© 2025 EcoDeli - ${locale === 'fr' ? 'Livraison écologique' : 'Eco-friendly delivery'}</p>
          </div>
        </div>
      </body>
      </html>
    `

    const messageData = {
      from: process.env.MAILGUN_FROM_EMAIL || 'noreply@ecodeli.me',
      to: email,
      subject,
      html
    }

    try {
      const result = await mg.messages.create(process.env.MAILGUN_DOMAIN || '', messageData)
      console.log('✅ Email de vérification envoyé:', result)
      return { success: true, messageId: result.id }
    } catch (error) {
      console.error('❌ Erreur envoi email:', error)
      throw error
    }
  }

  /**
   * Envoyer un email de reset de mot de passe
   */
  static async sendPasswordResetEmail(email: string, resetUrl: string, locale: string = 'fr') {
    const subject = locale === 'fr' 
      ? '🔑 Réinitialisation de votre mot de passe - EcoDeli'
      : '🔑 Password reset - EcoDeli'
    
    const html = `
      <!DOCTYPE html>
      <html lang="${locale}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #16a34a; }
          .button { display: inline-block; background: #dc2626; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 EcoDeli</div>
          </div>
          
          <h2>${locale === 'fr' ? 'Réinitialisation de votre mot de passe' : 'Password reset'}</h2>
          
          <p>${locale === 'fr' 
            ? 'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :'
            : 'You have requested a password reset. Click the button below to create a new password:'
          }</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">
              ${locale === 'fr' ? '🔑 Réinitialiser mon mot de passe' : '🔑 Reset my password'}
            </a>
          </div>
          
          <p>${locale === 'fr' 
            ? 'Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.'
            : 'If you didn\'t request this reset, please ignore this email.'
          }</p>
          
          <div class="footer">
            <p>${locale === 'fr' 
              ? 'Ce lien expirera dans 24 heures pour votre sécurité.'
              : 'This link will expire in 24 hours for your security.'
            }</p>
            <p>© 2025 EcoDeli - ${locale === 'fr' ? 'Livraison écologique' : 'Eco-friendly delivery'}</p>
          </div>
        </div>
      </body>
      </html>
    `

    const messageData = {
      from: process.env.MAILGUN_FROM_EMAIL || 'noreply@ecodeli.me',
      to: email,
      subject,
      html
    }

    try {
      const result = await mg.messages.create(process.env.MAILGUN_DOMAIN || '', messageData)
      console.log('✅ Email de reset envoyé:', result)
      return { success: true, messageId: result.id }
    } catch (error) {
      console.error('❌ Erreur envoi email:', error)
      throw error
    }
  }
} 