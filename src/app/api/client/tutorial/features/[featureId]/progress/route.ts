import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: { featureId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { featureId } = params
    
    if (!featureId) {
      return NextResponse.json(
        { error: "L'identifiant de la fonctionnalité est requis" },
        { status: 400 }
      )
    }
    
    // Récupérer la progression du tutoriel pour la fonctionnalité spécifiée
    const progress = await db.featureTutorialProgress.findUnique({
      where: {
        userId_featureId: {
          userId: session.user.id,
          featureId: featureId
        }
      }
    })
    
    // Si aucun enregistrement n'existe, retourner un objet de progression vide
    if (!progress) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            id: `feature-progress-${featureId}-${session.user.id}`,
            userId: session.user.id,
            featureId: featureId,
            currentStepId: null,
            completedSteps: [],
            isCompleted: false,
            lastUpdated: new Date()
          }
        },
        { status: 200 }
      )
    }
    
    return NextResponse.json(
      { 
        success: true, 
        data: progress 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la récupération de la progression du tutoriel pour la fonctionnalité:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de la progression du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { featureId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const { featureId } = params
    
    if (!featureId) {
      return NextResponse.json(
        { error: "L'identifiant de la fonctionnalité est requis" },
        { status: 400 }
      )
    }
    
    const body = await req.json()
    
    if (!body) {
      return NextResponse.json(
        { error: 'Le corps de la requête est requis' },
        { status: 400 }
      )
    }
    
    // Récupérer la progression existante
    const existingProgress = await db.featureTutorialProgress.findUnique({
      where: {
        userId_featureId: {
          userId: session.user.id,
          featureId: featureId
        }
      }
    })
    
    let updatedCompletedSteps = existingProgress?.completedSteps || []
    
    // Ajouter l'étape complétée si fournie
    if (body.completedStepId && !updatedCompletedSteps.includes(body.completedStepId)) {
      updatedCompletedSteps = [...updatedCompletedSteps, body.completedStepId]
    }
    
    // Mettre à jour ou créer la progression
    const updatedProgress = await db.featureTutorialProgress.upsert({
      where: {
        userId_featureId: {
          userId: session.user.id,
          featureId: featureId
        }
      },
      update: {
        currentStepId: body.currentStepId,
        completedSteps: updatedCompletedSteps,
        isCompleted: body.isCompleted ?? existingProgress?.isCompleted ?? false,
        lastUpdated: new Date()
      },
      create: {
        id: `feature-progress-${featureId}-${session.user.id}`,
        userId: session.user.id,
        featureId: featureId,
        currentStepId: body.currentStepId,
        completedSteps: updatedCompletedSteps,
        isCompleted: body.isCompleted ?? false,
        lastUpdated: new Date()
      }
    })
    
    return NextResponse.json(
      { 
        success: true, 
        data: updatedProgress 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression du tutoriel pour la fonctionnalité:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de la progression du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
} 