// src/app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    // Vérifier le token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    })

    if (!verificationToken) {
      return NextResponse.json({ message: "Token de vérification invalide" }, { status: 400 })
    }

    // Vérifier si le token n'a pas expiré
    if (verificationToken.expires < new Date()) {
      return NextResponse.json({ message: "Le token de vérification a expiré" }, { status: 400 })
    }

    // Mettre à jour le statut de l'utilisateur
    await prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    })

    // Supprimer le token utilisé
    await prisma.verificationToken.delete({
      where: { id: verificationToken.id },
    })

    return NextResponse.json({ message: "Email vérifié avec succès" }, { status: 200 })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ message: "Une erreur est survenue lors de la vérification de l'email" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

