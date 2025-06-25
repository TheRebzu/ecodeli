import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const checkUserSchema = z.object({
  email: z.string().email('Email invalide')
})

/**
 * POST - Vérifier le statut d'un utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = checkUserSchema.parse(body)

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true
      }
    })

    if (!user) {
      return NextResponse.json({
        exists: false,
        emailVerified: false,
        needsVerification: false
      })
    }

    return NextResponse.json({
      exists: true,
      emailVerified: user.emailVerified,
      needsVerification: !user.emailVerified,
      role: user.role
    })

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut utilisateur:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.errors.map(e => ({ 
            field: e.path.join('.'), 
            message: e.message 
          }))
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
} 