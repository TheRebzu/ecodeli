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
    const delivererId = searchParams.get('delivererId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Vérifier que l'utilisateur est bien un livreur
    const deliverer = await db.deliverer.findUnique({
      where: { userId: delivererId || user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer not found' }, { status: 404 })
    }

    // Construire les filtres
    const where: any = {
      status: status || { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
    }

    if (type) {
      where.type = type
    }

    // Pour les annonces disponibles, exclure celles déjà acceptées par ce livreur
    if (!status || status === 'PENDING') {
      where.delivererId = null
    } else if (status === 'ACCEPTED' || status === 'IN_PROGRESS') {
      where.delivererId = deliverer.id
    }

    // Récupérer les annonces
    const announcements = await db.announcement.findMany({
      where,
      include: {
        client: {
          include: {
            user: {
              select: {
                name: true,
                email: true
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
      orderBy: [
        { urgencyLevel: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Transformer les données
    const transformedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      description: announcement.description || '',
      type: announcement.type,
      status: announcement.status,
      pickupAddress: announcement.pickupAddress,
      deliveryAddress: announcement.deliveryAddress,
      estimatedPrice: announcement.finalPrice || announcement.basePrice,
      estimatedDuration: announcement.estimatedDuration || 30,
      urgencyLevel: announcement.urgencyLevel || 'medium',
      createdAt: announcement.createdAt.toISOString(),
      scheduledDate: announcement.scheduledDate?.toISOString(),
      clientName: announcement.client.user.name || 'Anonymous'
    }))

    return NextResponse.json({
      announcements: transformedAnnouncements
    })
  } catch (error) {
    console.error('Error fetching deliverer announcements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}