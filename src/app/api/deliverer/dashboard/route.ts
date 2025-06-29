import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/utils'

/**
 * GET /api/deliverer/dashboard
 * Dashboard livreur avec statut validation documents
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['DELIVERER'])
    
    if (!user) {
      return NextResponse.json({ error: 'Accès refusé - Rôle DELIVERER requis' }, { status: 401 })
    }

    // Récupérer profil livreur complet
    const deliverer = await prisma.deliverer.findUnique({
      where: { userId: user.id },
      include: {
        user: {
          include: {
            profile: {
              include: {
                documents: {
                  orderBy: { createdAt: 'desc' }
                }
              }
            },
            wallet: true
          }
        },
        plannedRoutes: {
          where: {
            date: {
              gte: new Date()
            }
          },
          orderBy: { date: 'asc' }
        }
      }
    })

    if (!deliverer) {
      return NextResponse.json({ error: 'Profil livreur introuvable' }, { status: 404 })
    }

    // Vérification des documents obligatoires pour validation
    const requiredDocuments = ['IDENTITY', 'DRIVING_LICENSE', 'INSURANCE']
    const submittedDocs = deliverer.user.profile?.documents || []
    
    const documentStatus = {
      identity: getDocumentStatus(submittedDocs, 'IDENTITY'),
      drivingLicense: getDocumentStatus(submittedDocs, 'DRIVING_LICENSE'),
      insurance: getDocumentStatus(submittedDocs, 'INSURANCE'),
      allApproved: requiredDocuments.every(type => 
        getDocumentStatus(submittedDocs, type) === 'APPROVED'
      )
    }

    // Opportunités de livraison disponibles
    const opportunities = await getDeliveryOpportunities(user.id)

    // Statistiques du livreur
    const stats = await getDelivererStats(user.id)

    return NextResponse.json({
      deliverer: {
        id: deliverer.id,
        validationStatus: deliverer.validationStatus,
        isAvailable: deliverer.isAvailable,
        maxWeight: deliverer.maxWeight,
        maxVolume: deliverer.maxVolume,
        profile: deliverer.user.profile,
        wallet: deliverer.user.wallet
      },
      documents: documentStatus,
      plannedRoutes: deliverer.plannedRoutes,
      opportunities,
      stats,
      canWork: deliverer.validationStatus === 'APPROVED' && documentStatus.allApproved
    })

  } catch (error) {
    console.error('Erreur dashboard livreur:', error)
    
    // Si c'est une erreur d'authentification, retourner 403
    if (error.message?.includes('Accès refusé')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * Statut d'un type de document
 */
function getDocumentStatus(documents: any[], type: string) {
  const doc = documents.find(d => d.type === type)
  return doc?.status || 'MISSING'
}

/**
 * Opportunités de livraison selon trajets planifiés
 */
async function getDeliveryOpportunities(delivererId: string) {
  // Récupérer les trajets planifiés du livreur
  const routes = await prisma.route.findMany({
    where: {
      delivererId,
      date: { gte: new Date() }
    }
  })

  if (routes.length === 0) return []

  // Chercher des annonces compatibles (algorithme de matching simple)
  const opportunities = await prisma.announcement.findMany({
    where: {
      status: 'ACTIVE',
      type: 'PACKAGE_DELIVERY',
      // TODO: Ajouter logique géographique de matching
    },
    include: {
      author: {
        include: {
          profile: true
        }
      }
    },
    take: 10
  })

  return opportunities
}

/**
 * Statistiques du livreur
 */
async function getDelivererStats(userId: string) {
  const [totalDeliveries, completedDeliveries, earnings, rating] = await Promise.all([
    prisma.delivery.count({
      where: { delivererId: userId }
    }),
    prisma.delivery.count({
      where: { 
        delivererId: userId,
        status: 'DELIVERED'
      }
    }),
    prisma.walletOperation.aggregate({
      where: {
        wallet: { userId },
        type: 'CREDIT'
      },
      _sum: { amount: true }
    }),
    prisma.review.aggregate({
      where: {
        delivery: { delivererId: userId }
      },
      _avg: { rating: true }
    })
  ])

  return {
    totalDeliveries,
    completedDeliveries,
    successRate: totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0,
    totalEarnings: earnings._sum.amount || 0,
    averageRating: rating._avg.rating || 0
  }
} 