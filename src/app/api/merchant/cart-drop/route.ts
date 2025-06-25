import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'
import { NotificationService } from '@/features/notifications/services/notification.service'

// Schéma de validation pour la configuration du lâcher de chariot
const cartDropConfigSchema = z.object({
  isActive: z.boolean(),
  deliveryZones: z.array(z.object({
    postalCode: z.string().min(5),
    name: z.string(),
    deliveryFee: z.number().min(0),
    freeDeliveryThreshold: z.number().min(0).optional()
  })),
  timeSlots: z.array(z.object({
    day: z.number().min(0).max(6), // 0 = dimanche, 6 = samedi
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    maxOrders: z.number().min(1).max(50).default(10)
  })),
  maxOrdersPerSlot: z.number().min(1).max(100).default(10),
  minimumOrderValue: z.number().min(0).default(0),
  preparationTime: z.number().min(15).max(120).default(30), // en minutes
  specialInstructions: z.string().optional(),
  autoAcceptOrders: z.boolean().default(false)
})

// Schéma pour une commande de lâcher de chariot
const cartDropOrderSchema = z.object({
  customerInfo: z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10)
  }),
  deliveryAddress: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    postalCode: z.string().min(5),
    floor: z.string().optional(),
    apartment: z.string().optional(),
    building: z.string().optional(),
    accessCode: z.string().optional(),
    specialInstructions: z.string().optional()
  }),
  items: z.array(z.object({
    name: z.string().min(2),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    category: z.string().optional(),
    weight: z.number().min(0).optional(),
    fragile: z.boolean().default(false)
  })),
  timeSlot: z.object({
    date: z.string().datetime(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/)
  }),
  totalAmount: z.number().min(0),
  deliveryFee: z.number().min(0),
  paymentMethod: z.enum(['CARD', 'CASH', 'TRANSFER']),
  notes: z.string().optional()
})

