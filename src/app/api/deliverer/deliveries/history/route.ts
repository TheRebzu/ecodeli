import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')

    // Construire les conditions where
    const whereConditions: any = {
      delivererId: session.user.id
    }

    if (status) {
      whereConditions.status = status
    }

    // Récupérer les livraisons avec pagination
    const [deliveries, totalCount] = await Promise.all([
      db.delivery.findMany({
        where: whereConditions,
        include: {
          announcement: {
            select: {
              id: true,
              title: true,
              description: true,
              type: true,
              pickupAddress: true,
              deliveryAddress: true
            }
          },
          client: {
            select: {
              id: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          tracking: {
            orderBy: {
              timestamp: 'desc'
            },
            take: 1
          },
          payment: {
            select: {
              id: true,
              amount: true,
              status: true,
              paidAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      db.delivery.count({
        where: whereConditions
      })
    ])

    // Formater les données pour le frontend
    const formattedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      trackingNumber: delivery.trackingNumber,
      status: delivery.status,
      announcement: {
        id: delivery.announcement.id,
        title: delivery.announcement.title,
        description: delivery.announcement.description,
        type: delivery.announcement.type,
        pickupAddress: delivery.announcement.pickupAddress,
        deliveryAddress: delivery.announcement.deliveryAddress
      },
      client: {
        id: delivery.client.id,
        name: delivery.client.profile?.firstName && delivery.client.profile?.lastName
          ? `${delivery.client.profile.firstName} ${delivery.client.profile.lastName}`
          : 'Client anonyme'
      },
      price: delivery.price,
      delivererFee: delivery.delivererFee,
      pickupDate: delivery.pickupDate,
      deliveryDate: delivery.deliveryDate,
      actualDeliveryDate: delivery.actualDeliveryDate,
      isPartial: delivery.isPartial,
      currentLocation: delivery.currentLocation,
      validationCode: delivery.validationCode,
      lastTracking: delivery.tracking[0] || null,
      payment: delivery.payment,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    }))

    return NextResponse.json({
      deliveries: formattedDeliveries,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching delivery history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 