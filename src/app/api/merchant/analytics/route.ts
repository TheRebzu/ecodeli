import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const querySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '6m', '1y']).default('30d'),
  metrics: z.array(z.enum(['sales', 'orders', 'deliveries', 'revenue'])).default(['sales', 'orders'])
})

// GET - Merchant analytics
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

    // Calculate date range
    const end = new Date()
    let start: Date
    
    switch (query.period) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6m':
        start = new Date(end)
        start.setMonth(start.getMonth() - 6)
        break
      case '1y':
        start = new Date(end)
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const analytics: any = {
      period: { start, end },
      summary: {}
    }

    // Sales Analytics
    if (query.metrics.includes('sales')) {
      const salesData = await prisma.order.aggregate({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: start, lte: end }
        },
        _sum: { totalAmount: true, deliveryFee: true },
        _count: { id: true },
        _avg: { totalAmount: true }
      })

      analytics.sales = {
        totalSales: salesData._sum.totalAmount || 0,
        orderCount: salesData._count.id,
        averageOrderValue: salesData._avg.totalAmount || 0,
        totalDeliveryFees: salesData._sum.deliveryFee || 0
      }
    }

    // Orders Analytics
    if (query.metrics.includes('orders')) {
      const orderStatusStats = await prisma.order.groupBy({
        by: ['status'],
        where: {
          merchantId: merchant.id,
          createdAt: { gte: start, lte: end }
        },
        _count: { id: true }
      })

      analytics.orders = {
        statusBreakdown: orderStatusStats,
        totalOrders: orderStatusStats.reduce((sum, status) => sum + status._count.id, 0)
      }
    }

    // Deliveries Analytics
    if (query.metrics.includes('deliveries')) {
      const deliveryStats = await prisma.delivery.aggregate({
        where: {
          order: {
            merchantId: merchant.id,
            createdAt: { gte: start, lte: end }
          }
        },
        _count: { id: true }
      })

      analytics.deliveries = {
        totalDeliveries: deliveryStats._count.id
      }
    }

    // Revenue Analytics
    if (query.metrics.includes('revenue')) {
      const revenueData = await prisma.merchantPayment.aggregate({
        where: {
          merchantId: merchant.id,
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED'
        },
        _sum: { amount: true, commissionAmount: true, netAmount: true }
      })

      analytics.revenue = {
        totalRevenue: revenueData._sum.amount || 0,
        totalCommissions: revenueData._sum.commissionAmount || 0,
        netRevenue: revenueData._sum.netAmount || 0
      }
    }

    return ApiResponse.success(analytics)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiResponse.badRequest('Invalid query parameters', error.errors)
    }

    console.error('Error fetching merchant analytics:', error)
    return ApiResponse.serverError('Failed to fetch analytics')
  }
}
