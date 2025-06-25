import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { NotificationService } from '@/features/notifications/services/notification.service'

const markReadSchema = z.object({
  notificationId: z.string().cuid().optional(),
  markAll: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAll } = markReadSchema.parse(body)

    if (markAll) {
      await NotificationService.markAllAsRead(session.user.id)
      return NextResponse.json({
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues'
      })
    } else if (notificationId) {
      await NotificationService.markAsRead(notificationId, session.user.id)
      return NextResponse.json({
        success: true,
        message: 'Notification marquée comme lue'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'notificationId ou markAll requis'
      }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Données invalides',
        errors: error.errors
      }, { status: 400 })
    }

    console.error('Erreur marquage notification:', error)
    return NextResponse.json({
      success: false,
      message: 'Erreur lors du marquage de la notification'
    }, { status: 500 })
  }
}