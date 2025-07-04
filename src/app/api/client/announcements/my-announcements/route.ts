import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * API Route: /api/client/announcements/my-announcements
 * 
 * Récupère les annonces créées par le client connecté
 * Conforme aux exigences Mission 1 EcoDeli
 */

const querySchema = z.object({
  page: z.string().nullable().optional().default('1').transform(val => parseInt(val || '1')),
  limit: z.string().nullable().optional().default('10').transform(val => parseInt(val || '10')),
  status: z.enum(['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).nullable().optional()
})

/**
 * GET /api/client/announcements/my-announcements
 * Récupérer les annonces du client connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle CLIENT requis' }, 
        { status: 403 }
      )
    }
    
    const userId = session.user.id

    // Validation des paramètres de requête
    const { searchParams } = new URL(request.url)
    const params = querySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status')
    })

    // Construction de la clause WHERE
    const where: any = { authorId: userId }
    if (params.status) {
      where.status = params.status
    }

    // Récupération des annonces
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
              trackingNumber: true,
              deliverer: {
                select: {
                  id: true,
                  name: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true,
                      avatar: true
                    }
                  }
                }
              }
            }
          },
          attachments: {
            select: {
              id: true,
              url: true,
              filename: true,
              mimeType: true
            }
          },
          _count: {
            select: {
              matches: true,
              reviews: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit
      }),
      prisma.announcement.count({ where })
    ])

    // Formatage de la réponse
    const formattedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      status: announcement.status,
      price: Number(announcement.basePrice),
      currency: announcement.currency,
      pickupAddress: announcement.pickupAddress,
      deliveryAddress: announcement.deliveryAddress,
      pickupDate: announcement.pickupDate?.toISOString(),
      deliveryDate: announcement.deliveryDate?.toISOString(),
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      isUrgent: announcement.isUrgent,
      viewCount: announcement.viewCount,
      // Informations de livraison
      delivery: announcement.delivery ? {
        id: announcement.delivery.id,
        status: announcement.delivery.status,
        trackingNumber: announcement.delivery.trackingNumber,
        deliverer: announcement.delivery.deliverer ? {
          id: announcement.delivery.deliverer.id,
          name: announcement.delivery.deliverer.name,
          phone: announcement.delivery.deliverer.profile?.phone,
          avatar: announcement.delivery.deliverer.profile?.avatar
        } : null
      } : null,
      // Statistiques
      stats: {
        matchesCount: announcement._count.matches,
        reviewsCount: announcement._count.reviews,
        attachmentsCount: announcement.attachments.length
      },
      // Pièces jointes
      attachments: announcement.attachments.map(attachment => ({
        id: attachment.id,
        url: attachment.url,
        filename: attachment.filename,
        mimeType: attachment.mimeType
      }))
    }))

    // Métadonnées de pagination
    const pagination = {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
      hasNext: params.page < Math.ceil(total / params.limit),
      hasPrev: params.page > 1
    }

    // Statistiques rapides
    const stats = {
      totalAnnouncements: total,
      activeAnnouncements: announcements.filter(a => a.status === 'ACTIVE').length,
      inProgressAnnouncements: announcements.filter(a => a.status === 'IN_PROGRESS').length,
      completedAnnouncements: announcements.filter(a => a.status === 'COMPLETED').length,
      totalValue: announcements.reduce((sum, a) => sum + Number(a.basePrice), 0),
      averagePrice: total > 0 ? announcements.reduce((sum, a) => sum + Number(a.basePrice), 0) / total : 0
    }

    return NextResponse.json({
      success: true,
      data: formattedAnnouncements,
      pagination,
      stats
    })

  } catch (error) {
    console.error('❌ [API My Announcements] Erreur:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Paramètres invalides',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Erreur serveur lors de la récupération des annonces',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
} 