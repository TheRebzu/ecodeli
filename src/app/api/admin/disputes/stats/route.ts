import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dispute statistics
    const [
      total,
      open,
      inProgress,
      resolved,
      closed,
      avgResolutionTime
    ] = await Promise.all([
      // Total disputes
      prisma.dispute.count(),
      
      // Open disputes
      prisma.dispute.count({
        where: { status: 'OPEN' }
      }),
      
      // In progress disputes
      prisma.dispute.count({
        where: { status: 'IN_PROGRESS' }
      }),
      
      // Resolved disputes
      prisma.dispute.count({
        where: { status: 'RESOLVED' }
      }),
      
      // Closed disputes
      prisma.dispute.count({
        where: { status: 'CLOSED' }
      }),
      
      // Average resolution time (in days)
      prisma.dispute.aggregate({
        where: {
          status: 'RESOLVED',
          resolvedAt: {
            not: null
          }
        },
        _avg: {
          _raw: {
            resolutionTime: {
              _avg: {
                _raw: {
                  days: {
                    _avg: {
                      _raw: {
                        EXTRACT(EPOCH FROM (resolvedAt - createdAt)) / 86400
                      }
                    }
                  }
                }
              }
            }
          }
        }
      })
    ])

    // Calculate trend (comparing last 30 days with previous 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const [recentDisputes, previousDisputes] = await Promise.all([
      prisma.dispute.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.dispute.count({
        where: {
          createdAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo
          }
        }
      })
    ])

    const trend = recentDisputes > previousDisputes ? 'up' : 
                  recentDisputes < previousDisputes ? 'down' : 'stable'

    // Get disputes by type
    const disputesByType = await prisma.dispute.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })

    // Get disputes by priority
    const disputesByPriority = await prisma.dispute.groupBy({
      by: ['priority'],
      _count: {
        id: true
      }
    })

    return NextResponse.json({
      stats: {
        total,
        open,
        inProgress,
        resolved,
        closed,
        avgResolutionTime: avgResolutionTime._avg._raw?.resolutionTime?._avg?.days?._avg?._raw || 0,
        trend
      },
      byType: disputesByType,
      byPriority: disputesByPriority
    })
  } catch (error) {
    console.error('Error fetching dispute statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 