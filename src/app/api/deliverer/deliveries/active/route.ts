import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est un livreur
    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Récupérer les livraisons actives du livreur
    const activeDeliveries = await db.delivery.findMany({
      where: {
        delivererId: session.user.id,
        status: {
          in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']
        }
      },
      include: {
        announcement: {
          include: {
            author: {
              include: {
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Formatter les données pour le frontend
    const formattedDeliveries = activeDeliveries.map(delivery => ({
      id: delivery.id,
      announcement: {
        id: delivery.announcement.id,
        title: delivery.announcement.title,
        description: delivery.announcement.description,
        type: delivery.announcement.type
      },
      pickupAddress: delivery.announcement.pickupAddress,
      deliveryAddress: delivery.announcement.deliveryAddress,
      scheduledPickupDate: delivery.pickupDate,
      scheduledDeliveryDate: delivery.deliveryDate,
      actualPickupDate: delivery.actualPickupDate,
      actualDeliveryDate: delivery.actualDeliveryDate,
      status: delivery.status,
      price: delivery.price,
      validationCode: delivery.validationCode,
      client: {
        id: delivery.announcement.author.id,
        firstName: delivery.announcement.author.profile?.firstName || '',
        lastName: delivery.announcement.author.profile?.lastName || '',
        phone: delivery.announcement.author.profile?.phone || ''
      },
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedDeliveries,
      count: formattedDeliveries.length
    })
  } catch (error) {
    console.error('Error fetching active deliveries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 