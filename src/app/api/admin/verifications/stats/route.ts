import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth-simple'

/**
 * GET - Récupérer les statistiques des vérifications
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est admin
    await requireRole('ADMIN')
  } catch (error) {
    return NextResponse.json(
      { error: 'Accès refusé - rôle admin requis', success: false },
      { status: 403 }
    )
  }

  try {
    // Récupérer tous les utilisateurs avec documents par rôle
    const [deliverers, providers, merchants] = await Promise.all([
      prisma.user.findMany({
        where: {
          role: 'DELIVERER',
          documents: { some: {} }
        },
        include: {
          documents: {
            select: {
              validationStatus: true
            }
          }
        }
      }),
      prisma.user.findMany({
        where: {
          role: 'PROVIDER',
          documents: { some: {} }
        },
        include: {
          documents: {
            select: {
              validationStatus: true
            }
          }
        }
      }),
      prisma.user.findMany({
        where: {
          role: 'MERCHANT',
          documents: { some: {} }
        },
        include: {
          documents: {
            select: {
              validationStatus: true
            }
          }
        }
      })
    ])

    // Fonction pour calculer le statut de vérification d'un utilisateur
    const getUserVerificationStatus = (user: any) => {
      const documents = user.documents
      const pendingCount = documents.filter((doc: any) => doc.validationStatus === 'PENDING').length
      const approvedCount = documents.filter((doc: any) => doc.validationStatus === 'APPROVED').length
      const rejectedCount = documents.filter((doc: any) => doc.validationStatus === 'REJECTED').length

      if (rejectedCount > 0) return 'REJECTED'
      if (pendingCount > 0) return 'PENDING'
      if (approvedCount === documents.length && documents.length > 0) {
        // Vérifier si tous les documents requis sont présents
        const requiredDocs = getRequiredDocuments(user.role)
        const submittedTypes = documents.map((doc: any) => doc.type)
        const hasAllRequired = requiredDocs.every(type => submittedTypes.includes(type))
        return hasAllRequired ? 'APPROVED' : 'INCOMPLETE'
      }
      return 'INCOMPLETE'
    }

    // Combiner tous les utilisateurs
    const allUsers = [...deliverers, ...providers, ...merchants]

    // Calculer les statistiques globales
    let pending = 0
    let approved = 0
    let rejected = 0
    let incomplete = 0

    allUsers.forEach(user => {
      const status = getUserVerificationStatus(user)
      switch (status) {
        case 'PENDING': pending++; break
        case 'APPROVED': approved++; break
        case 'REJECTED': rejected++; break
        case 'INCOMPLETE': incomplete++; break
      }
    })

    const stats = {
      total: allUsers.length,
      pending,
      approved,
      rejected,
      incomplete,
      byRole: {
        DELIVERER: deliverers.length,
        PROVIDER: providers.length,
        MERCHANT: merchants.length
      }
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Error fetching verification stats:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des statistiques',
        success: false 
      },
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