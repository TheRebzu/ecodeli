import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Schema pour accepter une livraison
const acceptDeliverySchema = z.object({
  announcementId: z.string().cuid(),
  pickupDate: z.string().datetime().optional(),
  estimatedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().optional()
})

// Schema pour mettre à jour le statut de livraison
const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  location: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number()
  }).optional(),
  notes: z.string().optional()
})

// Fonction pour générer un code de validation à 6 chiffres
function generateValidationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// GET - Liste des livraisons du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Récupérer le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Construire les filtres
    const where: any = {
      delivererId: deliverer.id
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // Récupérer les livraisons avec pagination
    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          announcement: {
            include: {
              client: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true,
                          phone: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          payment: true,
          proofOfDelivery: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.delivery.count({ where })
    ])

    // Calculer les statistiques
    const stats = await prisma.delivery.groupBy({
      by: ['status'],
      where: { delivererId: deliverer.id },
      _count: true
    })

    const totalDeliveries = stats.reduce((sum, stat) => sum + stat._count, 0)
    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statistics: {
        total: totalDeliveries,
        byStatus: statusCounts,
        completionRate: totalDeliveries > 0 
          ? ((statusCounts.DELIVERED || 0) / totalDeliveries * 100).toFixed(1)
          : 0
      }
    })

  } catch (error) {
    console.error('Error fetching deliverer deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Accepter une livraison
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = acceptDeliverySchema.parse(body)

    // Vérifier le profil livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    if (deliverer.validationStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Deliverer not validated yet' },
        { status: 403 }
      )
    }

    // Vérifier que l'annonce existe et est disponible
    const announcement = await prisma.announcement.findUnique({
      where: { id: validatedData.announcementId },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    if (announcement.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Announcement is no longer available' },
        { status: 409 }
      )
    }

    // Vérifier qu'il n'y a pas déjà une livraison pour cette annonce
    const existingDelivery = await prisma.delivery.findUnique({
      where: { announcementId: validatedData.announcementId }
    })

    if (existingDelivery) {
      return NextResponse.json(
        { error: 'Delivery already exists for this announcement' },
        { status: 409 }
      )
    }

    // Générer le code de validation
    const validationCode = generateValidationCode()

    // Calculer les frais
    const price = announcement.price
    const platformCommission = 0.15 // 15% commission plateforme
    const delivererFee = price * (1 - platformCommission)
    const platformFee = price * platformCommission

    // Créer la livraison
    const delivery = await prisma.$transaction(async (tx) => {
      // Créer la livraison
      const newDelivery = await tx.delivery.create({
        data: {
          announcementId: validatedData.announcementId,
          clientId: announcement.clientId,
          delivererId: deliverer.id,
          status: 'ACCEPTED',
          validationCode,
          pickupDate: validatedData.pickupDate ? new Date(validatedData.pickupDate) : null,
          price,
          delivererFee,
          platformFee,
          insuranceFee: 0 // À calculer selon l'abonnement client
        },
        include: {
          announcement: true,
          client: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Mettre à jour l'annonce
      await tx.announcement.update({
        where: { id: validatedData.announcementId },
        data: { status: 'IN_PROGRESS' }
      })

      // Créer l'historique
      await tx.deliveryHistory.create({
        data: {
          deliveryId: newDelivery.id,
          status: 'ACCEPTED',
          comment: validatedData.notes || 'Delivery accepted by deliverer',
          createdBy: session.user.id,
          location: null
        }
      })

      return newDelivery
    })

    // TODO: Envoyer notification au client
    // await notificationService.send({
    //   userId: announcement.client.userId,
    //   type: 'DELIVERY_ACCEPTED',
    //   data: { deliveryId: delivery.id, validationCode }
    // })

    return NextResponse.json({
      delivery,
      validationCode,
      message: 'Delivery accepted successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error accepting delivery:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour le statut d'une livraison
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const deliveryId = searchParams.get('deliveryId')

    if (!deliveryId) {
      return NextResponse.json({ error: 'Delivery ID required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateDeliveryStatusSchema.parse(body)

    // Vérifier que la livraison appartient au livreur
    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        deliverer: {
          userId: session.user.id
        }
      },
      include: {
        announcement: true
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // Valider la transition de statut
    const validTransitions: Record<string, string[]> = {
      'ACCEPTED': ['PICKED_UP', 'CANCELLED'],
      'PICKED_UP': ['IN_TRANSIT', 'CANCELLED'],
      'IN_TRANSIT': ['DELIVERED', 'CANCELLED'],
      'DELIVERED': [], // Statut final
      'CANCELLED': [] // Statut final
    }

    if (!validTransitions[delivery.status]?.includes(validatedData.status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${delivery.status} to ${validatedData.status}` },
        { status: 400 }
      )
    }

    // Mettre à jour la livraison
    const updatedDelivery = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: validatedData.status,
        updatedAt: new Date()
      }

      // Mettre à jour la localisation si fournie
      if (validatedData.location) {
        updateData.currentLocation = {
          address: validatedData.location.address,
          lat: validatedData.location.lat,
          lng: validatedData.location.lng,
          updatedAt: new Date()
        }
      }

      // Si livré, mettre la date de livraison
      if (validatedData.status === 'DELIVERED') {
        updateData.actualDeliveryDate = new Date()
      }

      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: updateData,
        include: {
          announcement: true,
          client: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phone: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      // Créer l'entrée d'historique
      await tx.deliveryHistory.create({
        data: {
          deliveryId,
          status: validatedData.status,
          comment: validatedData.notes || `Status updated to ${validatedData.status}`,
          location: validatedData.location,
          createdBy: session.user.id
        }
      })

      // Si livraison terminée, mettre à jour l'annonce
      if (validatedData.status === 'DELIVERED') {
        await tx.announcement.update({
          where: { id: delivery.announcementId },
          data: { status: 'COMPLETED' }
        })
      }

      return updated
    })

    // TODO: Envoyer notification au client
    // await notificationService.send({
    //   userId: delivery.clientId,
    //   type: 'DELIVERY_STATUS_UPDATED',
    //   data: { deliveryId, status: validatedData.status }
    // })

    return NextResponse.json({
      delivery: updatedDelivery,
      message: `Delivery status updated to ${validatedData.status}`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating delivery status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
