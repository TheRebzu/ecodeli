// Webhook OneSignal pour recevoir les événements de notifications
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const oneSignalWebhookSchema = z.object({
  event: z.enum(['sent', 'clicked', 'notification_opened']),
  id: z.string(),
  userId: z.string().optional(),
  external_user_id: z.string().optional(),
  url: z.string().optional(),
  button_id: z.string().optional(),
  timestamp: z.number(),
  app_id: z.string()
})

export async function POST(request: NextRequest) {
  try {
    // Vérification de l'authentification webhook (optionnel)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.ONESIGNAL_WEBHOOK_SECRET
    
    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validation du payload OneSignal
    const validation = oneSignalWebhookSchema.safeParse(body)
    if (!validation.success) {
      console.error('OneSignal webhook: payload invalide', validation.error)
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const data = validation.data
    const userId = data.external_user_id || data.userId

    // Traitement selon le type d'événement
    switch (data.event) {
      case 'sent':
        await handleNotificationSent(data.id, userId, data.timestamp)
        break
        
      case 'clicked':
      case 'notification_opened':
        await handleNotificationOpened(data.id, userId, data.url, data.button_id, data.timestamp)
        break
        
      default:
        console.log(`OneSignal webhook: événement non géré: ${data.event}`)
    }

    // Log de l'événement pour analytics
    if (userId) {
      await prisma.analytics.create({
        data: {
          type: 'NOTIFICATION',
          entity: 'USER',
          entityId: userId,
          action: data.event.toUpperCase(),
          metadata: {
            notificationId: data.id,
            url: data.url,
            buttonId: data.button_id,
            timestamp: data.timestamp
          },
          date: new Date(data.timestamp * 1000),
          period: 'DAILY'
        }
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('OneSignal webhook error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

async function handleNotificationSent(notificationId: string, userId?: string, timestamp?: number) {
  try {
    if (!userId) return

    // Marquer la notification comme envoyée
    await prisma.notification.updateMany({
      where: {
        userId,
        data: {
          path: ['oneSignalId'],
          equals: notificationId
        }
      },
      data: {
        pushSentAt: new Date(timestamp ? timestamp * 1000 : Date.now())
      }
    })

    console.log(`Notification ${notificationId} envoyée à ${userId}`)
  } catch (error) {
    console.error('Erreur handleNotificationSent:', error)
  }
}

async function handleNotificationOpened(
  notificationId: string, 
  userId?: string, 
  url?: string, 
  buttonId?: string, 
  timestamp?: number
) {
  try {
    if (!userId) return

    // Marquer la notification comme ouverte/cliquée
    await prisma.notification.updateMany({
      where: {
        userId,
        data: {
          path: ['oneSignalId'],
          equals: notificationId
        }
      },
      data: {
        isRead: true,
        readAt: new Date(timestamp ? timestamp * 1000 : Date.now())
      }
    })

    // Actions spécifiques selon le bouton cliqué
    if (buttonId) {
      await handleButtonAction(userId, buttonId, url, notificationId)
    }

    console.log(`Notification ${notificationId} ouverte par ${userId}${buttonId ? ` (bouton: ${buttonId})` : ''}`)
  } catch (error) {
    console.error('Erreur handleNotificationOpened:', error)
  }
}

async function handleButtonAction(userId: string, buttonId: string, url?: string, notificationId?: string) {
  try {
    // Actions automatiques selon le bouton cliqué
    switch (buttonId) {
      case 'accept':
        // Si c'est une acceptation de livraison/booking, logger l'événement
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'QUICK_ACCEPT',
            metadata: {
              source: 'push_notification',
              notificationId,
              url
            }
          }
        })
        break

      case 'view':
      case 'track':
        // Actions de visualisation - juste pour analytics
        await prisma.activityLog.create({
          data: {
            userId,
            action: 'NOTIFICATION_VIEW',
            metadata: {
              buttonId,
              notificationId,
              url
            }
          }
        })
        break

      default:
        console.log(`Action de bouton non gérée: ${buttonId}`)
    }
  } catch (error) {
    console.error('Erreur handleButtonAction:', error)
  }
}

// Support pour les requêtes GET (vérification de santé)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'OK',
    service: 'OneSignal Webhook',
    timestamp: new Date().toISOString()
  })
}