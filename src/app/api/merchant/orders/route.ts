import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val)).catch(1),
  limit: z.string().transform(val => parseInt(val)).catch(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'status', 'orderNumber']).catch('date'),
  sortOrder: z.enum(['asc', 'desc']).catch('desc')
})

const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  customerEmail: z.string().email('Invalid email format'),
  customerPhone: z.string().min(10, 'Phone number must be at least 10 characters'),
  deliveryAddress: z.string().min(10, 'Delivery address must be at least 10 characters'),
  deliveryCity: z.string().min(2, 'City must be at least 2 characters'),
  deliveryPostalCode: z.string().regex(/^\d{5}$/, 'Postal code must be 5 digits'),
  deliveryInstructions: z.string().optional(),
  items: z.array(z.object({
    productName: z.string().min(2, 'Product name must be at least 2 characters'),
    description: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
    price: z.number().positive('Price must be positive'),
    weight: z.number().positive('Weight must be positive').optional(),
    category: z.string().optional()
  })).min(1, 'At least one item is required'),
  deliveryType: z.enum(['STANDARD', 'EXPRESS', 'SAME_DAY']).default('STANDARD'),
  scheduledDeliveryDate: z.string().datetime('Invalid delivery date').optional(),
  notes: z.string().optional(),
  requiresSignature: z.boolean().default(false),
  insuranceValue: z.number().min(0, 'Insurance value cannot be negative').optional()
})

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  estimatedReadyTime: z.string().datetime('Invalid ready time').optional(),
  internalNotes: z.string().optional()
})

