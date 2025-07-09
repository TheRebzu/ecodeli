import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [GET /api/client/service-requests/stats] Début de la requête')
    
    const user = await getUserFromSession(request)
    if (!user) {
      console.log('❌ Utilisateur non authentifié')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Utilisateur authentifié:', user.id, user.role)

    try {
      // Statistiques des demandes de services du client (annonces de type HOME_SERVICE)
      const stats = await db.announcement.groupBy({
        by: ['status'],
        where: { authorId: user.id, type: 'HOME_SERVICE' },
        _count: { status: true },
        _sum: { basePrice: true }
      })

      // Statistiques par type de service
      const typeStats = await db.announcement.groupBy({
        by: ['type'],
        where: { authorId: user.id, type: 'HOME_SERVICE' },
        _count: { type: true },
        _sum: { basePrice: true }
      })

      // Statistiques par urgence
      const urgencyStats = await db.announcement.groupBy({
        by: ['isUrgent'],
        where: { authorId: user.id, type: 'HOME_SERVICE' },
        _count: { isUrgent: true }
      })

      // Total des demandes
      const totalRequests = await db.announcement.count({
        where: { authorId: user.id, type: 'HOME_SERVICE' }
      })

      // Total du budget
      const totalBudget = await db.announcement.aggregate({
        where: { authorId: user.id, type: 'HOME_SERVICE' },
        _sum: { basePrice: true }
      })

      // Demandes récentes (7 derniers jours)
      const recentRequests = await db.announcement.count({
        where: {
          authorId: user.id,
          type: 'HOME_SERVICE',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })

      const result = {
        totalRequests,
        totalBudget: Number(totalBudget._sum.basePrice || 0),
        averageBudget: totalRequests > 0 ? Number(totalBudget._sum.basePrice || 0) / totalRequests : 0,
        recentRequests,
        byStatus: stats.map(stat => ({
          status: stat.status,
          count: stat._count.status,
          totalBudget: Number(stat._sum.basePrice || 0)
        })),
        byType: typeStats.map(stat => ({
          type: stat.type,
          count: stat._count.type,
          totalBudget: Number(stat._sum.basePrice || 0)
        })),
        byUrgency: urgencyStats.map(stat => ({
          urgency: stat.isUrgent,
          count: stat._count.isUrgent
        }))
      }

      console.log('✅ Statistiques calculées:', result)

      return NextResponse.json(result)
      
    } catch (dbError: any) {
      console.error('❌ Erreur base de données stats:', dbError)
      return NextResponse.json({ 
        error: 'Database error', 
        details: dbError.message 
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('❌ Erreur générale GET stats demandes de services:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
} 