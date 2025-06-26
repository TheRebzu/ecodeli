import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Construire les filtres
    const where: any = {
      announcement: {
        clientId: session.user.id
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
              price: true
            }
          },
          deliverer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  image: true
                }
              }
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

    // Transformer les données
    const transformedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      announcementId: delivery.announcement.id,
      announcementTitle: delivery.announcement.title,
      status: delivery.status,
      delivererName: delivery.deliverer?.user.name,
      delivererPhone: delivery.deliverer?.user.phone,
      delivererAvatar: delivery.deliverer?.user.image,
      pickupAddress: delivery.announcement.pickupAddress,
      deliveryAddress: delivery.announcement.deliveryAddress,
      scheduledDate: delivery.scheduledDate?.toISOString(),
      price: delivery.announcement.price,
      validationCode: delivery.validationCode,
      trackingUrl: `/client/deliveries/${delivery.id}/tracking`,
      estimatedDelivery: delivery.estimatedDelivery?.toISOString(),
      actualDelivery: delivery.actualDelivery?.toISOString(),
      rating: delivery.rating,
      review: delivery.review,
      createdAt: delivery.createdAt.toISOString()
    }))

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