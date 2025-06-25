import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

/**
 * POST - Connexion utilisateur simple
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔐 Tentative de connexion pour:', body.email)
    
    const credentials = loginSchema.parse(body)

    // Chercher l'utilisateur avec son profil
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        profile: true,
        client: true,
        deliverer: true,
        merchant: true,
        provider: true,
        admin: true
      }
    })

    if (!user) {
      console.log('❌ Utilisateur non trouvé')
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const passwordValid = await bcrypt.compare(credentials.password, user.password)
    if (!passwordValid) {
      console.log('❌ Mot de passe incorrect')
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer un token JWT simple
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'dev-secret-key',
      { expiresIn: '7d' }
    )

    // Mettre à jour la dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    console.log('✅ Connexion réussie pour:', user.email)

    // Créer la réponse avec le cookie
    const response = NextResponse.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        tutorialRequired: user.role === 'CLIENT' ? !user.client?.tutorialCompleted : false
      }
    })

    // Définir le cookie de session
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 jours
    })

    return response

  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error)

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
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
} 