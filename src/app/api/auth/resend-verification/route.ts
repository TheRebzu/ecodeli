import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EmailService } from '@/lib/email'
import { z } from 'zod'

const resendVerificationSchema = z.object({
  email: z.string().email('Email invalide')
})

/**
 * POST - Renvoyer l'email de vérification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resendVerificationSchema.parse(body)

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Aucun compte trouvé avec cet email' },
        { status: 404 }
      )
    }

    // Vérifier que l'email n'est pas déjà vérifié
    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Cet email est déjà vérifié' },
        { status: 400 }
      )
    }

    // Générer un nouveau token de vérification
    const verificationToken = require('@paralleldrive/cuid2').createId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

    // Supprimer les anciens tokens de vérification pour cet utilisateur (temporairement désactivé)
    // await prisma.verificationToken.deleteMany({
    //   where: { 
    //     identifier: email,
    //     type: 'email_verification'
    //   }
    // })

    // Créer un nouveau token de vérification (temporairement désactivé)
    // await prisma.verificationToken.create({
    //   data: {
    //     identifier: email,
    //     token: verificationToken,
    //     expires: expiresAt,
    //     type: 'email_verification'
    //   }
    // })

    // Pour l'instant, nous simulons l'envoi d'email
    console.log('📧 Simulation d\'envoi d\'email de vérification pour:', email)
    console.log('🔗 Token généré:', verificationToken)

    // Construire l'URL de vérification
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`

    // Envoyer l'email de vérification
    await EmailService.sendVerificationEmail(email, verificationUrl, user.language || 'fr')

    return NextResponse.json({
      success: true,
      message: 'Email de vérification renvoyé avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur lors du renvoi de l\'email de vérification:', error)

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