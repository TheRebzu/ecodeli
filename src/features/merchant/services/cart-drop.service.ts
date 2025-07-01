import { db as prisma } from '@/lib/db'
import { ecoLogger } from '@/lib/logger'
import { z } from 'zod'

const cartDropConfigSchema = z.object({
  deliveryZones: z.array(z.object({
    postalCode: z.string(),
    deliveryFee: z.number().min(0),
    maxDistance: z.number().min(0).optional()
  })),
  timeSlots: z.array(z.object({
    day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    maxOrders: z.number().min(1).max(50)
  })),
  maxOrdersPerSlot: z.number().min(1).max(100)
})

export class CartDropService {
  static async configureCartDrop(merchantId: string, config: any) {
    try {
      const validation = cartDropConfigSchema.safeParse(config)
      
      if (!validation.success) {
        throw new Error('Configuration invalide: ' + validation.error.message)
      }

      const { deliveryZones, timeSlots, maxOrdersPerSlot } = validation.data

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          user: true,
          cartDropConfig: true
        }
      })

      if (!merchant) {
        throw new Error('Commerçant introuvable')
      }

      if (merchant.contractStatus !== 'ACTIVE') {
        throw new Error('Le contrat doit être actif pour configurer le lâcher de chariot')
      }

      const cartDropConfig = await prisma.cartDropConfig.upsert({
        where: { merchantId },
        update: {
          isActive: true,
          deliveryZones: deliveryZones.map(zone => ({
            postalCode: zone.postalCode,
            deliveryFee: zone.deliveryFee,
            maxDistance: zone.maxDistance || 5
          })),
          timeSlots: timeSlots.map(slot => ({
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxOrders: slot.maxOrders
          })),
          maxOrdersPerSlot
        },
        create: {
          merchantId,
          isActive: true,
          deliveryZones: deliveryZones.map(zone => ({
            postalCode: zone.postalCode,
            deliveryFee: zone.deliveryFee,
            maxDistance: zone.maxDistance || 5
          })),
          timeSlots: timeSlots.map(slot => ({
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxOrders: slot.maxOrders
          })),
          maxOrdersPerSlot
        }
      })

      await prisma.activityLog.create({
        data: {
          userId: merchant.userId,
          action: 'CART_DROP_CONFIGURED',
          entityType: 'CART_DROP',
          entityId: cartDropConfig.id,
          metadata: {
            zonesCount: deliveryZones.length,
            slotsCount: timeSlots.length,
            maxOrdersPerSlot
          }
        }
      })

      ecoLogger.merchant.info(`Configuration lâcher de chariot mise à jour pour ${merchant.user.email}`)

      return {
        id: cartDropConfig.id,
        isActive: cartDropConfig.isActive,
        deliveryZones: cartDropConfig.deliveryZones,
        timeSlots: cartDropConfig.timeSlots,
        maxOrdersPerSlot: cartDropConfig.maxOrdersPerSlot
      }

    } catch (error) {
      ecoLogger.merchant.error('Erreur configuration cart-drop:', error)
      throw error
    }
  }

  static async getAvailableSlots(merchantId: string, date: Date, postalCode: string) {
    try {
      const cartDropConfig = await prisma.cartDropConfig.findUnique({
        where: { merchantId, isActive: true }
      })

      if (!cartDropConfig) {
        throw new Error('Service lâcher de chariot non configuré')
      }

      const zone = cartDropConfig.deliveryZones.find((z: any) => z.postalCode === postalCode)
      if (!zone) {
        throw new Error('Zone de livraison non couverte')
      }

      const dayName = date.toLocaleDateString('en', { weekday: 'long' }).toLowerCase()
      const daySlots = cartDropConfig.timeSlots.filter((slot: any) => slot.day === dayName)

      if (daySlots.length === 0) {
        return {
          available: false,
          reason: 'Aucun créneau disponible ce jour',
          deliveryFee: zone.deliveryFee,
          slots: []
        }
      }

      const existingOrders = await prisma.order.count({
        where: {
          merchantId,
          isCartDrop: true,
          deliveryDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999))
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        }
      })

      const availableSlots = daySlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxOrders: slot.maxOrders,
        currentOrders: existingOrders,
        available: existingOrders < slot.maxOrders,
        remainingSlots: Math.max(0, slot.maxOrders - existingOrders)
      }))

      return {
        available: availableSlots.some(slot => slot.available),
        deliveryFee: zone.deliveryFee,
        maxDistance: zone.maxDistance,
        slots: availableSlots
      }

    } catch (error) {
      ecoLogger.merchant.error('Erreur récupération créneaux:', error)
      throw error
    }
  }

  static async scheduleCartDrop(data: {
    merchantId: string
    clientName: string
    clientEmail?: string
    clientPhone?: string
    deliveryAddress: any
    deliveryDate: Date
    deliverySlot: string
    items: any[]
    notes?: string
  }) {
    try {
      const { merchantId, clientName, clientEmail, clientPhone, deliveryAddress, deliveryDate, deliverySlot, items, notes } = data

      const availability = await this.getAvailableSlots(
        merchantId, 
        deliveryDate, 
        deliveryAddress.postalCode
      )

      if (!availability.available) {
        throw new Error('Aucun créneau disponible pour cette date et zone')
      }

      const selectedSlot = availability.slots.find(slot => 
        `${slot.startTime}-${slot.endTime}` === deliverySlot
      )

      if (!selectedSlot || !selectedSlot.available) {
        throw new Error('Créneau sélectionné non disponible')
      }

      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const deliveryFee = availability.deliveryFee
      const total = subtotal + deliveryFee

      const orderNumber = this.generateOrderNumber()

      const order = await prisma.order.create({
        data: {
          merchantId,
          orderNumber,
          clientName,
          clientEmail,
          clientPhone,
          deliveryAddress,
          deliveryDate,
          deliverySlot,
          items,
          subtotal,
          deliveryFee,
          total,
          status: 'PENDING',
          isCartDrop: true,
          notes
        }
      })

      await prisma.notification.create({
        data: {
          userId: merchantId,
          type: 'DELIVERY',
          title: 'Nouvelle commande lâcher de chariot',
          message: `Commande ${orderNumber} pour ${clientName} - ${total.toFixed(2)}€`,
          data: {
            orderId: order.id,
            orderNumber,
            clientName,
            deliveryDate: deliveryDate.toISOString(),
            deliverySlot,
            total
          }
        }
      })

      ecoLogger.merchant.info(`Commande lâcher de chariot créée: ${orderNumber}`)

      return {
        id: order.id,
        orderNumber,
        status: order.status,
        deliveryDate,
        deliverySlot,
        subtotal,
        deliveryFee,
        total,
        estimatedDelivery: this.calculateEstimatedDelivery(deliveryDate, deliverySlot)
      }

    } catch (error) {
      ecoLogger.merchant.error('Erreur planification cart-drop:', error)
      throw error
    }
  }

  static async updateOrderStatus(orderId: string, status: string, userId: string) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          merchant: {
            include: {
              user: true
            }
          }
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      if (order.merchant.userId !== userId && userId !== 'ADMIN') {
        throw new Error('Non autorisé à modifier cette commande')
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status }
      })

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'ORDER_STATUS_UPDATED',
          entityType: 'ORDER',
          entityId: orderId,
          metadata: {
            previousStatus: order.status,
            newStatus: status,
            orderNumber: order.orderNumber,
            isCartDrop: true
          }
        }
      })

      if (status === 'DELIVERED' && order.clientEmail) {
        // TODO: Envoyer email de confirmation de livraison
      }

      return updatedOrder

    } catch (error) {
      ecoLogger.merchant.error('Erreur mise à jour statut commande:', error)
      throw error
    }
  }

  private static generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-8)
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    return `CD${timestamp}${random}`
  }

  private static calculateEstimatedDelivery(date: Date, slot: string): Date {
    const [startTime] = slot.split('-')
    const [hours, minutes] = startTime.split(':').map(Number)
    
    const estimatedDate = new Date(date)
    estimatedDate.setHours(hours, minutes, 0, 0)
    
    return estimatedDate
  }

  static async getCartDropStats(merchantId: string, period = 30) {
    try {
      const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000)

      const stats = await prisma.order.aggregate({
        where: {
          merchantId,
          isCartDrop: true,
          createdAt: {
            gte: since
          }
        },
        _count: {
          id: true
        },
        _sum: {
          total: true
        }
      })

      const statusCounts = await prisma.order.groupBy({
        by: ['status'],
        where: {
          merchantId,
          isCartDrop: true,
          createdAt: {
            gte: since
          }
        },
        _count: {
          id: true
        }
      })

      return {
        totalOrders: stats._count.id || 0,
        totalRevenue: stats._sum.total || 0,
        statusBreakdown: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {} as Record<string, number>),
        period
      }

    } catch (error) {
      ecoLogger.merchant.error('Erreur stats cart-drop:', error)
      throw error
    }
  }
}