import { signOut } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"
import { redirect } from "next/navigation"

/**
 * Route logout pour NextAuth
 * Gère la déconnexion sécurisée des utilisateurs
 */
export async function POST(request: NextRequest) {
  try {
    // Effectuer la déconnexion via NextAuth
    await signOut({ redirect: false })

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