import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour les paramètres de tracking
const trackingParamsSchema = z.object({
  deliveryId: z.string().cuid(),
  includeRoute: z.boolean().default(false),
  realTime: z.boolean().default(true)
})

/**
 * GET - Suivi temps réel d'une livraison spécifique
 * Permet au client de suivre sa livraison en temps réel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const deliveryId = searchParams.get('deliveryId')
    const includeRoute = searchParams.get('includeRoute') === 'true'
    const realTime = searchParams.get('realTime') !== 'false'

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'Delivery ID required' },
        { status: 400 }
      )
    }

    // Vérifier que la livraison appartient au client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          clientId: client.id
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            pickupAddress: true,
            pickupCity: true,
            deliveryAddress: true,
            deliveryCity: true,
            type: true
          }
        },
        deliverer: {
          include: {
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true
              }
            }
          }
        },
        tracking: {
          orderBy: { createdAt: 'desc' },
          take: realTime ? 50 : 10
        }
      }
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Calculer l'ETA (Estimated Time of Arrival)
    let estimatedArrival = null
    if (delivery.status === 'IN_TRANSIT' && delivery.tracking.length > 0) {
      const lastTracking = delivery.tracking[0]
      if (lastTracking.estimatedArrival) {
        estimatedArrival = lastTracking.estimatedArrival
      } else {
        // Estimation basée sur la distance et vitesse moyenne
        const avgSpeed = 30 // km/h en ville
        const remainingDistance = lastTracking.remainingDistance || 10
        const estimatedMinutes = (remainingDistance / avgSpeed) * 60
        estimatedArrival = new Date(Date.now() + estimatedMinutes * 60000)
      }
    }

    // Données de base du tracking
    const trackingData = {
      delivery: {
        id: delivery.id,
        status: delivery.status,
        validationCode: delivery.validationCode,
        scheduledAt: delivery.scheduledAt,
        completedAt: delivery.completedAt,
        estimatedArrival
      },
      announcement: delivery.announcement,
      deliverer: delivery.deliverer ? {
        id: delivery.deliverer.id,
        name: `${delivery.deliverer.profile?.firstName} ${delivery.deliverer.profile?.lastName}`,
        phone: delivery.deliverer.profile?.phone,
        avatar: delivery.deliverer.profile?.avatar
      } : null,
      currentLocation: delivery.tracking[0] || null,
      timeline: delivery.tracking.map(track => ({
        id: track.id,
        status: track.status,
        message: track.message,
        location: track.location,
        coordinates: track.coordinates ? JSON.parse(track.coordinates) : null,
        timestamp: track.createdAt,
        estimatedArrival: track.estimatedArrival
      })),
      progress: {
        percentage: calculateProgress(delivery.status),
        steps: getDeliverySteps(delivery.status),
        currentStep: getCurrentStep(delivery.status)
      }
    }

    // Ajouter l'itinéraire si demandé
    if (includeRoute && delivery.tracking.length > 1) {
      const coordinates = delivery.tracking
        .filter(track => track.coordinates)
        .map(track => JSON.parse(track.coordinates))
        .reverse() // Ordre chronologique

      trackingData.route = {
        coordinates,
        totalDistance: calculateTotalDistance(coordinates),
        estimatedDuration: delivery.estimatedDuration
      }
    }

    return NextResponse.json({
      success: true,
      data: trackingData,
      lastUpdate: new Date(),
      refreshInterval: realTime ? 30 : 60 // secondes
    })

  } catch (error) {
    return handleApiError(error, 'fetching delivery tracking')
  }
}

/**
 * POST - Demander une mise à jour de localisation
 * Permet au client de demander une position actualisée du livreur
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { deliveryId } = body

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'Delivery ID required' },
        { status: 400 }
      )
    }

    // Vérifier que la livraison appartient au client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        announcement: {
          clientId: client.id
        },
        status: 'IN_TRANSIT'
      },
      include: {
        deliverer: true
      }
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Active delivery not found' },
        { status: 404 }
      )
    }

    // Créer une demande de mise à jour de position
    const locationRequest = await prisma.locationRequest.create({
      data: {
        deliveryId,
        clientId: client.id,
        delivererId: delivery.delivererId,
        status: 'PENDING',
        requestedAt: new Date()
      }
    })

    // TODO: Envoyer notification push au livreur
    // await notificationService.sendToDeliverer(delivery.delivererId, {
    //   type: 'LOCATION_REQUEST',
    //   title: 'Demande de localisation',
    //   body: 'Le client souhaite connaître votre position',
    //   data: { deliveryId, requestId: locationRequest.id }
    // })

    return NextResponse.json({
      success: true,
      message: 'Location update requested',
      requestId: locationRequest.id,
      estimatedResponse: '30 seconds'
    })

  } catch (error) {
    return handleApiError(error, 'requesting location update')
  }
}

// Fonctions utilitaires
function calculateProgress(status: string): number {
  const statusProgress = {
    'PENDING': 0,
    'ACCEPTED': 20,
    'PICKUP': 40,
    'IN_TRANSIT': 70,
    'DELIVERED': 90,
    'COMPLETED': 100
  }
  return statusProgress[status as keyof typeof statusProgress] || 0
}

function getDeliverySteps(status: string) {
  return [
    { key: 'PENDING', label: 'En attente', completed: true },
    { key: 'ACCEPTED', label: 'Acceptée', completed: ['ACCEPTED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(status) },
    { key: 'PICKUP', label: 'Récupération', completed: ['PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(status) },
    { key: 'IN_TRANSIT', label: 'En transit', completed: ['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(status) },
    { key: 'DELIVERED', label: 'Livrée', completed: ['DELIVERED', 'COMPLETED'].includes(status) },
    { key: 'COMPLETED', label: 'Terminée', completed: status === 'COMPLETED' }
  ]
}

function getCurrentStep(status: string): string {
  const steps = ['PENDING', 'ACCEPTED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED']
  return steps.find(step => step === status) || 'PENDING'
}

function calculateTotalDistance(coordinates: Array<{lat: number, lng: number}>): number {
  if (coordinates.length < 2) return 0
  
  let totalDistance = 0
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += getDistanceBetweenPoints(
      coordinates[i-1].lat, coordinates[i-1].lng,
      coordinates[i].lat, coordinates[i].lng
    )
  }
  return totalDistance
}

function getDistanceBetweenPoints(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
} 