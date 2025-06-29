import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const settings = await db.notificationSettings.findUnique({
      where: { userId: session.user.id }
    })

    if (!settings) {
      // Créer des paramètres par défaut
      const defaultSettings = await db.notificationSettings.create({
        data: {
          userId: session.user.id,
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          soundEnabled: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          deliveryNotifications: true,
          paymentNotifications: true,
          messageNotifications: true,
          systemNotifications: true,
          announcementNotifications: true,
          frequency: 'instant'
        }
      })
      
      return NextResponse.json({
        settings: {
          emailNotifications: defaultSettings.emailNotifications,
          pushNotifications: defaultSettings.pushNotifications,
          smsNotifications: defaultSettings.smsNotifications,
          soundEnabled: defaultSettings.soundEnabled,
          quiet: {
            enabled: defaultSettings.quietHoursEnabled,
            startTime: defaultSettings.quietHoursStart,
            endTime: defaultSettings.quietHoursEnd
          },
          categories: {
            delivery: defaultSettings.deliveryNotifications,
            payment: defaultSettings.paymentNotifications,
            message: defaultSettings.messageNotifications,
            system: defaultSettings.systemNotifications,
            announcement: defaultSettings.announcementNotifications
          },
          frequency: defaultSettings.frequency
        }
      })
    }

    return NextResponse.json({
      settings: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        soundEnabled: settings.soundEnabled,
        quiet: {
          enabled: settings.quietHoursEnabled,
          startTime: settings.quietHoursStart,
          endTime: settings.quietHoursEnd
        },
        categories: {
          delivery: settings.deliveryNotifications,
          payment: settings.paymentNotifications,
          message: settings.messageNotifications,
          system: settings.systemNotifications,
          announcement: settings.announcementNotifications
        },
        frequency: settings.frequency
      }
    })

  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des paramètres' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      emailNotifications,
      pushNotifications,
      smsNotifications,
      soundEnabled,
      quiet,
      categories,
      frequency
    } = body

    const settings = await db.notificationSettings.upsert({
      where: { userId: session.user.id },
      update: {
        emailNotifications,
        pushNotifications,
        smsNotifications,
        soundEnabled,
        quietHoursEnabled: quiet.enabled,
        quietHoursStart: quiet.startTime,
        quietHoursEnd: quiet.endTime,
        deliveryNotifications: categories.delivery,
        paymentNotifications: categories.payment,
        messageNotifications: categories.message,
        systemNotifications: categories.system,
        announcementNotifications: categories.announcement,
        frequency
      },
      create: {
        userId: session.user.id,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        soundEnabled,
        quietHoursEnabled: quiet.enabled,
        quietHoursStart: quiet.startTime,
        quietHoursEnd: quiet.endTime,
        deliveryNotifications: categories.delivery,
        paymentNotifications: categories.payment,
        messageNotifications: categories.message,
        systemNotifications: categories.system,
        announcementNotifications: categories.announcement,
        frequency
      }
    })

    return NextResponse.json({
      settings: {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        smsNotifications: settings.smsNotifications,
        soundEnabled: settings.soundEnabled,
        quiet: {
          enabled: settings.quietHoursEnabled,
          startTime: settings.quietHoursStart,
          endTime: settings.quietHoursEnd
        },
        categories: {
          delivery: settings.deliveryNotifications,
          payment: settings.paymentNotifications,
          message: settings.messageNotifications,
          system: settings.systemNotifications,
          announcement: settings.announcementNotifications
        },
        frequency: settings.frequency
      }
    })

  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}