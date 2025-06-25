import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour marquer notifications comme lues
const markReadSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1),
  markAll: z.boolean().default(false)
})

// Schema pour préférences notifications
const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  announcementMatch: z.boolean().optional(),
  deliveryUpdates: z.boolean().optional(),
  paymentUpdates: z.boolean().optional(),
  marketingEmails: z.boolean().optional()
})

// GET - Liste des notifications du client
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type')

    const where: any = { userId: session.user.id }
    if (unreadOnly) where.isRead = false
    if (type) where.type = type

    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      }),
      prisma.notification.count({ where })
    ])

    // Grouper par type pour statistiques
    const typeStats = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId: session.user.id },
      _count: { id: true }
    })

    return NextResponse.json({
      notifications: notifications.map(notif => ({
        ...notif,
        timeAgo: getTimeAgo(notif.createdAt),
        priority: getNotificationPriority(notif.type),
        category: getNotificationCategory(notif.type)
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats: {
        unreadCount,
        totalCount,
        byType: typeStats.reduce((acc, stat) => {
          acc[stat.type] = stat._count.id
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching notifications')
  }
}

// POST - Marquer notifications comme lues
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = markReadSchema.parse(body)

    if (validatedData.markAll) {
      // Marquer toutes les notifications comme lues
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Toutes les notifications ont été marquées comme lues'
      })
    } else {
      // Marquer notifications spécifiques
      const updated = await prisma.notification.updateMany({
        where: {
          id: { in: validatedData.notificationIds },
          userId: session.user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: `${updated.count} notification(s) marquée(s) comme lue(s)`,
        updatedCount: updated.count
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'marking notifications as read')
  }
}

// PUT - Mettre à jour les préférences de notifications
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updatePreferencesSchema.parse(body)

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: validatedData,
      create: {
        userId: session.user.id,
        ...validatedData
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Préférences mises à jour avec succès',
      preferences
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'updating notification preferences')
  }
}

// Fonctions utilitaires
function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`
  return 'À l\'instant'
}

function getNotificationPriority(type: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  const highPriority = ['DELIVERY_EMERGENCY', 'PAYMENT_FAILED', 'ACCOUNT_SUSPENDED']
  const mediumPriority = ['ANNOUNCEMENT_MATCH', 'DELIVERY_UPDATE', 'BOOKING_CONFIRMED']
  
  if (highPriority.includes(type)) return 'HIGH'
  if (mediumPriority.includes(type)) return 'MEDIUM'
  return 'LOW'
}

function getNotificationCategory(type: string): string {
  if (type.startsWith('DELIVERY_')) return 'deliveries'
  if (type.startsWith('PAYMENT_')) return 'payments'
  if (type.startsWith('BOOKING_')) return 'bookings'
  if (type.startsWith('ANNOUNCEMENT_')) return 'announcements'
  return 'general'
} 