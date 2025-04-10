import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTutorialSteps } from '@/lib/actions/client/tutorial-actions'

export async function GET(
  req: Request,
  { params }: { params: { stepId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { stepId } = params
    
    if (!stepId) {
      return NextResponse.json(
        { error: "L'identifiant de l'étape est requis" },
        { status: 400 }
      )
    }
    
    // Récupérer toutes les étapes du tutoriel
    const steps = await getTutorialSteps()
    
    // Trouver l'étape spécifique
    const step = steps.find(step => step.id === stepId)
    
    if (!step) {
      return NextResponse.json(
        { error: "Étape introuvable" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: step 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'étape du tutoriel:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de l\'étape du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
} 