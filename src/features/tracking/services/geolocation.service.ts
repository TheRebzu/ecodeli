import { prisma } from '@/lib/db'
import { NotificationService } from '@/features/notifications/services/notification.service'

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: Date
  speed?: number
  heading?: number
  altitude?: number
}

export interface TrackingSession {
  id: string
  deliveryId: string
  delivererId: string
  startTime: Date
  endTime?: Date
  isActive: boolean
  totalDistance: number
  averageSpeed: number
  positions: LocationData[]
}

export interface GeofenceZone {
  id: string
  name: string
  type: 'PICKUP' | 'DELIVERY' | 'STORAGE' | 'SERVICE_AREA'
  coordinates: { lat: number; lng: number }
  radius: number // mètres
  isActive: boolean
}

export interface ProximityAlert {
  type: 'APPROACHING_PICKUP' | 'APPROACHING_DELIVERY' | 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT'
  distance: number
  estimatedArrival: Date
  deliveryId: string
  position: LocationData
}

export class GeolocationService {
  /**
   * Récupérer la position actuelle d'une livraison
   */
  static async getCurrentDeliveryPosition(deliveryId: string): Promise<LocationData | null> {
    try {
      const activeSession = await prisma.trackingSession.findFirst({
        where: {
          deliveryId,
          isActive: true
        },
        include: {
          deliverer: {
            include: {
              currentLocation: true
            }
          }
        }
      })

      if (!activeSession?.deliverer.currentLocation) {
        return null
      }

      const location = activeSession.deliverer.currentLocation
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.lastUpdateAt,
        speed: location.speed || undefined,
        heading: location.heading || undefined
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la position actuelle:', error)
      return null
    }
  }

