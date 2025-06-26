import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { host, port, user, password, secure, fromAddress } = body

    // Validation des paramètres
    if (!host || !port || !user || !password || !fromAddress) {
      return NextResponse.json(
        { error: 'Tous les paramètres SMTP sont requis' },
        { status: 400 }
      )
    }

    // Configuration du transporteur de test
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === true, // true pour 465, false pour 587
      requireTLS: true,
      auth: {
        user,
        pass: password
      },
      tls: {
        rejectUnauthorized: false // Pour les tests
      }
    })

    // Test de connexion
    console.log('🔍 Test de connexion SMTP...')
    await transporter.verify()
    console.log('✅ Connexion SMTP réussie')

    // Test d'envoi d'email
    console.log('📧 Test d\'envoi d\'email...')
    
    const testEmail = {
      from: fromAddress,
      to: fromAddress, // Envoi à soi-même pour le test
      subject: '🧪 Test SMTP EcoDeli - ' + new Date().toISOString(),
      html: `
        <h2>Test SMTP EcoDeli</h2>
        <p>Ceci est un email de test pour vérifier la configuration SMTP.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Host:</strong> ${host}</p>
        <p><strong>Port:</strong> ${port}</p>
        <p><strong>Secure:</strong> ${secure ? 'Oui' : 'Non'}</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Cet email a été envoyé automatiquement par le test SMTP d'EcoDeli.
        </p>
      `,
      text: `
Test SMTP EcoDeli

Ceci est un email de test pour vérifier la configuration SMTP.

Date: ${new Date().toLocaleString('fr-FR')}
Host: ${host}
Port: ${port}
Secure: ${secure ? 'Oui' : 'Non'}

Cet email a été envoyé automatiquement par le test SMTP d'EcoDeli.
      `
    }

    const result = await transporter.sendMail(testEmail)
    
    console.log('✅ Email de test envoyé avec succès')
    console.log('   Message ID:', result.messageId)
    console.log('   À:', result.accepted.join(', '))

    return NextResponse.json({
      success: true,
      message: 'Configuration SMTP testée avec succès',
      details: {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors du test SMTP:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors du test SMTP',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
} 