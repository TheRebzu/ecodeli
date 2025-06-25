import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'
import { NotificationService } from '@/features/notifications/services/notification.service'

// Schéma de validation pour les annonces commerçants
const merchantAnnouncementSchema = z.object({
  title: z.string().min(5, 'Le titre doit faire au moins 5 caractères'),
  description: z.string().min(20, 'La description doit faire au moins 20 caractères'),
  type: z.enum(['PACKAGE_DELIVERY', 'CART_DROP', 'SHOPPING', 'HOME_SERVICE']),
  price: z.number().positive('Le prix doit être positif'),
  pickupAddress: z.string().min(10, 'Adresse de récupération requise'),
  deliveryAddress: z.string().min(10, 'Adresse de livraison requise'),
  scheduledAt: z.string().datetime('Date invalide').optional(),
  weight: z.number().positive().optional(),
  volume: z.number().positive().optional(),
  fragile: z.boolean().default(false),
  urgent: z.boolean().default(false),
  specialInstructions: z.string().optional(),
  packageDetails: z.object({
    content: z.string(),
    value: z.number().positive().optional(),
    dimensions: z.object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive()
    }).optional()
  }).optional(),
  cartDropConfig: z.object({
    timeSlots: z.array(z.object({
      start: z.string(),
      end: z.string(),
      maxOrders: z.number().default(5)
    })),
    deliveryZones: z.array(z.string()),
    minimumOrderValue: z.number().default(0),
    freeDeliveryThreshold: z.number().optional()
  }).optional()
})

/**
 * GET - Liste des annonces du commerçant
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    // Construire les filtres
    const where: any = {
      authorId: session.user.id
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Récupérer les annonces avec pagination
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          deliveries: {
            include: {
              deliverer: {
                select: {
                  user: {
                    select: {
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          _count: {
            select: {
              deliveries: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.announcement.count({ where })
    ])

    // Statistiques rapides
    const stats = await prisma.announcement.groupBy({
      by: ['status'],
      where: { authorId: session.user.id },
      _count: {
        status: true
      }
    })

    const statsFormatted = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status
      return acc
    }, {} as Record<string, number>)

    // Formater les annonces pour l'affichage
    const formattedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description,
      type: announcement.type,
      status: announcement.status,
      price: announcement.price,
      pickupAddress: announcement.pickupAddress,
      deliveryAddress: announcement.deliveryAddress,
      scheduledAt: announcement.scheduledAt,
      weight: announcement.weight,
      volume: announcement.volume,
      fragile: announcement.fragile,
      urgent: announcement.urgent,
      specialInstructions: announcement.specialInstructions,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      deliveriesCount: announcement._count.deliveries,
      activeDeliveries: announcement.deliveries.filter(d => 
        ['ACCEPTED', 'IN_PROGRESS'].includes(d.status)
      ),
      completedDeliveries: announcement.deliveries.filter(d => 
        d.status === 'DELIVERED'
      ).length,
      totalEarnings: announcement.deliveries
        .filter(d => d.status === 'DELIVERED')
        .length * parseFloat(announcement.price.toString())
    }))

    return NextResponse.json({
      announcements: formattedAnnouncements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: Object.values(statsFormatted).reduce((sum, count) => sum + count, 0),
        active: statsFormatted.ACTIVE || 0,
        completed: statsFormatted.COMPLETED || 0,
        cancelled: statsFormatted.CANCELLED || 0,
        draft: statsFormatted.DRAFT || 0
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching merchant announcements')
  }
}

/**
 * POST - Créer une nouvelle annonce
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = merchantAnnouncementSchema.parse(body)

    // Vérifier que le commerçant existe et a un contrat actif
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: { contract: true }
    })

    if (!merchant) {
      return NextResponse.json({ 
        error: 'Profil commerçant non trouvé. Veuillez compléter votre inscription.' 
      }, { status: 404 })
    }

    if (merchant.contractStatus !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Contrat inactif. Veuillez activer votre contrat pour publier des annonces.' 
      }, { status: 403 })
    }

    // Créer l'annonce
    const announcement = await prisma.announcement.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        status: 'ACTIVE',
        price: validatedData.price,
        pickupAddress: validatedData.pickupAddress,
        deliveryAddress: validatedData.deliveryAddress,
        scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : null,
        weight: validatedData.weight,
        volume: validatedData.volume,
        fragile: validatedData.fragile,
        urgent: validatedData.urgent,
        specialInstructions: validatedData.specialInstructions,
        authorId: session.user.id,
        // Données spécifiques selon le type
        ...(validatedData.packageDetails && {
          packageDetails: validatedData.packageDetails
        })
      },
      include: {
        author: {
          select: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Configuration spéciale pour le lâcher de chariot
    if (validatedData.type === 'CART_DROP' && validatedData.cartDropConfig) {
      await prisma.cartDropConfig.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          isActive: true,
          deliveryZones: validatedData.cartDropConfig.deliveryZones,
          timeSlots: validatedData.cartDropConfig.timeSlots,
          maxOrdersPerSlot: validatedData.cartDropConfig.timeSlots[0]?.maxOrders || 5
        },
        update: {
          isActive: true,
          deliveryZones: validatedData.cartDropConfig.deliveryZones,
          timeSlots: validatedData.cartDropConfig.timeSlots,
          maxOrdersPerSlot: validatedData.cartDropConfig.timeSlots[0]?.maxOrders || 5
        }
      })
    }

    // Rechercher des livreurs compatibles pour notification
    if (validatedData.scheduledAt) {
      const scheduledDate = new Date(validatedData.scheduledAt)
      const startOfDay = new Date(scheduledDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(scheduledDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Trouver les livreurs avec des trajets compatibles
      const compatibleRoutes = await prisma.deliveryRoute.findMany({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          },
          isActive: true,
          // Logique de géolocalisation simplifiée
          OR: [
            { startLocation: { contains: validatedData.pickupAddress.split(',')[0] } },
            { endLocation: { contains: validatedData.deliveryAddress.split(',')[0] } }
          ]
        },
        include: {
          deliverer: {
            select: {
              userId: true,
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            }
          }
        },
        take: 10 // Limiter à 10 livreurs
      })

      // Envoyer des notifications aux livreurs compatibles
      for (const route of compatibleRoutes) {
        await NotificationService.notifyDeliveryOpportunity(
          route.deliverer.userId,
          announcement.id,
          {
            title: announcement.title,
            pickupLocation: announcement.pickupAddress,
            deliveryLocation: announcement.deliveryAddress,
            price: parseFloat(announcement.price.toString()),
            desiredDate: scheduledDate
          }
        )
      }
    }

    // Notification de confirmation au commerçant
    await NotificationService.createNotification({
      userId: session.user.id,
      type: 'ANNOUNCEMENT_CREATED',
      title: 'Annonce publiée avec succès',
      message: `Votre annonce "${announcement.title}" est maintenant visible par les livreurs`,
      data: {
        announcementId: announcement.id,
        type: announcement.type
      }
    })

    return NextResponse.json({
      announcement: {
        id: announcement.id,
        title: announcement.title,
        type: announcement.type,
        status: announcement.status,
        price: announcement.price,
        pickupAddress: announcement.pickupAddress,
        deliveryAddress: announcement.deliveryAddress,
        createdAt: announcement.createdAt
      },
      message: 'Annonce créée avec succès',
      notifiedDeliverers: compatibleRoutes?.length || 0
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'creating merchant announcement')
  }
}
