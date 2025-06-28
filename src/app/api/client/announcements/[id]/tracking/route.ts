import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { announcementService } from '@/features/announcements/services/announcement.service'
import { geocodingService } from '@/features/announcements/services/geocoding.service'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * GET - Récupérer le tracking en temps réel d'une annonce
 * Inclut : position livreur, étapes, carte avec trajet, ETA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params
    const user = await getUserFromSession(request)

    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Rôle CLIENT requis' }, { status: 403 })
    }

    logger.info(`Récupération tracking pour annonce ${announcementId} par client ${user.id}`)

    // Récupérer le tracking complet via le service
    const trackingData = await announcementService.getAnnouncementTracking(announcementId, user.id)

    // Calculer la route complète pour la carte
    let routeData = null
    const { announcement } = trackingData

    if (announcement.pickupCoordinates.lat && announcement.deliveryCoordinates.lat) {
      try {
        const route = await geocodingService.calculateRoute(
          announcement.pickupCoordinates.lat,
          announcement.pickupCoordinates.lng,
          announcement.deliveryCoordinates.lat,
          announcement.deliveryCoordinates.lng
        )

        if (route) {
          routeData = {
            distance: route.distance,
            duration: route.duration,
            polyline: route.polyline,
            bounds: {
              north: Math.max(announcement.pickupCoordinates.lat, announcement.deliveryCoordinates.lat),
              south: Math.min(announcement.pickupCoordinates.lat, announcement.deliveryCoordinates.lat),
              east: Math.max(announcement.pickupCoordinates.lng, announcement.deliveryCoordinates.lng),
              west: Math.min(announcement.pickupCoordinates.lng, announcement.deliveryCoordinates.lng)
            }
          }
        }
      } catch (routeError) {
        logger.warn('Impossible de calculer la route pour le tracking:', routeError)
        // Continuer sans la route, utiliser ligne droite
        routeData = {
          distance: geocodingService.calculateDistanceHaversine(
            announcement.pickupCoordinates.lat,
            announcement.pickupCoordinates.lng,
            announcement.deliveryCoordinates.lat,
            announcement.deliveryCoordinates.lng
          ),
          duration: 0,
          polyline: [
            [announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng],
            [announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng]
          ],
          bounds: {
            north: Math.max(announcement.pickupCoordinates.lat, announcement.deliveryCoordinates.lat),
            south: Math.min(announcement.pickupCoordinates.lat, announcement.deliveryCoordinates.lat),
            east: Math.max(announcement.pickupCoordinates.lng, announcement.deliveryCoordinates.lng),
            west: Math.min(announcement.pickupCoordinates.lng, announcement.deliveryCoordinates.lng)
          }
        }
      }
    }

    // Calculer le pourcentage de progression
    let progressPercentage = 0
    if (trackingData.delivery) {
      const statusProgress = {
        'PENDING': 0,
        'ACCEPTED': 20,
        'PICKED_UP': 40,
        'IN_TRANSIT': 70,
        'OUT_FOR_DELIVERY': 90,
        'DELIVERED': 100,
        'CANCELLED': 0
      }
      progressPercentage = statusProgress[trackingData.delivery.status as keyof typeof statusProgress] || 0
    }

    // Préparer les données pour Leaflet
    const leafletData = {
      center: announcement.pickupCoordinates.lat && announcement.pickupCoordinates.lng
        ? [
            (announcement.pickupCoordinates.lat + announcement.deliveryCoordinates.lat) / 2,
            (announcement.pickupCoordinates.lng + announcement.deliveryCoordinates.lng) / 2
          ]
        : [48.8566, 2.3522], // Paris par défaut
      
      markers: [
        {
          id: 'pickup',
          type: 'pickup',
          position: [announcement.pickupCoordinates.lat, announcement.pickupCoordinates.lng],
          popup: {
            title: 'Point de récupération',
            address: announcement.pickupAddress,
            icon: '📦'
          }
        },
        {
          id: 'delivery',
          type: 'delivery', 
          position: [announcement.deliveryCoordinates.lat, announcement.deliveryCoordinates.lng],
          popup: {
            title: 'Point de livraison',
            address: announcement.deliveryAddress,
            icon: '🏠'
          }
        }
      ]
    }

    // Ajouter la position du livreur si disponible
    if (trackingData.delivery?.currentPosition) {
      leafletData.markers.push({
        id: 'deliverer',
        type: 'deliverer',
        position: [
          trackingData.delivery.currentPosition.lat,
          trackingData.delivery.currentPosition.lng
        ],
        popup: {
          title: `Livreur: ${trackingData.delivery.deliverer.name}`,
          address: 'Position actuelle',
          icon: '🚚'
        }
      })
    }

    const response = {
      announcement: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status,
        addresses: {
          pickup: announcement.pickupAddress,
          delivery: announcement.deliveryAddress
        },
        coordinates: {
          pickup: announcement.pickupCoordinates,
          delivery: announcement.deliveryCoordinates
        }
      },

      delivery: trackingData.delivery ? {
        ...trackingData.delivery,
        progress: {
          percentage: progressPercentage,
          currentStep: getDeliveryStepLabel(trackingData.delivery.status),
          nextStep: getNextDeliveryStep(trackingData.delivery.status)
        }
      } : null,

      route: routeData,

      // Données pour la carte Leaflet
      map: {
        ...leafletData,
        route: routeData?.polyline || [],
        bounds: routeData?.bounds
      },

      tracking: {
        history: trackingData.trackingHistory,
        deliveryUpdates: trackingData.deliveryTracking,
        lastUpdate: trackingData.deliveryTracking?.[0]?.timestamp || trackingData.trackingHistory?.[0]?.timestamp
      },

      // Informations temps réel
      realTime: {
        isLive: trackingData.delivery?.status === 'IN_TRANSIT',
        refreshInterval: 30000, // 30 secondes
        estimatedArrival: trackingData.delivery?.estimatedArrival,
        validationCode: trackingData.delivery?.validationCode
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Erreur récupération tracking:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur'
    
    return NextResponse.json({
      error: 'Erreur lors de la récupération du tracking',
      details: errorMessage
    }, { status: 500 })
  }
}

