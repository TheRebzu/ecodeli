import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  estimatedReadyTime: z.string().datetime('Invalid ready time').optional(),
  deliveryInstructions: z.string().optional(),
  requiresSignature: z.boolean().optional(),
  insuranceValue: z.number().min(0, 'Insurance value cannot be negative').optional(),
  cancellationReason: z.string().optional()
})

// GET - Get specific order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const orderId = params.id

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Get order with all related data
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id
      },
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
                        phone: true,
                        avatar: true
                      }
                    }
                  }
                },
                vehicle: {
                  select: {
                    type: true,
                    brand: true,
                    model: true,
                    licensePlate: true
                  }
                },
                currentLocation: {
                  select: {
                    latitude: true,
                    longitude: true,
                    address: true,
                    updatedAt: true
                  }
                }
              }
            },
            tracking: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 10
            }
          }
        },
        payments: {
          include: {
            refunds: true
          }
        },
        announcement: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true
          }
        }
      }
    })

    if (!order) {
      return ApiResponse.notFound('Order not found')
    }

    // Calculate order timeline
    const timeline = []
    
    timeline.push({
      status: 'CREATED',
      timestamp: order.createdAt,
      description: 'Order created'
    })

    if (order.status !== 'PENDING') {
      timeline.push({
        status: 'CONFIRMED',
        timestamp: order.updatedAt,
        description: 'Order confirmed by merchant'
      })
    }

    if (order.delivery) {
      if (order.delivery.acceptedAt) {
        timeline.push({
          status: 'ASSIGNED',
          timestamp: order.delivery.acceptedAt,
          description: 'Assigned to deliverer'
        })
      }

      if (order.delivery.pickedUpAt) {
        timeline.push({
          status: 'PICKED_UP',
          timestamp: order.delivery.pickedUpAt,
          description: 'Package picked up'
        })
      }

      if (order.delivery.completedAt) {
        timeline.push({
          status: 'DELIVERED',
          timestamp: order.delivery.completedAt,
          description: 'Package delivered'
        })
      }
    }

    // Calculate totals
    const itemsTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const totalWeight = order.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0)

    const orderDetails = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      
      // Customer information
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone
      },
      
      // Delivery information
      delivery: {
        address: order.deliveryAddress,
        city: order.deliveryCity,
        postalCode: order.deliveryPostalCode,
        instructions: order.deliveryInstructions,
        type: order.deliveryType,
        requiresSignature: order.requiresSignature,
        insuranceValue: order.insuranceValue,
        scheduledDate: order.scheduledDeliveryDate
      },
      
      // Financial information
      pricing: {
        itemsTotal,
        deliveryFee: order.deliveryFee,
        totalAmount: order.totalAmount,
        currency: 'EUR'
      },
      
      // Items
      items: order.items.map(item => ({
        id: item.id,
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        weight: item.weight,
        category: item.category,
        subtotal: item.price * item.quantity
      })),
      
      // Package information
      package: {
        totalWeight,
        totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
        categories: [...new Set(order.items.map(item => item.category).filter(Boolean))]
      },
      
      // Delivery details
      deliveryDetails: order.delivery ? {
        id: order.delivery.id,
        status: order.delivery.status,
        validationCode: order.delivery.validationCode,
        deliverer: order.delivery.deliverer ? {
          id: order.delivery.deliverer.id,
          name: `${order.delivery.deliverer.user.profile?.firstName || ''} ${order.delivery.deliverer.user.profile?.lastName || ''}`.trim(),
          phone: order.delivery.deliverer.user.profile?.phone,
          avatar: order.delivery.deliverer.user.profile?.avatar,
          vehicle: order.delivery.deliverer.vehicle,
          currentLocation: order.delivery.deliverer.currentLocation
        } : null,
        scheduledAt: order.delivery.scheduledAt,
        acceptedAt: order.delivery.acceptedAt,
        pickedUpAt: order.delivery.pickedUpAt,
        completedAt: order.delivery.completedAt,
        tracking: order.delivery.tracking
      } : null,
      
      // Payment information
      payments: order.payments,
      
      // Related announcement
      announcement: order.announcement,
      
      // Timeline
      timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      
      // Metadata
      notes: order.notes,
      internalNotes: order.internalNotes,
      estimatedReadyTime: order.estimatedReadyTime,
      cancellationReason: order.cancellationReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }

    return ApiResponse.success(orderDetails)
  } catch (error) {
    console.error('Error fetching order:', error)
    return ApiResponse.serverError('Failed to fetch order')
  }
}

