import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Route register compatible avec Better-Auth
 * Gère l'inscription selon Mission 1
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, role = "CLIENT" } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Valider le rôle
    const validRoles = ['CLIENT', 'DELIVERER', 'MERCHANT', 'PROVIDER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Rôle invalide" },
        { status: 400 }
      )
    }

    // Utiliser Better-Auth pour l'inscription
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        role,
        isActive: role === 'CLIENT', // Clients actifs par défaut
        validationStatus: role === 'CLIENT' ? 'APPROVED' : 'PENDING'
      },
      headers: request.headers,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message || "Erreur lors de l'inscription" },
        { status: 400 }
      )
    }

    // Succès de l'inscription
    return NextResponse.json(
      { 
        success: true,
        user: result.data?.user,
        message: role === 'CLIENT' 
          ? "Inscription réussie" 
          : "Inscription réussie, en attente de validation"
      },
      { 
        status: 201,
        headers: result.headers || {}
      }
    )

  } catch (error) {
    console.error("Erreur register:", error)
    
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    )
  }
} 