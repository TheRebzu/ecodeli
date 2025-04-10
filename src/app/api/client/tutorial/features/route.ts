import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  try {
    // Vérifier l'authentification
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    // Récupérer l'ID de la fonctionnalité depuis la requête
    const url = new URL(req.url)
    const featureId = url.searchParams.get('featureId')
    
    if (!featureId) {
      return NextResponse.json(
        { success: false, message: 'ID de fonctionnalité requis' },
        { status: 400 }
      )
    }
    
    // Récupérer les étapes du tutoriel pour cette fonctionnalité depuis la base de données
    const tutorialSteps = await db.tutorialStep.findMany({
      where: {
        featureId: featureId
      },
      orderBy: {
        order: 'asc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: tutorialSteps
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des étapes du tutoriel:', error)
    return NextResponse.json(
      { success: false, message: 'Une erreur est survenue lors de la récupération des étapes du tutoriel' },
      { status: 500 }
    )
  }
} 