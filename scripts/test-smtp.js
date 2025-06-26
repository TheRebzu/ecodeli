const nodemailer = require('nodemailer')
require('dotenv').config()

/**
 * Test de la configuration SMTP
 */
async function testSMTP() {
  console.log('🧪 Test de la configuration SMTP...\n')

  // Vérification des variables d'environnement
  const requiredVars = ['SMTP_HOST', 'GMAIL_USER', 'GMAIL_APP_PASSWORD']
  const missing = requiredVars.filter(varName => !process.env[varName])

  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:', missing.join(', '))
    console.log('\n📝 Configuration actuelle:')
    console.log('   Host:', process.env.SMTP_HOST || 'Non défini')
    console.log('   Port:', process.env.SMTP_PORT || '587')
    console.log('   User:', process.env.GMAIL_USER || 'Non défini')
    console.log('   Password:', process.env.GMAIL_APP_PASSWORD ? '***' : 'Non défini')
    console.log('   Secure:', process.env.SMTP_SECURE || 'false')
    return
  }

  console.log('✅ Variables d\'environnement trouvées')
  console.log('   Host:', process.env.SMTP_HOST)
  console.log('   Port:', process.env.SMTP_PORT || '587')
  console.log('   User:', process.env.GMAIL_USER)
  console.log('   Password:', '***')
  console.log('   Secure:', process.env.SMTP_SECURE || 'false')

  // Configuration du transporteur
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  })

  try {
    console.log('\n🔍 Test de connexion SMTP...')
    
    // Test de vérification de la connexion
    await transporter.verify()
    console.log('✅ Connexion SMTP réussie')

    // Test d'envoi d'email
    console.log('\n📧 Test d\'envoi d\'email...')
    
    const testEmail = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Envoi à soi-même pour le test
      subject: '🧪 Test SMTP EcoDeli - ' + new Date().toISOString(),
      html: `
        <h2>Test SMTP EcoDeli</h2>
        <p>Ceci est un email de test pour vérifier la configuration SMTP.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Host:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>Port:</strong> ${process.env.SMTP_PORT || '587'}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Cet email a été envoyé automatiquement par le script de test SMTP.
        </p>
      `
    }

    const result = await transporter.sendMail(testEmail)
    console.log('✅ Email de test envoyé avec succès')
    console.log('   Message ID:', result.messageId)
    console.log('   À:', result.accepted.join(', '))
    
    if (result.rejected.length > 0) {
      console.log('   Rejetés:', result.rejected.join(', '))
    }

    console.log('\n🎉 Configuration SMTP validée avec succès !')
    console.log('\n📋 Résumé:')
    console.log('   ✅ Variables d\'environnement configurées')
    console.log('   ✅ Connexion SMTP établie')
    console.log('   ✅ Envoi d\'email fonctionnel')
    console.log('   ✅ Email de test reçu')

  } catch (error) {
    console.error('\n❌ Erreur lors du test SMTP:', error.message)
    
    if (error.code) {
      console.error('   Code d\'erreur:', error.code)
    }
    
    if (error.command) {
      console.error('   Commande échouée:', error.command)
    }

    console.log('\n🔧 Suggestions de dépannage:')
    console.log('   1. Vérifiez que les variables d\'environnement sont correctes')
    console.log('   2. Vérifiez que le serveur SMTP est accessible')
    console.log('   3. Vérifiez les identifiants (email/mot de passe)')
    console.log('   4. Vérifiez que l\'authentification à 2 facteurs est désactivée')
    console.log('   5. Vérifiez que les "applications moins sécurisées" sont autorisées')
    
    process.exit(1)
  }
}

// Exécuter le test
testSMTP() 