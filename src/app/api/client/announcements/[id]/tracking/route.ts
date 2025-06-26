import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const announcement = await db.announcement.findFirst({
      where: {
        id: params.id,
        authorId: session.user.id
      },
      include: {
        delivery: {
          include: {
            deliverer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                avatar: true,
                rating: true
              }
            },
            tracking: {
              orderBy: {
                createdAt: 'desc'
              }
            },
            validationCode: true
          }
        }
      }
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Formater les données de tracking
    const trackingData = {
      ...announcement,
      delivery: announcement.delivery ? {
        ...announcement.delivery,
        tracking: announcement.delivery.tracking.map(event => ({
          id: event.id,
          type: event.type,
          title: event.title,
          description: event.description,
          timestamp: event.createdAt,
          location: event.latitude && event.longitude ? {
            lat: event.latitude,
            lng: event.longitude,
            address: event.address || 'Position GPS'
          } : undefined
        })),
        validationCode: announcement.delivery.validationCode?.code,
        estimatedArrival: announcement.delivery.estimatedArrival,
        currentLocation: announcement.delivery.currentLatitude && announcement.delivery.currentLongitude ? {
          lat: announcement.delivery.currentLatitude,
          lng: announcement.delivery.currentLongitude
        } : undefined
      } : null
    }

    return NextResponse.json(trackingData)
  } catch (error) {
    console.error('Error fetching tracking data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}