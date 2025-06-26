import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

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

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Identifiants invalides" },
        { status: 401 }
      )
    }

    // Succès de l'authentification
    return NextResponse.json(
      { 
        success: true,
        user: result.data?.user,
        session: result.data?.session 
      },
      { 
        status: 200,
        headers: result.headers || {}
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