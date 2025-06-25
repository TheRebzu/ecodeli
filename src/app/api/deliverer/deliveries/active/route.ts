import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'

// Schema pour mise à jour de statut de livraison
const updateDeliveryStatusSchema = z.object({
  deliveryId: z.string().cuid(),
  status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'ATTEMPTED_DELIVERY']),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().min(0).optional(),
    timestamp: z.string().datetime()
  }).optional(),
  notes: z.string().max(500).optional(),
  photo: z.string().url().optional(), // URL de la photo de preuve
  estimatedArrival: z.string().datetime().optional()
})

// Schema pour signalement d'incident
const incidentReportSchema = z.object({
  deliveryId: z.string().cuid(),
  type: z.enum(['TRAFFIC_DELAY', 'VEHICLE_BREAKDOWN', 'WEATHER', 'ADDRESS_ISSUE', 'RECIPIENT_UNAVAILABLE', 'PACKAGE_DAMAGE', 'SECURITY_CONCERN', 'OTHER']),
  description: z.string().min(10).max(1000),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
  estimatedDelay: z.number().min(0).max(480).optional(), // minutes
  requiresAssistance: z.boolean().default(false)
})

// GET - Récupérer toutes les livraisons actives du livreur
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeHistory = searchParams.get('includeHistory') === 'true'

    // Récupérer le livreur
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: session.user.id }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Deliverer profile not found' }, { status: 404 })
    }

    // Statuts considérés comme "actifs"
    const activeStatuses = ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'ATTEMPTED_DELIVERY']
    const historyStatuses = ['DELIVERED', 'DELIVERED_WITH_ISSUES', 'CANCELLED', 'FAILED']

    // Construire la requête
    const whereConditions: any = {
      delivererId: deliverer.id,
      status: { in: includeHistory ? [...activeStatuses, ...historyStatuses] : activeStatuses }
    }

    // Récupérer les livraisons
    const deliveries = await prisma.delivery.findMany({
      where: whereConditions,
      include: {
        announcement: {
          include: {
            client: {
              include: {
                user: {
                  select: {
                    id: true,
                    profile: {
                      select: { firstName: true, lastName: true, phone: true }
                    }
                  }
                }
              }
            }
          }
        },
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        incidents: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledPickupTime: 'asc' }
      ]
    })

    // Enrichir les données avec informations temps réel
    const enrichedDeliveries = deliveries.map(delivery => {
      const announcement = delivery.announcement
      const client = announcement.client.user
      
      // Calculer le temps écoulé et estimé
      const timeInfo = calculateTimeInfo(delivery)
      
      // Déterminer les actions possibles
      const availableActions = getAvailableActions(delivery.status)
      
      // Calculer la distance (approximative pour le démo)
      const distance = calculateDistance(
        announcement.pickupLatitude, 
        announcement.pickupLongitude,
        announcement.deliveryLatitude,
        announcement.deliveryLongitude
      )

      return {
        id: delivery.id,
        status: delivery.status,
        priority: delivery.priority,
        
        // Informations client
        client: {
          name: `${client.profile?.firstName || ''} ${client.profile?.lastName || ''}`.trim(),
          phone: client.profile?.phone,
          canContact: true
        },
        
        // Informations de livraison
        pickup: {
          address: announcement.pickupAddress,
          latitude: announcement.pickupLatitude,
          longitude: announcement.pickupLongitude,
          scheduledTime: delivery.scheduledPickupTime,
          window: announcement.pickupTimeWindow
        },
        
        delivery: {
          address: announcement.deliveryAddress,
          latitude: announcement.deliveryLatitude,
          longitude: announcement.deliveryLongitude,
          scheduledTime: delivery.scheduledDeliveryTime,
          window: announcement.deliveryTimeWindow
        },
        
        // Informations package
        package: {
          description: announcement.description,
          weight: announcement.weight,
          dimensions: announcement.dimensions,
          value: announcement.declaredValue,
          special: announcement.specialInstructions
        },
        
        // Informations temporelles
        timing: timeInfo,
        
        // Informations géographiques
        geography: {
          totalDistance: distance,
          estimatedDuration: Math.round(distance * 2), // 2 minutes par km (approximation)
          currentLocation: delivery.currentLocation ? JSON.parse(delivery.currentLocation) : null
        },
        
        // Code de validation
        validation: {
          code: delivery.validationCode,
          hasCode: !!delivery.validationCode
        },
        
        // Actions disponibles
        actions: availableActions,
        
        // Incidents actifs
        incidents: delivery.incidents.filter(i => !i.resolvedAt),
        
        // Dernière mise à jour de position
        lastTracking: delivery.trackingEvents[0] || null,
        
        // Paiement
        payment: {
          amount: delivery.price,
          commission: Math.round(delivery.price * 0.10 * 100) / 100
        }
      }
    })

    // Calculer les statistiques du jour
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const todayStats = {
      completed: deliveries.filter(d => 
        d.status === 'DELIVERED' && 
        d.completedAt && 
        d.completedAt >= today
      ).length,
      inProgress: deliveries.filter(d => 
        ['PICKED_UP', 'IN_TRANSIT'].includes(d.status)
      ).length,
      pending: deliveries.filter(d => 
        d.status === 'ACCEPTED'
      ).length,
      totalEarnings: deliveries
        .filter(d => d.status === 'DELIVERED' && d.completedAt && d.completedAt >= today)
        .reduce((sum, d) => sum + (d.price * 0.10), 0)
    }

    return NextResponse.json({
      deliveries: enrichedDeliveries,
      stats: {
        today: todayStats,
        active: {
          total: enrichedDeliveries.filter(d => activeStatuses.includes(d.status)).length,
          urgent: enrichedDeliveries.filter(d => d.priority === 'HIGH').length,
          delayed: enrichedDeliveries.filter(d => isDelayed(d)).length
        }
      },
      delivererInfo: {
        id: deliverer.id,
        isAvailable: deliverer.isAvailable,
        currentCapacity: deliverer.currentCapacity || 0,
        maxCapacity: deliverer.maxCapacity || 10
      }
    })

  } catch (error) {
    return handleApiError(error, 'fetching active deliveries')
  }
}

