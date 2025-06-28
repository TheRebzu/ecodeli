import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Statistiques globales
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.document.count(),
      prisma.document.count({ where: { validationStatus: 'PENDING' } }),
      prisma.document.count({ where: { validationStatus: 'APPROVED' } }),
      prisma.document.count({ where: { validationStatus: 'REJECTED' } })
    ])

    // Statistiques par type
    const byType = await prisma.document.groupBy({
      by: ['type'],
      _count: {
        id: true
      }
    })

    // Statistiques par rôle utilisateur - approche corrigée
    const documentsWithUsers = await prisma.document.findMany({
      select: {
        userId: true,
        user: {
          select: {
            role: true
          }
        }
      }
    })

    // Calculer les statistiques par rôle manuellement
    const roleStats = documentsWithUsers.reduce((acc, doc) => {
      const role = doc.user.role
      if (!acc[role]) {
        acc[role] = 0
      }
      acc[role] += 1
      return acc
    }, {} as Record<string, number>)

    // Calculer le taux d'approbation
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '0.0'

    // Formater les statistiques par type
    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = {
        count: item._count.id,
        percentage: total > 0 ? ((item._count.id / total) * 100).toFixed(1) : '0.0'
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        approvalRate: `${approvalRate}%`,
        byType: typeStats,
        byUserRole: roleStats
      }
    })
  } catch (error) {
    console.error('Erreur récupération statistiques:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 