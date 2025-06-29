import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const user = await getUserFromSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      announcement: {
        clientId: user.id
      }
    }

    if (status) {
      where.status = status
    }

    // Récupérer les livraisons
    const [deliveries, total] = await Promise.all([
      db.delivery.findMany({
        where,
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              pickupAddress: true,
              deliveryAddress: true,
              basePrice: true,
              finalPrice: true
            }
          },
          deliverer: {
            select: {
              id: true,
              userId: true
            }
          },
          tracking: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      db.delivery.count({ where })
    ])

    // Récupérer les informations des livreurs
    const delivererIds = deliveries.map(d => d.deliverer?.userId).filter(Boolean)
    const delivererUsers = await db.user.findMany({
      where: { id: { in: delivererIds } },
      select: { id: true, name: true, phone: true, image: true }
    })
    
    const delivererMap = new Map(delivererUsers.map(user => [user.id, user]))

    // Transformer les données
    const transformedDeliveries = deliveries.map(delivery => {
      const delivererUser = delivery.deliverer?.userId ? delivererMap.get(delivery.deliverer.userId) : null
      
      return {
        id: delivery.id,
        announcementId: delivery.announcement.id,
        announcementTitle: delivery.announcement.title,
        status: delivery.status,
        delivererName: delivererUser?.name,
        delivererPhone: delivererUser?.phone,
        delivererAvatar: delivererUser?.image,
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress,
        scheduledDate: delivery.scheduledDate?.toISOString(),
        price: delivery.announcement.finalPrice || delivery.announcement.basePrice,
        validationCode: delivery.validationCode,
        trackingUrl: `/client/deliveries/${delivery.id}/tracking`,
        estimatedDelivery: delivery.estimatedDelivery?.toISOString(),
        actualDelivery: delivery.actualDelivery?.toISOString(),
        rating: delivery.rating,
        review: delivery.review,
        createdAt: delivery.createdAt.toISOString()
      }
    })

    return NextResponse.json({
      deliveries: transformedDeliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching client deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}