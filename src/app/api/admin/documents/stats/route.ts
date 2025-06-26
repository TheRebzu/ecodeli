import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-simple'

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

    // Statistiques par rôle utilisateur
    const byUserRole = await prisma.document.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      include: {
        user: {
          select: {
            role: true
          }
        }
      }
    })

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

    // Formater les statistiques par rôle
    const roleStats = byUserRole.reduce((acc, item) => {
      const role = item.user.role
      if (!acc[role]) {
        acc[role] = 0
      }
      acc[role] += item._count.id
      return acc
    }, {} as Record<string, number>)

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