// PUT - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const orderId = params.id
    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Check if order exists and belongs to merchant
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id
      },
      include: {
        delivery: true
      }
    })

    if (!existingOrder) {
      return ApiResponse.notFound('Order not found')
    }

    // Validate status transitions
    if (validatedData.status) {
      const validTransitions: Record<string, string[]> = {
        'PENDING': ['CONFIRMED', 'CANCELLED'],
        'CONFIRMED': ['PREPARING', 'CANCELLED'],
        'PREPARING': ['READY', 'CANCELLED'],
        'READY': ['IN_DELIVERY', 'CANCELLED'],
        'IN_DELIVERY': ['DELIVERED'],
        'DELIVERED': [],
        'CANCELLED': []
      }

      const allowedTransitions = validTransitions[existingOrder.status] || []
      if (!allowedTransitions.includes(validatedData.status)) {
        return ApiResponse.badRequest(
          `Cannot transition from ${existingOrder.status} to ${validatedData.status}`
        )
      }
    }

    // Update order
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          ...validatedData,
          updatedAt: new Date()
        },
        include: {
          items: true,
          delivery: true
        }
      })

      // Handle status-specific actions
      if (validatedData.status) {
        switch (validatedData.status) {
          case 'CONFIRMED':
            // TODO: Send confirmation email to customer
            // TODO: Create delivery announcement if auto-matching enabled
            break
          
          case 'READY':
            // TODO: Notify assigned deliverer
            // TODO: Update delivery status
            if (updated.delivery) {
              await tx.delivery.update({
                where: { id: updated.delivery.id },
                data: { status: 'READY_FOR_PICKUP' }
              })
            }
            break
          
          case 'CANCELLED':
            // TODO: Process refund if payment was made
            // TODO: Cancel delivery assignment
            // TODO: Send cancellation email
            if (updated.delivery) {
              await tx.delivery.update({
                where: { id: updated.delivery.id },
                data: { status: 'CANCELLED' }
              })
            }
            break
        }
      }

      return updated
    })

    // TODO: Send notification to customer about status change
    // TODO: Log status change for audit trail

    return ApiResponse.success(updatedOrder, 'Order updated successfully')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Validation failed', error.errors)
    }

    console.error('Error updating order:', error)
    return ApiResponse.serverError('Failed to update order')
  }
}

// DELETE - Cancel/Delete order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required')
    }

    if (session.user.role !== 'MERCHANT') {
      return ApiResponse.forbidden('Access restricted to merchants')
    }

    const orderId = params.id

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: session.user.id }
    })

    if (!merchant) {
      return ApiResponse.notFound('Merchant not found')
    }

    // Check if order exists and can be deleted
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id
      },
      include: {
        delivery: true,
        payments: true
      }
    })

    if (!order) {
      return ApiResponse.notFound('Order not found')
    }

    // Check if order can be deleted (only PENDING or CANCELLED orders)
    if (!['PENDING', 'CANCELLED'].includes(order.status)) {
      return ApiResponse.badRequest('Cannot delete order in current status')
    }

    // Check if there are completed payments (require refund process)
    const hasCompletedPayments = order.payments.some(payment => payment.status === 'COMPLETED')
    if (hasCompletedPayments) {
      return ApiResponse.badRequest('Cannot delete order with completed payments. Please cancel instead.')
    }

    // Delete order and related data
    await prisma.$transaction(async (tx) => {
      // Delete order items first
      await tx.orderItem.deleteMany({
        where: { orderId: order.id }
      })

      // Cancel delivery if exists
      if (order.delivery) {
        await tx.delivery.update({
          where: { id: order.delivery.id },
          data: { status: 'CANCELLED' }
        })
      }

      // Delete pending payments
      await tx.merchantPayment.deleteMany({
        where: {
          orderId: order.id,
          status: 'PENDING'
        }
      })

      // Delete the order
      await tx.order.delete({
        where: { id: order.id }
      })
    })

    // TODO: Send cancellation notification to customer
    // TODO: Refund any pending payments

    return ApiResponse.success(null, 'Order deleted successfully')
  } catch (error) {
    console.error('Error deleting order:', error)
    return ApiResponse.serverError('Failed to delete order')
  }
}
