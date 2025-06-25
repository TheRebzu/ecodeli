import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { sign } from 'jsonwebtoken'
import { cookies } from 'next/headers'

/**
 * Schéma de validation pour la connexion
 */
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis')
})

/**
 * POST /api/auth/login-simple
 * Connexion simple pour les tests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Tentative de connexion simple pour:', body.email)
    
    // Validation des données
    const validatedData = loginSchema.parse(body)
    
    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
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
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const bcrypt = await import('bcryptjs')
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Créer un token JWT simple
    const token = sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    )

    // Créer la réponse
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      message: 'Connexion réussie',
      redirectTo: getRoleRedirectUrl(user.role)
    })

    // Définir le cookie de session
    response.cookies.set('ecodeli-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 jours
    })

    return response

  } catch (error) {
    console.error('Erreur connexion simple:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: error.errors
        },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur serveur lors de la connexion' },
      { status: 500 }
    )
  }
}

/**
 * Obtenir l'URL de redirection selon le rôle
 */
function getRoleRedirectUrl(role: string): string {
  const roleRoutes = {
    'CLIENT': '/client',
    'DELIVERER': '/deliverer', 
    'MERCHANT': '/merchant',
    'PROVIDER': '/provider',
    'ADMIN': '/admin'
  }
  
  return roleRoutes[role as keyof typeof roleRoutes] || '/dashboard'
} 