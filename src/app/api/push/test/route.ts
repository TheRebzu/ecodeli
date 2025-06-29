import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { OneSignalService } from '@/lib/onesignal'

/**
 * POST - Envoyer une notification de test
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const testMessages = [
      {
        title: '🧪 Notification de test',
        message: 'Vos notifications push fonctionnent parfaitement ! Vous êtes prêt(e) à recevoir les mises à jour EcoDeli.',
        data: { type: 'test', timestamp: new Date().toISOString() }
      },
      {
        title: '✅ Test réussi !',
        message: 'Cette notification confirme que votre appareil est correctement configuré pour recevoir les alertes EcoDeli.',
        data: { type: 'test_success', timestamp: new Date().toISOString() }
      },
      {
        title: '🔔 Configuration validée',
        message: 'Excellent ! Vous recevrez maintenant toutes les notifications importantes de la plateforme EcoDeli.',
        data: { type: 'test_validated', timestamp: new Date().toISOString() }
      }
    ]

    // Choisir un message aléatoire
    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)]

    // Envoyer la notification de test
    const result = await OneSignalService.sendToUser(
      session.user.id,
      randomMessage.title,
      randomMessage.message,
      randomMessage.data,
      {
        buttons: [
          {
            id: 'confirm',
            text: '👍 Reçu !',
            url: '/notifications'
          }
        ]
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Notification de test envoyée',
      notificationId: result.id,
      recipients: result.recipients
    })

  } catch (error) {
    console.error('Error sending test notification:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la notification de test' },
      { status: 500 }
    )
  }
}