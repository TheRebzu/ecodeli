import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET - Vérifier le statut du tutoriel client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé - Clients seulement' }, { status: 403 })
    }

    // Récupérer les informations du client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      select: {
        tutorialCompleted: true,
        subscriptionPlan: true,
        emailNotifications: true,
        user: {
          select: {
            isFirstLogin: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    const tutorialRequired = !client.tutorialCompleted && client.user.isFirstLogin

    return NextResponse.json({
      tutorialRequired,
      tutorialCompleted: client.tutorialCompleted,
      isFirstLogin: client.user.isFirstLogin,
      welcomeMessage: `Bienvenue ${client.user.firstName} sur EcoDeli !`,
      subscriptionPlan: client.subscriptionPlan,
      userInfo: {
        firstName: client.user.firstName,
        lastName: client.user.lastName,
        email: client.user.email
      }
    })

  } catch (error) {
    console.error('Error checking tutorial status:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 