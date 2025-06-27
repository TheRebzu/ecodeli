import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { TutorialService } from '@/features/tutorials/services/tutorial.service'

/**
 * GET - Vérifier rapidement si le tutoriel est requis
 * Cette route est appelée à chaque connexion pour décider d'afficher l'overlay
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'CLIENT') {
      return NextResponse.json({
        success: true,
        tutorialRequired: false,
        reason: 'not_client'
      })
    }

    // Vérifier si le tutoriel est requis
    const tutorialRequired = await TutorialService.isTutorialRequired(session.user.id)

    if (!tutorialRequired) {
      return NextResponse.json({
        success: true,
        tutorialRequired: false,
        reason: 'already_completed'
      })
    }

    // Récupérer la progression actuelle
    const [steps, progress] = await Promise.all([
      TutorialService.getClientTutorialSteps(session.user.id),
      TutorialService.getTutorialProgress(session.user.id)
    ])

    // Configuration du tutoriel selon les paramètres
    const tutorialSettings = {
      blockingOverlay: true, // Selon cahier des charges : bloquer l'utilisateur
      allowSkip: false, // Les étapes obligatoires ne peuvent pas être passées
      autoSave: true,
      showProgress: true
    }

    return NextResponse.json({
      success: true,
      tutorialRequired: true,
      currentStep: progress.currentStep,
      steps: steps,
      settings: tutorialSettings,
      progressPercentage: progress.progressPercentage,
      user: {
        name: session.user.name || 'Utilisateur',
        email: session.user.email,
        subscriptionPlan: session.user.subscriptionPlan || 'FREE'
      }
    })

  } catch (error) {
    console.error('Error checking tutorial requirement:', error)
    
    // En cas d'erreur, ne pas bloquer l'utilisateur
    return NextResponse.json({
      success: true,
      tutorialRequired: false,
      reason: 'error',
      error: 'Erreur lors de la vérification du tutoriel'
    })
  }
}