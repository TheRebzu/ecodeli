import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { resetPasswordSchema } from "@/features/auth/schemas/auth.schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validation du schema
    const { token, password } = resetPasswordSchema.parse(body)

    // Vérifier le token dans la table Verification de Better Auth
    const verification = await db.verification.findFirst({
      where: {
        value: `password-reset:${token}`,
        expiresAt: { gt: new Date() } // Token non expiré
      }
    })

    if (!verification) {
      return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 400 })
    }

    // Récupérer l'utilisateur par email (identifier)
    const user = await db.user.findUnique({
      where: { email: verification.identifier }
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hash(password, 12)

    // Mettre à jour le mot de passe
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    })

    // Supprimer le token utilisé
    await db.verification.delete({
      where: { id: verification.id }
    })

    console.log(`✅ Mot de passe réinitialisé pour: ${user.email}`)
    
    return NextResponse.json({ message: "Mot de passe mis à jour avec succès" })
    
  } catch (error) {
    console.error("❌ Erreur lors de la réinitialisation du mot de passe:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
} 