/**
 * POST - Mettre à jour le tracking (pour les tests ou cas spéciaux)
 * Normalement, le tracking est mis à jour automatiquement par les livreurs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params
    const user = await getUserFromSession(request)

    // Seuls les admins peuvent forcer une mise à jour de tracking
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Accès refusé - Mise à jour manuelle réservée aux administrateurs' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { message, isPublic = true } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        error: 'Message de tracking requis' 
      }, { status: 400 })
    }

    // Ajouter une entrée de tracking manuelle
    await prisma.announcementTracking.create({
      data: {
        announcementId,
        status: 'MANUAL_UPDATE',
        message,
        createdBy: user.id,
        isPublic,
        metadata: {
          manualUpdate: true,
          adminId: user.id
        }
      }
    })

    logger.info(`Tracking manuel ajouté pour annonce ${announcementId} par admin ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'Mise à jour de tracking ajoutée'
    })

  } catch (error) {
    logger.error('Erreur mise à jour tracking manuelle:', error)
    
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour du tracking'
    }, { status: 500 })
  }
}

/**
 * Convertit le statut de livraison en étape lisible
 */
function getDeliveryStepLabel(status: string): string {
  const stepLabels: Record<string, string> = {
    'PENDING': 'En attente d\'acceptation',
    'ACCEPTED': 'Acceptée par un livreur',
    'PICKED_UP': 'Colis récupéré',
    'IN_TRANSIT': 'En cours de livraison',
    'OUT_FOR_DELIVERY': 'En cours de livraison finale',
    'DELIVERED': 'Livré avec succès',
    'CANCELLED': 'Annulée'
  }
  
  return stepLabels[status] || status
}

/**
 * Retourne la prochaine étape attendue
 */
function getNextDeliveryStep(status: string): string | null {
  const nextSteps: Record<string, string> = {
    'PENDING': 'Recherche d\'un livreur compatible',
    'ACCEPTED': 'Récupération du colis',
    'PICKED_UP': 'Transport vers la destination',
    'IN_TRANSIT': 'Livraison finale',
    'OUT_FOR_DELIVERY': 'Remise au destinataire'
  }
  
  return nextSteps[status] || null
}