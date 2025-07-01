import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/utils'
import { ClientDashboardService } from '@/features/client/services/dashboard.service'
import { ClientDashboardResponseSchema } from '@/features/client/schemas/dashboard.schema'
import { prisma } from '@/lib/db'

/**
 * API Dashboard Client EcoDeli
 * 
 * Implémente les exigences Mission 1 - Partie dédiée aux clients :
 * - Dépôt d'annonces et suivi des livraisons
 * - Réservation de services et RDV avec prestataires
 * - Gestion des paiements
 * - Accès aux box de stockage temporaire
 * - Tutoriel obligatoire à la première connexion
 * 
 * AUCUNE DONNÉE MOCK - Toutes les données viennent de PostgreSQL
 */

const dashboardService = new ClientDashboardService()

/**
 * GET /api/client/dashboard
 * Récupérer toutes les données du dashboard client
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'authentification et du rôle
    const user = await getUserFromSession(request)
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle CLIENT requis' }, 
        { status: 403 }
      )
    }

    // Récupération des données complètes du dashboard
    console.log('🔍 [Dashboard API] User ID:', user.id)
    const dashboardData = await dashboardService.getDashboardData(user.id)
    
    // Formatage de la réponse selon le schéma
    const response = {
      client: {
        id: dashboardData.client.id,
        subscriptionPlan: dashboardData.client.subscriptionPlan,
        subscriptionExpiry: dashboardData.client.subscriptionEnd,
        tutorialCompleted: dashboardData.client.tutorialCompleted,
        emailVerified: dashboardData.client.user.emailVerified,
        profileComplete: !!(dashboardData.client.user.profile?.firstName && dashboardData.client.user.profile?.lastName),
        user: {
          id: dashboardData.client.user.id,
          name: dashboardData.client.user.name,
          email: dashboardData.client.user.email,
          phone: dashboardData.client.user.profile?.phone,
          avatar: dashboardData.client.user.profile?.avatar
        }
      },
      stats: dashboardData.stats,
      recentAnnouncements: dashboardData.recentActivity.announcements,
      recentBookings: dashboardData.recentActivity.bookings,
      activeStorageBoxes: dashboardData.recentActivity.storageBoxes,
      notifications: dashboardData.notifications,
      tutorial: dashboardData.tutorial,
      quickActions: dashboardData.quickActions
    }

    // Validation de la réponse avec Zod
    const validatedResponse = ClientDashboardResponseSchema.parse(response)

    return NextResponse.json(validatedResponse)

  } catch (error) {
    console.error('❌ [API Dashboard] Erreur:', error)
    
    // Gestion des erreurs de validation Zod
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        error: 'Erreur de validation des données',
        details: error.message
      }, { status: 400 })
    }

    // Erreurs métier
    if (error instanceof Error && error.message.includes('introuvable')) {
      return NextResponse.json({
        error: 'Profil client introuvable'
      }, { status: 404 })
    }

    // Erreur générique
    return NextResponse.json({
      error: 'Erreur serveur lors de la récupération du dashboard',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

/**
 * POST /api/client/dashboard/refresh
 * Rafraîchir les données du dashboard (cache bust)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Accès refusé' }, 
        { status: 403 }
      )
    }

    // Rafraîchissement des données

    // Re-récupération des données (peut inclure un cache bust)
    const dashboardData = await dashboardService.getDashboardData(user.id)
    
    const response = {
      client: {
        id: dashboardData.client.id,
        subscriptionPlan: dashboardData.client.subscriptionPlan,
        subscriptionExpiry: dashboardData.client.subscriptionEnd,
        tutorialCompleted: dashboardData.client.tutorialCompleted,
        emailVerified: dashboardData.client.user.emailVerified,
        profileComplete: !!(dashboardData.client.user.profile?.firstName && dashboardData.client.user.profile?.lastName),
        user: {
          id: dashboardData.client.user.id,
          name: dashboardData.client.user.name,
          email: dashboardData.client.user.email,
          phone: dashboardData.client.user.profile?.phone,
          avatar: dashboardData.client.user.profile?.avatar
        }
      },
      stats: dashboardData.stats,
      recentAnnouncements: dashboardData.recentActivity.announcements,
      recentBookings: dashboardData.recentActivity.bookings,
      activeStorageBoxes: dashboardData.recentActivity.storageBoxes,
      notifications: dashboardData.notifications,
      tutorial: dashboardData.tutorial,
      quickActions: dashboardData.quickActions,
      refreshedAt: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ [API Dashboard] Erreur refresh:', error)
    return NextResponse.json({
      error: 'Erreur lors du rafraîchissement'
    }, { status: 500 })
  }
}

/**
 * PUT /api/client/dashboard/tutorial
 * Marquer le tutoriel comme terminé
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromSession(request)
    
    if (!user || user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Accès refusé' }, 
        { status: 403 }
      )
    }

    const body = await request.json()
    const { completed, timeSpent, feedback } = body

    if (completed) {
      // Marquer le tutoriel comme terminé
      await prisma.client.update({
        where: { userId: user.id },
        data: {
          tutorialCompleted: true,
          tutorialCompletedAt: new Date()
        }
      })

      // Tutoriel marqué comme terminé

      return NextResponse.json({
        success: true,
        message: 'Tutoriel marqué comme terminé'
      })
    }

    return NextResponse.json({
      error: 'Paramètre completed requis'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ [API Dashboard] Erreur tutoriel:', error)
    return NextResponse.json({
      error: 'Erreur lors de la mise à jour du tutoriel'
    }, { status: 500 })
  }
}