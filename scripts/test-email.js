require('dotenv').config()

async function testEmail() {
  try {
    console.log('🧪 Test de configuration Mailgun...')
    
    // Vérifier les variables d'environnement
    const requiredVars = [
      'MAILGUN_API_KEY',
      'MAILGUN_DOMAIN', 
      'MAILGUN_FROM_EMAIL'
    ]
    
    const missing = requiredVars.filter(varName => !process.env[varName])
    if (missing.length > 0) {
      console.log('❌ Variables d\'environnement manquantes:', missing)
      return
    }
    
    console.log('✅ Variables d\'environnement présentes')
    console.log('   Domain:', process.env.MAILGUN_DOMAIN)
    console.log('   From:', process.env.MAILGUN_FROM_EMAIL)
    console.log('   API Key:', process.env.MAILGUN_API_KEY?.substring(0, 10) + '...')
    
    // Importer et tester le service email
    const { EmailService } = require('../src/lib/email.ts')
    
    const testEmail = 'test@example.com'
    const testUrl = 'https://ecodeli.com/verify?token=test123'
    
    console.log('📧 Envoi d\'email de test...')
    const result = await EmailService.sendVerificationEmail(testEmail, testUrl, 'fr')
    
    console.log('✅ Email envoyé avec succès!')
    console.log('   Message ID:', result.messageId)
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  }
}

testEmail() 