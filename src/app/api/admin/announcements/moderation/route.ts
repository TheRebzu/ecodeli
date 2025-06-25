import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour actions de modération
const moderationActionSchema = z.object({
  announcementId: z.string().cuid(),
  action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REQUIRE_CHANGES']),
  reason: z.string().min(10).max(1000).optional(),
  requiredChanges: z.array(z.string()).optional(),
  suspensionDuration: z.number().min(1).max(90).optional() // jours
})

// GET - Liste des annonces à modérer
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Récupérer les annonces selon le statut
    const announcements = await prisma.announcement.findMany({
      where: {
        moderationStatus: status,
        ...(priority && {
          priority: priority
        })
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { firstName: true, lastName: true, phone: true }
                }
              }
            }
          }
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit,
      skip: offset
    })

    // Calculer la priorité pour chaque annonce
    const announcementsWithPriority = announcements.map(announcement => {
      let priorityScore = 0
      const hoursOld = (Date.now() - announcement.createdAt.getTime()) / (1000 * 60 * 60)
      
      // Facteurs de priorité
      if (hoursOld > 48) priorityScore += 3 // Anciennes
      if (hoursOld > 24) priorityScore += 2
      if (announcement.urgent) priorityScore += 3
      if (announcement.price > 100) priorityScore += 1 // Valeur élevée
      
      let calculatedPriority = 'MEDIUM'
      if (priorityScore >= 5) calculatedPriority = 'HIGH'
      else if (priorityScore <= 2) calculatedPriority = 'LOW'

      return {
        ...announcement,
        calculatedPriority,
        hoursOld: Math.round(hoursOld),
        clientInfo: {
          name: `${announcement.client.user.profile?.firstName} ${announcement.client.user.profile?.lastName}`,
          email: announcement.client.user.email,
          phone: announcement.client.user.profile?.phone
        },
        riskFactors: analyzeRiskFactors(announcement)
      }
    })

    // Statistiques de modération
    const stats = await getModerationStats()

    return NextResponse.json({
      announcements: announcementsWithPriority,
      stats,
      pagination: {
        total: announcementsWithPriority.length,
        limit,
        offset,
        hasMore: announcementsWithPriority.length === limit
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching announcements for moderation')
  }
}

// POST - Modérer une annonce
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = moderationActionSchema.parse(body)

    // Récupérer l'annonce
    const announcement = await prisma.announcement.findUnique({
      where: { id: validatedData.announcementId },
      include: {
        client: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Vérifier que l'annonce est en attente de modération
    if (announcement.moderationStatus !== 'PENDING') {
      return NextResponse.json({
        error: 'Announcement already moderated',
        currentStatus: announcement.moderationStatus
      }, { status: 409 })
    }

    let newStatus: string
    let newAnnouncementStatus: string = announcement.status

    switch (validatedData.action) {
      case 'APPROVE':
        newStatus = 'APPROVED'
        newAnnouncementStatus = 'ACTIVE'
        break
      case 'REJECT':
        newStatus = 'REJECTED'
        newAnnouncementStatus = 'REJECTED'
        break
      case 'SUSPEND':
        newStatus = 'SUSPENDED'
        newAnnouncementStatus = 'SUSPENDED'
        break
      case 'REQUIRE_CHANGES':
        newStatus = 'REQUIRES_CHANGES'
        newAnnouncementStatus = 'DRAFT'
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Calculer la date de fin de suspension si applicable
    const suspensionEnd = validatedData.suspensionDuration
      ? new Date(Date.now() + validatedData.suspensionDuration * 24 * 60 * 60 * 1000)
      : null

    // Mettre à jour l'annonce
    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: validatedData.announcementId },
      data: {
        moderationStatus: newStatus,
        status: newAnnouncementStatus,
        moderatedAt: new Date(),
        moderatedById: session.user.id,
        moderationReason: validatedData.reason,
        requiredChanges: validatedData.requiredChanges,
        suspendedUntil: suspensionEnd
      }
    })

    // Créer notification pour le client
    const notificationMessages = {
      APPROVE: 'Votre annonce a été approuvée et est maintenant visible.',
      REJECT: `Votre annonce a été rejetée. Raison: ${validatedData.reason}`,
      SUSPEND: `Votre annonce a été suspendue. Raison: ${validatedData.reason}`,
      REQUIRE_CHANGES: `Des modifications sont requises pour votre annonce: ${validatedData.requiredChanges?.join(', ')}`
    }

    await prisma.notification.create({
      data: {
        userId: announcement.client.userId,
        type: `ANNOUNCEMENT_${validatedData.action}D`,
        title: validatedData.action === 'APPROVE' ? 'Annonce approuvée' :
               validatedData.action === 'REJECT' ? 'Annonce rejetée' :
               validatedData.action === 'SUSPEND' ? 'Annonce suspendue' :
               'Modifications requises',
        message: notificationMessages[validatedData.action],
        data: {
          announcementId: announcement.id,
          action: validatedData.action,
          reason: validatedData.reason,
          requiredChanges: validatedData.requiredChanges
        }
      }
    })

    // Log pour audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `ANNOUNCEMENT_${validatedData.action}`,
        entity: 'Announcement',
        entityId: announcement.id,
        details: {
          previousStatus: announcement.moderationStatus,
          newStatus,
          reason: validatedData.reason,
          clientId: announcement.client.userId,
          suspensionDuration: validatedData.suspensionDuration
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Announcement ${validatedData.action.toLowerCase()}d successfully`,
      announcement: {
        id: updatedAnnouncement.id,
        moderationStatus: updatedAnnouncement.moderationStatus,
        status: updatedAnnouncement.status,
        moderatedAt: updatedAnnouncement.moderatedAt
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'moderating announcement')
  }
}

// PATCH - Modération en masse
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { announcementIds, action, reason } = body

    if (!announcementIds || !Array.isArray(announcementIds) || announcementIds.length === 0) {
      return NextResponse.json({ error: 'Announcement IDs required' }, { status: 400 })
    }

    if (announcementIds.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 announcements at once' }, { status: 400 })
    }

    // Traitement en masse
    const results = []
    for (const announcementId of announcementIds) {
      try {
        const result = await moderateSingleAnnouncement(
          announcementId, 
          action, 
          reason, 
          session.user.id
        )
        results.push({ announcementId, success: true, ...result })
      } catch (error) {
        results.push({ 
          announcementId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Bulk moderation completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: announcementIds.length,
        successful: successCount,
        failed: failureCount
      }
    })

  } catch (error) {
    return handleApiError(error, 'bulk moderating announcements')
  }
}

// Fonctions utilitaires
async function getModeration Stats() {
  const stats = await prisma.announcement.groupBy({
    by: ['moderationStatus'],
    _count: { moderationStatus: true }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCount = await prisma.announcement.count({
    where: {
      createdAt: { gte: today },
      moderationStatus: 'PENDING'
    }
  })

  return {
    byStatus: stats.reduce((acc, stat) => {
      acc[stat.moderationStatus] = stat._count.moderationStatus
      return acc
    }, {} as Record<string, number>),
    pendingToday: todayCount,
    totalPending: stats.find(s => s.moderationStatus === 'PENDING')?._count.moderationStatus || 0
  }
}

function analyzeRiskFactors(announcement: any): string[] {
  const risks = []
  
  if (announcement.price > 500) risks.push('High value')
  if (announcement.description.length < 50) risks.push('Short description')
  if (announcement.urgent) risks.push('Urgent request')
  
  // Mots-clés suspects
  const suspiciousWords = ['cash', 'urgent', 'secret', 'confidentiel']
  const hasSpiciousWords = suspiciousWords.some(word => 
    announcement.description.toLowerCase().includes(word) ||
    announcement.title.toLowerCase().includes(word)
  )
  if (hasSpiciousWords) risks.push('Suspicious keywords')
  
  return risks
}

async function moderateSingleAnnouncement(
  announcementId: string, 
  action: string, 
  reason: string, 
  moderatorId: string
) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { client: true }
  })

  if (!announcement) {
    throw new Error('Announcement not found')
  }

  if (announcement.moderationStatus !== 'PENDING') {
    throw new Error('Announcement already moderated')
  }

  let newStatus: string
  let newAnnouncementStatus: string = announcement.status

  switch (action) {
    case 'APPROVE':
      newStatus = 'APPROVED'
      newAnnouncementStatus = 'ACTIVE'
      break
    case 'REJECT':
      newStatus = 'REJECTED' 
      newAnnouncementStatus = 'REJECTED'
      break
    default:
      throw new Error('Invalid action for bulk moderation')
  }

  return await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      moderationStatus: newStatus,
      status: newAnnouncementStatus,
      moderatedAt: new Date(),
      moderatedById: moderatorId,
      moderationReason: reason
    }
  })
}