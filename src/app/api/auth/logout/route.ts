import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Route logout pour Better-Auth selon Mission 1
 * Gère la déconnexion sécurisée des utilisateurs
 */
export async function POST(request: NextRequest) {
  try {
    // Effectuer la déconnexion via Better-Auth
    await auth.api.signOut({
      headers: request.headers
    })

    // Réponse de succès
    return NextResponse.json(
      { 
        success: true, 
        message: "Déconnexion réussie" 
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Erreur logout:", error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur lors de la déconnexion" 
      },
      { status: 500 }
    )
  }
}

// Méthodes supportées
export { POST as DELETE } 