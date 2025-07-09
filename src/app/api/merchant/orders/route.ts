import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'MERCHANT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { userId: user.id },
    })

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // Get orders with client information
    const orders = await prisma.order.findMany({
      where: { merchantId: merchant.id },
      include: {
        client: {
          include: {
            profile: true
          }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate stats
    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length
    const completedOrders = orders.filter(o => o.status === 'COMPLETED').length
    const totalRevenue = orders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.totalAmount, 0)

    const stats = {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
    }

    return NextResponse.json({
      orders,
      stats,
    })
  } catch (error) {
    console.error('Error fetching merchant orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 