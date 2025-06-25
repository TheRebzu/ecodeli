import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour création de notification
const createNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  type: z.enum([
    'DELIVERY_OPPORTUNITY', 'DELIVERY_ASSIGNED', 'DELIVERY_COMPLETED',
    'DOCUMENT_VALIDATED', 'DOCUMENT_REJECTED', 'PAYMENT_RECEIVED',
    'ACCOUNT_APPROVED', 'ACCOUNT_REJECTED', 'SYSTEM_ANNOUNCEMENT',
    'SERVICE_BOOKING', 'CONTRACT_SIGNED', 'INVOICE_GENERATED'
  ]),
  targetUserId: z.string().cuid().optional(),
  targetRole: z.enum(['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER', 'ADMIN']).optional(),
  data: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
  actionButtons: z.array(z.object({
    label: z.string().max(20),
    action: z.string(),
    url: z.string().url().optional()
  })).max(3).optional()
})

// Schema pour mise à jour du statut de notification
const updateNotificationSchema = z.object({
  status: z.enum(['READ', 'unread', 'archived']),
  notificationIds: z.array(z.string().cuid()).min(1).max(100)
})

// Schema pour paramètres de notification
const notificationSettingsSchema = z.object({
  deliveryUpdates: z.boolean().default(true),
  paymentNotifications: z.boolean().default(true),
  documentValidation: z.boolean().default(true),
  systemAnnouncements: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false)
})

// GET - Récupérer les notifications de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'read', 'unread', 'all'
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire les filtres
    const whereConditions: any = {
      userId: session.user.id
    }

    if (status && status !== 'all') {
      whereConditions.status = status.toUpperCase()
    }

    if (type) {
      whereConditions.type = type
    }

    // Récupérer les notifications
    const notifications = await prisma.notification.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        status: true,
        data: true,
        actionButtons: true,
        createdAt: true,
        readAt: true,
        scheduledFor: true
      }
    })

    // Récupérer les statistiques
    const stats = await prisma.notification.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true }
    })

    const statsFormatted = {
      total: stats.reduce((sum, stat) => sum + stat._count.status, 0),
      unread: stats.find(s => s.status === 'UNREAD')?._count.status || 0,
      read: stats.find(s => s.status === 'READ')?._count.status || 0,
      archived: stats.find(s => s.status === 'ARCHIVED')?._count.status || 0
    }

    // Récupérer les paramètres de notification de l'utilisateur
    const userSettings = await prisma.notificationSettings.findUnique({
      where: { userId: session.user.id }
    })

    return NextResponse.json({
      notifications: notifications.map(notif => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data as string) : null,
        actionButtons: notif.actionButtons ? JSON.parse(notif.actionButtons as string) : null,
        isNew: notif.status === 'UNREAD' && 
               notif.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernier 24h
      })),
      stats: statsFormatted,
      settings: userSettings || getDefaultNotificationSettings(),
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching notifications')
  }
}

// POST - Créer une nouvelle notification (Admin uniquement pour notifications système)
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

    // Vérifier les permissions
    const isSystemNotification = validatedData.type === 'SYSTEM_ANNOUNCEMENT'
    if (isSystemNotification && session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Admin only for system notifications' 
      }, { status: 403 })
    }

    // Déterminer les destinataires
    let targetUserIds: string[] = []

    if (validatedData.targetUserId) {
      // Notification à un utilisateur spécifique
      targetUserIds = [validatedData.targetUserId]
    } else if (validatedData.targetRole) {
      // Notification à tous les utilisateurs d'un rôle
      const users = await prisma.user.findMany({
        where: { role: validatedData.targetRole },
        select: { id: true }
      })
      targetUserIds = users.map(user => user.id)
    } else {
      return NextResponse.json({
        error: 'Either targetUserId or targetRole must be specified'
      }, { status: 400 })
    }

    // Créer les notifications pour tous les destinataires
    const notifications = await prisma.notification.createMany({
      data: targetUserIds.map(userId => ({
        userId,
        title: validatedData.title,
        message: validatedData.message,
        type: validatedData.type,
        data: validatedData.data ? JSON.stringify(validatedData.data) : null,
        actionButtons: validatedData.actionButtons ? JSON.stringify(validatedData.actionButtons) : null,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : null,
        createdBy: session.user.id
      }))
    })

    // Envoyer les notifications push via OneSignal (si pas programmées)
    if (!validatedData.scheduledFor) {
      await sendPushNotifications(targetUserIds, {
        title: validatedData.title,
        message: validatedData.message,
        data: validatedData.data,
        actionButtons: validatedData.actionButtons
      })
    }

    // Log de l'action pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'NOTIFICATION_SENT',
        entity: 'Notification',
        details: {
          type: validatedData.type,
          recipientCount: targetUserIds.length,
          targetRole: validatedData.targetRole,
          scheduled: !!validatedData.scheduledFor
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Notifications created successfully',
      notificationsSent: notifications.count,
      recipients: targetUserIds.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'creating notification')
  }
}

