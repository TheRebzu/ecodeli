import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * Route login compatible avec Better-Auth
 * Redirige vers l'endpoint Better-Auth approprié
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Utiliser Better-Auth pour l'authentification
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: request.headers,
    })

    // Better Auth signInEmail retourne un objet avec redirect, token, url, user
    // Pas d'erreur directe, on vérifie si on a un user
    if (!result.user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      )
    }

    // Récupérer le user complet (avec le rôle) depuis la base
    let user = result.user
    // Vérifier si le user a déjà un rôle (extended user)
    if (user && !('role' in user)) {
      // On va chercher le user complet
      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          emailVerified: true,
          isActive: true,
          validationStatus: true,
          createdAt: true,
          updatedAt: true
        }
      })
      if (dbUser) {
        // Fusionner les données en gérant les types avec assertion
        user = { 
          ...user, 
          ...dbUser
        } as any // Type assertion pour éviter l'erreur TypeScript
      }
    }

    // Succès de l'authentification
    return NextResponse.json(
      { 
        success: true,
        user,
        token: result.token
      },
      { 
        status: 200
      }
    )

  } catch (error) {
    console.error("Erreur login:", error)
    
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    )
  }
} 