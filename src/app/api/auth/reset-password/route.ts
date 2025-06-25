import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation du schema
    const { token, password } = resetPasswordSchema.parse(body)

    // Vérifier si le token existe et est valide
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token }
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 400 }
      )
    }

    // Vérifier si le token a expiré
    if (resetToken.expiresAt < new Date()) {
      // Supprimer le token expiré
      await prisma.passwordReset.delete({
        where: { token }
      })
      
      return NextResponse.json(
        { error: "Token expiré" },
        { status: 400 }
      )
    }

    // Vérifier si le token a déjà été utilisé
    if (resetToken.used) {
      return NextResponse.json(
        { error: "Token déjà utilisé" },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      )
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await hash(password, 12)

    // Transaction pour mettre à jour le mot de passe et marquer le token comme utilisé
    await prisma.$transaction([
      // Mettre à jour le mot de passe
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      }),
      // Marquer le token comme utilisé
      prisma.passwordReset.update({
        where: { token },
        data: { used: true }
      })
    ])

    console.log(`✅ Mot de passe réinitialisé pour ${user.email}`)

    return NextResponse.json({
      message: "Mot de passe mis à jour avec succès"
    })

  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation du mot de passe:", error)

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