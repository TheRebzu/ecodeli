import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getTutorialSteps, updateTutorialProgress, resetTutorial } from '@/lib/actions/client/tutorial-actions'

// GET /api/client/tutorial
// Récupère toutes les étapes du tutoriel
export async function GET(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé, veuillez vous connecter' },
        { status: 401 }
      )
    }

    const steps = await getTutorialSteps()
    return NextResponse.json(steps)
  } catch (error) {
    console.error('Erreur lors de la récupération des étapes du tutoriel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des étapes du tutoriel' },
      { status: 500 }
    )
  }
}

// POST /api/client/tutorial
// Crée/met à jour la progression du tutoriel pour un utilisateur
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé, veuillez vous connecter' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const progress = await updateTutorialProgress(body)
    return NextResponse.json(progress)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la progression du tutoriel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la progression' },
      { status: 500 }
    )
  }
}

// DELETE /api/client/tutorial
// Réinitialise la progression du tutoriel pour un utilisateur
export async function DELETE(_req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autorisé, veuillez vous connecter' },
        { status: 401 }
      )
    }

    await resetTutorial()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la progression du tutoriel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation de la progression' },
      { status: 500 }
    )
  }
} 