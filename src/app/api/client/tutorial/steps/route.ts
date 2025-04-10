import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTutorialSteps } from '@/lib/actions/client/tutorial-actions'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Récupérer toutes les étapes du tutoriel
    const steps = await getTutorialSteps()
    
    return NextResponse.json(
      { 
        success: true, 
        data: steps 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la récupération des étapes du tutoriel:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des étapes du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
} 