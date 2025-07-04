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

    // Construire les filtres avec les bonnes valeurs d'enum
    const where: any = {
      status: status || { in: ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] }
    }

    if (type) {
      where.type = type
    }

    // Pour les annonces disponibles, exclure celles déjà acceptées par ce livreur
    if (!status || status === 'ACTIVE') {
      where.delivererId = null
    } else if (status === 'IN_PROGRESS') {
      where.delivererId = deliverer.id
    }

    // Récupérer les annonces
    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            matches: true
          }
        }
      },
      orderBy: [
        { isUrgent: 'desc' },
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
      isUrgent: announcement.isUrgent || false,
      createdAt: announcement.createdAt.toISOString(),
      pickupDate: announcement.pickupDate?.toISOString(),
      clientName: announcement.author.profile 
        ? `${announcement.author.profile.firstName || ''} ${announcement.author.profile.lastName || ''}`.trim()
        : announcement.author.email
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