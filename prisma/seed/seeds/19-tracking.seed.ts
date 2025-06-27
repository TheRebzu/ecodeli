import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'

// Simuler un trajet entre deux points avec des waypoints
function generateRoute(startLat: number, startLng: number, endLat: number, endLng: number, steps: number) {
  const route = []
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps
    const lat = startLat + (endLat - startLat) * progress + (Math.random() - 0.5) * 0.001
    const lng = startLng + (endLng - startLng) * progress + (Math.random() - 0.5) * 0.001
    route.push({ lat, lng })
  }
  return route
}

const trackingStatuses = [
  { status: 'ACCEPTED', message: 'Livraison acceptée par le livreur' },
  { status: 'EN_ROUTE_TO_PICKUP', message: 'Le livreur se dirige vers le point de collecte' },
  { status: 'ARRIVED_AT_PICKUP', message: 'Le livreur est arrivé au point de collecte' },
  { status: 'PACKAGE_COLLECTED', message: 'Colis récupéré' },
  { status: 'EN_ROUTE_TO_DELIVERY', message: 'En route vers la destination' },
  { status: 'ARRIVED_AT_DELIVERY', message: 'Arrivé à destination' },
  { status: 'DELIVERED', message: 'Livraison effectuée avec succès' }
]

export async function seedTracking(ctx: SeedContext) {
  const { prisma } = ctx
  const deliveries = ctx.data.get('deliveries') || []
  
  console.log('   Creating tracking data...')
  
  const trackingUpdates = []
  
  // Créer des données de tracking pour les livraisons en cours et terminées
  const activeDeliveries = deliveries.filter((d: any) => 
    ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(d.status)
  )
  
  for (const delivery of activeDeliveries) {
    const startTime = delivery.createdAt
    const currentTime = new Date()
    const totalDuration = delivery.estimatedDuration * 60 * 1000 // en millisecondes
    
    // Déterminer combien d'étapes ont été complétées
    let stepsToCreate = 2 // Au minimum acceptée
    if (delivery.status === 'IN_TRANSIT') {
      stepsToCreate = 4 + Math.floor(Math.random() * 2) // 4 ou 5 étapes
    } else if (delivery.status === 'DELIVERED') {
      stepsToCreate = trackingStatuses.length
    }
    
    // Générer la route GPS
    const route = generateRoute(
      delivery.pickupLat,
      delivery.pickupLng,
      delivery.deliveryLat,
      delivery.deliveryLng,
      20 // 20 points GPS
    )
    
    // Créer les mises à jour de tracking
    for (let i = 0; i < stepsToCreate; i++) {
      const trackingStatus = trackingStatuses[i]
      const progress = i / (trackingStatuses.length - 1)
      const timestamp = new Date(startTime.getTime() + totalDuration * progress)
      
      // Position GPS correspondante
      const routeIndex = Math.floor(progress * (route.length - 1))
      const location = route[routeIndex]
      
      const update = await prisma.trackingUpdate.create({
        data: {
          deliveryId: delivery.id,
          status: trackingStatus.status,
          message: trackingStatus.message,
          location: `${location.lat},${location.lng}`,
          lat: location.lat,
          lng: location.lng,
          accuracy: 5 + Math.random() * 10, // 5-15 mètres de précision
          speed: i > 0 && i < stepsToCreate - 1 ? 30 + Math.random() * 20 : 0, // 30-50 km/h en mouvement
          heading: Math.random() * 360, // Direction aléatoire
          createdAt: timestamp,
          metadata: {
            battery: Math.floor(20 + Math.random() * 80), // 20-100% batterie
            network: Math.random() > 0.2 ? '4G' : '3G',
            provider: 'GPS'
          }
        }
      })
      
      trackingUpdates.push(update)
    }
    
    // Pour les livraisons en transit, ajouter des positions GPS récentes
    if (delivery.status === 'IN_TRANSIT') {
      const recentPositions = Math.floor(3 + Math.random() * 5) // 3 à 7 positions récentes
      const lastUpdate = trackingUpdates[trackingUpdates.length - 1]
      const lastIndex = Math.floor(stepsToCreate / trackingStatuses.length * route.length)
      
      for (let i = 1; i <= recentPositions; i++) {
        const minutesAgo = recentPositions - i
        const routeIndex = Math.min(lastIndex + i, route.length - 1)
        const location = route[routeIndex]
        
        const gpsUpdate = await prisma.trackingUpdate.create({
          data: {
            deliveryId: delivery.id,
            status: 'GPS_UPDATE',
            message: 'Position GPS mise à jour',
            location: `${location.lat},${location.lng}`,
            lat: location.lat,
            lng: location.lng,
            accuracy: 8 + Math.random() * 7,
            speed: 25 + Math.random() * 30,
            heading: lastUpdate.heading + (Math.random() - 0.5) * 30,
            createdAt: new Date(currentTime.getTime() - minutesAgo * 60 * 1000),
            metadata: {
              battery: Math.floor(30 + Math.random() * 70),
              network: '4G',
              provider: 'GPS',
              silent: true // Mise à jour silencieuse, pas de notification
            }
          }
        })
        
        trackingUpdates.push(gpsUpdate)
      }
    }
    
    // Créer l'historique de livraison
    await prisma.deliveryHistory.create({
      data: {
        deliveryId: delivery.id,
        event: delivery.status === 'DELIVERED' ? 'DELIVERY_COMPLETED' : 'DELIVERY_IN_PROGRESS',
        description: delivery.status === 'DELIVERED' 
          ? `Livraison complétée avec succès. Code de validation: ${delivery.validationCode}`
          : 'Livraison en cours',
        performedBy: 'SYSTEM',
        metadata: {
          distance: delivery.estimatedDistance,
          duration: delivery.estimatedDuration,
          routePoints: route.length,
          completionRate: delivery.status === 'DELIVERED' ? 100 : Math.floor(stepsToCreate / trackingStatuses.length * 100)
        }
      }
    })
  }
  
  // Créer des estimations de temps pour les livraisons actives
  const pendingDeliveries = deliveries.filter((d: any) => d.status === 'PENDING')
  
  for (const delivery of pendingDeliveries) {
    // Estimation basée sur la distance
    const estimatedMinutes = Math.floor(30 + delivery.estimatedDistance * 1.5)
    
    await prisma.deliveryEstimate.create({
      data: {
        deliveryId: delivery.id,
        estimatedPickupTime: new Date(Date.now() + 30 * 60 * 1000), // Dans 30 minutes
        estimatedDeliveryTime: new Date(Date.now() + (30 + estimatedMinutes) * 60 * 1000),
        estimatedDistance: delivery.estimatedDistance,
        estimatedDuration: estimatedMinutes,
        confidence: 0.75 + Math.random() * 0.2, // 75-95% de confiance
        factors: {
          traffic: Math.random() > 0.5 ? 'moderate' : 'low',
          weather: 'clear',
          timeOfDay: 'optimal'
        }
      }
    })
  }
  
  console.log(`   ✓ Created ${trackingUpdates.length} tracking updates`)
  
  return trackingUpdates
} 