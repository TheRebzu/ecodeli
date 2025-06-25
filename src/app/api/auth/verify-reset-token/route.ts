import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"

const verifyTokenSchema = z.object({
  token: z.string().min(1, "Token requis")
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation du schema
    const { token } = verifyTokenSchema.parse(body)

    // Vérifier si le token existe et n'est pas expiré
    const resetToken = await prisma.passwordReset.findUnique({
      where: { token }
    })

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: "Token invalide" },
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
        { valid: false, error: "Token expiré" },
        { status: 400 }
      )
    }

    // Vérifier si le token a déjà été utilisé
    if (resetToken.used) {
      return NextResponse.json(
        { valid: false, error: "Token déjà utilisé" },
        { status: 400 }
      )
    }

    // Token valide
    return NextResponse.json({
      valid: true,
      email: resetToken.email
    })

  } catch (error) {
    console.error("❌ Erreur lors de la vérification du token:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, error: "Données invalides" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { valid: false, error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
} 