import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GeolocationService } from '@/features/tracking/services/geolocation.service'

// GET - Historique complet du suivi d'une livraison avec géolocalisation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier que la livraison appartient au client
    const delivery = await prisma.delivery.findFirst({
      where: {
        const { id } = await params;

        id: id,
        announcement: {
          authorId: session.user.id
        }
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            pickupAddress: true,
            deliveryAddress: true,
            serviceType: true,
            price: true,
            pickupDate: true
          }
        },
        deliverer: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
                phone: true,
                rating: true
              }
            }
          }
        },
        tracking: {
          orderBy: { timestamp: 'asc' },
          include: {
            photos: true
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Livraison non trouvée' },
        { status: 404 }
      )
    }

    // Calculer la progression
    const statusProgression = ['PENDING', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']
    const currentStatusIndex = statusProgression.indexOf(delivery.status)
    const progressPercentage = Math.round(((currentStatusIndex + 1) / statusProgression.length) * 100)

    // Récupérer les données de géolocalisation en temps réel
    let realTimeData = null
    if (delivery.status === 'IN_TRANSIT' || delivery.status === 'PICKUP') {
      try {
        const currentPosition = await GeolocationService.getCurrentDeliveryPosition(delivery.id)
        if (currentPosition) {
          realTimeData = {
            currentPosition,
            isTracking: true,
            lastUpdate: currentPosition.timestamp,
            estimatedArrival: await GeolocationService.calculateEstimatedArrival(
              delivery.id,
              delivery.announcement.deliveryAddress
            )
          }
        }
      } catch (error) {
        console.warn('Erreur lors de la récupération de la position en temps réel:', error)
      }
    }

    // Estimer le temps de livraison restant (utiliser données temps réel si disponibles)
    let estimatedTimeRemaining = null
    if (delivery.status === 'IN_TRANSIT') {
      if (realTimeData?.estimatedArrival) {
        const now = new Date()
        const diffMs = realTimeData.estimatedArrival.getTime() - now.getTime()
        if (diffMs > 0) {
          const diffMins = Math.round(diffMs / (1000 * 60))
          estimatedTimeRemaining = {
            minutes: diffMins,
            formatted: diffMins < 60 ? `${diffMins} min` : `${Math.round(diffMins/60)}h ${diffMins%60}min`,
            basedOnRealTime: true
          }
        }
      } else if (delivery.estimatedDeliveryTime) {
        const now = new Date()
        const estimated = new Date(delivery.estimatedDeliveryTime)
        const diffMs = estimated.getTime() - now.getTime()
        if (diffMs > 0) {
          const diffMins = Math.round(diffMs / (1000 * 60))
          estimatedTimeRemaining = {
            minutes: diffMins,
            formatted: diffMins < 60 ? `${diffMins} min` : `${Math.round(diffMins/60)}h ${diffMins%60}min`,
            basedOnRealTime: false
          }
        }
      }
    }

    // Construire la timeline avec des étapes enrichies
    const enrichedTracking = delivery.tracking.map((track, index) => ({
      id: track.id,
      status: track.status,
      location: track.location,
      notes: track.notes,
      timestamp: track.timestamp,
      photos: track.photos,
      isFirst: index === 0,
      isLast: index === delivery.tracking.length - 1,
      timeFromPrevious: index > 0 ? 
        Math.round((track.timestamp.getTime() - delivery.tracking[index - 1].timestamp.getTime()) / (1000 * 60)) 
        : null
    }))

    return NextResponse.json({
      delivery: {
        id: delivery.id,
        status: delivery.status,
        createdAt: delivery.createdAt,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        actualDeliveryTime: delivery.actualDeliveryTime,
        price: delivery.price,
        rating: delivery.rating,
        review: delivery.review,
        tips: delivery.tips,
        progressPercentage,
        estimatedTimeRemaining
      },
      announcement: delivery.announcement,
      deliverer: {
        id: delivery.deliverer.id,
        name: `${delivery.deliverer.profile?.firstName} ${delivery.deliverer.profile?.lastName}`,
        avatar: delivery.deliverer.profile?.avatar,
        phone: delivery.deliverer.profile?.phone,
        rating: delivery.deliverer.profile?.rating || 0
      },
      tracking: enrichedTracking,
      realTimeTracking: realTimeData,
      statusHistory: statusProgression.map((status, index) => ({
        status,
        label: getStatusLabel(status),
        completed: index <= currentStatusIndex,
        current: index === currentStatusIndex,
        timestamp: delivery.tracking.find(t => t.status === status)?.timestamp || null
      }))
    })

  } catch (error) {
    console.error('Error fetching delivery tracking:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// Helper function pour les labels de statut
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    ACCEPTED: 'Acceptée',
    PICKUP: 'Récupération',
    IN_TRANSIT: 'En transit',
    DELIVERED: 'Livrée',
    COMPLETED: 'Terminée'
  }
  return labels[status] || status
}
