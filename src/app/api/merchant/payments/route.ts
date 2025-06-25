import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiResponse } from '@/lib/utils/api-response'
import { z } from 'zod'

const querySchema = z.object({
  page: z.string().transform(val => parseInt(val)).catch(1),
  limit: z.string().transform(val => parseInt(val)).catch(20),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  type: z.enum(['ORDER_PAYMENT', 'CART_DROP', 'COMMISSION', 'REFUND']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['date', 'amount', 'status']).catch('date'),
  sortOrder: z.enum(['asc', 'desc']).catch('desc')
})

// GET - Merchant payments and transactions
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

    // Build payment filters
    const whereClause: any = {
      merchantId: merchant.id
    }

    if (query.status) {
      whereClause.status = query.status
    }

    if (query.type) {
      whereClause.type = query.type
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

    // Get payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.merchantPayment.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              deliveryFee: true,
              items: {
                select: {
                  productName: true,
                  quantity: true,
                  price: true
                }
              }
            }
          },
          cartDropRequest: {
            select: {
              id: true,
              deliveryAddress: true,
              totalAmount: true,
              deliveryFee: true
            }
          }
        },
        orderBy: {
          [query.sortBy === 'date' ? 'createdAt' : query.sortBy]: query.sortOrder
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.merchantPayment.count({ where: whereClause })
    ])

    // Get payment statistics
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const lastMonth = new Date(currentMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const [monthlyStats, previousMonthStats, yearlyStats] = await Promise.all([
      // Current month stats
      prisma.merchantPayment.aggregate({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: {
            gte: currentMonth
          }
        },
        _sum: {
          amount: true,
          commissionAmount: true,
          netAmount: true
        },
        _count: {
          id: true
        }
      }),
      // Previous month stats
      prisma.merchantPayment.aggregate({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: {
            gte: lastMonth,
            lt: currentMonth
          }
        },
        _sum: {
          amount: true,
          commissionAmount: true,
          netAmount: true
        },
        _count: {
          id: true
        }
      }),
      // Year to date stats
      prisma.merchantPayment.aggregate({
        where: {
          merchantId: merchant.id,
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(currentMonth.getFullYear(), 0, 1)
          }
        },
        _sum: {
          amount: true,
          commissionAmount: true,
          netAmount: true
        },
        _count: {
          id: true
        }
      })
    ])

    // Get payment breakdown by type
    const paymentBreakdown = await prisma.merchantPayment.groupBy({
      by: ['type', 'status'],
      where: {
        merchantId: merchant.id,
        createdAt: {
          gte: currentMonth
        }
      },
      _sum: {
        amount: true,
        netAmount: true
      },
      _count: {
        id: true
      }
    })

    // Get recent commission rates from contract
    const contract = await prisma.merchantContract.findFirst({
      where: {
        merchantId: merchant.id,
        status: 'ACTIVE'
      },
      select: {
        commissionRate: true,
        type: true
      }
    })

    // Calculate month-over-month growth
    const revenueGrowth = previousMonthStats._sum.netAmount && previousMonthStats._sum.netAmount > 0
      ? ((monthlyStats._sum.netAmount || 0) - previousMonthStats._sum.netAmount) / previousMonthStats._sum.netAmount * 100
      : 0

    const transactionGrowth = previousMonthStats._count.id > 0
      ? (monthlyStats._count.id - previousMonthStats._count.id) / previousMonthStats._count.id * 100
      : 0

    const statistics = {
      currentMonth: {
        totalRevenue: monthlyStats._sum.amount || 0,
        totalCommissions: monthlyStats._sum.commissionAmount || 0,
        netRevenue: monthlyStats._sum.netAmount || 0,
        transactionCount: monthlyStats._count.id,
        averageTransactionValue: monthlyStats._count.id > 0 
          ? (monthlyStats._sum.amount || 0) / monthlyStats._count.id 
          : 0
      },
      previousMonth: {
        totalRevenue: previousMonthStats._sum.amount || 0,
        totalCommissions: previousMonthStats._sum.commissionAmount || 0,
        netRevenue: previousMonthStats._sum.netAmount || 0,
        transactionCount: previousMonthStats._count.id
      },
      yearToDate: {
        totalRevenue: yearlyStats._sum.amount || 0,
        totalCommissions: yearlyStats._sum.commissionAmount || 0,
        netRevenue: yearlyStats._sum.netAmount || 0,
        transactionCount: yearlyStats._count.id
      },
      growth: {
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        transactionGrowth: Math.round(transactionGrowth * 100) / 100
      },
      breakdown: paymentBreakdown.map(item => ({
        type: item.type,
        status: item.status,
        count: item._count.id,
        totalAmount: item._sum.amount || 0,
        netAmount: item._sum.netAmount || 0
      })),
      currentCommissionRate: contract?.commissionRate || 0,
      contractType: contract?.type
    }

    const response = {
      payments: payments.map(payment => ({
        id: payment.id,
        type: payment.type,
        status: payment.status,
        amount: payment.amount,
        commissionAmount: payment.commissionAmount,
        netAmount: payment.netAmount,
        currency: payment.currency,
        description: payment.description,
        stripePaymentId: payment.stripePaymentId,
        order: payment.order,
        cartDropRequest: payment.cartDropRequest,
        processedAt: payment.processedAt,
        createdAt: payment.createdAt
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

    console.error('Error fetching merchant payments:', error)
    return ApiResponse.serverError('Failed to fetch payments')
  }
} 