// POST - Mettre à jour le statut d'une livraison
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateDeliveryStatusSchema.parse(body)

    // Récupérer la livraison et vérifier les permissions
    const delivery = await prisma.delivery.findUnique({
      where: { id: validatedData.deliveryId },
      include: {
        deliverer: true,
        announcement: {
          include: {
            client: {
              include: {
                user: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    if (delivery.deliverer.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not your delivery' }, { status: 403 })
    }

    // Vérifier la transition de statut valide
    if (!isValidStatusTransition(delivery.status, validatedData.status)) {
      return NextResponse.json({
        error: 'Invalid status transition',
        currentStatus: delivery.status,
        requestedStatus: validatedData.status
      }, { status: 400 })
    }

    // Mettre à jour la livraison
    const updateData: any = {
      status: validatedData.status,
      lastStatusUpdate: new Date()
    }

    // Mettre à jour les timestamps spécifiques
    switch (validatedData.status) {
      case 'PICKED_UP':
        updateData.pickedUpAt = new Date()
        break
      case 'IN_TRANSIT':
        updateData.inTransitAt = new Date()
        break
      case 'ARRIVED':
        updateData.arrivedAt = new Date()
        break
    }

    // Mettre à jour la position si fournie
    if (validatedData.location) {
      updateData.currentLocation = JSON.stringify(validatedData.location)
    }

    // Mettre à jour l'ETA si fourni
    if (validatedData.estimatedArrival) {
      updateData.estimatedArrival = new Date(validatedData.estimatedArrival)
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id: validatedData.deliveryId },
      data: updateData
    })

    // Créer un événement de tracking
    await prisma.deliveryTrackingEvent.create({
      data: {
        deliveryId: delivery.id,
        status: validatedData.status,
        location: validatedData.location ? JSON.stringify(validatedData.location) : null,
        notes: validatedData.notes,
        photo: validatedData.photo,
        timestamp: new Date()
      }
    })

    // Notification au client
    const statusMessages = {
      PICKED_UP: 'Votre colis a été récupéré par le livreur',
      IN_TRANSIT: 'Votre colis est en cours de livraison',
      ARRIVED: 'Le livreur est arrivé à l\'adresse de livraison',
      ATTEMPTED_DELIVERY: 'Tentative de livraison effectuée'
    }

    await prisma.notification.create({
      data: {
        userId: delivery.announcement.client.user.id,
        type: 'DELIVERY_STATUS_UPDATE',
        title: 'Mise à jour de livraison',
        message: statusMessages[validatedData.status],
        data: {
          deliveryId: delivery.id,
          status: validatedData.status,
          estimatedArrival: validatedData.estimatedArrival,
          trackingLocation: validatedData.location
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery status updated successfully',
      delivery: {
        id: updatedDelivery.id,
        status: updatedDelivery.status,
        lastStatusUpdate: updatedDelivery.lastStatusUpdate,
        estimatedArrival: updatedDelivery.estimatedArrival
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'updating delivery status')
  }
}

// PUT - Signaler un incident
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'DELIVERER') {
      return NextResponse.json({ error: 'Forbidden - Deliverer only' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = incidentReportSchema.parse(body)

    // Vérifier que la livraison appartient au livreur
    const delivery = await prisma.delivery.findUnique({
      where: { id: validatedData.deliveryId },
      include: {
        deliverer: true,
        announcement: {
          include: {
            client: {
              include: {
                user: {
                  select: { id: true }
                }
              }
            }
          }
        }
      }
    })

    if (!delivery || delivery.deliverer.userId !== session.user.id) {
      return NextResponse.json({ error: 'Delivery not found or access denied' }, { status: 404 })
    }

    // Créer l'incident
    const incident = await prisma.deliveryIncident.create({
      data: {
        deliveryId: validatedData.deliveryId,
        type: validatedData.type,
        description: validatedData.description,
        location: validatedData.location ? JSON.stringify(validatedData.location) : null,
        photos: validatedData.photos ? JSON.stringify(validatedData.photos) : null,
        estimatedDelay: validatedData.estimatedDelay,
        requiresAssistance: validatedData.requiresAssistance,
        reportedBy: session.user.id
      }
    })

    // Mettre à jour l'ETA si un délai est estimé
    if (validatedData.estimatedDelay && delivery.estimatedArrival) {
      const newETA = new Date(delivery.estimatedArrival.getTime() + validatedData.estimatedDelay * 60 * 1000)
      await prisma.delivery.update({
        where: { id: validatedData.deliveryId },
        data: { estimatedArrival: newETA }
      })
    }

    // Notifications
    const notifications = []

    // Notification au client
    notifications.push(prisma.notification.create({
      data: {
        userId: delivery.announcement.client.user.id,
        type: 'DELIVERY_INCIDENT',
        title: 'Incident signalé',
        message: `Un incident a été signalé pour votre livraison: ${getIncidentTypeLabel(validatedData.type)}`,
        data: {
          deliveryId: validatedData.deliveryId,
          incidentType: validatedData.type,
          estimatedDelay: validatedData.estimatedDelay
        }
      }
    }))

    // Notification aux admins si assistance requise
    if (validatedData.requiresAssistance) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      for (const admin of admins) {
        notifications.push(prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'DELIVERY_ASSISTANCE_REQUIRED',
            title: 'Assistance requise',
            message: `Assistance requise pour la livraison ${delivery.id}: ${validatedData.type}`,
            data: {
              deliveryId: validatedData.deliveryId,
              delivererId: session.user.id,
              incidentType: validatedData.type,
              requiresAssistance: true
            }
          }
        }))
      }
    }

    await Promise.all(notifications)

    return NextResponse.json({
      success: true,
      message: 'Incident reported successfully',
      incident: {
        id: incident.id,
        type: incident.type,
        requiresAssistance: incident.requiresAssistance,
        createdAt: incident.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    return handleApiError(error, 'reporting delivery incident')
  }
}

// Fonctions utilitaires
function calculateTimeInfo(delivery: any) {
  const now = new Date()
  const scheduled = new Date(delivery.scheduledDeliveryTime)
  
  return {
    isOverdue: now > scheduled,
    minutesOverdue: now > scheduled ? Math.floor((now.getTime() - scheduled.getTime()) / (1000 * 60)) : 0,
    minutesUntilScheduled: now < scheduled ? Math.floor((scheduled.getTime() - now.getTime()) / (1000 * 60)) : 0,
    estimatedArrival: delivery.estimatedArrival,
    scheduledDeliveryTime: delivery.scheduledDeliveryTime
  }
}

function getAvailableActions(status: string): string[] {
  const actionMap: Record<string, string[]> = {
    'ACCEPTED': ['pickup', 'cancel'],
    'PICKED_UP': ['start_transit', 'report_incident'],
    'IN_TRANSIT': ['arrive', 'report_incident', 'update_location'],
    'ARRIVED': ['validate_delivery', 'attempt_delivery', 'report_incident'],
    'ATTEMPTED_DELIVERY': ['reattempt', 'validate_delivery', 'report_incident']
  }
  
  return actionMap[status] || []
}

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    'ACCEPTED': ['PICKED_UP'],
    'PICKED_UP': ['IN_TRANSIT'],
    'IN_TRANSIT': ['ARRIVED', 'ATTEMPTED_DELIVERY'],
    'ARRIVED': ['ATTEMPTED_DELIVERY'],
    'ATTEMPTED_DELIVERY': ['ARRIVED', 'IN_TRANSIT']
  }
  
  return validTransitions[currentStatus]?.includes(newStatus) || false
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

function isDelayed(delivery: any): boolean {
  const now = new Date()
  const scheduled = new Date(delivery.timing.scheduledDeliveryTime)
  return now > scheduled && !['DELIVERED', 'DELIVERED_WITH_ISSUES'].includes(delivery.status)
}

function getIncidentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'TRAFFIC_DELAY': 'Retard dû au trafic',
    'VEHICLE_BREAKDOWN': 'Panne de véhicule',
    'WEATHER': 'Conditions météorologiques',
    'ADDRESS_ISSUE': 'Problème d\'adresse',
    'RECIPIENT_UNAVAILABLE': 'Destinataire indisponible',
    'PACKAGE_DAMAGE': 'Colis endommagé',
    'SECURITY_CONCERN': 'Problème de sécurité',
    'OTHER': 'Autre incident'
  }
  
  return labels[type] || type
}