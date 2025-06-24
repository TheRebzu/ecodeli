import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/**
 * GET - Vérifier la session utilisateur
 * Utilisé par le middleware pour valider l'authentification
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      )
    }

    // Retourner les informations de session nécessaires pour le middleware
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        language: session.user.language || 'fr'
      },
      session: {
        id: session.session.id,
        userId: session.user.id,
        expiresAt: session.session.expiresAt
      }
    })

  } catch (error) {
    console.error('Session verification error:', error)
    return NextResponse.json(
      { error: 'Session verification failed' },
      { status: 500 }
    )
  }
} 