  /**
   * Calculer l'heure d'arrivée estimée basée sur la position actuelle
   */
  static async calculateEstimatedArrival(
    deliveryId: string,
    destinationAddress: string
  ): Promise<Date | null> {
    try {
      const currentPosition = await this.getCurrentDeliveryPosition(deliveryId)
      if (!currentPosition) return null

      // Récupérer les coordonnées de destination (simulation)
      // En production, utiliser un service de géocodage
      const destinationCoords = await this.geocodeAddress(destinationAddress)
      if (!destinationCoords) return null

      // Calculer la distance
      const distance = this.calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        destinationCoords.lat,
        destinationCoords.lng
      )

      // Estimer le temps basé sur la vitesse moyenne urbaine (30 km/h)
      const averageSpeed = 30 // km/h
      const travelTimeHours = distance / averageSpeed
      const travelTimeMs = travelTimeHours * 60 * 60 * 1000

      const estimatedArrival = new Date(Date.now() + travelTimeMs)
      return estimatedArrival

    } catch (error) {
      console.error('Erreur lors du calcul de l\'arrivée estimée:', error)
      return null
    }
  }

  /**
   * Géocoder une adresse (simulation)
   */
  private static async geocodeAddress(address: string): Promise<{lat: number; lng: number} | null> {
    // En production, utiliser un service comme Google Maps Geocoding API
    // Pour l'instant, retourner des coordonnées par défaut (Paris)
    return {
      lat: 48.8566,
      lng: 2.3522
    }
  }

  /**
   * Démarrer une session de tracking pour une livraison
   */
  static async startDeliveryTracking(
    deliveryId: string,
    delivererId: string
  ): Promise<TrackingSession> {
    try {
      // Vérifier que la livraison existe et est assignée au livreur
      const delivery = await prisma.delivery.findFirst({
        where: {
          id: deliveryId,
          delivererId,
          status: { in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] }
        },
        include: {
          client: {
            include: {
              user: { include: { profile: true } }
            }
          }
        }
      })

      if (!delivery) {
        throw new Error('Livraison non trouvée ou non autorisée')
      }

      // Vérifier qu'il n'y a pas déjà une session active
      const existingSession = await prisma.trackingSession.findFirst({
        where: {
          deliveryId,
          isActive: true
        }
      })

      if (existingSession) {
        throw new Error('Une session de tracking est déjà active pour cette livraison')
      }

      // Créer une nouvelle session de tracking
      const session = await prisma.trackingSession.create({
        data: {
          deliveryId,
          delivererId,
          isActive: true,
          totalDistance: 0,
          averageSpeed: 0
        }
      })

      // Notifier le client que le tracking a commencé
      if (delivery.client) {
        await NotificationService.createNotification({
          userId: delivery.client.userId,
          type: 'TRACKING_STARTED',
          title: '📍 Suivi activé',
          message: 'Vous pouvez maintenant suivre votre livraison en temps réel.',
          data: {
            deliveryId,
            trackingSessionId: session.id
          },
          sendPush: true,
          priority: 'medium'
        })
      }

      return {
        id: session.id,
        deliveryId: session.deliveryId,
        delivererId: session.delivererId,
        startTime: session.startTime,
        endTime: session.endTime,
        isActive: session.isActive,
        totalDistance: session.totalDistance,
        averageSpeed: session.averageSpeed,
        positions: []
      }

    } catch (error) {
      console.error('Erreur démarrage tracking:', error)
      throw error
    }
  }

  /**
   * Mettre à jour la position d'un livreur
   */
  static async updateDelivererPosition(
    delivererId: string,
    locationData: LocationData
  ): Promise<void> {
    try {
      // Récupérer les sessions de tracking actives pour ce livreur
      const activeSessions = await prisma.trackingSession.findMany({
        where: {
          delivererId,
          isActive: true
        },
        include: {
          delivery: {
            include: {
              client: {
                include: {
                  user: { include: { profile: true } }
                }
              }
            }
          }
        }
      })

      if (activeSessions.length === 0) {
        return // Pas de session active, on ignore
      }

      for (const session of activeSessions) {
        // Enregistrer la nouvelle position
        await prisma.locationUpdate.create({
          data: {
            trackingSessionId: session.id,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
            heading: locationData.heading,
            altitude: locationData.altitude,
            timestamp: locationData.timestamp
          }
        })

        // Mettre à jour les statistiques de la session
        await this.updateSessionStats(session.id, locationData)

        // Vérifier les alertes de proximité
        await this.checkProximityAlerts(session, locationData)

        // Vérifier les géofences
        await this.checkGeofences(session, locationData)
      }

    } catch (error) {
      console.error('Erreur mise à jour position:', error)
      throw error
    }
  }

  /**
   * Terminer une session de tracking
   */
  static async stopDeliveryTracking(
    deliveryId: string,
    delivererId: string
  ): Promise<void> {
    try {
      const session = await prisma.trackingSession.findFirst({
        where: {
          deliveryId,
          delivererId,
          isActive: true
        }
      })

      if (!session) {
        throw new Error('Session de tracking non trouvée')
      }

      // Marquer la session comme terminée
      await prisma.trackingSession.update({
        where: { id: session.id },
        data: {
          isActive: false,
          endTime: new Date()
        }
      })

      // Calculer les statistiques finales
      await this.calculateFinalStats(session.id)

      // Notifier la fin du tracking
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          client: {
            include: {
              user: { include: { profile: true } }
            }
          }
        }
      })

      if (delivery?.client) {
        await NotificationService.createNotification({
          userId: delivery.client.userId,
          type: 'TRACKING_ENDED',
          title: '📍 Suivi terminé',
          message: 'Le suivi de votre livraison est maintenant terminé.',
          data: {
            deliveryId,
            trackingSessionId: session.id
          },
          sendPush: true,
          priority: 'low'
        })
      }

    } catch (error) {
      console.error('Erreur arrêt tracking:', error)
      throw error
    }
  }

  /**
   * Obtenir la position actuelle d'une livraison
   */
  static async getCurrentDeliveryPosition(deliveryId: string): Promise<LocationData | null> {
    try {
      const latestPosition = await prisma.locationUpdate.findFirst({
        where: {
          trackingSession: {
            deliveryId,
            isActive: true
          }
        },
        orderBy: { timestamp: 'desc' }
      })

      if (!latestPosition) {
        return null
      }

      return {
        latitude: latestPosition.latitude,
        longitude: latestPosition.longitude,
        accuracy: latestPosition.accuracy,
        timestamp: latestPosition.timestamp,
        speed: latestPosition.speed,
        heading: latestPosition.heading,
        altitude: latestPosition.altitude
      }

    } catch (error) {
      console.error('Erreur récupération position:', error)
      throw error
    }
  }

  /**
   * Obtenir l'historique des positions d'une livraison
   */
  static async getDeliveryTrackingHistory(
    deliveryId: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<LocationData[]> {
    try {
      const where: any = {
        trackingSession: { deliveryId }
      }

      if (startTime || endTime) {
        where.timestamp = {}
        if (startTime) where.timestamp.gte = startTime
        if (endTime) where.timestamp.lte = endTime
      }

      const positions = await prisma.locationUpdate.findMany({
        where,
        orderBy: { timestamp: 'asc' }
      })

      return positions.map(pos => ({
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp,
        speed: pos.speed,
        heading: pos.heading,
        altitude: pos.altitude
      }))

    } catch (error) {
      console.error('Erreur récupération historique:', error)
      throw error
    }
  }

  /**
   * Calculer la distance entre deux points (formule haversine)
   */
  static calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = this.toRadians(lat2 - lat1)
    const dLng = this.toRadians(lng2 - lng1)

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c * 1000 // Retour en mètres
  }

  /**
   * Estimer le temps d'arrivée
   */
  static estimateArrivalTime(
    currentLat: number,
    currentLng: number,
    destLat: number,
    destLng: number,
    currentSpeed: number = 30 // km/h par défaut
  ): Date {
    const distance = this.calculateDistance(currentLat, currentLng, destLat, destLng)
    const timeHours = (distance / 1000) / currentSpeed
    const timeMs = timeHours * 60 * 60 * 1000

    return new Date(Date.now() + timeMs)
  }

  /**
   * Mettre à jour les statistiques de la session
   */
  private static async updateSessionStats(
    sessionId: string,
    newPosition: LocationData
  ): Promise<void> {
    const session = await prisma.trackingSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) return

    // Récupérer la dernière position
    const lastPosition = await prisma.locationUpdate.findFirst({
      where: { trackingSessionId: sessionId },
      orderBy: { timestamp: 'desc' },
      skip: 1 // Ignorer la position qu'on vient d'ajouter
    })

    if (lastPosition) {
      // Calculer la distance parcourue
      const distance = this.calculateDistance(
        lastPosition.latitude,
        lastPosition.longitude,
        newPosition.latitude,
        newPosition.longitude
      )

      // Calculer le temps écoulé
      const timeDiff = newPosition.timestamp.getTime() - lastPosition.timestamp.getTime()
      const timeHours = timeDiff / (1000 * 60 * 60)

      // Calculer la vitesse
      const speed = timeHours > 0 ? (distance / 1000) / timeHours : 0

      // Mettre à jour la session
      const newTotalDistance = session.totalDistance + distance
      const newAverageSpeed = (session.averageSpeed + speed) / 2

      await prisma.trackingSession.update({
        where: { id: sessionId },
        data: {
          totalDistance: newTotalDistance,
          averageSpeed: newAverageSpeed
        }
      })
    }
  }

  /**
   * Vérifier les alertes de proximité
   */
  private static async checkProximityAlerts(
    session: any,
    position: LocationData
  ): Promise<void> {
    const delivery = session.delivery

    // Coordonnées de collecte et livraison
    const pickupCoords = JSON.parse(delivery.pickupCoordinates || '{}')
    const deliveryCoords = JSON.parse(delivery.deliveryCoordinates || '{}')

    // Distance seuil pour les alertes (500m)
    const alertDistance = 500

    // Vérifier proximité point de collecte
    if (pickupCoords.lat && pickupCoords.lng) {
      const distanceToPickup = this.calculateDistance(
        position.latitude,
        position.longitude,
        pickupCoords.lat,
        pickupCoords.lng
      )

      if (distanceToPickup <= alertDistance && delivery.status === 'ACCEPTED') {
        await this.sendProximityAlert({
          type: 'APPROACHING_PICKUP',
          distance: distanceToPickup,
          estimatedArrival: this.estimateArrivalTime(
            position.latitude,
            position.longitude,
            pickupCoords.lat,
            pickupCoords.lng,
            position.speed || 30
          ),
          deliveryId: delivery.id,
          position
        }, delivery.client.userId)
      }
    }

    // Vérifier proximité point de livraison
    if (deliveryCoords.lat && deliveryCoords.lng) {
      const distanceToDelivery = this.calculateDistance(
        position.latitude,
        position.longitude,
        deliveryCoords.lat,
        deliveryCoords.lng
      )

      if (distanceToDelivery <= alertDistance && delivery.status === 'IN_TRANSIT') {
        await this.sendProximityAlert({
          type: 'APPROACHING_DELIVERY',
          distance: distanceToDelivery,
          estimatedArrival: this.estimateArrivalTime(
            position.latitude,
            position.longitude,
            deliveryCoords.lat,
            deliveryCoords.lng,
            position.speed || 30
          ),
          deliveryId: delivery.id,
          position
        }, delivery.client.userId)
      }
    }
  }

  /**
   * Vérifier les géofences
   */
  private static async checkGeofences(
    session: any,
    position: LocationData
  ): Promise<void> {
    const geofences = await prisma.geofence.findMany({
      where: { isActive: true }
    })

    for (const geofence of geofences) {
      const distance = this.calculateDistance(
        position.latitude,
        position.longitude,
        geofence.latitude,
        geofence.longitude
      )

      const isInside = distance <= geofence.radius

      // Vérifier l'état précédent
      const lastEntry = await prisma.geofenceEntry.findFirst({
        where: {
          trackingSessionId: session.id,
          geofenceId: geofence.id
        },
        orderBy: { timestamp: 'desc' }
      })

      const wasInside = lastEntry?.isInside || false

      if (isInside !== wasInside) {
        // Enregistrer l'entrée/sortie
        await prisma.geofenceEntry.create({
          data: {
            trackingSessionId: session.id,
            geofenceId: geofence.id,
            isInside,
            timestamp: position.timestamp,
            latitude: position.latitude,
            longitude: position.longitude
          }
        })

        // Envoyer notification si nécessaire
        await this.sendGeofenceAlert(
          session.delivery.client.userId,
          geofence,
          isInside,
          session.delivery.id
        )
      }
    }
  }

  /**
   * Envoyer une alerte de proximité
   */
  private static async sendProximityAlert(
    alert: ProximityAlert,
    clientId: string
  ): Promise<void> {
    const messages = {
      'APPROACHING_PICKUP': `🚚 Le livreur arrive au point de collecte (${Math.round(alert.distance)}m)`,
      'APPROACHING_DELIVERY': `📦 Votre livreur arrive bientôt (${Math.round(alert.distance)}m)`
    }

    await NotificationService.createNotification({
      userId: clientId,
      type: 'PROXIMITY_ALERT',
      title: '📍 Livreur à proximité',
      message: messages[alert.type] || 'Le livreur est proche',
      data: {
        deliveryId: alert.deliveryId,
        alertType: alert.type,
        distance: alert.distance,
        estimatedArrival: alert.estimatedArrival.toISOString()
      },
      sendPush: true,
      priority: 'high'
    })
  }

  /**
   * Envoyer une alerte de géofence
   */
  private static async sendGeofenceAlert(
    clientId: string,
    geofence: any,
    isEntering: boolean,
    deliveryId: string
  ): Promise<void> {
    await NotificationService.createNotification({
      userId: clientId,
      type: 'GEOFENCE_ALERT',
      title: `📍 ${isEntering ? 'Entrée' : 'Sortie'} de zone`,
      message: `Le livreur ${isEntering ? 'entre dans' : 'sort de'} la zone ${geofence.name}`,
      data: {
        deliveryId,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        isEntering
      },
      sendPush: true,
      priority: 'medium'
    })
  }

  /**
   * Calculer les statistiques finales
   */
  private static async calculateFinalStats(sessionId: string): Promise<void> {
    const positions = await prisma.locationUpdate.findMany({
      where: { trackingSessionId: sessionId },
      orderBy: { timestamp: 'asc' }
    })

    if (positions.length < 2) return

    let totalDistance = 0
    let totalTime = 0
    let maxSpeed = 0

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1]
      const curr = positions[i]

      const distance = this.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      )

      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime()
      const timeHours = timeDiff / (1000 * 60 * 60)

      totalDistance += distance
      totalTime += timeDiff

      if (curr.speed && curr.speed > maxSpeed) {
        maxSpeed = curr.speed
      }
    }

    const averageSpeed = totalTime > 0 ? (totalDistance / 1000) / (totalTime / (1000 * 60 * 60)) : 0

    await prisma.trackingSession.update({
      where: { id: sessionId },
      data: {
        totalDistance,
        averageSpeed,
        maxSpeed
      }
    })
  }

  /**
   * Convertir en radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}