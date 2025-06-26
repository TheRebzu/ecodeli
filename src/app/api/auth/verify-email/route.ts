import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  email: z.string().email('Email invalide')
})

/**
 * GET - Vérifier l'email avec le token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    const { token: validatedToken, email: validatedEmail } = verifyEmailSchema.parse({ token, email })

    // Vérifier le token de vérification (temporairement simulé)
    console.log('🔍 Vérification du token:', validatedToken, 'pour email:', validatedEmail)
    
    // Pour l'instant, nous acceptons tous les tokens cuid2 valides (25 caractères)
    if (!validatedToken || validatedToken.length < 20) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid_or_expired_token', request.url))
    }
    
    // const verificationToken = await prisma.verificationToken.findFirst({
    //   where: {
    //     token: validatedToken,
    //     identifier: validatedEmail,
    //     type: 'email_verification',
    //     expires: {
    //       gt: new Date()
    //     }
    //   }
    // })

    // if (!verificationToken) {
    //   return NextResponse.redirect(new URL('/verify-email?error=invalid_or_expired_token', request.url))
    // }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: validatedEmail }
    })

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // Marquer l'email comme vérifié
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    // Supprimer le token utilisé (temporairement désactivé)
    // await prisma.verificationToken.delete({
    //   where: { id: verificationToken.id }
    // })
    
    console.log('✅ Email vérifié avec succès pour:', validatedEmail)

    // Rediriger vers la page de connexion avec succès
    return NextResponse.redirect(new URL('/verify-email?verified=true', request.url))

  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'email:', error)
    return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
  }
}

/**
 * POST - API endpoint pour vérifier l'email (alternative)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, email } = verifyEmailSchema.parse(body)

    // Vérifier le token de vérification (temporairement simulé)
    console.log('🔍 POST - Vérification du token:', token, 'pour email:', email)
    
    // Pour l'instant, nous acceptons tous les tokens cuid2 valides (25 caractères)
    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 400 }
      )
    }
    
    // const verificationToken = await prisma.verificationToken.findFirst({
    //   where: {
    //     token,
    //     identifier: email,
    //     type: 'email_verification',
    //     expires: {
    //       gt: new Date()
    //     }
    //   }
    // })

    // if (!verificationToken) {
    //   return NextResponse.json(
    //     { error: 'Token invalide ou expiré' },
    //     { status: 400 }
    //   )
    // }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Marquer l'email comme vérifié
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date()
      }
    })

    // Supprimer le token utilisé (temporairement désactivé)
    // await prisma.verificationToken.delete({
    //   where: { id: verificationToken.id }
    // })
    
    console.log('✅ POST - Email vérifié avec succès pour:', email)

    return NextResponse.json({
      success: true,
      message: 'Email vérifié avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'email:', error)

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