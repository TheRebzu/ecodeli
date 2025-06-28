import { SeedContext } from '../index'
import { CONSTANTS } from '../data/constants'
import { generateValidationCode, generateTrackingNumber } from '../utils/generators/code-generator'

export async function seedDeliveries(ctx: SeedContext) {
  const { prisma } = ctx
  const announcements = ctx.data.get('announcements') || []
  const users = ctx.data.get('users') || []
  
  console.log('   Creating deliveries...')
  
  const deliverers = users.filter(u => u.role === CONSTANTS.roles.DELIVERER)
  const activeAnnouncements = announcements
  
  const deliveries = []
  
  for (const announcement of activeAnnouncements) {
    // Sélectionner un livreur aléatoire
    const deliverer = deliverers[Math.floor(Math.random() * deliverers.length)]
    if (!deliverer) continue
    
    const delivererData = await prisma.deliverer.findUnique({
      where: { userId: deliverer.id }
    })
    
    if (!delivererData) continue
    
    // Déterminer le statut de la livraison
    const statuses = ['PENDING', 'ACCEPTED', 'COLLECTED', 'IN_TRANSIT', 'DELIVERED']
    const statusIndex = Math.floor(Math.random() * statuses.length)
    const status = statuses[statusIndex]
    
    // Générer un code de validation
    const validationCode = generateValidationCode()
    const trackingNumber = generateTrackingNumber()
    
    // Créer la livraison
    const delivery = await prisma.delivery.create({
      data: {
        announcementId: announcement.id,
        delivererId: deliverer.id,
        status,
        trackingNumber,
        validationCode,
        pickupAddress: announcement.pickupAddress,
        pickupLat: announcement.pickupLatitude,
        pickupLng: announcement.pickupLongitude,
        deliveryAddress: announcement.deliveryAddress,
        deliveryLat: announcement.deliveryLatitude,
        deliveryLng: announcement.deliveryLongitude,
        scheduledPickupAt: announcement.pickupDate,
        scheduledDeliveryAt: new Date(announcement.pickupDate.getTime() + 3 * 60 * 60 * 1000), // +3h
        actualPickupAt: statusIndex >= 2 ? new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000) : null,
        actualDeliveryAt: status === 'DELIVERED' ? new Date() : null,
        estimatedDuration: 180, // 3 heures
        estimatedDistance: 15 + Math.random() * 100, // 15-115 km
        deliveryType: Math.random() > 0.7 ? 'EXPRESS' : 'STANDARD',
        price: announcement.basePrice,
      }
    })
    
    deliveries.push(delivery)
    
    // Mettre à jour le statut de l'annonce
    if (status === 'DELIVERED') {
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { status: 'COMPLETED' }
      })
    } else if (statusIndex >= 1) {
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { status: 'IN_PROGRESS' }
      })
    }
  }
  
  console.log(`   ✓ Created ${deliveries.length} deliveries`)
  
  // Stocker pour les autres seeds
  ctx.data.set('deliveries', deliveries)
  
  return deliveries
} 