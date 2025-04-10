import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Supprimer la progression du tutoriel
    await db.userTutorialProgress.delete({
      where: {
        userId: session.user.id
      }
    })
    
    // Créer une nouvelle progression vide
    const newProgress = await db.userTutorialProgress.create({
      data: {
        userId: session.user.id,
        currentStepId: null,
        completedSteps: [],
        isCompleted: false,
        lastUpdated: new Date()
      }
    })
    
    return NextResponse.json(
      { 
        success: true, 
        data: newProgress 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du tutoriel:', error)
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la réinitialisation du tutoriel',
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      },
      { status: 500 }
    )
  }
} 