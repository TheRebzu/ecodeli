import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { UpdateTutorialProgressSchema } from '@/lib/schema/tutorial.schema'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Récupérer la progression du tutoriel
    const progress = await db.userTutorialProgress.findUnique({
      where: {
        userId: session.user.id
      }
    })
    
    // Si aucun enregistrement n'existe, retourner un objet de progression vide
    if (!progress) {
      return NextResponse.json(
        { 
          success: true, 
          data: {
            userId: session.user.id,
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
    console.error('Erreur lors de la récupération de la progression du tutoriel:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de la progression du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    const body = await req.json()
    
    // Valider les données reçues
    const validatedData = UpdateTutorialProgressSchema.parse({
      userId: session.user.id,
      ...body
    })
    
    // Mettre à jour la progression
    const progress = await db.userTutorialProgress.upsert({
      where: {
        userId: session.user.id
      },
      update: {
        currentStepId: validatedData.currentStepId,
        ...(validatedData.completedStepId && {
          completedSteps: {
            push: validatedData.completedStepId
          }
        }),
        ...(validatedData.isCompleted !== undefined && {
          isCompleted: validatedData.isCompleted
        }),
        lastUpdated: new Date()
      },
      create: {
        userId: session.user.id,
        currentStepId: validatedData.currentStepId,
        completedSteps: validatedData.completedStepId ? [validatedData.completedStepId] : [],
        isCompleted: validatedData.isCompleted ?? false,
        lastUpdated: new Date()
      }
    })
    
    return NextResponse.json(
      { 
        success: true, 
        data: progress 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression du tutoriel:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la mise à jour de la progression du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
} 