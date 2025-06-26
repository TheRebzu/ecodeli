import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
        accounts: true
      }
    })

    if (!user) {
      return NextResponse.json({
        exists: false,
        emailVerified: false,
        needsVerification: false
      })
    }

    // Vérifier si l'email est vérifié
    const emailVerified = user.emailVerified || false

    // Vérifier si l'utilisateur a besoin de vérification
    const needsVerification = !emailVerified

    return NextResponse.json({
      exists: true,
      emailVerified,
      needsVerification,
      role: user.role
    })

  } catch (error) {
    console.error('Erreur vérification statut utilisateur:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 