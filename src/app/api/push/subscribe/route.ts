import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { OneSignalService } from '@/lib/onesignal'

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string(),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string()
    })
  }),
  settings: z.object({
    enabled: z.boolean().default(true),
    deliveryUpdates: z.boolean().default(true),
    newOpportunities: z.boolean().default(true),
    paymentNotifications: z.boolean().default(true),
    systemAlerts: z.boolean().default(true),
    marketing: z.boolean().default(false),
    soundEnabled: z.boolean().default(true),
    vibrationEnabled: z.boolean().default(true)
  }).optional()
})

/**
 * POST - S'abonner aux notifications push
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = subscribeSchema.parse(body)

    // Enregistrer ou mettre à jour l'abonnement push
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId: session.user.id
      },
      create: {
        userId: session.user.id,
        endpoint: validatedData.subscription.endpoint,
        p256dh: validatedData.subscription.keys.p256dh,
        auth: validatedData.subscription.keys.auth,
        expirationTime: validatedData.subscription.expirationTime ? 
          new Date(validatedData.subscription.expirationTime) : null,
        isActive: true
      },
      update: {
        endpoint: validatedData.subscription.endpoint,
        p256dh: validatedData.subscription.keys.p256dh,
        auth: validatedData.subscription.keys.auth,
        expirationTime: validatedData.subscription.expirationTime ? 
          new Date(validatedData.subscription.expirationTime) : null,
        isActive: true,
        updatedAt: new Date()
      }
    })

    // Enregistrer les préférences de notification
    if (validatedData.settings) {
      await prisma.userNotificationSettings.upsert({
        where: {
          userId: session.user.id
        },
        create: {
          userId: session.user.id,
          ...validatedData.settings
        },
        update: {
          ...validatedData.settings,
          updatedAt: new Date()
        }
      })
    }

    // Créer/mettre à jour l'utilisateur dans OneSignal
    try {
      await OneSignalService.upsertUser(session.user.id, {
        tags: {
          role: session.user.role || 'CLIENT',
          platform: 'web',
          subscribed_at: new Date().toISOString()
        },
        language: 'fr',
        timezone: 'Europe/Paris',
        email: session.user.email
      })
    } catch (error) {
      console.warn('Failed to update OneSignal user:', error)
    }

    // Envoyer une notification de bienvenue
    try {
      await OneSignalService.sendToUser(
        session.user.id,
        '🎉 Notifications activées !',
        'Vous recevrez maintenant des notifications en temps réel pour vos livraisons et services EcoDeli.',
        {
          type: 'welcome',
          action: 'subscription_confirmed'
        }
      )
    } catch (error) {
      console.warn('Failed to send welcome notification:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Abonnement aux notifications push enregistré',
      subscriptionId: pushSubscription.id
    })

  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'abonnement aux notifications' },
      { status: 500 }
    )
  }
}