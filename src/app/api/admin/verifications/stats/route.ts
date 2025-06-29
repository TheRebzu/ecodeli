import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/utils'
import { prisma } from '@/lib/db'

/**
 * GET - Récupérer les statistiques des vérifications
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Vérification authentification admin (stats)...')
    
    // Vérifier que l'utilisateur est admin
    const user = await requireRole(request, ['ADMIN'])
    console.log('✅ Utilisateur admin authentifié (stats):', user.email)
  } catch (error) {
    console.error('❌ Erreur authentification admin (stats):', error)
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    // Statistiques des vérifications par statut
    const stats = await prisma.document.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Statistiques par rôle utilisateur
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      },
      where: {
        documents: {
          some: {}
        }
      }
    })

    const formattedStats = {
      total: stats.reduce((acc, stat) => acc + stat._count.status, 0),
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status
        return acc
      }, {} as Record<string, number>),
      byRole: roleStats.reduce((acc, stat) => {
        acc[stat.role] = stat._count.role
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      stats: formattedStats
    })

  } catch (error) {
    console.error('Error fetching verification stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques', success: false },
      { status: 500 }
    )
  }
}

/**
 * Retourne les documents requis selon le rôle
 */
function getRequiredDocuments(role: string): string[] {
  switch (role) {
    case 'DELIVERER':
      return ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
    case 'PROVIDER':
      return ['IDENTITY', 'CERTIFICATION']
    case 'MERCHANT':
      return ['IDENTITY', 'CONTRACT']
    default:
      return []
  }
} 