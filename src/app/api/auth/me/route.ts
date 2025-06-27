import { NextRequest, NextResponse } from "next/server"
import { auth, requireAuth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * GET /api/auth/me
 * Récupère le profil complet de l'utilisateur connecté
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // Récupérer le profil complet selon le rôle
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        validationStatus: true,
        language: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        // Profil général
        profile: true,
        // Profils selon le rôle
        client: session.user.role === 'CLIENT' ? {
          include: {
            tutorialProgress: true,
            announcements: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        } : false,
        deliverer: session.user.role === 'DELIVERER' ? {
          include: {
            documents: true,
            wallet: true
          }
        } : false,
        provider: session.user.role === 'PROVIDER' ? {
          include: {
            certifications: true
          }
        } : false,
        merchant: session.user.role === 'MERCHANT' ? true : false,
        admin: session.user.role === 'ADMIN' ? true : false
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        // Ajouter les données de rôle
        roleData: {
          client: user.client,
          deliverer: user.deliverer,
          provider: user.provider,
          merchant: user.merchant,
          admin: user.admin
        }
      }
    })

  } catch (error) {
    console.error("❌ Erreur API /auth/me:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/auth/me
 * Mettre à jour le profil utilisateur
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const { name, language } = body

    // Mettre à jour les informations de base
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name,
        language
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        language: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }
    
    console.error("❌ Erreur mise à jour profil:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}