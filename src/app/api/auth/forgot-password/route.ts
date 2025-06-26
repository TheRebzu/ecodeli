import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { forgotPasswordSchema } from "@/features/auth/schemas/auth.schema"
import { db } from "@/lib/db"
import { EmailServiceAlternative } from "@/lib/email-alternative"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation du schema
    const { email } = forgotPasswordSchema.parse(body)

    // Vérifier si l'utilisateur existe
    const user = await db.user.findUnique({
      where: { email }
    })

    // Pour des raisons de sécurité, on renvoie toujours la même réponse
    // même si l'utilisateur n'existe pas
    if (!user) {
      console.log(`❌ Tentative de reset pour email inexistant: ${email}`)
      return NextResponse.json({
        message: "Si cet email existe, un lien de réinitialisation a été envoyé"
      })
    }

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    // Supprimer les anciens tokens pour cet email
    await db.verification.deleteMany({
      where: {
        identifier: email,
        value: { startsWith: 'password-reset:' }
      }
    })

    // Créer un nouveau token dans la table Verification de Better Auth
    await db.verification.create({
      data: {
        identifier: email,
        value: `password-reset:${token}`,
        expiresAt
      }
    })

    // Construire l'URL de reset
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // Envoyer l'email
    try {
      await EmailServiceAlternative.sendPasswordResetEmail(email, resetUrl, 'fr')
      console.log(`✅ Email de reset envoyé à ${email}`)
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError)
      // On continue même si l'email échoue
    }

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

    // Pour des raisons de sécurité, on renvoie toujours la même réponse
    return NextResponse.json({
      message: "Si cet email existe, un lien de réinitialisation a été envoyé"
    })
  }
} 