/**
 * GET - Configuration et statistiques du lâcher de chariot
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeOrders = searchParams.get('include_orders') === 'true'
    const period = searchParams.get('period') || 'current' // current, last, year

    // Récupérer le commerçant et sa configuration
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: {
        cartDropConfig: true,
        contract: true
      }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date, endDate: Date

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    let orders = []
    let stats = null

    if (includeOrders || period) {
      // Récupérer les commandes de lâcher de chariot
      orders = await prisma.order.findMany({
        where: {
          merchantId: merchant.id,
          type: 'CART_DROP',
          ...(period && {
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          })
        },
        include: {
          delivery: {
            include: {
              deliverer: {
                select: {
                  user: {
                    select: {
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: includeOrders ? 50 : undefined
      })

      // Calculer les statistiques
      const totalOrders = orders.length
      const completedOrders = orders.filter(order => order.status === 'DELIVERED').length
      const pendingOrders = orders.filter(order => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(order.status)).length
      const cancelledOrders = orders.filter(order => order.status === 'CANCELLED').length

      const totalRevenue = orders
        .filter(order => order.status === 'DELIVERED')
        .reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0)

      const averageOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0

      // Statistiques par zone de livraison
      const revenueByZone = orders
        .filter(order => order.status === 'DELIVERED')
        .reduce((acc, order) => {
          const postalCode = order.deliveryAddress?.postalCode || 'Unknown'
          if (!acc[postalCode]) {
            acc[postalCode] = { count: 0, revenue: 0 }
          }
          acc[postalCode].count += 1
          acc[postalCode].revenue += parseFloat(order.totalAmount.toString())
          return acc
        }, {} as Record<string, { count: number, revenue: number }>)

      // Créneaux les plus demandés
      const popularTimeSlots = orders.reduce((acc, order) => {
        const timeSlot = order.timeSlot?.startTime || 'Unknown'
        acc[timeSlot] = (acc[timeSlot] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      stats = {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        averageOrderValue,
        conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        revenueByZone,
        popularTimeSlots: Object.entries(popularTimeSlots)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([timeSlot, count]) => ({ timeSlot, count }))
      }
    }

    // Vérifier les créneaux disponibles pour aujourd'hui et demain
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const availableSlots = merchant.cartDropConfig?.timeSlots || []
    const todaySlots = availableSlots.filter(slot => slot.day === today.getDay())
    const tomorrowSlots = availableSlots.filter(slot => slot.day === tomorrow.getDay())

    const response = {
      merchant: {
        id: merchant.id,
        companyName: merchant.companyName,
        contractStatus: merchant.contractStatus
      },
      config: merchant.cartDropConfig ? {
        id: merchant.cartDropConfig.id,
        isActive: merchant.cartDropConfig.isActive,
        deliveryZones: merchant.cartDropConfig.deliveryZones,
        timeSlots: merchant.cartDropConfig.timeSlots,
        maxOrdersPerSlot: merchant.cartDropConfig.maxOrdersPerSlot,
        createdAt: merchant.cartDropConfig.createdAt,
        updatedAt: merchant.cartDropConfig.updatedAt
      } : null,
      availableSlots: {
        today: todaySlots,
        tomorrow: tomorrowSlots
      },
      ...(stats && { stats }),
      ...(includeOrders && { 
        orders: orders.map(order => ({
          id: order.id,
          customerName: `${order.customerInfo?.firstName} ${order.customerInfo?.lastName}`,
          customerEmail: order.customerInfo?.email,
          deliveryAddress: order.deliveryAddress,
          totalAmount: order.totalAmount,
          deliveryFee: order.deliveryFee,
          status: order.status,
          timeSlot: order.timeSlot,
          itemsCount: order.items?.length || 0,
          deliverer: order.delivery?.deliverer ? {
            name: `${order.delivery.deliverer.user.profile?.firstName} ${order.delivery.deliverer.user.profile?.lastName}`
          } : null,
          createdAt: order.createdAt,
          scheduledAt: order.scheduledAt
        }))
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    return handleApiError(error, 'fetching cart drop configuration')
  }
}

/**
 * POST - Configurer le lâcher de chariot ou créer une commande
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Forbidden - Merchant access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, ...data } = body

    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id },
      include: { cartDropConfig: true }
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })
    }

    if (action === 'configure') {
      // Configuration du lâcher de chariot
      const validatedData = cartDropConfigSchema.parse(data)

      const cartDropConfig = await prisma.cartDropConfig.upsert({
        where: { merchantId: merchant.id },
        create: {
          merchantId: merchant.id,
          isActive: validatedData.isActive,
          deliveryZones: validatedData.deliveryZones,
          timeSlots: validatedData.timeSlots,
          maxOrdersPerSlot: validatedData.maxOrdersPerSlot
        },
        update: {
          isActive: validatedData.isActive,
          deliveryZones: validatedData.deliveryZones,
          timeSlots: validatedData.timeSlots,
          maxOrdersPerSlot: validatedData.maxOrdersPerSlot,
          updatedAt: new Date()
        }
      })

      // Notification de confirmation
      await NotificationService.createNotification({
        userId: session.user.id,
        type: 'CART_DROP_CONFIGURED',
        title: 'Configuration lâcher de chariot mise à jour',
        message: `Votre service de lâcher de chariot est maintenant ${validatedData.isActive ? 'actif' : 'désactivé'}`,
        data: {
          configId: cartDropConfig.id,
          isActive: validatedData.isActive,
          zonesCount: validatedData.deliveryZones.length,
          slotsCount: validatedData.timeSlots.length
        }
      })

      return NextResponse.json({
        config: cartDropConfig,
        message: 'Configuration mise à jour avec succès'
      })

    } else if (action === 'create_order') {
      // Création d'une commande de lâcher de chariot (par le client)
      const validatedData = cartDropOrderSchema.parse(data)

      if (!merchant.cartDropConfig?.isActive) {
        return NextResponse.json({ 
          error: 'Le service de lâcher de chariot n\'est pas actif pour ce commerçant' 
        }, { status: 403 })
      }

      // Vérifier la disponibilité du créneau
      const requestedDate = new Date(validatedData.timeSlot.date)
      const dayOfWeek = requestedDate.getDay()
      
      const availableSlot = merchant.cartDropConfig.timeSlots.find(slot => 
        slot.day === dayOfWeek &&
        slot.startTime === validatedData.timeSlot.startTime &&
        slot.endTime === validatedData.timeSlot.endTime
      )

      if (!availableSlot) {
        return NextResponse.json({ 
          error: 'Créneau horaire non disponible' 
        }, { status: 400 })
      }

      // Vérifier le nombre de commandes pour ce créneau
      const existingOrders = await prisma.order.count({
        where: {
          merchantId: merchant.id,
          type: 'CART_DROP',
          scheduledAt: {
            gte: new Date(requestedDate.setHours(parseInt(validatedData.timeSlot.startTime.split(':')[0]), parseInt(validatedData.timeSlot.startTime.split(':')[1]))),
            lt: new Date(requestedDate.setHours(parseInt(validatedData.timeSlot.endTime.split(':')[0]), parseInt(validatedData.timeSlot.endTime.split(':')[1])))
          },
          status: { not: 'CANCELLED' }
        }
      })

      if (existingOrders >= availableSlot.maxOrders) {
        return NextResponse.json({ 
          error: 'Créneau complet. Veuillez choisir un autre horaire.' 
        }, { status: 409 })
      }

      // Calculer les frais de livraison selon la zone
      const customerPostalCode = validatedData.deliveryAddress.postalCode
      const deliveryZone = merchant.cartDropConfig.deliveryZones.find(zone => 
        zone.postalCode === customerPostalCode
      )

      if (!deliveryZone) {
        return NextResponse.json({ 
          error: 'Zone de livraison non desservie' 
        }, { status: 400 })
      }

      let finalDeliveryFee = deliveryZone.deliveryFee
      if (deliveryZone.freeDeliveryThreshold && validatedData.totalAmount >= deliveryZone.freeDeliveryThreshold) {
        finalDeliveryFee = 0
      }

      // Créer la commande
      const order = await prisma.order.create({
        data: {
          merchantId: merchant.id,
          type: 'CART_DROP',
          customerInfo: validatedData.customerInfo,
          deliveryAddress: validatedData.deliveryAddress,
          items: validatedData.items,
          timeSlot: validatedData.timeSlot,
          totalAmount: validatedData.totalAmount,
          deliveryFee: finalDeliveryFee,
          paymentMethod: validatedData.paymentMethod,
          status: merchant.cartDropConfig.autoAcceptOrders ? 'CONFIRMED' : 'PENDING',
          scheduledAt: new Date(validatedData.timeSlot.date),
          notes: validatedData.notes
        }
      })

      // Notifications
      await NotificationService.createNotification({
        userId: session.user.id,
        type: 'NEW_CART_DROP_ORDER',
        title: 'Nouvelle commande lâcher de chariot',
        message: `Commande de ${validatedData.customerInfo.firstName} ${validatedData.customerInfo.lastName} pour ${validatedData.totalAmount}€`,
        data: {
          orderId: order.id,
          customerName: `${validatedData.customerInfo.firstName} ${validatedData.customerInfo.lastName}`,
          amount: validatedData.totalAmount,
          timeSlot: validatedData.timeSlot
        },
        sendPush: true,
        priority: 'high'
      })

      return NextResponse.json({
        order: {
          id: order.id,
          status: order.status,
          totalAmount: order.totalAmount,
          deliveryFee: finalDeliveryFee,
          scheduledAt: order.scheduledAt,
          createdAt: order.createdAt
        },
        message: 'Commande créée avec succès'
      }, { status: 201 })

    } else if (action === 'update_order_status') {
      // Mise à jour du statut d'une commande
      const { orderId, status, notes } = data

      if (!orderId || !status) {
        return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })
      }

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          merchantId: merchant.id,
          type: 'CART_DROP'
        }
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(notes && { notes }),
          ...(status === 'CONFIRMED' && { confirmedAt: new Date() }),
          ...(status === 'CANCELLED' && { cancelledAt: new Date() })
        }
      })

      // Notification au client (si email disponible)
      if (order.customerInfo?.email) {
        const statusMessages: Record<string, string> = {
          'CONFIRMED': 'Votre commande a été confirmée',
          'IN_PROGRESS': 'Votre commande est en préparation',
          'READY': 'Votre commande est prête pour la livraison',
          'DELIVERED': 'Votre commande a été livrée',
          'CANCELLED': 'Votre commande a été annulée'
        }

        // TODO: Envoyer email au client
        console.log(`Email à envoyer à ${order.customerInfo.email}: ${statusMessages[status]}`)
      }

      return NextResponse.json({
        order: updatedOrder,
        message: 'Statut mis à jour avec succès'
      })
    }

    return NextResponse.json({ error: 'Action not recognized' }, { status: 400 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return handleApiError(error, 'processing cart drop action')
  }
}
