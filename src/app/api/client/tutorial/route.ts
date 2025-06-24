import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema pour valider l'étape du tutoriel
const tutorialStepSchema = z.object({
  step: z.enum(['announcement', 'service', 'payment', 'tracking', 'completed']),
  data: z.record(z.any()).optional() // Données spécifiques à l'étape
})

/**
 * GET - Récupérer le statut du tutoriel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les informations du client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      select: {
        tutorialCompleted: true,
        createdAt: true,
        user: {
          select: {
            isFirstLogin: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      tutorialRequired: !client.tutorialCompleted && client.user.isFirstLogin,
      tutorialCompleted: client.tutorialCompleted,
      isFirstLogin: client.user.isFirstLogin,
      welcomeMessage: `Bienvenue ${client.user.firstName} sur EcoDeli !`
    })

  } catch (error) {
    console.error('Error getting tutorial status:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST - Valider une étape du tutoriel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { step, data } = tutorialStepSchema.parse(body)

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id }
    })

    if (!client) {
      return NextResponse.json({ error: 'Profil client non trouvé' }, { status: 404 })
    }

    // Si le tutoriel est déjà complété, ne rien faire
    if (client.tutorialCompleted) {
      return NextResponse.json({
        success: true,
        message: 'Tutoriel déjà complété',
        tutorialCompleted: true
      })
    }

    // Logique selon l'étape
    let updateData: any = {}
    let message = ''

    switch (step) {
      case 'announcement':
        message = 'Étape "Dépôt d\'annonce" validée'
        // Log de l'étape pour suivi
        console.log(`Client ${session.user.id} - Étape announcement validée`)
        break

      case 'service':
        message = 'Étape "Réservation de service" validée'
        console.log(`Client ${session.user.id} - Étape service validée`)
        break

      case 'payment':
        message = 'Étape "Gestion paiement" validée'
        console.log(`Client ${session.user.id} - Étape payment validée`)
        break

      case 'tracking':
        message = 'Étape "Suivi livraison" validée'
        console.log(`Client ${session.user.id} - Étape tracking validée`)
        break

      case 'completed':
        // Marquer le tutoriel comme terminé
        updateData.tutorialCompleted = true
        message = 'Tutoriel complété avec succès !'
        
        // Marquer que ce n'est plus la première connexion
        await prisma.user.update({
          where: { id: session.user.id },
          data: { isFirstLogin: false }
        })
        
        console.log(`Client ${session.user.id} - Tutoriel complété`)
        break
    }

    // Mettre à jour le client si nécessaire
    if (Object.keys(updateData).length > 0) {
      await prisma.client.update({
        where: { userId: session.user.id },
        data: updateData
      })
    }

    return NextResponse.json({
      success: true,
      message,
      step,
      tutorialCompleted: step === 'completed'
    })

  } catch (error) {
    console.error('Error validating tutorial step:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Forcer la réinitialisation du tutoriel (pour les tests)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Réinitialiser le tutoriel
    await prisma.client.update({
      where: { userId: session.user.id },
      data: { tutorialCompleted: false }
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: { isFirstLogin: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Tutoriel réinitialisé'
    })

  } catch (error) {
    console.error('Error resetting tutorial:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
