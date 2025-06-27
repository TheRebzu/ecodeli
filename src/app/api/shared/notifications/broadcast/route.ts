import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { NotificationService } from '@/features/notifications/services/notification.service'

const broadcastSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  message: z.string().min(1, 'Message requis'),
  target: z.enum(['all', 'deliverers', 'providers', 'clients', 'merchants']),
  data: z.record(z.any()).optional(),
  sendPush: z.boolean().default(true)
})

const maintenanceSchema = z.object({
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  description: z.string().optional()
})

/**
 * POST - Diffuser une notification à un groupe d'utilisateurs
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, message, target, data, sendPush } = broadcastSchema.parse(body)

    let result

    switch (target) {
      case 'all':
        // Envoyer à tous les utilisateurs actifs
        const allUsers = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        })

        result = await NotificationService.createBulkNotifications({
          userIds: allUsers.map(u => u.id),
          type: 'ADMIN_BROADCAST',
          title,
          message,
          data,
          sendPush
        })
        break

      case 'deliverers':
        result = await NotificationService.notifyAllDeliverers(title, message, data)
        break

      case 'providers':
        result = await NotificationService.notifyAllProviders(title, message, data)
        break

      case 'clients':
        const clients = await prisma.client.findMany({
          include: { user: true }
        })
        result = await NotificationService.createBulkNotifications({
          userIds: clients.map(c => c.user.id),
          type: 'ADMIN_BROADCAST',
          title,
          message,
          data,
          sendPush
        })
        break

      case 'merchants':
        const merchants = await prisma.merchant.findMany({
          include: { user: true }
        })
        result = await NotificationService.createBulkNotifications({
          userIds: merchants.map(m => m.user.id),
          type: 'ADMIN_BROADCAST',
          title,
          message,
          data,
          sendPush
        })
        break
    }

    return NextResponse.json({
      success: true,
      message: `Notification diffusée avec succès vers ${target}`,
      result
    })

  } catch (error) {
    console.error('Error broadcasting notification:', error)
    
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
      { error: 'Erreur lors de la diffusion de la notification' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Programmer une notification de maintenance
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startTime, endTime, description } = maintenanceSchema.parse(body)

    await NotificationService.notifySystemMaintenance(startTime, endTime, description)

    return NextResponse.json({
      success: true,
      message: 'Notification de maintenance programmée avec succès'
    })

  } catch (error) {
    console.error('Error scheduling maintenance notification:', error)
    
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
      { error: 'Erreur lors de la programmation de la maintenance' },
      { status: 500 }
    )
  }
}