// PATCH - Mettre à jour le statut des notifications
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateNotificationSchema.parse(body)

    // Vérifier que les notifications appartiennent à l'utilisateur
    const notifications = await prisma.notification.findMany({
      where: {
        id: { in: validatedData.notificationIds },
        userId: session.user.id
      },
      select: { id: true }
    })

    if (notifications.length !== validatedData.notificationIds.length) {
      return NextResponse.json({
        error: 'Some notifications not found or access denied'
      }, { status: 404 })
    }

    // Mettre à jour les notifications
    const updateData: any = {
      status: validatedData.status.toUpperCase()
    }

    if (validatedData.status === 'read') {
      updateData.readAt = new Date()
    }

    const updatedNotifications = await prisma.notification.updateMany({
      where: {
        id: { in: validatedData.notificationIds },
        userId: session.user.id
      },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: `${updatedNotifications.count} notifications updated`,
      updatedCount: updatedNotifications.count
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'updating notifications')
  }
}

// PUT - Mettre à jour les paramètres de notification
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = notificationSettingsSchema.parse(body)

    // Mettre à jour ou créer les paramètres
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: session.user.id },
      update: validatedData,
      create: {
        userId: session.user.id,
        ...validatedData
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated',
      settings
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'updating notification settings')
  }
}

// DELETE - Supprimer des notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationIds = searchParams.get('ids')?.split(',') || []

    if (notificationIds.length === 0) {
      return NextResponse.json({
        error: 'No notification IDs provided'
      }, { status: 400 })
    }

    // Supprimer les notifications (uniquement celles de l'utilisateur)
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id
      }
    })

    return NextResponse.json({
      success: true,
      message: `${deletedNotifications.count} notifications deleted`,
      deletedCount: deletedNotifications.count
    })

  } catch (error) {
    return handleApiError(error, 'deleting notifications')
  }
}

// Fonction pour envoyer les notifications push via OneSignal
async function sendPushNotifications(userIds: string[], notificationData: any) {
  try {
    const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID

    if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
      console.warn('OneSignal not configured, skipping push notifications')
      return
    }

    // Récupérer les player IDs des utilisateurs
    const userTokens = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { 
        id: true, 
        pushNotificationToken: true,
        notificationSettings: {
          select: { pushNotifications: true }
        }
      }
    })

    const playerIds = userTokens
      .filter(user => user.pushNotificationToken && 
                     (user.notificationSettings?.pushNotifications !== false))
      .map(user => user.pushNotificationToken)

    if (playerIds.length === 0) {
      console.log('No valid push notification tokens found')
      return
    }

    // Préparer le payload OneSignal
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: notificationData.title },
      contents: { en: notificationData.message },
      data: notificationData.data || {},
      ...(notificationData.actionButtons && {
        buttons: notificationData.actionButtons.map((btn: any) => ({
          id: btn.action,
          text: btn.label,
          url: btn.url
        }))
      })
    }

    // Envoyer via OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error('OneSignal API error:', await response.text())
    } else {
      console.log('Push notifications sent successfully')
    }

  } catch (error) {
    console.error('Error sending push notifications:', error)
  }
}

// Paramètres de notification par défaut
function getDefaultNotificationSettings() {
  return {
    deliveryUpdates: true,
    paymentNotifications: true,
    documentValidation: true,
    systemAnnouncements: true,
    marketingEmails: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false
  }
}