import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth'

// GET /api/admin/deliveries?status=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    // Utiliser requireRole pour vérifier l'authentification et les permissions
    const user = await requireRole('ADMIN', request)
    console.log('SESSION ADMIN DELIVERIES:', user)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          announcement: {
            select: { id: true, title: true, type: true }
          },
          client: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          },
          deliverer: {
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true } }
            }
          },
          tracking: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      }),
      prisma.delivery.count({ where })
    ])

    return NextResponse.json({
      deliveries,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Error admin deliveries:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
