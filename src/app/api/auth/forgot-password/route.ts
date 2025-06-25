import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema"
import { EmailServiceAlternative } from "@/lib/email-alternative"
import { createId } from "@paralleldrive/cuid2"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation du schema
    const { email } = forgotPasswordSchema.parse(body)

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Pour des raisons de sécurité, on renvoie toujours la même réponse
    // même si l'utilisateur n'existe pas
    if (!user) {
      console.log(`❌ Tentative de reset pour email inexistant: ${email}`)
      return NextResponse.json(
        { message: "Si cet email existe, un lien de réinitialisation a été envoyé" },
        { status: 200 }
      )
    }

    // Générer un token de reset unique
    const resetToken = createId()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

    // Supprimer les anciens tokens de reset pour cet email
    await prisma.passwordReset.deleteMany({
      where: { email: user.email }
    })

    // Créer un nouveau token de reset
    await prisma.passwordReset.create({
      data: {
        email: user.email,
        token: resetToken,
        expiresAt,
        used: false
      }
    })

    // Construire l'URL de reset
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    // Envoyer l'email de reset
    await EmailServiceAlternative.sendPasswordResetEmail(email, resetUrl, user.language || 'fr')

    console.log(`✅ Email de reset envoyé à ${email}`)

    return NextResponse.json({
      message: "Si cet email existe, un lien de réinitialisation a été envoyé"
    })

  } catch (error) {
    console.error("❌ Erreur lors de la demande de reset:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 