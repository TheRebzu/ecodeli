import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

// GET - Données de suivi d'une livraison
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromSession(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que l'utilisateur est bien le client de cette livraison
    const delivery = await prisma.delivery.findFirst({
      where: {
        id,
        announcement: {
          authorId: user.id
        }
      },
      include: {
        announcement: {
          select: {
            title: true,
            pickupAddress: true,
            deliveryAddress: true
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
          orderBy: {
            timestamp: 'desc'
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

    // Simuler des coordonnées pour les adresses (en production, utiliser un service de géocodage)
    const pickupCoordinates = {
      lat: 48.8566 + (Math.random() - 0.5) * 0.1, // Paris avec variation
      lng: 2.3522 + (Math.random() - 0.5) * 0.1
    }

    const deliveryCoordinates = {
      lat: 48.8566 + (Math.random() - 0.5) * 0.2,
      lng: 2.3522 + (Math.random() - 0.5) * 0.2
    }

    // Position actuelle simulée (si livraison en cours)
    let currentLocation = null
    if (delivery.status === 'IN_TRANSIT') {
      const progress = Math.random() * 0.7 + 0.1 // Entre 10% et 80% du trajet
      currentLocation = {
        lat: pickupCoordinates.lat + (deliveryCoordinates.lat - pickupCoordinates.lat) * progress,
        lng: pickupCoordinates.lng + (deliveryCoordinates.lng - pickupCoordinates.lng) * progress,
        address: `Position actuelle - ${Math.floor(progress * 100)}% du trajet`,
        timestamp: new Date().toISOString()
      }
    }

    // Créer des mises à jour de suivi par défaut si aucune n'existe
    let updates = delivery.tracking.map(update => ({
      id: update.id,
      message: update.message,
      timestamp: update.timestamp.toISOString(),
      location: update.location,
      status: update.status
    }))

    // Ajouter des mises à jour par défaut selon le statut
    if (updates.length === 0) {
      const baseUpdates = []
      
      if (['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
        baseUpdates.push({
          id: 'created',
          message: 'Livraison créée',
          timestamp: delivery.createdAt.toISOString(),
          status: 'PENDING'
        })
      }

      if (['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
        baseUpdates.push({
          id: 'accepted',
          message: 'Livraison acceptée par un livreur',
          timestamp: new Date(delivery.createdAt.getTime() + 30 * 60 * 1000).toISOString(), // +30 min
          status: 'ACCEPTED'
        })
      }

      if (['IN_TRANSIT', 'DELIVERED'].includes(delivery.status)) {
        baseUpdates.push({
          id: 'pickup',
          message: 'Colis récupéré',
          timestamp: new Date(delivery.createdAt.getTime() + 60 * 60 * 1000).toISOString(), // +1h
          location: delivery.announcement.pickupAddress,
          status: 'IN_TRANSIT'
        })
      }

      if (delivery.status === 'DELIVERED') {
        baseUpdates.push({
          id: 'delivered',
          message: 'Colis livré avec succès',
          timestamp: delivery.completedAt?.toISOString() || new Date().toISOString(),
          location: delivery.announcement.deliveryAddress,
          status: 'DELIVERED'
        })
      }

      updates = baseUpdates.reverse() // Plus récent en premier
    }

    // Route simulée
    const route = []
    if (currentLocation) {
      // Créer quelques points sur le trajet
      const numPoints = 3
      for (let i = 0; i <= numPoints; i++) {
        const progress = i / numPoints
        if (progress <= (Math.random() * 0.7 + 0.1)) { // Seulement les points déjà parcourus
          route.push({
            lat: pickupCoordinates.lat + (deliveryCoordinates.lat - pickupCoordinates.lat) * progress,
            lng: pickupCoordinates.lng + (deliveryCoordinates.lng - pickupCoordinates.lng) * progress,
            timestamp: new Date(Date.now() - (numPoints - i) * 10 * 60 * 1000).toISOString(), // Tous les 10 min
            status: 'IN_TRANSIT'
          })
        }
      }
    }

    // Estimation d'arrivée (si en cours)
    let estimatedArrival = null
    if (delivery.status === 'IN_TRANSIT') {
      estimatedArrival = new Date(Date.now() + Math.random() * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString() // Entre 30 min et 1h30
    }

    const trackingData = {
      id: delivery.id,
      announcementTitle: delivery.announcement.title,
      status: delivery.status,
      delivererName: delivery.deliverer?.profile 
        ? `${delivery.deliverer.profile.firstName} ${delivery.deliverer.profile.lastName}`
        : null,
      delivererPhone: delivery.deliverer?.profile?.phone || null,
      delivererAvatar: delivery.deliverer?.profile?.avatar || null,
      pickupAddress: delivery.announcement.pickupAddress,
      deliveryAddress: delivery.announcement.deliveryAddress,
      currentLocation,
      estimatedArrival,
      validationCode: delivery.validationCode,
      route,
      updates,
      pickupCoordinates,
      deliveryCoordinates
    }

    return NextResponse.json(trackingData)

  } catch (error) {
    console.error('Erreur tracking:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
