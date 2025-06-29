import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const settingsSchema = z.object({
  settings: z.object({
    enabled: z.boolean().default(true),
    deliveryUpdates: z.boolean().default(true),
    newOpportunities: z.boolean().default(true),
    paymentNotifications: z.boolean().default(true),
    systemAlerts: z.boolean().default(true),
    marketing: z.boolean().default(false),
    soundEnabled: z.boolean().default(true),
    vibrationEnabled: z.boolean().default(true)
  })
})

/**
 * GET - Récupérer les paramètres de notification de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await prisma.userNotificationSettings.findUnique({
      where: {
        userId: session.user.id
      }
    })

    // Retourner les paramètres par défaut si aucun n'existe
    const defaultSettings = {
      enabled: true,
      deliveryUpdates: true,
      newOpportunities: true,
      paymentNotifications: true,
      systemAlerts: true,
      marketing: false,
      soundEnabled: true,
      vibrationEnabled: true
    }

    return NextResponse.json({
      success: true,
      settings: settings ? {
        enabled: settings.enabled,
        deliveryUpdates: settings.deliveryUpdates,
        newOpportunities: settings.newOpportunities,
        paymentNotifications: settings.paymentNotifications,
        systemAlerts: settings.systemAlerts,
        marketing: settings.marketing,
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled
      } : defaultSettings
    })

  } catch (error) {
    console.error('Error getting notification settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Mettre à jour les paramètres de notification
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = settingsSchema.parse(body)

    // Mettre à jour ou créer les paramètres
    const settings = await prisma.userNotificationSettings.upsert({
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

    return NextResponse.json({
      success: true,
      message: 'Paramètres de notification mis à jour',
      settings: {
        enabled: settings.enabled,
        deliveryUpdates: settings.deliveryUpdates,
        newOpportunities: settings.newOpportunities,
        paymentNotifications: settings.paymentNotifications,
        systemAlerts: settings.systemAlerts,
        marketing: settings.marketing,
        soundEnabled: settings.soundEnabled,
        vibrationEnabled: settings.vibrationEnabled
      }
    })

  } catch (error) {
    console.error('Error updating notification settings:', error)
    
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
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}