// GET - Merchant orders
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse(Object.fromEntries(searchParams))

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Build order filters
    const whereClause: any = {
      merchantId: merchant.id
    }

    if (query.status) {
      whereClause.status = query.status
    }

    if (query.search) {
      whereClause.OR = [
        { orderNumber: { contains: query.search, mode: 'insensitive' } },
        { customerName: { contains: query.search, mode: 'insensitive' } },
        { customerEmail: { contains: query.search, mode: 'insensitive' } },
        { items: { some: { productName: { contains: query.search, mode: 'insensitive' } } } }
      ]
    }

    if (query.startDate || query.endDate) {
      whereClause.createdAt = {}
      if (query.startDate) {
        whereClause.createdAt.gte = new Date(query.startDate)
      }
      if (query.endDate) {
        whereClause.createdAt.lte = new Date(query.endDate)
      }
    }

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          delivery: {
            include: {
              deliverer: {
                select: {
                  id: true,
                  user: {
                    select: {
                      profile: {
                        select: {
                          firstName: true,
                          lastName: true,
                          phone: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          payments: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          [query.sortBy === 'date' ? 'createdAt' : query.sortBy]: query.sortOrder
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.order.count({ where: whereClause })
    ])

    // Get order statistics
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const [monthlyStats, statusStats] = await Promise.all([
      // Current month stats
      prisma.order.aggregate({
        where: {
          merchantId: merchant.id,
          createdAt: {
            gte: currentMonth
          }
        },
        _sum: {
          totalAmount: true,
          deliveryFee: true
        },
        _count: {
          id: true
        }
      }),
      // Status breakdown
      prisma.order.groupBy({
        by: ['status'],
        where: {
          merchantId: merchant.id,
          createdAt: {
            gte: currentMonth
          }
        },
        _count: {
          id: true
        },
        _sum: {
          totalAmount: true
        }
      })
    ])

    // Calculate average order value and delivery time
    const deliveredOrders = await prisma.order.findMany({
      where: {
        merchantId: merchant.id,
        status: 'DELIVERED',
        createdAt: {
          gte: currentMonth
        }
      },
      select: {
        totalAmount: true,
        createdAt: true,
        delivery: {
          select: {
            completedAt: true
          }
        }
      }
    })

    const averageOrderValue = deliveredOrders.length > 0 
      ? deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0) / deliveredOrders.length
      : 0

    const averageDeliveryTime = deliveredOrders
      .filter(order => order.delivery?.completedAt)
      .reduce((sum, order, _, arr) => {
        if (!order.delivery?.completedAt) return sum
        const deliveryTime = order.delivery.completedAt.getTime() - order.createdAt.getTime()
        return sum + deliveryTime / (1000 * 60 * 60) // Convert to hours
      }, 0) / deliveredOrders.length || 0

    const statistics = {
      currentMonth: {
        totalOrders: monthlyStats._count.id,
        totalRevenue: monthlyStats._sum.totalAmount || 0,
        totalDeliveryFees: monthlyStats._sum.deliveryFee || 0,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100 // hours
      },
      statusBreakdown: statusStats.map(stat => ({
        status: stat.status,
        count: stat._count.id,
        totalValue: stat._sum.totalAmount || 0
      })),
      deliveryPerformance: {
        onTimeDeliveries: deliveredOrders.length, // TODO: Calculate based on scheduled vs actual
        averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100
      }
    }

    const response = {
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryCity: order.deliveryCity,
        deliveryPostalCode: order.deliveryPostalCode,
        deliveryInstructions: order.deliveryInstructions,
        totalAmount: order.totalAmount,
        deliveryFee: order.deliveryFee,
        deliveryType: order.deliveryType,
        requiresSignature: order.requiresSignature,
        insuranceValue: order.insuranceValue,
        notes: order.notes,
        internalNotes: order.internalNotes,
        estimatedReadyTime: order.estimatedReadyTime,
        scheduledDeliveryDate: order.scheduledDeliveryDate,
        items: order.items,
        delivery: order.delivery ? {
          id: order.delivery.id,
          status: order.delivery.status,
          deliverer: order.delivery.deliverer ? {
            name: `${order.delivery.deliverer.user.profile?.firstName || ''} ${order.delivery.deliverer.user.profile?.lastName || ''}`.trim(),
            phone: order.delivery.deliverer.user.profile?.phone
          } : null,
          scheduledAt: order.delivery.scheduledAt,
          completedAt: order.delivery.completedAt
        } : null,
        payments: order.payments,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        pages: Math.ceil(totalCount / query.limit)
      },
      statistics
    }

    return ApiResponse.success(response)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Invalid query parameters', error.errors)
    }

    console.error('Error fetching merchant orders:', error)
    return ApiResponse.serverError('Failed to fetch orders')
  }
}

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Generate unique order number
    const orderNumber = `${merchant.businessName?.substring(0, 3).toUpperCase() || 'MER'}-${Date.now()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`

    // Calculate totals
    const itemsTotal = validatedData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const totalWeight = validatedData.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0)
    
    // Calculate delivery fee based on type and weight
    let deliveryFee = 0
    switch (validatedData.deliveryType) {
      case 'STANDARD':
        deliveryFee = Math.max(5, totalWeight * 0.5)
        break
      case 'EXPRESS':
        deliveryFee = Math.max(10, totalWeight * 0.8)
        break
      case 'SAME_DAY':
        deliveryFee = Math.max(15, totalWeight * 1.2)
        break
    }

    const totalAmount = itemsTotal + deliveryFee

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          merchantId: merchant.id,
          customerName: validatedData.customerName,
          customerEmail: validatedData.customerEmail,
          customerPhone: validatedData.customerPhone,
          deliveryAddress: validatedData.deliveryAddress,
          deliveryCity: validatedData.deliveryCity,
          deliveryPostalCode: validatedData.deliveryPostalCode,
          deliveryInstructions: validatedData.deliveryInstructions,
          totalAmount,
          deliveryFee,
          deliveryType: validatedData.deliveryType,
          scheduledDeliveryDate: validatedData.scheduledDeliveryDate ? new Date(validatedData.scheduledDeliveryDate) : null,
          requiresSignature: validatedData.requiresSignature,
          insuranceValue: validatedData.insuranceValue,
          notes: validatedData.notes,
          status: 'PENDING'
        }
      })

      // Create order items
      await tx.orderItem.createMany({
        data: validatedData.items.map(item => ({
          orderId: newOrder.id,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          weight: item.weight,
          category: item.category
        }))
      })

      return newOrder
    })

    // TODO: Send order confirmation email to customer
    // TODO: Send notification to merchant
    // TODO: Create announcement for delivery if auto-matching enabled

    // Fetch complete order with items
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: true
      }
    })

    return ApiResponse.success(completeOrder, 'Order created successfully', 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error creating order:', error)
    return ApiResponse.serverError('Failed to create order')
  }
}
