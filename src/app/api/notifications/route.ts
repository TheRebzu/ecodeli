import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { NotificationService } from '@/features/notifications/services/notification.service'

const getNotificationsSchema = z.object({
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  unreadOnly: z.string().transform(val => val === 'true').optional(),
  type: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = getNotificationsSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      unreadOnly: searchParams.get('unreadOnly'),
      type: searchParams.get('type')
    })

    const notifications = await NotificationService.getUserNotifications(
      session.user.id,
      params
    )

    const unreadCount = await NotificationService.getUnreadCount(session.user.id)

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      count: notifications.length
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Paramètres invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur récupération notifications:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des notifications'
    }, { status: 500 })
  }
}