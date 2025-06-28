import { signIn } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"

/**
 * Route login compatible avec NextAuth
 * Utilise signIn de NextAuth pour l'authentification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, redirectTo } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Utiliser NextAuth pour l'authentification
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false
    })

    // Vérifier le résultat de l'authentification
    if (result?.error) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      )
    }

    // Succès de l'authentification
    return NextResponse.json(
      { 
        success: true,
        message: "Connexion réussie",
        redirectUrl: result?.url || redirectTo || "/dashboard"
      },
      { 
        status: 200
      }
    )

  } catch (error) {
    console.error("Erreur login:", error)
    
    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      if (error.message === "Compte en attente de validation") {
        return NextResponse.json(
          { error: "Votre compte est en attente de validation" },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    )
  }
} 